+++
title = "Pushing and Pulling: Three Reactivity Algorithms"
date = 2026-01-12
tags = ["programming", "design-patterns", "reactivity"]
slug = "reactivity-algorithms"
draft = true
[params.cover]
name = "No. 2"
artist = "Will Henry Stevens"
date = "1939"
institution = "Smithsonian American Art Museum"
institution-url = "https://americanart.si.edu/"
+++

# Pushing and Pulling: Three Reactivity Algorithms

It's looking like I'm going to need to build a reactive engine for work, so I'm going to prepare for that by writing down what I know about them. I want to look at three ways of building reactive engines: push reactivity, pull reactivity, and the hybrid push/pull combination that is used in a bunch of web frameworks.

## The Problem Statement

The simplest way to visualise reactivity, in my opinion, is as a spreadsheet. You have a series of input cells, containing your initial data, and a series of output cells containing the final results. In between are many more cells containing intermediate computations that need to be done to figure out the final results.

[[diagram]]

When one of the input cells changes, all the cells that depend on it need to react to that change — the aforementioned reactivity. In practice, though, this is the bare minimum requirement. When building reactive systems, there are usually some additional requirements we impose that make the problem harder:

1. Each cell is recalculated at most once. We don't do any calculations that are immediately discarded. ("Efficient")
2. We only update cells that actually need to be updated. Any cells that aren't affected by the input are left untouched. ("Fine-grained")
3. Whenever cells change, all the cells change at the same time. There's never a moment when an intermediate computed value has updated, but the output cell is still showing a result based on the previous input. ("Glitchless")
4. Each time a node is updated, it may dynamically add or remove dependencies ("Dynamic")

The first two requirements ("Efficient" and "Fine-grained") are important for performance. Imagine a large spreadsheet with millions of cells containing formulas — it would be a huge waste of resources to recalculate every single cell, every time any input changes. Similarly, you don't want to calculate the value of a cell multiple times if you can help it. In general, we want to do the minimum amount of work possible.

The third requirement ("Glitchless") is important for correctness. We don't want intermediate states to be observable — if this were possible, then we can end up with invalid states. Consider two neighbouring cells, one that contains a country's ISO country code (UK, DE, BE, etc), and another that contains the full name of that country. We don't want to be able to observe the state where the two cells are out-of-sync with each other.

The fourth requirement ("Dynamic") is ensures that we only create dependencies when they are actually needed. This is easiest to see with conditional formulas, so something like `IF(<condition>, slow_calculation(B1))`. If the condition is true, this formula returns the value of (and therefore depends on) the cell B1. But if the condition is false, the formula returns nothing — and if B1 changes, this cell should not be updated. This is a dynamic dependency — the dependency only exists if `<condition>` is true.

These requirements will hopefully become more clear as we start trying out different algorithms, and seeing examples of their successes and failure modes. Before we get too deep in the weeds, though, I want to emphasise that not all reactive systems are the same, and some don't need all of these requirements. For example, lots of simple reactive systems work just fine with static dependencies only, trading off some efficiency wins for implementation simplicity. Similarly, glitches are only important if they are actually observed, so some reactive systems will be glitch-y by default, but provide tools for syncing nodes together if the user actually needs them to be in sync.

But for the sake of this article, let's assume we need all these things and look at some approaches to implementing reactivity.

## Push-Based Reactivity

In push-based reactivity, when a node updates, it notifies (and updates) all of its dependents. We can visualise this as the update being pushed down the chain of dependencies, until it reaches the final node to be updated.

[[diagram]]

This is a simple, and therefore very common approach. Generally, most event systems, streams, and observables follow this rough pattern. Even promises/futures/async/await can be thought of as a one-time-only push-based reactive tree — each `.then`/`.map`/`await` call creates a listener to the previous step, and then when the initial promise resolves, the update is pushed through the rest of the system.

Push-based reactivity is often very dynamic. A node can subscribe and unsubscribe from other nodes as needed, and thereby only get updates for events that will affect it. Similarly, by its nature it is also generally very fine-grained. You don't need to reevaluate the entire tree, you just reevaluate the specific nodes that received updates.

However, push-based systems typically are not particularly efficient, and it's only with additional work that we can make them efficient. Let's look at an example of a graph that creates unnecessary work.

[[diagram]]

According to our push-based system, we update the first node in our graph (A). This pushes a signal to (A)'s dependents that they should now update. In this case, both (B) and (C) update. However, (B) depends on both (A) and (C), so when (C) updates, (B) needs to update again, and we discard any previous work we've done there. Similarly, based on just a single update to (A), (D) will receive three different signals to update.

We can improve this somewhat if we make sure we always perform updates in a particular order. Consider a different approach to the same graph above:

1. We update (A), and push a signal to (B) and (C) to update.
2. (B) delays updating for now, knowing there are other dependencies to update first. Meanwhile, (C) updates, and pushes a signal on to (B) and (D).
3. (B) now updates, as both (A) and (C) are now ready. Once finished, it pushes a signal on to (D).
4. (D) updates last of all.

In this version, each node only updates once. We could do this, because we could see the entire dependency graph, and calculate the optimum route through it. This is not a given! Part of the value of push-based systems is that each node only needs to keep track of its own dependencies and dependents, which makes analysing the full flow of the dependency graph difficult.

