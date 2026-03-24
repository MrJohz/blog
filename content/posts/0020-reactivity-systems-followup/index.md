+++
title = "Following Up on Reactivity"
date = 2026-03-20
tags = ["programming", "design-patterns", "reactivity"]
slug = "reactivity-algorithms-followup"
[params.cover]
name = "Rain, Steam and Speed"
artist = "J. M. W. Turner"
date = "1844"
institution = "National Gallery"
institution-url = "https://www.nationalgallery.org.uk/"
+++

A couple of weeks ago I posted about [three different approaches to reactivity]({{< ref "/posts/0019-reactivity-systems" >}}).  In that post I wrote a lot and still didn't manage to write down everything that I wanted, and since then I've found even more things I could have added, so here's an addendum as a second post.  There won't be much flow here, most of these things are disjointed random thoughts, so feel free to jump around.

## A Belated Bibliography

The main thing I got from the last post was a whole bunch of amazing links and references to read, so thank you if you mentioned one in a comment somewhere or emailed me something to read.  If you want to learn more about reactivity systems, here is a wealth of information for you to peruse.

First off, my own understanding of push-pull (and reactivity systems in general) mainly comes from various JS signal libraries and documentation.

* For understanding signals, and fine-grained reactivity in general, I recommend [Vue's reactivity documentation](https://vuejs.org/guide/extras/reactivity-in-depth), and the complete [Angular Signals proposal](https://github.com/angular/angular/discussions/49685).  They don't really address the details of how push-pull works, but they provide context that explains why the requirements I identified in the last post are important.
* For the algorithm, [Alien Signals](github.com/stackblitz/alien-signals) is a great library that also links to [Signal Boosting](https://preactjs.com/blog/signal-boosting/) (a post from Preact about how their signals are implemented) and [What's a Reactive Library?](https://milomg.dev/2022-12-01/reactivity) (which contains a slightly different approach).  All three of these demonstrate the core concept of push-pull, but also add in the additional requirement of being able to stop propagation early if a particular cell is marked dirty, reevaluates, but the reevaluated value is the same as the original value.
* If you want what I wrote but clearer, more animations and diagrams, and actual code, [Willy Brauner also wrote an explanation of the push-pull algorithm](https://willybrauner.com/journal/signal-the-push-pull-based-algorithm).

More broadly, there are also some great resources exploring incremenetal computations and build systems in a wider context, particularly for build systems and compiler toolchains.

* The classic work here is [Build Systems à la Carte](https://simon.peytonjones.org/build-systems-a-la-carte-theory-and-practice/), a paper by Simon Peyton Jones, Andrey Mokhov, and Neil Mitchell.  It describes a kind of "standard model" of build systems by identifying different axes on which build systems operate.  It doesn't go into detail about the underlying algorithms one might use to implement these build systems, but does talk a lot about the different requirements and what they practically mean.
* [How to Recalculate a Spreadsheet](https://lord.io/spreadsheets/) is a great look at a number of different libraries for incremental computation.  It touches on push-pull towards the start, and then explores other approaches that are more pull-based, and then tries to combine the two (would that be a push-pull-pull system?).
* The last post touches on it, but it's worth bringing up [Salsa](https://github.com/salsa-rs/salsa) and 
