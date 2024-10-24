+++
title = "Surprising Programmer Tools #53: The Sudoku"
date = 2024-10-24
tags = ["advice", "programming"]
slug = "useful-tools-sudoku"
[params.cover]
name = "A Lady Writing"
artist = "Johannes Vermeer"
date = "c. 1665"
institution = "National Gallery of Art"
institution-url = "https://www.nga.gov/"
+++

During the Pandemic, I found the YouTube channel [_Cracking the Cryptic_](https://www.youtube.com/c/CrackingTheCryptic), which is run by two champion puzzlers, Simon and Mark, who solve various logic puzzles, focusing mainly on variant sudoku. Variant sudoku adds additional rules to a normal sudoku grid — for example killer sudoku, where all the numbers in a certain marked area need to add up to a certain number. As you add more rules, they often end up combining in weird and clever ways, and you can logically deduce more about the grid with less given information.

The channel is so compelling because they don’t just focus on getting the right answer, but explain how they can make each deduction along the way to figuring out the puzzle. They often use the language of proving: it’s not enough to guess, or to believe, or even to be very confident that a particular number needs to go in a certain place, you have to _prove_ that it’s correct. Generally that involves whittling away at the other options and showing that they don’t work. If we know a number needs to go in a certain row, but the rules prevent us from putting it in any other cell in that row but one, then we have _proved_ that the number must go in that cell.

There’s still a lot of intuition involved though! With many years of experience, Simon and Mark are able to look a few lines and the grid and very quickly find which parts of the grid they should be looking at first. When I started playing along and trying to solve some of the simpler puzzles myself, this was what I found most hard, but over time I’ve found I can spot “naked singles”, “roping”, or uses of “the secret” (all real sudoku terms) just by running my eyes over the grid.

But that intuition is only a start, and it can be wrong (or even deliberately mislead). Intuition might tell you something like “I should think about where the number five can go in this column”, because a particular rule makes it hard to put fives in certain places. But I can’t just guess where the five will go — I need to prove that, and show that no other option is possible. There’s an interplay between using human intuition to guess where the next weak spot will be, and then taking a more mechanical approach to actually put numbers into the grid.

## So what does this have to do with programming?

Sudokus, to me, feel most useful when debugging. Not necessarily the sudoku puzzle itself (although taking a break to do a sudoku can be a great way to clear my head), but the headspace that it invokes. Debugging involves the same interplay between intuition and proof that a sudoku does, and I use a similar approach in both cases.

The first thing I want to do when I’m debugging is get as much of an overview of what’s going on as possible — logs, error messages, videos of what the user was doing, etc. This is like looking at the whole sudoku grid and trying to guess where you should look next. You won’t necessarily know exactly what to do, but you can build up hunches for where to look.

This hopefully gives me a clue as to which area of the code to start looking at. Now I want to start eliminating possibilities. What can I prove _isn’t_ the cause of the problem? I find deleting or commenting out code is a fantastic tool. If I’m feeling particularly paranoid, I’ll even start deleting logs and other code that feels obviously irrelevant, just to eliminate those as options.

Even with a smaller set of options, there still might be multiple places to look. At this point, often I find it helpful to reason through the different options. In a sudoku puzzle, I might know that a certain cell must be 1, 4, or 9 (say). Then I can reason that through: if I made this cell 1, what would happen? What would the effects be?[^bifurcation]

[^bifurcation]: In sudoku puzzles, doing this too much is known as “bifurcation”, and it’s generally considered taboo. However (1) the difference between reasoning through different options and bifurcation is very fuzzy, and (2) we’re trying to fix a bug, not solve an elegant logic puzzle, so I think we’re allowed more leeway with brute-forcing!

When debugging, I do something similar. Here, though, it’s often more useful to think about _how_ this bit of code might cause the effects I’ve already seen. Say there’s been issues with connection failures: how could the code I’m looking at have triggered those failures? And would it have produced the same sorts of errors, or would it have looked differently?

I often have cases where I think “oh, there could be a bug here, but it wouldn’t explain why XYZ also happened”, or “if this were to cause a bug, it would happen by the server crashing, but the server never crashed”. Sometimes this is even a trigger to go out and look for more evidence. Am I sure there wasn’t a server crash? Am I confident that there’s no relationship between this code and XYZ?

Hopefully I’m confident now that I’m in the right place. Maybe I can already see what I’ve done wrong, maybe I need to fiddle with the code some more, but let’s assume I eventually come up with a cause for the bug, and a way to solve the bug.

However, the final step is to prove that this really was the cause for the bug, and that the solution really is fixing the root cause. It’s not enough that I just can’t see the problem any more — that’s like putting a number into the grid because you think it’s more likely to be in one place than the other. With sudoku and with debugging, certainty is important.

I’ve seen some suggestions that the way to know whether or not you’ve fixed something is to find a way to trigger the bug reliably, and then add and remove the fix. If you can consistently see that the bug is gone with the fix, and present when the fix is removed, then you’ve fixed the bug. There’s some truth to this, but I think it’s only part of the story. More important is being able to say — as precisely as possible — _why_ the bug occurred, and _how_ the fix stopped it from happening. That’s the “proving” part: understanding at a deeper level what’s going on and how to stop it.

## A perfect analogy?

It’s important to remember that a sudoku is a puzzle designed to have a single solution, and usually a single path to that solution. Debugging is not part of anyone’s plan, there may not be a single cause to the problem, and there are often multiple solutions to the problem once you’ve found it. However, I’ve found the strategy of puzzling — particularly the style of sudoku solving from Cracking the Cryptic — is a useful way to approach debugging. This strategy keeps me from relying too heavily on untested assumptions, and keeps me going until I find an actual cause, and not just a vague suspicion.
