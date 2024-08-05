---
title: "AWS Lambda and the Node.js event loop"
description: "Lambda can freeze and thaw its execution context, which can impact Node.js event loop behavior."
date: 2019-05-30
updated: 2023-02-03
tags:
  - evergreen
---

One of the more surprising things I learned recently while working with AWS Lambda is how it interacts with the Node.js event loop.

Lambda is powered by a [virtualization technology](https://aws.amazon.com/blogs/aws/firecracker-lightweight-virtualization-for-serverless-computing). And to optimize performance it can freeze and thaw the execution context of your code so it can be reused.

This will make your code run faster, but can impact the "expected" event loop behavior. We'll explore this in detail. But before we dive in, lets quickly refresh the Node.js concurrency model.

If you're already familiar with the event loop, you can jump straight to the [AWS Lambda](#aws-lambda) section.

## Concurrency model

Node.js is _single threaded_ and the [event loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick) is the concurrency model that allows non-blocking I/O operations to be performed[^1].

[^1]: The event loop is what allows Node.js to perform non-blocking I/O operations (despite the fact that JavaScript is single-threaded) by offloading operations to the system kernel whenever possible.

How? Well, we'll have to discuss the call stack and the task queue first.

### Call stack

Function calls form a _stack of frames_, where each frame represents a single function call.

Every time a function is called, it's _pushed_ onto the stack (i.e. added to the stack). And when the function is done executing, it's _popped_ off the stack (i.e. removed from the stack).

The frames in a stack are popped off in <abbr title="Last In First Out">LIFO</abbr> order.

![[attachments/lambda-nodejs-event-loop/call-stack.png]]

Each frame stores information about the invoked function. Like the arguments the function was called with and any variables defined inside the called function's body.

When we execute the following code:

```js showLineNumbers
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

We can visualize the call stack over time like this.

![[attachments/lambda-nodejs-event-loop/call-stack/1.png]]

1. When the script starts executing, the call stack is empty.

2. `main()` is called, and pushed onto the call stack:

```js showLineNumbers {13}
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

3. While executing `main`, `console.log("main start")` is called, and pushed onto the call stack:

```js showLineNumbers {8}
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

![[attachments/lambda-nodejs-event-loop/call-stack/2.png]]

4. `console.log` executes, prints `main start`, and is popped off the call stack.

5. `main` continues executing, calls `work()`, and is pushed onto the call stack:

```js showLineNumbers {9}
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

6. While executing `work`, `console.log("do work")` is called, and pushed onto the call stack:

```js showLineNumbers {4}
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

![[attachments/lambda-nodejs-event-loop/call-stack/3.png]]

7. `console.log` executes, prints `do work`, and is popped off the call stack.

8. `work` finishes executing, and is popped off the call stack.

9. `main` continues executing, calls `console.log("main end")` and is pushed onto the call stack:

```js showLineNumbers {10}
"use strict"

function work() {
  console.log("do work")
}

function main() {
  console.log("main start")
  work()
  console.log("main end")
}

main()
```

![[attachments/lambda-nodejs-event-loop/call-stack/4.png]]

10. `console.log` executes, prints `main end`, and is popped off the call stack.

11. `main` finishes executing, and is popped off the call stack. The call stack is empty again and the script finishes executing.

This code didn't interact with any asynchronous (internal) APIs. But when it does (like when calling `setTimeout(callback)`) it makes use of the task queue.

### Task queue

Any asynchronous work in the runtime is represented as a task in a queue, or in other words, a _message queue_.

Each message can be thought of as a function that will be called in <abbr title="First In First Out">FIFO</abbr> order to handle said work. For example, the callback provided to the `setTimeout` or `Promise` API.

![[attachments/lambda-nodejs-event-loop/queue.png]]

Additionally, each message is processed _completely_ before any other message is processed. This means that **whenever a function runs it can't be interrupted**. This behavior is called _run-to-completion_ and makes it easier to reason about our JavaScript programs.

Messages get _enqueued_ (i.e. added to the queue) and at some point messages will be _dequeued_ (i.e. removed from the queue).

When? How? This is handled by the Event Loop.

### Event loop

The event loop can be literally thought of as a loop that runs forever, and where every cycle is referred to as a _tick_.

On every tick the event loop will check if there's any work in the task queue. If there is, it will execute the task (i.e. call a function), **but only if the call stack is empty**.

The event loop can be described with the following pseudo code[^2]:

[^2]: Taken from [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop#Event_loop).

```js
while (queue.waitForMessage()) {
  queue.processNextMessage()
}
```

To summarize:

- When code executes, function calls are added to the call stack.
- Whenever calls are made via asynchronous (internal) APIs (like `setTimeout` or `Promise`) the corresponding callbacks are eventually added to the task queue.
- When the call stack is empty and the task queue contains one or more tasks, the event loop will remove a task on every tick and push it onto the call stack. The function will execute and this process will continue until all work is done.

![[attachments/lambda-nodejs-event-loop/event-loop.png]]

With that covered, we can explore how the AWS Lambda execution environment interacts with the Node.js event loop.

## AWS Lambda

AWS Lambda invokes a Lambda function via an exported handler function, e.g. `exports.handler`. When Lambda invokes this handler it calls it with 3 arguments:

```js
handler(event, context, callback)
```

The `callback` argument may be used to return information to the caller and to signal that the handler function has completed, so Lambda may end it. For that reason you don't have to call it explicitly. Meaning, if you don't call it Lambda will call it for you[^3].

[^3]: When using Node.js version `8.10` or above, you may also return a `Promise` instead of using the callback function. In that case you can also make your handler `async`, because `async` functions return a `Promise`.

### Baseline

From here on we'll use a simple script as a "baseline" to reason about the event loop behavior. Create a file called `timeout.js` with the following contents:

```js title="timeout.js" showLineNumbers
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

main()
```

When we execute this script _locally_ (not via Lambda) with `node timeout.js`, the following will print:

```sh title="node timeout.js output"
main start
timeout start
main end
timeout cb fired after 5000 ms
```

The last message takes 5 seconds to print, but the script does _not_ stop executing before it does.

### What happens in Lambda, stays in Lambda

Now lets modify the code from `timeout.js` so it's compatible with Lambda:

```js title="timeout.js" showLineNumbers {20}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

You can create a new function in the AWS Lambda console and paste in the code from above. Run it, sit back and enjoy.

![[attachments/lambda-nodejs-event-loop/console/1.png]]

Wait, what? Lambda just ended the handler function _without_ printing the last message `timeout cb fired after 5000 ms`. Lets run it again.

![[attachments/lambda-nodejs-event-loop/console/2.png]]

It now prints `timeout cb fired after 5000 ms` _first_ and then the other ones! So what's going on here?

### AWS Lambda execution model

AWS Lambda takes care of provisioning and managing resources needed to run your functions. When a Lambda function is invoked, an execution context is created for you based on the configuration you provide. The execution context is a temporary runtime environment that initializes any external dependencies of your Lambda function.

After a Lambda function is called, Lambda maintains the execution context for some time in anticipation of another invocation of the Lambda function (for performance benefits). It freezes the execution context after a Lambda function completes and may choose to reuse (thaw) the same execution context when the Lambda function is called again (but it doesn't have to).

In the AWS docs we can find the following regarding this subject:

<blockquote>
  <p> Background processes or callbacks initiated by your Lambda function that did not complete when the function ended resume <strong>if AWS Lambda chooses to</strong> reuse the Execution Context.</p>

  <cite>
    <p><a href="https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html">AWS docs: Lambda execution environment</a></p>
  </cite>
</blockquote>

As well as this somewhat hidden message:

<blockquote>
  <p>When the callback is called (explicitly or implicitly), AWS Lambda continues the Lambda function invocation until the event loop is empty.</p>

  <cite>
    <p><a href="https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html">AWS docs: Lambda function handler in Node.js</a></p>
  </cite>
</blockquote>

Looking further, there's some documentation about the context object. Specifically about a property called `callbackWaitsForEmptyEventLoop`. This is what it does:

<blockquote>
  <p>The default value is <code>true</code>. This property is useful only to modify the default behavior of the callback. <strong>By default, the callback will wait until the event loop is empty before freezing the process and returning the results to the caller.</strong></p>

  <cite>
    <p><a href="https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html">AWS docs: Lambda context object in Node.js</a></p>
  </cite>
</blockquote>

Okay, so with this information we can make sense of what happened when we executed the code in `timeout.js` before. Lets break it down and go over it step by step.

![[attachments/lambda-nodejs-event-loop/lambda/1.png]]

1. Lambda starts executing the code in `timeout.js`. The call stack is empty.

![[attachments/lambda-nodejs-event-loop/lambda/2.png]]

2. `main` is called, and pushed onto to the call stack:

```js title="timeout.js" showLineNumbers {20}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/3.png]]

3. While executing `main`, `console.log("main start")` is called, and pushed onto the call stack:

```js title="timeout.js" showLineNumbers {15}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/4.png]]

