# Riggs & Smith: Wild Dice West

## Complete Game Concept for the Flydeck App

Status: product direction for a small, buildable game  
Client language: English  
Primary platform: Flydeck V2 on a phone-sized viewport

This document develops the first brainstorm in `readme.md` into a coherent game. It borrows the strongest structure from the main *John Riggs & Lucky Smith* design: prepare at Home, choose a target, execute a pressured operation, cash out before control collapses, and carry consequences into the next attempt.

The Western game is its own smaller interpretation. It does not need to reproduce the main game's detailed rig simulation.

---

## 1. Product Definition

*Wild Dice West* is a compact push-your-luck roguelite about a watchmaker who cheats at dice without appearing to cheat.

The player is John Riggs, an ordinary workshop hand who finds a peculiar die in the street. At first he supplements his wages at small street games. Over time he learns sleight of hand, crafts loaded dice and hidden mechanisms, travels to richer tables, and attracts increasingly dangerous attention.

Each night has three readable decisions:

1. Which table is worth visiting?
2. How strongly should Riggs bend the next roll?
3. Should he play one more hand or leave with the money?

The game should feel like cheating fate through preparation and nerve, not like selecting upgrades and watching an automatic result.

--sean
Ich stelle mir einen dev-mode vor: in dem ich den zeiger beim würfeln nicht mehr "bedienen" muss (nachdem er fertig programmiert wurde), sondern mit einem roten/orangenen/normalen button das ergebnis bestimmen kann
--

### Design pillars

1. **One physical-feeling input** — choosing a face and releasing the roll needle is the central table interaction.
--sean
Lets do it like this:
The smallest table is 2 dice, where you can bring 1 of your own first
The "Loser,s Die" gives you a better chance on the 1 (which is adequat, I don,t know, let,s start with 1/6 +20% = 33% on the 1 while others lose 1/6 -4% - you know what I mean/ right ?), so with 2 dice and the "Loser,s Die" you would bet on numbers between 2 and 7, right ?
--
2. **Power leaves evidence** — stronger control of a roll creates stronger suspicion.
--sean
Man wiederholt das Spiel an einem Tisch bis man genug hat. Kann man Geld setzen ?
Das Würfeln geht so: Man würfelt 3 mal und versucht, die Ansage zu treffen. Trifft man, kann man den Wert des Tisches verdoppeln. Es gibt keinen anderen Geldeinsatz. Der Tisch bestimmt: wie hoch der Gewinn ist
Im Store könnte es Tische geben: die lohnender, und andere, die einfacher sind, vielleicht manche: die ein höheren Suspicion erlauben, wo aber vielleicht ebenso betrogen wird, ein unbekannter Würfel dabei ist
--
3. **Preparation creates options** — dice, tools, consumables and skills change the same simple interaction instead of adding unrelated minigames.
--sean
Es gibt Tabs im UI in der Reihenfolge wie man nach einer Nacht arbeitet:
- Nächste Tischoptionen anschauen
- Verdientes Geld im Shop ausgeben
- An Würfeln schrauben und Set für die Nacht festlegen
- Eine Übersicht vielleicht mit "Start"
--
4. **Cash-out is a real decision** — money is only safe after Riggs leaves the table and invests it.
5. **Loss creates the next story** — getting caught ends a run, but workshop knowledge and tools open new beginnings.
6. **Short runs, bounded growth** — the player can finish a run and see most systems without an endless grind.

---

## 2. The Three Nested Loops

### Hand loop — about 10–20 seconds

1. The table reveals the stake and the result Riggs needs.
2. The player optionally selects a different desired face.
3. The player presses and holds `ROLL`.
4. A moving needle travels through the control band.
5. The player releases `ROLL`.
6. The die resolves, money and suspicion change, and the result is explained.
7. The player chooses `ONE MORE` or `LEAVE`.

