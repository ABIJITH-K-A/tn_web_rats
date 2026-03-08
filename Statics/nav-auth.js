const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBf1c5bC31M0m5PVX67QsyeiOIS-0acRkI",
  authDomain: "unofficial-webrats.firebaseapp.com",
  projectId: "unofficial-webrats",
  storageBucket: "unofficial-webrats.firebasestorage.app",
  messagingSenderId: "378552539429",
  appId: "1:378552539429:web:e4cf876e5b65c9fd4ee2cc",
  measurementId: "G-JYSYHTJKD7"
};

const ROLE_DASHBOARD = {
  owner: "owner-dashboard.html",
  superadmin: "superadmin-dashboard.html",
  admin: "admin-dashboard.html",
  manager: "manager-dashboard.html",
  worker: "worker-dashboard.html"
};

const STAFF_ROLES = new Set(Object.keys(ROLE_DASHBOARD));

const { initializeApp, getApps, getApp } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
const { getAuth, onAuthStateChanged, signOut } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

function _navList() {
  return document.querySelector(".navbar .navbar-nav");
}

function _makeItem(key, href, text, color) {
  const li = document.createElement("li");
  li.className = `nav-item tnwr-auth-item tnwr-auth-${key} d-none`;
  const a = document.createElement("a");
  a.className = "nav-link";
  a.href = href;
  a.textContent = text;
  if (color) a.style.color = color;
  li.appendChild(a);
  return li;
}

function _ensureNavItems(nav) {
  if (!nav) return null;

  nav.querySelectorAll('a[href="signup.html"]').forEach(a => {
    const li = a.closest("li");
    if (li) li.classList.add("tnwr-auth-signup");
  });

  let profile = nav.querySelector(".tnwr-auth-profile");
  let logout = nav.querySelector(".tnwr-auth-logout");
  let dash = nav.querySelector(".tnwr-auth-dashboard");

  if (!profile) {
    profile = _makeItem("profile", "profile.html", "My Profile", "var(--cyan)");
    nav.appendChild(profile);
  }
  if (!logout) {
    logout = _makeItem("logout", "#", "Logout", "");
    nav.appendChild(logout);
  }
  if (!dash) {
    dash = _makeItem("dashboard", "admin-dashboard.html", "Dashboard", "var(--teal)");
    nav.appendChild(dash);
  }

  const logoutA = logout.querySelector("a");
  if (logoutA && !logoutA.dataset.bound) {
    logoutA.dataset.bound = "1";
    logoutA.addEventListener("click", async e => {
      e.preventDefault();
      await signOut(auth).catch(() => {});
      window.location.reload();
    });
  }

  return { profile, logout, dash };
}

async function _readUserData(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

function _toggle(el, show) {
  if (!el) return;
  el.classList.toggle("d-none", !show);
}

onAuthStateChanged(auth, async user => {
  const nav = _navList();
  const parts = _ensureNavItems(nav);
  if (!nav || !parts) return;

  const signupItems = nav.querySelectorAll(".tnwr-auth-signup");

  if (!user) {
    signupItems.forEach(el => el.classList.remove("d-none"));
    _toggle(parts.profile, false);
    _toggle(parts.logout, false);
    _toggle(parts.dash, false);
    return;
  }

  signupItems.forEach(el => el.classList.add("d-none"));

  const userData = await _readUserData(user.uid);
  const role = (userData?.role || "").toLowerCase();
  const name = userData?.name || user.email || "My Profile";

  const profileA = parts.profile.querySelector("a");
  if (profileA) profileA.textContent = name.split(" ")[0] || "My Profile";

  _toggle(parts.profile, true);
  _toggle(parts.logout, true);

  if (STAFF_ROLES.has(role)) {
    const dashA = parts.dash.querySelector("a");
    if (dashA) dashA.href = ROLE_DASHBOARD[role] || "admin-dashboard.html";
    _toggle(parts.dash, true);
  } else {
    _toggle(parts.dash, false);
  }
});
