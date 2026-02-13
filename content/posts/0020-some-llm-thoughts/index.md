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

In that context, LLMs are amazing. They can not only take natural language inputs and respond to them in logical ways, but they can also convert it to structured data. An LLM can take a question like "where's the train station?" and figure out what actions need to take place to produce an answer. If you're building a navigation tool, you don't need to write down in advance every possible way that a human might ask for directions (c.f. [Alexa's skills system](https://developer.amazon.com/en-US/docs/alexa/custom-skills/create-intents-utterances-and-slots.html#create-intent)), the LLM just "understands" what you want.

## Usefulness

One of the things I use LLMs for regularly is understanding an existing codebase. For that
