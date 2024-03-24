+++
title = "Typography Demonstration"
+++

When I was creating this theme, I originally used various previously-written blog posts of mine to try out different styles. That worked well, and caught a few cases that I probably wouldn't have thought of (for example, for a while highlighted code blocks would have a completely different background and appearance to non-highlighted code blocks). But it's also useful to create some completely artificial examples as well, so this is a page to show off how typography works on this page.

Let's start with some headings. For my blog, three levels of heading are sufficient, and I reserve `h1` for the page and article titles, so:

## This is an H2

### This is an H3

#### This is an H4

Short paragraph.

Long paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

A paragraph with [some links](http://example.com) in it, to show off [how they are styled](http://example.com).

> A short, simple quote,

followed by another paragraph.

> A block quote which itself contains multiple paragraphs and other typographical features,
>
> including long paragraphs, lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
>
> > and nested block quotes (try to avoid these though, as they break the vertical flow of text)
> >
> > > deep nesting works as well
> >
> > ```
> > nested code block
> > ```
>
> ```python
> def formatted():
>     pass
> ```
>
> - bullet
> - points
>   - nested

Code blocks with highlighting:

```python
def does_something():
  pass
```

Code blocks without highlighting:

```
this is basically just free text
```

1. This
2. Is
3. The
   1. really?
4. Beginning of a numbered list.

Then we do something else so that the markdown doesn't behave weird.

- Then we add some
- bullet points
  - even some nested bullet points
    - how nested can we get?

Note that the current styles break down a bit with overly complex bullet points/numbered lists:

- What happens when our list items become run on paragraphs

  ```
  that might even include code blocks
  ```

  > or quotes?
