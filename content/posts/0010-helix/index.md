+++
title = "Helix: Why (And How) I Use It"
date = 2024-12-12
tags = ["tools", "helix", "terminals", "text editors"]
slug = "helix"
[params.cover]
name = "The Start of the Hunt"
artist = "American 19th Century"
date = "c. 1800"
institution = "National Gallery of Art"
institution-url = "https://www.nga.gov/"
+++

I’ve come to accept that I’m just a sucker for shiny nerd things. I use Rust, despite never having had a professional reason to use it in my life. I switched to Linux in my student years and I’ve never looked back since, even though it constantly breaks and I can’t get my Bluetooth headphones to connect. I have a split keyboard with [home row mods](https://precondition.github.io/home-row-mods) set up because I read some random blog posts and it looked cool to me. I literally learned to program because I figured I should learn how to do more nerd stuff.

For text editors, though, I’ve mostly stuck with the rather casual choices of VS Code and IntelliJ (when someone’s given me the money for it). They work fine, and I know I should be happy with that, but in the back of my mind I still long for a more hipster alternative. It’s not worked out yet though, so let’s try Helix out and see whether that fits the bill.

In this blog post, I’ll go over my motivation for switching to Helix (beyond nerd street cred), how that panned out, what the downsides were, and why I’ve stuck with it and will probably be using Helix as my main text editor for the foreseeable future.

## What is Helix?

Helix is a modal terminal editor with a focus on good defaults and a selection-first action model. There are a few things to unpack there:

- Modal editing is where you interact with the code in multiple modes — typically, pressing a key in one mode will allow you to manipulate the contents of the document (manipulating selections, duplicating text, moving text around, etc), whereas pressing the same key in a different mode will simply type the character. This adds some complexity (you now need to juggle different modes of editing), but also makes it easier to use powerful text manipulation commands in a consistent way.
- A terminal editor is one where all of the UI elements get rendered as characters in a terminal window. In many ways, it’s the same as a normal GUI, just instead of drawing arbitrary pixels, you’re instead drawing characters. This is typically a lot easier than full GUI rendering, and can be used in more places (such as over SSH), but it comes with its own downsides that I’ll talk about later.
- By good defaults, I mean that Helix provides opportunities for configuration, but has defaults that are suitable for most situations. For example, a lot of languages these days provide a language server that can be used by text editors to provide autocomplete, jump-to-definition, documentation, and so on. If one of these servers is installed on your machine, Helix will try and use it out-of-the-box, no additional configuration needed. In this vein, a number of other features that would typically be plugins in other editors are included as part of the base editor with Helix.
- The selection-first action model differentiates Helix from tools like Vim or Neovim (which are also modal terminal editors). The idea is that you perform actions, like the text-manipulation commands I mentioned earlier, first by selecting the region of text you want to act on, and then deciding what you want to do with that region. This is generally the opposite way round to how Vim and other similar editors do things, where normally you’ll choose an action, then say what you want to perform the action on.

None of the above is particularly new — modal terminal editors were some of the first visual editors around, and a lot of the success of VS Code comes from providing good defaults out of the box. The selection-first action model comes primarily from the Kakoune editor, and even Vim has a “visual mode” which works fairly similarly.

But Helix puts a lot of these pieces together in a single unit, and that’s what appealed to me, and made me want to try it out.

## Getting Started

On my Mac, I found the easiest way to install Helix was [Homebrew](https://brew.sh/). Opening Helix is also fairly easy: In a terminal, `hx path/to/file.txt` opens up a particular file, and `hx path/to/folder` opens up Helix in a kind of project mode, where most operations will occur relative to the project root. Alternatively, just running `hx` will give you a blank scratchpad.

For me, this was one of the first new experiences. I’ve used terminal text editors before when using SSH or when trying to make quick changes to a configuration file somewhere. But those have mostly been quick dips, in-and-out, and not an extended terminal editing session. This meant I needed to change how I did some things.

### Opening Files

When opened in project mode, most modern text editors provide some sort of file explorer view, so you can look around, open files, move files around, etc while in the editor. Helix doesn’t include this at all[^file-explorer]. Instead, pressing `space f` opens a “jump to file” picker, very similar to Ctrl+P in VSCode and some other editors. I like this approach a lot, because it lets me type the file (or folder) name as opposed to navigating through the folder tree, and because it’s something I’m very used to doing from VSCode.

[^file-explorer]: To be more specific, it doesn’t include this functionality currently, but there is an upcoming plugin system where a file explorer is likely to be a key use-case. There are also some vague noises about a built-in file explorer, but I believe this is a bit controversial, and may or may not get implemented.

There are other approaches, including using terminal file explorers that can open files in an editor, but I ended up avoiding that as unnecessary complexity. But I will talk a bit more about my experience going down that route later on.

### Opening a Terminal

Generally, when I’m working on a project, I need at least one terminal pane/window open for running commands, tests, starting servers, etc. However, running Helix in a terminal uses up that terminal, and there is no interactive access to the terminal from inside Helix, so I needed another approach.

UNIX shells do have a job control system, where you can suspend a program, jump back to the terminal and run a second program — for quickly running a script and looking at the output, this can be a viable option. But I like having terminals open and running while I’m looking at my code, as the changes I’m making and the results in the terminal are often very linked together.

For me, I ended up finding a terminal emulator that supported multiple panes in a convenient way. Right now I use WezTerm, which allows me to open up a new terminal pane to the side of my current pane, meaning I can use Helix, and still quickly open up a terminal and start running things. Similarly to above, there are other ways of going about this, and I’ll talk about that in a moment.

### Opening Multiple Tabs

When working in a larger project, I’m rarely working in just one file, and instead usually jumping between a handful of different locations in code. In most text editors, there’s a tab bar that shows you the current open text files. In Helix, it’s possible to open multiple files (or rather buffers), but it’s not always obvious that this is the case.

In this case, I found a small change to the configuration file made things feel a lot more intuitive. In `.config/helix/config.toml`, I added the following lines:

```toml
[editor]
bufferline = "multiple"
```

If there are multiple buffers open, this adds an extra line at the top of the screen, showing a list of the open buffers and highlighting which one is currently active. Using `g n` (**g**o **n**ext) and `g p` (**g**o **p**revious) makes it fairly easy to jump backwards and forwards through these tabs, and there’s a few other commands to open and close buffers without closing the Helix process. And if only the one buffer is open (e.g. because I’m only interested in editing a single file), then the bufferline is hidden, giving me more space to edit things.

## Key Bindings

Because of the modal editing concept, Helix has a very different set of key bindings to a lot of other editors (or at least, the sorts of editors that I was used to). This requires some adjustment, but I found it a lot easier to get started with Helix than I imagined. I kept the [keymap documentation](https://docs.helix-editor.com/keymap.html) open, and every time I thought “there must be an easier way to do this”, I’d look through the documentation page to see if I could find something that made sense.

There are a lot of different bindings to learn, but most of the time I’m only using a subset of them, so it’s easier to retain these in my muscle memory. However, because these bindings compose nicely, even just a relatively small number of commands can make code manipulation flow really easily. This is probably the thing I’ve enjoyed most about getting familiar with Helix — just how easy it is to manipulate text.

In addition to the two main modes (actions in _normal mode_ and writing text in _insert mode_), there are also a number of _minor modes_ — you start off in normal mode, press a key, and now you’ve got a range of new actions available. Essentially minor modes give you a kind of namespacing for commands. For example, if I press `g`, I’ll enter the “go to” minor mode, and I’ll be able to jump in different ways around the screen. Importantly for beginners, when you enter a minor mode, you’ll get a popup that shows you what commands are part of this mode. This gives Helix a sense of discoverability that is often not present in terminal UIs.

## LSP & Configurability

Like I said earlier, Helix tries to provide good defaults, particularly when it comes to language support with lots of syntax highlighting available out-of-the-box, and the aforementioned language server integration. This works really well, although there are a couple of caveats.

The magic ingredient here is (mostly[^tree-sitter]) the [Language Server Protocol](https://langserver.org/) (or LSP[^lsp-name]). The idea is that someone can create a tool that knows how to parse projects written in a given language, how to find suggestions, how to handle go-to-definition, and so on, and provides that information via a predefined protocol. Because this protocol is defined in a fairly broad way, they can essentially act as general purpose editor plugins, but suitable for a broad range of different editors.

[^tree-sitter]:
    There’s actually two magic ingredients here. Helix also uses tree-sitter grammars, which is kind of like syntax highlighting on steroids, and that powers a lot of “jump to previous method”, “jump to the next bracket”, “expand selection to the next parent node”-type commands. However, the tree-sitter implementation is one of those things that’s just so good it’s invisible, and when I first wrote this section, I forgot about it completely.

    The key takeaway here is: tree-sitter does just work out of the box, and is another great reason to use Helix.

[^lsp-name]: Note that sometimes LSP is used to refer to the tool implementing the protocol, e.g. the Typescript LSP. This is technically incorrect, but “Typescript LS” sounds dumb, and “Typescript Language Server” is too long.

Like I said, this works pretty well. If you’re working on a Rust project, you can use `rustup` to install the Rust Analyzer component, and now whenever you open a Rust project in Helix, you’ll have a full IDE experience. For Typescript, because you use the same language server that VS Code uses, Helix’s suggestions and language functionality becomes essentially on par with a much heavier, more powerful IDE.

The biggest caveat I found was when I did need to start configuring things. This happened because I wanted to use additional tools — I wanted to see ESLint warnings in my editor, and have access to Tailwind documentation and completions when writing that made sense. These are obviously more specific tools that not everyone will use, so it makes sense that Helix doesn’t autoconfigure them, but I still ended up running into a couple of issues that made using them more painful than I’d have liked.

Firstly, once you’ve set up a language server integration (which in fairness is normally only a couple of lines of configuration), you need to update the configuration for each language to add the new server to that language’s list of supported language servers. Given that I want to keep most languages’ configuration the same, this involves finding the default configurations, copying a bunch of information from there, and then adding the new language server. I would have preferred it instead if the language server configuration itself had specified which languages it should be used for — I suspect that would generally result in less configuration over all, and make it easier to add pre-made configurations as needed.

Secondly, the underlying protocol is continually being updated, and I found issues, particularly with Microsoft’s ESLint LSP implementation, where Helix and the server were unable to properly communicate because they supported different versions of the protocol. This is being worked on (see ([Issue #7757](https://github.com/helix-editor/helix/issues/7757)), and I could fix this by reverting to an older version of the ESLint server, but this comes with its own problems and didn’t work out well for me.

## Criticisms

Before I start this section, I want to be clear that I enjoy using Helix and will probably continue using it for the foreseeable future. But I don’t think it’s perfect, and I want to explore why.

Helix is a terminal editor. That means that every element in the UI is rendered as characters in a terminal window. This has some advantages — for example it means that Helix is very responsive and lightweight, because there’s not a lot of heavy rendering work to be doing. But it also has some disadvantages.

On the other hand, the terminal is a deeply limited place. All text has to be the same size, and the same (monospace) font. Window decoration, used to delineate panes or guide the user’s eye to a particular element, must always take up a full character height and width. Window/pane management becomes more complex, because each tool will have its own definition of a window. Mouse interaction is theoretically possible, but severely limited.

Defenders of the terminal often argue that the limitations of the environment allow you to have more control over your tools — you can script and configure and put things together to build the system you want. But what I often want is truly seamless integration between different components of my editing environment, and that is rarely possible to do without deep integration.

Earlier, I talked about having a file navigator for exploring a project’s files and opening them to be edited. In most modern GUI editors, this is a fairly standard feature. It is not implemented in Helix (although, like I said, the file picker is sufficient most of the time). Theoretically, we could use another terminal file navigator, and configure it to open files in Helix. In practice, though, this is still very limited.

Typically, this is done by writing a script that interacts with the terminal emulator/multiplexer that you’re using, finds the window where Helix is running, and runs the “open file” command in Helix by sending the right keystrokes. This works, but it’s brittle — it’s deeply tied to the specific set of tools that you’re using, and their current configurations.

And even if we do take this route, there are still issues ahead. Helix is LSP-aware, and if an LSP you’re using has a way of renaming a given file, it’ll try to use that rather than renaming the file by itself. This means imports get kept up-to-date automatically. But your file navigator tool probably doesn’t have this feature, which means that moving files inside the file navigator will produce broken files that need to be fixed by hand.

Another example of the sorts of powerful integrations you can do if everything is all one system is VSCode’s[^and-intellij] three-way merge interface. This shows the current and incoming versions, alongside the common ancestor in an editable pane. Because all three of these panes are normal VSCode text panes, they have full LSP integration, showing suggestions, running formatting commands, showing current errors and warnings in the file, etc. This is really useful during a merge, because it allows you to reason about the change that you’re creating. And importantly, it’s not a feature that you can build out of individual components, but a feature that requires those components to be deeply integrated with each other.

[^and-intellij]: It’s been a while since I’ve used it, but I believe IntelliJ’s IDEs behave very similarly. This isn’t some VSCode-specific feature, but a feature of any IDE that can integrate git features and LSP/code analysis tools.

I recently read [an article](https://poor.dev/blog/why-zellij/) from the creator of Zellij, a terminal multiplexer, about why they created Zellij, and why they think the command line is such a good environment for developers. In fairness, Zellij is one of the tools I tried out as I was figuring out how to use Helix effectively, and it’s a nice piece of software. But I fundamentally disagree with the author that this is a better environment to work in.

My dream here is an editor that has the speed and simplicity of Helix (and particularly the keyboard shortcuts!), particularly when editing single files, but that can scale up to be used as a full IDE — with an emphasis on “integrated”, where all the pieces fit together without having to configure them yourself.

## Conclusion

I like Helix. I will probably continue using Helix for the foreseeable future. I wanted to learn modal editing, and I have, and it’s great. I can make significant changes to my code with only a handful of keystrokes, and the composability of those keystrokes means that I don’t need to learn as much as I thought I would need to. I’ve also enjoyed the side-effects of learning Helix, like getting back into the rhythm of using Git as a command-line tool again. (Although now I’ve been doing that, I’m noticing the sharp edges again, and I see Jujutsu is the shiny new thing these days, so maybe I need to play around with that next!)

I had hoped that Helix would bring me closer to the world of TUIs and terminal applications, and to a certain extent it has. For example, I’ve got back into the rhythm of using Git as a command-line tool again. But it’s also made clear to me what a limitation the terminal imposes on software, and given me a renewed appreciation for the power of GUI design.

I know the next big change in Helix is likely to be the release of the plugin system, which I’m looking forward to, if only out of interest of what people will do with that system. In the meantime, though, consider me a very happy Helix user!
