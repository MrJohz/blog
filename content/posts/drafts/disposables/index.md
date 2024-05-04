+++
title = "Disposables in Javascript"
date = 2024-04-30
tags = ["tips", "javascript", "programming"]
slug = "disposables-in-javascript"
draft = true
[params.cover]
name = "Waldlandschaft mit Sonnenaufgang"
artist = " Joseph Rebell"
date = "1809"
institution = "Belvedere, Vienna"
institution-url = "https://www.belvedere.at/"
+++

Javascript’s new "Explicit Resource Management" proposal adds the `using` statement, a way to automatically close resources after you’ve finished using with it. But as part of the same proposal, a bunch of additional stuff has been added that’s also useful, both in its own right, and when combined with `using`. I couldn’t find a lot of useful documentation out there when I was trying to get it working, so here's a bit of an overview of getting started with `using`, `Disposable`s, and explicit resource management.

## The Journey to Using `using`

A lot of classes or objects represent some sort of resource, e.g. an open file or a database connection, that requires some cleanup logic to occur when that object is no longer in use. In NodeJS, the convention is typically to put this cleanup logic in a `close()` function. For example, the `Server` class in `node:http` has a `close()` method that stops new connections and closes any existing connections.

The problem with `close` alone is that it’s easy not to call it. Sometimes that’s just forgetting, but often exceptions can trip us up. Consider this function:

```tsx
async function saveMessageInDatabase(message: string) {
	const conn = new DatabaseConnection();
	const { sender, recipient, content } = parseMessage();
	await conn.insert({ sender, recipient, content };
	await conn.close();
}
```

This creates a database connection at the start of the function, and closes it at the end. But we have an issue is `parseMessage` or `conn.insert(...)` throws an error — in this situation, we will leave `saveMessageInDatabase` without closing the connection, leaving unclosed resources hanging around.

The new `using` syntax solves this, but to do so, we first need to formalise this `close()` method a bit. We can do that using the `Disposable` interface:

```tsx
interface Disposable {
  [Symbol.dispose]: () => void;
}
```

