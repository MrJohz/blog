+++
title = "Anatomy of a Test"
date = 2026-09-04
tags = ["programming", "testing"]
slug = "anatomy-of-a-test"
[params.cover]
name = "Insects with Creeping Thistle and Borage"
artist = "Jan van Kessel the Elder"
date = "1654"
institution = "The National Gallery"
institution-url = "https://www.nationalgallery.org.uk/"
+++

Sometimes when talking about testing, I think we have a tendency to resort to broad ideas and jargon without sufficiently explaining what these things might look like in practice.  Or worse, we do provide examples, but these are toy examples that look nothing like our real life code, and thus give weird impressions of what tests should actually look like.

To try and counteract this a bit, let's look at a test case that I wrote recently, and I'll try and break it down and explain why I wrote it the way I did.  This is a fairly arbitrary test from a side project I've been playing around with recently, so I'm not expecting it to hold up perfectly here, but hopefully it'll be interesting enough to talk about.

This is a test for the file `src/bookmarker/store.gleam`.  Some context: the project is a bookmark app written in Gleam, where I can send a link to the app and it'll asynchronously scrape the details of the link, automatically tag it, index the content for later full text search, archive it, etc.  That scraping process is called a "job", and this test is checking that calling `store.start_job(conn, job)` will mark that job as having been started, and remove it from the pending jobs list.

```gleam
// filename: test/bookmarker/store_test.gleam
pub fn start_job_marks_running_test() {
  use conn, Deps(clock:, ..) <- with_test_conn()

  mock_clock.set(clock, ts("2026-01-05T00:05:10Z"))
  let assert Ok(bookmark) = store.add_bookmark(conn, "http://example.com")
  let assert Ok(job) = store.schedule_job(conn, bookmark)

  let started_at = ts("2026-01-05T00:06:00Z")
  mock_clock.set(clock, started_at)

  let assert Ok(option.Some(started)) = store.start_job(conn, job)

  started.id |> should.equal(job.id)
  started.bookmark |> should.equal(bookmark.id)
  started.created_at |> should.equal(job.created_at)
  started.status |> should.equal(store.Running(started_at:))

  // Started jobs are no longer pending.
  store.list_pending_jobs(conn) |> should.equal(Ok([]))
}
```

Some notes if you're unfamiliar with Gleam:

* `use` is a very cool construct, but here it's essentially the same as Python's `with`, `using` in C# or JavaScript, or just wrapping the rest of the test in a callback and performing some setup and cleanup code around the outside of the callback.
* Gleam has a pipe operator, so `started.id |> should.equal(job.id)` means `should.equal(started.id, job.id)`, but written in a more fluent style.
* `let assert` is unwrapping assignment, used in similar contexts to Rust's `.unwrap`, or just letting an error get thrown in other languages.

## Names and Places

```gleam
// filename: test/bookmarker/store_test.gleam
pub fn start_job_marks_running_test() {
  // ...
```

Personally, I like to put my tests alongside the file that's being tested[^rust-test-file].  Unfortunately, that's not possible in Gleam, so I'm using the convention of having the same path/folder structure in the `test/` directory as in `src/`.  Either way, I find my file structure generally matches the structure of my tests, in that each file usually exports one thing that is worth testing, and therefore gets its own test file[^component-tests].

[^rust-test-file]: Fun fact: while it's not idiomatic (typically tests live in the same file as the code), it's possible to do this in Rust by naming the test file something like `store.test.rs`, and using it like `#[path = "store.test.rs"] mod tests;`.  IIRC, there are a couple of quirks with how star imports are handled, but otherwise it works just fine.

[^component-tests]: Counterexample: testing components in frontend frameworks like React or Vue or whatever is a lot harder to do well, in my experience.  Often the test ends up way too bound to specific features of the source code that aren't that relevant, so that every change to the source means changing the test as well.  Mostly I deal with this by trying to move as much logic out of the components and into reusable hooks or stores or whatever that can be more easily tested, and just not testing the components themselves (or letting them get passively tested at the e2e level).