However, if we design our reactivity system such that we can see the full dependency tree, we can always find an optimum route through it. This is known as a topological sort. There are even variations of topological sorts that can be used for dynamic graphs, where the dependencies are updated over time (otherwise every time any dependency changed, we'd need to run the entire topological sort algorithm over all nodes to make sure the order is still consistent).

The other challenge for push-based reactivity is glitches. As I mentioned earlier, glitches are when we can observe two nodes being out of sync with each other. In push-based reactivity, this is very easy to achieve — any code that runs after the first node has been updated, but before the final node has been updated has the opportunity to "see" glitches.

We can avoid this in two ways. Firstly, we can declare that any code that observes two nodes must depend on those nodes, and then apply the topological sort we described earlier. Alternatively, we can declare that any code that observes two nodes can only be run after all nodes have finished running[^depends-on-all]. These both work, but again they require us to be able to observe the full dependency tree and topologically sort all nodes, which isn't always possible.

[^depends-on-all]: Essentially, we wrap all observing code in a special node that depends on all other nodes, and therefore must always be updated last.

The other problem is that in practice, it's surprisingly easy to write code that implicitly observes some state without having the proper dependencies, at which point glitches appear again. There's typically no easy way to fully prevent these cases from cropping up, so some amount of vigilance is required to make sure everything is working.

## Pull-Based Reactivity

If what we've described above is push-based reactivity, we can draw a diagram of everything happening in reverse and call it pull-based reactivity. But that doesn't necessarily give us an intuition for what pull-based reactivity actually is.

[[diagram]]

In push-based reactivity, once a node has finished updating, it calls its dependents. In pull-based reactivity, therefore, we would expect each node to call its dependencies. And because you need your dependencies to update before you can update, we can see how this works: each node updates all of its dependencies, and then updates its own value.

In essence, pull-based reactivity is basically just a stack of function calls. I call a function, and it calls more functions if it needs to, then it returns a result. I can nest these functions recursively as much as I need, and the dependencies will all automatically be calculated for me.

This isn't quite reactive yet though. We still need some way of triggering the functions to be re-run when state changes.

The easiest possible system is that we just re-run everything. Going back to our spreadsheet, every time we update a cell, we go through every cell in the sheet and calculate its value fresh. When a cell references another cell (e.g. `=B8`), we stop and calculate the value of the dependency, then carry on with the calculation.

This has two problems, one of which is a lot easier to fix than the other.

The first problem is wasted work again. If cell A1 references B8, and cell A2 _also_ references B8, then when we update all the cells, we still only want to evaluate B8 once, and then reference it in both A1 and A2. We can do this through caching — whenever we calculate a cell's value, we store it somewhere, and then all future cell references can used the stored value instead of recalculating. To easily determine when a cache is invalid, we can use _generation counters_. We maintain a global generation counter and increment it every time an input is updated. In addition, whenever we calculate a cell's value, we store the result alongside the current generation. Now, if we want to check if we need to recalculate a cell, we just need to check that the cache's generation is equal to the global generation counter.

The result is surprisingly efficient. We can even trade off storage space for performance — if a node is cheap to calculate, or only rarely accessed, we might prefer not to cache that node, and instead recalculate it every time.

However, there is a second problem to deal with. Right now, we don't know which cells are actually going to change, so we're updating all of them. Ideally, we'd only update the cells that change, and leave the rest alone. Unfortunately, this turns out to be surprisingly hard.

To understand why, let's look at React. React uses pull-based reactivity: each component has some state associated with it [^react-state]. The entry point to a React app is a single top-level component that recursively calls all other child components, and each component also fetches that component's state. Whenever state is updated somewhere in the tree, React schedules the top-level component to rerender, recursively calling all other child components again, and in turn allowing each component to access to the new state.

[^react-state]: This is more obvious with old-school class-based components, but the same is true for hooks - each call to `useState` in a component body tells React to add another node to the component's internal state (or fetch that node on rerender).

At least in theory! In practice, React doesn't rerender the entire application, it only renders certain subtrees. If you update a component's state, that component and all its children update, but any parent components don't update.

This works, because React knows that even though the parent component calls each child component, the structure of the VDOM means that each child component forms its own isolated tree. This allows React to schedule an update to only one specific subtree, rather than updating everything. 

But even this is more work than necessary - whenever a parent node is updated, all of its children also need to be fetched and rerendered.  We looked at reducing the impact of this through the use of generation counters earlier, but that only helps when we want to read the same node several times during the same rerender. But here, React only calls each node once per rerender. React's solution is memoisation: if the arguments passed to a component haven't changed, and the state attached to that component or its children hasn't changed, then the child component won't be rerendered [^memoisation-caveats].

[^memoisation-caveats]: There is an additional caveat: the child component must be marked as memo-able using the React.memo wrapper, although the new compiler apparently handles this automatically these days.

This again works because the output of a React component is a specific data structure that ensures that parent components can't be affected by child components. It also requires that the child components be pure (or at least that they do any impure work inside of escape hatches like `useEffect`). This sort of caching isn't a general solution, but depending on the exact nature of the problem, caching can make pull-based reactivity much more efficient than it first appears. 

And this is useful, because pull-based reactivity has its advantages. Firstly, it handles dynamic dependencies just fine - because each dependency is just a function call, it's really easy[^react-snark] to conditionally depend on some piece of state. Secondly, pull-based reactivity is by its nature glitchless. Because the entire tree updates at once, it's only possible to observe the entire tree in a single consistent state.

[^react-snark] unless you're writing React and forget what a closure is...
