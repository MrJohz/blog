import type { Dirent } from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as TOML from "smol-toml";

const DOMAIN = "jonathan-frere.com";
const STANDARD_HEADERS = {
  "User-Agent":
    "discussion-scraper v0.1 | Reddit: MrJohz | Email: jonathan.frere@gmail.com",
};

type DiscussionsToml = {
  title: string;
  url: string;
  site: string;
  timestamp: Date;
  comment_count: number;
  counted_comments?: number;
  auto_hidden?: boolean;
  hidden_override?: boolean;
  legacy_hidden?: boolean;
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
  counted_comments?: number;
  hidden?: boolean;
  auto_hidden?: boolean;
  hidden_override?: boolean;
};

const RECENT_CUTOFF_MS = 48 * 60 * 60 * 1000;
const INTERESTING_COMMENT_COUNT = 1;
const COUNT_CONCURRENCY = 4;
const BOT_AUTHORS = new Set(["automoderator"]);

export function isBot(author: string | null | undefined) {
  return author != null && BOT_AUTHORS.has(author.toLowerCase());
}

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
  if (typeof data.access_token !== "string") {
    throw new Error(`Reddit returned no access token (${response.status})`);
  }

  console.info("Reddit Authorized");
  return data.access_token as string;
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

async function scrapeReddit(token: string | null): Promise<ScraperResult[]> {
  console.info("Scraping Reddit");

  if (token == null) throw new Error("Reddit is not authorized");

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

async function scrape(token: string | null) {
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
      scrapeReddit(token).catch((err) => {
        console.warn("Reddit scraper failed", err);
        return [];
      }),
    ])
  ).flat();
}

// [An LLM generated the comments in this section.]
//
// The search endpoints used above only report a total comment count, which
// includes the submitter's own replies, AutoModerator boilerplate, and
// downvoted comments.  Each site also has a per-thread endpoint that returns
// the comment list along with the submitter, and the functions below use those
// to work out how many comments are actual discussion.

type DetailRef =
  | { kind: "lobsters"; shortId: string }
  | { kind: "hackernews"; storyId: string }
  | { kind: "reddit"; id: string };

type LobstersStory = {
  submitter_user: string;
  comments: {
    commenting_user: string;
    score: number;
    is_deleted: boolean;
    is_moderated: boolean;
  }[];
};

type HnItem = {
  type: string;
  author: string | null;
  text: string | null;
  children?: HnItem[];
};

type RedditListing = {
  kind: string;
  data: { children: RedditThing[] };
};

type RedditThing = {
  kind: string;
  data: {
    author: string;
    body: string;
    score: number;
    score_hidden?: boolean;
    is_submitter?: boolean;
    distinguished?: string | null;
    replies?: RedditListing | "";
  };
};

export function detailRefFromUrl(url: string): DetailRef | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (parsed.hostname === "lobste.rs" || parsed.hostname.endsWith(".lobste.rs")) {
    const match = /^\/s\/([^/]+)/.exec(parsed.pathname);
    return match ? { kind: "lobsters", shortId: match[1] } : null;
  }

  if (parsed.hostname.endsWith("news.ycombinator.com")) {
    const storyId = parsed.searchParams.get("id");
    return storyId ? { kind: "hackernews", storyId } : null;
  }

  if (parsed.hostname === "reddit.com" || parsed.hostname.endsWith(".reddit.com")) {
    const match = /\/comments\/([^/]+)/.exec(parsed.pathname);
    return match ? { kind: "reddit", id: match[1] } : null;
  }

  return null;
}

export function countLobstersComments(story: LobstersStory) {
  return story.comments.filter(
    (comment) =>
      !comment.is_deleted &&
      !comment.is_moderated &&
      comment.commenting_user !== story.submitter_user &&
      !isBot(comment.commenting_user) &&
      comment.score >= 0
  ).length;
}

// Hacker News does not publish per-comment scores — `points` is null on every
// comment in this endpoint — so the score rule cannot be applied here.  Deleted
// comments come back with a null author and null text.
export function countHnComments(story: HnItem) {
  let count = 0;
  const queue = [...(story.children ?? [])];

  while (queue.length > 0) {
    const item = queue.pop()!;
    queue.push(...(item.children ?? []));

    if (item.type !== "comment") continue;
    if (item.author == null || item.text == null) continue;
    if (item.author === story.author) continue;
    if (isBot(item.author)) continue;

    count += 1;
  }

  return count;
}

