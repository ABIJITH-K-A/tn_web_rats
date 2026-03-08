const WHATSAPP_NUMBER = "8300920680";
const RAZORPAY_KEY    = "YOUR_RAZORPAY_KEY_ID";

// ── SERVICE + PACKAGE DATA ──────────────────────────────────
const SERVICES = {
  ppt: {
    id:      "ppt",
    name:    "PowerPoint Presentations",
    tagline: "Slides that win pitches",
    icon:    "fa-file-powerpoint",
    packages:[
      {
        id:"elite", tier:1, label:"Elite",
        badge:"⭐ BEST VALUE", urgency:"Only 3 slots left!",
        price:499, delivery:"24hrs",
        features:[
          "20 custom-branded slides","Full animations & transitions",
          "2 revisions included","Source file (PPTX)",
          "Coaching notes","24-hour delivery"
        ]
      },
      {
        id:"pro", tier:2, label:"Pro",
        badge:"🔥 MOST POPULAR", urgency:null,
        price:299, delivery:"48hrs",
        features:[
          "12 slides with template","Smooth animations",
          "1 revision included","Source file (PPTX)","48-hour delivery"
        ]
      },
      {
        id:"starter", tier:3, label:"Starter",
        badge:null, urgency:null,
        price:149, delivery:"72hrs",
        features:[
          "6 slides, clean template","Professional layout",
          "72-hour delivery"
        ]
      }
    ]
  },
  poster: {
    id:      "poster",
    name:    "Posters & Graphics",
    tagline: "Designs that get noticed",
    icon:    "fa-image",
    packages:[
      {
        id:"brand_kit", tier:1, label:"Brand Kit",
        badge:"⭐ BEST VALUE", urgency:"Only 3 slots left!",
        price:799, delivery:"48hrs",
        features:[
          "5 custom poster designs","Logo included",
          "Social media kit (8 sizes)","Brand color palette",
          "3 revisions","Source files","Commercial license"
        ]
      },
      {
        id:"campaign", tier:2, label:"Campaign",
        badge:"🔥 MOST POPULAR", urgency:null,
        price:399, delivery:"36hrs",
        features:[
          "3 poster designs","Social media sizes",
          "2 revisions","PNG + PDF delivery"
        ]
      },
      {
        id:"single", tier:3, label:"Single",
        badge:null, urgency:null,
        price:149, delivery:"72hrs",
        features:[
          "1 poster design","1 revision",
          "PNG + PDF delivery","72-hour delivery"
        ]
      }
    ]
  },
  website: {
    id:      "website",
    name:    "Website Development",
    tagline: "Websites that work while you sleep",
    icon:    "fa-laptop-code",
    packages:[
      {
        id:"business_pro", tier:1, label:"Business Pro",
        badge:"⭐ BEST VALUE", urgency:"Only 3 slots left!",
        price:4999, delivery:"7 days",
        features:[
          "8-page custom design","Fully responsive (all devices)",
          "Contact forms","Google Analytics setup",
          "On-page SEO","3 revisions",
          "1-month support","Domain guidance"
        ]
      },
      {
        id:"standard", tier:2, label:"Standard",
        badge:"🔥 MOST POPULAR", urgency:null,
        price:2499, delivery:"5 days",
        features:[
          "4-page template customization","Fully responsive",
          "Contact form","2 revisions","2-week support"
        ]
      },
      {
        id:"landing", tier:3, label:"Landing Page",
        badge:null, urgency:null,
        price:999, delivery:"3 days",
        features:[
          "Single landing page","Fully responsive",
          "Contact form","1 revision"
        ]
      }
    ]
  }
};

// ── STATE ───────────────────────────────────────────────────
const state = {
  step:         1,
  serviceId:    null,
  packageData:  null,
  formData:     {},
  discount:     0,
  discountPct:  0,
  referralCode: null
};

// ── INIT ────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  renderServiceCards();
  bindAuthListeners();
  bindModalButtons();
});

document.addEventListener("tnwr:authChange", ({ detail }) => {
  if (detail.userData) {
    state.discount    = detail.userData.discountPercent || 0;
    state.discountPct = state.discount;
    state.referralCode = detail.userData.usedReferralCode || null;
  }
  // Hide auth modal if open and we're mid-flow
  if (detail.user && state.step >= 3) {
    closeAuthModal();
    buildStep3();
  }
});

