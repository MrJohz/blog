+++
title = "Disposables in Javascript"
date = 2024-04-30
tags = ["tips", "javascript", "programming"]
slug = "disposables-in-javascript"
draft = true
+++

Javascript’s new `using` statement provides a way to automatically close resources after you’ve finished using with it. But as part of the same proposal, a bunch of additional stuff has been added that’s also useful, both in its own right, and when combined with `using`. I couldn’t find a lot of useful documentation out there when I was trying to get it working, so I wanted to explain how it works in my own words.

## Motivation

Let’s say we’re writing something on the backend, and there’s a lot of interactions with users. We want a class that handles all of our user-based logic:

- It can create/read/update/delete our user objects in the database
- It automatically deletes users that haven’t been active in the last five minutes (we’re _very_ GDPR conscious here, we don’t keep data a second longer than we need to)
- It provides a stream of all the new users inserted into the database, so that elsewhere we can send them a lovely greeting message.

We’ll use dependency injection so that we don’t need to create the database connection ourselves, but we do want to handle some of the other pieces ourselves. The result might look something like this:

```tsx
export class UserService {
  #conn: DB.Conn;
  #intervalHandle: NodeJS.Timeout;
  #streamHandle: DB.StreamHandle;

  constructor(conn: DB.Conn) {
    // our DB connection, passed in via dependency injection
    this.#conn = conn;
    // search for and delete active users once a minute
    this.#timeoutHandle = setInterval(
      () => this.deleteInactiveUsers(),
      60 * 1000
    );
    // create a stream of events from the DB whenever a new user is inserted
    this.#streamHandle = this.#createNewUserStream();
  }

  // ... methods and implementation details
}
```

We can create all of our dependencies in a setup function somewhere, and voila, we’ve got :

```tsx
export async function createResources(config: Config) {
  const db = new MyDbDriver(config.connectionString);
  const conn = await db.connect();

  const userService = new UserService(conn);

  return { userService };
}
```

Now we can plug this as context into our server implementation and have all of our user-related needs met.

The problem comes when we want to stop our server. If we try to use `server.close()`, we’ll notice that Node hangs after the server should have exited. The actual web server has shut down, but there are resources left hanging over. And the reason for that is that we haven’t cleaned up our connections properly.

I want to explore in this post how `using`, disposables, and the disposable stack can help keep control of resources, and hopefully show how they can make it easier to handle cleaning up resources in this sort of situation.

## The Journey to using `using`

The case above describes having a class or object that needs to run some cleanup logic when it shuts down. This requirement is nothing new, it’s something that has been part of programming since very early on, and in NodeJS, the convention is typically to put this cleanup logic in a `close()` function. For example, the `Server` class in `node:http` has a `close()` method that “Stops the server from accepting new connections and closes all connections connected to this server which are not sending a request or waiting for a response.”

The problem with `close` alone is that it’s easy not to call it. Sometimes that’s just forgetting, but often exceptions can trip us up. Consider this function:

```tsx
async function saveMessageInDatabase(message: string) {
	const conn = new DatabaseConnection();
	const { sender, recipient, content } = parseMessage();
	await conn.insert({ sender, recipient, content };
	await conn.close();
}
```

This creates a database connection at the start of the function, and closes it at the end. But we have an issue is `parseMessage` throws an error — in this situation, we will leave `saveMessageInDatabase` without closing the connection, leaving unclosed resources hanging around.

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

|                |           await using            |          using           |
| -------------: | :------------------------------: | :----------------------: |
|   **Context:** |       async functions only       | async and sync functions |
| **Interface:** | `AsyncDisposable` + `Disposable` |    only `Disposable`     |

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

## Useful Patterns with Disposables

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
