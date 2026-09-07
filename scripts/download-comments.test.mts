// [An LLM generated this file.]

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";

import {
  countHnComments,
  countLobstersComments,
  countRedditComments,
  detailRefFromUrl,
  isBot,
  isInteresting,
} from "./download-comments.mts";

function lobstersComment(overrides = {}) {
  return {
    commenting_user: "someone",
    score: 1,
    is_deleted: false,
    is_moderated: false,
    ...overrides,
  };
}

function redditComment(overrides = {}) {
  return {
    kind: "t1",
    data: {
      author: "someone",
      body: "a comment",
      score: 1,
      is_submitter: false,
      distinguished: null,
      ...overrides,
    },
  };
}

function discussion(overrides = {}) {
  return {
    title: "A Post",
    url: "https://lobste.rs/s/abcdef/a_post",
    site: "Lobsters",
    timestamp: new Date("2026-01-01T00:00:00Z"),
    comment_count: 0,
    ...overrides,
  };
}

describe("detailRefFromUrl", () => {
  it("reads a Lobsters short id", () => {
    assert.deepEqual(
      detailRefFromUrl("https://lobste.rs/s/2zk3oe/pushing_pulling_three_reactivity"),
      { kind: "lobsters", shortId: "2zk3oe" }
    );
  });

  it("reads a Hacker News story id", () => {
    assert.deepEqual(
      detailRefFromUrl("https://news.ycombinator.com/item?id=43194600"),
      { kind: "hackernews", storyId: "43194600" }
    );
  });

  it("reads a Reddit submission id", () => {
    assert.deepEqual(
      detailRefFromUrl(
        "https://www.reddit.com/r/programming/comments/1v5qsjv/pushing_and_pulling/"
      ),
      { kind: "reddit", id: "1v5qsjv" }
    );
  });

  it("returns null for urls it does not recognise", () => {
    assert.equal(detailRefFromUrl("https://example.com/thread/1"), null);
    assert.equal(detailRefFromUrl("https://news.ycombinator.com/newest"), null);
    assert.equal(detailRefFromUrl("https://lobste.rs/"), null);
    assert.equal(detailRefFromUrl("not a url"), null);
  });
});

describe("isBot", () => {
  it("matches AutoModerator whatever its case", () => {
    assert.equal(isBot("AutoModerator"), true);
    assert.equal(isBot("automoderator"), true);
  });

  it("does not match other users, or a missing user", () => {
    assert.equal(isBot("MrJohz"), false);
    assert.equal(isBot(null), false);
    assert.equal(isBot(undefined), false);
  });
});

describe("countLobstersComments", () => {
  it("counts comments from other users", () => {
    const count = countLobstersComments({
      submitter_user: "Johz",
      comments: [
        lobstersComment({ commenting_user: "dpc_pw" }),
        lobstersComment({ commenting_user: "sunshowers" }),
      ],
    });

    assert.equal(count, 2);
  });

  it("ignores the submitter, bots, negative scores, and removed comments", () => {
    const count = countLobstersComments({
      submitter_user: "Johz",
      comments: [
        lobstersComment({ commenting_user: "Johz" }),
        lobstersComment({ commenting_user: "AutoModerator" }),
        lobstersComment({ commenting_user: "grump", score: -1 }),
        lobstersComment({ commenting_user: "ghost", is_deleted: true }),
        lobstersComment({ commenting_user: "spammer", is_moderated: true }),
        lobstersComment({ commenting_user: "sunshowers" }),
      ],
    });

    assert.equal(count, 1);
  });

  it("counts a comment scored exactly zero", () => {
    const count = countLobstersComments({
      submitter_user: "Johz",
      comments: [lobstersComment({ commenting_user: "quiet", score: 0 })],
    });

    assert.equal(count, 1);
  });
});

describe("countHnComments", () => {
  it("counts replies at every depth", () => {
    const count = countHnComments({
      type: "story",
      author: "todsacerdoti",
      text: null,
      children: [
        {
          type: "comment",
          author: "ludsan",
          text: "top level",
          children: [
            { type: "comment", author: "MrJohz", text: "a reply", children: [] },
          ],
        },
      ],
    });

    assert.equal(count, 2);
  });

  it("ignores the submitter, bots, and deleted comments", () => {
    const count = countHnComments({
      type: "story",
      author: "todsacerdoti",
      text: null,
      children: [
        { type: "comment", author: "todsacerdoti", text: "submitter here" },
        { type: "comment", author: "AutoModerator", text: "boilerplate" },
        { type: "comment", author: null, text: null },
        { type: "comment", author: "ludsan", text: "a real one" },
      ],
    });

    assert.equal(count, 1);
  });

  it("counts nothing when there are no children", () => {
    assert.equal(
      countHnComments({ type: "story", author: "someone", text: null }),
      0
    );
  });
});

describe("countRedditComments", () => {
  it("counts replies at every depth", () => {
    const { count, truncated } = countRedditComments({
      kind: "Listing",
      data: {
        children: [
          redditComment({
            replies: {
              kind: "Listing",
              data: { children: [redditComment({ author: "other" })] },
            },
          }),
        ],
      },
    });

    assert.equal(count, 2);
    assert.equal(truncated, false);
  });

  it("ignores the submitter, AutoModerator, and moderator posts", () => {
    const { count } = countRedditComments({
      kind: "Listing",
      data: {
        children: [
          redditComment({ is_submitter: true }),
          redditComment({ author: "AutoModerator" }),
          redditComment({ author: "a_mod", distinguished: "moderator" }),
          redditComment({ author: "reader" }),
        ],
      },
    });

    assert.equal(count, 1);
  });

  it("ignores downvoted and removed comments", () => {
    const { count } = countRedditComments({
      kind: "Listing",
      data: {
        children: [
          redditComment({ author: "grump", score: -1 }),
          redditComment({ author: "gone", body: "[removed]" }),
          redditComment({ author: "also_gone", body: "[deleted]" }),
          redditComment({ author: "reader" }),
        ],
      },
    });

    assert.equal(count, 1);
  });

  it("counts a comment whose score is still hidden", () => {
    const { count } = countRedditComments({
      kind: "Listing",
      data: {
        children: [
          redditComment({ author: "fresh", score: 0, score_hidden: true }),
        ],
      },
    });

    assert.equal(count, 1);
  });

  it("reports a truncated thread", () => {
    const { count, truncated } = countRedditComments({
      kind: "Listing",
      data: {
        children: [
          redditComment({ author: "reader" }),
          { kind: "more", data: { author: "", body: "", score: 0 } },
        ],
      },
    });

    assert.equal(count, 1);
    assert.equal(truncated, true);
  });
});

describe("isInteresting", () => {
  it("uses the filtered count when there is one", () => {
    assert.equal(
      isInteresting(discussion({ comment_count: 9, counted_comments: 0 })),
      false
    );
    assert.equal(
      isInteresting(discussion({ comment_count: 0, counted_comments: 1 })),
      true
    );
  });

  it("falls back to the site's own count when the thread was never counted", () => {
    assert.equal(isInteresting(discussion({ comment_count: 0 })), false);
    assert.equal(isInteresting(discussion({ comment_count: 1 })), true);
  });
});