// ── STEP 1: SERVICE CARDS ───────────────────────────────────
function renderServiceCards() {
  const container = document.getElementById("step1-cards");
  if (!container) return;
  container.innerHTML = Object.values(SERVICES).map(s => `
    <div class="col-md-4">
      <div class="booking-service-card" onclick="selectService('${s.id}')">
        <div class="bsc-icon"><i class="fas ${s.icon}"></i></div>
        <h4 class="bsc-title">${s.name}</h4>
        <p class="bsc-tagline">${s.tagline}</p>
        <button class="btn btn-outline-cyan mt-3">See Packages →</button>
      </div>
    </div>
  `).join("");
}

function selectService(serviceId) {
  state.serviceId = serviceId;
  state.step = 2;
  showStep(2);
  renderPackages(serviceId);
  updateStepIndicator(2);
}

// ── STEP 2: PACKAGES ─────────────────────────────────────────
function renderPackages(serviceId) {
  const svc       = SERVICES[serviceId];
  const container = document.getElementById("step2-packages");
  if (!container) return;

  document.getElementById("step2-service-name").textContent = svc.name;

  container.innerHTML = svc.packages.map(pkg => `
    <div class="col-md-4">
      <div class="pkg-card ${pkg.tier===2?'pkg-popular':''}" onclick="selectPackage('${serviceId}','${pkg.id}')">
        ${pkg.badge ? `<div class="pkg-badge">${pkg.badge}</div>` : ""}
        ${pkg.urgency ? `<div class="pkg-urgency"><i class="fas fa-fire"></i> ${pkg.urgency}</div>` : ""}
        <h4 class="pkg-name">${pkg.label}</h4>
        <div class="pkg-price">₹${pkg.price.toLocaleString("en-IN")}</div>
        <div class="pkg-delivery"><i class="fas fa-clock me-1"></i>Delivery: ${pkg.delivery}</div>
        <ul class="pkg-features mt-3">
          ${pkg.features.map(f => `<li><i class="fas fa-check text-cyan me-2"></i>${f}</li>`).join("")}
        </ul>
        <button class="btn btn-primary w-100 mt-3">Choose This Plan →</button>
      </div>
    </div>
  `).join("");
}

function selectPackage(serviceId, packageId) {
  const svc = SERVICES[serviceId];
  state.packageData = svc.packages.find(p => p.id === packageId);
  state.step = 3;
  updateStepIndicator(3);

  // Require auth before step 3
  const user = window.TNWR_AUTH?.getCurrentUser();
  if (!user) {
    showAuthModal("login");
    return;
  }
  buildStep3();
}

// ── STEP 3: PROJECT DETAILS ─────────────────────────────────
function buildStep3() {
  showStep(3);
  const svc = SERVICES[state.serviceId];
  document.getElementById("step3-service-label").textContent =
    `${svc.name} — ${state.packageData.label} (₹${state.packageData.price.toLocaleString("en-IN")})`;

  let extraFields = "";
  if (state.serviceId === "ppt") {
    extraFields = `
      <div class="col-md-4">
        <label class="form-label text-cyan">Slide Count</label>
        <input type="number" id="f-slideCount" class="form-control booking-input" placeholder="e.g. 12" min="1" max="100">
      </div>
      <div class="col-md-4">
        <label class="form-label text-cyan">Topic / Subject</label>
        <input type="text" id="f-topic" class="form-control booking-input" placeholder="e.g. Climate Change">
      </div>
      <div class="col-md-4">
        <label class="form-label text-cyan">Target Audience</label>
        <input type="text" id="f-audience" class="form-control booking-input" placeholder="e.g. College professors">
      </div>`;
  } else if (state.serviceId === "poster") {
    extraFields = `
      <div class="col-md-4">
        <label class="form-label text-cyan">Poster Size</label>
        <select id="f-posterSize" class="form-select booking-input">
          <option value="">Select size...</option>
          <option>A4</option><option>A3</option>
          <option>Social Media (1:1)</option><option>Custom</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label text-cyan">Main Headline</label>
        <input type="text" id="f-headline" class="form-control booking-input" placeholder="Your poster headline">
      </div>
      <div class="col-md-4">
        <label class="form-label text-cyan">Brand Colors (optional)</label>
        <input type="text" id="f-brandColors" class="form-control booking-input" placeholder="e.g. #FF0000, Navy blue">
      </div>`;
  } else if (state.serviceId === "website") {
    extraFields = `
      <div class="col-md-4">
        <label class="form-label text-cyan">Website Type</label>
        <select id="f-websiteType" class="form-select booking-input">
          <option value="">Select type...</option>
          <option>Portfolio</option><option>Business</option>
          <option>E-commerce</option><option>Blog</option><option>Other</option>
        </select>
      </div>
      <div class="col-md-4">
        <label class="form-label text-cyan">Domain Name (if any)</label>
        <input type="text" id="f-domain" class="form-control booking-input" placeholder="e.g. mysite.com">
      </div>
      <div class="col-md-4">
        <label class="form-label text-cyan">Reference URLs (optional)</label>
        <input type="text" id="f-referenceUrls" class="form-control booking-input" placeholder="Sites you like">
      </div>`;
  }

  document.getElementById("step3-extra").innerHTML = extraFields;
  // Pre-fill name/email/phone from user data
  const ud = window.TNWR_AUTH?.getCurrentUserData();
  if (ud) {
    const fn = document.getElementById("f-name");
    const fe = document.getElementById("f-email");
    const fp = document.getElementById("f-phone");
    if (fn) fn.value = ud.name  || "";
    if (fe) fe.value = ud.email || "";
    if (fp) fp.value = ud.phone || "";
  }
}