The test name here is also an artefact of how Gleam's standard testing library works.  I strongly prefer writing test names as strings, because it's a lot easier to read, especially when the detail of the test becomes long.  In JavaScript, for example, I'd rather write `it("marks a job as running")` or `test("start_job marks a job as running")`[^tdd-and-bdd] — look how this already deals with minor ambiguities in the Gleam test name, where underscore is used both in the name `start_job`, but also as a space character.  I love how Kotlin even has a special syntax for functions that allows the function name to be arbitrary text, which can be used for writing clearer test names.

[^tdd-and-bdd]: I know some people attach a great deal of worth to the convention of `it` vs `test`, but I use both fairly interchangeably, and often I just use `it` as a shorter way of writing `test`, without bothering to make it grammatically correct.  In fact, mostly I use BDD-style `describe` blocks to mark a suite of tests, and then TDD-style `test` blocks for the actual test, and I have no idea why, it's just muscle memory at this point.

That said, I'm personally not that great at writing test names.  Sometimes I find it's easier to write the test first, then go back and name it.  The most important thing is that the test name should indicate what my *goal* is with the test — the test code itself might change over time, but the test name should be fairly constant because it's describing that higher-level idea that is independent of the code's internals.

## The Test Constructor

```gleam
  use conn, Deps(clock:, ..) <- with_test_conn()

// ... elsewhere (usually at the top of the test file)

type Deps {
  Deps(db: sqlight.Connection, clock: mock_clock.Clock)
}

fn with_test_conn(f: fn(StoreConn, Deps) -> a) -> a {
  use db <- db.with_connection(":memory:")
  let assert Ok(schema) = simplifile.read("db/schema.sql")
  let assert Ok(Nil) = sqlight.exec(schema, on: db)

  let clock = mock_clock.new(timestamp.from_unix_seconds(0))
  f(store.new(db, mock_clock.now(clock)), Deps(db:, clock:))
}
```

This is a convention of mine that I think was inspired by a passing comment in one of Matklad's articles about testing, but don't quote me on that.  The idea is roughly this: when we use a given function, class, etc in our code, we might use it in a few different ways, so the signature of that function or whatever needs to be flexible enough to handle that.  But when we use the same function in our tests, we're probably going to do exactly the same thing every time.  So let's wrap it in a test-only wrapper that saves us from writing the same boilerplate in every test.

