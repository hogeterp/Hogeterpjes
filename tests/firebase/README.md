# Hogeterpjes Firebase rules

The `Test, inspect or publish approved Firebase rules` workflow tests the unchanged
root Firestore and Storage rules in local emulators (`demo-hogeterpjes`). All data
and identities are synthetic. The test job has no Google credentials.

Pushes affecting rules or this infrastructure test and then inspect both live
releases using GET requests only. Pull requests run only the emulator and mocked
publication tests. Inspection reads rule source, never application records. It compares exact contents
and tokens ignoring comments/formatting, and shows a diff for token differences.

To publish reviewed rules, manually run this workflow on main with mode `publish`,
a target (`firestore` or `storage`), the exact file SHA256 and current live ruleset
name from the successful inspection. Tests must pass on that commit first. There
is no automatic publication on push. The script rejects missing or stale approval
values and skips identical rules. It creates and compiles an immutable ruleset,
checks the live release again, updates only the selected release and verifies it.
The previous ruleset name is retained in the run summary for recovery. Google
Rules releases have no atomic compare-and-swap; avoid simultaneous console
publications during the short check/update window.

Authentication uses GitHub OIDC federation scoped to repository ID 1312998664,
owner ID 305426992 and main, with service account codex-hogeterpjes-rules. No JSON
private key or Codex proxy secret is used. The target Storage release is
firebase.storage/hogeterpjes.firebasestorage.app. This workflow does not deploy
indexes, change Authentication accounts, or modify app records or website files.

Local validation: `python3 tests/firebase/release_test.py`, then in this directory
`npm ci && npm test` (Node 24, Java 21). Emulator tests characterize current access
behavior; they are not a complete security audit.

Storage `update` is tested using metadata changes. Uploading a new object generation
at an existing vault path succeeded in the emulator under the current create rule;
this suite does not claim that `allow update: if false` prevents replacement uploads.
The app uses unique paths. Rules are preserved, not silently hardened by this setup.

## Wish purchases (v1.3.52)

Anonymous reserved/bought statuses live at wishPurchases/{person}/statuses/{wishId}.
Recipients cannot read their own status, including the app admin. Buyer UIDs are
stored only in owner-readable lock documents and buyer-private wishPurchaseClaims.
Every transition changes all three documents atomically. A caller cannot steal a
reservation, forge a status with an actor field or partially remove a claim.
Names are checked against admin-managed accounts, not just self-editable profiles.
Invitation records use the existing {name,email,active} (or legacy {name,email})
format. Unmapped profiles fail closed until corrected by the administrator.
All new statuses are memory-only in the app and never written to shared app data,
localStorage, notifications or the shared change log. A reservation has no expiry;
only its buyer can change or release it. The status applies across all events.

Old giftEvents.claims values predate this protection and may already be in the
shared document or local backups. This change no longer displays or creates legacy
claims; existing values can still be persisted with shared app data. It does not
silently delete historical data. These legacy values require
a separately reviewed migration/removal before claiming historical purchase
privacy. New purchases use the protected collections exclusively.

Deployment: publish the reviewed Firestore rules before enabling app v1.3.52.
Storage rules are unchanged. No data migration or live purchase is part of tests.
