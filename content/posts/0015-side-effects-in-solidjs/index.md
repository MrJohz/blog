+++
title = "Side Effects in SolidJS"
date = 2025-05-27
tags = ["programming", "javascript", "frontend", "solid-js", "tips"]
slug = "side-effects-in-solidjs"
[params.cover]
name = "View of Dresden"
artist = "Christian Gottlieb Hammer"
date = "1810"
institution = "Getty"
institution-url = "https://www.getty.edu/"
+++

If you’re used to React, you’re probably used to using `useEffect` to run side-effectful code, such as integrating with third-party libraries or setting up `MutationObserver`s[^dont-use-use-effect].  SolidJS also has `createEffect`, which works very similarly to `useEffect`, but it also has some other functions, and I’ve noticed that people getting started with SolidJS often aren’t sure which function to use for any given side-effects.

[^dont-use-use-effect]: You’re probably also used to people telling you not to use `useEffect` if you can avoid it.  That’s often good advice in SolidJS as well, although perhaps not to the same extent — I’ll discuss that a bit at the end of this post.
    

If you’re in that boat, then here is the answer in tabular form:

|  | runs immediately | runs on mount |
| ---: | :---: | :---: |
| **is reactive<br>(runs multiple times)** | `createRenderEffect` | `createEffect` |
| **is not reactive<br>(only runs once)** | no function needed | `onMount` |

In this post, I’ll unpack this table and explain what it means in a bit more detail.

## What are side effects?

Side effects in this context is code that:

- interacts with the page (i.e. isn’t deriving new values from existing inputs)
- isn’t handled by the framework itself (e.g. adding `onClick` handlers to a button via JSX, or using async/suspense).

So for the purposes of this blog post, something like this might be a side effect:

```tsx
// attach a global event listener from
// inside a particular component
document.addEventHandler("keydown", () => { /* ... */ });
```

But these probably aren’t side effects:

```tsx
// derive the `fullName()` signal by
// combining a `firstName()` and `lastName()`
const fullName = () => firstName() + " " + lastName();

// attach an event listener to a particular
// element using JSX
<input onKeyDown={() => { /* ... */ }} />

// this does have side effects, but for the purposes of
// this post, those side effects are handled by SolidJS
const [resource] = createResource(() => fetch(/* ... */));
```

## Are my side effects reactive?

There are broadly two types of side effect:

- Side effects that run once over a component’s entire lifecycle — i.e. some code that should run once when each instance of the component is first rendered, and then cleaned up when the component is unmounted, but never between.  These side effects are *not reactive*.
- Side effects that run multiple times whenever an input changes — i.e. code that will regularly be rerun during the lifetime of the component[^is-use-effect-reactive].

[^is-use-effect-reactive]: Comparison with React time again: React does *not* explicitly distinguish between these two cases.  `useEffect` is always reactive, albeit reactive based on the explicit deps array (unlike SolidJS where dependency tracking happens automatically).  However, the “run once” case is usually modelled by an empty deps array (i.e. `[]`), and the “run many times” case is modelled by adding dependencies to that array.

