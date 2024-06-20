+++
title = "Why Test?"
date = 2024-06-13
tags = ["advice", "testing", "programming"]
slug = "why-test"
+++

Why do you write tests?

I've been thinking about this question a lot recently. I’ve been trying to motivate some teammates that tests are worth writing. But I'm going to convince them of that, I need to be able to answer that question for myself, right?

Tests sometimes get portrayed as one of the chores of software development. As a new developer, that’s how I saw tests for a long time: something I did because it was what I was told to do — besides, if I got the coverage to 100%, I got a little green checkbox to put on my README.md file on Github. I knew that tests were good, because they make Good Code™ — I just didn't know how that happened, or why my tests were still so painful to work with!

But over time, I've found better ways of writing tests, tests that are easier to write and work with. And once I started writing better tests, I found they also became more useful to me, and I wanted to write them more — not because of some coverage metric, but because I was getting real value out of them.

Now, trying to articulate the "why" of testing to others, it's been interesting to explore where that value is coming from. The more I write tests, the more they've become another tool in my toolbox — another way of developing faster and more confidently. It’s like learning all the shortcuts in your IDE or editor of choice, or figuring out the underlying model behind Git: the better you can use the tool, the more useful the tool is when you’re developing.

In this post, I want to explore testing as a tool in the process of building software. I’m going to divide my test-writing process into two parts: testing as a tool for faster development, and testing as a tool for future refactoring. I’ll talk about each part individually, and then explore how the two parts work together. Throughout this, I want to argue that testing is not just about correctness, but also that it can be an integral part of the development and design process.

## Testing for Faster Development

When I started programming, I did testing like this: I would write my code, and then I’d run it. And that was pretty much the full test. I’d run the program I’d written a few times with different arguments or inputs and make sure it was doing what I expected.

This strategy works really well at first. You try out your code by using it — how can there be any purer approach? And it’s really easy to get started too. No boilerplate, no extra frameworks; just run the code and poke around a bit until you’re confident that it works.

Unfortunately, as a strategy it also falls apart quite quickly too! The more states there are to test, the longer the testing process takes, and the higher the chance of forgetting an important case. Without a proper strategy, it’s very easy to go around in circles, fixing one thing only to break another thing in the process.

