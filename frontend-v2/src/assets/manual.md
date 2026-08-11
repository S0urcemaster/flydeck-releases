# Flydeck Manual

Welcome to Flydeck V2 by Digi Craft
Created by Sebastian Teister, Germany
Images follow when finished

## General

You are reading the Flydeck V2 manual
There are 2 ways you may have come here by yourself : You are reading the source code - or you already have Flydeck installed (by someone)

The following manual is intended for those : who don,t have a clue about anything
All others will find their way through just by trial and error
The UI is designed to be self-explaining + This cannot always be fully achieved - so there will be some explanation needed (Sorry my German English - I,m a little DJ)

### Caution !

Information is a weapon and can be used against you !
During the development and to be able to fully test all functions : I made a fun game : writing down details about strangers that came up to me randomly + Looks, current action, direction and time -- and soon it became clear that in a couple of month : I,d had some library of what,s going on
Now AI comes to play : "Show me patterns" could be a prompt
People consist of habits and exceptions -- now : is Flydeck dangerous !
Yes ! Absolutely ! It,s a very powerful tool -- that,s why you should use it - ahead of others
Know your life better than anyone else could possibly do

> Chart your life : know yourself - and you know your limits and options

### Start with collecting data - Today !

It,s only 1 thing today that comes into your mind -- tomorrow it will be 2

### The Tree Browser

This is your machine of organization : a tree - an infinite tree if you like
It,s callde tree in data science - even if it,s more like a root : top down
Now the "tree" grows with its stem (wich is called "root") from the first line down into its branches (which are called branches) into its leafes (which are called leafs)
So the semantic is a mixture of words we have : words from tree are mixed with the root
The effect is the same : We have something (data) spreading from an origin into finer and finer details -- from a stem (root) into branches and finally leaves

#### Simpler ?

Drawers : You have big drawers and there you can put items - but you can also put other drawers with other items into the root drawers + And those drawers that are inside drawers can have more drawers with more drawers inside them -- infinitely

Example : There,s a house (root) that has a kitchen (branch) that has a cupboard (branch) that has a drawer (branch) that has a box (branch) that has bread (leaf, a bread is no container) inside

### Trees in Flydeck are flat

This is a tribute to the small smartphone screen : you have no room to the sides -- but usually tree views need wide screens (That,s because you usually need to indent every deeper branch of a tree to keep track of where you are)
That,s why Flydeck trees are flat - and that,s the reason why you can never see the whole tree in Flydeck -- you can just browse it branch by branch

### Some ideas

> Ok : this should be good - but where to start ?

A tree not only has branches : it has **lists** -- so start with a list you can imagine -- something that sounds interesting or useful

Common lists are (for AI) :

- shopping list
- grocery list
- to-do list
- chore list
- cleaning checklist
- packing list
- wish list
- guest list
- meal plan
- weekly menu
- inventory list
- household inventory
- pantry inventory
- freezer inventory
- budget list / household budget
- expense list / spending tracker
- bill checklist
- appointment list
- contact list
- emergency contact list
- gift list
- reading list
- watchlist
- bucket list
- pros and cons list
- reminder list

### Button kinds

> Safety information : Dangerous functions need to be tapped or klicked twice :
> First : the dangerous button gets red - then a tap or klick on the now red colored button will execute the function
> It will un-arm automatically

Buttons often have multiple functions :

- *Cycling* whenn pressed multiple times
- Second function when *long pressed*
- *Unlock* function (like delete)

### Tree Browser Hierarchy Control

When working with trees : you need to create, update, delete and move items
For a tree like TreeBrowser where every item is a branch : one should be able to pick one branch and stick it somwhere else
For that : every branch (every branch is also an item in TreeBrowser) has its parent saved in itsels -- that,s how branches are connected : only through that parent
The parent is written down in a certain syntax like : storage/box1 - separated with a slash /
With this notation : sticking one branch name into the other : an unambigous path is created which cannot be misinterpreted

#### Example

I have a path to my sock in my flat : flat/bedroom/cupboard/greenleftsock
Now I take it to the kitchen : flat/kitchen/washingmachine/greenleftsock

When you want to move an item or branch with items or a branch with many branches : you change the parent of just this branch - and all appended to that branch moves too

## AGNT

Agent Chat
Communicates with the agent on the backend

## DATA

Data Management
Create and manage simple text files line-wise on the server

## CRON

Create and manage reminders
Center changes from DATE to DURAtion setting


## Settings

Useful app functions you rarely need

## Text Input Section

I like machine input

### Basic Navigation

The first row below a text input is CURSOR < left > right and W_ord select (press multiple to expand selection)
When long pressed : you have from left to right : copy / paste text and select all
To completely clear a text input use : select all +backspace

### Character Dialer

The buttons on the left column are programmable : select a text and long press the button to create a cycle through the saved letters when single clicking
The dialer corner and riht column buttons are programmable : use the settings in the config to set the layout to your liking (e.g. if you,re a lefty)

## Maintenance

Use the factory reset setting in the config section to reset the client to default configuration