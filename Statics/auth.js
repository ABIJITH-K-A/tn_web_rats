
const FIREBASE_CONFIG = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID"
};

const REFERRAL_TIERS = {
  worker:     { code:"WRK", discount:5  },
  manager:    { code:"MGR", discount:10 },
  admin:      { code:"ADM", discount:15 },
  superadmin: { code:"SAD", discount:20 }
};

(async function initAuth() {
  const { initializeApp }                       = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
  const { getAuth, createUserWithEmailAndPassword,
          signInWithEmailAndPassword, signOut,
          onAuthStateChanged }                  = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
  const { getFirestore, doc, getDoc, setDoc,
          updateDoc, collection, addDoc,
          query, where, getDocs,
          serverTimestamp }                     = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  const app  = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db   = getFirestore(app);
  let currentUser = null, currentUserData = null;

  // ── Helpers ────────────────────────────────────────
  function _genCode(role) {
    const t = REFERRAL_TIERS[role]; if (!t) return null;
    const c = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let r = ""; for (let i=0;i<4;i++) r+=c[Math.floor(Math.random()*c.length)];
    return `TNWR-${t.code}-${r}`;
  }

  async function getUserData(uid) {
    try { const s=await getDoc(doc(db,"users",uid)); return s.exists()?s.data():null; }
    catch(e){ return null; }
  }

  function _firebaseMsg(code) {
    return ({
      "auth/email-already-in-use": "Email already registered.",
      "auth/invalid-email":        "Enter a valid email.",
      "auth/weak-password":        "Password must be 6+ characters.",
      "auth/user-not-found":       "No account found.",
      "auth/wrong-password":       "Incorrect password.",
      "auth/too-many-requests":    "Too many attempts. Try later.",
      "auth/invalid-credential":   "Invalid email or password."
    })[code] || "Something went wrong. Try again.";
  }

  // ── Auth State ─────────────────────────────────────
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    currentUserData = user ? await getUserData(user.uid) : null;
    document.dispatchEvent(new CustomEvent("tnwr:authChange",
      { detail: { user: currentUser, userData: currentUserData } }));
    _updateNavbar();
    if (user) _checkPendingReview();
  });

  // ── Register ───────────────────────────────────────
  async function registerUser({ name, email, phone, password, referralCode }) {
    let referralData = null;
    if (referralCode?.trim()) {
      referralData = await validateReferralCode(referralCode.trim().toUpperCase());
      if (!referralData.valid) return { success:false, error:referralData.message };
    }
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db,"users",user.uid), {
        name, email, phone, role:"customer",
        referralCode:null, referralTier:null,
        usedReferralCode: referralCode?.trim().toUpperCase()||null,
        referredBy:   referralData?.ownerUid||null,
        discountPercent: referralData?.discountPercent||0,
        createdAt: serverTimestamp()
      });
      if (referralData && referralCode) {
        await updateDoc(doc(db,"referralCodes",referralCode.trim().toUpperCase()),
          { timesUsed: (referralData.timesUsed||0)+1 });
      }
      return { success:true, discount: referralData?.discountPercent||0 };
    } catch(e) { return { success:false, error:_firebaseMsg(e.code) }; }
  }

  // ── Login ──────────────────────────────────────────
  async function loginUser({ email, password }) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success:true };
    } catch(e) { return { success:false, error:_firebaseMsg(e.code) }; }
  }

  async function logoutUser() { try{ await signOut(auth); }catch(e){} }

  // ── Validate Referral Code ─────────────────────────
  async function validateReferralCode(code) {
    try {
      const snap = await getDoc(doc(db,"referralCodes",code));
      if (!snap.exists()) return { valid:false, message:"Invalid referral code." };
      const d = snap.data();
      const ownerSnap = await getDoc(doc(db,"users",d.ownerUid));
      if (ownerSnap.exists() && ownerSnap.data().role==="customer")
        return { valid:false, message:"This code cannot be used." };
      return { valid:true, ownerUid:d.ownerUid, discountPercent:d.discountPercent,
               timesUsed:d.timesUsed||0, message:`${d.discountPercent}% discount applied!` };
    } catch(e) { return { valid:false, message:"Could not validate. Try again." }; }
  }

  // ── Save Order ─────────────────────────────────────
  async function saveOrder(orderData) {
    try {
      const ref = await addDoc(collection(db,"orders"), {
        ...orderData, customerId:currentUser.uid,
        status:"pending", reviewDone:false, createdAt:serverTimestamp()
      });
      return { success:true, orderId:ref.id };
    } catch(e) { return { success:false, error:e.message }; }
  }

  // ── Promote User (admin only) ──────────────────────
  async function promoteUser(uid, newRole) {
    if (!["admin","superadmin"].includes(currentUserData?.role))
      return { success:false, error:"Insufficient permissions." };
    if (newRole==="customer") return { success:false, error:"Cannot promote to customer." };
    try {
      const code = _genCode(newRole);
      const tier = REFERRAL_TIERS[newRole];
      await setDoc(doc(db,"referralCodes",code), {
        ownerUid:uid, ownerRole:newRole, discountPercent:tier.discount,
        timesUsed:0, createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,"users",uid),
        { role:newRole, referralCode:code, referralTier:tier.code });
      return { success:true, code };
    } catch(e) { return { success:false, error:e.message }; }
  }

  // ── Pending Review Check ───────────────────────────
  async function _checkPendingReview() {
    try {
      const q = query(collection(db,"orders"),
        where("customerId","==",currentUser.uid),
        where("status","==","complete"),
        where("reviewDone","==",false));
      const s = await getDocs(q);
      if (!s.empty) document.dispatchEvent(new CustomEvent("tnwr:showReview",
        { detail:{ orderId:s.docs[0].id, orderData:s.docs[0].data() } }));
    } catch(e){}
  }

  // ── Navbar Update ──────────────────────────────────
  function _updateNavbar() {
    const isAdmin = ["admin","superadmin","manager","worker","owner"].includes(currentUserData?.role);
    document.querySelectorAll(".nav-auth-login").forEach(el =>
      el.classList.toggle("d-none", !!currentUser));
    document.querySelectorAll(".nav-auth-logout").forEach(el =>
      el.classList.toggle("d-none", !currentUser));
    document.querySelectorAll(".nav-user-name").forEach(el => {
      el.classList.toggle("d-none", !currentUser);
      if (currentUserData) el.textContent = currentUserData.name || "Account";
    });
    document.querySelectorAll(".nav-admin-link").forEach(el =>
      el.classList.toggle("d-none", !isAdmin));
  }

  // ── Expose API ─────────────────────────────────────
  window.TNWR_AUTH = {
    auth, db, REFERRAL_TIERS,
    getCurrentUser:     () => currentUser,
    getCurrentUserData: () => currentUserData,
    registerUser, loginUser, logoutUser,
    validateReferralCode, saveOrder, promoteUser, getUserData
  };
  document.dispatchEvent(new Event("tnwr:authReady"));
})();