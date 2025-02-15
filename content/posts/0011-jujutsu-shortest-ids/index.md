+++
title = "Why are Jujutsu's ID Prefixes So Short?"
date = 2025-02-15
tags = ["tools", "jujutsu", "vcs"]
slug = "jujutsu-shortest-ids"
draft = true
[params.cover]
name = "The Start of the Hunt"
artist = "American 19th Century"
date = "c. 1800"
institution = "National Gallery of Art"
institution-url = "https://www.nga.gov/"
+++

[Jujutsu](https://jj-vcs.github.io/jj/latest/) is a relatively new version control system that is designed around working directly with commit-like objects called “changes”[^commits-changes]. Each change has an ID, and these IDs are important because they’re the main way of referring to different changes[^against-names]. To make referencing these IDs a bit easier, Jujutsu often shows ID prefixes rather than the whole ID when displaying commits (such as in the `jj log` command).

[^commits-changes]: There is an important distinction between _commits_ and _changes_, in that _commits_ are immutable and serve as a kind of backing store, whereas _changes_ are mutable and represent a logical set of code changes. Each change is linked to a commit (the current immutable snapshot of that change), but if the contents of the change is updated, it will instead point to a different commit. Importantly, each change retains a history of the previous commits it pointed to — these commits can be seen by running `jj evolog`.
[^against-names]: I recommend reading Steve Klabnik’s “[Against Names](https://steveklabnik.com/writing/against-names/)” post which specifically uses this fact about Jujutsu as an example for why avoiding names by design can sometimes make things much easier to use.

This is similar to how Git can show an abbreviated commit hash, (typically 7-8 characters), but in Jujutsu, the ID prefixes are often 1-2 characters long. But a repository in Jujutsu can have thousands of changes in it. How can the prefixes stay so small?

## Anatomy of a Change ID

Every change in Jujutsu has a change ID. If you run `jj log`, you’ll see an abbreviated set of changes, and at the start of each entry in the log will be the change’s ID. This will usually be printed out something like this:

> **l**nwzpvxn  
> **sp**xyzulm  
> **sw**llwvql  
> **o**qumxxyr

A change ID is always made up from the letters k-z, which explains the “back half of the alphabet” feeling that these IDs have. In the code, this is sometimes described as [`reverse_hex`](https://github.com/jj-vcs/jj/blob/5b5a9e71c38d9e037c2d18f9a950552a553b7d7d/lib/src/backend.rs#L57), because it’s the same as hexadecimal notation, just starting from the back of the alphabet instead of the front.

Change IDs are generally 16 bytes long. This is actually configurable based on the backend, but the Git backend (which is the one most people use) has this value set to [16 bytes](https://github.com/jj-vcs/jj/blob/5b5a9e71c38d9e037c2d18f9a950552a553b7d7d/lib/src/git_backend.rs#L90), so that’s what you’re most likely to see. When displayed in the UI, though, the [default template](https://github.com/jj-vcs/jj/blob/5b5a9e71c38d9e037c2d18f9a950552a553b7d7d/cli/src/config/templates.toml#L175) only shows the first eight bytes (or eight characters of the hexadecimal format).

Showing only the first eight characters of the ID is fine, because when referencing a change ID (for example when doing something like `jj new -r <id>`), we don’t need to write the entire ID, we just need to write a unique prefix. As long as no other change starts with the same sequence that we’ve used, Jujutsu knows which commit we’re referring to. Given that there are roughly 280 trillion possible eight-byte sequences, the short ID is almost certainly unique, even for very large repositories.

Jujutsu goes a step further, though. The eight byte prefix is probably unique, but for every ID, Jujutsu also displays the specific prefix that is guaranteed to be unique for that change. When showing the ID in the terminal (and in the example IDs above), this is the part of the ID in bold.

How does this work? And why, for most of the changes that you’ll use regularly, is the prefix mostly only one or two characters?

## Indexes in Jujutsu

Jujutsu has a concept of indexes. Actually, Jujutsu has a number of indexes. If I’m honest, the indexing code is complicated to navigate around — I think this is partly the use of traits which make figuring out starting points more difficult, and partly because the indexing code is not very well documented right now. As a result, I will try and explain things as best I can, and I’ll let you know when I get stuck!

We can start by asking what indexes are used for. From what I can tell, the indexes resolve and identify prefixes for commit and change IDs. Roughly, we can imagine a big long list of IDs, all sorted alphabetically based on the ID itself. When we want to resolve a prefix for a change ID, we can do a fairly-efficient binary search on the data to identify the full ID, and we can use that ID then as an index into other stores.

The result might look something like this:

> 00138948d32bee69319bf096a00d2b7c  
> 17a7166c862e79d7efe5b36d8b58a90b  
> b704840fc5605d522ae6a7a5d09a38fd  
> bc4e63c300bb28e899e31f11fe54f67b  
> be3a486b7697d5d24f15e1634ed37fe8  
> d29b12e490af660a2f2533088389f737  
> d2d3105278d430876c07ea9767c7a28d

Here, if I wanted to look up the prefix “d29”, I would start in the middle (with “bc4e…”), and see that my ID is greater than that number (because “d” > “b” in hexadecimal notation). I can repeat this process, starting with the ID that’s halfway between the end of the list and the ID I just looked at (in this case “d29b…”). This starts with the prefix that I was looking up, so I know I’ve found the right ID[^ambiguous-prefixes].

[^ambiguous-prefixes]: Technically, I might have tried to look up an ambiguous prefix. For example, if I’d tried to look up just “d2”, then I’d have found two IDs that start with this prefix. So once an ID has been found, there’s a bit of extra logic that ensures that the ID really is unique.

The other side of this is, if we know the ID of a change, we can find out the shortest unambiguous ID by first looking for the ID, and then looking for its neighbours. For example, if I want to find the shortest possible prefix for the commit “bc4e…” in the above list, I can look at its neighbours and see that, while they both begin with “b”, neither begins with “bc”, and therefore I know that I can display “bc” as an unambiguous ID.

This is the simple version. In practice, there are multiple indexes. They all use the principles above (I believe), but in different ways.

- The “readonly” index stores all the IDs in a binary file. It knows how many IDs are stored in the file, and how long each ID is, so it can perform an efficient binary search on the data. Unfortunately, the format of the file does not appear to be well-documented, but I believe it contains separate indexes for commit IDs and change IDs. There also appears to be a graph-like data structure, but I’m not sure what this is for.
- The “mutable” index stores commits and changes in two in-memory B-trees. The mutable index can also reference a parent readonly index, which I assume is for the case where you start with an existing readonly index, and want to only store the changes made to that index, and not duplicate it entirely.
- The “composite” index is made up of multiple nested index segments. I believe this is an optimisation technique: rather than have one single index file with every single ID every made in it, you instead split the files up and check each file individually when trying to do a lookup.

This all explains (somewhat) how Jujutsu can efficiently look up changes based on a prefix, and how Jujutsu can show you what the unique prefix for any change is. Unfortunately, it doesn’t answer the original question.

In a repository with thousands of commits (such as that of Jujutsu itself), it’s very likely that most change IDs will require 4-5 character prefixes. If you clone the Jujutsu repository and run `jj log "all()"` (i.e. showing all changes in the repository), you’ll see most of the highlighted prefixes are quite long. But run `jj log` without any arguments, and you’ll see that the highlighted prefixes are typically only one or two characters long. What’s going on?

## The Secret Fourth Index

The trick is that there’s actually a fourth index in Jujutsu, but it’s separate from the other indexes. This is the [_ID prefix_](https://github.com/jj-vcs/jj/blob/6f1d15bd1a85aed635a64bd85c1a87467ef5132d/lib/src/id_prefix.rs#L147C1-L149C2) index. This index is a partial index — it only covers a specific subset of IDs, and if it can’t find a given index, it delegates to the main repository index (that contains all the possible IDs).

The ID prefix index is initialised with a _revset_, which is like an SQL query but for Jujutsu changes. For example, you might write `bookmarks() & author(me@me.me)`, which would resolve to all changes in the repository that (a) are labelled directly by a bookmark, **and** (b) have “me@me.me” as the change author. This revset language is a powerful way to describe different sets of changes, and it’s used extensively in Jujutsu. Commands that take an ID (e.g. `jj new -r <id>`) generally also take a revset that can describe multiple commits (e.g. `jj new -r 'all: bookmarks() & local()'` will create a new commit that merges together all your local bookmarks — a surprisingly powerful and useful technique called a [megamerge](https://v5.chriskrycho.com/journal/jujutsu-megamerges-and-jj-absorb/))[^megamerge].

[^megamerge]: Besides the megamerge thing, there’s a couple of interesting things going on here. Firstly, a merge in Jujutsu is just a change with multiple parents. This is true in Git as well, but it’s not always obvious that this is the case! Secondly, the `all:` part of the revset is necessary here, because for many commands, Jujutsu requires that the user be explicit when referencing multiple changes. The `all:` is me explicitly saying “this revset may resolve to multiple changes, use them all”.

Revsets are also used a lot for configuration. When running `jj log`, only a subset of changes get shown — typically any local branches, the currently active change, and the trunk change (i.e. main/master/trunk). By default, this subset is defined in the [default Jujutsu configuration](https://github.com/jj-vcs/jj/blob/539cd75f902234d46327495f5da33e41b896470d/cli/src/config/revsets.toml#L10C1-L10C74) as the following revset:

```
present(@)
  | ancestors(immutable_heads().., 2)
  | present(trunk())
```

Any change that matches this definition will get shown in the log[^definition].

[^definition]: This query translates roughly to “the current change, if it exists, OR the first two ancestors of any mutable change, OR the trunk/main/master change, if it exists”. Note that `X..` means “all changes not in X”, which is how we can define all mutable changes as being `immutable_heads()..`. The concept of immutable and mutable changes could be a blog post in its own right, but it’s discussed briefly in the documentation [here](https://jj-vcs.github.io/jj/latest/config/#set-of-immutable-commits).

The ID prefix index gets passed a revset like the log one. In fact, by default, it _is_ the log revset. This is usually very convenient: the default log revset shows the changes in the repository that you’re currently working on, so it makes sense to want to quickly reference these changes. This flow of checking the log to see the current change IDs, and then using `jj squash` or similar commands to manipulate them is so common that the bare `jj` command is by default aliased to `jj log`. However, if you want to change it, you can directly set the `revsets.short-prefixes` configuration setting to the revset query of your choice.

## Conclusion?

To sum up, most of the short ID prefixes that you will use in Jujutsu can be short, because Jujutsu creates an index out of only the active changes, and consults this index first when looking up ID prefixes. The definition of “active changes” can be defined using a query language, and is configurable under `revsets.short-prefixes`.

About halfway through writing this article, I realised that the answer already exists in the documentation: in the section on "[Display of commit and change ids](https://jj-vcs.github.io/jj/latest/config/#display-of-commit-and-change-ids)”, there is the line "To get shorter prefixes for certain revisions, set `revsets.short-prefixes`", followed by an example that prioritises only the current change and its “branch”.

But I enjoyed my journey to finding out the answer more, and I’ve ended up a lot more familiar with the Jujutsu codebase, and how Jujutsu works as a result.
