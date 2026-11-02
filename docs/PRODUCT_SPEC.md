# PRODUCT_SPEC.md

## 1. Positioning

Beli-style food logging and reviews, built for how India eats: Mumbai first, trusted people first, quick verdicts with optional depth, diet-aware, street-food-aware, rupee-priced, Hinglish-friendly.

Tagline-level pitch: Google Maps reviews, but from people you know, plus a food diary you will actually keep.

Problem:
- Zomato and Google reviews are noisy, gameable and from people whose taste you do not know.
- Friends and family already recommend places, but on WhatsApp where it gets lost.
- Nobody keeps a record of where they have eaten.

## 2. Users

- Foodie friend groups (college batches, hostels, offices)
- Families who trade recommendations (parents, kids, elders recommend differently)
- People new to Mumbai asking "where do I eat?"
- Local food explorers who want a logbook and friendly competition

## 3. Relationship model

Two people are in exactly one of three states, from the viewer's side:

```
FRIEND      mutual, both sides accept (like WhatsApp contacts)
FOLLOWING   one-way, no approval needed on public accounts, approval on private accounts
NOBODY      no connection
```

Rules:
1. Friend requires acceptance by both. An invite link is pre-consent from the inviter, so opening a valid link creates the friendship immediately.
2. A friend can also be followed, but FRIEND always wins as the label.
3. Following never makes someone a friend.
4. Groups (optional, Phase 3) contain only friends of the group owner.
5. Blocking removes all relationships both ways and hides both users from each other everywhere.

Account type: public (anyone can follow) or private (follows need approval). Default for new accounts: public.

## 4. Verdicts

Three values, one tap:
- Go: worth going.
- Skip: not worth it.
- Only for X: go only for a specific thing ("only for the misal"). X is a short free-text of up to 60 characters.

A visit has exactly one verdict. Users can visit the same place many times; each visit has its own verdict. On place pages, a person is represented by their most recent visible visit.

## 5. Visibility (per visit)

```
private     only me
friends     my friends (and chosen groups if audience groups are set, Phase 3)
followers   my friends and accepted followers
public      anyone (still hidden from people who blocked me or I blocked)
```

Defaults:
- Public account: followers. Private account: friends.
- Memory layer (photos, private note, companions, mood): private.
- The log sheet always shows, in words, who can see the entry before posting.
- On a private account, public and followers entries are visible only to accepted followers and friends.

## 6. Trust tiers and ordering (the heart of the product)

Every verdict is labelled with the author's relationship to the viewer, always visible, never hideable:

```
FRIEND     solid accent colour, bold name, group tag if any
Following  muted colour
Public     grey, smaller card
```

Tiers are disjoint: for a given viewer an author belongs to exactly one tier (Friend, else Following, else Everyone).

Ordering on a place page:
1. Friends, newest first
2. Following, higher taste match first, then newest
3. Everyone, collapsed by default ("Show 12 more"), newest first

