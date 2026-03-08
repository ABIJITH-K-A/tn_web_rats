# TN WEB RATS — Feature Map

Purpose
Provide a clear list of all system features.

Each feature has a status:

implemented
in_progress
planned
future

This helps AI agents understand development priorities.

---

# Authentication System

Status: implemented

Features

Email login
Signup system
Role-based access
Invite keys for staff accounts
Invite key expiration (30 hours)
Invite key usage tracking

Planned

Multi-factor authentication
Passkeys (WebAuthn)
TOTP authentication

---

# Role Management

Status: implemented

Hierarchy

Owner
Superadmin
Admin
Manager
Worker
Client

Capabilities

Tier protection
Promotion restrictions
Role-based dashboard access

Rules

Admins cannot see superadmins.
Managers cannot promote users.

---

# Client System

Status: planned

Features

Client signup/login
Client dashboard
My orders
File downloads
Order tracking
Profile management
Notifications

Future

Client ↔ Worker chat

---

# Booking System

Status: implemented

Features

Service selection
Project description
File upload
Price calculation
Payment initiation

Planned

Multi-step booking wizard
Category-based pricing

---

# Payment System

Status: planned

Gateway

Razorpay

Payment methods

UPI
Cards
Net banking

Billing details

GST calculation
Gateway fee display
Payment breakdown

Backend validation required.

---

# Orders System

Status: implemented

Features

Order creation
Order queue
Order assignment
Status tracking

Statuses

queued
assigned
in_progress
delivery_uploaded
revision_requested
completed
cancelled

UI style

Card-based interface
Expandable order cards
Filter + search system

---

# Worker Marketplace

Status: planned

Workers configure

specialization
working hours
availability

Marketplace rules

Workers only see matching orders.

Validation

worker.activeOrders < 1

Workers can

accept orders
update progress
deliver files

Managers can

assign workers.

---

# Order Progress Tracking

Status: planned

Milestones

0% accepted
25% research
50% draft
75% review
100% delivered

Worker sets

progress percent
milestone label
estimated completion time

Client sees

progress bar
worker name
ETA

---

# File Delivery System

Status: planned

Workers upload deliverables.

Storage

S3 or MinIO

Rules

Order cannot complete without delivery files.

Clients can

download files
request revisions.

---

# Wallet System

Status: partially implemented

Wallet fields

balance
availableBalance
pendingWithdrawals
totalEarned
totalWithdrawn

Wallet receives

order earnings
salary allocations
bonuses

---

# Earnings System

Status: implemented

Commission model

Worker = 75%
Platform = 25%

Example

Order ₹2000

Worker ₹1500
Platform ₹500

---

# Payroll Allotment System

Status: implemented

Flow

Owner / Superadmin
→ allocate salary pool
→ Manager
→ workers

Managers distribute funds.

Distribution rule

Equal split among workers.

Example

₹10,000 allotment
5 workers
Each worker ₹2000.

---

# Withdrawal System

Status: implemented

Workers can withdraw anytime.

Methods

UPI
Bank transfer
Cash

Digital payouts handled via Razorpay.

Cash payouts logged manually.

No admin approval required.

---

# Bonus System

Status: planned

One-time reward payments.

Flow

Owner
→ Superadmin
→ Admin
→ Manager
→ Worker

Bonuses added to wallet.

---

# Referral System

Status: partially implemented

Referral rewards

discounts only

Not allowed

cash rewards
commissions
wallet credits

Flow

User generates referral code
Friend signs up
Friend gets discount
Referrer gets coupon.

---

# Chat System

Status: planned

Features

Client ↔ Worker messaging
File attachments

Storage

Firestore messages collection

Future

voice calls
video calls

---

# Notification System

Status: partially implemented

Current

Email notifications

Future

WhatsApp notifications
Push notifications

---

# Analytics Dashboards

Status: planned

Owner

global revenue
platform metrics
worker performance

Superadmin

orders
users
payments

Admin

orders
workers
payments

Manager

team performance
worker stats

---

# Reports System

Status: planned

Users can report

issues
bugs
abuse

Attachments

PDF
DOCX
TXT

Status

open
in_progress
resolved

---

# Audit Logging

Status: planned

Logs must record

timestamp
actor
action
details

Visible to

Owner
Superadmin

Stored in

PostgreSQL audit database.

---

# Security Features

Status: partially implemented

Required protections

Firestore security rules
server-side payment verification
atomic order assignment
wallet transaction ledger

Future

rate limiting
fraud detection
IP monitoring

---

# Infrastructure

Status: planned

Frontend

Firebase Hosting

Backend

Node Fastify server
Cloud Functions

Storage

MinIO / S3

Reverse proxy

Caddy

Audit DB

PostgreSQL

---

# Scalability Target

Platform scale

medium startup

Expected load

thousands of users
hundreds of orders
dozens of workers

Current architecture sufficient.

Microservices not required yet.