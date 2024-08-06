---
title: Obsidian web clipper
description: My bookmarklet to clip web pages to Obsidian.
date: 2023-06-18
updated: 2024-08-06
tags:
  - evergreen
---

I recently started using [Obsidian](https://obsidian.md) and I like it a lot! One thing I was missing though, was to quickly save (i.e. "clip") a webpage to Obsidian from my browser. So I was happy to find Stephan Ango's [Obsidian web clipper](https://stephanango.com/obsidian-web-clipper) which does just that (thanks Stephan!).

Stephan's web clipper works pretty well, but I wanted slightly different behavior. And since the web clipper is an open source bookmarklet, it was easy for me to modify.

## What is a bookmarklet?

A [bookmarklet](https://en.wikipedia.org/wiki/Bookmarklet) is a browser bookmark that runs some JavaScript code every time you click it.

You can create a bookmarklet by creating a new bookmark in your browser, but instead of providing a link to a website, you give it a `javascript` URI. For example:

```js
javascript: alert("Go eat ice cream!")
```

So the bookmarklet above would show a "Go eat ice cream!" alert every time you click it (and I highly recommend you install it).

## My Obsidian web clipper

My version of the bookmarklet is based on Stephan Ango's [Obsidian web clipper](https://gist.github.com/kepano/90c05f162c37cf730abb8ff027987ca3), so it does pretty much the same thing, but with these differences:

- npm dependencies are loaded as ECMAScript modules from [jsDelivr](https://www.jsdelivr.com/?docs=esm).
- Clippings of entire webpages, and clippings of selections are stored in _separate_ Obsidian folders: `Clippings` and `Clippings/Quotes`.
- Clippings of selections (quotes) of the same webpage are _appended_ to the same Obsidian note.
- Quotes include the selected [text fragment](https://web.dev/text-fragments/) in the source link. So visiting the quote's source link will scroll you to, and highlight, the clipped text on the webpage. This only works natively in Chromium and Safari, but [this browser extension](https://github.com/GoogleChromeLabs/link-to-text-fragment#installation) can be installed to polyfill the functionality.
- An alert dialog will show when clipping fails.

### How to use it?

1. Drag this link to your bookmarks: <a href='javascript:(function(){function _getSelection(e){if(void 0===window.getSelection)return{hasSelection:!1,html:"",textFragment:""};const t=window.getSelection();if(!t||t.rangeCount<1)return{hasSelection:!1,html:"",textFragment:""};const{status:n,fragment:o}=e(t),i=_makeTextFragmentDirective(n,o),r=window.document.createElement("div");for(let e=0,n=t.rangeCount;e<n;++e)r.appendChild(t.getRangeAt(e).cloneContents());const l=r.innerHTML;return{hasSelection:Boolean(l),html:l,textFragment:i}}function _makeTextFragmentDirective(e,t){if(0!==e)return"";const n=t.prefix?`${encodeURIComponent(t.prefix)}-,`:"",o=t.suffix?`,-${encodeURIComponent(t.suffix)}`:"";return`#:~:text=${n}${encodeURIComponent(t.textStart)}${t.textEnd?`,${encodeURIComponent(t.textEnd)}`:""}${o}`}function _makeObsidianNoteContent({author:e,body:t,excerpt:n,selection:o,title:i,url:r}){let l=new URL(r);l.search="",l.hash="",l=l.toString();const a=new Date;if(o.hasSelection){return`> [!quote] ${a.toLocaleDateString(void 0,{weekday:"short",year:"numeric",month:"short",day:"numeric",hour:"numeric",minute:"numeric"})} &bull; [Source](${l}${o.textFragment})\n\n${t}\n\n---\n\n`}{const o=n!==i?n:"",[r]=a.toISOString().split("T");return`---\ntitle: ${i}\ndescription: ${o}\ndate: ${r}\ntags:\n  - clipping\n---\n\n> [!note]\n> ${`[${i}](${l})`}${e?" by "+e:""}\n\n${t}\n`}}function _makeObsidianUri({config:e,content:t,selection:n,title:o}){const i={content:t,file:`${n.hasSelection?e.selectionFolderName:e.folderName}/${o.replace(/:/g,"").replace(/\//g,"-").replace(/\\/g,"-")}`};n.hasSelection&&(i.append="true");return`obsidian://new?${Object.entries(i).map((([e,t])=>`${e}=${encodeURIComponent(t)}`)).join("&")}`}Promise.all([import("https://cdn.jsdelivr.net/npm/@mozilla/readability/+esm"),import("https://cdn.jsdelivr.net/npm/turndown/+esm"),import("https://cdn.jsdelivr.net/npm/text-fragments-polyfill/dist/fragment-generation-utils.js/+esm"),Promise.resolve({folderName:"Clippings",selectionFolderName:"Clippings/Quotes"})]).then((([e,t,n,o])=>{const{Readability:i}=e.default,{default:r}=t,{generateFragment:l}=n,a=_getSelection(l),{byline:c,content:s,excerpt:d,title:m}=new i(window.document.cloneNode(!0)).parse(),u=_makeObsidianUri({config:o,content:_makeObsidianNoteContent({author:c,body:new r({headingStyle:"atx",hr:"---",bulletListMarker:"-",codeBlockStyle:"fenced"}).turndown(a.html||s),excerpt:d,selection:a,title:m,url:window.document.URL}),selection:a,title:m});window.document.location.href=u})).catch((e=>{alert("Failed to clip to Obsidian\n\n"+e+"\n\n(see the browser developer console for more details)")}));}());'>
   Clip to Obsidian
   </a>
2. Visit a webpage:

   a. To clip an entire webpage: click the bookmark.

   b. To only clip part of a webpage: first select some text (can include images), then click the bookmark.

### Known issues

- Clipping does not work on webpages that enable [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) (CSP), which block inline scripts (e.g. you can't clip Reddit and Twitter posts).
- Clipping selections does not work in Safari. Because Safari's confirmation dialog "unselects" any content before clipping (so it always clips the entire webpage).

### The code

Feel free to remix the code below. And after changing the code, you can turn it into a bookmarklet with [Make Bookmarklets](https://make-bookmarklets.com/).

```js showLineNumbers
/**
 * Obsidian web clipper (bookmarklet).
 *
 * Based on Stephan Ango's "Obsidian web clipper".
 * @see {@link https://stephanango.com/obsidian-web-clipper}
 *
 * Uses jsDelivr to import npm dependencies as ESM modules.
 * @see {@link https://www.jsdelivr.com/?docs=esm}
 *
 * Made into a bookmarklet with "Make Bookmarklets".
 * @see {@link https://make-bookmarklets.com/}
 */
Promise.all([
  // Dependencies.
  import("https://cdn.jsdelivr.net/npm/@mozilla/readability/+esm"),
  import("https://cdn.jsdelivr.net/npm/turndown/+esm"),
  import(
    "https://cdn.jsdelivr.net/npm/text-fragments-polyfill/dist/fragment-generation-utils.js/+esm"
  ),

  // Config.
  Promise.resolve({
    // Clippings of entire webpages will be stored as separate notes in
    // this Obsidian folder.
    folderName: "Clippings",

    // Clippings of selections will be stored in this Obsidian folder,
    // where clippings of the same webpage will be appended to the same
    // Obsidian note.
    selectionFolderName: "Clippings/Quotes",
  }),
])
  .then(([readabilityJs, turndownJs, textFragmentsPolyfillJs, config]) => {
    const { Readability } = readabilityJs.default
    const { default: Turndown } = turndownJs
    const { generateFragment } = textFragmentsPolyfillJs
    const selection = _getSelection(generateFragment)

    // Readability removes clutter from web pages.
    // It's the same library that's used in Firefox's Reader View.
    // See: https://www.npmjs.com/package/@mozilla/readability
    const {
      byline: author,
      content,
      excerpt,
      title,
    } = new Readability(window.document.cloneNode(true)).parse()

    // Converts HTML to Markdown.
    // See: https://www.npmjs.com/package/turndown
    const markdown = new Turndown({
      headingStyle: "atx",
      hr: "---",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
    }).turndown(selection.html || content)

    const obsidianContent = _makeObsidianNoteContent({
      author,
      body: markdown,
      excerpt,
      selection,
      title,
      url: window.document.URL,
    })

    const obsidianUri = _makeObsidianUri({
      config,
      content: obsidianContent,
      selection,
      title,
    })

    window.document.location.href = obsidianUri
  })
  .catch((error) => {
    alert(
      "Failed to clip to Obsidian" +
        "\n\n" +
        error +
        "\n\n" +
        "(see the browser developer console for more details)",
    )
  })

function _getSelection(generateFragmentFn) {
  if (typeof window.getSelection === "undefined") {
    return {
      hasSelection: false,
      html: "",
      textFragment: "",
    }
  }

  const sel = window.getSelection()
  if (!sel || sel.rangeCount < 1) {
    return {
      hasSelection: false,
      html: "",
      textFragment: "",
    }
  }

  const { status, fragment } = generateFragmentFn(sel)
  const textFragment = _makeTextFragmentDirective(status, fragment)
  const container = window.document.createElement("div")
  for (let i = 0, len = sel.rangeCount; i < len; ++i) {
    container.appendChild(sel.getRangeAt(i).cloneContents())
  }
  const html = container.innerHTML
  return {
    hasSelection: Boolean(html),
    html,
    textFragment,
  }
}

/**
 * Makes the text fragment directive to highlight a text selection.
 *
 * Only Chromium/Safari browsers support text fragments.
 * @see {@link https://web.dev/text-fragments/}
 *
 * But a browser extension can be installed to polyfill the functionality.
 * @see {@link https://github.com/GoogleChromeLabs/link-to-text-fragment}
 */
function _makeTextFragmentDirective(status, fragment) {
  if (status !== 0) {
    // Non-0 status means error.
    // See: https://github.com/GoogleChromeLabs/link-to-text-fragment/blob/main/fragment-generation-utils.js#L779
    return ""
  }

  const prefix = fragment.prefix ? `${encodeURIComponent(fragment.prefix)}-,` : ""
  const suffix = fragment.suffix ? `,-${encodeURIComponent(fragment.suffix)}` : ""
  const start = encodeURIComponent(fragment.textStart)
  const end = fragment.textEnd ? `,${encodeURIComponent(fragment.textEnd)}` : ""
  return `#:~:text=${prefix}${start}${end}${suffix}`
}

/**
 * Makes the Obsidian note content.
 *
 * For webpage clippings only (i.e. not webpage selection clippings):
 *
 * Uses YAML front matter to add metadata about the clipping to the note.
 * @see {@link https://help.obsidian.md/Editing+and+formatting/Metadata}
 *
 * Uses a comment to link to a daily note (you can't link to other notes
 * in the front matter).
 * @see {@link https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax#Comments}
 */
function _makeObsidianNoteContent({ author, body, excerpt, selection, title, url }) {
  // NOTE: I'm stripping the query/hash params because I just need to
  // link back to the clipping source. But it could be that a page is
  // using those params to show specific content, which will be "lost"
  // after stripping. So might have to revisit this..
  let cleanUrl = new URL(url)
  cleanUrl.search = ""
  cleanUrl.hash = ""
  cleanUrl = cleanUrl.toString()

  const now = new Date()

  if (selection.hasSelection) {
    // `locales` is set to `undefined` to use the default locale.
    // See: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toLocaleDateString
    const prettyDate = now.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    })
    return `> [!quote] ${prettyDate} &bull; [Source](${cleanUrl}${selection.textFragment})

${body}

---

`
  } else {
    const summary = excerpt !== title ? excerpt : ""
    const [yyyy_mm_dd] = now.toISOString().split("T")
    const titleLink = `[${title}](${cleanUrl})`
    return `---
title: ${title}
description: ${summary}
date: ${yyyy_mm_dd}
tags:
  - clipping
---

> [!note]
> ${titleLink}${author ? " by " + author : ""}

${body}
`
  }
}

/**
 * Makes the Obsidian URI to create/append to a note.
 * @see {@link https://help.obsidian.md/Advanced+topics/Using+Obsidian+URI#Action+%60new%60}
 */
function _makeObsidianUri({ config, content, selection, title }) {
  const folderName = selection.hasSelection ? config.selectionFolderName : config.folderName

  // NOTE: characters ":", "/" and "\" are not allowed in file names.
  const fileName = title.replace(/:/g, "").replace(/\//g, "-").replace(/\\/g, "-")

  const query = {
    content,
    file: `${folderName}/${fileName}`,
  }

  if (selection.hasSelection) {
    // NOTE: "boolean" params trigger with any truthy value, like
    // `append=false`.
    query.append = "true"
  }

  // NOTE: URLSearchParams().toString() encoding leads to unexpected
  // behavior, so use `encodeURIComponent()` instead.
  const queryString = Object.entries(query)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&")

  return `obsidian://new?${queryString}`
}
```