Summary block on a place page (counts per author, using each author's most recent visible visit):

```
FRIENDS    3 went   2 Go, 1 Skip
FOLLOWING  4 went   3 Go, 1 Skip
EVERYONE   38 went  26 Go, 12 Skip
Top dish (friends): Misal Pav
```

If any "Only for" verdicts exist they show as a third count ("2 Go, 1 Only for, 1 Skip").

Rule: NEVER compute or show a blended average across tiers. "Everyone" counts include only public-visibility entries from non-private accounts, and exclude authors who are already in the Friend or Following tier for this viewer.

Filter toggle: [ Friends ] [ Friends + Following ] [ Everyone ]. Default: Friends + Following. A user with no friends sees a nudge: "Add friends to see who you trust here".

## 7. Review layers (short by default, depth on tap)

```
Layer 0  verdict (required): Go / Skip / Only for X
Layer 1  quick details (optional chips): best dishes, price per head, occasion tags
Layer 2  full review (optional, "Add more"): free note, per-dish verdicts, photos
Memory   private extras on the same visit: companions, occasion, private note, mood, photos
```

Collapsed card: name + tag, verdict, best dish, rough price and tags. Tap expands to note, dish list, photos.

## 8. India-specific requirements

All eight are in the product. Only the verdict is mandatory in the log flow.

1. Diet flags (veg, jain, halal, egg) are first-class on places and in profile preference; used as filters and badges, not review fields.
2. Street food and thelas with no listing: add a place by dropping a pin (Phase 5).
3. Dish-level verdicts ("go for the misal, skip the sev puri").
4. Price per head in rupees with simple labels: budget / mid / splurge.
5. Occasion tags: family dinner, date, group of 10, late night, post-exam, pure-veg family.
6. Family angle: Groups like Family and College gang (Phase 3).
7. Regional context: area and suburb auto-resolved from the pin; Mumbai-specific cuisine tags (Gujarati thali, Udupi, Irani cafe, Parsi, Malvani, street food).
8. Language: notes accept Hinglish with no restrictions; UI copy has light Hinglish touches (for example "Aap-ne kaisa paaya?"). Voice notes later.

## 9. Discover (Instagram-style, Phase 2)

Find people by: name or username, area, food type, diet, taste match, friends-of-friends, suggestions after logging a place. Taste match is shown only after 5 or more shared places. Discover is its own tab and never mixes into the Friends feed.

## 10. Groups (optional, Phase 3)

Named buckets of friends: Family, College gang, custom. Create, invite by link, owner and member roles. A visit can be shared to specific groups ("Family says Go"). Groups can have their own feed and an opt-in leaderboard. Family-type groups default to private with no leaderboard.

## 11. Diary and logbook (Phase 5)

Every visit is already a diary entry. Views: timeline, map of pins across Mumbai, "On this day", year recap. Logbook counts: places by area, areas covered, cuisines tried. Backdating is allowed (flagged); backdated visits count toward all-time only.

## 12. Exploration score and badges (Phase 6)

Score = number of distinct places visited in a period, with caps. Details and the exact rules are in SCORING_BADGES.md. Two ideas kept separate:
- Leaderboard answers "who explored most".
- Badges answer "whose word should I trust" (behaviour badges) and "what have you explored" (exploration badges).

Boards are scoped to friends, groups or followed people. No global board.

## 13. Handoff to Swiggy / Zomato

After viewing or logging a restaurant or cafe, a button offers "Find on Swiggy" / "Find on Zomato" as search links built from name and area. Hidden for street stalls and when we are not confident. Details in PLACES_DATA.md.

## 14. Cold start and empty states

- A brand-new user with zero friends must still get value: Following and Everyone tiers, Discover, and a clear nudge to invite friends.
- Launch to one tight cluster (about 30 people) first.
- Every empty screen has one clear next action (invite friends, log your first place, follow 5 people).

## 15. Non-goals (for now)

Native apps, ordering or delivery in-app, payments, restaurant-owner accounts, ads, a Mumbai-wide leaderboard, AI recommendations, multi-city.

## 16. Locked decisions (defaults chosen; change via docs/DECISIONS.md)

```
Chain cap                  max 3 outlets per brand count per month
Daily cap                  max 5 new counted places per day
Backdated visits           count toward all-time only
Diary memory default       private
Entry default visibility   followers (public acct), friends (private acct)
Friend creation            request + accept; invite link = pre-consent
Leaderboards               opt-in per group; friends board on by default; no global board
Follow                     included from Phase 1
Auth                       Google first; phone OTP in Phase 7 if affordable
Account default            public
```

## 17. Open decisions for the human

- Final name and branding.
- Monetisation (affiliate links, premium logbook features, restaurant-side tools). Nothing is built for this yet.
- Whether Mumbai-wide area boards (not a global board) ever make sense.
- Whether friends see each other's friends-only diary by default or only what each person shares (current default: only what each person shares).