### Night loop — about 2–5 minutes
--sean
Keine weitere "Night Loop", nur 1 tisch pro nacht
Es soll spannend sein: den besten run für einen tisch zu konstruieren, die nadel zu balancieren wird oft geschehen, wenn man nicht zu viel Glück hat.
Genau: wir machen ein bisschen wie bei Roulette :
- Man kann auf Summen setzen, mit grosser Chance
- Oder auf das Ergebnis auf einem einzelnen Würfel mit kleinerer Chance
Das ganze Kapitel enfällt
--
1. Choose one available table from the map.
2. Select a die and at most one consumable.
3. Play several hands while suspicion and nerves rise.
4. Leave voluntarily with the night's winnings, bust, or get caught.
5. Return to the workshop for a short result and preparation phase.

### Run loop — about 30–60 minutes

1. Begin with the Found Die, a basic coat and a poor workshop.
2. Win money, gain run XP and discover materials.
3. Buy or craft better gear and choose temporary level perks.
4. Move from street games toward high-value regional tables.
5. Defeat the final table by reaching its payout objective and escaping.
6. A catch ends the run. Carried cash and ordinary dice are lost; permanent workshop progress remains.

--sean
Wird man bei einem Run erwischt: Muss man wieder bei den kleinen Tischen anfangen. Dafür behält man immer den Loser's Die, auch wenn man ihn dabei hat
Die Werkstatt muss natürlich ein Lager haben, das auch unantastbar ist
--

The first successful complete run should be possible in roughly 8–12 nights. A failed run is often shorter.

--sean
Den Top-Table zu schlagen, gewinnt das Spiel.
Ein Tisch verlangt ein gewisses Buy In, das man sich am Anfang noch nicht leisten kann für die grossen Gewinne
Das verfügbare Geld begrenzt hauptsächlich den Forschritt, so ist es möglich, bei gutem Spiel eine Runde früher zu beenden
Die Erfahrung bügelt schlechten Skill beim Umgang mit der Nadel beim Würfeln aus. Wird man mit der Zeit besser, sollte man entsprechend knapper spielen und früher zum Spiel kommen können
--

---

## 3. Simple Player Input

The phone interaction stays intentionally small.

### At a table

- Tap one of six die faces to select the desired result. The game preselects the useful face, so a new player can ignore this choice.
- Press and hold the large `ROLL` control.
- Release it to stop the control needle.
- Tap `ONE MORE` or `LEAVE` after the result.
- A prepared consumable appears as one optional button above `ROLL` and can be used once that night.

No screen requires simultaneous controls, drag precision, a virtual joystick, or more than one moving meter.

### In the workshop

- Tap a card to inspect it.
- Tap once to equip, buy, craft, upgrade or select.
- A long press is never required.
- Comparisons show only the values that change.

### Accessibility and input alternatives

- `ROLL` also works with pointer, keyboard and switch-style input.
- A tap-tap option can replace hold-and-release: first tap starts the needle and second tap stops it.
- Motion can be reduced without changing timing.
- Color is never the only distinction between safe, risky and dangerous zones.
- The needle has a short optional rhythm sound and vibration cue, both independently disabled.

---

## 4. The Roll Mechanic

The roll meter is the only skill minigame in the first version.

### Control band

The meter contains four semantic zones:

| Zone | Roll influence | Suspicion | Meaning |
| --- | ---: | ---: | --- |
| Clean | none | none | An honest-looking roll |
| Nudge | small | low | The desired face becomes more likely |
| Sweet spot | strong | medium | The prepared die works as intended |
| Tell | very strong or unstable | high | The trick is effective but visibly wrong |

Landing outside the colored zones does not mean an automatic loss. It means Riggs failed to influence an otherwise fair roll. The die still resolves, preserving uncertainty.

### Resolution model

The selected face receives additional probability weight based on:

- the landed control zone
- the equipped die's Control
- relevant tool and perk bonuses
- Riggs's current Nerve
- the table's Scrutiny

The final face is still sampled randomly. Even a perfect release does not guarantee a six unless a rare effect explicitly says so.

