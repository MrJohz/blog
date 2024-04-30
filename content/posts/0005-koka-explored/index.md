+++
title = "Koka, Explored"
date = 2024-04-30
tags = ["pl-design", "koka"]
slug = "koka-explored"
draft = true
+++

I've spent the last month playing with Koka, and now I want to talk about it.

Koka is a new programming language with a mostly functional heritage, although in terms of performance, it's aiming at a point closer to C or Rust, avoiding garbage collection and using compiler analysis to convert typically functional algorithms into fast and efficient code. It's also one of the testbed languages for research into effects programming — this is the main reason I got interested in it.

In a lot of languages, we can specify the parameter types and return type of a function, which tells us the function's inputs and outputs. Effects[^1] let us reason about how a function behaves _during_ its execution. For example, an `io` effect might tell us that a function interacts with the file system, or an `allocate` effect could be used to allocate data.

More importantly, in the same way that a function that takes an `int` type lets the caller pass in different values of that type, a function that uses an `allocate` effect lets the caller pass in different implementations of that effect. For allocation, this would allow you to change how memory gets allocated within a particular region of your code, but it can also be used to mock IO in tests, or implement type-safe dependency injection directly in a language. You can even use effects to implement things like exceptions with full support of the type system.

When I started writing this post, I thought it would mainly be about how awesome Effects are - and they are - but Koka has some other surprises up its sleeve, so let’s look at those first.

## Koka’s Syntax

Koka’s syntax draws inspiration from a variety of programming language family trees, including traditional functional languages like Haskell, more imperative languages like C, and an assortment of ideas from other places. The result is interesting and idiosyncratic - I suspect it’s the sort of syntax that will really appeal to some people, and really turn off others.

To be clear, this is mostly a question of appearances. Under the hood, Koka is firmly functional - there is little in the way of classes, traits, or methods, or even their more functional cousins. Lists are defined algebraically (and the words `Cons` and `Nil` come up plenty when working with them), and recursion is often the best way to solve various problems. (Indeed, one of the areas of research for Koka is transforming algorithms written in a functional style into imperative equivalents.)

There are a couple of particularly interesting bits of syntax sugar, though, that I find interesting and want to mention specifically.

### Trailing Lambdas

Koka has a syntax that it calls “trailing lambdas”. The idea is that you can turn any block of code (or any expression) into a zero-args lambda or anonymous function, just by wrapping it in braces. For example:

```koka
repeat(10) {
	println("hi")
}
```

Here, `repeat` is a function that takes two arguments - an integer (the number of repetitions), and a zero-args callback to be repeated.

There are two important aspects to this. Firstly, blocks don’t just need to be defined with braces - indenting a block of code wraps it in an implicit set of braces, meaning that you can create blocks just using indentation. Secondly, blocks don’t necessarily need to span multiple lines - they can just be a simple expression. This second example demonstrates these features using the `while` function in Koka:

```koka
var i := 10
while { i >= 0 }
	println(i)
	i := i - 1
```

Note that `while` here really is just a function that takes two anonymous functions as arguments. But due to the expressive syntax, it has most of the appearance of a `while` loop in any other language.

When I first saw this with `while`, it felt like a bit of a gimmick - the sort of clever syntax trick that you might see on a PL design forum that feels meaningful but doesn’t turn out to be that useful. In practice, though, Koka is full of no-args lambdas, and having this special syntax for it makes them nicer to use. Especially when working with effects, being able to wrap a chunk of code up and pass it to another function that can handle those effects is very useful.

On the other hand, the flexibility has its more negative sides. Because indentation just means “start a new block”, and because you can pass a block to almost any expression, this meant that errors that might be quick and explicit syntax errors in, say, Python, become weird type or name resolution errors in Koka. A couple of times I found myself randomly indenting and dedenting blocks of code, knowing that there must be at least one version that would persuade the compiler to do what I wanted.

This is mostly solved with the use of braces, which are always allowed in these circumstances, but the convention seems to be to prefer indentation over whitespace. And besides, even if I were to stick to using braces, the language as a whole would still be whitespace-sensitive.

All in all, I love the trailing lambdas as a concept, but their interaction with the significant whitespace aspect of the language made them trickier to use than I’d have liked.

### With Statements

As I mentioned before, no-args lambdas (and lambdas in general) are everywhere in Koka. Trailing lambdas makes them easy to define, but it’s not uncommon to end up with nested lambdas, which is less pleasant to use.

To resolve this, Koka provides `with` statements. They’re best explained with an example. Consider a function `finally` that takes a block of code, and a second lambda to be executed when the block of code finishes, regardless of whether it succeeds or not. We might use it like this:

```
// NB: Koka doesn't have the `open` and `stream` functions that I'm using
// below, but they're useful to demonstrate the use-case

val file = open("./test.txt")
val conn = stream("127.0.0.1:7878")

finally { close(file) }
	finally { close(conn) }
		println("begin block")
		read(file)
		throw("oops")
```

Theoretically, we could add plenty more `finally` calls, along with other blocks depending on what we’re doing, but we’d end up with an ever increasing tower of nesting. Instead, we use `with` to flatten the tower down:

```
val file = open("./test.txt")
val conn = stream("127.0.0.1:7878")

with finally { close(file) }
with finally { close(conn) }

println("begin block")
read(file)
throw("oops")
```

The `with` block converts the rest of the current indentation level or block into a new anonymous lambda, and passes that as the last parameter to the given expression or function. In this case, we’re using nesting so that the first `with finally` expression lifts the rest of the block, which includes a second `with finally` that lifts the following statements one level deeper.

The `with` block is more powerful than this, as it can also be used to pass arguments around. It also forms one fo the foundations of effects — but we’ll get to effects, I promise!

In this regard, it is very similar to the `use` expression in Gleam, or backpassing in Roc. The nice thing about this is that it’s a purely syntactic transformation that turns out to be very powerful - and one that’s surprisingly transferable to different cases. In these examples, we can use it to mimic the effect of the `defer` statement in Go, but I can also imagine using it in a very callback-heavy environment like that of NodeJS.

## Effects

## All The Rest

[^1]: or at least, typed effects - there's some ambiguity in the terminology here, but for this post I'm talking about effects as a part of the type system
