# TN WEB RATS

TN WEB RATS is a student-run digital services platform where clients can order work and workers complete tasks such as design, presentations, and website development.

The platform functions like a small freelancing marketplace with structured roles, order tracking, and wallet payouts.

---

# Platform Overview

Core workflow

Client
→ Booking Wizard
→ Payment
→ Order Queue
→ Worker picks OR Manager assigns
→ Worker progress updates
→ Delivery upload
→ Client review
→ Completion
→ Worker wallet credited

If the client does not respond after delivery:

Delivery
→ 72 hour timer
→ Auto approval
→ Worker payment released

---

# Key Features

Order marketplace  
Worker specialization filtering  
Manager assignment system  
Worker wallet with withdrawals  
Payroll allotment distribution  
Referral discount system  
Role-based dashboards  
Progress tracking system  

---

# Role Hierarchy

Owner  
Superadmin  
Admin  
Manager  
Worker  
Client  

Permissions cascade downward.

Example:

Owner can control all roles.  
Managers control workers only.  
Workers complete assigned orders.

---

# Earnings Model

Order revenue split

Worker: 75%  
Platform: 25%

Example

Order ₹2000

Worker receives ₹1500  
Platform receives ₹500

---

# Payroll System

Separate from order earnings.

Flow

Owner / Superadmin
→ Allocate salary pool
→ Manager
→ Workers

Managers distribute funds equally among their workers.

Example

₹10,000 payroll allotment  
5 workers  
Each worker receives ₹2000.

---

# Wallet System

Worker wallets store earnings.

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

# Withdrawal System

Workers can withdraw funds anytime.

Withdrawal methods

UPI  
Bank transfer  
Cash  

Digital payouts use Razorpay.  
Cash payouts are logged manually.

No admin approval required.

---

# Referral System

Referrals provide **discount rewards only**.

Not allowed

Cash rewards  
Wallet credits  
Commission payouts  

Flow

User generates referral code  
Friend signs up  
Friend receives discount  
Referrer receives coupon discount

---

# Tech Stack

Frontend

HTML  
Bootstrap 5  
Vanilla JavaScript  
React dashboards  

Backend

Node.js  
Fastify  
Firebase Cloud Functions  

Database

Firebase Firestore  

Storage

S3 / MinIO  

Payments

Razorpay  

Email

EmailJS  

Hosting

Firebase Hosting  
Caddy reverse proxy  

---

# Project Structure
