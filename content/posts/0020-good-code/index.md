+++
title = "Is Pretty Code Good?"
date = 2026-06-25
tags = ["programming", "philosophy"]
slug = "good-code"
[params.cover]
name = "No. 2"
artist = "Will Henry Stevens"
date = "1939"
institution = "Smithsonian American Art Museum"
institution-url = "https://americanart.si.edu/"
+++

Here is a premise that I want you to pretend is true for a short while: it is possible to quantify the aesthetic quality of code.  That is, we can measure something about a codebase, and, using that measurement, say, objectively, "this is pretty code" or "this is ugly code". Now here's a question: is this measurement useful?

On the one hand, aesthetic quality tells us nothing about whether our software works.  When I write code, I usually want to solve a problem, achieve a goal, produce some result -- the point of the code is what it does, not the presence of the code itself.  In that regard, judging the aesthetics of what I write tells me nothing about whether the resulting software is good software.

On the other hand, code is also the substance from which good software is made, which gives it a certain amount of importance.  I can't build the Eiffel Tower if all I've got is a bit of sand and water.  The materials I use will impact the quality of the thing I make.  In the context of software, we often have this idea of bad software being difficult to debug when something goes wrong, or difficult to extend when new features are added.

So there are certainly qualities of code -- independent of whether the code works or not -- that are important to us in some way.  Is prettiness one of those qualities? 

## What Even is Code?

The goal of code is not just to be executed.  One good way 

No, we've not finished with the sophistry yet.

Here's a hot-button question that's done the rounds recently: when we're writing software, why do we commit the source code and not the compiled result?

Let's go through this argument in detail, because it's more instructive than it sounds at first glance.  One of the reasons we use higher-level languages is that it makes software easier to write.  No-one wants to manually write out all the loop and break conditions to iterate over a list in assembly[^masochism], so instead we write a compiler that converts a shorter expression (say `for x in ...`) into the expanded assembly from.  In many ways, this is the same idea behind snippets in many editors and IDEs.  We type in a few characters (say `for`), press tab, and suddenly we have all of the syntax of a for-loop written for us. 

[^masochism]: To be clear, last time I did Advent of Code, I used webassembly and did in fact manually write out all the loop and break conditions, and I fun and learned stuff.  So, like, maybe some people want to do this, and maybe I'm occasionally one of them...

In both cases, we convert a condensed expression into an expanded construct.  But in one case, that condensed expression is a temporary state that our IDE automatically rewrites, and in the other, the condensed expression becomes the canonical expression of our intent.  Why?  What makes these two things different?



## The Ever-Present Shadow of Peter Naur

At this point, I realised I needed to properly read through *Programming as Theory Building*, Peter Naur's 1985 essay that attempts to describe what it is that a programmer actually does.  I shouldn't summarise it here, because either you've already read it, or you should go and read it now[^naur1985].  But if you're anything like me, you haven't and you won't, so here are the relevant points:

[^naur1985]: The most legible version of the essay I could find is [here](https://gwern.net/doc/cs/algorithm/1985-naur.pdf).

* A programmer 
