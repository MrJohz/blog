import type { Dirent } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as TOML from "smol-toml";

const DOMAIN = "jonathan-frere.com";
const STANDARD_HEADERS = {
  "User-Agent":
    "discussion-scraper v0.1 | Reddit: MrJohz | Email: jonathan.frere@gmail.com",
};

type DiscussionsToml = {
  title: string;
  hidden?: boolean;
  url: string;
  site: string;
  timestamp: Date;
  comment_count: number;
};

type ScraperResult = { slug: string; toml: DiscussionsToml };

type LobstersResponse = {
  url: string;
  title: string;
  created_at: string;
  comment_count: number;
  comments_url: string;
};

type HnResponse = {
  num_comments: number;
  created_at: string;
  title: string;
  story_id: number;
  url: string;
};

type RedditResponse = {
  data: {
    created_utc: number;
    permalink: string;
    subreddit: string;
    title: string;
    num_comments: number;
    url: string;
  };
};

type RawDiscussionsToml = {
  title: string;
  url: string;
  site: string;
  timestamp: TOML.TomlDate;
  comment_count: number;
};

async function scrapeLobsters(): Promise<ScraperResult[]> {
  console.info("Scraping Lobsters");
  let page = 1;
  const responses: LobstersResponse[] = [];
  while (true) {
    const response = await fetch(
      `https://lobste.rs/domains/${DOMAIN}/page/${page}.json`,
      { headers: STANDARD_HEADERS }
    );
    const data = (await response.json()) as LobstersResponse[];
    responses.push(...data);

    // there is no official indicator that there are more pages to paginate to,
    // but right now there are at most 25 stores on a page, so if we have fewer
    // stories in our response, we've probably reached the end of the list
    if (data.length < 25) break;
    page += 1;
  }

  console.info("Lobsters Data Downloaded");
  return responses.map((each) => {
    const url = new URL(each.url);
    return {
      slug: normaliseSlug(url),
      toml: {
        title: each.title,
        url: each.comments_url,
        site: "Lobsters",
        timestamp: new Date(each.created_at),
        comment_count: each.comment_count,
      },
    };
  });
}

async function scrapeHackerNews(): Promise<ScraperResult[]> {
  console.info("Scraping Hacker News");
  let page = 0;
  const responses: HnResponse[] = [];
  while (true) {
    const query = new URLSearchParams({
      query: `"${DOMAIN}"`,
      restrictSearchableAttributes: "url",
      advancedSyntax: "true",
      hitsPerPage: "20",
      page: String(page),
    });

    const response = await fetch(
      `https://hn.algolia.com/api/v1/search_by_date?${query}`,
      { headers: STANDARD_HEADERS }
    );
    const data = await response.json();
    responses.push(...data.hits);

    if (data.nbPages === page + 1) break;
    page += 1;
  }

  console.info("Hacker News Data Downloaded");
  return responses.map((each) => {
    const url = new URL(each.url);
    return {
      slug: normaliseSlug(url),
      toml: {
        title: each.title,
        url: `https://news.ycombinator.com/item?id=${each.story_id}`,
        site: "Hacker News",
        timestamp: new Date(each.created_at),
        comment_count: each.num_comments,
      },
    };
  });
}

async function authReddit(): Promise<string> {
  console.info("Authorizing Reddit");
  const response = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        btoa(`${process.env.REDDIT_ID}:${process.env.REDDIT_SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
  });

  const data = await response.json();
  console.info("Reddit Authorized");
  return data.access_token;
}

async function scrapeRedditOnce(
  token: string,
  n: number
): Promise<ScraperResult[]> {
  let after: string | undefined = undefined;
  const responses: RedditResponse[] = [];

  while (true) {
    const query = new URLSearchParams({
      q: `site:${DOMAIN}`,
      type: "link",
      t: "all",
      sort: "new",
    });
    if (after != null) query.append("after", after);

    const response = await fetch(
      `https://oauth.reddit.com/search.json?${query}`,
      { headers: { ...STANDARD_HEADERS, Authorization: `bearer ${token}` } }
    );
    const data = await response.json();
    responses.push(...data.data.children);

    if (data.after == null) break;
  }

  console.info(`Reddit Data Downloaded ${n}/10`);
  return responses.map((each) => {
    const url = new URL(each.data.url);
    return {
      slug: normaliseSlug(url),
      toml: {
        title: each.data.title,
        url: `https://www.reddit.com${each.data.permalink}`,
        site: `Reddit (/r/${each.data.subreddit})`,
        timestamp: new Date(each.data.created_utc * 1000),
        comment_count: each.data.num_comments,
      },
    };
  });
}

async function scrapeReddit(): Promise<ScraperResult[]> {
  console.info("Scraping Reddit");

  const token = await authReddit();
  const scrapes = (
    await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) => scrapeRedditOnce(token, i + 1))
    )
  ).filter((each): each is PromiseFulfilledResult<ScraperResult[]> => {
    if (each.status === "rejected") {
      console.warn("Reddit scraper returned an error", each.reason);
      return false;
    }

    return true;
  });

  if (scrapes.length === 0) throw new Error("No reddit scrape was successful");

  const results = new Map<
    string,
    { entry: ScraperResult; comments: number[] }
  >();

  let index = 0;
  for (const scrape of scrapes) {
    for (const entry of scrape.value) {
      const prev = results.get(entry.toml.url);
      if (!prev) {
        results.set(entry.toml.url, {
          entry,
          comments: [entry.toml.comment_count],
        });
        continue;
      }

      prev.comments.push(entry.toml.comment_count);
    }

    index += 1;
  }

  return Array.from(results.values(), (entry) => {
    entry.entry.toml.comment_count = Math.floor(
      entry.comments.reduce((a, c) => a + c, 0) / entry.comments.length
    );
    return entry.entry;
  });
}

