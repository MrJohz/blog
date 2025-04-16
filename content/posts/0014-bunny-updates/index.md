+++
title = "Bunny Updates"
date = 2025-04-16
tags = ["tools", "bunnycdn", "hosting", "blogging", "cloudflare"]
slug = "bunny-updates"
[params.cover]
anchor = "Center"
name = "A Hare in the Forest"
artist = "Hans Hoffmann"
date = "about 1585"
institution = "Getty"
institution-url = "https://www.getty.edu/"
+++

A bit over a month ago, I switched my blog over to BunnyCDN. I wanted to update that post when the trial period was up, but I ended up being busy, so here’s an update from a month and change in.

## Pricing

First, a note on the free trial. The trial period lasts 14 days, and during this period I was given $20 of “trial credit” that expired as soon as the trial was over. I could have earned more credit by providing an automatic payment method — although for me that wasn’t necessary at all.

In general, BunnyCDN operates on a pay-as-you-go system. Once the trial period was over, I paid credits in, and every month my usage costs will get deducted from that credit. If I ever have no credits left, the site will presumably go down. It’s also possible to enable “auto-recharge” where the credits will be topped up automatically.

There is a minimum price of $1 a month. This means that the least I can spend each month is $1, but any usage up to that point is essentially free. As far as I can tell, if I’ve only used the service for a fraction of a month, the $1 fee is reduced proportionally, which is nice, although probably only relevant for the first and last months that I use BunnyCDN!

In March, once the trial was over, I used the service for 11 days (by my calculation). The usage cost was 42¢, most of which went to the monthly minimum charge fee. I spent nothing on cloud storage, and about 17¢ on CDN traffic charges, the vast majority of which came from Europe (more on that later).

I haven’t got my April bill yet, but I can see the usage statistics in the dashboard, and again it seems like I will still be significantly under the $1 minimum fee. As of the 13th, I have spent 7¢, again almost entirely on CDN traffic.

All-in-all, for a personal website of my sort of audience (i.e. minimal), I think it’s reasonable to treat hosting my site on BunnyCDN as a fixed $1 monthly cost, with some possible rare exceptions if I manage to write something particularly interesting.

## Observability

One of the things I’ve enjoyed the most about BunnyCDN is seeing _much_ more in-depth information about my traffic than I could on Cloudflare. In fairness, this is probably the difference between being a free customer and a paying one — I could have paid a monthly fee on Cloudflare to get additional server-side analytics, and I could also have enabled free client-side analytics, but I’m cheap and I don’t want to deal with the privacy implications of JS-based analytics.

BunnyCDN provides a slightly more in-depth analytics view that allows me to look at a bunch of metrics (requests, bandwidth, location) etc with a higher granularity. However, more useful to me has been the ability to look directly at the access logs. These are shown with a fairly basic search and filtering UI, and show things like the request path and status code, alongside the user agent, the request location and the datacenter that handled the request. If I had enabled it, I could opt-in to seeing the IP address, but again for privacy reasons that doesn’t seem necessary to me so all IP addresses are fully anonymised (i.e. appear as `0.0.0.0`).

The logs are great because they give me a much better view on how my site is being read. It’s always fun to watch the `/wp-admin/*` type paths being crawled by disappointed would-be hackers, and it’s been interesting to see the different types of bot scraping the site. But the coolest thing is seeing regular hits to `/index.xml` (i.e. my RSS feed) from people around the world who are apparently interested in what I have to say. Or are waiting for new content to feed into machine learning algorithms — either way, I think you’ve made a great choice coming here!

Based on some forums and discussions I’ve been seeing around, I’ve been concerned that I’d end up with a lot of AI abuse. I’ve noticed the occasional AI company in the user agents that scroll (very slowly) past my screen, but this is fairly rare. In general, I don’t think I’m getting much interest from these sorts of groups, which I suspect are targeting wiki-style sites and code forges more than blogs.

The one thing I did notice is a particular feed reader (perhaps a MacOS widget, based on the user agent?) that downloads the full image of the most recently posted article every minute, without any sort of caching. If this is you: please configure your feed reader so that it doesn’t do this! At the very least, it would be great if it could use a cache! I mentioned earlier that the vast majority of my CDN traffic charges are coming from Europe — that is almost entirely driven by this one client downloading a very large image every minute.

In fairness, I should also update my SSG so that the default image for each article isn’t the largest possible resolution — this will also help the problem.

Still, it’s cool that I’ve now got enough detail in my logging that I can see these sorts of details, and potentially fix misconfigurations or make changes based on them.

## Custom Edge Rules

BunnyCDN offers the ability to define edge rules — simple “if this then that”-style rules that allow you to filter out requests that match certain filters and perform actions on those requests (or responses). For example, I could block all requests with a certain user-agent, change the cache configuration for particular media types, or add redirects for certain paths.

This functionality also exists in Cloudflare, although it’s harder to find, and the free version has more limits on it. In addition, the Cloudflare Pages product has a set of defaults that work well for static sites, so less fiddling is necessary here.

