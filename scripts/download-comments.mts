import * as fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import * as path from "node:path";
import * as TOML from "smol-toml";

const DOMAIN = "jonathan-frere.com";
const STANDARD_HEADERS = {
  "User-Agent":
    "jonathan-frere.com | scraping discussions | jonathan.frere@gmail.com",
};

type DiscussionsToml = {
  title: string;
  hidden?: boolean;
  url: string;
  site: string;
  timestamp: Date;
  comment_count: number;
  score: number;
};

type ScraperResult = { slug: string; toml: DiscussionsToml };

type LobstersResponse = {
  url: string;
  title: string;
  created_at: string;
  score: number;
  comment_count: number;
  comments_url: string;
};

type HnResponse = {
  num_comments: number;
  created_at: string;
  title: string;
  story_id: number;
  points: number;
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
    score: number;
  };
};

type RawDiscussionsToml = {
  title: string;
  url: string;
  site: string;
  timestamp: TOML.TomlDate;
  comment_count: number;
  score: number;
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

  return responses.map((each) => {
    const url = new URL(each.url);
    return {
      slug: url.pathname,
      toml: {
        title: each.title,
        url: `https://news.ycombinator.com/item?id=${each.story_id}`,
        site: "Hacker News",
        timestamp: new Date(each.created_at),
        comment_count: each.num_comments,
        score: each.points,
      },
    };
  });
}

async function scrapeReddit(): Promise<ScraperResult[]> {
  console.info("Scraping Reddit");
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
      `https://www.reddit.com/search.json?${query}`,
      { headers: STANDARD_HEADERS }
    );
    const data = await response.json();
    responses.push(...data.data.children);

    if (data.after == null) break;
  }

  return responses.map((each) => {
    const url = new URL(each.data.url);
    return {
      slug: url.pathname,
      toml: {
        title: each.data.title,
        url: `https://www.reddit.com${each.data.permalink}`,
        site: `Reddit (/r/${each.data.subreddit})`,
        timestamp: new Date(each.data.created_utc * 1000),
        comment_count: each.data.num_comments,
        score: each.data.score,
      },
    };
  });
}

async function scrape() {
  console.info("Scraping Discussion Sites");
  return (
    await Promise.all([scrapeHackerNews(), scrapeLobsters(), scrapeReddit()])
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
    if (/\/drafts\//.test(file.path)) continue;

    fileResolvePromises.push(
      (async () => {
        const contents = await fs.readFile(file.path, "utf-8");
        // very naive way to fetch frontmatter, can probably fail
        // in all sorts of different ways
        const [, frontmatter] = contents.split("+++\n");
        const { slug } = TOML.parse(frontmatter);

        const discussionsPath = path.join(file.path, "../discussions.toml");
        let discussions = [];
        try {
          const contents = await fs.readFile(discussionsPath, "utf-8");
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
          discussionPath: path.join(file.path, "../discussions.toml"),
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
  return record.score < 2 || record.comment_count < 2;
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

    if (shouldHide(record.toml)) record.toml.hidden = true;

    let found = false;
    for (const existing of existingRecords[record.slug].discussions) {
      if (existing.url !== record.toml.url) continue;
      found = true;
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
