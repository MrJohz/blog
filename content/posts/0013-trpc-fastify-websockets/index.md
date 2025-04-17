+++
title = "Accessing Fastify Sessions via tRPC Websockets"
date = 2025-04-15
tags = ["javascript", "tips", "frontend", "programming"]
slug = "trpc-fastify-websockets"
# [params.cover]
# name = "Arctic Hare"
# artist = "John James Audubon"
# date = "c. 1841"
# institution = "National Gallery of Art"
# institution-url = "https://www.nga.gov/"
+++

This is a quick post to point out a potential issue that might catch you out with using Fastify's sessions mechanism alongside tRPC's websockets transport, and how I've fixed it in my projects.

The problem happens with an application that looks something like this:

```typescript
const app = Fastify();

app.register(ws);
app.register(fastifyCookie);
app.register(fastifySession, { secret: "..." });

app.register(fastifyTRPCPlugin, {
  prefix: "/trpc",
  useWSS: true,
  trpcOptions: {
    router,
    onError,
    createContext: ({ req }) => {
      console.log(req.session); // logs "undefined"
      return {};
    },
  },
});
```

The `useWSS` parameter passed to the tRPC plugin means that it can handle both standard HTTP requests and a persistent websocket connection. Theoretically, both of these kinds of requests get handled by Fastify first, and therefore both should be initialised with a session object[^types]. In practice, though, the `session` field is missing on all websocket-based connections, but present for all HTTP-based connections.

[^types]: Indeed, this is also what the types will tell you — if you are using Typescript, `req.session` will have the type of the Fastify session object in the example above.

The cause is that the Fastify adapter for tRPC [delegates to the non-Fastify-specific websocket adapter](https://github.com/trpc/trpc/blob/7d10d7b028f1d85f6523e995ee7deb17dc886874/packages/server/src/adapters/fastify/fastifyTRPCPlugin.ts#L67). When that creates a context, the incoming `req` object is an instance of `IncomingMessage`, i.e. the underlying NodeJS request abstraction, which does _not_ have the Fastify session details attached.

This probably should be better documented, ideally directly in the types (although that would probably be a fairly large breakage), or at least in the Fastify documentation.

The best solution I found is a `WeakMap` mapping `IncomingMessage` requests to `FastifyRequest` values, which have the expected `session` attribute. That looks something like this:

```typescript
// create a new scope so that the hook we add later will only
// affect tRPC-specific requests
app.register((app) => {
  // use a WeakMap to avoid leaking memory by holding on to
  // requests longer than necessary
  const REQS = new WeakMap<
    FastifyRequest | IncomingMessage,
    FastifyRequest
  >();

  app.addHook("onRequest", async (req) => {
    // associate each raw `IncomingMessage` (`req.raw`) with
    // the original `IncomingMessage`
    REQS.set(req.raw, req);
  });

  app.register(fastifyTRPCPlugin, {
    prefix: "/trpc",
    useWSS: true,
    trpcOptions: {
      router,
      onError,
      createContext: ({ req }) => {
        // given either a `FastifyRequest` or an
        // `IncomingMessage`, fetch the related
        // `FastifyRequest` that we saved earlier
        const realReq = REQS.get(req.raw ?? req);
        if (!realReq)
          throw new Error("This should never happen");

        console.log(realReq.session); // logs the session object
        return {};
      },
    },
  });
});
```

Because the tRPC types aren't correct for the `req` parameter of the `createContext` callback, you might need to fiddle with the Typescript types to get this to work properly. Specifically, the `WeakMap` type here is technically incorrect, but means that I can do `REQS.get(req.raw ?? req)` without Typescript complaining. This does cause an ESLint error (because according to the type definitions, `req.raw` can never be null), but I'd rather silence an ESLint error than a Typescript error.

I hope this helps you, or myself in six months' time when I run into this issue again having forgotten about it completely.