This is important: the player controls luck but never deletes it.

### Needle movement

The needle is made from a few readable waves:

- **Hand tremor** is the slow base movement.
- **Heartbeat** grows with current Nerve pressure and table danger.
- **Die wobble** comes from powerful, damaged or low-quality dice.
- **Table pressure** adds a new rhythm at advanced tables.

Early movement is nearly periodic and learnable. Later movement combines two or three frequencies, but the sweet spot remains visually readable.

### Fairness rules

- The meter's visible result is authoritative; hidden latency must not move the release afterward.
- Every suspicion gain names its main cause, such as `Perfect six streak +8` or `Black Six tell +5`.
- A miss can be unlucky, but it cannot secretly be converted into a catch.
- Tables communicate their stake, scrutiny, expected payout and recommended gear before entry.

---

## 5. The Table Game

The first build uses one fictional dice game called **High Hand**. Different tables change its stakes and rules without requiring separate minigames.

### Basic High Hand

1. The dealer rolls or reveals a target from 1–6.
2. Riggs must roll that number or higher.
3. Higher targets pay more because fewer faces can beat them.
4. A natural exact match pays a small bonus.
5. Winning increases the pot; losing removes the current hand's stake.

The game automatically highlights the statistically useful desired face. Experienced players may choose another face to pursue an item trigger, reduce suspicion, or set up a streak.

### Table variants

Variants reuse the same input:

- **High Hand** — roll at or above the target.
- **Dead Match** — only an exact face wins; high payout and high scrutiny.
- **Two Bones** — roll two equipped dice in sequence; their total must reach the target.
- **Dealer's Tell** — the target is briefly hidden during the needle movement.
- **Snake Eyes** — low faces pay best, making high-face loaded dice less useful.

Only High Hand is required for the first playable slice. The other variants are later content, not additional core systems.

### Push-your-luck structure

After every hand, the player sees:

- money currently carried
- next stake and possible payout
- current Table Suspicion
- current Nerve pressure
- one sentence explaining the last result

`LEAVE` banks the night's carried money into the workshop stash. `ONE MORE` increases the next stake and slightly raises passive scrutiny. The profitable choice should become emotionally harder as the table grows suspicious.

---

## 6. Pressure and Detection

Only three resources need to be visible during play.

### Carried Cash

Money won tonight. It is lost on a catch and becomes safe only after leaving the table.

### Table Suspicion

A 0–100 meter local to the current night.

Suspicion rises through:

- strong control zones
- improbable winning streaks
- dirty or visibly modified dice
- repeating the same desired face
- using a consumable in view
- staying for additional hands

Suspicion can fall slightly through:

- honest-looking rolls
- accepting a loss
- perks that improve misdirection
- leaving the table

At 70, the dealer becomes watchful and the needle gains pressure. At 90, the player receives a clear final warning. At 100, Riggs is caught.

### Nerve

A 0–100 operational pressure meter. Nerve rises with stakes, suspicion, losses and long nights. It makes the heartbeat component of the needle stronger.

Nerve can be reduced by experience, a deliberate honest roll, or a prepared substance. It resets after the night, but some injuries or run events can make the next night start above zero.

### Law Heat

Law Heat is a run-level resource shown in Home and on the map, not another live table meter. It rises after conspicuous nights, illegal purchases and escapes. High Law Heat changes patrols, shop prices and target availability. At maximum, the next catch becomes a workshop raid.

This preserves the main game's distinction between immediate venue suspicion and long-term law attention without crowding the table screen.

---

## 7. World Progression

The world is a vertical route through five regions. Each region contains three venues, and each venue contains three table ranks. This creates multiple progression layers while the visible map remains a short list of cards.