In this case, that boilerplate involves creating a couple of dependencies (an SQLite connection that also needs to be initialised with the correct schema; and a mock clock so that we can control timestamps) as well as some implicit teardown logic (cleaning up the DB connection, handled by Gleam's magical `use` statement).

The test constructor also returns the dependencies that are created.  Generally, I don't like tests that manipulate the underlying mocks or dependencies, because they tend to be a lot more brittle, but sometimes it can't be helped (for example here where I want to be precise about the emitted timestamps).

Often I see a similar convention that relies heavily on `beforeEach` or `setUp`, and global or class-local variables.  It might look something like this:

```javascript
describe('client', () => {
  let dependency = {
    get: jest.fn(),
  };
  let client;

  beforeEach(() => {
    dependency.get.mockReset()
    client = new Client(dependency);
  });

  // ... tests go here, use `client` and manipulate `dependency.get`
  // ... as needed
});
```

This works, but it's just more complicated — there's more moving parts, and those parts end up spread around a file instead of grouped together in a single function and its usages.  If someone gave you a PR to review with that amount of global manipulation going on in non-test code, you'd probably have some concerns, but I see stuff like that all the time in test code.  The example above is literally adapted from one of the top search results on Kagi for `jest beforeEach setup mocks`.

Note also the use of a real database here.  Generally, I'd much rather be working with real dependencies, or things as close to real dependencies as possible.  Consider code that needs to handle duplicate entries in a particular way, and uses a unique index on a given table to do so.  I could mock all the DB interactions, and throw mocked constraint errors and check that the code handles it correctly, but at this point my tests have become a complete fiction, with potentially no relationship to what the database will actually do.  Instead, I want to be able to assert qualities of the system as a whole (i.e. the combined unit of code+db), because that's what's actually going to be running in the end[^unit-vs-integration].  Getting this set up — in particular while keeping the test suite fast — can be difficult, but it's usually worth the effort.  Although here I'm using SQLite as the production DB, so I get an in-memory version for tests for free.

[^unit-vs-integration]: There's often some discussion about the differences between unit tests and integration tests, but I don't really see the value in making a distinction.  Regardless of whether the underlying test subject required a DB connection, I'd have written everything else identically, so from the perspective of someone writing the test it doesn't make any difference.  And my expectation that tests run fast — fast enough to run on every save — is the same whether or not there are external resources involved.  So why distinguish the two kinds of test?

## Arrange

```gleam
  mock_clock.set(clock, ts("2026-01-05T00:05:10Z"))
  let assert Ok(bookmark) = store.add_bookmark(conn, "http://example.com")
  let assert Ok(job) = store.schedule_job(conn, bookmark)

  let started_at = ts("2026-01-05T00:06:00Z")
  mock_clock.set(clock, started_at)
```

I don't religiously follow the "arrange, act, assert" model of testing, but I find it a good rule of thumb, and most of my tests seem to fall naturally into that pattern.  The lines of code above are the "arrange" part[^assert-in-arrange].

[^assert-in-arrange]: You might notice that this code is surprisingly `assert`-y for something that's meant to just be setting things up and not asserting anything by itself.  That's a Gleam idiom, the `let assert Ok(var) = xyz` is roughly equivalent to `let var = xyz.unwrap()` in Rust, or just ignoring exceptions in languages that have that.  All I'm trying to say here is "for the purposes of this test, assume `add_bookmark` will always succeed".

Two things to note.  The first is `mock_clock`.  As far as I can tell, Gleam doesn't have a built-in way of mocking the global clock, so we do it by hand here: `clock` is a Gleam object that contains a mutable field[^atomics] that we can manipulate, and `mock_clock.now(clock)` returns a function that behaves identically to the standard `system_time()` except that it returns the value of that mutable field instead of the global time.  This way, we can control exactly what time our application thinks it is.

[^atomics]: Specifically, it's using Erlang's `atomics` mechanism — normally, there'd be no mutable values in Gleam.

There are ways to get around mocking time in tests, like saving the time at the start of the test and then hoping that the test runs quickly enough, or using approximate comparisons, or just not asserting on timestamps at all.  In my experience, it's usually easier to bite the bullet and just make sure you can set the time to arbitrary values during your tests.  Partly that's to avoid flakiness, but it's also because time is usually complicated enough that you want to make sure that all the edge cases are covered — what happens during time zone changes, or how the system handles leap days/seconds/etc.

The second thing is that we're doing the arranging, where possible, using the public functions exported by the module we're testing.  In theory, we could directly insert data into the database, because our `with_test_conn` function returned a raw SQLite connection.  But I will only do that as a last resort, and usually only if I want to test something that the API of the module is deliberately trying to avoid happening (e.g. corrupted data).

The reason is twofold: firstly, it's usually a lot easier to read `store.add_bookmark(...)` than `db.execute("INSERT ...")`.  A test that reads like a clear list of high-level instructions is going to be a lot more useful later for the future developer trying to reconstruct why this particular test exists, and why it's saying their code is broken.

Secondly, and more subtly, the public API of a module should be significantly less likely to change than the internals of that module.

This is a really important point, because it's the key to understanding where to write tests.  Indeed, it's the key to drawing good module boundaries in general[^boundaries-and-tests].  When you test something, you're essentially creating a public API — you're defining an interface that both the rest of the codebase *and* your tests will interact with.  And the purpose of a good interface is abstraction — it allows you to interact with a unit of code without understanding the details underneath of how that code works[^leaky-abstractions].

[^boundaries-and-tests]: Module boundaries and tests are linked in a really deep way that I find very easy to understand intuitively, but very difficult to put into clear words.  I have started at least half a dozen blog posts trying to describe this relationship and none of them have been quite right.

[^leaky-abstractions]: Note that all abstractions are leaky, but that doesn't mean that they're not still useful.  You will probably have to understand the details underlying any public API eventually, but a bad API means you'll need to understand those details every time you use that API.

Therefore, if you have a bunch of tests that bypass the abstraction layer — that interact directly with the underlying database, or call private methods all over the place, or whatever else — then you negate the value of the interface.  Now it is much more likely that a minor change to the code will require rewriting a bunch of tests, even if the overall API still works the same as before and the tests are still trying to assert the same thing.

And the corollary to this is that if it's hard to write tests without bypassing the abstraction layer, then these tests are probably in the wrong place.  That is, you should find a higher level of abstraction around which to hang your tests, or test something more specific at a deeper level[^ui-tests].

[^ui-tests]: Generally, my experience is that it's easier to look for the higher level of abstraction, because that API boundary is less likely to change.  That said, as I mentioned in another footnote (somebody is reading all of these, right?), I find I'd rather go in the opposite direction for UI/component code, and instead test the underlying logic directly, rather than the arguably higher-level version designed for the user.

## Acting and Asserting

```gleam
  let assert Ok(option.Some(started)) = store.start_job(conn, job)

  started.id |> should.equal(job.id)
  started.bookmark |> should.equal(bookmark.id)
  started.created_at |> should.equal(job.created_at)
  started.status |> should.equal(store.Running(started_at:))

  // Started jobs are no longer pending.
  store.list_pending_jobs(conn) |> should.equal(Ok([]))
}
```

I don't have much to say about the `start_job` call itself.  Looking at this test in retrospect, maybe it would be helpful to make the "act" part of the test a bit clearer, just because that's often where I want to look first to understand what a test is trying to achieve.  But otherwise, this seems pretty normal to me.

I'm less happy about the assertions.  I'm testing a bunch of different attributes of the job instead of testing the job as a whole.  I probably did it like this as a convenience, or because there was some attribute that made it difficult to construct a model job to assert against, but if I were to rewrite this test now, it would probably look more like:

```gleam
  started |> should.equal(store.Job(
    ..job,
    status: store.Running(started_at:)
  ))
```

This does essentially the same thing — asserts that all the attributes of `started` are what I expect — but now we're more explicit about what the expectation is.  In this case, I want all the values to be the same as the original `job`, just with a new status.  It's also more future-proof — if I add a new attribute in the future, then either that attribute should stay the same when `start_job` gets called (in which case this test already works, no modifications needed), or it changes (in which case the test will fail, and I'll need to update it to explicitly mention the new field that gets changed by `start_job`).  Either way, the test is correctly asserting a true fact about the API that I want for this job-starting system.

Another approach would be snapshot testing (see e.g. [Ian Henry's post on snapshot testing](https://ianthehenry.com/posts/my-kind-of-repl/)).  I like snapshot testing when the tooling is there for it, because it makes it a lot easier to write simple tests like these.  But the disadvantage is that it can sometimes be less clear what the exact purpose of an assertion is.  In our test here, for example, the generated snapshot would contain all the attributes of `started`, and if they ever changed I could look to see what attribute had changed and decide whether that was correct or not.  But because we're testing all the attributes, we run into the same problem we just had, where it's harder to tell which attributes we're actually interested in here.

The final line in this test comes back to what I was talking about before about avoiding internals when writing tests.  During the "arrange" phase, there can occasionally be reason to break this rule, but in the "assert" phase, I keep to it much more rigidly.  So here, we don't check in the database that the value has been updated, instead we make a second call, and one that explicitly gives us the answer we're looking for (i.e. that the job has disappeared from the list of pending jobs).

## Final Thoughts

I've written before about [the purposes tests serve]({{< ref "/posts/0006-why-test" >}}), specifically the twin aspects of both aiding the initial development process, as well as defining the current behaviour to make future refactoring possible.

In this case, I think we see both of these aspects in the test.  On the one hand, I probably wrote this test immediately before or after I implemented the `start_job` function, and it would have immediately let me know whether the function was doing what I expected it to do.  The alternative would have been hooking `start_job` to some sort of API or writing a CLI entrypoint that I could have played around with manually — it would have worked, but it would have been slower.

On the other hand, this test also defines a couple of statements about the `start_job` function that should remain true even if the implementation of the function changes: the function returns a new object with an updated status field, and future calls to fetch the list of pending jobs should no longer return this specific job.  If we were to e.g. change the underlying queue mechanism, this API should still stay the same.

This single test doesn't encapsulate all that we need to know about how `start_job` works — for example, it doesn't cover cases where there are multiple jobs, where we check that `start_job` only affects the job we're interested in; and we've not tested what happens when `start_job` is called on a job that has been deleted, or already started, or even already finished.  There are other tests that will define these constraints on the function.

I don't necessarily believe this is the only way to test a function like this (feel free to let me know how you'd have written this test!) but I think it's important to see examples of what real-world testing actually looks like, so that when we discuss testing, we can talk about concrete things instead of purely abstract ideas. 