This is very similar to the `close` method, but we use the [well-known symbol](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#well-known_symbols) `Symbol.dispose` instead of `close` or another arbitrary string method name. This helps the runtime differentiate between objects that have purposefully been made disposable (that use the correct symbol), and objects that just happen to have a particular name (e.g. `door.close()`). This is an increasingly common pattern in modern Javascript.

With this in place, we can define the `using` syntax. `using` can be used in mostly the same way that `const` is used, and behaves very similar in most respects.

```tsx
// was: const varName = new MyDisposableObject();
// now:
using varName = new MyDisposableObject();
varName.method();
```

However, `using` has a couple of restrictions on top of the normal behaviour of `const`:

- When using `using`, the variable _must_ implement the `Disposable` interface — i.e. it must have a `Symbol.dispose` method that can be called with no arguments.
- When using `using`, you cannot destructure the variable you’re interested in (e.g. `using { field1, field2 } = disposable()`).

When we leave the scope where a `using` variable was defined (i.e. when we return from the function where `using` was used, or leave the if-block, or an exception gets thrown, etc), then the `Symbol.dispose` method will be called.

In addition, the dispose methods will be called in the reverse order to the way they were defined. So the object that was created first will only be cleaned up right at the very end. This is important for the purposes of data ordering. We don’t want the database to be cleaned up before we clean up the object using that database!

As an example:

```tsx
function create(data: string) {
	console.log(`creating disposable object with data ${data}`);
	return {
		data: data,
		[Symbol.dispose]() {
			console.log(`disposing disposable object with data ${data}`);
		},
	}
}

function main() {
  using data1 = create("first");
  using data2 = create("second");

  console.log(`using ${data1.data} and ${data2.data}`);
}

console.log("before main");
main();
console.log("after main");
```

This will produce the following logs:

```
before main
creating disposable object with data first
creating disposable object with data second
using first and second
disposing disposable object with data second
disposing disposable object with data first
after main
```

## Async Disposables

In practice, most of the times when we want to dispose of a resource in Javascript, we’re going to want to do so asynchronously — that’s the big advantage of Javascript’s runtime after all!

So in addition to the standard `Disposable` interface, there’s a second one, `AsyncDisposable`. This uses the `Symbol.asyncDispose` method, which returns a promise that should resolve when the resource is completely closed.

To use an async disposable, we have the `await using` syntax, which does the same thing as a normal `using` declaration, but, well, asynchronously. It must be called inside an `async` function (i.e. it needs to be called in a place where normal `await` is allowed).

The `await using` syntax can also handle non-async `Disposable` objects, which means if you don’t know whether a given resource is going to be asynchronously or synchronously disposed, you can use `await using` and cover both options.

|                |                                  |                          |
| -------------: | :------------------------------- | :----------------------- |
|    **Syntax:** | `await using`                    | `using`                  |
|   **Context:** | async functions only             | async and sync functions |
| **Interface:** | `AsyncDisposable` + `Disposable` | only `Disposable`        |

## Collections of Disposables

Going back to the `UserService` example, we find that we can use the `Symbol.asyncDispose` method to close the service. But the `using`/`await using` syntax is less useful here. This is because `using` ties the lifetime of a resource to the lifetime of a function — when the function exits, the resource will be closed. But with our `UserService`, we’re using a couple of resources, and we want to tie their lifetimes to that of the service as a whole — we want to close those resources when we close the service itself.

One convenient way of doing this is using the `DisposableStack` and `AsyncDisposableStack` classes. These are essentially bundles (specifically stacks) of resources — we can add a resource to the stack, and its lifetime will end up managed by the stack. The stack itself implements the `Disposable` (or `AsyncDisposable`) interface, and when the stack gets cleaned up, it will automatically go through the resources it contains and clean them up (in reverse order, just like a stack, and just like the regular `using` syntax).

For example, with a class, we could use the stack as follows:

```tsx
class UserService {
  #stack = new AsyncDisposableStack();
  #db: DB.Conn;
  #http: HTTP.Session;

  constructor() {
    // .use() takes a resource, adds it to the resources managed by the stack,
    // and returns the resource so it can be used elsewhere.
    this.#db = this.#stack.use(new DB.Conn());

    const handle = setInterval(() => console.log("running"), 5000);
    // .defer() takes a callback and adds it to the stack's resources. The
    // callback will be called when the stack gets disposed.
    this.#stack.defer(() => clearInterval(handle));

    // .adopt() takes a resource that doesn't necessarily implement `Disposable`,
    // and a callback that will be called when the stack gets disposed. This is
    // useful for resources that don't yet implement the new interfaces.
    this.#http = this.#stack.adopt(
      new HTTP.Session(),
      async (session) => await session.close()
    );
  }

  async [Symbol.asyncDispose]() {
    await #stack.disposeAsync();
    // or await #stack[Symbol.asyncDispose]();

    // continue with any further necessary dispose actions here
  }
}
```

Note that it’s also possible to use `using` on a `DisposableStack` or `AsyncDisposableStack` (just like with any other object that implements the `Disposable` or `AsyncDisposable` interfaces). This makes it very easy to create a `defer`-like mechanism as found in languages like Go:

```tsx
function main() {
	using stack = new DisposableStack();

	console.log("starting function");
	stack.defer(() => console.log("ending function"));

	console.log("during function body");
}
```

This will produce the following output:

```
starting function
during function body
ending function
```

## Useful Patterns with Explicit Resource Management

Hopefully by now it should be clear what disposable resources are, how they can be manipulated, etc. But it still took me a while to get my head around some typical patterns with disposables, how they can be manipulated, and some best practices. So here are a few short sections which explain a couple of ideas that are now possible, and the best ways to achieve some common goals.

### Anonymous Defers

If you’re coming from other languages with features similar to using, such as Go with its `defer` statement, then you may be surprised that `using` is really a variable declaration — it’s basically the same as `const` or `let`, but it also automatically cleans up resources when the function has completed.

As a result, every time you use `using`, you need to declare a variable name. But often you don’t want to specify a variable name — e.g. if you want to defer a callback until the end of the function. It’s possible to do something like `using _ = ...`, using \_ as a kind of informal placeholder, but this only works once per function body.

The best solution I’ve found is `DisposableStack` (or `AsyncDisposableStack`) and the `defer` method:

```tsx
function main() {
	using stack = new DisposableStack();

	console.log("starting function");
	stack.defer(() => console.log("ending function"));

	console.log("during function body");
}
```

### Disposable Timeouts and Intervals

The specification gives a list of various browser and JS APIs that will be retrofitted with the disposable mechanism, but one API that is noticeably missing is the `setInterval` and `setTimeout` functions. Currently, they can be cancelled using the `clearInterval` and `clearTimeout` functions, and we can use `defer` to integrate them into a disposable stack:

```tsx
function main() {
	using stack = new DisposableStack();

	const handle = setInterval(() => {/* ... */}, 5000);
	stack.defer(() => clearInterval(handle));

	// ...
}
```

In fact, if you’re using NodeJS, you can go one better. The NodeJS timers (i.e. `setInterval` and friends) already return an object with lots of useful functions like `.unref()`. Recent versions of v18 and upwards now also include a `Symbol.dispose` key for these objects, which means you can simplify the above code to this:

```tsx
function main() {
	using setInterval(() => {/* ... */}, 5000);

	// ...
}
```

And in the browser, we can write a similar utility function:

```tsx
export function interval(...args: Parameters<typeof setInterval>): Disposable {
  const handle = setInterval(...args);
  return { [Symbol.dispose]: () => clearInterval(handle) };
}
```

### The Use-and-Move Maneuver

One more subtle but incredibly powerful method in the `DisposableStack` arsenal is `.move()`. This creates a new stack, moves all of the resources in the current stack into the new stack, and then marks the original stack as disposed. None of the resources will be disposed except for the original stack.

This is a powerful tool for anywhere where you’re creating resources for use elsewhere (so you want to put them in a stack), but the very act of creating resources is something that might fail (so you want to be `using` that stack when you create them.

Consider this example, which can cause resource leakages:

```tsx
export function badOpenFiles(
  fileList: string[]
): { files: File[] } & Disposable {
  const stack = new DisposableStack();
  const files = [];
  for (const fileName of fileList) {
    files.push(stack.use(open(fileName)));
  }

  return {
    files,
    [Symbol.dispose]: () => stack.dispose(),
  };
}
```

If I call this with a list of files, it’ll open all of those files and return them as single disposable object, that when it gets disposed of, closes all the files again.

But let’s say I call this with the file list `["file1.txt", "file2.txt", "file-does-not-exist.txt", "file4.txt"]`. Now, the first two files get created and added to the stack, but the third one causes an error, which exists the function. But because the stack was never added to a `using` declaration anywhere, those files will never be closed, which causes resource leakage.

The `.move()` function allows us to do this instead:

```tsx
export function openFiles(fileList: string[]): { files: File[] } & Disposable {
  // Note we use the stack here, which means this stack will be cleaned up
  // when we return from the function.
	using stack = new DisposableStack();
	const files = [];
	for (const fileName of fileList) {
		files.push(stack.use(open(fileName)));
	}

	// We've successfully created all the files with no errors.
	// Move the opened file resources out of the stack, and into a new
	// one that won't get closed at the end of this function.
	const closer = stack.move();
	return {
		files,
		[Symbol.dispose]: () => closer.dispose()
	};
}
```

### The Disposable Wrapper

Right now, `Disposable`s are still relatively new, and so it's not unlikely that the library you're working with doesn't support them, opting instead for a `.close()` method or something similar. But Javascript is a dynamic language, so it's not too hard to get these tools to behave. Here's an example for MongoDB, which at the time of writing does not support `using` or any of the disposable interfaces:

```typescript
function createMongoClient(
  connection: string,
  options?: MongoClientOptions
): MongoClient & Disposable {
  const client = new MongoClient(connection, options);

  if (client[Symbol.asyncDispose]) throw new Error("this code is unnecessary");
  return Object.assign(client, { [Symbol.asyncDispose]: () => client.close() });
}
```

This will add a `Symbol.asyncDispose` method to the client, meaning you can use it in `await using` declarations and with `AsyncDisposableStack#use()`. In addition, if you ever update to a version of MongoDB that does implement the `AsyncDisposable` interface, you'll get an error reminding you to delete the code.

### Awaiting Signals

A common pattern for NodeJS servers is to start up the web server, and then add event handlers for the OS's "quit" signals (e.g. `SIGINT`). Inside these handlers, we can shut the server down, clean up resources, etc.

This works fine, but the control flow can be difficult to follow, and we have to manually call the `Symbol.dispose` and `Symbol.asyncDispose` methods where that's relevant. It would be nice if there was a way to tie the lifetime of the application to the lifetime of a single function, so that when that function exits, the server will also automatically exit, closing and disposing of all resources along the way.

Enter NodeJS's `once` function, which converts an event into a promise[^once]:

[^once]: Note that if you don't have access to NodeJS, you can replicate this functionality using `new Promise(...)` manually, although this can be tricky to do properly as it's difficult to ensure that resources get correctly cleaned up once an event has been triggered.

```typescript
import { once } from "node:events";

// waits until the `SIGINT` signal has been triggered, e.g. from Ctrl-C
await once(process, "SIGINT");
```

Using this, we can write a `main()` function that lives for the entire length of the application, and quits when the application is stopped, automatically cleaning up any resources after itself:

```typescript
async function main() {
  await using stack = new AsyncDisposableStack();
  await using resource = createResource();
  // ... etc, for as many resources as make sense

  // alternatively, use the "Disposable Wrapper" pattern from earlier
  const server = stack.adopt(express(), server => server.close());

  // add routes, use resources, etc
  server.get(/* ... */);

  logger.info("starting application on port 5000");
  server.listen(5000, () => logger.info("application started"));

  await Promise.race([
    once(process, "SIGINT"), // Ctrl-C
    once(process, "SIGTERM"), // OS/k8s/etc requested termination
    // etc.
  ]);

  logger.info("shutting down application");
}
```

Because all of our resources are managed either by `using` directly, or by the `stack` which is in turn tied to the application's lifespan, we don't need to manually close anything after the signals have been handled — everything will automatically be gracefully shutdown.

## Using Explicit Resource Management Today

Right now, explicit resource management is a stage three proposal — that means that the specification has been completed and approved, and browsers and other tools are encouraged to start implementing the proposal, and trying the feature out in practice[^trackers].

This means that if you want to try this feature out right now, you're going to need to transpile the syntax to a format supported by older browsers, and provide a polyfill for the various global objects that the feature requires.

In terms of transpiling, both Typescript and Babel support the `using ...` syntax. For Typescript, you'll need [version 5.2 or greater](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html#using-declarations-and-explicit-resource-management) to handle the syntax. In the `tsconfig.json` file, the `target` should be `ES2022` or lower in order to do the transpilation (otherwise Typescript will just leave the syntax unchanged), and the `lib` setting should include `esnext.disposable` (or just the whole `esnext` bundle of types) to ensure that the right set of types is included. For Babel, including the `stage-3` preset, or explicitly adding the [`@babel/plugin-proposal-explicit-resource-management` plugin](https://babeljs.io/docs/babel-plugin-proposal-explicit-resource-management) should ensure that everything gets compiled correctly.

Neither Typescript nor Babel include a polyfill for the various global types discussed here, which means you'll also need a polyfill. For this, there are various options, including [disposablestack](https://www.npmjs.com/package/disposablestack), which I've been using, and CoreJS.

[^trackers]: For the people who like that sort of thing, you can see the tickets where this is being implemented for [Chrome](https://issues.chromium.org/issues/42203506), [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=1569081), and [Safari](https://bugs.webkit.org/show_bug.cgi?id=248707).

## Bringing It All Together

Let’s say we’re writing something on the backend, and there’s a lot of interactions with users. We want a class that handles all of our user-based logic:

- It can create/read/update/delete our user objects in the database
- It automatically deletes users that haven’t been active in the last five minutes (we’re _very_ GDPR conscious here, we don’t keep data a second longer than we need to)
- It provides a stream of all the new users inserted into the database, so that elsewhere we can send them a lovely greeting message.

We’ll use dependency injection so that we don’t need to create the database connection ourselves, but some of the resources will be managed by the user service. We can use the `AsyncDisposableStack` to group those resources together, and we'll add a `Symbol.asyncDispose` method that delegates to the stack's dispose method to handle that disposal. We can even implement Typescript's `AsyncDisposable` interface to make sure that we get everything right:

```tsx
export class UserService implements AsyncDisposable {
  #conn: DB.Conn;
  #stack = new AsyncDisposableStack();
  #intervalHandle: NodeJS.Timeout;
  #streamHandle: DB.StreamHandle;

  constructor(conn: DB.Conn) {
    // Our DB connection, passed in via dependency injection -- so we don't want
    // to add this to the set of resources managed by this service!
    this.#conn = conn;

    // Remember, NodeJS's `Timeout` class already has a `Symbol.dispose` method,
    // so we can just add that to the stack
    this.#timeoutHandle = this.#stack.use(
      setInterval(() => this.deleteInactiveUsers(), 60 * 1000)
    );

    // For resources that don't have the right methods, `.adopt()` is the
    // easiest way to add an "on dispose" cleanup function
    this.#streamHandle = this.#stack.adopt(
      this.#createNewUserStream(),
      // Closing this stream is an async operation, hence why we're using
      // Symbol.asyncDispose, AsyncDisposableStack, etc.
      async (stream) => await stream.close()
    );
  }

  async [Symbol.asyncDispose]() {
    await this.#stack.dispose();
  }

  // ... methods and implementation details
}
```

Now we need to actually construct all of our resources somewhere. We can add a `createResources` function that creates the resources, returns a disposable object that cleans up all of the resources together, and also ensures that if an error occurs during resource construction, everything will still get cleaned up gracefully — this is the power of the stack!

```tsx
export async function createResources(config: Config) {
  await using stack = new AsyncDisposableStack();
  const db = new MyDbDriver(config.connectionString);
  const conn = stack.use(await db.connect());

  // When the stack disposes of its resources, the `UserService` will be cleaned
  // up before the `conn`, which prevents errors where the `UserService` is
  // trying to use a connection that doesn't exist anymore.
  const userService = stack.use(new UserService(conn));

  // Now all the resources have been set up, use .move() to create a new stack
  // and return a dispose method based on the new stack.
  const closer = stack.move();
  return {
    userService,
    [Symbol.asyncDispose]: async () => await closer.dispose(),
  };
}
```

Now finally, we need to plug all of this into our server implementation, and make sure that everything gets cleaned up when the server gracefully exits. We can use signals and promises to catch the events that should trigger a shutdown, and use the `using` declarations to automatically clean up any resources.

```typescript
async function main() {
  const config = await loadConfig();
  using resources = createResources(config);
  using stack = new AsyncDisposableStack();

  // create wrapper functions around APIs that don't yet support disposables
  using server = createFastify({});

  server.get(/* route using resources.userService */)

  await server.listen({ port: 3000 })
  logger.info("server running on port 3000");

  // use `once` to turn one-time events into promises
  await Promise.race([
    once(process, "SIGINT"),
    once(process, "SIGTERM"),
    once(process, "SIGHUP"),
  ]);

  logger.info("server terminated, closing down");

  // resources will all be cleaned up here
}
```

## More Resources

There's a lot more information out there about the explicit resource management proposal, but given how Google isn't working as well as it once was, here are some links so you don't have to Google so hard:

- [The original proposal](https://github.com/tc39/proposal-explicit-resource-management) in the TC39 GitHub organisation. The documentation is a bit technically-focussed here, but the issues provide a lot of good context for the APIs, and a number of examples that explain why certain decisions were made.
- [Typescript 5.2's release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) include a section about resource management, how to use it, and how to get it working in Typescript.
- Various tickets/bugs/issues about implementing explicit resource management:
  - [Chrome](https://issues.chromium.org/issues/42203506)
  - [Firefox](https://bugzilla.mozilla.org/show_bug.cgi?id=1569081)
  - [Safari](https://bugs.webkit.org/show_bug.cgi?id=248707)
- Prior art in other languages:
  - [C#'s `using` statement](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/using) is a big influence here.
  - [Go's `defer` statement](https://gobyexample.com/defer) inspired the `.defer` method.
  - [Python's `ExitStack`](https://docs.python.org/3/library/contextlib.html#contextlib.ExitStack) is an explicit inspiration for the `DisposableStack` and `AsyncDisposableStack` classes.
