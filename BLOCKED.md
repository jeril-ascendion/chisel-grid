# ChiselGrid — Blocked Items

**Last Updated:** April 2026

## Currently Blocked

None. All development items are unblocked as of April 2026.

## Recently Unblocked

| Item | Was Blocked By | Resolution | Date |
|---|---|---|---|
| AWS CDK deployment | Expired AWS SSO token | Configured PowerUserAccess profile and set AWS_PROFILE env var | April 2026 |
| GitHub push | HTTPS auth not configured | Switched remote URL to SSH and added SSH key to GitHub | April 2026 |
| pnpm build | .js extensions in types index.ts | Removed .js extensions from export paths | April 2026 |
| AudioStack CDK build | config.stage property missing from EnvConfig | Derived envName from stack id string | April 2026 |
| Ralph Loop plugin | Wrong command syntax /ralph-loop | Correct syntax is /ralph-loop:ralph-loop | April 2026 |
| AWS region mismatch | Default profile pointed to ap-south-1 Mumbai | Set AWS_DEFAULT_REGION=ap-southeast-1 in bashrc | April 2026 |
| Parallel stream merge conflicts | pnpm-lock.yaml conflicts from two simultaneous streams | Accepted theirs version then ran pnpm install to regenerate lockfile | April 2026 |

## How to Report a New Blocker

If something becomes blocked during development:

1. Mark the task `[!]` in MASTER-TODO.md with the exact reason on the same line
2. Add a new row to the **Currently Blocked** table in this file with: what is blocked, what is needed, who can unblock it, and exact resumption steps
3. Skip to the next unblocked task and continue
4. Update the **In Progress** section of project-status.md
