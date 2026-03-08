# TN WEB RATS — Development Rules

Purpose:
Ensure production-quality code.

---

Coding Standards

Use modular architecture.

Avoid large files.

Functions must be small and focused.

Variable names must be descriptive.

---

Backend Requirements

All financial operations must run server-side.

Never trust frontend input.

Validate all requests.

---

Database Safety

Use transaction ledger.

Never directly modify wallet balance.

Wallet balance must derive from transactions.

---

Performance

Use indexed queries.

Avoid Firestore hot documents.

Use pagination for large queries.

---

Error Handling

All APIs must return structured responses.

Format

success
error
message
data

---

Testing

Critical modules must be tested:

payments
wallet
order assignment
withdrawals

---

Logging

All sensitive actions must be logged.

Examples

salary allocation
withdrawal
role changes
order reassignment