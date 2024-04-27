+++
title = 'Book Review: A Philosophy of Software Design'
date = 2020-07-01
tags = ["book review", "programming", "software"]
+++

This review is largely in response to the article "[It's probably time to stop recommending Clean Code](https://qntm.org/clean)", and the ensuing [Reddit discussion](https://www.reddit.com/r/programming/comments/hhlvqq/its_probably_time_to_stop_recommending_clean_code/). A lot of really interesting points were brought up, but the big question that the author themself wasn't able to answer was: "What should we recommend instead?"

I believe the book we should be recommending is _A Philosophy of Software Design_ by John Ousterhout. In this post I want to spend a bit of time reviewing it and giving an overview of the contents, and then I want to explain why, in my opinion, it is such a good recommendation.

## An Empirical Philosophy Book

The elevator pitch of John Ousterhout's book _A Philosophy of Software Design_ is fairly simple: he is a university professor (albeit one with almost two decades of experience in the "real world", also the inventor of Tcl, creator of RAFT, company founder amongst [other things](https://www.reddit.com/r/programming/comments/lb8zrn/an_alternative_to_clean_code_a_philosophy_of/glt3e4n/)), who each year teaches students how to actually design software in a practical, hands-on course where the students are expected to design and modify "a substantial piece of software" in an iterative way, hopefully understanding more about the practice of software design each time around.

The book, then, is a synthesis of the pieces of wisdom that Ousterhout has himself learned from his own experiences, tempered and refined by the practical examples he has been able to draw from his students. In this way, it has a (somewhat) scientific, research-based approach, where the author's assertions are backed up with examples from student projects that worked (or didn't).

At it's core, though, this is still philosophy - the book doesn't just list the things that worked well, and the things that worked poorly. Instead, Ousterhout attempts in each chapter to divine broader truths that apply to software design in general. There are no lists of what to do and what not to do, but instead principles to follow, red flags to be aware of, and warnings against taking anything too far.

## Structure

The book is split into a series of chapters, each of which generally explores a single principle. These range from the very high level ("Working Code Isn't Enough", "Modules Should Be Deep") to the more practical questions ("Choosing Names"). The whole book is relatively short (about 180 pages), and many chapters flow together nicely, which means that it's quite easy to go from cover-to-cover, rather than approach the book as a reference manual. That said, the final pages provide summaries of the design principles and red flags found in the book, making it easy to reference key parts of the book.

Within each chapter, Ousterhout generally starts by stating a problem or motivation that software engineers will face, and then defining a principle to solve this. The rest of the chapter is then a discussion of the principle, the dangers of alternative approaches, the red flags that indicate that the principle needs to be applied (or in some cases avoided), and some notes about taking ideas too far.

The examples are often based on problems that Ousterhout has given his classes, which means that they generally feel meaty enough to be worth discussing. An example of a text editor appears in Chapter 6, but is extended in Chapters 7, 8, 9, and 10 in different contexts. Enough is omitted from most examples to make the point clear, but enough is kept in to give the feeling of real code.

## Ousterhout's Principles

The overriding theme throughout the book is that good code _looks_ good. Ousterhout thinks very much in terms of abstraction and interfaces - where "interfaces" refers to the contact points between different units of abstraction, rather than any similarly-named construct in any particular language. Most of the book is dedicated to figuring out how to spot bad abstractions and rework them into good abstractions.

To a certain extent, this feels at odds with certain common mantras in software engineering circles today, where we encourage enough other to Keep It Simple, Stupid, and worry about premature abstractions. _Philosophy_ seems to worry less about the dangers of over-abstraction, and more concerned with how to make sure that the chosen abstraction is a good one.

This approach makes for a more positive experience than in many other programming circles - rather than being warned into a very conservative approach, Ousterhout encourages his readers to go out and make abstractions, but to be careful about designing the correct ones.

This isn't to say that the book isn't also cautionary - in the summary pages at the back, the list of red flags gets more page space than the list of principles, and throughout the book these red flags mark out moments when readers are given the go ahead to use these abstraction techniques. There are also warnings about when a principle might be used too much.

## Everyone's a Critic

