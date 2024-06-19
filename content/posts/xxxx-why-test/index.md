+++
title = "Why Test?"
date = 2024-06-13
tags = ["advice", "testing", "programming"]
slug = "why-test"
# [params.cover]
# name = "Waldlandschaft mit Sonnenaufgang"
# artist = " Joseph Rebell"
# date = "1809"
# institution = "Belvedere, Vienna"
# institution-url = "https://www.belvedere.at/"
+++

Why do you write tests?

I’ve been asking myself this a bit recently. I’ve been trying to motivate some developers I work with to write more tests, and if I’m going to convince them that tests are good, I should have an answer to that question myself, right?

Tests sometimes get portrayed as one of the chores of software development. As a new developer, that’s how I saw tests for a long time: something you did because it’s what you’re told to do, and besides, if I make the coverage get to 100%, I get a little green checkbox to put on my README.md file on Github. I knew that tests were good, because they make Good Code™ — I just didn't know how that happened, or why my tests were still so painful to work with!

But over time, I've found better ways of writing tests, tests that are easier to write and work with. And once I started writing better tests, I found they also became more useful to me, and I wanted to write them more — not because of some coverage metric, but because I was getting real value out of them.

Now, trying to articulate the "why" of testing to others, it's been interesting to explore where that value is coming from. The more I write tests, the more they've become another tool in my toolbox — another way of developing faster and more confidently. It’s like learning all the shortcuts in your IDE or editor of choice, or figuring out the underlying model behind Git: the better you can use the tool, the more useful the tool is when you’re developing.

In this post, I want to explore testing as a tool in the process of building software. I’m going to divide my test-writing process into two parts: testing as a tool for faster development, and testing as a tool for future refactoring. I’ll talk about each part individually, and then explore how the two parts work together. Throughout this, I want to argue that testing is not just about correctness, but also that it can be an integral part of the development and design process.

## Testing for Faster Development

When I started programming, I did testing like this: I would write my code, and then I’d run it. I’d run the program I’d written a few times with different arguments or inputs and make sure it was doing what I expected.

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
    You may (correctly) argue that knowing that `add(1, 2)` equals `3` tells us very little about the function itself - there are lots of different functions that will pass this test but won’t do a very good job of adding two numbers together. `add(a, b): return 3` , for example, passes this test, but is probably not working as expected.

    There are ways around this - property-based testing, for example, tests that a given property of a function is true using random inputs, which gives us more information than a single test case. But I find that most of the time, the edge cases that are worth testing are pretty clear, and it’s the edge cases that do the most to defining what the interface of a module is.

The difficulty is differentiating between tests that evaluate the outside-facing interface, and tests that just test internal details. If I test only the interface, then the tests will still pass if refactor the internal details (and if the tests do fail, then I’ve probably done something wrong). But if I test all the internal details, then the tests are bound to start failing as soon as I start refactoring.

An example: In one of my first jobs, I worked with a codebase that had plenty of tests, but they were deeply tied to the internal details of the codebase, including the exact message, context, and order of every single log call. When making changes to a function, it was very common to end up reordering some logging calls, or adding and removing other logging calls, or even just adding an extra logging parameter for more detail. And, without fail, these minor changes would cause a whole bunch of tests to fail. The tests were just too tied to a minor implementation detail to be useful.

There are two dangers from these sorts of tests. Firstly, if every code change to the code means also fixing a dozen different tests, then changes become expensive. Secondly (and potentially more dangerously), when I’m working with these sorts of tests, I find I end up developing a kind of “test blindness”.

As I said before, a refactoring-style test makes a claim about how a unit’s public API should behave. If the test fails, I need to either fix the API, or update the claim. But with test blindness, I forget about that claim, and just try and make the test pass again. This happens when tests fail so often that I can’t tell whether the thing that broke is important or not.

For example, in a test suite that makes heavy use of mocks and spies, I might make a bunch of tests might fail because the order of to mock calls changes. Should I fix the code or the tests? If I fix the code, the public interface remains exactly the same. But that’s probably a lot of work, and was anyone really depending on the order of calls, or is this just a false positive from the test? So I just update the test without really looking to see what it was originally trying to claim: I am test blind.

## Design: Combining Development and Refactoring

I’ve presented these two ideas as if they were two different testing processes, and in a way they are: if you were to only do testing for development, you’d probably choose to optimise a different set of things to if you were only doing testing for refactoring. But in practice, most of the tests I write serve both needs. After all, it would be a lot of effort to develop an entire test suite as I’m developing my code, only to delete it all and rewrite it for future refactoring purposes once I’ve finished.

I think that combining development and refactoring into one set of tests is about good software design.

In Test-Driven-Development (or TDD), there’s often a big emphasis on tests as a tool for design. But I often find that connection between testing and design is explained poorly, or not at all. There’s often a vague handwave towards the “refactor” stage of TDD, or a point about how, by testing things, you can break them into modules better. But I’ve also seen projects become interface hell from too much modularisation, so clearly there’s something else going on.

My theory is that good, clean code comes from a balancing of short-term and long-term needs, and the development/refactoring divide brings both of those needs to the surface. My short-term, development tests push me to write simple code. If it takes me thirty lines of code to get my code set up properly before I can even start testing, then development is going to be a very slow process! But my long-term, refactoring tests push me to write code that has clear public boundaries. After all, I don’t want to rewrite my tests every time I make a change to the implementation.

If I concentrate too hard on one kind of test or the other, then I will run into issues. If I’m only testing for development, then my code might be easy to get running, but I’ll probably need to delete all the tests next Wednesday when I make a slight internal change that breaks all of them. If I’m only testing for the sake of refactoring, then I can construct a labyrinthine maze of interfaces, dependencies, services, and end up with a kind of [Enterprise FizzBuzz](https://github.com/EnterpriseQualityCoding/FizzBuzzEnterpriseEdition)-style mess.

It’s the combination of testing for now _and_ for the future that makes tests useful as a tool for software design.

## Conclusion

In this post, I’ve tried to present my approach to testing as, principally, a tool for making my life as a software developer easier: it allows me to write code more quickly by providing a way to check that what I’m writing works; it allows me to refactor more confidently by enforcing that what I’m writing adheres to a certain interface; and it encourages better design through the natural pressures that come from the tests I’m writing.

Like I said at the start, the value here isn’t just some arbitrary vision of what Good Code™ should look like, or even correctness. (I’d go as far as to say that making code correct often involves a lot more than just tests, and tests are just one small part of that, but I’ll bang the static typing drum some other time.) Writing tests makes me faster overall[^faster-tests], and more confident in my work. I made the comparison earlier to an IDE, and it feels similar. An IDE is not necessary to be a developer, but it will highlight my code, identify unused variables, allow me to navigate the codebase I’m working on easily, and generally make my life easier. Tests are a form of that that have the added convenience of being shared by my entire team.

[^faster-tests]: The corollary of that is that when writing tests really slows me down, I tend to write a lot fewer of them and only when I feel like they’re adding a lot of value. For example, I tend to only tests UI components when the logic gets complex, otherwise the value I get from testing is minimal compared to the work I need to put in to get the tests running.
