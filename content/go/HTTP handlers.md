---
title: HTTP handlers
description: Learning about the HTTP request multiplexer, handlers and middleware in Go.
date: 2022-12-22
updated: 2024-08-17
tags:
  - evergreen
---

I recently had to hook-up some middleware in a Go service. And while looking into the Go standard library [net/http](https://pkg.go.dev/net/http) package, I got a bit confused by all the different (but similarly named) types and functions that deal with HTTP handlers.

For example, the `http.Handler` and `http.HandlerFunc` types. The `http.Handle()` and `http.HandleFunc()` functions. And the `http.ServeMux` type that _also_ defines `Handle()` and `HandleFunc()` methods.

At first I didn't really get the difference. And I didn't understand why middleware in Go is typically a function that accepts and returns an `http.Handler`. But after some (re)reading and experimentation, it all made sense. This is what I learned.

## Handler & ServeMux

In a web server we'd typically have _handlers_ that respond to HTTP requests. And _routers_ that map URL patterns to handlers. But how are these exposed via the standard library?

### Handler

The `net/http` package exposes the [http.Handler](https://pkg.go.dev/net/http#Handler) interface:

```go
type Handler interface {
	ServeHTTP(ResponseWriter, *Request)
}
```

And any type that satisfies the `http.Handler` interface can be used as a handler. Or in other words, any type that implements the `ServeHTTP(ResponseWriter, *Request)` method can be used to respond to HTTP requests.

### ServeMux

As far as I know, the standard library doesn't use the term "router". It uses the term _HTTP request multiplexer_ instead. But they are essentially the same thing.

The multiplexer matches the URL path of an incoming request against registered patterns, and calls the handler for the pattern that most closely matches the URL. The standard library exposes [http.ServeMux](https://pkg.go.dev/net/http#ServeMux) for this purpose.

So if we implement an `http.Handler` and use it together with an `http.ServeMux`[^1], we can use [Handle()](https://pkg.go.dev/net/http#ServeMux.Handle) to respond to HTTP requests:

[^1]: `http.ServeMux` also satisfies the `http.Handler` interface, as it implements a [ServeHTTP(ResponseWriter, \*Request)](https://pkg.go.dev/net/http#ServeMux.ServeHTTP) method.

```go title="main.go" showLineNumbers
package main

import (
	"log"
	"net/http"
)

type HomeHandler struct{}

func (h HomeHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Home"))
}

func main() {
	mux := http.NewServeMux()
	handler := HomeHandler{}
	mux.Handle("/", handler)
	if err := http.ListenAndServe(":8888", mux); err != nil {
		log.Fatal(err)
	}
}
```

### Handle vs HandleFunc

In the example above we used the `Handle()` method to respond to requests. But `http.ServeMux` also has the [HandleFunc()](https://pkg.go.dev/net/http#ServeMux.HandleFunc) method. So what's the difference?

At first glance it looks like both accept a pattern and a handler. But `Handle()` requires a handler that satisfies the `http.Handler` interface. While `HandleFunc()` accepts any function that defines `http.ResponseWriter` and `*http.Request` parameters:

- `Handle(pattern string, handler Handler){:go}`
- `HandleFunc(pattern string, handler func(ResponseWriter, *Request)){:go}`

So we can achieve the exact same thing as in the example above with the following:

```go title="main.go" showLineNumbers
package main

import (
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Home"))
	})
	if err := http.ListenAndServe(":8888", mux); err != nil {
		log.Fatal(err)
	}
}

```

### DefaultServeMux

We saw in the above examples that `http.ServeMux` exposes the `Handle()` and `HandleFunc()` methods. But it turns out that instead of first creating a multiplexer with `http.NewServeMux()`, it's also possible to just use [http.Handle()](https://pkg.go.dev/net/http#Handle) or [http.HandleFunc()](https://pkg.go.dev/net/http#HandleFunc).

For example:

```go title="main.go" showLineNumbers
package main

import (
	"log"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Home"))
	})
	if err := http.ListenAndServe(":8888", nil); err != nil {
		log.Fatal(err)
	}
}
```

Using these functions will actually make use of a "default" `http.ServeMux` under the hood. This default multiplexer is defined by the standard library, and named [DefaultServeMux](https://cs.opensource.google/go/go/+/refs/tags/go1.19.2:src/net/http/server.go;l=2552)[^2].

[^2]: `DefaultServeMux` is just a [ServeMux](https://cs.opensource.google/go/go/+/refs/tags/go1.19.2:src/net/http/server.go;drc=867babe1b1587ab6961c1d6274be2426e90bf5d4;l=2305).

### So what's HandlerFunc?

Turns out that a very useful type to know about when working with handlers is [http.HandlerFunc](https://pkg.go.dev/net/http#HandlerFunc).

This type allows us to convert a "plain" handler function (i.e. `func(ResponseWriter, *Request)`) into a "real" `http.Handler`. Which is great, because this makes it more convenient to work with handlers.

So the following won't compile:

```go
handler := func(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Home"))
}
http.Handle("/", handler) // ❌ Does not compile

```

But this will compile:

```go
handler := func(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Home"))
}
http.Handle("/", http.HandlerFunc(handler)) // ✅ Compiles
```

Note that `http.HandlerFunc(handler)` does _not_ invoke `http.HandlerFunc` (it's a type, not a function!). But that it's doing a [type conversion](https://go.dev/ref/spec#Conversions)[^3] which converts `handler` with type `func(ResponseWriter, *Request)` into type `http.HandlerFunc`.

[^3]: A type conversion is _not_ the same thing as a [type assertion](https://go.dev/ref/spec#Type_assertions).

## Middleware

Middleware are typically small functions which take a request, do something with it, and then pass it to _another_ middleware or the (final) handler.

In Go, middleware will sit "between" the multiplexer and the handler responding to the HTTP requests.

A few examples of typical middleware use cases are:

- Logging requests.
- Auth (i.e. authenticate and/or authorize requests).
- Header and response manipulation.

Generally speaking, in Go, functions that accept and return an `http.Handler` are considered middleware:

```go
func(next http.Handler) http.Handler
```

For example:

```go
func someMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Do something with `r`.

		next.ServeHTTP(w, r)
	})
}

```

Why does middleware accept and return an `http.Handler`? This allows us to create a "chain" of handlers:

```go
http.Handle("/", middlewareA(middlewareB(middlewareC(handler))))
```

But this can a get a bit unreadable. And that's why third-party libraries typically offer a `Use()` function.

For example, this is how you'd use it with [chi](https://go-chi.io/#/pages/middleware):

```go
r := chi.NewRouter()
r.Use(middlewareA, middlewareB, middlewareC)
r.Get("/", handler)
```

## ServeMux gotchas

To wrap up, I want to highlight some (sometimes unexpected) behavior I learned about while reading the docs and playing with `http.ServeMux`.

### Paths and patterns

When registering a handler for a pattern with `http.ServeMux`, the pattern can either name **fixed paths**, or **subtree paths**.

Fixed paths do _not_ have a trailing slash (e.g. `/blog` or `/blog/create`). And they are only matched when the URL _exactly_ matches the pattern.

Subtree paths _do_ have a trailing slash (e.g. `/` or `/blog/` or `/blog/create/`). And they match all paths _not_ matched by other registered patterns. So subtree paths kind of work like "catch all" patterns:

```go
mux.HandleFunc("/", homeHandler) // Subtree path
```

| Request path   | Calls `homeHandler` |
| :------------- | :------------------ |
| `/`            | ✅ Yes              |
| `/blog`        | ✅ Yes              |
| `/blog/`       | ✅ Yes              |
| `/blog/create` | ✅ Yes              |
| `/notfound`    | ✅ Yes              |

Note that subtree path patterns will match when _not_ matched by other registered (fixed path) patterns:

```go
mux.HandleFunc("/", homeHandler) // Subtree path
mux.HandleFunc("/blog", blogHandler) // Fixed path
```

| Request path   | Calls `homeHandler` | Calls `blogHandler` |
| :------------- | :------------------ | :------------------ |
| `/`            | ✅ Yes              | ❌ No               |
| `/blog`        | ❌ No               | ✅ Yes              |
| `/blog/`       | ✅ Yes              | ❌ No               |
| `/blog/create` | ✅ Yes              | ❌ No               |
| `/notfound`    | ✅ Yes              | ❌ No               |

So to for example let handlers match the `/blog/*` URL patterns, a subtree path must be used instead of a fixed path:

```go
mux.HandleFunc("/", homeHandler) // Subtree path
mux.HandleFunc("/blog/", blogHandler) // Subtree path
```

| Request path   | Calls `homeHandler` | Calls `blogHandler` |
| :------------- | :------------------ | :------------------ |
| `/`            | ✅ Yes              | ❌ No               |
| `/blog`        | ❌ No               | ✅ Yes              |
| `/blog/`       | ❌ No               | ✅ Yes              |
| `/blog/create` | ❌ No               | ✅ Yes              |
| `/notfound`    | ✅ Yes              | ❌ No               |

Also note that longer registered path patterns take precedence over shorter ones:

```go
mux.HandleFunc("/blog/", blogHandler) // Subtree path
mux.HandleFunc("/blog/create/", blogCreateHandler) // Subtree path
```

| Request path     | Calls `blogHandler` | Calls `blogCreateHandler` |
| :--------------- | :------------------ | :------------------------ |
| `/`              | ❌ No               | ❌ No                     |
| `/blog`          | ✅ Yes              | ❌ No                     |
| `/blog/`         | ✅ Yes              | ❌ No                     |
| `/blog/1`        | ✅ Yes              | ❌ No                     |
| `/blog/create`   | ❌ No               | ✅ Yes                    |
| `/blog/create/1` | ❌ No               | ✅ Yes                    |
| `/notfound`      | ✅ Yes              | ❌ No                     |

### Path redirects

If a subtree path pattern has been registered with `http.ServeMux`, and it receives a request path _without_ a trailing slash, it will redirect the request to the "subtree root" (i.e. redirect to the request path _with_ the trailing slash).

To prevent this from happening you need to register the pattern for the path _without_ the trailing slash.

For example, when registering `/blog/`, request to `/blog` will redirect to `/blog/`, _unless_ `/blog` is also registered.

### Sanitization

`http.ServeMux` will "sanitize" the URL request path and the Host header.

It will strip the port number and redirect any request containing `.` or `..` elements, or repeated slashes, to a similar but cleaner URL.

### Limitations

`http.ServeMux` only supports basic prefix matching. So it does _not_ have support for:

- Path variables.
- Regex path patterns.
- Method-based routing.

For such features, you either need to implement that yourself (e.g. check the request method in a handler). Or use a third-party library like [chi](https://github.com/go-chi/chi) or [gin](https://github.com/gin-gonic/gin).
