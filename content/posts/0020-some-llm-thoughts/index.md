+++
title = "Some LLM Thoughts"
date = 2025-11-29
tags = ["programming", "philosophy", "llms"]
slug = "some-llm-thoughts"
[params.cover]
name = "No. 2"
artist = "Will Henry Stevens"
date = "1939"
institution = "Smithsonian American Art Museum"
institution-url = "https://americanart.si.edu/"
+++

Here are some assorted thoughts on LLMs for development.

## Enthusiasm

In the summer of 2025, my partner and I had a baby. Taking advantage of Germany's generous parental leave system, I spent two months looking after my partner, my baby, and myself, and spending my downtime browsing programming forums. As a result, I watched rather than experienced one of the most sudden shifts in programming culture that I've seen in my life. AI went from being a weird chatbot, or an IDE with fancy (but fallible) autocomplete to being the main way some people were writing code. People wrote effusive articles about their process. I read about all sorts of tips and tricks for managing context or the best use of MCP servers. I watched in real time as high-profile developers that I followed on social media stopped writing code and started writing prompts, with tremendous excitement and success.

When I got back to work, I was excited to try out this new "agentic" thing I'd been hearing about. It was impressive — certainly much more effective than the autocomplete I'd ended up turning off beforehand, or the people I'd seen labouriously copying text over from a ChatGPT session. But it got a lot of stuff wrong. And the code it produced was mostly bad — I often needed to rewrite anything it had generated, although the discussion and process of getting that code was often useful. I remember being quite disappointed — is this really the tool that is [producing 90% of Armin Ronacher's code](https://lucumr.pocoo.org/2025/9/29/90-percent/)?

## Chocolates

???

## Success

I did a course in Natural Language Processing in Uni, and it was disappointing. We spent ages learning Prolog so we could construct syntax trees for English expressions, and then explored how English grammar worked so that we could break it down properly. Then the final lecture was just a list of ambiguous cases that could never be parsed using this approach, and which meant none of techniques we'd learned were particularly useful in the end. The final exam was mostly just "pretend you're a Prolog interpreter and draw out all the logical steps for this complicated program".

In that context, LLMs are amazing. They can not only take natural language inputs and respond to them in logical ways, but they can also convert it to structured data. An LLM can take a question like "where's the train station?" and figure out what actions need to take place to produce an answer. If you're building a navigation tool, you don't need to write down in advance every possible way that a human might ask for directions (c.f. [Alexa's skills system](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-intents-utterances-and-slots.html#create-intent)), because all of that information — the entirety of "how language works" — is already embedded in the LLM.

I think this is an underrated facet of LLMs.  Leave aside questions of whether LLMs can code or not, or whether the information they provide is accurate — I have never had an LLM fail to understand me.  Fail to give me the right answer, sure, but fail to interpret my words grammatically, even if what I've written is littered with spelling mistakes?  Never.  It feels kind of crazy that that's something we can just take for granted.

## Searching

One of the things I use LLMs for regularly is understanding an existing codebase. For example, a project I work on ran into performance issues, and I could see what was wrong, but I couldn't figure out a good way of solving it.  So I figured I could see how existing codebases worked.

My work pays for a GitHub Copilot subscription, which integrates nicely with GitHub's codespaces feature.  I could open a project's GitHub page, ask a few questions, and very quickly find the data structure that the project was using that turned my O(n^2) computations into O(log(N)) ones.  Copilot was able to spit out the exact location where the data structure was used, and explain in a fair amount of detail how it worked.

This kind of search is quite incredible.  Google is great if you want 

## Dependency

One of the things that is so unique about software development, compared to other engineering disciplines, is that it's typically been so cheap to start.  The one upfront cost is a computer, but these days you probably already have one of those, and there's a long history of cheaper educational devices like the Raspberry Pi, or initiatives to get computers into the school as with the BBC Micro.  Beyond that, you can run a free compiler on your free operating system, edit files with your free IDE, look up documentation with your free browser, and so on.

One of my biggest worries as the use of LLMs grows is that they are — almost necessarily, at least at the moment — subscription-based tools hosted elsewhere.  There are models that can be run on your computer, but they tend to be much 
