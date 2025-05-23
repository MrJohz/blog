+++
title = "Wait, Rust Has Effects?"
date = 2023-03-15
tags = ["pl-design", "effects", "rust"]
slug = "effects-in-rust"
+++

This post is a reply to Without Boat’s article ["Patterns & Abstractions"](https://without.boats/blog/patterns-and-abstractions/). I originally started it as a reply on Reddit, and then I just kept on writing, so now it’s a blog post. Please read that post first (and probably the other posts linked there), but for the sake of discourse, I’ll also summarise what I got out of it:

There are right now a few different proposals for the idea of keyword generics, which is to say, writing functions that can be `const` or `async` (or both), but don’t necessarily have to be. Boats previously wrote an article talking about the idea of different programming language registers (think “levels of speech”, not hardware) trying to identify how different control flow constructs interact with each other. The Patterns & Abstractions post explores this idea further, specifically by looking at the imperative register, and how different control flow constructs (for/match/return Err, etc) interact with different effects. Boats argues firstly that const behaves very differently to these control flow constructs, and will therefore require a different choice of abstraction, and secondly that for control flow constructs, it may not be necessary to have an abstraction at all.

I broadly agree, but I think there are nuances at play that are worth exploring further. This post is that “exploring further”.

## Infectivity and Symmetry

One of the points Boats brings up is that const “strictly reduces the set of operators that can be permitted”, unlike other effects which add new operators. [This came up a while back](https://www.reddit.com/r/ProgrammingLanguages/comments/vofiyv/thoughts_on_infectious_systems_asyncawait_and_pure/) on the /r/ProgrammingLanguages subreddit with regards to purity and why a `pure` keyword seems to work better than an `async` keyword, even if they might feel intuitively similar. /u/verdagon observed that `pure` is “downwardly infectious”, that is, a pure function can only call other pure functions, but an impure function is still allowed to call a pure one. `async`, on the other hand is “upwardly infectious”, in that an async function can always call a synchronous one, but it must be called at the root by an async function. An analogous argument can be made about `const`. The “adds new operators”/“reduces the set of operators” lens is just a different way of viewing this same upwards/downwards infectivity: An upwardly infectious effect will always add new operators, and a downwardly infectious effect will always remove them.

What I found interesting (and [commented](https://www.reddit.com/r/ProgrammingLanguages/comments/vofiyv/comment/ied4gaw/?utm_source=reddit&utm_medium=web2x&context=3) at the time) was the idea that there’s a natural symmetry going on here. `pure` is downwardly infectious, sure, but you could imagine an equivalent `impure` that’s upwardly infectious. If the default for a language were pure functions only, then exceptions to the rule (`impure`) start behaving more like `async`. You end up with something like Haskell where functions that can perform I/O need to be annotated with the I/O monad, can only be called by other I/O functions, but can freely call pure functions. (At some point, I will actually write some Haskell and confirm this, but I’ve not got round to it yet… 😅)

In Rust terms, this symmetry is definitely true of `const` and fallibility. You could imagine a version of Rust where `const` was the default, and runtime functions would need to be annotated themselves. In this case, runtime functions would be able to call const functions, but not the other way around. Similarly, currently in Rust infallible functions are the default, and are upwardly infectious (Result functions can only be called by other Result functions, unless you handle the error explicitly), but in a language with something like `noexcept`, the opposite is true.

I think this symmetry is less obvious with async and iteration, but with a stretch it’s still present. For async functions, one can imagine a `blocking` annotation that essentially does something similar to `tokio::spawn_blocking`, while the rest of the language is async by default. I don’t think this analogy works completely, but it does have the effect that blocking functions would only be able to call other blocking functions. For iteration, there’s definitely a sense that a non-iterator function cannot magically “return iteration”, but this also feels like a weak argument given that it can still do iteration internally.

## Effect, EffectOnce, EffectMut

I think that thought about iteration is interesting though, so I’d like to explore it further in a different context. If control-flow effects have two sides (pure/impure, async/sync, fallible/infallible), then how many times are we allowed to cross that border?

With fallibility, the answer is easy: as many times as we like. An infallible function (i.e. one without `Result` or `Option` in its signature) can still call a fallible function, as long as it handles the result. And a function that returns a `Result` is obviously allowed to call functions that don't return results. This means that it is perfectly legitimate to have a “striped” call stack containing a mix of fallible and infallible functions.

The same is true of iteration. A `sum` function can consume an iterator and still return a scalar value. A different iterator could in turn call the `sum` function in each iteration. We can cross this effect boundary as often as we like, without any sort of penalty. In fact, with both fallibility and iteration, if we go back to the [table](https://without.boats/blog/patterns-and-abstractions/#patterns-of-control-flow-effects) in Boats' article, we see that what we're doing is just using the "Complete" syntax for each effect. For iteration, that's the `for` loop, and for fallibility that's `match`.

And as Boats points out, this is definitely not true for const-ness (and neither for purity). Once my function is `const`, I cannot call anything that must be evaluated at runtime. A pure function can never call an impure function. The border can be crossed once, and in a single direction only.

What’s particularly interesting is that asynchrony can kind of sit in both worlds. When dealing solely with async functions, the `sync` -> `async` barrier looks fairly impenetrable, and in a language like Javascript where the async function is built into the runtime of the language itself, this is absolutely the case. But Rust doesn’t come with an asynchronous runtime by default, rather you have to build your own runtime (e.g. using `tokio`) and manually execute futures yourself. This means that it’s possible (although generally a bad idea) to nest runtimes inside each other.

That said, even if it’s possible for asynchronous functions to cross the control-flow effect border in both directions, it’s not ideal. I think this fits with Boats’ point about the task system that lives inside async functions having such a major impact. I think this also explains somewhat why it behaves so differently to the other two examples that they give.

I used `Effect` and `EffectOnce` as a header because I found the analogy with Rust’s different function types amusing, but I wonder if better categories here are `EffectLocal` and `EffectGlobal`. Iteration and fallibility are both local effects: they require no global state, and therefore they can be infinitely recreated within the call stack. Const-ness and purity are both global effects: we can only cross the border once, and this is enforced globally by the language’s runtime itself. (In Rust, obviously only const-ness is enforced, but I think keeping purity around as an example helps us to generalise what this might look like in other situations.)

Asynchronicity feels like an EffectLocal that behaves like an EffectGlobal. As I’ve pointed out, it’s perfectly theoretically possible to have multiple nested runtimes, and cross the effect boundary in both directions (EffectLocal). However, if you try and do this naively, the Tokio runtime (and I assume other runtimes) will panic (EffectGlobal). But because asynchronicity is never embedded in the language’s runtime itself (and probably never will be), asynchronicity will never feel like a “true” EffectGlobal.

## Conclusion

I’m not sure what I have to conclude here, other than that this discussion about effect-like patterns in Rust feels very interesting, but it also feels very open and fuzzy around the edges. The German language has the fantastic word “jein” to mean “yes, but also no”, which seems to sum up most of my feelings about all the proposals and discussion I’ve seen so far. Does it make sense to abstract over asynchronicity? Jein. Is asynchronicity more analogous to control-flow than to const-ness? Jein! Is this all just a lack of proper effects and monad abstraction? Jein!?

Is that really my concluding thought? Jein…
