# EmailJS Setup — TN WEB RATS

EmailJS sends automated booking confirmation emails from `book.html` — entirely from the browser,
no backend required. Emails fire in the background and **never block the booking flow**.

---

## 1. Create EmailJS Account

1. Go to https://www.emailjs.com → Sign up (free plan: 200 emails/month)
2. In dashboard → **Email Services** → **Add New Service**
3. Choose **Gmail** → connect your Gmail account (e.g. `unofficials113@gmail.com`)
4. Note the **Service ID** (e.g. `service_abc123`)

---

## 2. Create Email Templates

You need **two templates**: one for the owner, one for the customer.

### Template 1 — Owner Notification (`owner_new_order`)

Create a new template with this content:

**Subject:**
```
New Order: {{order_id}} — {{service}} {{package}}
```

**Body (HTML):**
```html
<h2>New Booking — TN WEB RATS</h2>

<table style="border-collapse:collapse;width:100%;max-width:600px">
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Order ID</td><td style="padding:8px">{{order_id}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Service</td><td style="padding:8px">{{service}} — {{package}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Customer</td><td style="padding:8px">{{customer_name}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Email</td><td style="padding:8px">{{customer_email}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Phone</td><td style="padding:8px">{{customer_phone}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Amount</td><td style="padding:8px">₹{{final_price}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Payment Method</td><td style="padding:8px">{{payment_method}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Payment ID</td><td style="padding:8px">{{payment_id}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Deadline</td><td style="padding:8px">{{deadline}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Instructions</td><td style="padding:8px">{{instructions}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Drive Link</td><td style="padding:8px">{{drive_link}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Referral Code Used</td><td style="padding:8px">{{referral_code}}</td></tr>
  <tr><td style="padding:8px;font-weight:bold;background:#f5f5f5">Discount</td><td style="padding:8px">{{discount_percent}}%</td></tr>
</table>

<p style="margin-top:24px;color:#666">
  Go to <a href="https://yoursite.com/admin-dashboard.html">Admin Dashboard</a> to manage this order.
</p>
```

**To:** `unofficials113@gmail.com` (or wherever you want owner notifications)

Note the **Template ID** (e.g. `template_ownerabc`)

---

### Template 2 — Customer Confirmation (`customer_confirmation`)

**Subject:**
```
Your order {{order_id}} is confirmed — TN WEB RATS
```

**Body (HTML):**
```html
<div style="font-family:sans-serif;max-width:600px;margin:auto">
  <h2 style="color:#45A29E">Hey {{customer_name}}, your order is confirmed! 🎉</h2>

  <p>Thanks for booking with TN WEB RATS. We've received your project and will get started soon.</p>

  <table style="border-collapse:collapse;width:100%;margin:24px 0">
    <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9;width:160px">Order ID</td><td style="padding:8px;font-family:monospace;color:#45A29E">{{order_id}}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Service</td><td style="padding:8px">{{service}} — {{package}}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Amount</td><td style="padding:8px">₹{{final_price}}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Est. Delivery</td><td style="padding:8px">{{delivery_date}}</td></tr>
    <tr><td style="padding:8px;font-weight:bold;background:#f9f9f9">Payment</td><td style="padding:8px">{{payment_method}}</td></tr>
  </table>

  {{#if referral_code}}
  <p style="background:#f0fffe;padding:12px;border-radius:8px;border-left:3px solid #45A29E">
    🎫 Referral discount of <strong>{{discount_percent}}%</strong> applied using code <strong>{{referral_code}}</strong>
  </p>
  {{/if}}

  <h3 style="margin-top:28px;color:#333">What happens next?</h3>
  <ol style="color:#555;line-height:1.9">
    <li>Our team reviews your project details</li>
    <li>Work begins within 24 hours of payment confirmation</li>
    <li>We'll contact you on WhatsApp: <strong>{{customer_phone}}</strong></li>
    <li>Deliverable sent via Google Drive to your account</li>
  </ol>

  <p style="margin-top:24px">
    Questions? WhatsApp us: <a href="https://wa.me/918300920680">+91 83009 20680</a>
  </p>

  <p style="color:#999;font-size:12px;margin-top:32px">
    TN WEB RATS · Tamil Nadu · unofficials113@gmail.com
  </p>
</div>
```

**To:** `{{customer_email}}`

Note the **Template ID** (e.g. `template_customerxyz`)

---

## 3. Get Your Public Key

1. EmailJS Dashboard → **Account** → **General**
2. Copy the **Public Key** (e.g. `user_AbCdEfGhIj`)

---

## 4. Replace Placeholders in book.html

Find the `EJS` config block (≈line 630 in `book.html`) and replace:

```js
const EJS = {
  publicKey:   "YOUR_EMAILJS_PUBLIC_KEY",    // from Account > General
  serviceId:   "YOUR_SERVICE_ID",            // from Email Services
  ownerTpl:    "YOUR_OWNER_TEMPLATE_ID",     // Template 1 ID
  customerTpl: "YOUR_CUSTOMER_TEMPLATE_ID",  // Template 2 ID
};
```

---

## 5. Template Variables Reference

These are the variables `book.html` passes to EmailJS. Make sure your templates use them exactly:

| Variable | Source | Example |
|---|---|---|
| `order_id` | Generated on submit | `TNWR-ABC123` |
| `service` | Selected service | `PowerPoint Presentations` |
| `package` | Selected package | `Pro PPT` |
| `customer_name` | Form / Firebase profile | `Priya Sharma` |
| `customer_email` | Form / Firebase Auth | `priya@example.com` |
| `customer_phone` | Form / Firebase profile | `+91 98765 43210` |
| `final_price` | After discount | `269` |
| `original_price` | Before discount | `299` |
| `discount_percent` | From referral code | `10` |
| `referral_code` | Customer's used code | `TNWR-WRK-ABCD` |
| `payment_method` | `whatsapp` or `razorpay` | `whatsapp` |
| `payment_id` | Razorpay only | `pay_Abc123` or `N/A` |
| `deadline` | Customer's selected date | `2026-03-25` |
| `delivery_date` | Estimated from package tier | `2026-03-22` |
| `instructions` | Project details textarea | `20 slides, dark theme...` |
| `drive_link` | Optional drive link | `https://drive.google.com/...` |

---

## 6. Test It

1. Make a test booking on `book.html` (use a WhatsApp booking so Razorpay isn't needed)
2. Check your owner email — should arrive within 30 seconds
3. Check the customer email provided in the form

**If emails don't arrive:**
- Check EmailJS dashboard → **Email Logs** for errors
- Check spam folder
- Make sure public key is correct
- Free plan limit: 200 emails/month. Upgrade to paid if needed.

---

## 7. Optional: Upgrade Plan

| Plan | Emails/month | Price |
|---|---|---|
| Free | 200 | ₹0 |
| Personal | 1,000 | ≈₹500/mo |
| Professional | 10,000 | ≈₹2,000/mo |

For a growing business, upgrade when you hit ~150 emails/month to avoid hitting the cap.
