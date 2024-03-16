+++
title = 'How I Do Dependency Injection With Closures'
date = 2023-10-31
tags = ["dependency injection", "javascript", "programming", "python", "tips"]
+++

> You can also find an edited and updated version of this post that I wrote for my employer's blog [here](https://www.esveo.com/en/blog/dependency-injection-with-closures/).

A [discussion](https://www.reddit.com/r/Python/comments/17k9oai/autowired_my_minimalistic_approach_to_dependency/k77cv83/?context=10000) came up on Reddit recently about DI, where I mentioned that one way that I've done DI recently for web frameworks that don't naturally support it to using closures. Someone asked for an example, so I figured I'd explain what that looks like and where it might work (or not work). The original question was about Python, but I'll give Python and Javascript examples.

I'm going to start with some context of my dependency injection philosophy, but if you want to skip that, you can jump straight to some examples [here](#di-closures).

## Why DI

The problem I'm trying to solve here is DI, or dependency injection. I have a function, class, or in this case route handler that needs access to a given resource, such as a database connection. As I do that, I have three aims:

1. I want to wrap the database connection in an explicit interface to allow encapsulation — I don't want my routes to have to know how the database is structured, I just want them to be able to load and save e.g. `User` objects.
2. I want to be able to parameterize the database connection. When I run the code from my local machine, I want it to point to a local database, and when I run the code on production, I want it talking to the live database. That should happen automatically based on configuration files or environment variables.
3. I want to prevent code from having to construct its own dependencies (i.e. I want inversion of control). I don't want to create the database connection inside the route handler, I want that to happen outside the route and the result be passed to the route handler in some way.

The solution to this is dependency injection, or DI. When I first started programming, this term confused me for a bit, because I'd see lots of "DI frameworks" or similar tools, and I assumed that DI meant the act of using decorators or annotations to automatically inject parameters into the right place. This is not the case — those tools are often useful, but DI is more about how you write your code in the first place. For example, here are two Python functions, one of which uses DI:

```python
import emails

# Function 1

def send_emails(user: User, message: str):
    emails.EmailMailer().send_email(user.email_address, message)

send_emails(User(name="...", email="..."), "this is an email")


# Function 2

def send_emails(mailer: EmailMailer, user: User, message: str):
    mailer.send(user.email_address, message)

mailer = emails.EmailMailer(**email_params)
send_emails(
    mailer,
    user=User(name="...", email="..."),
    message="this is an email",
)
```

I think this is a good example, because you can see the advantages and disadvantages of DI. In this example, the second function uses DI, and the first function does not. The thing that jumps out the most to me is that the DI example is much more verbose — it takes more code, and it makes function signatures more complicated because they're taking more parameters. Partly that's just how I've written these examples, but I do think DI adds complexity — useful complexity, but complexity nonetheless. You don't need DI if it's not adding value.

However, there are some benefits visible in the second function. By making the `EmailMailer` object explicit and bringing it out of the `send_emails` function, we can now more easily pass parameters to it. If multiple functions are all using the `EmailMailer` object, and we need to change how we configure it, then now we can do that configuration in one place, rather than at every place that it's used. (Alternatively, before we might have used some global configuration, but with DI, we can be more explicit.)

We can also swap out the mailer object that we use. I think this is often oversold as an advantage (how often do you really swap out implementations like this?) but it's often useful for testing. If we want to test the first `send_emails` function, we'd have to mock a bunch of global imports, but with the second, we can just call the function with a mocked parameter.

The most important thing to notice here is that Function 2 uses dependency injection without going near a DI framework — without even using a single decorator! At its core, DI is just moving things from being constructed inside functions, to being constructed outside functions, and then figuring out how best to pass them back in.

Note that I've used functions here, but classes work in much the same way. Typically, parameters can be passed to the class constructor (`__init__()`, `constructor()`, etc), and then attach as instance attributes (`self.param`, `this.#param`, etc). I'm not going to use that style in this example, but I often use it for service objects.

With that out of the way, this is a way of doing DI via closures.

## DI & Closures

Here's a couple examples of route definitions in FastAPI/Python and in Express/JS:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
async def read_item(item_id):
    # ... TODO: get item value from a database somewhere
    return {"value": ...}
```

```js
import express from "express";
const app = express()

app.get("/items/:itemId", (req, res) => {
  // ... TODO: get item value from a database somewhere
  res.json({ value: /* ... */ });
});
```

As discussed above, dependency injection is about passing parameters to functions. But in the two functions here, that's difficult, because the parameters are fixed, and we don't actually call the functions. For example, with the Express example, Express will always call our route handler with the `req` and `res`. There's no place to inject any services or dependencies of our own.

One option might be to attach our dependencies to the parameters. This is common in Express, where middleware can be used to dynamically add a `req.users` or `req.conn` attribute that can be accessed inside the routes. However, this can be error-prone, not least because it isn't compatible with Typescript unless you start modifying global types.

An easier option, at least for simple cases, is often just to use closures to capture the dependencies. Here are some examples to show what I mean:

```python
from fastapi import FastAPI

app = FastAPI()

def add_routes(app: FastAPI, *, item_store: ItemStore):
    @app.get("/items/{item_id}")
    async def read_item(item_id):
        item = await item_store.load(item_id)
        return {"value": item.value}


item_store = ItemStore(db=...)
add_routes(app, item_store=item_store)
```

```ts
import express from "express";
const app = express();

function addRoutes(app: Express, itemStore: ItemStore) {
  app.get("items/:itemId", async (req, res) => {
    const item = await itemStore.load(item_id);
    res.json({ value: item.value });
  });
}

const itemStore = new ItemStore(db);
addRoutes(app, itemStore);
```

The basic idea is that we move the route definitions from being defined at the top-level to being defined inside a function. The inner functions are now closures — when the function is called, the inner functions will have access to variables defined in the outer scope (in this case the parameters), and so can access the dependencies they need. We can then create all the dependencies, as well as the main app beforehand, and pass them to the `addRoutes` function.

In practice, I often have a `create_context()` function that loads configuration from somewhere, creates all the dependencies, and returns `Context` object or [typed dictionary](https://docs.python.org/3/library/typing.html#typing.TypedDict) which contains all of the dependencies with keys. Then I can pass that whole context object to builder functions like `add_routes()`, rather than specifying all the dependencies individually.

Sometimes I also move the `app = FastAPI()`/`const app = express()` line inside the builder function, and have it return the entire app. I don't think one is better than the other, and which I use depends mostly on my mood.

## Where This Works Well, or Doesn't

I've used web routing as an example here, but I find this works well enough in any situation where I can't easily pass something in via function parameters. Most languages I use — even quite static ones like Rust — allow functions to be defined within other functions like this. The key requirement is good support of closures, but this is also fairly standard at this point.

There is an issue if you also want to export the functions somehow. With the `FastAPI` example above, if we wanted to import the `read_item` function somewhere else and call it, that becomes very hard with closures. In this case, that's not a problem, but I've run into contexts where it's more of an issue. In cases like that, I try to decouple the function entirely from any dependencies it needs, and just pass in raw data.

I've also noticed that this can be harder to implement correctly in some cases with Rust, if the lifetimes don't match or the type is difficult to name correctly. Typically Rc/Arc + Clone for services solves most issues, and sometimes boxing up the return value is necessary.

## Alternatives

Of course this isn't the only way! Here are some other options that I also have in mind when deciding how to get my dependencies injected.

- No dependency injection at all — I find this works really well up to a point, and then it stops working fast, usually around the point I'm configuring multiple DBs/external services, and want to get everything running in multiple environments. But simple is better the complicated, and no DI is simpler than DI.
- Using module-level values. In Javascript, for example, I can export a value, as in `export const USERS = new UserService()`. Similar things are possible in Python and most other more dynamic scripting languages. This can be used instead of DI, and most languages have some way of mocking static module exports, so you can still swap in test implementations. But I find this often ends up quite hacky, and the dependency nest can get quite deep, so I try to avoid this these days.
- A lot of frameworks provide some kind of app context field or value, which can be dynamically updated with different services or connections. Personally, I find it hard to keep track of what's on the context and what isn't, and I've rarely found a simple way of handling this when I'm using types.
- FastAPI has something it calls DI, but is really just request extractor — it is called for each request, it is passed the request, and it extracts the details it needs. I personally haven't had much success using this feature for DI proper. That said, other frameworks do provide a full DI framework. If it's built into the framework, then I tend to follow the "when it Rome, do as the Romans" principle.
- If all else fails, there are lots of DI libraries. I tend to avoid these, because it's added complexity when just passing in functions works well enough. But sometimes you get to the point where constructing all your services and dependencies up front doesn't cut it, and you need something more powerful. I've not reached that point myself, but most of the projects I've worked on have been relatively small.

## Conclusion

I hope this was helpful, this is just one strategy that I've found useful for doing simple DI without having to lean into frameworks or have annotation/decorator-based magic.