| Region | Levels | Character | New pressure |
| --- | ---: | --- | --- |
| Dust Row | 1–2 | Street corners and labor camps | Teaches the roll and cash-out |
| Coyote County | 3–4 | Saloons and back-room games | Dealers remember repeated tricks |
| Iron Trail | 5–6 | Railway camps and moving cars | Faster rhythm and limited shop access |
| Silver Bend | 7–8 | Riverboats and mining houses | Fragile gear, searches and rule variants |
| Gilded Frontier | 9–10 | Invitation rooms and the Governor's table | Mixed rhythms, high scrutiny and final objective |

### Venue structure

Every region offers:

- **Safe table** — low payout, low scrutiny, reliable recovery.
- **Skilled table** — a rule variant or gear check with good value.
- **Boss table** — a named opponent and a payout objective that unlocks the next region.

The player chooses from only 2–4 currently relevant targets. Locked future tables may be visible as silhouettes, but the whole world is not presented as a large explorable map.

### World advancement

A boss table is cleared by banking its required payout in one night and leaving uncaught. Clearing it unlocks the next region for the current run.

Previously cleared regions stay available as fallback income. Their payouts do not scale upward indefinitely, preventing safe early farming from becoming the dominant strategy.

---

## 8. Player Levels and Skills

The game separates temporary run growth from permanent workshop growth.

### Run Level: Riggs's Nerve, levels 1–10

Run XP comes from completed nights, first-time table clears and risky cash-outs. The level resets when a run ends.

Each level offers one of three compact perks. The choices draw from three paths:

- **Cool Hand** — steadier needle, slower Nerve growth, stronger recovery after a loss.
- **Showman** — lower suspicion, better streak camouflage, safer consumable use.
- **Mechanist** — stronger die effects, safer damaged gear, one additional modification option.

Example perks:

- `Working Rhythm`: the first hand each night has 20% less heartbeat.
- `Lose With Grace`: an honest loss removes 8 Suspicion once per night.
- `Palmed Switch`: once per night, replace the selected die after seeing the target.
- `Steady Fingers`: widen the Sweet Spot slightly.
- `Familiar Weight`: the Found Die gains +1 Control.
- `Under the Table`: using the prepared consumable causes less Suspicion.

Perks change understandable rules rather than adding active buttons. A run ends at level 10; XP cannot grow forever.

### Permanent Workshop Rank: ranks 1–5

Workshop Insight survives failed runs and comes mainly from first discoveries, first boss attempts and completing challenges. Repeating the safest table gives little or no Insight.

Each rank unlocks capabilities rather than large permanent stat bonuses:

1. **Bench** — inspect dice and craft basic weights.
2. **Fine Tools** — add one modification to a die.
3. **Hidden Cabinet** — preserve one chosen run item after a catch.
4. **Precision Bench** — craft quality III items and repair rare dice.
5. **Master's Wall** — unlock challenge starts and the final die recipes.

This gives failed runs meaning without making early tables trivial.

---

## 9. Items and Their Levels

Items use a small, consistent level system.

### Quality tiers

All craftable dice, tools and consumables use quality I–V:

| Quality | Name | World position |
| --- | --- | --- |
| I | Crude | Dust Row |
| II | Worked | Coyote County |
| III | Fine | Iron Trail |
| IV | Masterwork | Silver Bend |
| V | Notorious | Gilded Frontier / boss rewards |

Quality improves the item's main strength and often reduces its flaw. It does not remove the item's identity. A quality V Black Six is still loud; it is simply more controllable than a crude one.

### Dice

The player normally equips exactly one active die. The later Two Bones table variant temporarily opens a second slot because its rules require two dice; ordinary High Hand never asks the player to manage two active dice. Every die has four visible properties:

- **Control** — strength of influence in Nudge and Sweet Spot.
- **Tell** — suspicion produced when it works.
- **Stability** — resistance to difficult needle movement and damage.
- **Trick** — one unique rule.

Core dice:

