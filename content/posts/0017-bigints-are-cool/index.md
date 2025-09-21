+++
title = "Storing Unwise Amounts of Data in JavaScript Bigints"
date = 2025-09-21
tags = ["programming", "tips", "javascript"]
slug = "bigints-are-cool"
[params.cover]
name = "Study Head of a Boy"
artist = " Alice Pike Barney"
# date = ""
institution = "Smithsonian American Art Museum"
institution-url = "https://americanart.si.edu/"
+++

# Storing Unwise Amounts of Data in JavaScript Bigints

This is a short note to document storing data in JS's `bigint` type.  I tried this out in a project recently, and it's not obviously a terrible idea, as long as you take into account all the caveats that make it only useful for very specific cases.

## Why

This is a performance[^performance] thing.  In the project where I was exploring this, we had a large amount of objects representing configuration values.  The possible configuration keys were the same, but different objects had different keys set.  This approach was causing some issues:

[^performance]: Note: performance as in "speed, efficiency", not performance as in "performance art".  Although I would be interested in using obtuse programming techniques as performance art.

* Serialization and deserialization produced very large strings because of all the repeated keys.
* Comparison/equality of objects was costly because of the number of keys.
* We needed to do a lot of operations like "find the subset of keys and values that are identical between all of these objects".  This was slow.
* We often needed to update subsets of the items by adding, updating, or removing keys, so each object needed to be an independent clone.

Originally, I planned on doing some sort of object interning to reduce the number of objects we needed to keep in memory at any one time.  We would keep only one copy of each unique configuration item, and just reference it in multiple locations.  The (now dead) [Records and Tuples](https://github.com/tc39/proposal-record-tuple) proposal would have been really useful here, and its replacement, [Composites](https://github.com/tc39/proposal-composites) looks like it might help but I didn't want to tie myself to an incomplete early-stage proposal.  So if I went down this route, I'd be building something myself.

While looking all this up, I found Justin Fagnani's article [Composite Map Keys in JavaScript with Bitsets](https://justinfagnani.com/2024/11/09/composite-map-keys-in-javascript-with-bitsets/), which is mostly unrelated to what I'm doing here, but did make me think of using bigints in the first place.

## How

The basic idea is:

1. Define a bunch of fields, how they should be interpreted, their size, etc.  E.g. `{name: "size", kind: "uint", bits: 8}` to represent a number stored as a u8.  You also need to know the offset of each field, this can be calculated from the index of each field and the number of bits in the preceding fields.
2. Add functions `getBits(bigint, offset, bits)` which does bitshifting to fetch the relevant bits from the `bigint` backing store, and `setBits(bigint, offset, bits, value)` which does the opposite
3. For each field, add getters and setters that do the type conversions from e.g. JS `number` to u8.

Honestly, I was impressed by how well Claude Sonnet handled this stuff.  It didn't produce the tidiest code, nor did it find the clearest ways of doing many things, but the basic bit-bashing was largely correct, and I wrote a lot of tests to confirm that it was working in the way I wanted.

In this use-case, not all keys are present at all times.  To handle this, I added an extra store `present` alongside the `bigint` backing store that was a simple bitfield where if bit `i` was 1 in the `present` store, then the `i`th field had been set in the main backing store.  Deleting a field meant simply clearing the `i`th bit.

## Benefits

* The memory usage of the object is about as compact as it's possible to be.  Booleans take up a single bit, colours can be stored as u32 values (for rgba), fields that were previously string enums are now just a couple of bits wide, etc.
* Deserialization is very quick (basically just `BigInt("0x" + value)` to convert a hexadecimal string back into our backing store).  Serialization is slightly slower because I wanted to ensure that unset fields were zeroed-out first, to ensure consistent representations.  The resulting string is pretty compact.
* Lots of operations can take advantage of the `present` bits to optimise what they're doing.  For example, when checking equality, we can first check that the two `present` bits are equal to make sure that the same fields are set in both cases.  When finding the intersection of two values, we can first `AND` the present bits together, and check only the fields that are set in both values.

This whole thing is surprisingly usable.

## Drawbacks

* Fields need to have a max width.  For example, you can't store an arbitrary string in the `bigint`, because you don't know when it will end.  If you need dynamically-sized data, then this isn't going to work.
* Bit operations on `bigint`s is slow.  I mean, all things are relative, but in general, gets and sets will be faster with plain old JS objects.  HOWEVER: if you have a lot of smaller fields, you can cheat a bit and use a `number` backing store, or use a combination of a `number` store for smaller fields and a `bigint` store for larger fields.  Bit operations on `number` objects are very fast, and in my tests, gets and sets were roughly the same speed as getting/setting regular JS object fields.
* The code is going to be *way* more complex.  Expect to write a whole bunch of tests that basic things like getting and setting a property work.  I suspect a good library or layer of abstraction could help here, but, having only done this the once, I don't know what that abstraction would look like yet.

This might not sound like a lot of drawbacks, but they're all very significant compared to the more niche benefits of this approach.  I wouldn't recommend doing this in most cases.

## Is It Worth It?

I'm not entirely sure yet.  This is a bit of an experimental side project at the moment, just playing around with one way of optimising one component of the main project I'm working on.  I need to see how it feels to use this approach in practice.  The goal is not necessarily that `bigint`s by themselves will make things better, but that they'll enable other optimisations by having much quicker equality checking, etc, so I need to try out those other optimisations and see the results.  If you're reading this in a few months and still curious, reach out to me on Bluesky or something and ask me how it's going, and then I can update this blog post with the results.