For example, the global `keydown` handler from before will probably only need to run once: we set the handler when the component is mounted, and then remove it when we’re ready to clean the component up.  However, the classic [`useInterval`](https://overreacted.io/making-setinterval-declarative-with-react-hooks/) hook needs to use reactive side-effects: whenever the input parameters change, we need to clean up the old `setInterval` handler and create a new one.

## When should my side effects run?

SolidJS’s side effects can be triggered at two different times:

- Immediately, as the component is being created
- Later, once the component has been mounted to the DOM and is ready to be used

Some things only make sense once the component has been mounted: any code that needs to access [`ref`](https://docs.solidjs.com/concepts/refs), for example, should run after the element has been created and attached to the DOM[^setting-up-refs].

[^setting-up-refs]: Note that code that *sets up* refs should run immediately, and not later.  This distinction is very rarely important — as a general rule, if you’re accessing a ref, you’ll want the code doing that to run after the DOM has been mounted.
    

Some things are not so clear-cut though.  For example `setInterval` doesn’t require any access to the DOM or to any particular elements, so it might make sense to put it in the “run immediately” category.  In practice, however, `setInterval` should normally only run once the component has been mounted.  Why?

The answer is server-side rendering.  When a component is rendered server-side, the DOM is never mounted per-se, so side effects that run only once mounted are never run.  However side effects that run immediately *are* run, because they will probably affect how the component will be rendered.  In fact, that’s normally the point of having them run immediately in the first place, so they can affect rendering!

If we put `setInterval` in the “run immediately” category, then it will be run on the server.  But the render code will never wait for the interval handler to actually start, it’ll just carry on generating HTML and sending it to the client.  And once the HTML has been generated, the component will be unmounted, the `setInterval` handler will be cleared, and the code in it probably won’t have even had the chance to run once, let alone affect how the code gets rendered[^set-interval-suspense].

[^set-interval-suspense]: My inner pedant wants you to know that with async rendering/suspense, it is possible to manufacture situations where rendering will wait until `setInterval` has been called at least once.  I can’t think of any good reason why you should do this, but technically this paragraph isn’t quite true.
    

This won’t break anything (as long as the interval is correctly cleared), but it is a useless call to `setInterval`, and a useless resource that needs to be allocated and cleaned up at some point.  Therefore, if you’ve got a side effect and you’re sure it won’t affect rendering, consider running it only once the DOM has been mounted.

## Bringing it together as a table

If we combine the two questions above, we end up with four different cases, as shown in the table I showed earlier:

|  | runs immediately | runs on mount |
| ---: | :---: | :---: |
| **is reactive<br>(runs multiple times)** | `createRenderEffect` | `createEffect` |
| **is not reactive<br>(only runs once)** | no function needed | `onMount` |

To finish up, let’s look at those four cases individually.

- `createEffect`: The first run always happens after the component is mounted.  After that, if a signal used in the body of the effect changes, the effect will be rerun.  If no signals are used in the body, then this behaves the same as `onMount`.
- `onMount`: As the name says, this also happens after the component is mounted, but it is *not* reactive.  This is good for side effects that only need to run once that use the DOM.
- `createRenderEffect`: Reactively, this behaves the same as `createEffect`, but the first run will happen *immediately* (i.e. synchronously before the `createRenderEffect` is completed).  Similarly to `createEffect`, if no signals are used in the body of the effect, then this behaves the same as running the code in the body of the component.
- *no function needed*: Remember that the body of your component will only get called once during the component’s lifetime, so non-reactive side-effects that need to run immediately (such as instantiating a third-party library, or using `createUniqueId`) can be called as part of that body.

## Addendum: `onCleanup`

A lot of side effects require some sort of cleanup to happen later — for example, starting a `setInterval` timer requires cleaning up that timer when it’s no longer needed.  For that, SolidJS provides the `onCleanup` function.

As a rule of thumb, `onCleanup` can be called wherever there is a scope that would get cleaned up at some point.  For example, once a component is no longer being rendered, it needs to be cleaned up and removed from the DOM.  By calling `onCleanup` in the component body, you can add an extra callback that will be called when that happens.

For reactive effects (`createRenderEffect`/`createEffect`), calling `onCleanup` inside the effect callback will schedule a function to run when the effect is re-run, i.e. when a signal triggers the effect to restart, all `onCleanup` functions will get called, and then the new effect is run.

In general, put your `onCleanup` calls inside the function you use to create your side effect in the first place.  For example:

```tsx
// NO!  Don't do this!
onMount(() => {
  /* some side effect */
});
onCleanup(() => {
  /* some clean up */
});

// ----

// YES!  Do this!
onMount(() => {
  /* some side effect */
  onCleanup(() => {
    /* some clean up */
  });
});
```

This is because generally you only want the `onCleanup` to run if the side effect was called in the first place.  As mentioned earlier, functions like `onMount` and `createEffect` will not run during SSR, but if the `onCleanup` isn’t inside one of those functions, then it will still be called during SSR, doing unexpected things.

## Addendum: Avoiding effects

At the start, I made the comparison to React’s `useEffect`, and in a footnote pointed out that in modern React, `useEffect` is generally discouraged — there’s often a better way.

In SolidJS, `createEffect` doesn’t behave in quite such surprising ways as `useEffect`, thanks in large part to the automatic dependency tracking that means that the effect normally re-runs when you’d expect it to re-run.  However, it’s still a good idea to look out for cases where you can replace `createEffect` with a better option.  When I look at `createEffect` calls, these are the things I’m looking out for:

- Is a signal setter being used in the body of the effect?  If so, the effect can almost certainly be replaced by `createMemo` or another form of computed signal.
- Is an async function being called in the effect?  If so, it might be worth using `createResource` (or `createAsync` from Solid Router) instead, as this will handle some of the boilerplate for you, as well as integrating with the suspense mechanism.
- Is the effect setting an event handler on a DOM element?  If so, use the `on*` handlers in JSX instead.  This seems obvious, but I’ve written this sort of code before, only to realise later that I’d missed an obvious and easier solution.
- Is the function body reactive and/or would the effect work better if it was run immediately?  As discussed in this article, other functions for running side effects are available.
- Is there a function that already handles this case in a [Solid Primitives](https://primitives.solidjs.community/) package, or can you write your own wrapper around the effect to encapsulate it a bit better?  This one isn’t really about getting rid of effects, but rather hiding them somewhere else.  But encapsulation is good, and the Solid Primitives functions are generally useful, even if you’re just looking at the source code to get a hint of how to do something.