| Die | Identity | Trick |
| --- | --- | --- |
| Found Die | Weak, clean, unbreakable fallback | Always returns after a run |
| Needle Glass | Fast and precise, but fragile | Larger Sweet Spot; can crack in Tell |
| Lead Heart | Heavy, slow and powerful | Strong influence on low faces |
| Black Six | Dirty high output | Greatly favors six; creates evidence |
| Split Bone | Unstable double-purpose die | Selected face and opposite face gain weight |
| Saint's Mercy | Rare defensive die | First suspicious perfect roll looks honest |

The Found Die plays the role of the main game's Loser's Die: modest, familiar and impossible to lose permanently.

### Die modifications

A die may hold zero to two modifications depending on workshop rank. Mods create tradeoffs:

- `Lead Pip`: stronger chosen high face, more Tell.
- `Hollow Core`: faster needle response, less Stability.
- `Hair Spring`: reduces heartbeat influence, can jam when damaged.
- `False Seam`: lower inspection risk, slightly weaker Control.
- `Magnet Pin`: powerful near a prepared table tool, otherwise inert.

The UI shows the resulting four die properties; players do not need to calculate hidden material formulas.

### Tools

Tools stay in the hidden workshop between runs. They unlock actions or improve item quality:

- hand drill
- fine file
- jeweler's loupe
- small scales
- tweezers and pliers
- watchmaker's lathe
- improvised microscope
- third hand

Most tools have three workshop grades rather than five loot versions. Upgrading a tool expands recipes or reduces crafting waste.

### Consumables

Only one consumable can be prepared per night:

- `Whiskey`: reduces Nerve now, increases needle drift later.
- `Snake Oil`: widens Nudge for three hands; uncertain side effect.
- `Chewing Tobacco`: slows heartbeat briefly, raises passive suspicion.
- `Sleeping Powder`: lowers table scrutiny after a setup event; very high Law Heat if discovered.
- `Lampblack`: temporarily hides a die's seam; one inspection only.

Real substances are presented as risky period-fiction mechanics, not as medical advice or unconditional upgrades.

### Clothing and presentation

One outfit slot controls Riggs's visible cover identity. It primarily changes access and suspicion, not combat-style armor stats:

- worker's coat
- traveling salesman suit
- watchmaker's waistcoat
- riverboat evening coat

---

## 10. Economy and Persistence

### Money states

- **Carried Cash** is won during a night and can be lost before leaving.
- **Loose Cash** is available at Home during the current run. A catch takes it.
- **Invested Value** consists of workshop tools, permanent unlocks and one item protected by the Hidden Cabinet. It survives.

The player cannot create a risk-free bank account. Safety comes from investing before greed or Law Heat ends the run.

### Materials

Basic materials survive because they are hidden behind the workshop wall. Rare contraband materials are lost in a full raid unless protected.

Materials should remain a short list:

- bone and hardwood
- lead and brass
- glass and stone
- springs and magnets
- chemicals and powders

Recipes use at most three material types. The player sees possible output before crafting.

### Shops

Home offers two small stores:

- **General Store** — legal tools, clothes and basic supplies; safe and predictable.
- **Back Room** — modified dice, rare materials and substances; better stock but adds Law Heat.

Each shop displays 3–5 relevant offers. Stock refreshes after a night, not through a manual reroll button.

---

## 11. Roguelite Failure and Recovery

### Catch

At 100 Table Suspicion, Riggs is caught. The result view states who noticed him, why suspicion peaked and what was lost.

A normal catch ends the run:

- all Carried Cash and Loose Cash are lost
- ordinary purchased dice and consumables are confiscated
- current Run Level and world access reset
- the Found Die returns
- workshop tools, Workshop Rank, recipes and common stored materials remain
- the Hidden Cabinet preserves one selected eligible item once unlocked

Rare escape effects can convert a catch into an escape, but they are explicit one-use resources. They never make the third warning ambiguous.

### Voluntary run completion

Beating the final Gilded Frontier table and leaving with its objective completes the run. The score records:

- total money banked during the run
- highest region reached
- nights survived
- catches escaped
- final build summary

After completion, the player may retire the run or play one optional high-score night with maximum scrutiny.