4. `console.log` executes, prints `main start`, and is popped off the call stack.

![[attachments/lambda-nodejs-event-loop/lambda/5.png]]

5. `main` continues executing, calls `timeout(5e3)`, and is pushed onto the call stack:

```js title="timeout.js" showLineNumbers {16}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/6.png]]

6. While executing `timeout`, `console.log("timeout start")` is called, and pushed onto the call stack:

```js title="timeout.js" showLineNumbers {4}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/7.png]]

7. `console.log` executes, prints `timeout start`, and is popped off the call stack.

![[attachments/lambda-nodejs-event-loop/lambda/8.png]]

8. `timeout` continues executing, calls `new Promise(callback)` on line 6, and is pushed onto the call stack:

```js title="timeout.js" showLineNumbers /new Promise/
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/9.png]]

9. While `new Promise(callback)` executes, it interacts with the `Promise` API and passes the provided callback to it. The `Promise` API sends the callback to the task queue and now must wait until the call stack is empty before it can execute.

![[attachments/lambda-nodejs-event-loop/lambda/10.png]]

10. `new Promise` finishes executing, and is popped of the call stack.

![[attachments/lambda-nodejs-event-loop/lambda/11.png]]

11. `timeout` finishes executing, and is popped off the call stack.

![[attachments/lambda-nodejs-event-loop/lambda/12.png]]

12. `main` continues executing, calls `console.log("main end")`, and is pushed onto the call stack:

```js title="timeout.js" showLineNumbers {17}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/13.png]]

