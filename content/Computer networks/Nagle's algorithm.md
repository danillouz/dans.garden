---
title: Nagle's algorithm
description: Nagle's algorithm solves the small-packet problem, but can cause problems.
date: 2024-08-18
updated: 2024-08-23
aliases:
  - Nagling
  - TCP NODELAY
  - AKC delay
tags:
  - seedling
---

Sending small packets has a large overhead that can cause network congestion.

For example, sending 1 byte of data over the network results in a 41 bytes packet (20 bytes for TCP and 20 bytes for IPv4 headers).

This is called the "small-packet problem" and for example happens in telnet sessions, where every single character is sent over the network as it's typed.

Especially over a slow network, sending many small packets like that can lead to network congestion.

## Solving the small-packet problem

Nagle's algorithm solves the small-packet problem by essentially delaying (and buffering) the sending of packets to improve bandwidth efficiency and throughput.

The algorithm can be described as:

1. As long as the sender has a packet it received no ACK for.
2. Keep buffering until it has a "full packet".

This is sometimes called "nagling" and is usually _enabled_ by default.

> [!note]
> Nagle's algorithm is controlled via `TCP_NODELAY`.
> Enabling `TCP_NODELAY` _disables_ Nagle's algorithm.

## ACK delays

A different solution for the same problem is to use ACK delays.

ACK delays combine several ACK responses into a single one, by waiting for (usually) 200 milliseconds.

This way it can either:

- Combine multiple ACKs.
- Include the ACK in data it needs to send anyways (this is called "piggybacking").

ACK delays are usually _also_ enabled by default.

## Nagle's algorithm and ACK delays

Nagle's algorithm interacts badly with ACK delays. Because when both are enabled, packets won't be sent until an ACK is received, which are delayed.

This becomes problematic for latency-sensitive applications.

> [!quote]
> ... after I put in Nagle's algorithm, Berkeley put in delayed ACKs. Delayed ACKs delay sending an empty ACK packet for a short, fixed period based on human typing speed, maybe 100ms. This was a hack Berkeley put in to handle large numbers of dumb terminals going in to time-sharing computers using terminal to Ethernet concentrators. Without delayed ACKs, each keystroke sent a datagram with one payload byte, and got a datagram back with no payload, just an ACK, followed shortly thereafter by a datagram with one echoed character. So they got a 30% load reduction for their TELNET application.
>
> [news.ycombinator.com/item?id=34180239](https://news.ycombinator.com/item?id=34180239)

## Disabling Nagle's algorithm

For most modern (latency-sensitive) applications Nagle's algorithm should be disabled. As it's not common to send single byte data like in the telnet days, and you most likely want to send data as soon as possible.

For example, Go considers disabling Nagle's algorithm to be a sane default: [pkg.go.dev/net#TCPConn.SetNoDelay](https://pkg.go.dev/net#TCPConn.SetNoDelay).

## Resources

- [It’s always TCP_NODELAY. Every damn time.](https://brooker.co.za/blog/2024/05/09/nagle.html)
- [Why you should understand (a little) about TCP](https://jvns.ca/blog/2015/11/21/why-you-should-understand-a-little-about-tcp/)
- [Golang disables Nagle's Algorithm by default](https://news.ycombinator.com/item?id=34179426)
