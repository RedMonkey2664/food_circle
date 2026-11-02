# UI_UX.md

Mobile first. Design at 390px wide. Desktop is a centred column (max 480px) for now; do not build a separate desktop layout.

## 1. Principles

1. The relationship label is part of every verdict. Friends look unmistakably different from strangers.
2. The log flow is a one-thumb, 10-second action. Everything beyond the verdict is optional.
3. One clear next action per screen, especially on empty states.
4. Text plus colour for meaning. Never colour alone.
5. Warm, local, friendly. Light Hinglish touches in copy where it feels natural; never forced.
6. Fast: skeletons not spinners, optimistic updates, lazy-loaded maps and photos.

## 2. Design tokens (Tailwind theme)

```
Colours
  bg            #FFFBF5   cream background
  surface       #FFFFFF   cards
  ink           #1F1B16   primary text
  muted         #6B635A   secondary text
  line          #E9E1D6   borders
  primary       #D9480F   spice orange (buttons, FRIEND tag)
  on-primary    #FFFFFF
  go            #1E8E4E
  skip          #C92A2A
  onlyfor       #B7791F
  following-bg  #E7EEF7   following-fg #2B4C7E
  public-bg     #EFEFEF   public-fg  #555555
  warn          #B54708

Type
  UI       Inter (system fallback)
  Display  Fraunces (headings, big numbers)
  Sizes    12 / 14 / 16 / 18 / 22 / 28
  Body 16 minimum on inputs (prevents iOS zoom)

Shape and space
  radius card 14px, button 12px, pill 999px
  4pt spacing grid, page gutter 16px
  touch target min 44x44px
  motion 150ms ease-out, respect prefers-reduced-motion
```

Dark mode is later. Build with CSS variables so it is easy to add.

## 3. Core components

```
VerdictButtons    three large buttons: GO, SKIP, ONLY FOR..; icon + text + colour
                  selecting ONLY FOR reveals a one-line input (max 60 chars)
RelationshipTag   FRIEND / Following / Public, always with text
VerdictCard       author, tag, group tag, age, verdict, best dish, price/tags
                  collapsed by default (Phase 4 adds expand)
TierSummary       three rows (Friends / Following / Everyone), separate counts
PlaceHeader       name, area, type, DietBadges
DietBadges        Veg / Jain / Halal / Egg, icon + text
VisibilityPicker  segmented: Only me / Friends / Followers / Public, with a plain
                  sentence below: "Visible to your 12 friends and 48 followers"
LogSheet          bottom sheet, 2 steps (verdict, optional details)
BottomNav         Home, Discover (Phase 2), + Log (centre), Diary (Phase 5), Profile
PersonRow         avatar, name, username, relationship button
EmptyState        illustration-free: icon, one sentence, one primary button
```

## 4. Screens

### 4.1 Login and onboarding

```
+--------------------------------+
|           Food Circle          |
|  Eat where your people eat.    |
|                                |
|  [ Continue with Google ]      |
+--------------------------------+
```

Onboarding (single page, short steps): username, name, home area, diet preference chips, account type (Public / Private, public pre-selected with a one-line explanation), default visibility. Phase 2 adds "Follow 5 people".

### 4.2 Home feed

```
+--------------------------------+
| Food Circle            (bell)  |
| [ Friends ] [ Following ]      |
|--------------------------------|
| Rahul [FRIEND] [Family]   2d   |
| Britannia & Co., Ballard Estate|
| GO - Berry Pulao               |
| ~Rs 450 | Family               |
|--------------------------------|
| Meera [Following]         5d   |
| Kyani & Co., Marine Lines      |
| SKIP - too oily                |
+--------------------------------+
| Home  Discover  [+]  Diary  Me |
+--------------------------------+
```

Empty (no friends): "Your friends' picks will show up here." + [Invite friends on WhatsApp] + [Find people to follow].

### 4.3 Search

Search input at top (autofocus), results list with name, area, type, diet badges, and a tiny circle hint when available ("2 friends went"). "Can't find it?" row at the bottom: Phase 1 shows a short note that adding places is coming soon (nothing is stored); Phase 5 turns it into "Drop a pin". If the Phase 0 seed check shows poor coverage, the human may move pin-drop earlier.