// `truncated` reports that Reddit replaced part of the tree with a "load more"
// marker, which means the count is a lower bound.
export function countRedditComments(listing: RedditListing) {
  let count = 0;
  let truncated = false;
  const queue = [...listing.data.children];

  while (queue.length > 0) {
    const thing = queue.pop()!;
    if (thing.kind === "more") {
      truncated = true;
      continue;
    }

    const comment = thing.data;
    if (comment.replies) queue.push(...comment.replies.data.children);

    if (comment.is_submitter) continue;
    if (isBot(comment.author)) continue;
    if (comment.distinguished === "moderator") continue;
    if (comment.body === "[removed]" || comment.body === "[deleted]") continue;
    // A hidden score is an unknown score, not a negative one.
    if (!comment.score_hidden && comment.score < 0) continue;

    count += 1;
  }

  return { count, truncated };
}

async function fetchJson(url: string, headers: Record<string, string>) {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function countComments(
  ref: DetailRef,
  token: string | null
): Promise<number | null> {
  switch (ref.kind) {
    case "lobsters": {
      const story = (await fetchJson(
        `https://lobste.rs/s/${ref.shortId}.json`,
        STANDARD_HEADERS
      )) as LobstersStory;
      return countLobstersComments(story);
    }

    case "hackernews": {
      const story = (await fetchJson(
        `https://hn.algolia.com/api/v1/items/${ref.storyId}`,
        STANDARD_HEADERS
      )) as HnItem;
      return countHnComments(story);
    }

    case "reddit": {
      if (token == null) return null;

      const query = new URLSearchParams({
        limit: "500",
        depth: "15",
        sort: "top",
        raw_json: "1",
      });
      const [, comments] = (await fetchJson(
        `https://oauth.reddit.com/comments/${ref.id}?${query}`,
        { ...STANDARD_HEADERS, Authorization: `bearer ${token}` }
      )) as [RedditListing, RedditListing];

      const { count, truncated } = countRedditComments(comments);
      if (truncated) {
        console.warn(
          `Reddit thread ${ref.id} has more comments than were downloaded`
        );
      }
      return count;
    }
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
) {
  let index = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;
        await fn(item);
      }
    })
  );
}

