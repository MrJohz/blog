+++
title = "Switching to BunnyCDN in Less Than 2 Hours"
date = 2025-03-09
tags = ["tools", "bunnycdn", "hosting", "blogging", "cloudflare"]
slug = "switching-to-bunny-cdn"
[params.cover]
name = "Arctic Hare"
artist = "John James Audubon"
date = "c. 1841"
institution = "National Gallery of Art"
institution-url = "https://www.nga.gov/"
+++

> **Update, 2025-04-16:** I wrote a follow-up post after about a month of usage, and you can read that [here]({{< ref "/posts/0014-bunny-updates" >}}).

Given some recent, uh, _instability_ in US politics, and given that everyone likes an underdog, I've been looking at European alternatives to my current hosting situation, which is Cloudflare.

After looking through [european-alternatives.eu](https://european-alternatives.eu/), and reading [some opinions](https://bsky.app/profile/dubroy.com/post/3ljuv6i2hud2h) on Bluesky, I figured I'd try out BunnyCDN, which is a CDN service based in Slovenia. The process of completely switching over to BunnyCDN was remarkably easy, and took a little under two hours to set up.

In this post, I want to describe how I switched, a couple of the more confusing steps along the way, and my thoughts and impressions on the process overall.

To be clear, this is not in any way a sponsored post — I am not affiliated with BunnyCDN in any way (other than having my site running on their CDN network). But this post will be pretty positive about them, because so far I'm really impressed with how easy everything was.

## Getting Started

The first thing to do is, obviously, register on the BunnyCDN site. There is a 14-day free trial option (at least at the time of writing) which doesn't require any credit card or payment method to be set up.

Once registered, the process is somewhat more manual than Cloudflare's Pages offering, although still fairly simple. Essentially, for a blog hosted on a CDN like this, I needed two things:

- An edge "storage zone", where the files would be hosted.
- A "pull zone", which acts as the CDN, loading and caching files from a host and serving them to clients.

The magic configuration here is telling the pull zone that its origin (i.e. where it loads files from) should be a specific BunnyCDN storage zone, rather than an arbitrary host.

Creating the storage zone works very easily. There are various options for where you can replicate the data to, and the storage tier options available. I ended up choosing the fastest "Edge" tier and selecting all the regions, which produced a monthly cost of $0.30/GB. A quick `du -sh` of my built files showed that I would be uploading considerably less than 1GB, and even then, 30¢ a month is a fairly minimal price.

Once created, you get access to a folder viewer which shows the contents of the storage zone (initially empty). Here you can manually upload files (although there are automated ways of doing this that I'll get to later). For the sake of the test, I built my blog locally and uploaded those files to the storage zone.

The next step is adding a pull zone. This is also very simple — again, you have some choices about which zones you want to support, and you can choose between the standard tier, and a cheaper tier designed for large files. The pricing varies depending on which zone the user connects to, so you can choose to skip out on more expensive zones you don't actually need, but again the prices are negligible on a blog of my scale, so I left all regions selected.

While creating the pull zone, you are also asked for the pull zone's origin, i.e. the source that the CDN should use when there's nothing cached yet. Here, I chose the previously created storage zone.

These two steps took perhaps half an hour at most, and at the end of them, I had a URL (`<my-pull-zone-name>.b-cdn.net`) that was hosting my blog.

## Switching Over From Cloudflare

My first impressions were really positive — BunnyCDN was pretty consistently returning my blog post a few hundred milliseconds faster than Cloudflare (**Edit**: see update further down — this probably isn't accurate), and the effect was noticeable just by clicking around my website. In addition, the experience had been remarkably effortless — yes, it wasn't quite as quick as Cloudflare's one-click Pages system, but it was still pretty easy, and BunnyCDN's admin dashboard also felt a lot clearer and more usable than Cloudflare's. This felt very promising.

So I made the sort of decision that one probably shouldn't make with a "production" site at 10pm in the evening, and I switched the domain's DNS to point to BunnyCDN instead.

Given my domain is also managed by Cloudflare, this felt a bit sacrilegious, but it was also fairly simple. In the Cloudflare DNS settings page, there was an existing CNAME record pointing at my Cloudflare Pages site, so I switched that over to the BunnyCDN site. I also disabled the "Proxy" setting — this is important, as it ensures Cloudflare directly points users to the BunnyCDN IP addresses, as opposed to proxying the requests via their own servers (essentially creating a double CDN).

After waiting five or so minutes, I could tell from the headers being served when I accessed my blog that it was being served via BunnyCDN. Initially, this produced a HTTPS warning about invalid certificates, but this was easy to fix by enabling HTTPS in the BunnyCDN dashboard.

Again, this whole process took maybe fifteen minutes or so, and at the end of it, the whole site was being fully served by BunnyCDN, and feeling significantly snappier for it.

## Automating Deployments

The last step was to get automated deployments up and running. I didn't want to have to manually upload files every time I made a change, so I needed a CI job that would automatically build and release my site.

This is something that ought to be simple, but did turn out to be more complicated for a number of reasons, partly my own confusion, but partly because of a lack of documentation.

The Git repo backing this site is hosted on Github, so I used GH Actions as I have done before. I already handle [updating discussions]({{< ref "/posts/0007-adding-discussions" >}}), which comfortably within the free tier, and I figured these builds would do so as well.

BunnyCDN provides two ways to automatically upload (or manipulate) files in a storage zone: an HTTP API (that can also manage other aspects of the CDN), and an FTP connection.

Given these two options, I chose the third: letting someone else do the hard work for me. There are a couple of pre-written actions on Github that handle uploading files to BunnyCDN, so I picked [`ayeressian/bunnycdn-storage-deploy`](https://github.com/ayeressian/bunnycdn-storage-deploy), which seemed fairly popular, and was not too difficult to inspect and validate.

This worked quite well, once I figured out the tricks needed to get it working. Specifically:

- The `upload`, `remove`, and `purgePullZone` parts are all necessary, at least for the standard case of uploading an entirely new site to the storage zone. If you skip `purgePullZone`, the new pages will get uploaded, but the CDN will still serve the cached, older pages.
- The "last modified" times shown for files in the UI seem to be in UTC. I live in Germany, which is close enough to UTC that it took me a while to realise that uploading new files was having an effect on the storage zone, and wasn't just leaving all the files in the same state they were in one hour ago.
- Using the terminology of the action, the `storageZoneName` and `storagePassword` are both available in the storage zone API/FTP settings. The `accessKey` is the global account access key, this can be found in the user settings. Finally, the `pullZoneId` is the zone _ID_, not just the name, and the easiest way to get that is to take it from the URL when looking at your pull zone in the dashboard. If you get these values wrong, the error messages tend to be opaque, so this took a while to figure out.

However, once it was working, it all worked very nicely. The job takes about 25s to run, runs of every push to master, and successfully deploys the site as I would expect.

## Impressions

Overall, I really liked BunnyCDN. I have been looking at it for a few weeks now, but being able to completely switch over my site from Cloudflare in less than two hours was impressive to me — especially as there's no happy golden path "import from Cloudflare" logic going on here. I imagine it would be exactly this easy to switch from any existing CDN, and probably most other static hosting providers as well. And my impressions thus far are pretty positive:

- The server responses seem to be consistently faster than Cloudflare's, at least here in Germany. This may not be true everywhere, but BunnyCDN do seem to have fairly good worldwide coverage.

- The UI is also a lot clearer than Cloudflare's. This might be because Cloudflare just has more products, but I think BunnyCDN's separation of "pull zones" and "storage zones" makes it easier to organise configuration into the right categories.

- The UI also loads waaaay quicker. Cloudflare's dashboard is at times really painful to use just from the loading times and the awful spinners and skeleton states that pop up everywhere. BunnyCDN's dashboard feels much snappier, and has far fewer loading states in it.

- The server-side monitoring setup for BunnyCDN feels like it's providing more useful information. I also have access to the server logs from the last three days, with the chance to export them manually or automatically, or forward them to a different service. I assume this is all possible with Cloudflare as well, but not on the free tier. To give a specific example: I can now see that a handful of people read this blog via the RSS feed, which is very cool! Hi, people who subscribe!

- There's a workers-like system that seems fairly powerful. I haven't tried it out yet, but it looks like you can do most things that you can do with Cloudflare's workers, including things like WASM workers. In the CDN configuration, you can also redirect specific routes to a worker, which should make integrating workers with an existing static site very convenient.

- The cost is almost entirely negligible, at least for my normal loads. Your mileage may vary, obviously, and I've not tested this out for very long, but daily load looks like it will probably come out at under a US cent, and storage costs aren't even visible in the UI, despite having picked the most expensive (i.e. fastest) options. There is a minimum spend of $1 a month, and I'm assuming for now that it'll be very rare if I spend more than that. This puts the cost of hosting at the same order of magnitude as the amount I pay for domain registration.

That said, BunnyCDN isn't perfect, and it's worth being aware of some of the differences and drawbacks:

- Cloudflare's Pages are very near to a one-click option, where they automatically handle building, deploying, and managing different pages for different branches for you. BunnyCDN is more manual. It's not complicated, and once it's set up there's not much difference, but it is more manual.
- Cloudflare Pages is free (as in, completely free, you might not even need a credit card to sign up). BunnyCDN is very low cost, but it's not completely free.
- Cloudflare feels slightly more professional in a couple of places. For example, there is an API to interact with BunnyCDN's systems, but it's not as well documented as Cloudflare's documentation. There is a way to manage a team with multiple accounts in BunnyCDN, but the access controls feel very granular. It doesn't seem possible to create multiple API keys for different tasks, and instead you just get a single API key per user. This works fine for me, but I can imagine larger corporations finding this harder to work with.

## Conclusion

I like BunnyCDN. It's fast, it's cheap, and it's very easy to use. It's an EU company that seems to be privacy-conscious enough for me for now. It's got weird bunny-people cartoons everywhere, that are a bit unsettling at first, but have a nice "just be weird about it" sort of energy to them.

For now, I'm going to keep the domain pointed at BunnyCDN and use the free trial I've got to test it out a bit more. If you run into issues accessing this site that you didn't have before, please [let me know]({{< ref "/contact" >}}). Alternatively, if you had issues with Cloudflare and those are fixed now, let me know.

I'll still keep the old Cloudflare Pages instance around, because, well, it's free, and it's still convenient for creating preview sites when I want to show someone what I've been working on. (With Cloudflare, preview sites are created automatically for any branch in a repository — that's presumably also possible with BunnyCDN, but more manual work that I don't want to get round to yet.) And if everything goes wrong, I can switch back to Cloudflare at any time.

But for now, I'm a satisfied BunnyCDN customer, and I would recommend giving it a go.

## Update — 15th March 2025

This post unexpectedly hit Hacker News, and the people there provided some feedback in their usual loveable way, and also the first stress-test of my new CDN hosting! So to deal with those, in order:

Firstly, I mentioned that BunnyCDN was serving pages a few hundred milliseconds faster than Cloudflare. In fairness, I was testing this at about 11pm at night, having just had a fit of inspiration that I should try this out, so these aren't exact measurements with an easy-to-reproduce benchmark. I was playing around with Firefox and the `load` event (i.e. waiting for all assets to finish loading), and getting around 150ms via BunnyCDN, vs 300ms via Cloudflare. Someone pointed out on HN that there issues with certain German ISPs and Cloudflare, which may be part of the issue, but it could also have just been a temporary thing — right now, I can't measure any significant difference between the two providers.

Secondly, the person who posted my post used a URL without a trailing slash, which turned out to break my [discussions script]({{< ref "/posts/0007-adding-discussions" >}}) (which was why it was such a surprise to see this post on HN). This raised the question, though, of how they ended up at that particular URL in the first place. To try and avoid this happening again, I've added redirects via BunnyCDN's admin panel to always redirect to the canonical, ends-with-a-trailing-slash URL. Hopefully this avoids some weirdnesses in future. Thanks here goes to [Gabriel Garrido](https://garrido.io/notes/bunny-edge-rules-for-html-canonical-urls/) who wrote a blog post explaining how to set this configuration up.

Thirdly, according to the BunnyCDN dashboard, as a result of this Hacker News hit, I have now reached 25¢ of the $20 credit in my free trial. This is well within a reasonable budget for me — even if this amount of traffic were continuous throught the year (unlikely, based on past performance), I'd still only be spending about $20 a year, which is perfectly fine for me.

I will try and report back when the trial period is ended and see what the costs look like over a whole two-week period, but otherwise I'm still very happy with the results!