### Recovery guarantee

Every new run always has:

- the Found Die
- access to Dust Row's safe table
- one basic outfit
- enough workshop capability to make progress without luck-based drops

No loss may make the next run unwinnable.

---

## 12. Screens and Information Architecture

The app needs six screen states. They are states of one compact handheld game, not separate desktop-style applications.

### Start

- `CONTINUE` or `NEW RUN`
- latest score and best score
- small title illustration

### Home / Workshop

The central hub contains four large actions:

- `MAP`
- `DICE BENCH`
- `STORE`
- `SKILLS`

The persistent top strip shows Day, Loose Cash, Law Heat and Run Level. The currently equipped die is always visible.

### Map / Table Select

Show 2–4 table cards. Each card contains:

- stake
- likely payout
- scrutiny
- rule variant
- recommended quality
- boss objective where relevant

The player taps one card and then `VISIT TABLE`.

### Loadout

Shown as a small confirmation sheet before travel:

- die slot 1
- second die only when the selected table requires one
- one consumable
- outfit

The game remembers the last valid loadout. The player can usually confirm with one tap.

### Table

Portrait layout from top to bottom:

1. opponent and hand objective
2. Carried Cash, Suspicion and Nerve
3. large die result area
4. control band and needle
5. face selector
6. optional consumable and large `ROLL` button

After resolution, `ONE MORE` and `LEAVE` temporarily replace the roll controls.

### Result / Catch

Use the same result layout for success, voluntary exit and catch:

- headline outcome
- money won or lost
- suspicion and Law Heat changes
- XP and discoveries
- damage or confiscation
- one primary `BACK TO WORKSHOP` or `BEGIN AGAIN` action

### UI constraints

- One primary action per state.
- No more than three always-visible meters at the table.
- Advanced numbers live in item inspection, not in the play screen.
- No inventory grids smaller than a comfortable phone tap target.
- Important choices use cards with plain-language consequences.
- Back navigation never silently abandons a night or purchase.

---

## 13. Presentation

### Visual direction

- Handheld-console feeling at roughly Game Boy visual density.
- 4–8 color Western sepia palette.
- Large pixels, hard-edged panels and tiny mechanical ornaments.
- Dark brown shadows, parchment midtones, brass highlights, one danger red and one cool night accent.
- The UI stays sharp at any phone resolution; pixelation is an art treatment, not a low-resolution canvas that makes text unreadable.

### Animation

- Needle and die are the most animated objects.
- Small gear motion marks workshop actions.
- Suspicion reacts with a brief eye or dealer-hand cue.
- Avoid long scene transitions; most changes complete in under 300 ms.

### Sound

- watch tick for timing
- heartbeat layered into dangerous tables
- wood, bone and glass die sounds by material
- short saloon ambience loops
- silence immediately before a high-suspicion result

### Tone and English copy

Copy is short, dry and slightly legendary.

Examples:

- `Luck is a mechanism nobody has opened yet.`
- `A clean loss buys more time than a dirty win.`
- `Black Six hits hard. The room remembers.`
- `Leave rich, or roll once more.`

---

## 14. First-Time Experience

The opening teaches through one protected night.

1. A short panel shows Riggs finding the Found Die.
2. Home highlights only `MAP`.
3. Dust Row offers one street table with no lasting penalty.
4. The game preselects the useful face and teaches hold/release.
5. The player repeats until winning one hand and choosing `LEAVE`.
6. Back Home, the first payout opens a three-way purchase choice:
   - improve the Found Die for reliability
   - buy Needle Glass for precision and fragility
   - buy a watchmaker tool that improves active control
7. Full Home navigation opens.

The three offers should be comparable foundations rather than a correct option and two traps.

---

## 15. Content Plan

### Minimum playable slice

Build only enough content to prove the loop:

