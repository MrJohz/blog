+++
title = "Adding Discussions to my Blog"
date = 2024-08-05
tags = ["blogging"]
slug = "adding-discussions"
+++

I enjoy reading other people's blog posts, but I often enjoy reading the comments more. The post itself becomes a jumping-off point for further discussion, where people can add critique, additional supporting evidence, or their own alternative explanations. Or just get side-tracked by one specific line in the article and start a whole flame-war about it.

But having your own comment section means supporting forms, loading the comments dynamically somehow, handling moderation, and right now I don't want to deal with all that. So let's try a different technique: let's find existing discussions about my blog posts that already exist, and link to those instead, so people can join the discussion on a platform of their choosing.

## Goals and a Plan

I want to set down some ground rules for this project. In no particular order:

- Under each blog post on my blog, I want to have a list of links to discussion sites (e.g. Reddit, Lobsters, Hacker News, maybe X/Twitter or Mastodon) where that particular blog post is being discussed.
- I want this list to be updated automatically, but I still want my site to be statically generated via Hugo — not some dynamic system that fetches a list of discussions on every page load, or consults a database somewhere.
- I want the comments to cost — ideally — nothing, or at least relatively little, so sticking to free tiers of different web services sounds like a good idea.
- I want to automate as much as possible, but I may still need some amount of manual curation if something goes wrong.

Looking at these points, my first instinct is that I want to store the discussion links inside my blog's git repository as data. When I add a new discussion link, I'll update some data inside the repository, commit it, and push the whole thing to GitHub, where everything will get automatically built and deployed. This way, I still have my static site, and, depending on how I implement the "commit and push" phase, I can review the new discussions as they come in.

Getting hold of the discussion links should be possible with the various APIs for these different sites, or scraping if that's not possible. That might be harder with more commercial sites like Reddit or X/Twitter, but I should be able to stay under any rate limits they set. I can write a script that uses these APIs to update the data inside the repository, then commits and pushes those changes.

The last thing I'm going to need is some way of running this update script at a regular interval. I have a few options here, but right now I'm leaning towards GitHub Actions — but let's leave any final decisions here for later.

## Let There Be Discussions

Step one is figuring out how to store and display discussions on my blog posts. The automation can come later — first, I just want to get Hugo to render some data.

