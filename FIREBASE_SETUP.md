# Firebase Setup — TN WEB RATS

## 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add project** → name it `tnwebrats` → Continue → Create
3. In **Project Settings** → **General** → scroll to "Your apps" → click **</>** (Web app)
4. Register app as `tn-web-rats`, **do not** enable Firebase Hosting
5. Copy the `firebaseConfig` object and replace the `YOUR_*` placeholders in **all 5 HTML files**:
   - `book.html` — line ≈615
   - `signup.html` — line ≈2
   - `profile.html` — line ≈2
   - `admin-dashboard.html` — line ≈2
   - `admin-signup.html` — line ≈2

---

## 2. Enable Firebase Auth

1. Firebase Console → **Authentication** → **Get started**
2. **Sign-in method** tab → enable **Email/Password**

### 2a. Create the First Super Admin (bootstrap)

The first superadmin can't use the key system — there's nobody to generate a key yet.
Do it manually:

1. Firebase Console → Authentication → **Add user**
   - Email: `yourname@domain.com`
   - Password: something secure
   - Copy the UID shown after creation (looks like `abc123xyz...`)
2. In `admin-dashboard.html`, replace:
   ```
   const BOOTSTRAP_SA_UID   = "REPLACE_WITH_YOUR_FIREBASE_UID";
   const BOOTSTRAP_SA_EMAIL = "REPLACE_WITH_YOUR_EMAIL";
   const BOOTSTRAP_SA_NAME  = "Super Admin";
   ```

   language
3. The first time you sign in to the dashboard, the `/users/{uid}` doc is auto-created
   with `role: "superadmin"`. After that the bootstrap code does nothing.

---

## 3. Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **Production mode** (we add rules below)
3. Region: `asia-south1` (Mumbai) for lowest latency in Tamil Nadu

### Collections

Firestore creates these automatically when data is first written.
Here's what each collection stores:

| Collection                | Purpose                                                             |
| ------------------------- | ------------------------------------------------------------------- |
| `/users/{uid}`          | All users (customers, workers, admins). Role field controls access. |
| `/orders/{orderId}`     | Every booking from book.html                                        |
| `/reviews/{reviewId}`   | Customer reviews after order completion                             |
| `/referralCodes/{code}` | Staff referral codes + usage stats                                  |
| `/inviteKeys/{key}`     | Single-use staff onboarding keys                                    |
| `/payroll/{payrollId}`  | Payroll periods + manager/worker allocations                        |

### Document shape reference

**`/users/{uid}`**

```json
{
  "name": "Aarav Kumar",
  "email": "aarav@example.com",
  "phone": "+91 98765 43210",
  "role": "customer",
  "referralCode": null,
  "usedReferralCode": "TNWR-WRK-ABCD",
  "referredBy": "worker-uid-here",
  "discountPercent": 5,
  "createdAt": "serverTimestamp"
}
```

json**`/orders/{orderId}`**

```json
{
  "customerId": "firebase-auth-uid",
  "customerName": "Priya Sharma",
  "customerEmail": "priya@example.com",
  "customerPhone": "+91 98765 43210",
  "service": "PowerPoint Presentations",
  "package": "Pro PPT",
  "finalPrice": 299,
  "discountPercent": 10,
  "originalPrice": 332,
  "deadline": "2026-03-20",
  "instructions": "20 slides, dark theme...",
  "driveLink": "https://drive.google.com/...",
  "paymentMethod": "whatsapp",
  "paymentStatus": "unpaid",
  "status": "pending",
  "workerAssigned": null,
  "reviewDone": false,
  "createdAt": "serverTimestamp"
}
```

json**`/inviteKeys/{key}`**

```json
{
  "role": "worker",
  "createdBy": "admin-uid",
  "createdByName": "Admin Name",
  "usedBy": null,
  "usedByName": null,
  "createdAt": "serverTimestamp",
  "usedAt": null
}
```

json**`/payroll/{payrollId}`**

```json
{
  "month": "2026-03",
  "totalIncome": 50000,
  "managerAllocations": {
    "manager-uid": 15000
  },
  "workerAllocations": {
    "manager-uid": {
      "worker-uid-1": 5000,
      "worker-uid-2": 7000,
      "total": 12000,
      "distributedAt": "ISO string"
    }
  },
  "status": "pending",
  "createdBy": "admin-uid",
  "createdAt": "serverTimestamp"
}
```

