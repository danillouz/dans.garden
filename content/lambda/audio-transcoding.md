---
title: Audio transcoding
description: Transcoding short audio files with Amazon Elastic Transcoder or FFmpeg.
date: 2019-10-27
updated: 2023-02-03
tags:
  - evergreen
---

For a side project I'm converting WebM audio files to MP3. I initially started doing this with [Amazon Elastic Transcoder](https://aws.amazon.com/elastictranscoder). But after doing the same with [FFmpeg](https://www.ffmpeg.org) and [Lambda Layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html), my initial testing showed that the latter is around **10 times cheaper** and **2 times faster** for **short audio** recordings (~3 minute / ~3 MB files).

If you just want to read the code, have a look at [github.com/upstandfm/audio-transcoder](https://github.com/upstandfm/audio-transcoder).

## Use case

My [side project](https://github.com/upstandfm/app) is a web app that allows users to record their voice so others can listen to it. In the app I use the [MediaStream Recording API](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) (aka Media Recording API) to easily record audio from the user's input device. It works really well, and you don't have to use any external libraries!

There's one catch though. At the time of this writing it only works in Firefox, Chrome and Opera. And it "sort of" works in Safari[^1]. Even though that's a bit disappointing, I'm okay with that for my use case.

[^1]: In Safari the Media Recording API is hidden behind a feature flag. And not all events are supported.

So after I had built something functional that allowed me to record my voice, it turned out that the audio file I ended up with had to be _transcoded_ if I wanted to listen to it across a wide range of browsers and devices.

## What does transcoding even mean?

Before I can answer that, we need to explore _what_ an audio file is.

We can think of an audio file like a stream of data elements wrapped in a container. This container is formally called a [media container format](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Containers). And it's basically a _file format_ (think file type) that can store different types of data elements (i.e. bits).

The container describes how this data "coexists" in a file. Some container formats only support audio, like [WAVE](https://en.wikipedia.org/wiki/WAV) (usually referred to as WAV). And others support both audio and video, like [WebM](https://www.webmproject.org).

So a container "wraps" data to store it in a file, but information can be stored in different ways. And we'll also want to _compress_ the data to optimize for storage and/or bandwidth by _encoding_ it (i.e. converting it from one "form" to another).

This is where a _codec_ (**co**der/**dec**oder) comes into play. It handles all the processing that's required to _encode_ (compress) and _decode_ (decompress) the audio data.

Therefore, in order to define the format of an audio file (or a video file) we need both a container and a codec. For example, when the MPEG-1 Audio Layer 3 codec is used to store only audio data in an [MPEG-4](https://en.wikipedia.org/wiki/MPEG-4) container[^2], we get an [MP3](https://en.wikipedia.org/wiki/MP3) file (even though it's technically still an MPEG format file).

[^2]: A container is not always required. [WebRTC](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API) does not use a container at all. Instead, it streams the encoded audio and video tracks directly from one peer to another using `MediaStreamTrack` objects to represent each track.

So what does transcoding mean? It's the process of converting one encoding into another. And if we convert one container format into another, this process is called _transmuxing_.

There are a lot of codecs available. And each codec will have a different effect on the quality, size and/or compatibility of the audio file[^3].

[^3]: If you'd like to learn more about audio codecs, I recommend reading the [Mozilla web audio codec guide](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs).

### Why do you need to transcode audio?

You might be wondering (like I was), if we can record audio directly in the browser and immediately use the result in our app, why do we even have to transcode it?

The answer is: to optimize for _compatibility_. Because the Media Recording API can _not_ record audio in all media formats.

For example, MP3 has good compatibility across browsers and devices for playback, but is _not_ supported by the Media Recording API. What formats are supported depend on the browser's specific implementation of said API.

We can use the [isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported) method to figure out if we can record in a specific media type by calling it with a [MIME](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) type. Run the following code in the web console (e.g. in Firefox) to see it in action:

```js
MediaRecorder.isTypeSupported("audio/mpeg") // false
```

Okay, MP3 isn't supported. Which format can we use to record in then? It looks like WebM is a good choice:

```js
MediaRecorder.isTypeSupported("audio/webm") // true
```

Also note that you can specify the codec in addition to the container:

```js
MediaRecorder.isTypeSupported("audio/webm;codecs=opus") // true
```

So if we want to end up with MP3 files of the recordings, we need to transcode (and technically also transmux) the WebM audio recordings.

### How will we do this?

We'll explore two implementations that both convert a WebM audio file to MP3:

1. [Using Amazon Elastic Transcoder](#using-amazon-elastic-transcoder)
2. [Using FFmpeg and Lambda Layers](#using-ffmpeg-and-lambda-layers)

For both implementations we'll use the [Serverless Framework](https://serverless.com) and [Node.js](https://nodejs.org/en) to write the code for the [Lambda](https://aws.amazon.com/lambda) function that converts an audio file.

Before we get started, make sure you have Node.js installed. And then use [npm](https://www.npmjs.com) to install the Serverless Framework globally:

```sh
npm i -G serverless
```

Additionally, we'll need two [S3](https://aws.amazon.com/s3) buckets to process and store the converted audio files:

- An _input_ bucket to upload WebM audio files.
- An _output_ bucket to store transcoded MP3 files.

## Using Amazon Elastic Transcoder

Amazon Elastic Transcoder is a fully managed and highly scalable AWS service that can be used to transcode audio and video files.

We can use this service to schedule a transcoding job in a pipeline. The pipeline knows from which bucket to read a file that needs to be converted, and to which bucket the converted file should be written. Whereas the job contains instructions on which file to transcode, and to what format it should be converted.

We'll create a Lambda function that will "listen" to the S3 input bucket. And whenever a new object is created in that bucket, Lambda will schedule a transcoder job to create the MP3 file.

So the flow will be like this:

- A WebM audio file is uploaded to the input bucket.
- The Lambda function is triggered, and uses the key of the created S3 object to schedule a transcoder job.
- A job is scheduled in the pipeline. And Amazon Elastic Transcoder:
  - Fetches the WebM audio file from the input bucket.
  - Transcodes the WebM audio file to MP3.
  - Uploads the MP3 file to the output bucket.

> At the time of this writing [AWS CloudFormation](https://aws.amazon.com/cloudformation) has **no** support for Amazon Elastic Transcoder. So you'll have to use the AWS web console to create and configure your pipeline(s).

We'll go through the following steps to get it up and running:

1. [Create a pipeline](#1-create-a-pipeline)
2. [Choose a preset](#2-choose-a-preset)
3. [Create an IAM Policy](#3-create-an-iam-policy)
4. [Create a Serverless project](#4-create-a-serverless-project)
5. [Implement the Lambda function](#5-implement-the-lambda-function)
6. [Release the Lambda function](#6-release-the-lambda-function)
7. [Schedule a job](#7-schedule-a-job)

### 1. Create a pipeline

Navigate to the Elastic Transcoder service in the AWS web console. Select a region (we'll use `eu-west-1`), and click on "Create New Pipeline".

![[attachments/audio-transcoding-lambda/create-pipeline.png]]

Create the pipeline and take note of the ARN and Pipeline ID. We'll need both to configure the Lambda function later on.

![[attachments/audio-transcoding-lambda/created-pipeline.png]]

### 2. Choose a preset

The pipeline we created in the previous step requires a [preset](https://docs.aws.amazon.com/elastictranscoder/latest/developerguide/working-with-presets.html) to work. Presets contain settings we want to be applied during the transcoding process. And lucky for us, AWS already has system presets to convert to MP3 files.

In the web console, click on "Presets" and filter on the keyword "MP3". Select one and take note of its ARN and Preset ID. We'll also need these to configure the Lambda function.

![[attachments/audio-transcoding-lambda/preset.png]]

### 3. Create an IAM Policy

AWS will already have created am IAM Role named `Elastic_Transcoder_Default_Role`. But in order for the pipeline to read objects from the input bucket and write objects to the output bucket, we need to make sure the role has the required permissions to do so.

Create a new IAM Policy with the following configuration:

```json showLineNumbers
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::raw.recordings/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::transcoded.recordings/*"
    },
    {
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::transcoded.recordings"
    }
  ]
}
```

Make sure the resource ARNs of your input and output buckets are named correctly. And after the Policy has been created, attach it to `Elastic_Transcoder_Default_Role`.

### 4. Create a Serverless project

Create a new project named "audio-transcoder". Move into this directory and create a Serverless manifest in the project root:

```yaml title="audio-transcoder/serverless.yml" showLineNumbers
service: audio-transcoder

provider:
  name: aws
  runtime: nodejs10.x

package:
  exclude:
    - ./*
    - ./**/*.test.js
  include:
    - node_modules
    - src
```

Add the Elastic Transcoder Pipeline ID, MP3 Preset ID and region (from [step 1](#1-create-a-pipeline) and [step 2](#2-choose-a-preset)) as environment variables:

```yaml title="audio-transcoder/serverless.yml" showLineNumbers {6-9}
service: audio-transcoder

provider:
  name: aws
  runtime: nodejs10.x
  environment:
    TRANSCODE_AUDIO_PIPELINE_ID: "1572538082044-xmgzaa"
    TRANSCODER_MP3_PRESET_ID: "1351620000001-300040"
    ELASTIC_TRANSCODER_REGION: "eu-west-1"

package:
  exclude:
    - ./*
    - ./**/*.test.js
  include:
    - node_modules
    - src
```

Use the Elastic Transcoder Pipeline ARN and MP3 Preset ARN (from [step 1](#1-create-a-pipeline) and [step 2](#2-choose-a-preset)) to configure the Lambda with the required IAM permissions, so it can create transcoder jobs:

```yaml title="audio-transcoder/serverless.yml" showLineNumbers {10-16}
service: audio-transcoder

provider:
  name: aws
  runtime: nodejs10.x
  environment:
    TRANSCODE_AUDIO_PIPELINE_ID: "1572538082044-xmgzaa"
    TRANSCODER_MP3_PRESET_ID: "1351620000001-300040"
    ELASTIC_TRANSCODER_REGION: "eu-west-1"
  iamRoleStatements:
    - Effect: Allow
      Action:
        - elastictranscoder:CreateJob
      Resource:
        - YOUR_PIPELINE_ARN # Replace this with the ARN from step 1
        - YOUR_PRESET_ARN # Replace this with the ARN from step 2

package:
  exclude:
    - ./*
    - ./**/*.test.js
  include:
    - node_modules
    - src
```

And finally, add the Lambda function definition. This Lambda will be executed whenever an object is created in the input bucket:

```yaml title="audio-transcoder/serverless.yml" showLineNumbers {26-34}
service: audio-transcoder

provider:
  name: aws
  runtime: nodejs10.x
  environment:
    TRANSCODE_AUDIO_PIPELINE_ID: "1572538082044-xmgzaa"
    TRANSCODER_MP3_PRESET_ID: "1351620000001-300040"
    ELASTIC_TRANSCODER_REGION: "eu-west-1"
  iamRoleStatements:
    - Effect: Allow
      Action:
        - elastictranscoder:CreateJob
      Resource:
        - YOUR_PIPELINE_ARN # Replace this with the ARN from step 1
        - YOUR_PRESET_ARN # Replace this with the ARN from step 2

package:
  exclude:
    - ./*
    - ./**/*.test.js
  include:
    - node_modules
    - src

functions:
  transcodeToMp3:
    handler: src/handler.transcodeToMp3
    description: Transcode an audio file to MP3
    events:
      - s3:
          bucket: "raw.recordings"
          event: "s3:ObjectCreated:*"
          existing: true
```

### 5. Implement the Lambda function

In order to match the Lambda function definition in the Serverless manifest, create a file named `handler.js` in `src`. And export a method named `transcodeToMp3`:

```js title="audio-transcoder/src/handler.js" showLineNumbers
"use strict"

module.exports.transcodeToMp3 = async () => {
  try {
    // Implementation goes here.
  } catch (err) {
    console.log("Transcoder Error: ", err)
  }
}
```

In the previous step we configured the Lambda to be executed whenever an object is created in the input bucket. This means that AWS will call the Lambda with an `event` message that contains a list of `Records`. And each `Record` will contain an `s3` object with information about the `s3:ObjectCreated` event:

```js
// "event" object:
{
  "Records":[
    // "Record" object:
    {
      "s3":{
        // Contains information about the "s3:ObjectCreated" event.
      }
    }
  ]
}
```

The `s3` object will contain a property called `key`, which is the "name" of the file that was created in the input bucket. For example, if we upload a file named `test.webm` to the S3 bucket, the value of `key` will be the (URL encoded!) string `test.webm`.

You can see the entire event message structure in the [AWS S3 docs](https://docs.aws.amazon.com/AmazonS3/latest/dev/notification-content-structure.html).

Also be aware that you can get **more than one** `Record`. So always process all of them:

```js title="audio-transcoder/src/handler.js" showLineNumbers {5-18}
"use strict"

module.exports.transcodeToMp3 = async (event) => {
  try {
    for (const Record of event.Records) {
      const { s3 } = Record
      if (!s3) {
        continue
      }

      const { object: s3Object = {} } = s3
      const { key } = s3Object
      if (!key) {
        continue
      }

      const decodedKey = decodeURIComponent(key)
      // TODO: use "decodedKey" to schedule transcoder job.
    }
  } catch (err) {
    console.log("Transcoder Error: ", err)
  }
}
```

Finally, initialize the transcoder client. And schedule a transcoder job for every created object in the input bucket:

```js title="audio-transcoder/src/handler.js" showLineNumbers {3-13, 30-43}
"use strict"

const ElasticTranscoder = require("aws-sdk/clients/elastictranscoder")

const { ELASTIC_TRANSCODER_REGION, TRANSCODE_AUDIO_PIPELINE_ID, TRANSCODER_MP3_PRESET_ID } =
  process.env

const transcoderClient = new ElasticTranscoder({
  region: ELASTIC_TRANSCODER_REGION,
})

module.exports.transcodeToMp3 = async (event) => {
  try {
    for (const Record of event.Records) {
      const { s3 } = Record
      if (!s3) {
        continue
      }

      const { object: s3Object = {} } = s3
      const { key } = s3Object
      if (!key) {
        continue
      }

      const decodedKey = decodeURIComponent(key)
      await transcoderClient
        .createJob({
          PipelineId: TRANSCODE_AUDIO_PIPELINE_ID,
          Input: {
            Key: decodedKey,
          },
          Outputs: [
            {
              Key: decodedKey.replace("webm", "mp3"),
              PresetId: TRANSCODER_MP3_PRESET_ID,
            },
          ],
        })
        .promise()
    }
  } catch (err) {
    console.log("Transcoder Error: ", err)
  }
}
```

You can read more about the `createJob` API in the [AWS JavaScript SDK]("https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/ElasticTranscoder.html#createJob-property) docs.

### 6. Release the Lambda function

In order to upload the Lambda to AWS, make sure you have your [credentials configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html). And then run the following command from the project root to release the Lambda:

```sh
sls deploy --region eu-west-1 --stage prod
```

### 7. Schedule a job

With everything up and running, we can now upload a WebM audio file to the input bucket to schedule a transcoder job. Navigate to the S3 service in the AWS web console:

- Select your input bucket.
- Click "Upload".
- Add a WebM audio file.
- Click on "Upload" again.

This action will trigger an `s3:ObjectCreated` event. AWS will execute the Lambda function we deployed in the previous step, and it will schedule a transcoder job.

To get more information about a scheduled job, navigate to the Elastic Transcoder service in the AWS web console. Click on "Jobs", select your pipeline and click "Search". Here you can select a job to get more details about it.

![[attachments/audio-transcoding-lambda/created-job.png]]

If it has status "Complete", there should be a file named `test.mp3` in the output bucket!

## Using FFmpeg and Lambda Layers

FFmpeg is a cross-platform solution that can be used to convert audio and video files. And since it's a binary, we'll use a Lambda Layer to execute it from the Lambda function.

### What's a Lambda Layer?

Lambda Layers allow us to "pull in" extra dependencies into Lambda functions. A layer is basically a ZIP archive that contains some code. And in order to use a layer we first must create and publish one.

After we publish a layer we can configure any Lambda function to use it[^4]. AWS will then extract the layer to a special directory called `/opt`. And the Lambda function runtime will be able to execute it.

[^4]: At the time of this writing a Lambda function can use [up to 5 layers at a time](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html).

### How different is this implementation?

We're basically "swapping out" Amazon Elastic Transcoder with FFmpeg. Other than that the flow is still the same.

So since we're still converting a WebM audio file to MP3 whenever it's uploaded to the input bucket, we can reuse the Lambda from the [previous implementation](#4-create-a-serverless-project) by making these changes:

- Replace Amazon Elastic Transcoder with FFmpeg.
- Within the Lambda we will:
  - Retrieve the WebM audio file from the input bucket whenever it's uploaded.
  - Convert the retrieved WebM audio file to MP3 using FFmpeg.
  - Write the converted MP3 file to the output bucket.

We'll apply these changes by going through the following steps:

1. [Create and publish FFmpeg Lambda Layer](#1-create-and-publish-ffmpeg-lambda-layer)
2. [Update the Serverless manifest](#2-update-the-serverless-manifest)
3. [Update the Lambda function](#3-update-the-lambda-function)
4. [Release the updated Lambda function](#4-release-the-updated-lambda-function)
5. [Upload another WebM audio file](#5-upload-another-webm-audio-file)
6. [Optimize the Lambda function](#6-optimize-the-lambda-function)

### 1. Create and publish FFmpeg Lambda Layer

The Serverless Framework makes it very easy to work with layers. To get started create a new project named "lambda-layers". Move into this directory and create a Serverless manifest in the project root:

```yaml title="lambda-layers/serverless.yml" showLineNumbers
service: lambda-layers

provider:
  name: aws
  runtime: nodejs10.x

package:
  exclude:
    - ./*
  include:
    - layers

layers:
  ffmpeg:
    path: layers
    description: FFmpeg binary
    compatibleRuntimes:
      - nodejs10.x
    licenseInfo: GPL v2+, for more info see https://github.com/FFmpeg/FFmpeg/blob/master/LICENSE.md
```

The layer is named `ffmpeg` and the `path` property dictates that the layer code will reside in a directory named `layers`. Match this structure in the project by creating that directory first.

Move into the `layers` directory and download a static build of FFmpeg from [johnvansickle.com/ffmpeg](https://johnvansickle.com/ffmpeg)[^5].

[^5]: These FFmpeg builds are all compatible with Amazon Linux 2. This is the operating system on which Lambda runs when the `Node.js` [runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html) is used.

Use the recommended `ffmpeg-git-amd64-static.tar.xz` master build:

```sh
curl -O https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz
```

Extract the files from the downloaded archive:

```sh
tar -xvf ffmpeg-git-amd64-static.tar.xz
```

Remove the downloaded archive:

```sh
rm ffmpeg-git-amd64-static.tar.xz
```

And rename the extracted directory to `ffmpeg`, so it matches the configured layer name in the Serverless manifest. For example:

```sh
mv ffmpeg-git-20191029-amd64-static ffmpeg
```

You should now have the following files and folder structure:

```sh
lambda-layers
  ├── layers
  │   └── ffmpeg
  │       ├── GPLv3.txt
  │       ├── ffmpeg
  │       ├── ffprobe
  │       ├── manpages
  │       ├── model
  │       ├── qt-faststart
  │       └── readme.txt
  └── serverless.yml
```

Publish the layer by running the following command from the project root:

```sh
sls deploy --region eu-west-1 --stage prod
```

When Serverless finishes deploying, navigate to the Lambda service in the AWS web console and click on "Layers". Here you should see the published layer. Click on it and take note of the ARN. We'll need it in the next step.

![[attachments/audio-transcoding-lambda/published-layer.png]]

### 2. Update the Serverless manifest

We'll now be modifying the manifest file of the `audio-transcoder` project.

First change the environment variables, and add the names of your input and output buckets. Then change the IAM permissions so the Lambda function can read from the input bucket and write to the output bucket. And finally, change the Lambda function to use the FFmpeg layer with the ARN from the previous step:

```yaml title="audio-transcoder/serverless.yml" showLineNumbers {7-8,10-17,36-37}
service: audio-transcoder

provider:
  name: aws
  runtime: nodejs10.x
  environment:
    S3_INPUT_BUCKET_NAME: "raw.recordings"
    S3_OUTPUT_BUCKET_NAME: "transcoded.recordings"
  iamRoleStatements:
    - Effect: Allow
      Action:
        - s3:GetObject
      Resource: arn:aws:s3:::raw.recordings/*
    - Effect: Allow
      Action:
        - s3:PutObject
      Resource: arn:aws:s3:::transcoded.recordings/*

package:
  exclude:
    - ./*
    - ./**/*.test.js
  include:
    - node_modules
    - src

functions:
  transcodeToMp3:
    handler: src/handler.transcodeToMp3
    description: Transcode an audio file to MP3
    events:
      - s3:
          bucket: "raw.recordings"
          event: "s3:ObjectCreated:*"
          existing: true
    layers:
      - YOUR_FFMPEG_LAYER_ARN # Replace this with the ARN from step 1
```

### 3. Update the Lambda function

Since we have to read from the input bucket and write to the output bucket, replace the Elastic Transcoder client with the S3 client. And use the `decodedKey` to get the WebM recording from the input bucket:

```js title="audio-transcoder/src/handler.js" showLineNumbers {3-5, 22-27}
"use strict"

const S3 = require("aws-sdk/clients/s3")
const { S3_INPUT_BUCKET_NAME, S3_OUTPUT_BUCKET_NAME } = process.env
const s3Client = new S3()

module.exports.transcodeToMp3 = async (event) => {
  try {
    for (const Record of event.Records) {
      const { s3 } = Record
      if (!s3) {
        continue
      }

      const { object: s3Object = {} } = s3
      const { key } = s3Object
      if (!key) {
        continue
      }

      const decodedKey = decodeURIComponent(key)
      const webmRecording = await s3Client
        .getObject({
          Bucket: S3_INPUT_BUCKET_NAME,
          Key: decodedKey,
        })
        .promise()
    }
  } catch (err) {
    console.log("Transcoder Error: ", err)
  }
}
```

The S3 client returns an object that contains a `Body` property. The value of `Body` is a blob, which we'll feed to the FFmpeg layer and convert it to MP3.

We'll do this via a helper function that will spawn a [synchronous child process](https://nodejs.org/api/child_process.html#child_process_child_process_spawnsync_command_args_options) which allows us to execute the `ffmpeg` "command" (provided by the FFmpeg layer):

```js title="audio-transcoder/src/ffmpeg.js" showLineNumbers
"use strict"

const { spawnSync } = require("child_process")

module.exports = {
  convertWebmToMp3(webmBlob) {
    spawnSync(
      "/opt/ffmpeg/ffmpeg", // "/opt/:LAYER_NAME/:BINARY_NAME"
      [
        // FFmpeg command arguments go here.
      ],
      { stdio: "inherit" },
    )

    // Rest of the implementation goes here.
  },
}
```

The `ffmpeg` command requires the file system to do its magic. And we'll use a "special" directory called `/tmp`[^6] for this.

[^6]: At the time of this writing the `/tmp` directory allows you to _temporarily_ store up to [512 MB](https://docs.aws.amazon.com/lambda/latest/dg/limits.html).

First write the WebM blob to `/tmp` so FFmpeg can read it. And then tell it to write the produced MP3 file back to the same directory:

```js title="audio-transcoder/src/ffmpeg.js" showLineNumbers {4,8-18}
"use strict"

const { spawnSync } = require("child_process")
const { writeFileSync } = require("fs")

module.exports = {
  convertWebmToMp3(webmBlob) {
    const now = Date.now()
    const input = `/tmp/${now}.webm`
    const output = `/tmp/${now}.mp3`

    writeFileSync(input, webmBlob)

    spawnSync("/opt/ffmpeg/ffmpeg", ["-i", input, output], {
      stdio: "inherit",
    })

    // TODO: cleanup and return MP3 blob.
  },
}
```

Now read the produced MP3 file from disk, clean `/tmp`, and return the MP3 blob:

```js title="audio-transcoder/src/ffmpeg.js" showLineNumbers {18-23}
"use strict"

const { spawnSync } = require("child_process")
const { readFileSync, writeFileSync, unlinkSync } = require("fs")

module.exports = {
  convertWebmToMp3(webmBlob) {
    const now = Date.now()
    const input = `/tmp/${now}.webm`
    const output = `/tmp/${now}.mp3`

    writeFileSync(input, webmBlob)

    spawnSync("/opt/ffmpeg/ffmpeg", ["-i", input, output], {
      stdio: "inherit",
    })

    const mp3Blob = readFileSync(output)

    unlinkSync(input)
    unlinkSync(output)

    return mp3Blob
  },
}
```

Finally, use the MP3 blob in the handler to write it to the output bucket:

```js title="audio-transcoder/src/handler.js" showLineNumbers {4,30-38}
"use strict"

const S3 = require("aws-sdk/clients/s3")
const ffmpeg = require("./ffmpeg")
const { S3_INPUT_BUCKET_NAME, S3_OUTPUT_BUCKET_NAME } = process.env
const s3Client = new S3()

module.exports.transcodeToMp3 = async (event) => {
  try {
    for (const Record of event.Records) {
      const { s3 } = Record
      if (!s3) {
        continue
      }

      const { object: s3Object = {} } = s3
      const { key } = s3Object
      if (!key) {
        continue
      }

      const decodedKey = decodeURIComponent(key)
      const webmRecording = await s3Client
        .getObject({
          Bucket: S3_INPUT_BUCKET_NAME,
          Key: decodedKey,
        })
        .promise()

      const mp3Blob = ffmpeg.convertWebmToMp3(webmRecording.Body)
      await s3Client
        .putObject({
          Bucket: S3_OUTPUT_BUCKET_NAME,
          Key: decodedKey.replace("webm", "mp3"),
          ContentType: "audio/mpeg",
          Body: mp3Blob,
        })
        .promise()
    }
  } catch (err) {
    console.log("Transcoder Error: ", err)
  }
}
```

### 4. Release the updated Lambda function

Run the same command like before from the project root to release the Lambda:

```sh
sls deploy --region eu-west-1 --stage prod
```

### 5. Upload another WebM audio file

When Serverless is done deploying, upload another WebM audio file to the input bucket.

But nothing happens... Where's the MP3 file?

Lets find out why this is happening by checking the Lambda function's log files in the AWS web console:

- Go to the Lambda service.
- Click on the `audio-transcoder-prod-transcodeToMp3` function.
- Click on the "Monitoring" tab.
- Click the "View logs in CloudWatch" button.
- Select the latest log group.

Here you should see the logs of the Lambda function.

![[attachments/audio-transcoding-lambda/logs-timeout.png]]

The logs tell us that FFmpeg is executing (hooray!) but that it doesn't complete (boo!).

In the middle of the transcoding process the logs just say `END`. And on the last line we see that the Lambda had a duration of `6006.17 ms`.

What's happening? The Lambda function takes "too long" to finish executing. By default Lambda has a timeout of 6 seconds[^7]. And after 6 seconds the Lambda function is still not done transcoding, so AWS _terminates_ it.

[^7]: At the time of this writing the maximum timeout is [900 seconds](https://docs.aws.amazon.com/lambda/latest/dg/limits.html).

How do we solve this? By optimizing the Lambda function!

### 6. Optimize the Lambda function

First let's just set the timeout to a larger value. For example 180 seconds. This way we can see how long it would actually take to complete the transcoding process:

```yaml title="audio-transcoder/serverless.yml"
functions:
  transcodeToMp3:
    timeout: 180
```

Deploy again. When Serverless is done, upload another WebM audio file, and check the logs.

![[attachments/audio-transcoding-lambda/logs-complete.png]]

This time we see FFmpeg completes the transcoding process and that the Lambda had a duration of `7221.95 ms`. If we check the output bucket now, we'll see the MP3 file!

#### Optimizing further

Transcoding the audio file in ~7 seconds isn't bad. Actually, it's very similar to Amazon Elastic Transcoder. But we can do better.

Something that's very important when working with Lambda, is to _always_ performance tune your functions. Or in other words, always make sure that a Lambda function has the _optimum_ memory size configured.

This is important because when you choose a higher memory setting, AWS will also give you an equivalent resource boost (like CPU). And this will usually positively impact the Lambda function's runtime duration. Which means you'll pay less money.

By default a Lambda function has a memory setting of 128 MB. So lets increase it and compare results. A good strategy is usually to keep doubling memory and measure the duration. But for the sake of brevity, I'm jumping ahead to 2048 MB:

```yaml title="audio-transcoder/serverless.yml"
functions:
  transcodeToMp3:
    memorySize: 2048
```

Deploy again. And when Serverless is done, upload another WebM audio file and check the logs.

![[attachments/audio-transcoding-lambda/logs-double-memory.png]]

Great, it's even faster now! Does this mean we can just keep increasing the memory and reap the benefits? Sadly, no. There's a tipping point where increasing the memory wont make it run faster.

For example, increasing the memory to 3008 MB (the maximum [memory limit](https://docs.aws.amazon.com/lambda/latest/dg/limits.html) at the time of this writing) will result in a similar runtime duration:

##### Memory 2048 MB

| Test run | Duration     | Billed Duration | Cold Start Duration |
| :------- | :----------- | :-------------- | :------------------ |
| 1        | `3775,63 ms` | `3800 ms`       | `392,59 ms`         |
| 2        | `3604,71 ms` | `3700 ms`       | -                   |
| 3        | `3682,62 ms` | `3700 ms`       | -                   |
| 4        | `3677,14 ms` | `3700 ms`       | -                   |
| 5        | `3725,77 ms` | `3800 ms`       | -                   |

##### Memory 3008 MB

| Test run | Duration     | Billed Duration | Cold Start Duration |
| :------- | :----------- | :-------------- | :------------------ |
| 1        | `4125,12 ms` | `4200 ms`       | `407,92 ms`         |
| 2        | `3767,79 ms` | `3800 ms`       | -                   |
| 3        | `3736,06 ms` | `3800 ms`       | -                   |
| 4        | `3662,68 ms` | `3700 ms`       | -                   |
| 5        | `3717,01 ms` | `3800 ms`       | -                   |

When done optimizing, make sure to apply a sensible value for the Lambda timeout. In this case, the default of 6 seconds would be a good one.

## Comparing costs

To compare costs between both implementation, I did a couple of test runs converting a 3 minute (2,8 MB) WebM audio file to MP3.

The following comparison is by no means very extensive, and your mileage may vary. But in my opinion I think it's good enough to get a decent impression of the cost range.

### Amazon Elastic Transcoder costs

The [pricing](https://aws.amazon.com/elastictranscoder/pricing) page tells us we pay per minute (with 20 free minutes every month). And when we only transcode audio in region `eu-west-1`, we'll currently pay `$0,00522` per minute transcoding time.

These are the timing results of the test runs:

| Test run | Transcoding Time |
| :------- | :--------------- |
| 1        | `7638 ms`        |
| 2        | `6663 ms`        |
| 3        | `7729 ms`        |
| 4        | `6595 ms`        |
| 5        | `8752 ms`        |
| 6        | `7216 ms`        |
| 7        | `7167 ms`        |
| 8        | `6605 ms`        |
| 9        | `6718 ms`        |
| 10       | `8700 ms`        |

So the average transcoding time of the audio file would be:

```txt
7638 + 6663 + 7729 + 6595 + 8752 + 7216 + 7167 + 6605 + 6718 + 8700 = 73 783 ms
73783 / 10 = 7378,3 ms
7378,3 / 1000 = 7,3783 sec
```

Lets say we would be transcoding `100 000` of these audio files per month, that would amount to a total transcoding time of:

```txt
7,3783 * 100 000 = 737 830 sec
737 830 / 60 = 12 297,166 666 667 min
```

Since we pay `$0,00522` per minute, the costs without free tier would be:

```txt
12 297,166 666 667 * 0,00522 = $64,191 21
```

And with free tier it would cost:

```txt
(12 297,166 666 667 - 20) * 0,00522 = $64,086 81
```

#### What about Lambda costs?

We're using Lambda to schedule Amazon Elastic Transcoder jobs. So we also have to calculate those (minor if not negligible) costs.

The Lambda [pricing](https://aws.amazon.com/lambda/pricing) page tells us we pay for the **number of requests** and the **duration** (which depends on memory setting).

We get 1 million requests for free every month, and after that you pay `$0,20` per 1 million requests. Since we're only doing 1/10th of that in this example, I'm _not_ including number of requests in the calculations. I'm only focusing on duration costs here.

These are the Lambda durations (with 128 MB memory) for the accompanying transcoder test runs:

| Test run | Duration    | Billed Duration | Cold Start Duration |
| :------- | :---------- | :-------------- | :------------------ |
| 1        | `494,08 ms` | `500 ms`        | `401,61 ms`         |
| 2        | `185,01 ms` | `200 ms`        | -                   |
| 3        | `168,29 ms` | `200 ms`        | -                   |
| 4        | `165,29 ms` | `200 ms`        | -                   |
| 5        | `184,89 ms` | `200 ms`        | -                   |
| 6        | `210,19 ms` | `300 ms`        | -                   |
| 7        | `162,64 ms` | `200 ms`        | -                   |
| 8        | `178,79 ms` | `200 ms`        | -                   |
| 9        | `318,84 ms` | `400 ms`        | -                   |
| 10       | `206,18 ms` | `300 ms`        | -                   |

The average billed duration would be:

```txt
500 + 200 + 200 + 200 + 200 + 300 + 200 + 200 + 400 + 300 = 2700 ms
2700 / 10 = 270 ms
270 / 1000 = 0,27 sec
```

In region `eu-west-1`, we'll currently pay `$0,000 016 6667` for every GB per second (GB/sec). That means we first have to calculate "how much" memory the Lambda function uses for its runtime duration.

For `100 000` transcoding jobs per month (with 128 MB memory) that would be:

```txt
100 000 * 0,27 = 27000 sec
(128 / 1024) * 27000 = 3375 GB/sec
```

Currently you get `400 000` GB/sec for free every month, so depending on your scale you may or may not have to include it in your calculations. But without free tier it would cost:

```txt
3375 * 0,000 016 6667 = $0,056 250 113
```

### FFmpeg and Lambda Layers costs

These are the Lambda durations (with 2048 MB memory) of the test runs:

| Test run | Duration     | Billed Duration | Cold Start Duration |
| :------- | :----------- | :-------------- | :------------------ |
| 1        | `4068,56 ms` | `4100 ms`       | `408,17 ms`         |
| 2        | `3880,55 ms` | `3900 ms`       | -                   |
| 3        | `3910,52 ms` | `4000 ms`       | -                   |
| 4        | `3794,20 ms` | `3800 ms`       | -                   |
| 5        | `3856,73 ms` | `3900 ms`       | -                   |
| 6        | `3859,06 ms` | `3900 ms`       | -                   |
| 7        | `3810,93 ms` | `3900 ms`       | -                   |
| 8        | `3799,19 ms` | `3800 ms`       | -                   |
| 9        | `3858,49 ms` | `3900 ms`       | -                   |
| 10       | `3866,53 ms` | `3900 ms`       | -                   |

The average _billed duration_ would be:

```txt
4100 + 3900 + 4000 + 3800 + 3900 + 3900 + 3900 + 3800 + 3900 + 3900 = 39100 ms
39100 / 10 = 3910 ms
3910 / 1000 = 3,91 sec
```

In region `eu-west-1`, we'll currently pay `$0,000 016 6667` for every GB/sec. For `100 000` transcoding jobs (with 2048 MB memory) that would be:

```txt
100 000 * 3,91 = 391 000 sec
(2048 / 1024) * 391 000 = 782 000 GB/sec
```

Without free tier it would cost:

```txt
782 000 * 0,000 016 6667 = $13,033 3594
```

With free tier it would cost:

```txt
(782 000 - 400 000) * 0,000 016 6667 = $6,366 6794
```

### What about data transfer costs?

<blockquote>
  <p>Data transferred between S3, Glacier, DynamoDB, SES, SQS, Kinesis, ECR, SNS, or SimpleDB and Lambda functions **in the same AWS Region is free**.</p>

  <cite>
    <p><a href="https://aws.amazon.com/lambda/pricing">AWS Lambda: Pricing</a></p>
  </cite>
</blockquote>

Otherwise, data transferred into and out of Lambda functions will be charged at the [EC2 data transfer rates](https://aws.amazon.com/ec2/pricing/on-demand) as listed under the “Data transfer” section.

### Putting it all together

Costs of transcoding `100 000` 3 minute (2,8 MB) WebM audio files to MP3 per month:

| Implementation            | Cost without free tier | Cost with free tier |
| :------------------------ | :--------------------- | :------------------ |
| Amazon Elastic Transcoder | ~ $64                  | ~ $64               |
| FFmpeg and Lambda Layers  | ~ $13                  | ~ $6                |

## In closing

That's a wrap! The post turned out a bit longer than expected, but hopefully it will prove useful in your transcoding adventures.

Happy transcoding!