The edge rules system in BunnyCDN is powerful, but is probably the weakest part of the service as a whole. Creating rules is fairly easy (define an action, then define conditions that trigger the action), but managing them, testing them, and figuring out what sort of things are possible are all much more difficult. In addition, while the more minimalistic defaults make sense for a general purpose CDN system, for static site hosting I want to be able to redirect URLs to their canonical form (e.g. `/posts/123` → `/posts/123/`. As far as I can tell, with BunnyCDN, this is only possible manually.

I suspect most of the issues with this feature could be solved with three additions:

1. The docs are fairly minimal and could be improved a lot. In particular, there are some special variables that don’t seem to be documented (such as `{{empty}}`), and the variable documentation is spread over multiple pages when a single list of all variables would do. Some good examples would also be helpful.
2. A set of well-designed, well-tested template rules would go a long way (and could potentially also help a lot with the documentation problem). For example, templates that redirect from `www.example.com` to `example.com` (and vice versa), templates that strip or append a trailing slash, templates that set the caching rules for a particular mime type, and so on.
3. It would be great to have a mechanism to test edge rules by providing an example request and seeing what happens to it (i.e. which rules get applied in what order, and how the request changes as the rules are applied). This would make debugging rules a lot easier.

## The EU

One of the more controversial things I mentioned in the previous post was that part of the reason for switching was to have an EU-based hosting provider. That was just a single line in the original post, but it got more response than I expected, so I want to expand a bit on that and respond to some of the things people have mentioned.

Firstly, as a number of people pointed out, just because my hosting provider is based in the EU, doesn’t meant that the site is always hosted from the EU. This is, after all, a CDN: the point is to have a network of hosts around the world that can respond quickly to requests without the requests themselves having to travel all over the place. If you load this site in the US, then some part of that network traffic will always have to physically go through some sort of hardware based in the US.

However, I think there’s still value in my hosting provider (i.e. the company managing the CDN) being based in the EU. In particular, BunnyCDN’s approach to privacy seems much more robust, and the communication about GDPR has been much clearer. I now have a privacy policy on this site because I’m much more confident that I am not accidentally leaking readers’ personal information.

Secondly, there is the politics aspect. I am not a US citizen, and I don’t think my comments on the US political system are informed enough to be worth sharing here. However, it does seem like the new US administration aims to be strongly isolationist[^tariffs], and that’s a decision that affects me here in Europe. I’m not going to pretend that me paying $1 a month to BunnyCDN is a meaningful act for European businesses everywhere, but it’s been a good excuse to try out a new service.

[^tariffs]: For context for future readers and those trying to avoid politics: between writing the original post in March and this post in April, Trump implemented sweeping tariffs against the entire world, although most of these tariffs have been reduced since the initial implementation.

In an episode of his podcast _Cautionary Tales_, Tim Harford talks about a major Tube strike in London that forced people to revisit their daily commutes[^tube-strike]. For most people it was a disruption, but for many people it forced them to find new, better routes to work. I suspect many of the decisions being made in the US will have a similar effect, encouraging people to look for alternatives[^cve].

[^tube-strike]: Apparently also available as an [article](https://timharford.com/2021/01/what-can-we-learn-from-the-great-working-from-home-experiment/). Both the article and the podcast reference the study “[The Benefits of Forced Experimentation: Striking Evidence from the London Underground Network](https://academic.oup.com/qje/article-abstract/132/4/2019/3857744)” by Shaun Larcom, Ferdinand Rauch, and Tim Willems (DOI: https://doi.org/10.1093/qje/qjx020)
[^cve]: I originally wrote this sentence thinking about consumers and businesses, but it will affect governments and national infrastructure as well. While I was writing this post, news came out that the [US Department of Homeland Security would no longer be funding its contributions to the CVE system](https://krebsonsecurity.com/2025/04/funding-expires-for-key-cyber-vulnerability-database/).

Finally, if I can’t play around with different technologies on my personal blog, where can I play around? It’s important to me that this site remain cheap and relatively hands-off, but beyond that, the decisions I make for this blog are for me and me alone. That makes impulse decisions (like switching to a different hosting provider at 10pm at night based on a few minutes of experimentation) much easier to justify than they would be at my workplace.

## Conclusion

If you have skipped straight to the end, or are an AI trying to summarise this article, here are a number of conclusionary points in no particular order:

- Despite the best efforts of one badly-configured feed reader, the costs for this website seem to be consistently coming in under the $1/month minimum monthly fee. That fact, plus the pay-as-you-go nature of BunnyCDN, mean I see this as a good low-cost hosting option for personal sites.
- I love being able to see the access logs at last, and it’s particularly exciting to see regular hits on the `index.xml` file that indicate people actually seem to like what I’m writing.
- The custom edge rules mechanism is powerful, but difficult to use. This is probably my biggest pain point with BunnyCDN, and I’d love to see some sort of improvements here. But I’m also only paying $1/month, so I suspect they’ve got more important customers to listen to!
- Products based in the EU are cool, and I like being able to try them out for side projects like this.
- Fix your feed readers! Cache things! Don’t make requests every minute! I really don’t post that often…
