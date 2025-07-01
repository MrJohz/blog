+++
title = "This Overly Long Variable Name Could Have Been a Comment"
date = 2025-07-02
tags = ["programming", "tips"]
slug = "names-vs-comments"
[params.cover]
name = "Portrait of Godfrey Frankenstein"
artist = "John Frankenstein"
date = "ca. 1840"
institution = "Smithsonian American Art Museum"
institution-url = "https://americanart.si.edu/"
+++

Here's a belief I've held for a while but only recently been able to put into words: explanatory comments are often easier to understand than explanatory variable or function names.

Consider a complicated expression with multiple sub-expressions.  This expression is going to be difficult for the next person reading this code to decipher; we should make it easier for them.

There are a couple of ways to solve this. We could break down the expression into sub-expressions, and assign those sub-expressions to intermediate variables. Or we could pull the expression out into its own dedicated function. In each case, the goal is to give either part or all of the expression a dedicated name.  This name helps the next reader to understand the purpose or meaning of the expression.

Unfortunately, [names are hard](https://steveklabnik.com/writing/against-names/).  A good, meaningful name puts the next reader in exactly the right frame of mind to understand what is going on.  A bad name can confuse the next reader and make the code less legible than before.  And finding the right name is a difficult task.  It can't be too long and unwieldy — being too verbose makes it hard to communicate effectively, as anyone who's worked with German bureaucracy can tell you.  On the other hand, it can't be too short or generic — naming everything `x` or `var` will rarely help future readers.

Sometimes, though, I can't find a good, obvious name.  In these cases, rather than trying to force one, I instead write a comment.  A comment gives you more space to work with, which means it can be much more exact and precise than a single name.  You can use a comment to remove potential ambiguities that a more generic name might have.  A comment also allows you the chance to provide more "why"-type explanation rather than just describing the "what".

A good name is normally far better than a comment, but good names are hard to come by.  If you're struggling to find the right name for a particular chunk of code, consider whether the context would be better explained as a comment.[^note]

[^note]: As a brief postscript, a note about comments going out of date.  This certainly happens!  But the same is also true of names, which can easily end up out of date after a couple of rounds of refactoring.  In my experience, comments often contain more details, which means they can become (at least partially) outdated more easily, but in either case, it's important to check names and comments when doing refactoring work.