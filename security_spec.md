# Security Specification for Firestore

## 1. Data Invariants
- Translations require a valid `userId` (authenticated user).
- Only the owner of the translation can read it.
- Translations cannot be updated once created.
- `role` must be 'user' or 'agent'.
- `text` must be a non-empty string.

## 2. Dirty Dozen Payloads
See firestore.rules.test.ts for the comprehensive test suite verifying PERMISSION_DENIED for unauthorized actions.

## 3. Test Runner
Will be implemented in `firestore.rules.test.ts`.
