+++
title = "I (Re)designed My Blog"
date = 2024-03-23
tags = ["design", "blogging", "frontend"]
+++

I’ve updated my blog. And of course, the first thing you blog about with a new blog design is how you updated your blog. This is that post.

## Design

Confession: I am not a designer. You may have noticed that by, for example, stumbling upon this blog post. But I enjoy trying to figure out how design works, even my methods are chaotic and ineffectual!

Most of the design of the blog came together over the course of a Saturday afternoon. I sketched out the basic idea — chunky box in the middle, overlapping highlights for the post headings, etc. Originally, there were going to be more angles, but I couldn’t get that working with the shadows like I wanted, and so dropped that with the plan to come back to it later. But then I ended up happy enough with things looking the way they are.

Like I say, I’m not an expert in this arena, but it was nice to feel like I’m slowly getting more of an understanding of what sort of things work well together. For example, I knew I wanted a fairly chunky shadow at the lower-right of each of the boxes. But previously, when I’d done that, it had felt a bit odd — the shadow was too simplistic, and it didn’t look real enough. This time, I’ve used layered shadows so that there is some shadow on all sides, but the bulk of the shadow still appears where I want it. This is more like how shadows work in the real world, where there are usually multiple lights creating multiple shadows with different strengths and shapes.

The colours are generated in the way that I often create colours for personal use: I played around with https://coolors.co/ until I got some shades that looked nice enough, then showed them to other people. I really wanted this to be quite a colourful blog — I find the tech blogs that I enjoy reading the most often have both interesting content, and interesting visuals. I don’t know if I’ll manage the former, but hopefully I can manage the latter.

### Typography

I surprised myself a bit with this project, because normally I love finding the perfect font for a particular project. I know some people dislike webfonts, particularly those loaded via Google Fonts, but for me, a well-chosen font can really elevate a page.

In this case, however, I wanted to create a hyper-optimised page that still looked good — I’ll talk more about that in a moment — and while loading a font is a sure fire way to make something look good, it can often be the heaviest asset used by a given page, particularly on blogs like this one. So I’ve opted for a more standard font stack using `system-ui` as the default.

Most of the rest of the typographical choices I’ve made were less consciously designed, and more tweaked later once I’d got everything working. One thing I tried out was keeping the left edge of the text flush, so in quotes, for example, there is a dedented decoration running down the left edge of the quote to mark where it is, but the quote itself remains flush with the rest of the text. This looks quite nice for single levels of nesting, but once you have code block nested in list items nested in quotes, things start looking a bit more messy, but I don’t think I’ll go down that route very often!

You can see some of the typographical decisions highlighted on my [typography test page](/typography).

