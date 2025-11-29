+++
title = "Additional Thoughts about the Command Pattern"
date = 2025-11-29
tags = ["programming", "design-patterns"]
slug = "command-pattern-followup"
[params.cover]
name = "No. 2"
artist = "Will Henry Stevens"
date = "1939"
institution = "Smithsonian American Art Museum"
institution-url = "https://americanart.si.edu/"
+++

A couple of weeks ago, I wrote a post on my employer's blog titled [Undo, Redo, and the Command Pattern](https://www.esveo.com/en/blog/undo-redo-and-the-command-pattern/), which I ended up quite pleased with.

Here, I wanted to add a couple of additional thoughts based on some of the discussions and things I've read since writing that post.

Firstly, undo/redo isn't the only use for the command pattern!  This is something I wish I'd made more explicit in that post.  Perhaps a more general way of seeing commands is "functions with metadata in a consistent shape".  In our case, the metadata was the `undo` function, i.e. the inverse function to our original function.  But you could do all sorts of other things as well:

* User-readable data, such as the name of the command and a description of what it's done.  We use this in our undo/redo system to show a timeline of actions that the user has taken in the UI, so that they can jump back and forth, and quickly undo chunks of work.
* Parameters for a rate-limiting algorithm.  Say you've got a handful of routes that need to be rate-limited, but at different rates — you can define each route as a command object with details about how often it can be called, and then provide a generic route handler that finds the correct command, applies the correct limits, and calls it or returns an error as needed.
* Metadata about the function's arguments.  In another place in our application, we have a bunch of built-in functions that the user can call.  Each function declares what parameters it takes, which means we can programmatically create a UI where the user can configure the functions.

Secondly, I think it's really important to see examples of patterns being used in practice.  When I was researching about the command pattern, there were lots of articles that described the pattern in very abstract terms, or with a bunch of class diagrams for an OO-style implementation.  Of course, design patterns are always going to be somewhat abstract[^abstract] but it can be difficult to get a sense of why you'd use a particular pattern without already having seen it in practice.

[^abstract]: Indeed, that's kind of the point of design patterns — they're abstract descriptions of commonalities that show up in different codebases in different ways.  They need to be abstract to cover a wide variety of codebases.

In the [comments on Lobste.rs](https://lobste.rs/s/lwepwh/undo_redo_command_pattern), someone posted a link to [Game Programming Patterns](https://gameprogrammingpatterns.com/command.html), and their treatment of the command pattern.  This is a fantastic resource, and they do a great job of starting with a real problem and explaining how the pattern helps.

A while back, I saw someone ask whether there was a test suite for design patterns — some set of tests that you could apply to a class to test whether it successfully implemented the builder pattern, or the command pattern, or whatever else.  I wonder if this kind of approach comes from seeing too many descriptions of design patterns as UML diagrams only, and not as abstract ideas that can be implemented in all sorts of different ways, be that as functions, or as objects, or as closures, or whatever else.

One final thought: are objects themselves just another design pattern?  Consider the core idea of encapsulation: some type `t` that is bundled together with a bunch of methods of the form `fn(t, ...args) -> result`.  How many different ways are there of implementing this in different languages that all behave roughly the same?  I can think of classes, closures, ml modules, abstract data types, and probably more if you pushed me.  They might look different, and have different subtleties to understand, but they feel like different implementations of the same underlying pattern.
