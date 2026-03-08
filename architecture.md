# TN WEB RATS — System Architecture

Platform type
Student-run freelancing platform.

Purpose
Clients place design/development orders.
Workers complete them.
Workers get paid via wallet withdrawals.

---

# High Level Architecture

Client Browser
↓
Frontend (HTML / Bootstrap / JS)
↓
Firebase Auth
↓
Firestore Database
↓
Cloud Functions / Node Backend
↓
External Services

External services
Razorpay (payments)
S3 / MinIO (file storage)
EmailJS (notifications)

---

# Main System Modules

Auth System
Handles login, signup, invite keys, role validation.

Orders System
Creates and tracks client orders.

Worker Marketplace
Workers see matching orders based on specialization.

Progress System
Workers update milestones and ETA.

File Delivery System
Workers upload deliverables → clients download.

Wallet System
Stores earnings and salary allocations.

Payroll System
Owner/Superadmin allocate funds to managers.

Referral System
Discount-only referral codes.

Analytics System
Dashboards per role.

Notifications
Email alerts for key events.

---

# Order Lifecycle

Client
→ Booking wizard
→ Payment
→ Order created
→ Queue

Queue paths

Worker picks order
OR
Manager assigns worker

Then

Worker progress updates
→ delivery upload
→ client review

If client inactive

72 hour timer
→ auto approval

Finally

Worker wallet credited.

---

# Money Flow Architecture

Two money systems exist.

Order earnings

Client payment
→ order completed
→ worker gets 75%
→ platform gets 25%

Payroll allotment

Owner / Superadmin
→ send funds to Manager
→ manager distributes equally to workers.

---

# Wallet Flow

Worker wallet receives

order earnings
salary allocations
bonuses

Withdrawals

Worker
→ withdrawal request
→ payout (UPI / bank / cash)

No admin approval required.

---

# Role Hierarchy

Owner
Superadmin
Admin
Manager
Worker
Client

Permissions cascade downward.

Higher roles control lower roles.

---

# Order Assignment

Two valid paths

Worker picks order
Manager assigns worker

Server validation required

worker.activeOrders < 1
order.status == queued

---

# System Security Boundaries

Frontend

UI only.

Must never perform

wallet updates
salary allocation
payment verification

Backend

Handles all financial logic.

---

# Storage Architecture

Firestore collections store

users
orders
wallets
transactions
allocations
withdrawals
messages
reports
notifications

Large files stored in

S3 / MinIO

Only file links stored in database.

---

# Deployment Architecture

Frontend

Firebase Hosting

Backend

Node Fastify server
Cloud Functions

Reverse Proxy

Caddy

Database

Firestore

Audit database

PostgreSQL