# Migration Policy

## Golden rules
- one concern per migration
- name migrations clearly
- include comments for non-obvious changes
- never mix destructive cleanup with unrelated feature work

## Safe migration sequence
1. additive schema
2. backfill if needed
3. switch reads
4. switch writes
5. remove legacy only after proof

## For risky changes
Document:
- old path
- new path
- transition strategy
- rollback strategy