async function scrape() {
  console.info("Scraping Discussion Sites");
  return (
    await Promise.all([
      scrapeHackerNews().catch((err) => {
        console.warn("Hacker News scraper failed", err);
        return [];
      }),
      scrapeLobsters().catch((err) => {
        console.warn("Lobsters scraper failed", err);
        return [];
      }),
      scrapeReddit().catch((err) => {
        console.warn("Reddit scraper failed", err);
        return [];
      }),
    ])
  ).flat();
}

async function* walk(dir: string): AsyncGenerator<Dirent, void, undefined> {
  for await (const d of await fs.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield d;
  }
}

type BlogPost = {
  slug: string;
  discussionPath: string;
  discussions: DiscussionsToml[];
};

async function loadExistingDiscussionLinks() {
  console.info("Loading Existing Discussions");
  const postsDir = path.resolve(
    import.meta.url.substring(7),
    "../../content/posts"
  );
  const fileResolvePromises: Promise<BlogPost>[] = [];
  for await (const file of walk(postsDir)) {
    if (file.name !== "index.md") continue;
    if (/\/drafts\//.test(file.parentPath)) continue;

    fileResolvePromises.push(
      (async () => {
        const contents = await fs.readFile(
          path.join(file.parentPath, file.name),
          "utf-8"
        );
        // very naive way to fetch frontmatter, can probably fail
        // in all sorts of different ways
        const [, frontmatter] = contents.split("+++\n");
        const { slug } = TOML.parse(frontmatter);

        const discussionPath = path.join(file.parentPath, "discussions.toml");
        let discussions = [];
        try {
          const contents = await fs.readFile(discussionPath, "utf-8");
          const file = TOML.parse(contents) as {
            discussions: RawDiscussionsToml[];
          };
          discussions.push(
            ...file.discussions.map((each) => ({
              ...each,
              timestamp: each.timestamp,
            }))
          );
        } catch {}

        return {
          discussionPath,
          slug: `/posts/${slug}/`,
          discussions,
        };
      })()
    );
  }

  return Object.fromEntries(
    (await Promise.all(fileResolvePromises)).map(
      (each) => [each.slug, each] as const
    )
  );
}

function shouldHide(record: DiscussionsToml) {
  if (+record.timestamp > +new Date() - 48 * 60 * 60 * 1000) return false;
  return record.comment_count <= 1;
}

function roughlyEqual(scoreA: number, scoreB: number): boolean {
  const diff = Math.abs(scoreA - scoreB);
  const epsilon = Math.min(scoreA, scoreB) * 0.05;
  return diff <= epsilon;
}

function mergeRecords(
  scrapedRecords: ScraperResult[],
  existingRecords: Record<string, BlogPost>
) {
  for (const record of scrapedRecords) {
    if (!(record.slug in existingRecords)) {
      console.warn(
        `found online discussion for slug ${record.slug} that does not exist`,
        record
      );
      continue;
    }

    if (record.toml.hidden == null && shouldHide(record.toml))
      record.toml.hidden = true;

    let found = false;
    for (const existing of existingRecords[record.slug].discussions) {
      if (existing.url !== record.toml.url) continue;
      found = true;

      // Reddit adds random fuzz to vote counts, which means that the `comment_count` field
      // isn't stable between runs.  Therefore, we only update the record if an attribute
      // other than the comment_count has changed, or if the comment_count has changed enough
      // to make a difference.
      const changed =
        !roughlyEqual(existing.comment_count, record.toml.comment_count) ||
        existing.hidden !== record.toml.hidden ||
        +existing.timestamp !== +record.toml.timestamp ||
        existing.title !== record.toml.title;
      if (!changed) continue;

      Object.assign(existing, record.toml);
    }
    if (!found) {
      existingRecords[record.slug].discussions.push(record.toml);
    }
    existingRecords[record.slug].discussions.sort(
      (a, b) => +b.timestamp - +a.timestamp
    );
  }

  return existingRecords;
}

async function writeDiscussionLinks(records: Record<string, BlogPost>) {
  await Promise.all(
    Object.values(records).map(async (record) => {
      if (record.discussions.length === 0) return;
      console.debug(
        `Writing ${record.slug} (${record.discussions.length} records)`
      );
      await fs.writeFile(
        record.discussionPath,
        TOML.stringify({ discussions: record.discussions }),
        "utf-8"
      );
    })
  );
}

async function main() {
  console.info("Downloading Comments");
  const [scrapedRecords, existingRecords] = await Promise.all([
    scrape(),
    loadExistingDiscussionLinks(),
  ]);

  console.info("Merging Records");
  const discussionLinks = mergeRecords(scrapedRecords, existingRecords);

  console.info("Writing Discussions to Files");
  await writeDiscussionLinks(discussionLinks);

  console.info("Done");
}

await main();

function normaliseSlug(url: URL) {
  if (url.pathname.endsWith("/")) return url.pathname;
  return url.pathname + "/";
}
