# Delivery Workflow

## Work sequence
1. define the slice
2. map canonical owners
3. define acceptance criteria
4. scaffold data contracts
5. build backend truth
6. build UI surface
7. verify with typecheck + smoke test
8. document what changed

## Pull request expectations
Every PR must state:
- problem
- scope
- canonical owner
- files changed
- migration impact
- verification proof
- risks

## AI-assisted work rules
Claude may draft code quickly, but no PR is considered valid without:
- ownership clarity
- verification proof
- no duplicate logic
- no hidden regressions
