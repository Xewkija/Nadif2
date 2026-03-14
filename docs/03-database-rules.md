# Database and Migration Rules

## Rules
- every schema change goes through migrations
- no manual production schema edits
- tables must be tenant-safe
- lifecycle status fields must be explicit
- audit-critical flows should log activity

## Required standards
- primary keys explicit
- foreign keys explicit
- timestamps explicit
- soft delete policy documented
- enum/status strategy documented
- index strategy documented for every major table

## Before adding a table
Answer:
- what domain owns it?
- what lifecycle does it represent?
- what other surfaces depend on it?
- should this be a table, column, or view?
- what RLS rules will apply?

## Migration policy
- small, atomic migrations
- reversible where possible
- no mixed unrelated changes in one migration
