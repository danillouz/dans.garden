---
title: example.com
description: IANA reserved domains.
date: 2023-06-09
tags:
  - evergreen
---

There are a few domains that are [reserved by IANA](https://www.iana.org/domains/reserved). Reserved means that these domains can't be registered by anyone, and can't be transferred. One of them is [example.com](https://example.com/).

Such domains are sometimes called **special use domain names**, and the full list can be found [here](https://www.iana.org/assignments/special-use-domain-names/special-use-domain-names.xhtml).

## Special TLDs

The most notable special [[DNS#Top-level domains and subdomains|TLDs]] are:

- `test`
- `example`
- `invalid`
- `localhost`

## How to use special domains?

[RFC 2606](https://datatracker.ietf.org/doc/rfc2606/) specifies best practices on how to use the special domains. It recommends the following:

- **test** domains are recommended for testing "DNS related" code.
- **example** domains are recommended for documentation and examples.
- **invalid** domains are recommended for demonstrating invalid domain names.
- **localhost** domains are reserved for loopback addresses to the local host (so local networks don't break).

> [!info]
> There's also [RFC 6761](https://datatracker.ietf.org/doc/rfc6761/) with more information, like how DNS servers should handle these domains.

## Why are special domains useful?

**Special domains guarantee deterministic behavior in tests and documentation.**

Let's say I make up a domain for (local) testing, where I expect certain behavior (e.g. it must resolve, or it must fail). It could happen that at some point the domain becomes available, gets registered, and now my test will behave unexpectedly.

This is for example what happened with the `dev` TLD! It was sometimes used for testing (locally), but then Google "bought" it.