// Counts are resolved from the stored URL rather than from the scrape results,
// so that threads which have dropped out of the search endpoints still get
// counted.  A thread that cannot be counted keeps whatever count it already had.
async function updateCountedComments(
  records: Record<string, BlogPost>,
  token: string | null
) {
  const discussions = Object.values(records).flatMap((post) => post.discussions);

  await mapWithConcurrency(discussions, COUNT_CONCURRENCY, async (discussion) => {
    const ref = detailRefFromUrl(discussion.url);
    if (ref == null) {
      console.warn(`Cannot count comments for unrecognised url ${discussion.url}`);
      return;
    }

    try {
      const count = await countComments(ref, token);
      if (count != null) discussion.counted_comments = count;
    } catch (err) {
      console.warn(`Could not count comments for ${discussion.url}`, err);
    }
  });

  return records;
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
              title: each.title,
              url: each.url,
              site: each.site,
              timestamp: each.timestamp,
              comment_count: each.comment_count,
              counted_comments: each.counted_comments,
              auto_hidden: each.auto_hidden,
              hidden_override: each.hidden_override,
              legacy_hidden: each.hidden,
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

export function isInteresting(record: DiscussionsToml) {
  // `counted_comments` is missing when the thread has never been counted, either
  // because it predates this field or because every attempt to fetch its comments
  // failed.  Falling back to the site's own count keeps such a thread visible.
  return (
    (record.counted_comments ?? record.comment_count) >= INTERESTING_COMMENT_COUNT
  );
}

export function isRecent(record: DiscussionsToml, now = new Date()) {
  return +record.timestamp > +now - RECENT_CUTOFF_MS;
}

// This describes the rule that applied before `auto_hidden` existed, so that a
// hand-written `hidden` that disagreed with it can be preserved as an override.
// It must keep using the site's own count and the old threshold.
function wasAutoHiddenUnderLegacyRule(record: DiscussionsToml, now = new Date()) {
  return !isRecent(record, now) && record.comment_count <= 1;
}

export function visibleDiscussionUrls(
  discussions: DiscussionsToml[],
  now = new Date()
) {
  const visible = new Set<string>();
  const recentBySite = new Map<string, DiscussionsToml[]>();

  for (const discussion of discussions) {
    if (!isRecent(discussion, now)) {
      if (isInteresting(discussion)) visible.add(discussion.url);
      continue;
    }

    const siteDiscussions = recentBySite.get(discussion.site);
    if (siteDiscussions) {
      siteDiscussions.push(discussion);
    } else {
      recentBySite.set(discussion.site, [discussion]);
    }
  }

  for (const siteDiscussions of recentBySite.values()) {
    siteDiscussions.sort((a, b) => +b.timestamp - +a.timestamp);

    if (siteDiscussions.length === 1) {
      visible.add(siteDiscussions[0].url);
      continue;
    }

    const interestingDiscussions = siteDiscussions.filter(isInteresting);
    if (interestingDiscussions.length > 0) {
      for (const discussion of interestingDiscussions) {
        visible.add(discussion.url);
      }
      continue;
    }

    visible.add(siteDiscussions[0].url);
  }

  return visible;
}

export function updateVisibility(records: Record<string, BlogPost>) {
  const now = new Date();

  for (const post of Object.values(records)) {
    for (const discussion of post.discussions) {
      const previousAutoHidden =
        discussion.auto_hidden ?? wasAutoHiddenUnderLegacyRule(discussion, now);

      if (
        discussion.hidden_override == null &&
        discussion.legacy_hidden != null &&
        discussion.legacy_hidden !== previousAutoHidden
      ) {
        discussion.hidden_override = discussion.legacy_hidden;
      }
    }

    const visibleUrls = visibleDiscussionUrls(post.discussions, now);

    for (const discussion of post.discussions) {
      discussion.auto_hidden = !visibleUrls.has(discussion.url);
      discussion.legacy_hidden = undefined;
    }
  }

  return records;
}
export function roughlyEqual(scoreA: number, scoreB: number): boolean {
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
        +existing.timestamp !== +record.toml.timestamp ||
        existing.title !== record.toml.title ||
        existing.site !== record.toml.site;
      if (!changed) continue;

      existing.title = record.toml.title;
      existing.url = record.toml.url;
      existing.site = record.toml.site;
      existing.timestamp = record.toml.timestamp;
      existing.comment_count = record.toml.comment_count;
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

function serialiseDiscussion(discussion: DiscussionsToml) {
  return {
    title: discussion.title,
    url: discussion.url,
    site: discussion.site,
    timestamp: discussion.timestamp,
    comment_count: discussion.comment_count,
    ...(discussion.counted_comments != null
      ? { counted_comments: discussion.counted_comments }
      : {}),
    ...(discussion.auto_hidden ? { auto_hidden: true } : {}),
    ...(discussion.hidden_override != null
      ? { hidden_override: discussion.hidden_override }
      : {}),
  };
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
        TOML.stringify({
          discussions: record.discussions.map(serialiseDiscussion),
        }),
        "utf-8"
      );
    })
  );
}

async function main() {
  console.info("Downloading Comments");
  const token = await authReddit().catch((err) => {
    console.warn("Reddit authorization failed", err);
    return null;
  });

  const [scrapedRecords, existingRecords] = await Promise.all([
    scrape(token),
    loadExistingDiscussionLinks(),
  ]);

  console.info("Merging Records");
  const discussionLinks = mergeRecords(scrapedRecords, existingRecords);

  console.info("Counting Comments");
  await updateCountedComments(discussionLinks, token);

  console.info("Updating Visibility");
  updateVisibility(discussionLinks);

  console.info("Writing Discussions to Files");
  await writeDiscussionLinks(discussionLinks);

  console.info("Done");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

export function normaliseSlug(url: URL) {
  if (url.pathname.endsWith("/")) return url.pathname;
  return url.pathname + "/";
}
