---
title: Building proxies
description: What I learned so far (and some musings) about building proxies in Go.
date: 2024-08-23
tags:
  - seedling
---

It's pretty easy to start building a [[Proxies|proxy]] in Go. The most simple example to create a (reverse) proxy looks something like:

```go
proxy := httputil.NewSingleHostReverseProxy(targetURL)
```

But one thing that's not obvious to me yet, is the best way to work with upstreams (i.e. targets to proxy to) that are not known beforehand.

For example, Caddy has support for [dynamic upstreams](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#dynamic-upstreams). But it looks like you do need to known them beforehand?

So I'm not sure yet what the "best practice approach" is to proxy to a different target for different requests (e.g. performance wise). But I guess it depends on the exact use-case(s).

I did learn that you can use `httputil.ReverseProxy` and `Director` to do something more custom per request:

```go
func NewProxy() *httputil.ReverseProxy {
	return &httputil.ReverseProxy{
		Transport: &http.Transport{
			IdleConnTimeout:     2 * time.Minute,
			MaxIdleConnsPerHost: 32,
			MaxIdleConns:        100,
		},
		Director: func(req *http.Request) {
			var rawTarget string
			if t, ok := FromTargetContext(req.Context()); ok {
				rawTarget = t
			}
			if rawTarget != "" {
				if target, err := url.Parse(rawTarget); err != nil {
					// Do nothing?
				} else {
					req.Host = target.Host
					req.URL.Scheme = target.Scheme
					req.URL.Host = target.Host
					req.URL.Path = target.Path
					req.URL.RawPath = target.EscapedPath()
				}
			}
		},
	}
}
```

For example, by using the request context (`FromTargetContext`). But this doesn't feel great (haven't explored how performance looks like when using this yet though).

Maybe it's better to implement a "non-standard" (i.e. not using `ServeHTTP`) [[HTTP handlers|handler]], and just pass extra information to it?

Something like:

```go
customProxy.ProxyHTTP(w http.ResponseWriter, r *http.Request, targetURL string)
```

> [!note]
> Looks like Caddy also started from `httputil.ReverseProxy`:
>
> <https://github.com/caddyserver/caddy/blob/master/modules/caddyhttp/reverseproxy/reverseproxy.go#L756-L759>

## Resources

- [Go and Proxy Servers: Part 1 - HTTP Proxies](https://eli.thegreenplace.net/2022/go-and-proxy-servers-part-1-http-proxies/)
- [Go and Proxy Servers: Part 2 - HTTPS Proxies](https://eli.thegreenplace.net/2022/go-and-proxy-servers-part-2-https-proxies/)
- [Go and Proxy Servers: Part 3 - SOCKS proxies](https://eli.thegreenplace.net/2022/go-and-proxy-servers-part-3-socks-proxies/)
