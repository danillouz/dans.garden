---
title: Comments
description: Learning new things about Go doc comments.
date: 2024-08-19
aliases:
  - Go Doc
tags:
  - seedling
---

Go doc comments are comments directly above `package`, `type`, `const`, `var` and `func` declarations. And every exported name should have a doc comment.

The Go tooling can extract documentation from the source code when doc comments are used correctly.

But it turns out I wasn't always formatting doc comments correctly, and I didn't know you could use [[#Links|links]] and [[#Doc links|doc links]] (which also work in your favourite code editor).

## Paragraphs

Line breaks are preserved by `gofmt` in paragraphs. So comments will not be rewrapped (`godoc` and `pkgsite` _will_ rewrap comment text when printing it).

This makes it possible to use semantic linefeeds:

```go
// This is a paragraph.
// Each sentence can be placed on a separate line.
// And it wont be rewrapped by gofmt.
```

> [!note] Semantic linefeeds?
> Semantic linefeeds place sentences or long phrases on a separate line. This can make text easier to read, and diffs easier to maintain as code and comments change over time.
>
> See [semantic linefeeds](https://rhodesmill.org/brandon/2012/one-sentence-per-line/).

## Headings

Headings are lines that begins with `#` followed by a space and text. Headings must be unindented and followed by a blank line:

```go
// # This is a heading
//
// This is a paragraph.
```

## Links

Link targets are created by using the format `[Text]: URL`. Then other text in the same comment block can refer to the link by using `[Text]`:

```go
// This is a paragraph using a [Link to example].
//
// [Link to example]: https://example.com
```

## Doc links

Doc links link to symbols in the current or an external package. They are created using the format `[Name]` and `[pkg.Name]`:

```go
// This links to [http.Handler] and [SomeStruct].
```

It's also possible to link to fields using `[Name.FieldName]` and methods using `[Name.FuncName]`.

Pointer types can also be linked by using a leading `*`:

```go
// This links to a pointer [*bytes.Buffer].
```

## Code blocks

Code blocks are indented lines that are not a [[#Lists|list]]:

```go
// This is a code block:
//
//  func Hello() string {
//      return "Hello"
//  }
```

## Lists

List are indented lines that begin with a decimal number and/or special character.

### Numbered lists

For numbered lists, a line must:

- Begin with a decimal number.
- Followed by a special character: period `.` or right parenthesis `)`.
- Followed by a space or tab.
- Followed by text.

For example:

```go
// This is a numbered list:
//  1. One
//  2. Two
```

### Bullet lists

For bullet lists, a line must:

- Begin with a special character: star `*`, plus `+`, dash `-` or Unicode bullet `•`.
- Followed by a space or tab.
- Followed by text.

For example:

```go
// This is a bullet list:
//  - One
//  - Two
```

## Resources

- [Go Doc Comments](https://tip.golang.org/doc/comment)
