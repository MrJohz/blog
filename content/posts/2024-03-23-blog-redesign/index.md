+++
title = "I (Re)designed My Blog"
date = 2024-04-29
tags = ["design", "blogging", "frontend"]
[params.cover]
name = "Interior of a Painter's Studio"
artist = "Jan Davidsz. de Heem"
date = "about 1630"
institution = "MFA Boston"
institution-url = "https://www.mfa.org/"
+++

I’ve updated my blog. And of course, the first thing any self-respecting developer blogs about with a new blog design is that redesign itself. This is that post.

## Design

I confess: I am not a designer. This may be obvious. But I enjoy learning about design through practice, in much the same way that a child enjoys learning about cooking by making mud pies.

In practical terms, I sketched something on a notepad out and then starting throwing bits of CSS together to see what happened. Originally, there were going to be more angles and irregular shapes, but I couldn't get the shadows to work out right, so I dropped that. That said, I'm particularly happy with the shadows I ended up with: they're layered in a way I've not managed to achieve before, and so feel more textured and realistic than they do in other designs I've done.

The colours are generated in the way that I often create colours for personal use: I played around with https://coolors.co/ until I got some shades that looked nice enough, then showed them to other people. I really wanted this to be quite a colourful blog — I find the tech blogs that I enjoy reading the most often have both interesting content, and interesting visuals. I don’t know if I’ll manage the former, but hopefully I can manage the latter.

Normally I like taking the time to choose a good font, but I was aiming for a lightweight site. Given how heavy webfonts often are, I instead ended up with a `system-ui`-based sans-serif stack. I might change my mind on this at some point in the future — I think a nice font can give a really unique look to a text-heavy site like this — but for now I'm happy.

Most of the rest of the typographical choices I’ve made have been tweaks as I've played around here and there. At one point I had quotes, bullets, and other decorations dedented, meaning that the text remained flush with the other paragraphs. The result looked quite attractive, in a [Tufte](https://edwardtufte.github.io/tufte-css/)/LaTeX-esque way, but I found it didn't work so well with the more sans-serif look I've gone for, and partially removed that.

