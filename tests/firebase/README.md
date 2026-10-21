# Hogeterpjes Firebase rules

The `Test, inspect or publish approved Firebase rules` workflow tests the unchanged
root Firestore and Storage rules in local emulators (`demo-hogeterpjes`). All data
and identities are synthetic. The test job has no Google credentials.

Pushes affecting rules or this infrastructure test and then inspect both live
releases using GET requests only. Pull requests run only the emulator and mocked
publication tests. Inspection reads rule source, never application records.

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