- Start, Home, Map, Loadout, Table and Result states
- High Hand rules
- one region with three tables
- Found Die, Needle Glass and Black Six
- one die modification
- three tools
- three consumables
- Run Levels 1–4 with nine possible perks
- Workshop Ranks 1–2
- one catch ending and one boss objective
- deterministic save/resume between hands and screens

The slice succeeds when a player can prepare a build, feel that build change the roll, choose to overstay, lose a run, and immediately understand why another run could go better.

### Complete small game

- five regions
- 15 venues / 25–35 table configurations
- six core dice with five quality tiers
- 10–15 die modifications
- 8–10 tools
- 8 consumables
- four outfits
- Run Levels 1–10
- Workshop Ranks 1–5
- five named bosses
- daily-seed challenge and local highscores

### Explicitly outside the first game

- free walking or an explorable open world
- combat
- multiplayer or real-money gambling
- many unrelated casino minigames
- complex character dialogue trees
- procedural item affix spam
- live-service progression

---

## 16. Balance Direction

The game should be tuned around readable tradeoffs rather than linear rarity power.

- Higher tables increase both payout and scrutiny.
- Stronger dice increase influence and Tell.
- Better quality makes an identity safer; it does not erase its weakness.
- Player skill improves average results but cannot guarantee them.
- A cautious build can finish a run more slowly.
- A dirty high-output build can finish faster but should fail more often.
- Taking `ONE MORE` must usually improve expected money while worsening run survival.
- The safe fallback table pays enough to recover but not enough to dominate progression.
- Permanent workshop unlocks increase choice and consistency more than raw payout.

Useful test metrics:

- average hands before cash-out or catch
- percentage of nights ended voluntarily
- suspicion gained per dollar by die family
- run completion rate by first purchase
- recovery time after losing a run
- use rate of each perk and item
- frequency with which the player chooses `ONE MORE` above 70 Suspicion

---

## 17. Behavior Contracts

### Roll control

The player can visibly influence a random die through one timing action.

Acceptance checks:

- A player can select a desired face and complete a roll with hold/release or tap-tap input.
- Better meter zones measurably increase the selected face's probability.
- No normal meter zone guarantees the selected face.
- The result view explains the main influence and suspicion changes.

### Cash-out

The player can secure a night's winnings before being caught.

Acceptance checks:

- After each resolved hand, the player can leave or continue.
- Leaving transfers Carried Cash to Loose Cash and ends the night.
- Continuing exposes a larger next opportunity and increased pressure.
- A catch before leaving removes Carried Cash.

### Build identity

Different preparations change the same table interaction in recognizable ways.

Acceptance checks:

- Found Die, Needle Glass and Black Six create visibly different Control, Tell and needle behavior.
- Equipping an item previews its relevant benefits and costs.
- At least one cautious and one aggressive build can clear the first region.
- No first purchase is universally best across the first three tables.

### Roguelite continuity

Failure resets the run while preserving meaningful workshop development.

Acceptance checks:

- A catch clearly lists lost and retained state.
- Run Level, world access, money and ordinary run gear reset.
- Workshop Rank, tools, recipes and the Found Die remain.
- A new run always has a viable safe table.

### Bounded progression

The player can reach a recognizable end without infinite scaling.

Acceptance checks:

- Run Level stops at 10 and Workshop Rank stops at 5.
- The world has a final table and a completion result.
- Early-table payouts do not scale indefinitely.
- Completing a run creates a score and unlocks replay options rather than another mandatory power tier.

---

## 18. Open Decisions for Prototyping

These points should be decided through play rather than expanded in prose first:

1. Whether face selection adds enough strategy to justify its presence after the game preselects a useful face.
2. Whether Nerve needs its own meter or can be expressed entirely through the needle and heartbeat.
3. The exact probability weight produced by each control zone.
4. How many hands create the best average night length.
5. Whether the second die resolves sequentially or combines into one animated roll.
6. Whether one protected item is enough to make late-run catches painful but replayable.

The first prototype should answer items 1–4 before adding more regions, dice or table variants.
