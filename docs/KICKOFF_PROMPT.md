# KICKOFF_PROMPT.md

Prompts to paste into Antigravity (with Claude as the model), one at a time. This file is for the human, not for the agent to act on by itself.

## Repo layout to set up first

```
food-circle/
  CLAUDE.md            <- put at the repo root
  docs/
    PRODUCT_SPEC.md
    PHASES.md
    ARCHITECTURE.md
    DATABASE.md
    SECURITY_PRIVACY.md
    PLACES_DATA.md
    SCORING_BADGES.md
    API_SPEC.md
    UI_UX.md
    TESTING.md
    KICKOFF_PROMPT.md
```

If Antigravity does not automatically load CLAUDE.md as project rules, say "read CLAUDE.md first" at the start of each session (the prompts below already do). If it prefers its own rules file, copy the contents of CLAUDE.md into it and keep CLAUDE.md as the source of truth.

Accounts the human needs before Phase 0 finishes: a Supabase project, a Vercel account, a GitHub repo, a Google Cloud OAuth client (for Google sign-in). The agent will tell you exactly which values to paste into .env.local.

## Prompt 0: orientation (paste once at the very start)

```
Read CLAUDE.md, then every file in /docs. Do not write any code yet.

Reply with:
1. A 10-line summary of the product in your own words.
2. The 5 rules from CLAUDE.md you consider most likely to be broken by accident, and how you will avoid that.
3. Anything in the docs that is ambiguous, contradictory, or that you think is a mistake. Be direct.
4. The list of accounts, keys and tools you need from me for Phase 0.

Then wait for me.
```

## Prompt 1: start Phase 0

```
Read CLAUDE.md and docs/PHASES.md. Start Phase 0 (Foundations).
Follow the working agreement in CLAUDE.md: short plan first, then small commits, tick checkboxes in docs/PHASES.md as you go, run lint/typecheck/tests after each task.
When something needs me (creating a Supabase project, pasting keys, Google OAuth setup), stop and give me exact numbered steps, then continue when I say done.
At the end, run the Phase 0 "Done when" checks and report. Do not start Phase 1.
```

## Prompt 2: start any later phase (replace N)

```
Read CLAUDE.md, then the Phase N section of docs/PHASES.md and the docs it references. Phase N-1 is complete and merged.
Post your plan (10 lines max), then build Phase N task by task under the working agreement.
Do not touch work from other phases except for bug fixes. At the end, run the "Done when" scenario step by step, report each step as pass or fail, list anything deferred, then stop.
```

## Prompt 3: continue after an interruption

```
Read CLAUDE.md and docs/PHASES.md. Look at git log and which checkboxes are ticked. Tell me in 5 lines where we stopped and what is half-finished, then continue with the next unchecked task.
```

## Prompt 4: end-of-phase review (use before approving the next phase)

```
Act as a strict reviewer of Phase N. Check against CLAUDE.md rules, PRODUCT_SPEC.md and SECURITY_PRIVACY.md. Specifically:
1. Can any visibility level leak (friends-only visible to a follower, private account visible to strangers, blocked users visible)? Show the RLS tests that prove it cannot.
2. Is any place where tiers are blended or averaged?
3. Does the log flow still work with only the verdict filled in?
4. Does everything work at 390px width on a throttled connection?
5. List bugs, missing tests and shortcuts you took. Do not fix anything yet; just report.
```

## Prompt 5: debugging

```
Bug: <describe what you did, what you expected, what happened>.
First reproduce it and tell me the root cause in plain language before changing code. Then fix it, add a regression test, and update docs/DECISIONS.md if the fix changes any documented behaviour.
```

## Prompt 6: add a badge or scoring rule later

```
Read docs/SCORING_BADGES.md. I want to add: <badge or rule>.
Show me the rule definition and the tests first. Do not change the scoring function without telling me which existing behaviour changes and how scores would be recomputed.
```

## Tips for working with the agent

- One phase per session where possible. Long sessions drift; start a fresh one with Prompt 3.
- Approve phases yourself: use Prompt 4, test on your own phone with a few friends, then say "Phase N approved, start Phase N+1".
- If the agent proposes a new dependency, a new table, or a change to the scoring rules, make it explain why before you say yes.