Solving this situation was my first introduction to automated testing: tools like [pytest](https://docs.pytest.org/) gave me a way to run lots of tests at once, so that while I was making changes, I could see immediately when something was broken. The immediate feedback made it easier to develop quickly — the faster I could see what effect my changes had had, the faster I could decide if those changes made sense, and iterate on them further.

These days, it’s that desire for immediate feedback that often drives me to start writing tests. Right now, for example, I’m working on a project that involves tracking focus (i.e. which pane of the UI is the user interacting with at any point in time). Handling all the events and possibilities there involves a lot of edge cases, but writing tests for all of the edge cases that I come across means that I can see at a glance if what I’ve fixed, what I’ve broken, and what’s stayed the same.

It also makes it easier to try different things out. I can write exploratory code very quickly: once I’ve defined my goal, I can try out different ways of achieving that goal. Is it the `focus` event that does what I want, or the `focusin`? I can try both out and see which one has the effect I was after. Does this function automatically clean up after itself? Let’s find out by writing a quick test.

Development tests need to be quick, both to run and to write. The faster they run, the faster you get feedback (and the more you can run at once). But being able to write new tests quickly is also key. Writing tests adds to development time, but also adds a certain amount of context-switching between code and test, which we ideally want to reduce.

In my experience, there are a couple of keys to writing simple tests. Firstly, you need simple code (and in particular simple interfaces[^aposd]). A test that requires priming three different mocks with precise behaviours is going to take a lot longer to write than a test that involves passing a couple of arguments to a function.

[^aposd]: I don’t want to keep on bringing up A Philosophy of Software Design (an excellent book by John Ousterhout that I have [written about before]({{< ref "/posts/0001-philosophy-software-design" >}})), but this does remind me of one of his specific principles, which is that it’s more important for a module to have a simple interface than a simple implementation. This is certainly true for testing, where it’s usually a lot easier to add new test cases to cover the complexities of the implementation than it is to have each case need to worry about all the complexities of the interface.

Secondly, it’s important to find good abstractions inside the tests. Abstraction in tests can often be seen as sacrilegious, but if tests are part of the codebase, then we should write them like code, including (cautiously) using abstractions. But I want to save some of my thoughts on that for a future blog post.

## Testing for Future Refactoring

The goal for refactoring is to keep the outward-facing interface of a unit (say, a module, a class, a function, etc) the same, while rewriting the internals to be more maintainable. This naturally raises the question: How do define that outward-facing interface of a module in the first place?

One answer is tests. If you’re adding tests to a unit for development purposes as you go along, over time you’ll build up a collection of examples of how that unit works. For example, a test that asserts that `add(1, 2)` results in `3` tells me a bit about the outward-facing interface of the `add` function[^complete-testing]. That’s a useful way of defining this interface, in large part because we can automatically run these tests regularly to make sure that the interface remains the same.

[^complete-testing]:
    You may (correctly) argue that knowing that `add(1, 2)` equals `3` tells us very little about the function itself — there are lots of different functions that will pass this test but won’t do a very good job of adding two numbers together. `add(a, b): return 3` , for example, passes this test, but is probably not working as expected!

    There are ways around this — property-based testing, for example, tests that a given property of a function is true using random inputs, which gives us more information than a single test case. But I find that most of the time, the edge cases that are worth testing are pretty clear, and it’s the edge cases that do the most to defining what the interface of a module is.

However, using tests to define our interface brings with it a couple of difficulties that we need to deal with.

The first difficulty is figuring which areas of a unit to test: what is part of the outward-facing interface, and what are internal details that aren't really relevant? In one of my first jobs, I worked on a codebase that had plenty of tests, but those tests included assertions for the exact message, context, and order of every single log call. Those tests were painful to work with — even small changes might change some aspect of the logs, which meant continually updating dozens of tests.

Tests that check internal details like this make refactoring harder. Maybe I decide to work around the tests to keep them passing, even though I know no code depends on the behaviour they're checking. Maybe I make the changes regardless of the tests, and now need to update a bunch of tests to match the new observed behaviour. Either way, it's more effort to make the change, and the tests — the tools that should be helping me — are working against me.

The second difficulty is what to do when an interface really should change. If each test makes a claim about the outward-facing behaviour of a unit, what happens when we want to update that behaviour? There are some contexts where we want to avoid changes at all costs — publishing a module for other teams to use, for example. But often the team writing the unit also wrote all of the places where it was used. In that case, it might be easier to update all the call-sites rather than trying to work around an existing interface.

In this case, having tests break is good (otherwise are the tests really telling us what's going on?), but it's still work, time, and effort to fix them. A good test, therefore, is also easy to update. Similarly to testing for development, one tool here is abstraction. Describing test goals at a higher level (e.g. "Which suggestions would I get if I typed in this text, and left the cursor at this point?") allows a chance to abstract the precise mechanics of that code, while still maintaining the same tests.

The third difficulty is figuring out where to stop testing. If I fully tested every single function, every method and class, then I'd never be able to change my code without needing to update a whole bunch of tests to match. At this point, tests are slowing me down rather than speeding up.

When I'm refactoring, the best tests are the ones that are written against interfaces that are unlikely to change (or at least, unlikely to change beyond what can be fixed with a bit of find-and-replace and some manual poking around). In particular, modules that represent core business logic are generally unlikely to change significantly — if your application is a spreadsheet, then the module handling the reactive engine that binds all the cells together is going to need to remain relatively consistent. This can also be true for smaller modules that narrowly focus on one piece of functionality.

## Design: Combining Development and Refactoring

I’ve presented these two ideas as if they were two different testing processes, and in a way they are: if you were to only do testing for development, you’d probably choose to optimise a different set of things to if you were only doing testing for refactoring. But in practice, most of the tests I write serve both needs. After all, it would be a lot of effort to develop an entire test suite as I’m developing my code, only to delete it all and rewrite it for future refactoring purposes once I’ve finished.

I think that combining development and refactoring into one set of tests is about good software design.

In Test-Driven-Development (or TDD), there’s a big emphasis on tests as a tool for design. But often that connection between testing and design is explained poorly, or not at all. I regularly see references to TDD having the "refactor" stage, or an argument about how testing things helps us break them down into modules, but I think we can be more specific about this.

My theory is that good, clean code comes from a balancing of short-term and long-term needs, and the development/refactoring divide brings both of those needs to the surface. My short-term, development tests push me to write simple code. If it takes me thirty lines of code to get my code set up properly before I can even start testing, then development is going to be a very slow process! But my long-term, refactoring tests push me to write code that has clear public boundaries. After all, I don’t want to rewrite my tests every time I make a change to the implementation.

If I concentrate too hard on one kind of test or the other, then I will run into issues. If I’m only testing for development, then my code might be easy to get running, but I’ll probably need to delete all the tests next Wednesday when I make a slight internal change that breaks all of them. If I’m only testing for the sake of refactoring, then I can construct a labyrinthine maze of interfaces, dependencies, services, and end up with a kind of [Enterprise FizzBuzz](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition)-style mess.

It’s the combination of testing for now _and_ for the future that makes tests useful as a tool for software design.

## Conclusion

In this post, I’ve tried to present my approach to testing as, principally, a tool for making my life as a software developer easier: it allows me to write code more quickly by providing a way to check that what I’m writing works; it allows me to refactor more confidently by enforcing that what I’m writing adheres to a certain interface; and it encourages better design through the natural pressures that come from the tests I’m writing.

Like I said at the start, the value here isn’t just some arbitrary vision of what Good Code™ should look like, or even correctness. (I’d go as far as to say that making code correct often involves a lot more than just tests, and tests are just one small part of that, but I’ll bang the static typing drum some other time.) Writing tests makes me faster overall[^faster-tests], and more confident in my work. I made the comparison earlier to an IDE, and it feels similar. As a developer, an IDE isn't necessary, but it will highlight my code, identify unused variables, allow me to navigate the codebase I’m working on easily, and generally make my life easier. Tests are a form of that that have the added convenience of being shared by my entire team.

[^faster-tests]: The corollary of that is that when writing tests really slows me down, I tend to write a lot fewer of them and only when I feel like they’re adding a lot of value. For example, I tend to only tests UI components when the logic gets complex, otherwise the value I get from testing is minimal compared to the work I need to put in to get the tests running.