13. `console.log` executes, prints `main end`, and is popped off the call stack.

![[attachments/lambda-nodejs-event-loop/lambda/14.png]]

14. `main` finishes executing, and is popped off the call stack. The call stack is empty.

![[attachments/lambda-nodejs-event-loop/lambda/15.png]]

15. The `Promise` callback (step 9) can now be scheduled by the event loop, and is pushed onto the call stack.

![[attachments/lambda-nodejs-event-loop/lambda/16.png]]

16. The `Promise` callback executes, calls `setTimeout(callback, timeout)` on line 7, and is pushed onto the call stack:

```js title="timeout.js" showLineNumbers /setTimeout/
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

![[attachments/lambda-nodejs-event-loop/lambda/17.png]]

17. While `setTimeout(callback, timeout)` executes, it interacts with the `setTimeout` API and passes the corresponding callback and timeout to it.

![[attachments/lambda-nodejs-event-loop/lambda/18.png]]

18. `setTimeout(callback, timeout)` finishes executing and is popped of the call stack. At the same time the `setTimeout` API starts counting down the timeout, to schedule the callback function in the future.

![[attachments/lambda-nodejs-event-loop/lambda/19.png]]

19. The Promise callback finishes executing and is popped off the call stack. The call stack is empty again.

At this point the call stack and task queue are both empty. At the same time a timeout is counting down (5 seconds), but the corresponding timeout callback has _not_ been scheduled yet. As far as Lambda is concerned, the event loop is empty. So it will _freeze_ the process and return results to the caller!

The interesting part here is that Lambda doesn't immediately destroy its execution context. Because if we wait for +5 seconds and run the Lambda again (like in the [second run](#what-happens-in-lambda-stays-in-lambda)) we see the console message printed from the `setTimeout` callback first.

This happens because after the Lambda stopped executing, the execution context was still around. And after waiting for +5 seconds, the `setTimeout` API sent the corresponding callback to the task queue:

![[attachments/lambda-nodejs-event-loop/lambda/exec-context-1.png]]

When we execute the Lambda again (second run), the call stack is empty with a message in the task queue, which can immediately be scheduled by the event loop:

![[attachments/lambda-nodejs-event-loop/lambda/exec-context-2.png]]

This results in `timeout cb fired after 5000 ms` being printed first, because it executed before any of the code in our Lambda function:

![[attachments/lambda-nodejs-event-loop/lambda/exec-context-3.png]]

### Doing it right

Obviously this is undesired behavior and you should _not_ write your code in the same way we wrote the code in `timeout.js`.

Like stated in the AWS docs, we need to make sure to complete processing _all_ callbacks before our handler exits:

<blockquote>
  <p>You should make sure any background processes or callbacks (in case of Node.js) in your code are complete before the code exits.</p>

  <cite>
    <p><a href="https://docs.aws.amazon.com/lambda/latest/dg/running-lambda-code.html">AWS docs: Lambda execution environment</a></p>
  </cite>
</blockquote>

Therefore we'll make the following change to the code in `timeout.js`:

```diff
- timeout(5e3);
+ await timeout(5e3);
```

This change makes sure the handler function does _not_ stop executing until the `timeout` function finishes:

```js title="timeout.js" showLineNumbers {16}
"use strict"

function timeout(ms) {
  console.log("timeout start")

  return new Promise((resolve) => {
    setTimeout(() => {
      console.log(`timeout cb fired after ${ms} ms`)
      resolve()
    }, ms)
  })
}

async function main() {
  console.log("main start")
  await timeout(5e3)
  console.log("main end")
}

exports.handler = main
```

When we run our code with this change, all is well now.

![[attachments/lambda-nodejs-event-loop/console/3.png]]

## In closing

I intentionally left out some details about the the task queue. There are actually _two_ task queues! One for _macrotasks_ (e.g. `setTimeout`) and one for _microtasks_ (e.g. `Promise`).

According to the [spec](https://html.spec.whatwg.org/multipage/webappapis.html#task-queue), one macrotask should get processed per tick. And after it finishes, all microtasks will be processed within the same tick. While these microtasks are processed they can enqueue more microtasks, **which will all be executed in the same tick**.

For more information see [this article from RisingStack](https://blog.risingstack.com/node-js-at-scale-understanding-node-js-event-loop) where they go more into detail.

This post was originally published on [Medium](https://medium.com/radient-tech-blog/aws-lambda-and-the-node-js-event-loop-864e48fba49).
