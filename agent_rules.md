# TN WEB RATS — AI Agent Rules

Purpose
Guide AI coding agents working on this project.

---

# Core Rules

Understand system architecture before coding.

Modify only the necessary files.

Preserve existing logic.

Never remove code unless instructed.

If requirements are unclear

ask questions first.

Ask enough questions to reach

99.9% accuracy.

---

# Security Rules

Financial operations must be server-side.

Never implement these in frontend

wallet updates
salary allocation
withdrawals
payment verification

Always use backend APIs.

---

# Database Rules

Never directly edit wallet balances.

Use transaction ledger.

Wallet balance must derive from transactions.

---

# Order System Rules

Worker must only have one active order.

Server validation required.

Order assignment must use atomic transaction.

---

# UI Rules

Follow design pattern used in task tracker UI.

Design style

dark dashboard
card layout
expandable rows
status indicators
priority badges

Avoid table-based layouts.

---

# Coding Standards

Prefer modular architecture.

Avoid cross-module dependency.

Use descriptive variable names.

Group related logic.

Keep functions small.

---

# Token Optimization

AI responses should minimize token usage.

Rules

Return only modified code sections.

Avoid repeating unchanged code.

Avoid long explanations.

Prefer concise summaries.

---

# Output Format

When generating code

Provide

file path
modified section
code snippet

Do not repeat entire files unless required.