function collectStep3() {
  const required = ["f-name","f-email","f-phone","f-projectName","f-deadline","f-instructions"];
  for (const id of required) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      el?.focus(); showToast("Please fill all required fields.", "error"); return false;
    }
  }
  state.formData = {
    customerName:  document.getElementById("f-name")?.value.trim(),
    customerEmail: document.getElementById("f-email")?.value.trim(),
    customerPhone: document.getElementById("f-phone")?.value.trim(),
    projectName:   document.getElementById("f-projectName")?.value.trim(),
    deadline:      document.getElementById("f-deadline")?.value,
    instructions:  document.getElementById("f-instructions")?.value.trim(),
    driveLink:     document.getElementById("f-driveLink")?.value.trim(),
    // Service-specific
    slideCount:    document.getElementById("f-slideCount")?.value.trim(),
    topic:         document.getElementById("f-topic")?.value.trim(),
    audience:      document.getElementById("f-audience")?.value.trim(),
    posterSize:    document.getElementById("f-posterSize")?.value,
    headline:      document.getElementById("f-headline")?.value.trim(),
    brandColors:   document.getElementById("f-brandColors")?.value.trim(),
    websiteType:   document.getElementById("f-websiteType")?.value,
    domain:        document.getElementById("f-domain")?.value.trim(),
    referenceUrls: document.getElementById("f-referenceUrls")?.value.trim()
  };
  return true;
}

// ── STEP 4: ORDER SUMMARY ────────────────────────────────────
function goToSummary() {
  if (!collectStep3()) return;
  state.step = 4;
  showStep(4);
  updateStepIndicator(4);
  renderSummary();
}

function renderSummary() {
  const pkg       = state.packageData;
  const svc       = SERVICES[state.serviceId];
  const original  = pkg.price;
  const discount  = Math.round(original * state.discountPct / 100);
  const final     = original - discount;

  const deadline  = new Date(state.formData.deadline);
  const now       = new Date();
  const delivDays = { ppt:{elite:1,pro:2,starter:3}, poster:{brand_kit:2,campaign:2,single:3}, website:{business_pro:7,standard:5,landing:3} };
  const daysAhead = delivDays[state.serviceId]?.[pkg.id] || 3;
  const delivDate = new Date(now.getTime() + daysAhead * 86400000);
  const delivStr  = delivDate.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});

  document.getElementById("sum-service").textContent   = svc.name;
  document.getElementById("sum-package").textContent   = pkg.label;
  document.getElementById("sum-original").textContent  = `₹${original.toLocaleString("en-IN")}`;
  document.getElementById("sum-discount").textContent  = discount > 0 ? `-₹${discount} (${state.discountPct}%)` : "—";
  document.getElementById("sum-final").textContent     = `₹${final.toLocaleString("en-IN")}`;
  document.getElementById("sum-delivery").textContent  = delivStr;
  document.getElementById("sum-name").textContent      = state.formData.customerName;
  document.getElementById("sum-email").textContent     = state.formData.customerEmail;
  document.getElementById("sum-phone").textContent     = state.formData.customerPhone;

  // Show/hide discount row
  document.getElementById("sum-discount-row").style.display = discount > 0 ? "" : "none";

  // Desktop: Pay primary / WA secondary | Mobile: WA primary / Pay secondary
  const isMobile = window.innerWidth < 768;
  const payBtn = document.getElementById("btn-pay-now");
  const waBtn  = document.getElementById("btn-whatsapp");
  if (payBtn && waBtn) {
    if (isMobile) {
      waBtn.classList.add("btn-primary"); waBtn.classList.remove("btn-outline-success");
      payBtn.classList.remove("btn-primary"); payBtn.classList.add("btn-outline-cyan");
    } else {
      payBtn.classList.add("btn-primary"); payBtn.classList.remove("btn-outline-cyan");
      waBtn.classList.remove("btn-primary"); waBtn.classList.add("btn-outline-success");
    }
  }

  // Store for payment
  window._tnwr_orderSummary = {
    service:       svc.name,
    package:       pkg.label,
    originalPrice: original,
    discount, discountPct: state.discountPct, referralCode: state.referralCode,
    finalPrice: final, deliveryDate: delivStr,
    ...state.formData
  };
}

