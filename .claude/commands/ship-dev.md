---
description: Commit the current change to the dev branch and push it
argument-hint: [one sentence describing the change]
---

Send the current working-tree change to `dev`, following **Branches and Deployment** in AGENTS.md.

What changed, in the user's words (may be empty — read the diff instead): $ARGUMENTS

1. Read `git status` and `git diff`. Stage only the files belonging to this change; other
   uncommitted work in the tree is the user's and stays untouched. Never `git stash` to get a
   baseline while they have uncommitted work — use a worktree.
2. If `dev` does not exist yet, branch it from `main`. Never commit to `main`, and never promote.
3. Run the specs covering what was touched, by path, with `--reporter=line`. Never the whole suite
   for one change. Rerun a lone failure by itself before reporting it as a regression: several
   specs lose a race under load, and a failure that passes alone is a flake.
4. Commit as `Fix:` or `Feat:` plus one sentence about the behaviour, matching the existing log.
5. Push to `origin dev`. Report the dev URL the deploy will land on, and say plainly which specs
   were run and what they did.

If `../API` also changed, that half goes first and stops short of production: apply the migration,
`npm run version:upload`, and leave the version unpromoted so it can be soaked from the dev front
end with `?api=<preview-url>`. Do not run `version:deploy` or `deploy` unless asked in as many
words — one Worker and one database serve production too.