I also tried out some new CSS features but was disappointed by a lack of browser support. `text-wrap` provides some alternative text wrapping algorithms to the default greedy one. I originally tried out `text-wrap: balance` on headings — if a single line gets broken into two, `balance` ensures that the two lines will be of roughly equal width, rather than one very long line and one very short one — but it didn’t play well with the `max-width: max-content` that I was using for headers, so I abandoned it. `text-wrap: pretty`, however, works well for paragraph elements, and is worth the potentially slower text rendering for a blog that is mainly about reading blocks of text. That does things like reducing the numbers of [widows and orphans](https://en.wikipedia.org/wiki/Widows_and_orphans) in the text, but unfortunately only works in Chrome, for now at least.

On the other hand, if you view the site in Safari, you’ll get to take advantage of the `hanging-punctuation` declaration, which improves the appearance of punctuation at the start and end of lines. It’s a very small detail, but I think it looks nicer, especially with the attempt to keep text flush that I described earlier.

## Implementation

I’m not a designer, but I am a developer, so here I was on more solid ground. Most of my day-to-day work involves more complex projects than just a static blog, but it was nice to get back to basics again. Often, I think about new browser features in terms of the web apps that I’m building, but most of these tools add as much benefit or more to the simplest of sites, and it was exciting to play around with them in that context.

Overall, my goal was to have something that would load as quickly as possible, the first time you open the page. Sure, at a certain point you’re just quibbling over a few 10-100s of milliseconds, but I always like the challenge of efficiency. I assume most people are going to be clicking on this site from a link submitted to Reddit or Hacker News or the like, which means it’s unlikely that they’ll have anything cached. Therefore my focus was mainly on getting a small number of bytes sent to the reader as quickly as possible.

### Static Site Generation

For a blog like this, a static site generator is completely sufficient — there’s no dynamic content (Reddit threads can be my comments section!) and server static files will almost always be faster than something rendered dynamically. I find most SSGs tend to fall into two categories: the old-school, [Jekyll](https://jekyllrb.com/)-style “convention over configuration” style, and the modern, Javascript-based style that tends towards hydration. I’m not a huge fan of either option, but the former seems more suitable to a project like this with minimal frontend Javascript necessary, and I’ve used [Hugo](https://gohugo.io/) before, so I went with that.

I feel like there’s a lot more to Hugo than I’ve ended up using — I’ve done a bit of custom templating, changed how headers get rendered in Markdown, and configured a couple of options, and that’s about it. It’s not necessarily perfect, with little things like being unable to specify custom footnotes, or having the live reload break when I started using Sass instead of CSS, but it is entirely sufficient for my needs.

### Hosting

For actually serving the site, I ended up going with Cloudflare’s free [Pages](https://pages.cloudflare.com/) setup. It’s free, very easy to setup, and hooks directly into Github, so I just need to push changes to a repository and everything will get built automatically. It’s also distributed via Cloudflare’s CDN, which means everything should be served fairly locally to the users, reducing the time it takes to make connections and download data. I could have tried out different providers to see which one actually produced the fastest results, but in the end I just trusted Cloudflare’s marketing team, the little corporate suck-up that I am. In practice, I suspect I’d have got similar results from a range of different providers, including via Github directly — as they say on the BBC, other products are available!

### Templates, and Styling

I confess, it’s been a while since I dusted off my [CSS Zen Garden](https://csszengarden.com/) skills. Normally, I take a bottom-up approach to building sites: take a specific unit of design, like a button, and create a component out of it, then create more components that use that button, and so on and so forth. Maybe I could have done that here, but given the templating tools provided by Hugo, I figured it would be easier to take the top-down approach and try holistically styling the entire document.

The first version turned out nicely, although getting it to still work nicely on mobile turned out to be harder than I expected due to some odd margins that ended up getting more complicated than they needed to be to get different elements to stay in their place. But the second, mobile-first version turned out better and looked pretty much identical to the first on larger screens. Lesson learned for the n+1th time: it’s usually easier to start from mobile and work up, than start from desktop and work down.

I mentioned new web APIs earlier. The most obvious (but not that new any more) is flexbox, which makes laying things out so much simpler than it used to be. CSS variables made it easier to defined colours and consistent style elements, and also made it easier to implement dark mode (just by changing the values of certain variables, rather than adding media queries all over the place). I’ve used [`:is()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:is) and [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has) pretty extensively — `:is()` is pretty widely supported on modern browsers, and while there’s less support for `:has()`, it’s available in the latest versions of all major browsers, and I assume my readership will stay fairly up-to-date there. `:has()` is particularly nice, as it allows parent elements to be updated depending on a child selector, which I’ve used to reduce duplicate code for the light mode/dark mode colour switcher, and for the header elements — note how the headers only react when you hover over the actual link, not when you hover over the surrounding box.

I almost used the new [CSS nesting](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_nesting) feature, which I’d normally have used the Sass preprocessor for. It is almost as supported as `:has()`, but I ended up using Sass for a couple of mixins anyway, at which point I already had the nesting via Sass and didn’t need to use the native CSS nesting. But I’m excited to give it a go at some point.

## Optimisation

A big part of this project was, like I said, creating a highly optimised page that still looks nice. You will have to judge the “looks nice” aspect yourself, but I’m happy with the optimisations.

The site itself is static, and served via Cloudflare’s CDN, which has nodes pretty much all over the planet, and therefore physically making the connection and starting to download the files should happen very quickly. I’ve also read through [some](https://endtimes.dev/why-your-website-should-be-under-14kb-in-size/) of the [literature](https://www.tunetheweb.com/blog/critical-resources-and-the-first-14kb/) on why getting a site under 14kB is particularly valuable — okay sure, the science isn’t settled here and some practical performance measuring might be useful, but my site’s homepage transfers about 5kB, and any individual page between 5-10kB depending on how much content is in there. So purely from a network perspective I’m happy!

I chose to inline all my assets directly into the page. This means that I can’t cache assets separately to the content, which means if you start clicking around multiple pages, you’ll end up downloading the same CSS declarations afresh on each new page you visit (at least the first time you visit that page — after that point, the whole page should be cached indefinitely).

I’ve gone a bit back and forth on this topic when I’ve looked at this before, but in this case my reasoning is this: I’m specifically optimising for new readers, i.e. people who’ve clicked on my blog from Hacker News or Reddit, and therefore who probably don’t have any of my assets in their cache. In the case where you need to download both content and assets, it’s more efficient if the assets are bundled directly into the page (as it saves extra network communication and, I suspect, improves compression). With inlined CSS, the browser can also get started on rendering things more quickly, rather than having to parse the HTML to find out which assets are necessary first.[^1]

In terms of new web APIs, I like how easy the `type="module"` script attribute makes loading Javascript efficiently. This one declaration turns on the new ESModules syntax, strict mode, and defers parsing and execution until the page itself has been rendered, which for most simple scripts on a static site like this, is exactly what I want. This is true even for inline scripts. This means that there’s a minuscule chance, if you toggle the “Light/Dark” switch at the top of the page quickly enough when the page loads, that you’ll hit the moment after the page has been rendered, but before the script has defined what that button should do, but that’s a risk I’m willing to take.

I also explored prerendering for navigating around the blog. The idea is that, if you hover over a link, you’re probably quite likely to want to open that page in a moment — and if you mouse down over the link, you’re even more likely to want to open it. We can tell the browser to optimistically prerender the next page at these points, knocking potentially a couple of hundred milliseconds off the time it takes for the next page to appear.

In practice, there are a number of issues with this idea: on mobile, low-power, or low-data devices, we don’t want to waste precious resources prerendering a page unless we have to, so we need a way to turn the prerendering off. The user should also be in control of prerendering — if they don’t want the feature, they should be able to turn it off. And we don’t want to prerender too much — if I immediately prerender everything on the page when the user first loads my site, then the browser will end up wasting requests and CPU cycles on pages that will never be visited.

There are libraries that can handle prerendering for you, but looking through them, they seemed to struggle with some of those sorts of issues — it wouldn’t be possible for the user to disable them easily, for example, and it wasn’t always clear how they handled devices using mobile data.

Thankfully, however, there’s currently an in-progress browser API that handles these cases better. The [Speculation Rules API](https://developer.chrome.com/docs/web-platform/prerender-pages#the_speculation_rules_api) is a way of indicating to the browser which links could be speculatively prerendered, while also letting the browser handle the question of whether that prerendering makes sense for the current user. Because it’s built into the browser, it can be easily disabled (and some ad-block extensions disable it by default for privacy reasons), and the browser also has all the information necessary to decide whether it makes sense to prerender in the current context. Unfortunately, the Speculation Rules API has only been implemented in Chrome and friends, so if you’re using Firefox (like I am) or Safari, it won’t affect you.

I’m not sure how much of a win this is — playing around with it in Chrome, it makes navigations around the site feel subjectively much quicker, but I’ve already pointed out that internal navigation between pages is not what I’m primarily optimising for, and there’s always the danger that the browser prerenders more often than it needs to and there’s a bunch of wasted data. But it’s interesting to try out for now.

### Caveatting the Optimisation

To be clear, the biggest “optimisation” I’ve made here is create a static blog with few images, almost no Javascript, and mainly text content. Decisions about prerendering, CDNs, or how to load assets are at best shaving off a hundred or so milliseconds from the total experience, and I’m mainly trying these things out to see how usable and useful they are in practice. All of these decisions also come with various tradeoffs — by hosting my blog on Cloudflare, I make the site quicker for users browsing from distant locations where the latency to a local Hetzner instance might be much higher, but I also make it harder for privacy-conscious users to use Tor and similar tools.[^2]

And there’s lots of other tradeoffs I could have made instead. I love [Low Tech Magazine’s](https://solar.lowtechmagazine.com/) decision to host the entire site off a solar-powered box in their back yard — it requires far more constraints than I’ve needed for this site, and yet it usually seems to be up when I want to read it.

## Conclusion

As I said at the start, this really is just that classic page that you write when you’ve made your blog look really pretty and you want it to have at least one post on it. I’ve imported some of my older posts here, so it’s not quite as barren as all that, but I still wanted to write this post, mainly so future me can be embarrassed by my choices.

At some point, I’d like to pull the theme for this blog out into a separate repository and make it properly open source. I can’t imagine it’ll get used by anyone else, but I know people like poking around with the internals of websites like this to figure out what’s going on.

[^1]: Theoretically, I could have leaned into the “Server Push” or “Early Hints” mechanisms, where the server and client can agree on extra assets that the client can download before the initial payload has been downloaded and parsed. But given the size of the CSS in this case, the unlikelihood of people having the assets in cache in the first place, and the simplicity of just inlining everything, I ended up taking the easiest option.
[^2]: It looks like Cloudflare can support Tor using onion routing and serving files directly on the Tor network, with a [bit of configuration](https://developers.cloudflare.com/network/onion-routing/). I will explore that further at some point, but I unfortunately have very little experience with Tor, so I’m not sure how successful that will be in the end.
