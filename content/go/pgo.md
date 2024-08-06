---
title: PGO
description: Profile-guided optimizations in Go.
date: 2024-03-30
aliases:
  - Profile Guided Optimizations
tags:
  - sapling
---

When Go builds a binary, the compiler will optimize it by default (e.g. by inlining code). But here the compiler will make a "best effort guess" by using static heuristics based on (un)common paths in functions.

Starting from Go `1.21`, the compiler supports profile-guided optimizations (PGO) to better optimize built binaries by using collected CPU pprof profiles.

Providing profiles to the compiler gives it more information about how code behaves in a "real" production environment, and it can better optimize the built binary. For example, by more aggressively optimizing the most frequently used functions, or by more accurately selecting common cases.

## Setting expectations

> [!quote]
> As of Go 1.21, benchmarks for a representative set of Go programs show that building with PGO improves performance by around 2-7%.

> [!quote]
> As of Go 1.22, benchmarks for a representative set of Go programs show that building with PGO improves performance by around 2-14%.

The Go team expects performance gains to keep increasing over time as more optimizations take advantage of PGO in future Go versions.

## How to use PGO

- Add a profile named `default.pgo` in the main package directory.
- Use the `-pgo` flag to provide the path to a profile when using `go build`.

## Combining profiles

To use a more representative profile for PGO, it's possible to combine multiple profiles:

```sh
go tool pprof -proto a.prof b.prof c.prof > combined.prof
```

## Links

- https://go.dev/blog/pgo
- https://go.dev/doc/pgo
- https://theyahya.com/posts/go-pgo/
