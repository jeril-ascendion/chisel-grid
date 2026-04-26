@AGENTS.md

## CRITICAL — Parallel Agent Safety Rule

NEVER run two Claude Code agents in the same working tree simultaneously.
Root cause: Agent B commits and runs git reset --hard HEAD to clean its state,
wiping Agent A's uncommitted work.

SAFE parallel work requires:
  Agent A works on branch: feature/epic-p06
  Agent B works on branch: feature/epic-p07
  Merge both to develop when done.

OR: Run agents sequentially, not in parallel.

Every agent session MUST commit after each task, not at the end.
git reset --hard is BANNED in agent sessions — use git checkout -- <file>
for selective reverts only.