I also tried out some new CSS features but was disappointed by a lack of browser support. `text-wrap` provides some alternative text wrapping algorithms to the default greedy one, including one designed to avoid [widows and orphans](https://en.wikipedia.org/wiki/Widows_and_orphans), but it's only supported in Chrome. Likewise, `hanging-punctuation` improves the appearance of punctuation that falls at the start and end of lines, but is only supported in Safari. That said, typography on the web has often been a bit of an afterthought, so it's exciting that these sorts of tools are coming to the web, if only a bit slower than I'd like!

## Implementation

I’m not a designer, but I am a developer, so here I was on more solid ground. Most of my day-to-day work involves more complex projects than just a static blog, but it was nice to get back to basics again. Often, I think about new browser features in terms of the web apps that I’m building, but most of these tools add as much benefit or more to the simplest of sites, and it was exciting to play around with them in that context.

Overall, my goal was to have something that would load as quickly as possible, the first time you open the page. Sure, at a certain point you’re just quibbling over a few 10s of milliseconds, but I always like the challenge of efficiency. I assume most people are going to be clicking on this site from a link submitted to Reddit or Hacker News or the like, which means it’s unlikely that they’ll have anything cached. Therefore my focus was mainly on getting a small number of bytes sent to the reader as quickly as possible.

### Static Site Generation

For a blog like this, a static site generator is completely sufficient — there’s no dynamic content (Reddit threads can be my comments section!) and server static files will almost always be faster than something rendered dynamically. I find most SSGs tend to fall into two categories: the old-school, [Jekyll](https://jekyllrb.com/)-style “convention over configuration” style, and the modern, Javascript-based style that tends towards hydration. I’m not a huge fan of either option, but the former seems more suitable to a project like this with minimal frontend Javascript necessary, and I’ve used [Hugo](https://gohugo.io/) before, so I went with that.

I feel like there’s a lot more to Hugo than I’ve ended up using — I’ve done a bit of custom templating, changed how headers get rendered in Markdown, and configured a couple of options, and that’s about it. It’s not necessarily perfect, with little things like being unable to specify custom footnotes, or having the live reload break when I started using Sass instead of CSS, but it is entirely sufficient for my needs.

### Hosting

For actually serving the site, I ended up going with Cloudflare’s free [Pages](https://pages.cloudflare.com/) setup. It’s free, very easy to setup, and hooks directly into Github, so I just need to push changes to a repository and everything will get built automatically. It’s also distributed via Cloudflare’s CDN, which means everything should be served fairly locally to the users, reducing the time it takes to make connections and download data. I could have tried out different providers to see which one actually produced the fastest results, but in the end I just trusted Cloudflare’s marketing team, the little corporate suck-up that I am. In practice, I suspect I’d have got similar results from a range of different providers, including via Github directly. As they say on the BBC, other products are available![^cloudflare]

### Templates, and Styling

I confess it's a been a while since I dusted off my [CSS Zen Garden](https://csszengarden.com/) skills. Normally, I take a bottom-up, component-based approach to styling, but I haven't found that to work so well for text-based sites like this, where it's harder to break down individual repeatable components. Doing things the old-school route has therefore been an interesting challenge.

The first version turned out nicely, although getting it to still work nicely on mobile turned out to be harder than I expected due to some odd margins that ended up getting more complicated than they needed to be to get different elements to stay in their place. But the second, mobile-first version turned out better and looked pretty much identical to the first on larger screens. Lesson learned for the n+1th time: it’s usually easier to start from mobile and work up, than start from desktop and work down.

Every time I get my hands dirty with CSS, I'm amazed at how much easier things have become with many of the new tools. Layout with flexbox and grid, CSS variables, and so on. For this site, I've used some of the new pseudo-classes like [`:is()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:is) and [`:has()`](https://developer.mozilla.org/en-US/docs/Web/CSS/:has). These are fairly widely supported for modern browsers, but I did try the site in the Tor browser and it struggled with that, so there are fallbacks for older browsers.

## Optimisation

A big part of this project was, like I said, creating a highly optimised page that still looks nice. You will have to judge the “looks nice” aspect yourself, but I’m happy with the optimisations.

The site itself is purely static, and served via Cloudflare's Content Distribution Network, or CDN. This means that when someone in Australia, say, makes a request, they'll get a static file served from a server local to them, meaning minimal server processing time, and a low travel time for the request. The assets and HTML are also minified (on my side) and compressed (by Cloudflare), reducing the number of bytes being transferred. For all pages, this should be under the [14kb critical size](https://endtimes.dev/why-your-website-should-be-under-14kb-in-size/), even if that's [not as important as it once was](https://www.tunetheweb.com/blog/critical-resources-and-the-first-14kb/).

Another optimisation choice was to inline static JS/CSS resources into the HTML of the page. I've gone back and forth on this decision, but for now I'm sticking with it. The cost is that these assets can no longer be cached separately — each time you open a new page on this blog, you'll redownload those assets as part of the page's HTML. However, I expect most of my readers will have clicked this site from a link aggregator like Hacker News or Reddit, and therefore will have nothing in their cache anyway. Therefore, by inlining the assets, the browser doesn't need to make any additional requests to render the initial page[^http2].

On the other hand, I also wanted to have cover images on posts like the one shown above. This naturally has a cost — for this article, for example, the HTML page itself is about 11kB compressed , but the image is around 23kB. I can do the classic optimisations of using the webp format, and offering various resolutions for the browser to choose from, but unless I start going the [dithering](https://solar.lowtechmagazine.com/2018/09/how-to-build-a-low-tech-website/) route, it's going to be difficult to compress further. In practice, because the cover image loads after the content itself has loaded, it's not going to affect load times very much.

I also explored prerendering for navigating around the blog. The idea is that, if you hover over a link, you’re probably quite likely to want to open that page in a moment — and if you mouse down over the link, you’re even more likely to want to open it. We can tell the browser to optimistically prerender the next page at these points, knocking potentially a couple of hundred milliseconds off the time it takes for the next page to appear.[^connectionspeed]

There are libraries that can do this, but doing this well requires some amount of integration with the OS, as we want to avoid prerendering pages if the reader has limited data or wants to conserve power. Thankfully, there's a work-in-progress browser API that allows a site developer to specify which links could be speculatively pre-rendered, which I've configured for this site. Unfortunately, this is another Chrome-led API for now, although there seem to be some positive noises coming from other browser vendors.

To be clear, the biggest “optimisation” I’ve made here is create a static blog with few images, almost no Javascript, and mainly text content. Decisions about prerendering, CDNs, or how to load assets are at best shaving off a hundred or so milliseconds from the total experience, and I’m mainly trying these things out in a hobbyist sort of way, because it's interesting to see how they affect things. This is not something as impressive as [Low Tech Magazine's](https://solar.lowtechmagazine.com/) decision to host the entire site off solar power, although that seems like a fun project to try some time.

## Conclusion

As I said at the start, this really is just that classic page that you write when you’ve made your blog look really pretty and you want it to have at least one post on it. I’ve imported some of my older posts here, so it’s not quite as barren as all that, but I still wanted to write this post, mainly so future me can be embarrassed by my choices.

At some point, I’d like to pull the theme for this blog out into a separate repository and make it properly open source. I can’t imagine it’ll get used by anyone else, but I know people like poking around with the internals of websites like this to figure out what’s going on.

[^cloudflare]: For Tor users, I know there can be issues with accessing sites behind the Cloudflare firewall. I've tried to configure this site to be as accessible over Tor as possible (and this is something Cloudflare [explicitly support](https://developers.cloudflare.com/network/onion-routing/)). If this isn't sufficient or causes problems, then feel free to let me know.
[^http2]: Theoretically, I could have leaned into the “Server Push” or “Early Hints” mechanisms, where the server and client can agree on extra assets that the client can download before the initial payload has been downloaded and parsed. But given the size of the CSS in this case, the unlikelihood of people having the assets in cache in the first place, and the simplicity of just inlining everything, I ended up taking the easiest option.
[^connectionspeed]: Note that, at least on my laptop with a reasonably fast internet connection in Germany, it takes less than two hundred seconds for everything to load and the page to render in the first place, so this effectively makes page transitions instantaneous.