### 4.4 Place page (the main screen)

```
+--------------------------------+
| <  Kyani & Co.                 |
| Marine Lines | Irani cafe      |
| [Veg-friendly] [Egg]           |
|--------------------------------|
| FRIENDS     3 went             |
|   2 Go, 1 Skip                 |
| FOLLOWING   4 went             |
|   3 Go, 1 Only for             |
| EVERYONE    38 went  (tap)     |
|   26 Go, 12 Skip               |
|--------------------------------|
| [Friends] [Friends+Following]  |
| [Everyone]                     |
|--------------------------------|
| Rahul [FRIEND] ...             |
| Meera [Following] ...          |
| Show 12 more                   |
|--------------------------------|
| [ I ate here ]                 |
| [ Find on Swiggy ] (if shown)  |
+--------------------------------+
```

Rules: the three tier rows are never merged or averaged. Everyone tier is collapsed by default. Friend cards use the solid primary tag and a slightly stronger card border; Public cards are smaller and grey. "I ate here" is a sticky bottom button.

### 4.5 Log sheet

Step 1 (required):

```
+--------------------------------+
| Kyani & Co.        (change)    |
| Aap-ne kaisa paaya?            |
|                                |
| [  GO  ] [ SKIP ] [ ONLY FOR ] |
|                                |
| Visible to: Followers  (edit)  |
|   your 12 friends + 48 followers|
+--------------------------------+
```

Tapping a verdict saves immediately. Then step 2 slides in with a success message:

```
| Logged. Thanks!                |
| Add details? (optional)        |
| Best dish: [Berry Pulao] [+]   |
| Per head:  Rs 200 --o-- 800    |   Phase 4
| Good for:  [Family] [Date] ... |   Phase 4
| [ Done ]            [ Add more ]|
```

In Phase 1 step 2 contains only "Done". It must be possible to dismiss at any time without losing the logged visit.

### 4.6 Profile

Header: avatar, name, username, bio, home area, counts (visits, areas, followers, following). Relationship buttons by state:

```
Stranger     [Follow] [Add friend]
Following    [Following v] [Add friend]
Request sent [Requested]
Friend       [Friends v]   (menu: unfriend, mute, add to group, block, report)
Self         [Edit profile]
```

Below: recent verdicts visible to the viewer (RLS-filtered). Phase 6 adds level and badges.

### 4.7 Friends

Tabs: Friends, Requests (incoming and outgoing), Find. Find has search by username and the invite-link block with [Share on WhatsApp] and [Copy link].

### 4.8 Discover (Phase 2)

```
+--------------------------------+
| [Search people]                |
| Taste twins                    |
|  Riya   82% match  [Follow]    |
| Top explorers in Bandra        |
| Vada pav hunters               |
| Veg and Jain foodies           |
| People you may know            |
+--------------------------------+
```

Taste match appears only with 5 or more shared places; otherwise show "Log a few more places to see match".

### 4.9 Groups (Phase 3), Diary and map (Phase 5), Leaderboard (Phase 6)

Follow the descriptions in PRODUCT_SPEC.md. Leaderboard example:

```
+--------------------------------+
| THIS MONTH  College gang       |
| 1. Aarav      14 places        |
| 2. You        11 places        |
| 3. Riya        9 places        |
| Beat Aarav: 4 more places      |
+--------------------------------+
```

### 4.10 Admin

Reports list, place merge tool. Plain, functional, desktop-friendly is fine. Admin-only.

## 5. Copy guidelines

- Warm, short, plain. Light Hinglish where natural: "Aap-ne kaisa paaya?", "Dost kya bolte hain". Keep core actions in clear English.
- Verdict labels: GO, SKIP, ONLY FOR. Never rename them per screen.
- Always say who can see something: "Visible to your friends".
- No guilt copy for streaks or missed days.

## 6. States

Every data screen needs: loading skeleton, empty state with one action, error state with retry, and offline notice (Phase 7 makes this smarter).

## 7. Accessibility

- Contrast AA minimum on all text and tags.
- Labels on icon-only buttons; visible focus ring; no hover-only controls.
- Verdict and tag meaning conveyed by text, not just colour.
- Sheets trap focus and close with the system back gesture.