// ── RAZORPAY PAYMENT ─────────────────────────────────────────
function initiatePayment() {
  const o = window._tnwr_orderSummary;
  if (!o) return;
  const options = {
    key:         RAZORPAY_KEY,
    amount:      o.finalPrice * 100,   // paise
    currency:    "INR",
    name:        "TN WEB RATS",
    description: `${o.service} — ${o.package}`,
    prefill: {
      name:    o.customerName,
      email:   o.customerEmail,
      contact: o.customerPhone
    },
    theme: { color: "#66FCF1" },
    handler: async function(resp) {
      const saveResult = await window.TNWR_AUTH.saveOrder({
        ...o, paymentId: resp.razorpay_payment_id, paymentMethod:"razorpay"
      });
      if (!saveResult?.success) {
        showToast(saveResult?.error || "Could not save order. Please contact support.", "error");
        return;
      }
      const orderId = saveResult.orderId || "TNWR-" + Date.now();
      window.TNWR_EMAIL?.sendOrderEmails({ ...o, orderId }, resp.razorpay_payment_id);
      showSuccessScreen(orderId, o);
    }
  };
  const rzp = new Razorpay(options);
  rzp.open();
}

// ── WHATSAPP BOOKING ─────────────────────────────────────────
async function bookViaWhatsapp() {
  const o = window._tnwr_orderSummary;
  if (!o) return;
  // Save order first
  const saveResult = await window.TNWR_AUTH.saveOrder({ ...o, paymentMethod:"whatsapp" });
  if (!saveResult?.success) {
    showToast(saveResult?.error || "Could not save order. Please contact support.", "error");
    return;
  }
  const orderId = saveResult.orderId || "TNWR-" + Date.now();
  // Send background emails
  window.TNWR_EMAIL?.sendOrderEmails({ ...o, orderId }, null);

  const msg = [
    `Hi TN WEB RATS! I'd like to place an order.`,
    ``,
    `Order ID: ${orderId}`,
    `Service: ${o.service}`,
    `Package: ${o.package} — ₹${o.finalPrice}`,
    ``,
    `Name: ${o.customerName}`,
    `Email: ${o.customerEmail}`,
    `Phone: ${o.customerPhone}`,
    ``,
    `Project: ${o.projectName}`,
    `Deadline: ${o.deadline}`,
    `Instructions: ${o.instructions}`,
    o.driveLink ? `Drive Link: ${o.driveLink}` : null
  ].filter(Boolean).join("\n");

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  showSuccessScreen(orderId, o);
}

// ── SUCCESS SCREEN ────────────────────────────────────────────
function showSuccessScreen(orderId, o) {
  document.getElementById("success-order-id").textContent = orderId;
  document.getElementById("success-service").textContent  = `${o.service} — ${o.package}`;
  document.getElementById("success-amount").textContent   = `₹${o.finalPrice.toLocaleString("en-IN")}`;
  showStep("success");
}

// ── UI HELPERS ────────────────────────────────────────────────
function showStep(step) {
  ["step1","step2","step3","step4","success"].forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.style.display = (s === String(step)) ? "block" : "none";
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  if (state.step <= 1) return;
  state.step--;
  showStep(state.step);
  updateStepIndicator(state.step);
}

function updateStepIndicator(step) {
  document.querySelectorAll(".step-dot").forEach((el, i) => {
    el.classList.toggle("active",   i + 1 === step);
    el.classList.toggle("complete", i + 1 <  step);
  });
}

