# TN WEB RATS — AI Context

Student-run digital services platform where workers complete client orders.

Platform type:
Freelancing / task marketplace.

Main services:
- PPT design
- Poster design
- Website development
- Photo editing
- Digital design tasks

System goal:
Clients place orders → workers complete work → workers get paid.

---

# Tech Stack

Frontend
HTML
Bootstrap 5
Vanilla JS
React (admin/task dashboards)

Backend (planned)
Node.js
Fastify
Cloud Functions

Database
Firebase Firestore

Storage
S3 / MinIO

Payments
Razorpay

Email
EmailJS

Hosting
Firebase Hosting + Caddy reverse proxy

---

# System Roles

Hierarchy (highest → lowest)

Owner
Superadmin
Admin
Manager
Worker
Client

Permissions flow downward.

Higher roles can control lower roles.

---

# Role Permissions

Owner

Access
Overview
Orders (view only)
Users
Referrals
Wallet
Reports
Payroll
Approvals
Bonus
Salary
Allocate
Invite Keys
Finance

Restriction
Cannot be assigned to orders.

---

Superadmin

Access
Overview
Orders
Users
Referrals
Wallet
Reports
Payroll
Approvals
Bonus
Salary
Allocate
Invite Keys

Restriction
Cannot modify Owner settings.

---

Admin

Access
Overview
Orders
Users
Referrals
Wallet
Reports
Payroll
Approvals
Bonus
Salary
Allocate
Invite Keys

---

Manager

Access
Overview
Orders
Team Payments
Reviews
Wallet
Reports
Bonus
Salary
Allocate

Restrictions
Cannot promote users
Cannot access platform analytics
Cannot access referrals
Cannot approve payroll

---

Worker

Access
My Orders
My Earnings
Wallet
Salary
Reviews
Reports

Rules
Can only work on one active order.
Only sees orders matching specialization.

---

Client

Access
Booking wizard
My Orders
File downloads
Reviews
Profile
Notifications

Future
Chat with worker

---

# Order Lifecycle

Client places order.

Flow

Client
→ Booking Wizard
→ Payment
→ Order Queue
→ Worker picks OR Manager assigns
→ Worker progress updates
→ Worker uploads delivery files
→ Client review
→ Order completed
→ Worker wallet credited

If client does not respond:

Delivery sent
→ 72 hour timer
→ Auto approval

---

# Order Status

queued
assigned
in_progress
delivery_uploaded
revision_requested
completed
cancelled

---

# Worker Marketplace

Workers configure

specialization
working_hours
availability

Workers only see matching orders.

Validation

worker.activeOrders < 1

Orders appear in worker queue.

Managers can also assign workers manually.

---

# Order Progress Tracking

Milestones

0% accepted
25% research
50% draft
75% review
100% delivered

Worker sets

estimatedCompletionTime
progressPercent
milestoneLabel

Client sees

progress bar
worker name
ETA
stage

---

# File Delivery System

Worker uploads files.

Flow

Worker upload
→ stored in S3
→ attached to order
→ client download

Rule

Order cannot be marked completed without delivery files.

---

# Wallet System

Workers have wallets.

Wallet fields

balance
availableBalance
pendingWithdrawals
totalEarned
totalWithdrawn

Money sources

order earnings
salary allotments
bonuses

---

# Worker Earnings

Order commission

Worker = 75%
Platform = 25%

Example

Order ₹2000

Worker wallet +₹1500
Platform revenue +₹500

---

# Payroll Allotment System

Separate from order earnings.

Flow

Owner / Superadmin
→ send allotment funds
→ Manager
→ workers

Managers distribute allotment.

Distribution rule

Equal split.

Example

Allotment ₹10,000
Workers 5

Each worker ₹2000.

---

# Withdrawal System

Workers withdraw anytime.

Flow

Wallet balance
→ withdrawal request
→ payout

Methods

UPI
Bank transfer
Cash

Digital payouts via Razorpay.

Cash logged manually.

No admin approval required.

---

# Referral System

Referral rewards are discounts only.

No commissions.
No wallet rewards.

Flow

User generates referral code
Friend signs up
Friend gets discount
Referrer receives discount coupon.

---

# Order UI Design Rules

Orders must follow the same UI style as task tracker.

Design pattern

Dark dashboard
Card layout
Expandable rows
Status dots
Priority badges
Search + filters

Avoid table layouts.

Use expandable cards instead.

---

# Security Rules

Financial logic must never run in browser.

All money operations must be server side.

Examples

wallet updates
salary allocations
withdrawals
order completion payouts

Use backend APIs.

---

# Required Backend APIs

/api/order/assign
/api/order/complete
/api/wallet/withdraw
/api/payroll/allocate
/api/payment/webhook

---

# Firestore Collections

users
orders
wallets
transactions
allocations
withdrawals
messages
reports
notifications
inviteKeys

---

# Transaction Ledger

Every wallet change creates transaction.

Fields

userId
amount
type
referenceId
createdAt

Types

order_earning
salary_allotment
bonus
withdrawal
refund

---

# AI Agent Rules

Before coding:

Understand system architecture.

Modify only necessary files.

Preserve existing logic.

Always ask questions if unclear.

Ask enough questions to reach 99.9% requirement accuracy.

Never remove code unless instructed.

---

# Token Optimization Rules

AI should reduce token usage by:

Returning only modified code sections.

Avoid repeating unchanged code.

Avoid long explanations unless requested.

Prefer summaries over long paragraphs.

Group logic changes.

---

# Scale Target

Medium startup.

Expected load

thousands of users
hundreds of concurrent orders
dozens of workers

Current architecture is sufficient.

Microservices not required yet.