# Flydeck Manual

Welcome to Flydeck by Digi Craft
Created by Sebastian Teister, Germany

Manual by Sebastian Teister in English

## General

You are reading the Flydeck V2 manual
There are 2 ways you may have come here by yourself: You are reading the source code or you already have Flydeck installed (by someone)

The following manual is intended for those who don,t have a clue about anything
All others will find their way through just by trial and error
The UI is designed to be self-explaining. This cannot always be fully achieved, so there will be some explanation needed

Work in progress ! Things might not function as intended
--------------------------------------------------------

### Start with collecting data - Today !

It,s only 1 thing today that comes into your mind -- tomorrow it will be 2

### What can you do with Flydeck ?

Flydeck is a patabase application for structural data that works off the usual internet grids / but runs on your own (little) homeserver hardware directly at your router

You can store data from your smartphone - do you have some ?

If you don,t have data around : Flydeck will be pretty useless to you

Think about any data that could be useful to you or you don,t need to read on

### The Tree Browser

This is your machine of organization : a tree - an infinite tree if you like
It,s called tree in data science - even if it,s more like a root : top down
Now the data "tree" grows with its stem (wich is called "root") "down" into its branches (which are called branches) into its leafs (which are called leafs)
So : the semantic is a mixture of words we have : words from tree (the upside) are mixed with root (the downside)
The effect is the same : We have something (data) spreading from an origin into finer and finer details -- from a stem (root) into branches and finally leaves
If you want : a plant is always somehow mirrored at the earth,s surface -- and "up" and "down" are just perspectives

#### Simpler ?

Drawers : You have big drawers and there you can put items - but you can also put other drawers with other items into the root drawers + And those drawers that are inside drawers can have more drawers with more drawers inside them -- infinitely

Example : There,s a house (branch) in a city (branch) in a country (branch) on planet Earth (branch) in the solar system (branch) in the Milky Way (branch) in the Universe (root) that has a kitchen (branch) that has a cupboard (branch) that has a drawer (branch) that has a box (branch) that has bread (leaf, a bread is no container) inside

### Trees in Flydeck are Flat

This is a tribute to the small smartphone screen : you have no room to the sides -- but usually tree views need wide screens (That,s because you usually need to indent every deeper branch of a tree to keep track of where you are)
That,s why Flydeck trees are flat - and that,s the reason why you can never see the whole tree in Flydeck -- you can just browse it branch by branch

### Some #deas

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

- *Cycling* when pressed multiple times (list size)
- *Dialing* when pressed : there is a small time window to move to another button in list (like old cellphones)
- Second function when *long pressed* (copy, paste, select all)
- *Unlock*/*Unarm* function (like delete)

### Tree Browser Hierarchy Control

When working with trees : you need to create, update, delete and move items

For a tree like TreeBrowser : where every item is a branch : one should be able to pick one branch and stick it somwhere else

For that : every branch (every branch is also an item in TreeBrowser) has its parent saved in itself -- that,s how branches are connected : only through that parent

The parent is written down in a certain syntax like : parentID/branchID/ItemParentID - separated with a slash /

With this notation : sticking one branch name (it is the ID written in small letters) into the other : an unambigous path is created which cannot be misinterpreted / like

Example :

"inventory/storage/box1/folderWithPaper" <- the item itself (eg "letterFromLawyer") is not mentioned in the path

#### Real Life Example

I have a path to my sock in my flat : flat/bedroom/cupboard/greenleftsock
Now I take it to the kitchen : flat/kitchen/washingmachine/greenleftsock

When you want to move an item or branch with items or a branch with many branches : you change the parent of just this branch - and all appended "children" of that branch move too / because only the direct parent of each item is stored

## AGNT

Agent chat missing use case for further development

## DATA

Data Management

Create and organize data on your smartphone and store it on your home server

### ListControl

At the top find the word "root" > this is the root for all of your data -- "root" keeps a list of your topmost categories where all your other stuff is included

Click on "root" shows the Keyboard and you can create a new item inside root -- Every item you create : can be parent of other items or be a leaf with no other items - and you can change this any time : An item that has a list of children always also has a content view that is shown when you click on the icon very right of each parent : It flips the view from showing all the items in a list to a view : that shows all the information about that item

On the "content" view of each item you can set id, change the label/name, change the parent and move it to another one, write some important text about that certain item and attach an image from your camera or filesystem of your smartphone

(root is a special case and only has listsize to change)

There are 4 more buttons with arrows :

With **Top/Down** you can change the order of the items in a list and 

with **left/right** you can change the page of the list if there are more items than you have set per page

### Navigator and Search

To encounter with bigger data : there is a text input always at the top where you can type an path directly

Activate the lens to use it for text search


## APPS

Data visualiszations / input forms

V2 being planning


## Settings

Useful app functions you rarely need

not supported yet

## Text Input Section

I like machine input

There is a custom Keyboard used as default : Klick the icon to the left below the input to open your smarthphone,s system Keyboard

### Features

#### Microphone

Browser API Speech recognition without the need to be online

- Triple Shift layears ! Numbers are when you press shift twice -- long-press shift caps locks
- Date/Timestamp insertion
- Cursor left/right / word select
- Copy/Paste/Select All as long press functions
- Emotes button switches whole keyboard > shift button has 3 layers again