function showToast(msg, type="info") {
  const t = document.getElementById("booking-toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = `booking-toast show ${type}`;
  setTimeout(() => t.className = "booking-toast", 3200);
}

// ── AUTH MODAL ────────────────────────────────────────────────
function showAuthModal(mode = "login") {
  const modal = document.getElementById("auth-modal");
  if (!modal) return;
  modal.style.display = "flex";
  switchAuthMode(mode);
}
function closeAuthModal() {
  const modal = document.getElementById("auth-modal");
  if (modal) modal.style.display = "none";
}
function switchAuthMode(mode) {
  document.getElementById("auth-login-pane").style.display  = mode==="login"  ? "block":"none";
  document.getElementById("auth-register-pane").style.display = mode==="register"?"block":"none";
}

function bindAuthListeners() {
  document.getElementById("btn-do-login")?.addEventListener("click", async () => {
    const email    = document.getElementById("login-email")?.value.trim();
    const password = document.getElementById("login-password")?.value;
    const errEl    = document.getElementById("login-error");
    if (!email || !password) { if(errEl) errEl.textContent="Fill all fields."; return; }
    const btn = document.getElementById("btn-do-login");
    btn.disabled = true; btn.textContent = "Signing in...";
    const result = await window.TNWR_AUTH?.loginUser({ email, password });
    btn.disabled = false; btn.textContent = "Sign In";
    if (!result?.success && errEl) errEl.textContent = result?.error || "Error";
    // authChange event handles closing modal + continuing flow
  });

  document.getElementById("btn-do-register")?.addEventListener("click", async () => {
    const name     = document.getElementById("reg-name")?.value.trim();
    const email    = document.getElementById("reg-email")?.value.trim();
    const phone    = document.getElementById("reg-phone")?.value.trim();
    const password = document.getElementById("reg-password")?.value;
    const confirm  = document.getElementById("reg-confirm")?.value;
    const refCode  = document.getElementById("reg-referral")?.value.trim();
    const errEl    = document.getElementById("register-error");
    if (!name||!email||!phone||!password) { if(errEl) errEl.textContent="Fill all required fields."; return; }
    if (password !== confirm)             { if(errEl) errEl.textContent="Passwords do not match."; return; }
    const btn = document.getElementById("btn-do-register");
    btn.disabled=true; btn.textContent="Creating account...";
    const result = await window.TNWR_AUTH?.registerUser({ name,email,phone,password,referralCode:refCode });
    btn.disabled=false; btn.textContent="Create Account";
    if (!result?.success && errEl) { errEl.textContent = result?.error||"Error"; return; }
    if (result?.discount > 0) showToast(`Referral applied! ${result.discount}% off your orders.`, "success");
  });

  // Live referral code validation
  const refInput = document.getElementById("reg-referral");
  const refFeedback = document.getElementById("ref-feedback");
  let refTimer;
  refInput?.addEventListener("input", () => {
    clearTimeout(refTimer);
    const code = refInput.value.trim().toUpperCase();
    if (!code) { refFeedback.textContent=""; return; }
    refFeedback.textContent = "Checking...";
    refFeedback.className   = "ref-feedback checking";
    refTimer = setTimeout(async () => {
      const result = await window.TNWR_AUTH?.validateReferralCode(code);
      refFeedback.textContent = result ? (result.valid ? "✓ "+result.message : "✗ "+result.message) : "";
      refFeedback.className   = "ref-feedback " + (result?.valid ? "valid" : "invalid");
    }, 600);
  });
}

function bindModalButtons() {
  document.getElementById("close-auth-modal")?.addEventListener("click", () => {
    closeAuthModal();
    // If we were mid-flow, go back to step 2
    if (state.step >= 3) { state.step=2; showStep(2); updateStepIndicator(2); }
  });
  document.getElementById("auth-modal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("auth-modal")) {
      closeAuthModal();
      if (state.step >= 3) { state.step=2; showStep(2); updateStepIndicator(2); }
    }
  });
}

// ── EXPOSE ────────────────────────────────────────────────────
window.selectService   = selectService;
window.selectPackage   = selectPackage;
window.goToSummary     = goToSummary;
window.goBack          = goBack;
window.initiatePayment = initiatePayment;
window.bookViaWhatsapp = bookViaWhatsapp;
window.showAuthModal   = showAuthModal;
window.switchAuthMode  = switchAuthMode;
window.closeAuthModal  = closeAuthModal;