json---

## 4. Security Rules

Paste these into **Firestore** → **Rules** tab:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuth() { return request.auth != null; }
    function uid()    { return request.auth.uid; }
    function role()   {
      return get(/databases/$(database)/documents/users/$(uid())).data.role;
    }
    function isStaff() {
      return role() in ["worker","manager","admin","superadmin"];
    }
    function isAdmin() {
      return role() in ["admin","superadmin"];
    }
    function isSuperAdmin() { return role() == "superadmin"; }

    // ── Users ──────────────────────────────────────────────
    match /users/{userId} {
      // Anyone auth'd can read their own doc; staff can read all
      allow read: if isAuth() && (uid() == userId || isStaff());
      // Users can create their own doc on signup
      allow create: if isAuth() && uid() == userId;
      // Users can update their own doc; admins can update any
      allow update: if isAuth() && (uid() == userId || isAdmin());
      allow delete: if isSuperAdmin();
    }

    // ── Orders ─────────────────────────────────────────────
    match /orders/{orderId} {
      allow read:   if isAuth() && (resource.data.customerId == uid() || isStaff());
      allow create: if isAuth();
      allow update: if isAuth() && (resource.data.customerId == uid() || isStaff());
      allow delete: if isAdmin();
    }

    // ── Reviews ────────────────────────────────────────────
    match /reviews/{reviewId} {
      allow read:   if isAuth();
      allow create: if isAuth();
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // ── Referral Codes ─────────────────────────────────────
    match /referralCodes/{code} {
      allow read:   if isAuth();
      allow create: if isAuth() && isStaff();
      allow update: if isAuth();   // used count increments on signup
      allow delete: if isAdmin();
    }

    // ── Invite Keys ────────────────────────────────────────
    match /inviteKeys/{key} {
      allow read:   if isAuth() || true;  // needed for unauthenticated key check on admin-signup
      allow create: if isAuth() && isStaff();
      allow update: if isAuth();           // mark as used on signup
      allow delete: if isStaff();
    }

    // ── Payroll ────────────────────────────────────────────
    match /payroll/{payrollId} {
      allow read:   if isAuth() && isStaff();
      allow create: if isAuth() && isAdmin();
      allow update: if isAuth() && isStaff();
      allow delete: if isSuperAdmin();
    }
  }
}
```

language> **Note on invite key reads:** `inviteKeys` allows unauthenticated reads so `admin-signup.html`
> can validate keys before the user has an account. Tighten this after launch if needed.

---

## 5. Firestore Indexes

Create these composite indexes in **Firestore** → **Indexes** → **Composite**:

| Collection  | Fields                                     | Order                             |
| ----------- | ------------------------------------------ | --------------------------------- |
| `orders`  | `customerId` ASC, `createdAt` DESC     | Needed for profile.html My Orders |
| `orders`  | `workerAssigned` ASC, `createdAt` DESC | Worker's assigned orders          |
| `orders`  | `workerAssigned` ASC, `status` ASC     | Worker earnings stats             |
| `reviews` | `workerAssigned` ASC, `createdAt` DESC | Worker reviews                    |
| `payroll` | `createdAt` DESC                         | Payroll history                   |

Firebase will also auto-suggest indexes when queries fail in the console — click the
link in the error and Firebase creates them automatically.

---

## 6. Replace Config in All Files

Search for `YOUR_API_KEY` across all 5 HTML files and replace the entire
`FIREBASE_CONFIG` block:

```js
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "tnwebrats.firebaseapp.com",
  projectId:         "tnwebrats",
  storageBucket:     "tnwebrats.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123"
};
```

js---

## 7. Quick Checklist

- [ ] Firebase project created
- [ ] Email/Password auth enabled
- [ ] First superadmin Auth user created in console
- [ ] Bootstrap UID + email replaced in `admin-dashboard.html`
- [ ] `FIREBASE_CONFIG` replaced in all 5 HTML files
- [ ] Firestore security rules pasted and published
- [ ] Composite indexes created
- [ ] EmailJS configured (see `EMAILJS_SETUP.md`)
- [ ] Razorpay key replaced in `book.html` (`RAZORPAY_KEY`)
- [ ] WhatsApp number confirmed in `book.html` (`WA_NUM`)

---

## Cloud launch update (March 7, 2026)

Use the root files `firestore.rules` and `firestore.indexes.json` as the source of truth for production security. Deploy with:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```