Beyond the mild danger of encouraging excess abstraction, the biggest issue in _Philosophy_ is probably the missing parts - the topic of testing gets a single page in Chapter 19 (Software Trends), and ideas about effective use of a type system to avoid issues are largely ignored. Ousterhout's principles will still apply in these areas, but it would be nice to see some more specific discussion of these areas.

## The Target Audience

It can be a bit unclear at times to whom Ousterhout writes. A lot of the examples clearly relate to his students, and the projects that they come from have a somewhat academic feel - a text editor here, and an HTTP protocol parser there. The code in the examples is generally object-oriented (Java and occasional C++), although it generally feels like it could be replaced with most imperative/OO languages without much of an effect.

The use of the phrase "software design" might make one think more of broader software architecture, but Ousterhout uses it more to describe the design of individual modules and functions _within_ a program, rather than the broader architecture of the program itself (although he occasionally touches on that).

More functionally-minded people might think they can simply side-step a lot of the discussion here, in the same way that they can when discussing the Gang of Four's design patterns, but the principle "design errors out of existence" (Chapter 10) and its corollary "design special cases out of existence" should ring bells for people in this area who are also aware of the principle of making illegal states unrepresentable.

Ultimately, I think this book aims at a space that is slightly deeper than a lot of existing software literature. Where books like _Design Patterns_, Fowler's _Refactoring_, and the aforementioned _Clean Code_ are aimed at more traditional "enterprise" software development, _Philosophy_ feels more widely applicable, albeit at the cost of being more abstract and difficult to apply.

In general, I think _Philosophy_ is a good read if you are both (a) working with software regularly, and (b) conscious of the inherent maintenance cost in software, and aiming to minimise it.

## A Book to Recommend

The original question I wanted to answer was what we, as software engineers, should recommend over books like _Clean Code_. As I said, my answer to that question is _A Philosophy of Software Design_.

Software engineering (indeed, engineering in general) is not a science, insofar as there are no (or at least very few) exact answers. Everything from the database you use to your choice of testing strategy will be dependent on the context of the software you're writing. This means that the advice that we give to each other will probably be very context-specific. In general, you probably shouldn't use a NoSQL database, but in a lot of specific contexts you probably should.

This isn't a problem if we don't run into these exceptional cases often, but engineering is all about exceptional cases - if there were no exceptional cases, we wouldn't need to write any new software, because our existing tools would do the job. This is where books like _Philosophy_ come in - rather than give situational advice, it attempts to define wider principles that the reader will then need to apply to different situations.

Take, for example, my favourite principle: "Modules should be deep" (explored in Chapter 4). The idea is that an individual unit of abstraction should do a lot of work (i.e. be deep, and contain a lot of complexity), but it should have a relatively simple interface (i.e. be narrow). Essentially, if you're going to abstract something, make sure your abstraction is deep.

Notice that this principle says nothing about functions, classes, lines, blocks, parameters, or anything specific to a single language or paradigm. However, when we apply it, for example to the Java code Robert C. Martin talks about in _Clean Code_, we can derive some of his ideas from this principle. Assuming a function is our unit of abstraction (for now, at least), the parameters are its interface, therefore we should reduce the number of parameters to the minimum necessary.

However, because our principle is more general, we can actually correct some of the mistakes Martin makes. Martin talks about removing parameters by adding private fields to the class that the method belongs to. When we think in terms of interfaces, we notice that this _hasn't decreased the interface at all_ - we've lost a parameter, but we've gained a private field, and in the process made things harder for the consumer of our abstraction.

## Teaching Principles Over Rules

When I recommend books, I generally hope that the other person will learn something from the book I have suggested. If I were to recommend _Clean Code_, I would hope that the reader would learn something about how to write clean Java code, but I suspect they would mainly learn how to write code like Robert C. Martin - or more accurately, like someone copying Robert C. Martin's actions without always understanding why he's taking them.

I do not feel this way about _A Philosophy of Software Design_. When I recommend it, I expect that the reader will not just learn something about Java, but instead something about how to design good abstractions, identify weak abstractions, and write code that is broadly maintainable long into the future.

## Updates from the future

- 2021-02-03: Someone on Reddit pointed out that I didn't sell John Ousterhout enough: he is a very remarkable man. I have updated my description of him to link to that comment, and added some further explanation of his work to the post.
