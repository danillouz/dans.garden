---
title: Benchmarking
description: How to write benchmarks in Go.
date: 2024-08-24
tags:
  - sapling
---

The Go [testing](https://pkg.go.dev/testing) package supports [benchmarks](https://pkg.go.dev/testing#hdr-Benchmarks) to test the performance of code.

Test functions look like this:

```go
func TestSomething(t *testing.T)
```

And benchmark functions look like this:

```go
func BenchmarkSomething(b *testing.B)
```

## How it works

A benchmark has some "code under test":

```go
func BenchmarkSomething(b *testing.B) {
	for range b.N {
		// Code under test.
	}
}
```

The code under test in the benchmark will be executed `b.N` times, where Go automatically adjusts the value of `b.N` until the benchmark lasts long enough to be timed reliably.

## Running benchmarks

Like test functions, benchmark functions live in `*_test.go` files, and are run via the Go [test command](https://pkg.go.dev/cmd/go#hdr-Test_packages). But to run benchmarks, the `-bench` [test flag](https://pkg.go.dev/cmd/go#hdr-Testing_flags) must be provided.

For example:

```sh
# Run all benchmarks
go test ./... -bench .

# Run a specific benchmark
go test ./... -bench BenchmarkSomething
```

By default tests _also_ run when running benchmarks. To prevent this use the `-run ^$` test flag to run "no tests".

For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething
```

> [!info] About Go test modes
>
> Go tests can be run in two different "modes":
>
> 1. **Directory mode** is in effect when `go test` is run without package arguments (e.g. `go test`). Here Go compiles source and test files in the current directory.
> 2. **Package list mode** is in effect when `go test` is run with package arguments (e.g. `go test ./...`). Here Go compiles source and test files for the listed packages.
>
> Only in mode 2 will Go cache successful package test results to avoid running tests unnecessarily in repeated tests. When tests are cached, `go test` prints `(cached)` instead of the elapsed time in the summary. To disable caching use the flag `-count=1`.

### Controlling count

By default a benchmark runs once. But this can be controlled with the `-count` test flag. It can be useful to run a benchmark multiple times to (better) verify it produces consistent results.

For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething -count 10
```

Alternatively, the actual number of iteration can be controlled by using the syntax `Nx`. For example, this runs the benchmark for exactly 100 iterations:

```sh
go test ./... -run ^$ -bench BenchmarkSomething -benchtime 100x
```

### Controlling duration

By default `b.N` iterations for a benchmark are run for a duration of 1 second. But this may not be enough to produce a good enough sample size.

To increase benchmark duration use the `-benchtime` test flag. It guarantees that a benchmark will run for at least that amount of time.

For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething -benchtime 10s
```

## How to read benchmark results

Benchmark result have the following format:

```text
<name> <iterations> <value> <unit> [<value> <unit>...]
```

For example:

```text
BenchmarkGetClientEncoding-12	26514762	46.58 ns/op
BenchmarkGetClientEncoding-12	25236223	45.42 ns/op
BenchmarkGetClientEncoding-12	24113084	46.17 ns/op
```

- Column 1 shows the benchmark name, which always begins with `Benchmark`.
- Column 2 shows the total number of iterations run during the benchmark.
- Column 3 shows the measured value. For example, `ns/op` indicates the average amount of time in nanoseconds it took one iteration to complete.

## Comparing benchmark results

The [benchstat](https://pkg.go.dev/golang.org/x/perf/cmd/benchstat) command can be used to compare multiple benchmark results.

> [!important] Important to keep in mind
>
> - Each benchmark should be run at least 10 times to gather a statistically significant sample of results.
>   - Pick a number of benchmark runs (at least 10, ideally 20) and stick to it.
> - Reducing noise and/or increasing the number of benchmark runs makes `benchstat` see smaller changes as "statistically significant".
>   - To reduce noise, run benchmarks on an idle machine (i.e. close apps) and connect to a power source.

First install the command with:

```sh
go install golang.org/x/perf/cmd/benchstat@latest
```

Then save benchmark results to a text file. For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething -count 10 | tee v1.txt

go test ./... -run ^$ -bench BenchmarkSomethingV2 -count 10 | tee v2.txt
```

And compare them:

```sh
benchstat v1.txt v2.txt
```

### How to read comparison results

This example output:

```text
                      │   v1.txt    │               v2.txt                │
                      │   sec/op    │   sec/op     vs base                │
BenchmarkSomething      1.718µ ± 1%   1.423µ ± 1%  -17.20% (p=0.000 n=10)
BenchmarkSomethingV2    3.066µ ± 0%   3.070µ ± 2%        ~ (p=0.446 n=10)
geomean                 2.295µ        2.090µ        -8.94%
```

Can be interpreted as follows:

- `±` percentage indicates "variation". The lower the better: a high variation means unreliable samples, and that the benchmark needs to be re-run.
- A negative percentage (`-17.20%`) means a benchmark was faster. A positive percentage means slower.
- `p=` value measures how likely the differences were due to random chance.
- `~` means there was no statistically significant difference between the two inputs.
- `geomean` shows the geometric mean of each column.

## Profiling benchmarks

Memory allocations can be printed in the results by providing the `-benchmem` test flag. For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething -benchmem
```

But it's also possible to produce `pprof` compatible profiles. For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething -cpuprofile cpu.prof

go test ./... -run ^$ -bench BenchmarkSomething -memprofile mem.prof
```

The output `.prof` file can then be used to generate a report with `go tool pprof`.

## Tips

### Control the timer when doing setup

By default the _entire_ run time of a benchmark function is measured. Go executes the benchmark many times, and divides total execution time by `b.N`. This means that doing some sort of (expensive) setup can affect benchmark results.

To prevent misleading benchmark results, the timer can be controlled with the following functions:

- [b.StopTimer()](https://pkg.go.dev/testing#B.StopTimer) and [b.StartTimer()](https://pkg.go.dev/testing#B.StartTimer)
- [b.ResetTimer()](https://pkg.go.dev/testing#B.ResetTimer)

For example:

```go
func BenchmarkSomething(b *testing.B) {
	// Do some (expensive) setup here..
	b.ResetTimer()
	for range b.N {
		// Code under test.
	}
}
```

### Benchmark with multiple inputs

Like with regular test functions, you can use table-driven benchmarks and sub-benchmarks by invoking [b.Run(name, f)](https://pkg.go.dev/testing#B.Run). Each `b.Run` call creates and runs a separate benchmark.

For example:

```go
func BenchmarkSomething(b *testing.B) {
    benchmarks := []struct{
        name  string
        input int
    }{
        {"One", 1},
        {"Two", 2},
    }
    for _, bm := range benchmarks {
        b.Run(bm.name, func(b *testing.B) {
            for range b.N {
                testSomething(bm.input)
            }
        })
    }
}
```

To only run certain sub-benchmarks, provide a `/` separated list of benchmark and sub-benchmark names to the `-bench` test flag.

For example:

```sh
go test ./... -run ^$ -bench BenchmarkSomething/Two
```

## Gotcha's

### 1. Compiler optimizations

It may happen that the compiler optimizes code under test in a benchmark. When this happens, the benchmark will seem faster that it really is.

This may happen with non-changing function inputs, and/or unused values.

For example:

```go
func isTrueOrFalse(n int) bool {
	if n == 0 {
		return false
	}
	return true
}

func BenchmarkWrong(b *testing.B) {
	for range b.N {
		isTrueOrFalse(0)
	}
}
```

Ways to mitigate this are by:

- Using [runtime.KeepAlive()](https://pkg.go.dev/runtime#KeepAlive).
- Assigning to a global exported value.

For example:

```go
func BenchmarkOkay(b *testing.B) {
	var result bool
	for range b.N {
		result = isTrueOrFalse(0)
	}
	runtime.KeepAlive(result)
}
```

Or:

```go
var Sink bool

func BenchmarkOkay(b *testing.B) {
	for range b.N {
		Sink = isTrueOrFalse(0)
	}
}
```

## Resources:

- [How to write benchmarks in Go](https://dave.cheney.net/2013/06/30/how-to-write-benchmarks-in-go/)
- [Common pitfalls in Go benchmarking](https://eli.thegreenplace.net/2023/common-pitfalls-in-go-benchmarking/)
- [Using Subtests and Sub-benchmarks](https://go.dev/blog/subtests/)
- [Proposal: Go Benchmark Data Format](https://go.googlesource.com/proposal/+/master/design/14313-benchmark-format.md)
- [Measuring your system’s performance using software (Go edition)](https://lemire.me/blog/2024/03/17/measuring-your-systems-performance-using-software-go-edition/)