In Hugo, each page has ["front matter"](https://gohugo.io/content-management/front-matter/), a short snippet of YAML/TOML/JSON at the start of each Markdown file that defines key metadata such as the URL or the page's title. It is possible to add custom metadata[^cover-images], but I'm not sure that's the right approach in this case. Assuming I stick this whole blogging thing out, and assuming I manage to write anything decent, I can imagine older posts attracting a number of discussions over the years, and I don't want to clog up the start of each blog post with that sort of information.

[^cover-images]: I use this technique for the cover images — the image itself is stored as a resource next to each post with a standard file name, but to handle the attribution I use a `[params.cover]` block to describe each painting's name, artist, date of creation, etc.

Hugo also has a concept of page resources, though, which are files that live next to a page and can be accessed while rendering that page. I already use this for the cover images, so adding a new resource shouldn't be so hard. In addition, I can use the `transform.Unmarshal` function in Hugo to parse a resource written in YAML/TOML/JSON/etc into a data structure that I can use in my templates.

If I manually add the details of one discussion on Lobsters for a recent article of mine, I get a resource file looking something like this:

```toml
[[discussions]]
title = "Why Test?"
url = "https://lobste.rs/s/prowkp/why_test"
site = "Lobsters"
timestamp = 2024-06-25T07:14:58.000-05:00
comment_count = 15
score = 11
```

This feels like a good start. The URL and the timestamp are pretty important here — I want to link the discussion, and I want to give an indication of when that discussion took place. The title is less important (most of the time it'll probably just be the title of the blog post), but I'll keep it in for now. The site name is theoretically redundant information as I could guess it from the URL, but I suspect a bit of duplication here is the easier path to take. I've included the comment count and score because they're both signals that people can use to look for interesting comments — a discussion with a high score and lots of comments will probably be more interesting to read than one with a low score or relatively few comments.

Rendering this is done using `.Resources.Get` and `transform.Unmarshal`, and looks something like this:

```hugo
{{ with .Resources.Get "discussions.toml" }}
    {{ with . | transform.Unmarshal | .discussions }}
        <h2>More Discussions</h2>
        <pre>{{ . | debug.Dump }}</pre>
    {{ end }}
{{ end }}
```

Using `with` ensures that nothing gets printed if the resource isn't found (or if it's in the wrong format — although in that case it might be better to fail the build). The `<pre>{{ . | debug.Dump }}</pre>` construct is a debugging tool that allows us to see, pretty-printed, the contents of a particular variable. In this case, when we build the site we get the following output as a code block on the blog post:

```
map[string]interface {}{
  "discussions": []interface {}{
    map[string]interface {}{
      "comment_count": 15,
      "score": 11,
      "site": "Lobsters",
      "timestamp": time.Time{},
      "title": "Why Test?",
      "url": "https://lobste.rs/s/prowkp/why_test",
    },
  },
}
```

This is the Go equivalent of the TOML file we wrote: a map with a single top-level key `discussions`, which contains a list of maps containing the attributes we specified. If we added a new discussion to the file, it would show up as a second inner `map[string]interface` block. Everything's looking good so far, so we can begin trying to make a pretty representation for the discussion:

```
{{ with .Resources.Get "discussions.toml" }}
  <hr>
  <p><strong>Previous Discussions</strong></p>
  <ul>
  {{ range (index (. | transform.Unmarshal) "discussions") }}
    <li class="discussion-link">
      <a href="{{ index . "url" }}"><strong>{{ index . "title" }}</strong></a> <em>({{ humanize (index . "timestamp").Day }} {{ index . "timestamp" | time.Format "January 2006"}})</em> on {{ index . "site" }}
      <em>({{ index . "score" }} points · {{ index . "comment_count"}} comments)</em>
    </li>
  {{ end }}
  </ul>
{{ end }}
```

That'll do for now — it doesn't produce the prettiest results, the HTML isn't particularly semantic, and I'd like to add some specialisations for Reddit (where the subreddit is important) and maybe Twitter (where the scores/comments work differently), but I can handle all that later. Let's move onto the next stage: automation.

## Automation

Now I want a way of automatically finding discussions online, checking which blog post they apply to, and either adding a new entry to the `discussions.toml` file, or updating an existing one if the number of comments/points has changed.

Thankfully, most of the discussion sites that I'm interested in provide some sort of search API, where it should be possible to find all discussions for a given domain name. I can write a script that finds all of these discussions, and munges them into the format above. I also need to record the URL (or at least the slug/pathname) that each discussion links to, so that I can match them up to the correct blog posts later.

This part isn't hugely interesting, just repetitive: choose a site, figure out the API, and write a Javascript function to download the details. Some site-specific notes:

- [Lobsters](https://lobste.rs) has an API, but it's not particularly documented, so the strategy for using it mostly: add `.json` to the end of any URL and see if you get an error. If you see a JSON response, you've found part of the API! There's a `/domains/<domain>` page which can be API-ified, which returns pretty much all the data I need. Pagination exists but isn't telegraphed, so there's a bit of guesswork involved as to how many pages we need to download.
- [Hacker News](https://news.ycombinator.com/) has a couple of different APIs, interestingly both provided by different Y-Combinator-funded startups. One of these provides a full-text search that can be configured to just about do what I'm interested in. There is an HTML page that also gives me exactly what I want, but consuming an API is easier than scraping HTML.
- [Reddit](https://www.reddit.com/) has an official API, and it's even reasonably well documented (i.e. other people have used it so there's lots of hits on Google and StackOverflow for the issues I run into). It requires authentication, which was more complicated than I expected but in principle just another HTTP call that I need to make before fetching the results.

Some also-rans:

- Twitter/X — I don't use this, and I don't expect there to be much here, but I was curious what data it would produce. Unfortunately, creating an account on the site just to get access to the API proved too much work, so I gave up. Maybe I'll try again at some point in the future.
- Mastodon — I would have been more interested to get results from here, but there's a social convention to avoid full searches across the entire Mastodon federation, so I avoided this.
- Various Reddit-alikes — I frequent Tildes, and I know there are some other sites that also act as link aggregators, but most of these sites seem to be either dead, or don't have an API. I could do HTML scraping, but I don't want to spend too much time on this project.

The scrapers themselves are super simple, and all look like a variation of this:

```typescript
async function scrapeLobsters(): Promise<ScraperResult[]> {
  let page = 1;
  const responses: LobstersResponse[] = [];
  while (true) {
    const response = await fetch(
      `https://lobste.rs/domains/${DOMAIN}/page/${page}.json`
    );
    const data = (await response.json()) as LobstersResponse[];
    responses.push(...data);

    if (data.length < 25) break;
    page += 1;
  }

  return responses.map((each) => {
    const url = new URL(each.url);
    return {
      slug: url.pathname,
      toml: {
        title: each.title,
        url: each.comments_url,
        site: "Lobsters",
        timestamp: new Date(each.created_at),
        comment_count: each.comment_count,
        score: each.score,
      },
    };
  });
}
```

I also need to get a list of all the blog posts I've written, and the discussion links that are already saved for each post. (This means I can manually add discussion links for posts that used to be hosted on my old [Bear Blog](https://bearblog.dev/) site.) The hardest part about this is that there's no native `walk` functionality in the NodeJS standard library, so I use a snippet I've found online.

Finally, I can merge the scraped links with the discussion links that are already saved, sort them so that the newest discussions always show up first, and write them back to the `discussions.toml` file for each entry. This means that the next time I run the script, some of the discussions it scrapes will already have been saved in the `discussions.toml` file, so I assume that the URL of the discussion can be used as a natural ID for each discussion, and deduplicate based on that.

## Filtering

For the posts I've got now, this produces a handful of results — enough that I can start noticing some flaws in my system. The discussions that I'm scraping tend to fall into two categories:

1. The post gets at least some comments. These, to me, are the ones I want people to be able to find — even if it's only two or three comments, people are adding to the discussion, which is exactly what I want.
2. The post never got traction and so there's nothing useful to see there. This is particularly noticeable on Reddit where, if a post becomes popular, it tends to get reposted around to smaller, more niche subreddits. There are usually no comments here, or occasionally just a submission statement or an Automoderator comment. I want to skip these posts.

In practice, I seem to get one or two type-1 discussions (if I'm lucky), and a longer tail of type-2 discussions. But when someone starts a new discussion, we don't know which discussion it will become: currently it looks like a type-2 discussion (because no-one's commented yet), but it's still active and could become a type-1 discussion if people find it.

So as the discussion links are being merged, if the discussion in question has few (<2) comments, and is older than 48 hours old, we mark it as hidden. Discussions can also be marked as hidden manually by editing the `discussions.toml` file described above, which allows for a kind of spam filter.

## Automation: Round 2

With all this work, I now have a Node script that will find discussions and update a number of files in my repository. The next step is being able to run the script on a schedule, and update the repository automatically.

For the schedule, GitHub Actions seems like a good option. It has a generous free tier (2k minutes of CI time a month, which would let me run my script 60 times a day if I really wanted to). More importantly, a script running in a GitHub Actions pipeline has access to various variables and secrets that should make updating the repository easier.

I had a few ideas for how best to update the repository, but in the end I used [Peter Evans](https://peterevans.dev/)' [`create-pull-request`](https://github.com/peter-evans/create-pull-request/) action. This is one of the things that I like best about GitHub's CI system — the actions system makes it so much easier to write these sorts of encapsulated pipeline components than any other CI system I've used.

The `create-pull-request` action creates a pull request (hence the name) for the current repository based on the changes made in the local workspace. In this case, I could run the script (which fetches new data and updates all the `discussions.toml` files in the local workspace), then run `create-pull-request` to commit those changes, push them to a new branch in the repository, and create a pull request in GitHub for me to review those changes.[^create-pull-request]

[^create-pull-request]: Moreover, if there is an existing pull request already open with the same name/branch/etc, then it'll update that pull request rather than creating a new one, meaning I'll only ever have one up-to-date PR to review

This is pretty much exactly what I need, because it means my repo is still the single source of truth for my blog, but it means that updating that repo is now just a single click — I'll even get an email notification when there's new data to update.

Unfortunately, testing the `create-pull-request`-based workflow reveals a problem: the number of votes displayed for Reddit threads fluctuates a lot. This is an anti-spam mechanism that means that you never see the exact score of a particular Reddit thread, only a randomised approximate score. If you repeatedly query the same thread, you'll different values for the same discussion, even after several months or years have passed, and no-one is upvoting the thread anymore.

This means that every time the CI job runs, it produces different results, even for very old discussions, which creates a sisyphean effect where there is always a new pull request to be made. To fix this, I use the anti-anti-spam technique of only updating the discussion stats for a discussion if the vote score are more than 6% away from the previous vote score. (6% is a number plucked out of the air and adjusted based on some quick experiments.)

## Finishing Touches

Alongside the existing discussions, I also wanted some share links to make it easier to share the article with others. This was also very easy thanks to the [Social Share URLs](https://github.com/bradvin/social-share-urls) project on GitHub. In fairness, some of those results may well be a bit out of date at this point (as the project hasn't been updated in two years), but the ones that I could test easily worked well.

## Conclusion

I don't know how useful anyone is ever going to find this feature, but it's been quite fun to implement — piecing together the data from the APIs, the format for storing the discussions in the repo, and the automation to update the site whenever something changes.

By the time you read this, all of this should be live, so if you want to see what it looks like, check out one of the pages with existing discussions. Or share this post on your favourite site and start a new discussion! 😉
