# TN WEB RATS — Database Schema

Database
Firebase Firestore

---

# users

Stores all platform users.

Fields

id
email
role
managerId
specialization
workingHours
availability
rank
createdAt

Roles

owner
superadmin
admin
manager
worker
client

---

# orders

Stores client orders.

Fields

id
clientId
workerId
managerId
category
price
status
priority
progress
milestone
estimatedCompletionTime
createdAt
deliveredAt

Status values

queued
assigned
in_progress
delivery_uploaded
revision_requested
completed
cancelled

---

# order_progress

Subcollection

orders/{orderId}/progress

Fields

percent
milestone
note
createdAt

---

# wallets

Stores worker wallet balances.

Fields

userId
balance
availableBalance
pendingWithdrawals
totalEarned
totalWithdrawn

---

# transactions

Immutable financial ledger.

Fields

id
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

# allocations

Payroll allotment records.

Fields

id
senderRole
senderId
managerId
amount
remainingAmount
status
createdAt

Status

pending
distributed
closed

---

# withdrawals

Worker withdrawal requests.

Fields

id
workerId
amount
method
status
createdAt
processedAt

Status

pending
processing
completed
failed

---

# referrals

Referral codes.

Fields

code
ownerUserId
discountPercent
uses
createdAt

---

# referralUses

Tracks referral usage.

Fields

referralCode
referredUserId
orderId
timestamp

---

# messages

Chat system.

Fields

id
orderId
senderId
message
fileUrl
createdAt

---

# reports

User issue reports.

Fields

reporterId
category
severity
status
fileAttachment
createdAt

Status

open
in_progress
resolved

---

# notifications

User notifications.

Fields

userId
type
message
read
createdAt

---

# inviteKeys

Staff invite system.

Fields

key
role
isUsed
expiresAt
usedBy
createdAt