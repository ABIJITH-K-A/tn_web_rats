# Cloud Hardening Notes

Date: 2026-03-07

## Implemented

1. Added deployable Firebase config files:
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

2. Added stronger Firestore controls for money-sensitive collections:
- `wallets`
- `payoutRequests`
- `payrollRuns`
- `assignmentRequests`
- `inviteKeys`
- `reports`
- `sampleRequests`
- `clients`

3. Switched payout submissions to transactions in client flows:
- `Statics/admin-dashboard.js`
- `profile.html`

4. Switched payout approve/reject actions to transactions in:
- `Statics/admin-dashboard.js`

5. Added role guards in approvals and payroll generation in:
- `Statics/admin-dashboard.js`

6. Added `inviteKeyUsed` to staff onboarding user docs:
- `admin-signup.html`
- `join.html`

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## Residual Risk (Important)

This project still performs payroll and payout business logic from browser clients.
For real-money production, move payout/payroll posting and approvals to server-side trusted endpoints (Cloud Functions or your backend) with audit logging and idempotency keys.
