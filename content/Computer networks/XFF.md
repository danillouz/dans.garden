---
title: XFF
description: The X-Forwarded-For header contains the IP address of a client connecting via a proxy.
date: 2024-08-18
aliases:
  - X Forwarded For
tags:
  - seedling
---

The `X-Forwarded-For` (XFF) HTTP request header is a **de-facto standard** header that contains the IP address of a client that connects to a server via a [[Proxies|proxy server]].

When a client make a request to a server, it sends its IP address to the server. But when a proxy sits in between, the client IP is lost because the server only sees the "final" IP address of the proxy.

> [!info]
> The standardized version of `X-Forwarded-For` is the `Forwarded` HTTP request header.
>
> See [developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Forwarded).

## Format

```http
X-Forwarded-For: <client>, <proxy1>, <proxy2>, ...
```

The first value is the client IP address. But if a request goes via multiple proxies, the IP address of each proxy is listed.

So the rightmost IP address is the IP address of the "final" proxy, and the leftmost IP address is the IP address of the client that made the request.

### Parsing multiple XFF headers

There can be _multiple_ XFF headers present in a request.

When this happens, the IP addresses in _all_ headers must be treated as a _single_ list: starting with the first IP address of the first header and continuing to the last IP address of the last header

Essentially, you must concatenate all XFF header values.

> [!warning]
> It is insufficient to only use one XFF header when multiple are present.

## Security

The XFF header is untrustworthy when no trusted proxy (like a load balancer) sits between the client and server. Leftmost untrusted values must only be used when there's no risk of using potentially "spoofed" values.

If any trusted proxies sit between the client and server, the final XFF IP addresses (one for each trusted proxy) are trustworthy. Rightmost trusted values can be used for security-related use cases, like rate-limiting or blocking requests.

## Privacy

Because the XFF header exposes privacy-sensitive information (the IP address of a client), the user's privacy must be kept in mind when using this header.

## Resources

- [MDN: X-Forwarded-For](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-For)
