/* ═══════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBf1c5bC31M0m5PVX67QsyeiOIS-0acRkI",
  authDomain: "unofficial-webrats.firebaseapp.com",
  projectId: "unofficial-webrats",
  storageBucket: "unofficial-webrats.firebasestorage.app",
  messagingSenderId: "378552539429",
  appId: "1:378552539429:web:e4cf876e5b65c9fd4ee2cc",
  measurementId: "G-JYSYHTJKD7"
};

/* ── Hardcoded first superadmin bootstrap ───────────────────
   1. Create a Firebase Auth account manually in the console.
   2. Copy the UID here. Their /users/{uid} doc is auto-created
      with role:superadmin the first time they sign in here.
   3. Once the doc exists, this code is a no-op forever.
─────────────────────────────────────────────────────────── */
const BOOTSTRAP_SA_UID   = "x5Lk3ZRvXfWD1a12eEZu2cIJRtn2";
const BOOTSTRAP_SA_EMAIL = "suriyakssuriya@gmail.com";
const BOOTSTRAP_SA_NAME  = "Super Admin";

/* ── Firebase init ────────────────────────────────────────── */
const { initializeApp }                          = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
const { getAuth, signOut, onAuthStateChanged }   = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");
const { getFirestore, doc, getDoc, setDoc, updateDoc,
        addDoc, getDocs, collection, query, where,
        orderBy, limit, serverTimestamp, deleteDoc,
        increment, writeBatch, runTransaction }             = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

const app  = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db   = getFirestore(app);

const STAFF_ROLES = ["worker","manager","admin","superadmin","owner"];
const ROLE_DASHBOARD = {
  owner: "owner-dashboard.html",
  superadmin: "superadmin-dashboard.html",
  admin: "admin-dashboard.html",
  manager: "manager-dashboard.html",
  worker: "worker-dashboard.html"
};
const PAYROLL_CONFIG = {
  workerSharePct: 0.75,
  platformSharePct: 0.25,
  payoutDay: 1,
  minPayout: 100
};
const OWNER_APPROVALS_REQUIRED = 2;
const INVITE_KEY_TTL_DAYS = 7;
const APPROVER_ROLES = ["admin","superadmin","owner"];

let CU = null, CUD = null;
let _confirmCallback = null;
let _currentPayrollId = null;
let _assigningOrderId = null;

function _isApproverRole(role){
  return APPROVER_ROLES.includes((role || "").toLowerCase());
}

/* ════════════════════════════════════════════════════════════
   AUTH GUARD
════════════════════════════════════════════════════════════ */
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.replace("login.html"); return; }
  CU = user;

  /* Bootstrap first superadmin if needed */
  if (user.uid === BOOTSTRAP_SA_UID) {
    const snap = await getDoc(doc(db,"users",user.uid)).catch(()=>null);
    if (!snap?.exists()) {
      await setDoc(doc(db,"users",user.uid),{
        name:BOOTSTRAP_SA_NAME, email:BOOTSTRAP_SA_EMAIL,
        phone:"", role:"superadmin",
        referralCode:null, discountPercent:0,
        createdAt:serverTimestamp()
      }).catch(e=>console.warn("bootstrap:",e));
    }
  }

  const snap = await getDoc(doc(db,"users",user.uid)).catch(()=>null);
  CUD = snap?.data();
  if (!CUD || !STAFF_ROLES.includes(CUD.role)) {
    await signOut(auth); window.location.replace("admin-signup.html"); return;
  }

  const expected = ROLE_DASHBOARD[CUD.role];
  const current  = window.location.pathname.split("/").pop();
  if (expected && current && current !== expected) {
    window.location.replace(expected); return;
  }

  _initUI();
});

function _initUI(){
  const role = CUD.role;
  const name = CUD.name || CU.email;

  /* Topbar */
  _q("tbUserName").textContent = name.split(" ")[0];
  const roleLabel = role === "owner" ? "Owner" : role.charAt(0).toUpperCase()+role.slice(1);
  _q("tbUserRole").textContent = " ? " + roleLabel;
  _q("sbName").textContent = name;
  _q("sbRole").textContent = roleLabel;
  _q("sbRoleLine").textContent = roleLabel + " Portal";

  /* Clock */
  const tick=()=>{const n=new Date();_q("clock").textContent=n.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})+" "+n.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});};
  tick();setInterval(tick,30000);

  /* Role-based sidebar visibility */
  document.querySelectorAll("[data-roles]").forEach(el=>{
    const roles=el.dataset.roles.split(",");
    if(!roles.includes(role))el.style.display="none";
  });

  /* Invite key role selector per hierarchy */
  const krs = _q("keyRoleSelect");
  if(role==="owner" || role==="superadmin"){
    krs.style.display="block";
    krs.innerHTML=`<option value="superadmin">Super Admin</option><option value="admin">Admin</option><option value="manager">Manager</option><option value="worker">Worker</option>`;
  }else if(role==="admin"){
    krs.style.display="block";
    krs.innerHTML=`<option value="manager">Manager</option><option value="worker">Worker</option>`;
  }else{
    // manager — no selector, auto-worker
    krs.style.display="none";
    _q("genKeyLabel").textContent="Generate Worker Key";
  }

  /* Default view */
  switchView("overview");
  _loadOverview();
  _loadPendingBadge();
}

/* ════════════════════════════════════════════════════════════
   MODULE 8 — MOBILE DRAWER
   Requirements: 1)nav-click 2)ESC 3)overlay-click 4)scroll-lock 5)max-height
════════════════════════════════════════════════════════════ */
function openDrawer(){
  _q("sidebar").classList.add("is-open");
  _q("navOverlay").classList.add("is-visible");
  document.body.style.overflow="hidden"; /* req 4 */
}
function closeDrawer(){
  _q("sidebar").classList.remove("is-open");
  _q("navOverlay").classList.remove("is-visible");
  document.body.style.overflow="";       /* req 4 */
}
_q("btnHamburger").addEventListener("click",openDrawer);
_q("navOverlay").addEventListener("click",closeDrawer);                            /* req 3 */
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDrawer();});      /* req 2 */

/* ── Sidebar nav switching ────────────────────────────────── */
document.querySelectorAll(".sb-link[data-view]").forEach(link=>{
  link.addEventListener("click",e=>{
    e.preventDefault();
    const view=link.dataset.view;
    switchView(view);
    if(window.innerWidth<992)closeDrawer(); /* req 1 */
  });
});

_q("btnLogout").addEventListener("click",async()=>{
  await signOut(auth); window.location.replace("admin-signup.html");
});

function switchView(name){
  document.querySelectorAll(".view-panel").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".sb-link").forEach(l=>l.classList.remove("active"));
  _q("view-"+name)?.classList.add("active");
  document.querySelector(`.sb-link[data-view="${name}"]`)?.classList.add("active");
  /* Lazy-load sections */
  if(name==="orders")     _loadOrders();
  if(name==="users")      _loadUsers();
  if(name==="referrals")  _loadReferrals();
  if(name==="reviews")    _loadReviews();
  if(name==="wallet")     _loadWallet();
  if(name==="reports")    _loadReports();
  if(name==="samples")    _loadSamples();
  if(name==="approvals")  _loadApprovals();
  if(name==="payroll")    _loadPayroll();
  if(name==="teampay")    _loadTeamPay();
  if(name==="myorders")   _loadMyOrders();
  if(name==="earnings")   _loadEarnings();
  if(name==="invitekeys") _loadInviteKeys();
}

/* ════════════════════════════════════════════════════════════
   OVERVIEW
════════════════════════════════════════════════════════════ */
async function _loadOverview(){
  try{
    const [ordSnap,userSnap]=await Promise.all([
      getDocs(query(collection(db,"orders"),orderBy("createdAt","desc"),limit(50))),
      getDocs(collection(db,"users"))
    ]);
    const orders=ordSnap.docs.map(d=>({id:d.id,...d.data()}));
    const total=orders.length;
    const pending=orders.filter(o=>o.status==="pending").length;
    const rev=orders.reduce((s,o)=>s+(o.paymentStatus==="paid"?Number(o.finalPrice||0):0),0);
    _q("ov-total").textContent  = total;
    _q("ov-pending").textContent= pending;
    _q("ov-revenue").textContent= "₹"+rev.toLocaleString("en-IN");
    _q("ov-users").textContent  = userSnap.size;
    _q("ovOrdersBody").innerHTML=orders.slice(0,8).map(o=>`
      <tr>
        <td><span style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${o.id.slice(0,10)}…</span></td>
        <td><strong>${o.service||"—"}</strong><br><small style="color:rgba(197,198,199,.35)">${o.package||""}</small></td>
        <td style="font-size:.82rem">${o.customerName||"—"}</td>
        <td style="font-family:var(--mono);color:var(--cyan)">₹${(o.finalPrice||0).toLocaleString("en-IN")}</td>
        <td><span class="pill pill-${(o.status||"pending").replace(/\s/,"_")}">${(o.status||"pending").replace("_"," ")}</span></td>
        <td><span class="pill pill-${o.paymentStatus||"unpaid"}">${o.paymentStatus||"unpaid"}</span></td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${o.createdAt?.toDate?.().toLocaleDateString("en-IN",{day:"numeric",month:"short"})||"—"}</td>
      </tr>`).join("")||`<tr><td colspan="7"><div class="empty-state"><i class="fas fa-inbox"></i>no orders yet</div></td></tr>`;
    if(pending>0){_q("pendingBadge").textContent=pending;_q("pendingBadge").classList.remove("d-none");}
  }catch(e){console.error("overview:",e);}
}

async function _loadPendingBadge(){
  try{
    const snap=await getDocs(query(collection(db,"orders"),where("status","==","pending")));
    if(snap.size>0){_q("pendingBadge").textContent=snap.size;_q("pendingBadge").classList.remove("d-none");}
  }catch(e){}
}

/* ════════════════════════════════════════════════════════════
   ORDERS
════════════════════════════════════════════════════════════ */
let _allOrders=[], _allWorkers=[];
async function _loadOrders(){
  _q("ordersBody").innerHTML=`<tr><td colspan="8"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading…</div></td></tr>`;
  try{
    const [ordSnap,wSnap]=await Promise.all([
      getDocs(query(collection(db,"orders"),orderBy("createdAt","desc"))),
      getDocs(query(collection(db,"users"),where("role","==","worker")))
    ]);
    _allOrders=ordSnap.docs.map(d=>({id:d.id,...d.data()}));
    _allWorkers=wSnap.docs.map(d=>({id:d.id,...d.data()}));
    _renderOrders();
  }catch(e){_q("ordersBody").innerHTML=`<tr><td colspan="8"><div class="empty-state">error loading orders</div></td></tr>`;}
}

_q("ordSearch")?.addEventListener("input",_renderOrders);
_q("ordStatusFilter")?.addEventListener("change",_renderOrders);
_q("ordSvcFilter")?.addEventListener("change",_renderOrders);

function _renderOrders(){
  const q=(_q("ordSearch")?.value||"").toLowerCase();
  const sf=_q("ordStatusFilter")?.value||"";
  const vf=_q("ordSvcFilter")?.value||"";
  const filtered=_allOrders.filter(o=>{
    const mQ=!q||(o.customerName||"").toLowerCase().includes(q)||(o.id||"").toLowerCase().includes(q)||(o.service||"").toLowerCase().includes(q);
    const mS=!sf||o.status===sf;
    const mV=!vf||o.service===vf;
    return mQ&&mS&&mV;
  });
  const workerMap=new Map(_allWorkers.map(w=>[w.id,w]));
  _q("ordersBody").innerHTML=filtered.map(o=>{
    const assignedIds=(Array.isArray(o.assignedWorkers)&&o.assignedWorkers.length)?o.assignedWorkers:(o.workerAssigned?[o.workerAssigned]:[]);
    const assignedNames=assignedIds.map(id=>workerMap.get(id)?.name||"Unknown").join(", ");
    const assignedLabel=assignedNames||"Unassigned";
    const assignStatus=o.assignmentStatus==="pending_approval"?`<span class="pill pill-pending">approval pending</span>`:"";
    return `
    <tr>
      <td><span style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${o.id.slice(0,10)}?</span></td>
      <td><strong style="font-size:.86rem">${o.service||"?"}</strong><br><small style="color:rgba(197,198,199,.35)">${o.package||""}</small></td>
      <td style="font-size:.84rem">${o.customerName||"?"}<br><small style="color:rgba(197,198,199,.3);font-family:var(--mono);font-size:.6rem">${o.customerEmail||""}</small></td>
      <td style="font-family:var(--mono);color:var(--cyan)">?${(o.finalPrice||0).toLocaleString("en-IN")}</td>
      <td>
        <button class="pill pill-${(o.paymentStatus||"unpaid")}" style="cursor:pointer;border:none" onclick="window._togglePayment('${o.id}','${o.paymentStatus||"unpaid"}')">
          ${o.paymentStatus||"unpaid"} <i class="fas fa-sync" style="font-size:.5rem;margin-left:4px"></i>
        </button>
      </td>
      <td>
        <select class="inline-sel" onchange="window._updateOrderStatus('${o.id}',this.value)">
          ${["pending","in_progress","complete","cancelled"].map(s=>`<option value="${s}"${o.status===s?" selected":""}>${s.replace("_"," ")}</option>`).join("")}
        </select>
      </td>
      <td>
        <div class="assign-cell">
          <div class="assign-name" title="${assignedLabel}">${assignedLabel}</div>
          ${assignStatus?`<div>${assignStatus}</div>`:""}
          <div class="assign-actions">
            <button class="btn-ghost btn-sm" onclick="window._openAssignModal('${o.id}')"><i class="fas fa-user-plus"></i>Assign</button>
          </div>
        </div>
      </td>
      <td><button class="btn-ghost btn-sm" onclick="window._viewOrderDetail('${o.id}')"><i class="fas fa-eye"></i></button></td>
    </tr>`;
  }).join("")||`<tr><td colspan="8"><div class="empty-state"><i class="fas fa-inbox"></i>no orders match filters</div></td></tr>`;
}

window._togglePayment=async(id,current)=>{
  const next=current==="paid"?"unpaid":"paid";
  try{await updateDoc(doc(db,"orders",id),{paymentStatus:next});showToast("Payment: "+next,"ok");
    const o=_allOrders.find(x=>x.id===id);if(o)o.paymentStatus=next;_renderOrders();
  }catch(e){showToast("Error updating payment","err");}
};

window._updateOrderStatus=async(id,status)=>{
  const update={status};
  if(status==="complete"){update.reviewDone=false;update.completedAt=serverTimestamp();} // trigger review prompt on book.html
  try{await updateDoc(doc(db,"orders",id),update);showToast("Status updated","ok");
    const o=_allOrders.find(x=>x.id===id);if(o){o.status=status;}
  }catch(e){showToast("Error updating status","err");}
};

window._assignWorker=async(id,workerId)=>{
  const assigned = workerId? [workerId] : [];
  try{
    await updateDoc(doc(db,"orders",id),{workerAssigned:workerId||null,assignedWorkers:assigned});
    showToast("Worker assigned","ok");
    const o=_allOrders.find(x=>x.id===id);if(o){o.workerAssigned=workerId||null;o.assignedWorkers=assigned;}
  }catch(e){showToast("Error assigning worker","err");}
};

window._viewOrderDetail=id=>{
  const o=_allOrders.find(x=>x.id===id);
  if(!o)return;
  const workerMap=new Map(_allWorkers.map(w=>[w.id,w.name]));
  const assignedIds=(Array.isArray(o.assignedWorkers)&&o.assignedWorkers.length)?o.assignedWorkers:(o.workerAssigned?[o.workerAssigned]:[]);
  const assignedNames=assignedIds.map(id=>workerMap.get(id)||"Unknown").join(", ");
  alert([
    `Order: ${o.id}`,`Service: ${o.service} — ${o.package}`,
    `Customer: ${o.customerName} · ${o.customerEmail} · ${o.customerPhone||""}`,
    `Amount: ₹${o.finalPrice||0} · Payment: ${o.paymentStatus||"unpaid"}`,
    `Status: ${o.status}`,`Assigned: ${assignedNames||"Unassigned"}`,`Deadline: ${o.deadline||"Flexible"}`,
    `Instructions: ${o.instructions||"—"}`,
    o.driveLink?`Drive: ${o.driveLink}`:null,
    `Created: ${o.createdAt?.toDate?.().toLocaleString("en-IN")||"—"}`
  ].filter(Boolean).join("\n"));
};


/* Assignment modal */
function _closeAssignModal(){
  _q("assignModal")?.classList.remove("open");
  _assigningOrderId = null;
}

window._openAssignModal = (orderId) => {
  const order = _allOrders.find(o=>o.id===orderId);
  if (!order) return;
  _assigningOrderId = orderId;
  const assignedIds = (Array.isArray(order.assignedWorkers) && order.assignedWorkers.length)
    ? order.assignedWorkers
    : (order.workerAssigned ? [order.workerAssigned] : []);

  const list = _allWorkers.map(w=>{
    const checked = assignedIds.includes(w.id) ? "checked" : "";
    return `
      <label class="assign-row">
        <input type="checkbox" value="${w.id}" ${checked}>
        <div>
          <div class="assign-name">${w.name||"Unnamed"}</div>
          <div class="assign-meta">${w.email||""}</div>
        </div>
      </label>`;
  }).join("") || `<div class="empty-state"><i class="fas fa-users"></i>no workers found</div>`;

  _q("assignWorkerList").innerHTML = list;
  _q("assignModalMsg").textContent = `Select workers for order ${order.id.slice(0,8)}?`;
  _q("assignModal").classList.add("open");

  document.querySelectorAll('#assignWorkerList input[type="checkbox"]').forEach(inp=>{
    inp.addEventListener("change", _updateAssignHint);
  });
  _updateAssignHint();
};

function _updateAssignHint(){
  const count = document.querySelectorAll('#assignWorkerList input[type="checkbox"]:checked').length;
  const hint = _q("assignApprovalHint");
  if (!hint) return;
  if (CUD.role === "manager" && count > 2) {
    hint.textContent = "More than 2 workers requires admin/superadmin approval.";
  } else {
    hint.textContent = "";
  }
}

_q("assignCancel")?.addEventListener("click", _closeAssignModal);
_q("assignModal")?.addEventListener("click", e=>{ if (e.target === _q("assignModal")) _closeAssignModal(); });

_q("assignSave")?.addEventListener("click", async function(){
  if (!_assigningOrderId) return;
  const selected = Array.from(document.querySelectorAll('#assignWorkerList input[type="checkbox"]:checked'))
    .map(i=>i.value);
  if (!selected.length){ showToast("Select at least one worker","err"); return; }

  const order = _allOrders.find(o=>o.id===_assigningOrderId);
  if (!order) return;

  this.classList.add("loading");
  try{
    if (CUD.role === "manager" && selected.length > 2) {
      await addDoc(collection(db,"assignmentRequests"),{
        orderId:_assigningOrderId,
        requestedWorkers:selected,
        requestedBy:CU.uid,
        requestedByName:CUD.name||CU.email,
        status:"pending",
        createdAt:serverTimestamp()
      });
      await updateDoc(doc(db,"orders",_assigningOrderId),{
        assignmentStatus:"pending_approval",
        pendingAssignedWorkers:selected,
        assignmentRequestedBy:CU.uid,
        assignmentRequestedByName:CUD.name||CU.email,
        assignmentRequestedAt:serverTimestamp()
      });
      showToast("Request sent for approval","ok");
    } else {
      const update = {
        assignedWorkers:selected,
        workerAssigned:selected[0]||null,
        assignmentStatus:"approved",
        pendingAssignedWorkers:[]
      };
      await updateDoc(doc(db,"orders",_assigningOrderId), update);
      showToast("Workers assigned","ok");
    }
    const idx = _allOrders.findIndex(o=>o.id===_assigningOrderId);
    if (idx>=0){ _allOrders[idx].assignedWorkers = selected; _allOrders[idx].workerAssigned = selected[0]||null; }
    _renderOrders();
    _closeAssignModal();
  }catch(e){
    showToast("Error saving assignment","err");
  }
  this.classList.remove("loading");
});
/* ════════════════════════════════════════════════════════════
   USERS
════════════════════════════════════════════════════════════ */
let _allUsers=[];
async function _loadUsers(){
  _q("usersBody").innerHTML=`<tr><td colspan="7"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading…</div></td></tr>`;
  try{
    const snap=await getDocs(query(collection(db,"users"),orderBy("createdAt","desc")));
    _allUsers=snap.docs.map(d=>({id:d.id,...d.data()}));
    _renderUsers();
  }catch(e){_q("usersBody").innerHTML=`<tr><td colspan="7"><div class="empty-state">error loading users</div></td></tr>`;}
}

_q("userSearch")?.addEventListener("input",_renderUsers);
_q("userRoleFilter")?.addEventListener("change",_renderUsers);

function _renderUsers(){
  const q=(_q("userSearch")?.value||"").toLowerCase();
  const rf=_q("userRoleFilter")?.value||"";
  const myRole=CUD.role;
  const canPromoteTo = myRole === "owner"
    ?["superadmin","admin","manager","worker"]
    :myRole === "superadmin"
      ?["admin","manager","worker"]
      :myRole === "admin"
        ?["manager","worker"]
        :[];

  const filtered=_allUsers.filter(u=>{
    const mQ=!q||(u.name||"").toLowerCase().includes(q)||(u.email||"").toLowerCase().includes(q);
    const mR=!rf||u.role===rf;
    return mQ&&mR;
  });
  _q("usersBody").innerHTML=filtered.map(u=>`
    <tr>
      <td><strong>${u.name||"—"}</strong></td>
      <td style="font-family:var(--mono);font-size:.72rem;color:var(--cyan)">${u.email||"—"}</td>
      <td style="font-family:var(--mono);font-size:.72rem">${u.phone||"—"}</td>
      <td><span class="pill pill-${u.role||"customer"}">${u.role||"customer"}</span></td>
      <td>${u.referralCode?`<span class="code-box">${u.referralCode}</span>`:`<span style="color:rgba(197,198,199,.22);font-size:.78rem">none</span>`}</td>
      <td style="font-family:var(--mono);color:var(--teal)">${u.discountPercent||0}%</td>
      <td>
        <select class="inline-sel" onchange="window._promoteUser('${u.id}',this.value)" ${u.id===CU.uid?"disabled":""}>
          <option value="${u.role}">${u.role}</option>
          ${canPromoteTo.filter(r=>r!==u.role).map(r=>`<option value="${r}">${r}</option>`).join("")}
        </select>
      </td>
    </tr>`).join("")||`<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i>no users found</div></td></tr>`;
}

window._promoteUser=async(uid,newRole)=>{
  if(uid===CU.uid){showToast("Cannot change your own role","err");return;}
  if(newRole==="owner"){showToast("Owner role is assigned manually","err");return;}
  confirmAction("Promote User",`Change this user's role to "${newRole}"?`,async()=>{
    try{
      await updateDoc(doc(db,"users",uid),{role:newRole});
      const u=_allUsers.find(x=>x.id===uid);
      if(u){
        const wasStaff=["worker","manager","admin","superadmin","owner"].includes(u.role);
        u.role=newRole;
        // Generate referral code if now staff and doesn't have one
        const isStaff=["worker","manager","admin","superadmin","owner"].includes(newRole);
        if(isStaff&&!u.referralCode){
          const TIERS={worker:{code:"WRK",pct:5},manager:{code:"MGR",pct:10},admin:{code:"ADM",pct:15},superadmin:{code:"SAD",pct:20}};
          const t=TIERS[newRole]||TIERS.worker;
          const code="TNWR-"+t.code+"-"+Math.random().toString(36).toUpperCase().slice(-4);
          await updateDoc(doc(db,"users",uid),{referralCode:code});
          await setDoc(doc(db,"referralCodes",code),{ownerUid:uid,role:newRole,discountPercent:t.pct,timesUsed:0,createdAt:serverTimestamp()});
          u.referralCode=code;
        }
      }
      _renderUsers();
      showToast("Role updated to "+newRole,"ok");
    }catch(e){showToast("Error updating role","err");}
  });
};

/* ════════════════════════════════════════════════════════════
   REFERRAL CODES
════════════════════════════════════════════════════════════ */
async function _loadReferrals(){
  _q("referralsBody").innerHTML=`<tr><td colspan="6"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading…</div></td></tr>`;
  try{
    const snap=await getDocs(collection(db,"referralCodes"));
    const codes=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!codes.length){_q("referralsBody").innerHTML=`<tr><td colspan="6"><div class="empty-state"><i class="fas fa-ticket-alt"></i>no referral codes yet</div></td></tr>`;return;}
    // Fetch owner names async
    const ownerMap={};
    await Promise.all([...new Set(codes.map(c=>c.ownerUid))].map(async uid=>{
      const s=await getDoc(doc(db,"users",uid)).catch(()=>null);
      ownerMap[uid]=s?.data()?.name||uid.slice(0,8)+"…";
    }));
    _q("referralsBody").innerHTML=codes.map(c=>`
      <tr>
        <td><span class="code-box">${c.id}</span></td>
        <td style="font-size:.86rem">${ownerMap[c.ownerUid]||"—"}</td>
        <td><span class="pill pill-${c.role||"worker"}">${c.role||"worker"}</span></td>
        <td style="color:var(--teal);font-family:var(--mono)">${c.discountPercent||0}%</td>
        <td style="font-family:var(--mono);color:var(--cyan)">${c.timesUsed||0}</td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${c.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
      </tr>`).join("");
  }catch(e){_q("referralsBody").innerHTML=`<tr><td colspan="6"><div class="empty-state">error loading codes</div></td></tr>`;}
}

/* ════════════════════════════════════════════════════════════
   REVIEWS
════════════════════════════════════════════════════════════ */
async function _loadReviews(){
  _q("reviewsBody").innerHTML=`<tr><td colspan="4"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading…</div></td></tr>`;
  try{
    let q;
    if(CUD.role==="worker"){
      q=query(collection(db,"reviews"),where("workerAssigned","==",CU.uid),orderBy("createdAt","desc"));
    }else{
      q=query(collection(db,"reviews"),orderBy("createdAt","desc"));
    }
    const snap=await getDocs(q);
    const reviews=snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("rv-total").textContent=reviews.length;
    const avg=reviews.length?reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length:0;
    _q("rv-avg").textContent=avg?avg.toFixed(1):"—";
    _q("rv-hi").textContent=reviews.filter(r=>(r.rating||0)>=4).length;
    _q("reviewsBody").innerHTML=reviews.map(r=>`
      <tr>
        <td style="font-size:1.1rem;letter-spacing:2px">${_stars(r.rating||0)}</td>
        <td style="font-size:.84rem;color:rgba(197,198,199,.65)">${r.comment||"<em style='opacity:.35'>no comment</em>"}</td>
        <td style="font-size:.82rem">${r.service||"—"}</td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
      </tr>`).join("")||`<tr><td colspan="4"><div class="empty-state"><i class="fas fa-star"></i>no reviews yet</div></td></tr>`;
  }catch(e){_q("reviewsBody").innerHTML=`<tr><td colspan="4"><div class="empty-state">error loading reviews</div></td></tr>`;}
}

/* ════════════════════════════════════════════════════════════
   MODULE 9 — PAYROLL
════════════════════════════════════════════════════════════ */
let _payrolls=[], _managers=[], _selectedPayrollId=null;

/* Show/hide create form */
_q("btnCreatePayroll")?.addEventListener("click",()=>{
  _q("payrollCreateCard").style.display="block";
  _q("btnCreatePayroll").style.display="none";
  _q("payAllocCard").style.display="none";
});
_q("btnCancelPayroll")?.addEventListener("click",()=>{
  _q("payrollCreateCard").style.display="none";
  _q("btnCreatePayroll").style.display="flex";
});

_q("btnSavePayroll")?.addEventListener("click",async function(){
  const month=_q("payMonth").value;
  const income=Number(_q("payIncome").value);
  if(!month||!income){showToast("Month and income are required","err");return;}
  this.classList.add("loading");
  try{
    await addDoc(collection(db,"payroll"),{
      month,totalIncome:income,managerAllocations:{},workerAllocations:{},
      status:"pending",createdBy:CU.uid,createdAt:serverTimestamp()
    });
    _q("payMonth").value="";_q("payIncome").value="";
    _q("payrollCreateCard").style.display="none";
    _q("btnCreatePayroll").style.display="flex";
    showToast("Payroll period created","ok");
    await _loadPayroll();
  }catch(e){showToast("Error creating payroll","err");}
  this.classList.remove("loading");
});

async function _loadPayroll(){
  _q("payrollBody").innerHTML=`<tr><td colspan="6"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading…</div></td></tr>`;
  try{
    const [pSnap,mSnap]=await Promise.all([
      getDocs(query(collection(db,"payroll"),orderBy("createdAt","desc"))),
      getDocs(query(collection(db,"users"),where("role","in",["manager","admin","superadmin","owner"])))
    ]);
    _payrolls=pSnap.docs.map(d=>({id:d.id,...d.data()}));
    _managers=mSnap.docs.map(d=>({id:d.id,...d.data()}));
    _renderPayroll();
  }catch(e){_q("payrollBody").innerHTML=`<tr><td colspan="6"><div class="empty-state">error loading payroll</div></td></tr>`;}
}

function _renderPayroll(){
  _q("payrollBody").innerHTML=_payrolls.map(p=>{
    const mgrs=Object.keys(p.managerAllocations||{}).length;
    return`<tr>
      <td style="font-family:var(--mono)">${p.month}</td>
      <td style="font-family:var(--mono);color:var(--cyan)">₹${(p.totalIncome||0).toLocaleString("en-IN")}</td>
      <td style="font-family:var(--mono)">${mgrs}</td>
      <td><span class="pill pill-${p.status||"pending"}">${p.status||"pending"}</span></td>
      <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${p.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
      <td>
        <button class="btn-ghost btn-sm" onclick="window._openPayrollAlloc('${p.id}')">
          <i class="fas fa-hand-holding-dollar"></i> Allocate
        </button>
      </td>
    </tr>`}).join("")||`<tr><td colspan="6"><div class="empty-state"><i class="fas fa-money-bill-wave"></i>no payroll periods yet</div></td></tr>`;
}

window._openPayrollAlloc=pid=>{
  const p=_payrolls.find(x=>x.id===pid);
  if(!p)return;
  _selectedPayrollId=pid;
  _q("payAllocPeriod").textContent=p.month;
  _q("payAllocMax").textContent=(p.totalIncome||0).toLocaleString("en-IN");
  // Build manager rows
  _q("managerAllocRows").innerHTML=_managers.map(m=>`
    <div class="alloc-row">
      <div>
        <div class="alloc-name">${m.name}</div>
        <div class="alloc-sub">${m.email} · ${m.role}</div>
      </div>
      <input type="number" class="alloc-input mgr-alloc-inp" data-uid="${m.id}" min="0" placeholder="0"
        value="${p.managerAllocations?.[m.id]||""}" oninput="_updateAllocTotal()" style="min-height:36px">
    </div>`).join("")||`<div class="empty-state"><i class="fas fa-user-tie"></i>no managers found</div>`;
  _updateAllocTotal();
  _q("payAllocCard").style.display="block";
  _q("payAllocCard").scrollIntoView({behavior:"smooth",block:"start"});
};

window._updateAllocTotal=()=>{
  let tot=0;
  document.querySelectorAll(".mgr-alloc-inp").forEach(inp=>{tot+=Number(inp.value)||0;});
  const p=_payrolls.find(x=>x.id===_selectedPayrollId);
  _q("payAllocTotal").textContent=tot.toLocaleString("en-IN");
  _q("payAllocRemaining").textContent=((p?.totalIncome||0)-tot).toLocaleString("en-IN");
};

_q("btnSubmitAlloc")?.addEventListener("click",async function(){
  const p=_payrolls.find(x=>x.id===_selectedPayrollId);
  if(!p)return;
  const allocs={};
  let tot=0;
  document.querySelectorAll(".mgr-alloc-inp").forEach(inp=>{
    const amt=Number(inp.value)||0;
    if(amt>0){allocs[inp.dataset.uid]=amt;tot+=amt;}
  });
  if(tot>p.totalIncome){showToast("Total exceeds income","err");return;}
  this.classList.add("loading");
  try{
    await updateDoc(doc(db,"payroll",_selectedPayrollId),{managerAllocations:allocs,status:"allocated"});
    const idx=_payrolls.findIndex(x=>x.id===_selectedPayrollId);
    if(idx>=0){_payrolls[idx].managerAllocations=allocs;_payrolls[idx].status="allocated";}
    _renderPayroll();
    _q("payAllocCard").style.display="none";
    showToast("Allocation saved","ok");
  }catch(e){showToast("Error saving allocation","err");}
  this.classList.remove("loading");
});

/* ════════════════════════════════════════════════════════════
   TEAM PAYMENTS (manager)
════════════════════════════════════════════════════════════ */
let _tpPayrolls=[], _tpWorkers=[], _selectedTpPayrollId=null;

async function _loadTeamPay(){
  _q("tpPayrollSel").innerHTML=`<option value="">loading…</option>`;
  try{
    const [pSnap,wSnap]=await Promise.all([
      getDocs(query(collection(db,"payroll"),orderBy("createdAt","desc"))),
      getDocs(query(collection(db,"users"),where("role","==","worker")))
    ]);
    _tpPayrolls=pSnap.docs.map(d=>({id:d.id,...d.data()})).filter(p=>p.managerAllocations?.[CU.uid]);
    _tpWorkers=wSnap.docs.map(d=>({id:d.id,...d.data()}));
    _q("tpPayrollSel").innerHTML=`<option value="">— Select Period —</option>`+
      _tpPayrolls.map(p=>`<option value="${p.id}">${p.month} — ₹${(p.managerAllocations[CU.uid]||0).toLocaleString("en-IN")} allocated</option>`).join("");
    // Stats from most recent distributed
    const distributed=_tpPayrolls.find(p=>p.status==="distributed");
    const alloc=_tpPayrolls.reduce((s,p)=>s+(p.managerAllocations[CU.uid]||0),0);
    const dist=_tpPayrolls.filter(p=>p.workerAllocations?.[CU.uid]).reduce((s,p)=>s+(p.workerAllocations?.[CU.uid]?.total||0),0);
    _q("tp-allocated").textContent="₹"+alloc.toLocaleString("en-IN");
    _q("tp-distributed").textContent="₹"+dist.toLocaleString("en-IN");
    _q("tp-remaining").textContent="₹"+(alloc-dist).toLocaleString("en-IN");
  }catch(e){showToast("Error loading payrolls","err");}
}

_q("tpPayrollSel")?.addEventListener("change",async function(){
  _selectedTpPayrollId=this.value;
  if(!this.value){_q("tpDistributeSection").style.display="none";return;}
  const p=_tpPayrolls.find(x=>x.id===this.value);
  if(!p){return;}
  _q("tpMax").textContent=(p.managerAllocations[CU.uid]||0).toLocaleString("en-IN");
  await _buildWorkerRows(p);
  _q("tpDistributeSection").style.display="block";
});

async function _buildWorkerRows(payroll){
  // Fetch stats per worker (batched to avoid N+1 queries)
  _q("tpWorkerRows").innerHTML=`<div class="empty-state"><i class="fas fa-circle-notch spin"></i>computing suggested pay???</div>`;
  const allocAmt=payroll.managerAllocations[CU.uid]||0;
  const workerIds=_tpWorkers.map(w=>w.id).filter(Boolean);

  if(!workerIds.length){
    _q("tpWorkerRows").innerHTML=`<div class="empty-state"><i class="fas fa-users"></i>no workers found</div>`;
    _tpUpdateTotal();
    return;
  }

  const chunkSize=10;
  const chunks=[];
  for(let i=0;i<workerIds.length;i+=chunkSize){chunks.push(workerIds.slice(i,i+chunkSize));}

  const orderPromises=chunks.map(c=>getDocs(query(collection(db,"orders"),where("workerAssigned","in",c),where("status","==","complete"))).catch(()=>null));
  const reviewPromises=chunks.map(c=>getDocs(query(collection(db,"reviews"),where("workerAssigned","in",c))).catch(()=>null));
  const refPromises=chunks.map(c=>getDocs(query(collection(db,"referralCodes"),where("ownerUid","in",c))).catch(()=>null));

  const [orderSnaps, reviewSnaps, refSnaps]=await Promise.all([
    Promise.all(orderPromises),
    Promise.all(reviewPromises),
    Promise.all(refPromises)
  ]);

  const workerStats={};
  workerIds.forEach(id=>{workerStats[id]={orders:0,ratingSum:0,ratingCount:0,refs:0};});

  const orderDocs=[];
  orderSnaps.forEach(s=>{if(s&&s.docs)orderDocs.push(...s.docs);});
  const reviewDocs=[];
  reviewSnaps.forEach(s=>{if(s&&s.docs)reviewDocs.push(...s.docs);});
  const refDocs=[];
  refSnaps.forEach(s=>{if(s&&s.docs)refDocs.push(...s.docs);});

  orderDocs.forEach(d=>{
    const o=d.data();
    const wid=o.workerAssigned;
    if(workerStats[wid]) workerStats[wid].orders++;
  });

  reviewDocs.forEach(d=>{
    const r=d.data();
    const wid=r.workerAssigned;
    if(workerStats[wid] && r.rating){
      workerStats[wid].ratingSum+=Number(r.rating)||0;
      workerStats[wid].ratingCount+=1;
    }
  });

  refDocs.forEach(d=>{
    const r=d.data();
    const wid=r.ownerUid;
    if(workerStats[wid]) workerStats[wid].refs+=Number(r.timesUsed)||0;
  });

  const teamOrders=orderDocs.length;
  const prevAlloc=payroll.workerAllocations?.[CU.uid]||{};

  _q("tpWorkerRows").innerHTML=_tpWorkers.map(w=>{
    const s=workerStats[w.id]||{orders:0,ratingSum:0,ratingCount:0,refs:0};
    const avgRating=s.ratingCount? (s.ratingSum/s.ratingCount) : 0;
    const suggest=_calcSuggest(s.orders||0,teamOrders,allocAmt,s.refs||0,avgRating||0);
    const prev=prevAlloc[w.id]||0;
    return`<div class="worker-check-row${prev>0?" checked":""}" onclick="_toggleWorkerCheck(this)">
      <div class="wc-box"><i class="fas fa-check"></i></div>
      <div class="wc-info">
        <div class="wc-name">${w.name}</div>
        <div class="wc-meta">${s.orders||0} orders ?? ??? ${avgRating?avgRating.toFixed(1):"???"} ?? ${s.refs||0} referrals</div>
      </div>
      <span class="wc-suggest">???${suggest.toLocaleString("en-IN")} suggested</span>
      <input type="number" class="wc-input wc-pay-inp" data-uid="${w.id}" data-suggest="${suggest}"
        min="0" placeholder="0" value="${prev||""}" oninput="_tpUpdateTotal()" style="min-height:36px">
    </div>`}).join("")||`<div class="empty-state"><i class="fas fa-users"></i>no workers found</div>`;
  _tpUpdateTotal();
}

window._toggleWorkerCheck=row=>{
  row.classList.toggle("checked");
  const inp=row.querySelector(".wc-pay-inp");
  if(row.classList.contains("checked")&&!inp.value){
    inp.value=inp.dataset.suggest;
  }
  _tpUpdateTotal();
};

window._tpUpdateTotal=()=>{
  let tot=0;
  document.querySelectorAll(".worker-check-row.checked .wc-pay-inp").forEach(i=>{tot+=Number(i.value)||0;});
  _q("tpTotal").textContent=tot.toLocaleString("en-IN");
};

_q("btnDistribute")?.addEventListener("click",async function(){
  const p=_tpPayrolls.find(x=>x.id===_selectedTpPayrollId);
  if(!p)return;
  const max=p.managerAllocations[CU.uid]||0;
  let tot=0;const workerPays={};
  document.querySelectorAll(".worker-check-row.checked .wc-pay-inp").forEach(i=>{
    const amt=Number(i.value)||0;
    if(amt>0){workerPays[i.dataset.uid]=amt;tot+=amt;}
  });
  if(!Object.keys(workerPays).length){showToast("Select at least one worker","err");return;}
  if(tot>max){showToast(`Total ₹${tot.toLocaleString("en-IN")} exceeds your allocation ₹${max.toLocaleString("en-IN")}","err`);return;}
  confirmAction("Submit Distribution",`Distribute ₹${tot.toLocaleString("en-IN")} to ${Object.keys(workerPays).length} worker(s)?`,async()=>{
    this.classList.add("loading");
    try{
      const update={};
      update[`workerAllocations.${CU.uid}`]={...workerPays,total:tot,distributedAt:new Date().toISOString()};
      update.status="distributed";
      await updateDoc(doc(db,"payroll",_selectedTpPayrollId),update);
      showToast("Distribution submitted ✓","ok");
      await _loadTeamPay();
      _q("tpDistributeSection").style.display="none";
    }catch(e){showToast("Error submitting distribution","err");}
    this.classList.remove("loading");
  });
});

/* Suggested pay formula (exact spec) */
function _calcSuggest(workerOrders,teamOrders,allocAmt,refs,avgRating){
  const base=teamOrders>0?(workerOrders/teamOrders)*allocAmt:0;
  const bonus=refs*20;
  const mult=avgRating>=4.5?1.15:avgRating>=4.0?1.05:avgRating<3.0&&avgRating>0?0.90:1.00;
  return Math.round((base+bonus)*mult);
}

/* ════════════════════════════════════════════════════════════
   MY ORDERS (worker)
════════════════════════════════════════════════════════════ */
async function _loadMyOrders(){
  _q("myOrdersBody").innerHTML=`<tr><td colspan="6"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const [snapA, snapB] = await Promise.all([
      getDocs(query(collection(db,"orders"),where("assignedWorkers","array-contains",CU.uid),orderBy("createdAt","desc"))).catch(()=>null),
      getDocs(query(collection(db,"orders"),where("workerAssigned","==",CU.uid),orderBy("createdAt","desc"))).catch(()=>null)
    ]);
    const ordersMap = new Map();
    [snapA, snapB].forEach(s=>{
      if (s && s.docs) s.docs.forEach(d=>ordersMap.set(d.id,{id:d.id,...d.data()}));
    });
    const orders = Array.from(ordersMap.values());
    _q("myOrdersBody").innerHTML=orders.map(o=>`
      <tr>
        <td style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${o.id.slice(0,10)}?</td>
        <td><strong>${o.service||"?"}</strong><br><small style="color:rgba(197,198,199,.35)">${o.package||""}</small></td>
        <td style="font-size:.84rem">${o.customerName||"?"}</td>
        <td style="font-family:var(--mono);color:var(--cyan)">?${(o.finalPrice||0).toLocaleString("en-IN")}</td>
        <td><span class="pill pill-${(o.status||"pending").replace(/\s/,"_")}">${(o.status||"pending").replace("_"," ")}</span></td>
        <td>
          <select class="inline-sel" onchange="window._workerUpdateStatus('${o.id}',this.value)">
            ${["pending","in_progress","complete"].map(s=>`<option value="${s}"${o.status===s?" selected":""}>${s.replace("_"," ")}</option>`).join("")}
          </select>
        </td>
      </tr>`).join("")||`<tr><td colspan="6"><div class="empty-state"><i class="fas fa-briefcase"></i>no orders assigned to you yet</div></td></tr>`;
  }catch(e){_q("myOrdersBody").innerHTML=`<tr><td colspan="6"><div class="empty-state">error loading orders</div></td></tr>`;}
}


window._workerUpdateStatus=async(id,status)=>{
  const update={status};
  if(status==="complete"){update.reviewDone=false;update.completedAt=serverTimestamp();}
  try{await updateDoc(doc(db,"orders",id),update);showToast("Status updated","ok");}
  catch(e){showToast("Error updating status","err");}
};

/* ════════════════════════════════════════════════════════════
   MY EARNINGS (worker)
════════════════════════════════════════════════════════════ */
async function _loadEarnings(){
  try{
    // Get referral code
    const refCode=CUD.referralCode;
    _q("earnRefCode").textContent=refCode||"—";
    _q("btnCopyEarnRef").onclick=()=>{
      if(refCode)navigator.clipboard.writeText(refCode).then(()=>showToast("Copied!","ok"));
    };
    // Pay from payroll runs (auto 75%)
    const now=new Date();
    const thisMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
    let totalPay=0;
    const runSnap=await getDocs(query(collection(db,"payrollRuns"),where("month","==",thisMonth)));
    runSnap.docs.forEach(d=>{
      const p=d.data();
      totalPay+=Number(p.workerTotals?.[CU.uid]||0);
    });
    _q("earn-pay").textContent="?"+totalPay.toLocaleString("en-IN");
    // Orders done
    const oSnap=await getDocs(query(collection(db,"orders"),where("workerAssigned","==",CU.uid),where("status","==","complete")));
    _q("earn-orders").textContent=oSnap.size;
    // Reviews
    const rvSnap=await getDocs(query(collection(db,"reviews"),where("workerAssigned","==",CU.uid),orderBy("createdAt","desc")));
    const reviews=rvSnap.docs.map(d=>d.data());
    const avg=reviews.length?reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length:0;
    _q("earn-rating").textContent=avg?avg.toFixed(1):"—";
    // Referrals
    let refs=0;
    if(refCode){const rc=await getDoc(doc(db,"referralCodes",refCode)).catch(()=>null);refs=rc?.data()?.timesUsed||0;}
    _q("earn-refs").textContent=refs;
    // Reviews table
    _q("earnReviewsBody").innerHTML=reviews.map(r=>`
      <tr>
        <td style="font-size:1.1rem;letter-spacing:2px">${_stars(r.rating||0)}</td>
        <td style="font-size:.82rem;color:rgba(197,198,199,.6)">${r.comment||"<em style='opacity:.3'>no comment</em>"}</td>
        <td style="font-size:.82rem">${r.service||"—"}</td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
      </tr>`).join("")||`<tr><td colspan="4"><div class="empty-state"><i class="fas fa-star"></i>no reviews yet</div></td></tr>`;
  }catch(e){console.error("earnings:",e);}
}

/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   WALLET + PAYOUTS
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
function _calcNextPayDate(baseDate=new Date()){
  const day = PAYROLL_CONFIG.payoutDay || 1;
  return new Date(baseDate.getFullYear(), baseDate.getMonth()+1, day);
}

async function _ensureWallet(uid=CU.uid){
  const ref = doc(db,"wallets",uid);
  const snap = await getDoc(ref).catch(()=>null);
  if (snap?.exists()) return snap.data();
  const nextPay = _calcNextPayDate(new Date());
  const data = {
    available:0,
    pendingApproval:0,
    pendingPayout:0,
    lifetimePaid:0,
    nextPayDate: nextPay,
    lastPayDate: null,
    updatedAt: serverTimestamp()
  };
  await setDoc(ref, data, { merge:true });
  return data;
}

function _renderWalletTimeline(wallet){
  const last = wallet.lastPayDate?.toDate ? wallet.lastPayDate.toDate() : wallet.lastPayDate;
  const next = wallet.nextPayDate?.toDate ? wallet.nextPayDate.toDate() : wallet.nextPayDate;
  const items = [];
  if (last) items.push({ title:"Last payroll posted", sub:last.toLocaleDateString("en-IN",{day:"numeric",month:"short"}) });
  items.push({ title:"Next payroll", sub: next ? next.toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "?" });
  if ((wallet.pendingApproval||0) > 0) items.push({ title:"Pending approval", sub:`?${Number(wallet.pendingApproval||0).toLocaleString("en-IN")} awaiting owner approvals` });
  if ((wallet.pendingPayout||0) > 0) items.push({ title:"Payout request pending", sub:`?${Number(wallet.pendingPayout||0).toLocaleString("en-IN")} waiting for payout` });

  _q("walletTimeline").innerHTML = items.map(i=>`
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-title">${i.title}</div>
        <div class="timeline-sub">${i.sub}</div>
      </div>
    </div>`).join("") || `<div class="empty-state"><i class="fas fa-calendar"></i>no timeline yet</div>`;
}

async function _loadPayoutRequests(){
  _q("walletPayoutBody").innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const snap = await getDocs(query(collection(db,"payoutRequests"),where("uid","==",CU.uid),orderBy("createdAt","desc"),limit(25)));
    const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("walletPayoutBody").innerHTML = rows.map(r=>`
      <tr>
        <td style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${r.id.slice(0,8)}?</td>
        <td style="font-family:var(--mono);color:var(--cyan)">?${Number(r.amount||0).toLocaleString("en-IN")}</td>
        <td>${r.method||"?"}</td>
        <td><span class="pill pill-${r.status||"pending"}">${r.status||"pending"}</span></td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
      </tr>`).join("") || `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-wallet"></i>no payout requests yet</div></td></tr>`;
  }catch(e){
    _q("walletPayoutBody").innerHTML = `<tr><td colspan="5"><div class="empty-state">error loading payouts</div></td></tr>`;
  }
}

async function _loadWallet(){
  if (!CU) return;
  try{
    const wallet = await _ensureWallet(CU.uid);
    const available = Number(wallet.available||0);
    const pending = Number(wallet.pendingApproval||0);
    const life = Number(wallet.lifetimePaid||0);
    const next = wallet.nextPayDate?.toDate ? wallet.nextPayDate.toDate() : wallet.nextPayDate;
    _q("wallet-available").textContent = "?"+available.toLocaleString("en-IN");
    _q("wallet-pending").textContent = "?"+pending.toLocaleString("en-IN");
    _q("wallet-life").textContent = "?"+life.toLocaleString("en-IN");
    _q("wallet-next").textContent = next ? next.toLocaleDateString("en-IN",{day:"numeric",month:"short"}) : "?";
    _renderWalletTimeline(wallet);
    await _loadPayoutRequests();
  }catch(e){
    console.error("wallet",e);
  }
}

_q("btnWalletRefresh")?.addEventListener("click", _loadWallet);

async function _submitPayoutRequestTx({ uid, userName, amount, method, note }){
  const walletRef = doc(db,"wallets",uid);
  const reqRef = doc(collection(db,"payoutRequests"));

  await runTransaction(db, async tx => {
    const walletSnap = await tx.get(walletRef);
    if (!walletSnap.exists()) throw new Error("wallet_missing");

    const wallet = walletSnap.data() || {};
    const available = Number(wallet.available || 0);
    const pendingPayout = Number(wallet.pendingPayout || 0);

    if (amount < PAYROLL_CONFIG.minPayout) throw new Error("min_payout");
    if (amount > available) throw new Error("insufficient");

    tx.set(reqRef, {
      uid,
      userName,
      amount,
      method,
      note,
      status:"pending",
      createdAt: serverTimestamp()
    });

    tx.set(walletRef, {
      available: available - amount,
      pendingPayout: pendingPayout + amount,
      updatedAt: serverTimestamp()
    }, { merge:true });
  });

  return reqRef.id;
}

_q("btnSubmitPayout")?.addEventListener("click", async function(){
  const amt = Number(_q("walletPayoutAmt").value||0);
  const method = _q("walletPayoutMethod").value||"bank";
  const note = _q("walletPayoutNote").value||"";
  if (!amt || amt < PAYROLL_CONFIG.minPayout){ showToast(`Minimum payout is ?${PAYROLL_CONFIG.minPayout}`,"err"); return; }

  this.classList.add("loading");
  try{
    await _submitPayoutRequestTx({
      uid: CU.uid,
      userName: CUD.name||CU.email,
      amount: amt,
      method,
      note
    });
    _q("walletPayoutAmt").value="";
    _q("walletPayoutNote").value="";
    showToast("Payout request submitted","ok");
    await _loadWallet();
  }catch(e){
    const key = e?.message || "";
    if (key === "insufficient") showToast("Insufficient balance","err");
    else if (key === "min_payout") showToast(`Minimum payout is ?${PAYROLL_CONFIG.minPayout}`,"err");
    else showToast("Error submitting payout","err");
  }
  this.classList.remove("loading");
});

/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   AUTO PAYROLL RUNS (75% share)
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
_q("btnGenerateRun")?.addEventListener("click", async function(){
  const month = _q("autoPayMonth").value;
  const mode = _q("autoPayMode").value || "create";
  if (!month){ showToast("Select a month","err"); return; }
  if (!_isApproverRole(CUD?.role)){ showToast("Only admin roles can generate payroll runs","err"); return; }
  const [y,m] = month.split("-").map(Number);
  const start = new Date(y, m-1, 1);
  const end = new Date(y, m, 1);

  this.classList.add("loading");
  try{
    const existing = await getDocs(query(collection(db,"payrollRuns"),where("month","==",month)));
    if (!existing.empty){ showToast("Run already exists for this month","err"); this.classList.remove("loading"); return; }

    const snap = await getDocs(query(collection(db,"orders"),
      where("status","==","complete"),
      where("paymentStatus","==","paid"),
      where("completedAt",">=",start),
      where("completedAt","<",end)
    ));

    const orders = snap.docs.map(d=>({id:d.id,...d.data()}));
    let gross = 0;
    const totals = {};
    orders.forEach(o=>{
      const price = Number(o.finalPrice||0);
      if (!price) return;
      gross += price;
      const workers = (Array.isArray(o.assignedWorkers) && o.assignedWorkers.length)
        ? o.assignedWorkers
        : (o.workerAssigned ? [o.workerAssigned] : []);
      if (!workers.length) return;
      const share = (price * PAYROLL_CONFIG.workerSharePct) / workers.length;
      workers.forEach(uid=>{ totals[uid] = (totals[uid]||0) + share; });
    });

    const workerShareTotal = Math.round(gross * PAYROLL_CONFIG.workerSharePct);
    const platformShareTotal = Math.round(gross - workerShareTotal);

    _q("autoPaySummary").textContent = `Orders: ${orders.length} ? Gross: ?${gross.toLocaleString("en-IN")} ? Worker share: ?${workerShareTotal.toLocaleString("en-IN")}`;

    if (mode === "preview") { this.classList.remove("loading"); return; }
    if (!orders.length) { showToast("No paid completed orders for that month","err"); this.classList.remove("loading"); return; }

    const runRef = await addDoc(collection(db,"payrollRuns"),{
      month,
      grossIncome: gross,
      workerShareTotal,
      platformShareTotal,
      workerTotals: totals,
      status:"pending_approval",
      approvals:{},
      requiredApprovals: OWNER_APPROVALS_REQUIRED,
      createdBy: CU.uid,
      createdAt: serverTimestamp()
    });

    const batch = writeBatch(db);
    const nextPay = _calcNextPayDate(start);
    Object.entries(totals).forEach(([uid,amt])=>{
      batch.set(doc(db,"wallets",uid),{
        pendingApproval: increment(Math.round(amt)),
        nextPayDate: nextPay,
        updatedAt: serverTimestamp()
      },{merge:true});
    });
    await batch.commit();

    showToast("Payroll run created & sent for approval","ok");
  }catch(e){
    showToast("Error generating payroll run","err");
  }
  this.classList.remove("loading");
});

/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   REPORTS
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
function _populateReportTargets(){
  const role = CUD.role;
  const targets = {
    worker: ["manager","admin","superadmin"],
    manager: ["admin","superadmin"],
    admin: ["superadmin","owner"],
    superadmin: ["owner"],
    owner: ["owner"]
  }[role] || ["admin"];
  _q("reportToRole").innerHTML = targets.map(r=>`<option value="${r}">${r}</option>`).join("");
}

async function _loadMyReports(){
  _q("myReportsBody").innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const snap = await getDocs(query(collection(db,"reports"),where("fromUid","==",CU.uid),orderBy("createdAt","desc"),limit(50)));
    const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("myReportsBody").innerHTML = rows.map(r=>`
      <tr>
        <td style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${r.id.slice(0,8)}?</td>
        <td>${r.toRole||"?"}</td>
        <td>${r.subject||"?"}</td>
        <td><span class="pill pill-${r.status||"pending"}">${r.status||"pending"}</span></td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
      </tr>`).join("") || `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i>no reports yet</div></td></tr>`;
  }catch(e){
    _q("myReportsBody").innerHTML = `<tr><td colspan="5"><div class="empty-state">error loading reports</div></td></tr>`;
  }
}

async function _loadReportInbox(){
  _q("reportInboxBody").innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const snap = await getDocs(query(collection(db,"reports"),where("toRole","==",CUD.role),orderBy("createdAt","desc"),limit(50)));
    const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("reportInboxBody").innerHTML = rows.map(r=>`
      <tr>
        <td style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${r.id.slice(0,8)}?</td>
        <td>${r.fromName||r.fromUid?.slice(0,6) || "?"}</td>
        <td>${r.subject||"?"}</td>
        <td><span class="pill pill-${r.status||"pending"}">${r.status||"pending"}</span></td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
      </tr>`).join("") || `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i>no inbox reports</div></td></tr>`;
  }catch(e){
    _q("reportInboxBody").innerHTML = `<tr><td colspan="5"><div class="empty-state">error loading inbox</div></td></tr>`;
  }
}

async function _loadReports(){
  _populateReportTargets();
  await _loadMyReports();
  if (["manager","admin","superadmin","owner"].includes(CUD.role)) await _loadReportInbox();
}

_q("btnSubmitReport")?.addEventListener("click", async function(){
  const toRole = _q("reportToRole").value;
  const subject = _q("reportSubject").value.trim();
  const details = _q("reportDetails").value.trim();
  if (!toRole || !subject || !details){ showToast("Fill all report fields","err"); return; }
  this.classList.add("loading");
  try{
    await addDoc(collection(db,"reports"),{
      fromUid: CU.uid,
      fromName: CUD.name||CU.email,
      fromRole: CUD.role,
      toRole,
      subject,
      details,
      status:"pending",
      createdAt: serverTimestamp()
    });
    _q("reportSubject").value="";
    _q("reportDetails").value="";
    showToast("Report submitted","ok");
    await _loadReports();
  }catch(e){
    showToast("Error submitting report","err");
  }
  this.classList.remove("loading");
});

/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   SAMPLES
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
async function _loadSamples(){
  _q("sampleBody").innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    let q;
    if (CUD.role === "worker") {
      q = query(collection(db,"sampleRequests"), where("workerId","==",CU.uid), orderBy("createdAt","desc"), limit(50));
    } else {
      q = query(collection(db,"sampleRequests"), orderBy("createdAt","desc"), limit(100));
    }
    const snap = await getDocs(q);
    const rows = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("sampleBody").innerHTML = rows.map(r=>`
      <tr>
        <td style="font-family:var(--mono);font-size:.68rem;color:var(--cyan)">${r.id.slice(0,8)}?</td>
        <td>${r.type||"?"}</td>
        <td>${r.clientName||"?"}</td>
        <td><span class="pill pill-${r.status||"pending"}">${r.status||"pending"}</span></td>
        <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
      </tr>`).join("") || `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-box"></i>no sample requests</div></td></tr>`;
  }catch(e){
    _q("sampleBody").innerHTML = `<tr><td colspan="5"><div class="empty-state">error loading samples</div></td></tr>`;
  }
}

_q("btnSubmitSample")?.addEventListener("click", async function(){
  const type = _q("sampleType").value;
  const name = _q("sampleClientName").value.trim();
  const email = _q("sampleClientEmail").value.trim().toLowerCase();
  const phone = _q("sampleClientPhone").value.trim();
  const orderId = _q("sampleOrderId").value.trim();
  const date = _q("sampleDate").value;
  const notes = _q("sampleNotes").value.trim();
  if (!type || !name || !email){ showToast("Client name and email are required","err"); return; }

  this.classList.add("loading");
  try{
    const clientId = email.replace(/[^a-z0-9]+/g,"_");
    await setDoc(doc(db,"clients",clientId),{
      name, email, phone,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      createdBy: CU.uid
    },{merge:true});

    await addDoc(collection(db,"sampleRequests"),{
      type,
      clientId,
      clientName: name,
      clientEmail: email,
      clientPhone: phone,
      orderId: orderId||null,
      expectedDate: date||null,
      notes,
      workerId: CU.uid,
      workerName: CUD.name||CU.email,
      status:"pending",
      createdAt: serverTimestamp()
    });

    _q("sampleClientName").value="";
    _q("sampleClientEmail").value="";
    _q("sampleClientPhone").value="";
    _q("sampleOrderId").value="";
    _q("sampleDate").value="";
    _q("sampleNotes").value="";

    showToast("Sample request created","ok");
    await _loadSamples();
  }catch(e){
    showToast("Error creating sample","err");
  }
  this.classList.remove("loading");
});

/* ?????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????
   APPROVALS
????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????????? */
let _payrollRuns=[], _payoutReqs=[], _assignReqs=[];

async function _loadPayrollApprovals(){
  _q("approvalPayrollBody").innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const snap = await getDocs(query(collection(db,"payrollRuns"),orderBy("createdAt","desc"),limit(25)));
    _payrollRuns = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("approvalPayrollBody").innerHTML = _payrollRuns.map(p=>{
      const approvals = Object.keys(p.approvals||{}).length;
      const needed = p.requiredApprovals || OWNER_APPROVALS_REQUIRED;
      const canApprove = CUD.role === "owner" && p.status === "pending_approval" && !(p.approvals||{})[CU.uid];
      return `
        <tr>
          <td style="font-family:var(--mono)">${p.month||"?"}</td>
          <td style="font-family:var(--mono);color:var(--cyan)">?${Number(p.workerShareTotal||0).toLocaleString("en-IN")}</td>
          <td>${approvals}/${needed}</td>
          <td><span class="pill pill-${p.status||"pending"}">${p.status||"pending"}</span></td>
          <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${p.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
          <td>
            ${canApprove?`<button class="btn-dash btn-sm" onclick="window._approvePayroll('${p.id}')">Approve</button>`:"?"}
          </td>
        </tr>`;
    }).join("") || `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-check"></i>no payroll runs</div></td></tr>`;
  }catch(e){
    _q("approvalPayrollBody").innerHTML = `<tr><td colspan="6"><div class="empty-state">error loading payroll runs</div></td></tr>`;
  }
}

async function _loadPayoutApprovals(){
  _q("approvalPayoutBody").innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const snap = await getDocs(query(collection(db,"payoutRequests"),orderBy("createdAt","desc"),limit(50)));
    _payoutReqs = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("approvalPayoutBody").innerHTML = _payoutReqs.map(r=>{
      const canAct = ["admin","superadmin","owner"].includes(CUD.role) && r.status==="pending";
      return `
        <tr>
          <td>${r.userName||r.uid?.slice(0,6)||"?"}</td>
          <td style="font-family:var(--mono);color:var(--cyan)">?${Number(r.amount||0).toLocaleString("en-IN")}</td>
          <td>${r.method||"?"}</td>
          <td><span class="pill pill-${r.status||"pending"}">${r.status||"pending"}</span></td>
          <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
          <td>
            ${canAct?`
              <button class="btn-dash btn-sm" onclick="window._approvePayout('${r.id}')">Approve</button>
              <button class="btn-danger btn-sm" onclick="window._rejectPayout('${r.id}')">Reject</button>`:"?"}
          </td>
        </tr>`;
    }).join("") || `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-hand-holding-dollar"></i>no payout requests</div></td></tr>`;
  }catch(e){
    _q("approvalPayoutBody").innerHTML = `<tr><td colspan="6"><div class="empty-state">error loading payouts</div></td></tr>`;
  }
}

async function _loadAssignmentApprovals(){
  _q("approvalAssignBody").innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-circle-notch spin"></i>loading?</div></td></tr>`;
  try{
    const snap = await getDocs(query(collection(db,"assignmentRequests"),orderBy("createdAt","desc"),limit(50)));
    _assignReqs = snap.docs.map(d=>({id:d.id,...d.data()}));
    _q("approvalAssignBody").innerHTML = _assignReqs.map(r=>{
      const canAct = ["admin","superadmin","owner"].includes(CUD.role) && r.status==="pending";
      return `
        <tr>
          <td style="font-family:var(--mono)">${r.orderId?.slice(0,8)||"?"}?</td>
          <td>${r.requestedByName||r.requestedBy?.slice(0,6)||"?"}</td>
          <td>${(r.requestedWorkers||[]).length}</td>
          <td><span class="pill pill-${r.status||"pending"}">${r.status||"pending"}</span></td>
          <td style="font-size:.72rem;color:rgba(197,198,199,.32)">${r.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}</td>
          <td>
            ${canAct?`
              <button class="btn-dash btn-sm" onclick="window._approveAssign('${r.id}')">Approve</button>
              <button class="btn-danger btn-sm" onclick="window._rejectAssign('${r.id}')">Reject</button>`:"?"}
          </td>
        </tr>`;
    }).join("") || `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-users"></i>no assignment requests</div></td></tr>`;
  }catch(e){
    _q("approvalAssignBody").innerHTML = `<tr><td colspan="6"><div class="empty-state">error loading requests</div></td></tr>`;
  }
}

async function _loadApprovals(){
  await _loadPayrollApprovals();
  await _loadPayoutApprovals();
  await _loadAssignmentApprovals();
}

window._approvePayroll = async (id) => {
  const p = _payrollRuns.find(x=>x.id===id);
  if (!p || p.status !== "pending_approval") { showToast("Run is not pending approval","err"); return; }
  if (CUD.role !== "owner") { showToast("Owner approval required","err"); return; }
  if ((p.approvals||{})[CU.uid]) { showToast("Already approved","err"); return; }
  confirmAction("Approve Payroll",`Approve payroll for ${p.month}?`, async()=>{
    try{
      const approvals = {...(p.approvals||{}), [CU.uid]: true};
      const approvedCount = Object.keys(approvals).length;
      const isApproved = approvedCount >= (p.requiredApprovals||OWNER_APPROVALS_REQUIRED);
      await updateDoc(doc(db,"payrollRuns",id),{
        approvals,
        status: isApproved ? "approved" : "pending_approval",
        approvedAt: isApproved ? serverTimestamp() : null
      });
      if (isApproved) {
        const batch = writeBatch(db);
        const [y,m] = (p.month||"").split("-").map(Number);
        const nextPay = _calcNextPayDate(new Date(y||new Date().getFullYear(), (m||new Date().getMonth()+1)-1, 1));
        Object.entries(p.workerTotals||{}).forEach(([uid,amt])=>{
          const amount = Math.round(Number(amt)||0);
          batch.set(doc(db,"wallets",uid),{
            pendingApproval: increment(-amount),
            available: increment(amount),
            lifetimePaid: increment(amount),
            lastPayDate: serverTimestamp(),
            nextPayDate: nextPay,
            updatedAt: serverTimestamp()
          },{merge:true});
        });
        batch.update(doc(db,"payrollRuns",id),{status:"posted",postedAt:serverTimestamp()});
        await batch.commit();
        showToast("Payroll posted to wallets","ok");
      } else {
        showToast("Approval recorded","ok");
      }
      await _loadApprovals();
    }catch(e){
      showToast("Error approving payroll","err");
    }
  });
};

window._approvePayout = async (id) => {
  if (!_isApproverRole(CUD?.role)) { showToast("Not authorized","err"); return; }
  const r = _payoutReqs.find(x=>x.id===id);
  if (!r || r.status !== "pending") { showToast("Request is no longer pending","err"); return; }
  confirmAction("Approve Payout",`Approve ?${Number(r.amount||0).toLocaleString("en-IN")}?`, async()=>{
    try{
      const payoutRef = doc(db,"payoutRequests",id);
      const walletRef = doc(db,"wallets",r.uid);
      await runTransaction(db, async tx => {
        const payoutSnap = await tx.get(payoutRef);
        if (!payoutSnap.exists()) throw new Error("payout_missing");
        const payout = payoutSnap.data() || {};
        if (payout.status !== "pending") throw new Error("already_processed");

        const amount = Number(payout.amount || 0);
        if (amount <= 0) throw new Error("invalid_amount");

        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error("wallet_missing");
        const wallet = walletSnap.data() || {};
        const pending = Number(wallet.pendingPayout || 0);
        if (pending < amount) throw new Error("wallet_mismatch");

        tx.update(payoutRef,{status:"paid",paidAt:serverTimestamp(),paidBy:CU.uid});
        tx.set(walletRef,{pendingPayout: pending - amount, updatedAt: serverTimestamp()},{merge:true});
      });
      showToast("Payout approved","ok");
      await _loadApprovals();
    }catch(e){
      if (e?.message === "already_processed") showToast("Payout already processed","err");
      else showToast("Error approving payout","err");
    }
  });
};

window._rejectPayout = async (id) => {
  if (!_isApproverRole(CUD?.role)) { showToast("Not authorized","err"); return; }
  const r = _payoutReqs.find(x=>x.id===id);
  if (!r || r.status !== "pending") { showToast("Request is no longer pending","err"); return; }
  confirmAction("Reject Payout",`Reject payout request for ?${Number(r.amount||0).toLocaleString("en-IN")}?`, async()=>{
    try{
      const payoutRef = doc(db,"payoutRequests",id);
      const walletRef = doc(db,"wallets",r.uid);
      await runTransaction(db, async tx => {
        const payoutSnap = await tx.get(payoutRef);
        if (!payoutSnap.exists()) throw new Error("payout_missing");
        const payout = payoutSnap.data() || {};
        if (payout.status !== "pending") throw new Error("already_processed");

        const amount = Number(payout.amount || 0);
        if (amount <= 0) throw new Error("invalid_amount");

        const walletSnap = await tx.get(walletRef);
        if (!walletSnap.exists()) throw new Error("wallet_missing");
        const wallet = walletSnap.data() || {};
        const pending = Number(wallet.pendingPayout || 0);
        const available = Number(wallet.available || 0);
        if (pending < amount) throw new Error("wallet_mismatch");

        tx.update(payoutRef,{status:"rejected",rejectedAt:serverTimestamp(),rejectedBy:CU.uid});
        tx.set(walletRef,{
          pendingPayout: pending - amount,
          available: available + amount,
          updatedAt: serverTimestamp()
        },{merge:true});
      });
      showToast("Payout rejected","ok");
      await _loadApprovals();
    }catch(e){
      if (e?.message === "already_processed") showToast("Payout already processed","err");
      else showToast("Error rejecting payout","err");
    }
  });
};

window._approveAssign = async (id) => {
  if (!_isApproverRole(CUD?.role)) { showToast("Not authorized","err"); return; }
  const r = _assignReqs.find(x=>x.id===id);
  if (!r || r.status !== "pending") { showToast("Request is no longer pending","err"); return; }
  confirmAction("Approve Assignment",`Approve ${r.requestedWorkers?.length||0} workers?`, async()=>{
    try{
      await updateDoc(doc(db,"orders",r.orderId),{
        assignedWorkers: r.requestedWorkers||[],
        workerAssigned: r.requestedWorkers?.[0]||null,
        assignmentStatus:"approved",
        pendingAssignedWorkers:[]
      });
      await updateDoc(doc(db,"assignmentRequests",id),{status:"approved",approvedAt:serverTimestamp(),approvedBy:CU.uid});
      showToast("Assignment approved","ok");
      await _loadApprovals();
    }catch(e){showToast("Error approving assignment","err");}
  });
};

window._rejectAssign = async (id) => {
  if (!_isApproverRole(CUD?.role)) { showToast("Not authorized","err"); return; }
  const r = _assignReqs.find(x=>x.id===id);
  if (!r || r.status !== "pending") { showToast("Request is no longer pending","err"); return; }
  confirmAction("Reject Assignment",`Reject assignment request?`, async()=>{
    try{
      await updateDoc(doc(db,"assignmentRequests",id),{status:"rejected",rejectedAt:serverTimestamp(),rejectedBy:CU.uid});
      await updateDoc(doc(db,"orders",r.orderId),{assignmentStatus:"rejected"});
      showToast("Assignment rejected","ok");
      await _loadApprovals();
    }catch(e){showToast("Error rejecting assignment","err");}
  });
};

/* ════════════════════════════════════════════════════════════
   INVITE KEYS
════════════════════════════════════════════════════════════ */
async function _loadInviteKeys(){
  _q("keysGrid").innerHTML=`<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-circle-notch spin"></i>loading…</div>`;
  try{
    const snap=await getDocs(query(collection(db,"inviteKeys"),orderBy("createdAt","desc")));
    const keys=snap.docs.map(d=>({id:d.id,...d.data()}));
    if(!keys.length){
      _q("keysGrid").innerHTML=`<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-key"></i>no invite keys yet<br>generate one above to onboard team members</div>`;
      return;
    }
    _q("keysGrid").innerHTML=keys.map(k=>{
      const expired = k.expiresAt?.toDate?.() && k.expiresAt.toDate() < new Date();
      const status = k.usedBy ? "used" : (expired ? "expired" : "active");
      const pill   = k.usedBy ? "complete" : (expired ? "cancelled" : "worker");
      return `
      <div class="key-card${k.usedBy?" used":""}">
        <div class="key-top">
          <div class="key-val">${k.id}</div>
          <span class="pill pill-${pill}">${status}</span>
        </div>
        <div class="key-meta">
          <strong style="color:rgba(197,198,199,.45)">Role:</strong> ${k.role}<br>
          <strong style="color:rgba(197,198,199,.45)">Created by:</strong> ${k.createdByName}<br>
          <strong style="color:rgba(197,198,199,.45)">Created:</strong> ${k.createdAt?.toDate?.().toLocaleDateString("en-IN")||"?"}
          ${k.expiresAt?`<br><strong style="color:rgba(197,198,199,.45)">Expires:</strong> ${k.expiresAt?.toDate?.().toLocaleDateString("en-IN")||"?"}`:""}
          ${k.usedBy?`<br><strong style="color:rgba(197,198,199,.45)">Used by:</strong> ${k.usedByName||k.usedBy.slice(0,8)+"?"}`:""}
        </div>
        ${(!k.usedBy && !expired)?`<div class="key-actions">
          <button class="btn-copy-key" onclick="window._copyKey('${k.id}')"><i class="fas fa-copy"></i>Copy Key</button>
          <button class="btn-revoke-key" onclick="window._revokeKey('${k.id}')"><i class="fas fa-ban"></i>Revoke</button>
        </div>`:""}
      </div>`;
    }).join("");
  }catch(e){_q("keysGrid").innerHTML=`<div class="empty-state" style="grid-column:1/-1">error loading keys</div>`;}
}

_q("btnGenKey")?.addEventListener("click",async function(){
  const role=CUD.role==="manager"?"worker":(_q("keyRoleSelect")?.value||"worker");
  this.classList.add("loading");
  try{
    const seg=()=>Math.random().toString(36).toUpperCase().slice(2,6).padEnd(4,"X");
    const key=`TNWR-${seg()}-${seg()}-${seg()}`;
    const expiresAt = new Date(Date.now()+INVITE_KEY_TTL_DAYS*24*60*60*1000);
    await setDoc(doc(db,"inviteKeys",key),{
      role,createdBy:CU.uid,createdByName:CUD.name,createdByRole:CUD.role,
      scope:"staff",
      usedBy:null,usedByName:null,createdAt:serverTimestamp(),expiresAt
    });
    await navigator.clipboard.writeText(key).catch(()=>{});
    showToast(`${role} key generated & copied!`,"ok");
    await _loadInviteKeys();
  }catch(e){showToast("Error generating key","err");}
  this.classList.remove("loading");
});

window._copyKey=key=>{navigator.clipboard.writeText(key).then(()=>showToast("Copied!","ok")).catch(()=>{});};
window._revokeKey=async key=>{
  confirmAction("Revoke Key",`Revoke "${key}"? It can no longer be used for signup.`,async()=>{
    try{await deleteDoc(doc(db,"inviteKeys",key));showToast("Key revoked","ok");await _loadInviteKeys();}
    catch(e){showToast("Error revoking key","err");}
  });
};

/* ════════════════════════════════════════════════════════════
   SHARED UTILITIES
════════════════════════════════════════════════════════════ */
function _q(id){return document.getElementById(id);}
function _stars(n){return"★".repeat(Math.min(5,n))+"☆".repeat(Math.max(0,5-n));}

window.showToast=function(msg,type=""){
  const t=_q("toast");
  t.textContent=msg;t.className="tnwr-toast show "+type;
  clearTimeout(t._t);t._t=setTimeout(()=>{t.className="tnwr-toast";},3500);
};

window.confirmAction=function(title,msg,onOk){
  _q("confirmTitle").textContent=title;
  _q("confirmMsg").textContent=msg;
  _q("confirmModal").classList.add("open");
  _confirmCallback=onOk;
};

_q("confirmOk").addEventListener("click",()=>{
  _q("confirmModal").classList.remove("open");
  _confirmCallback?.();
});
_q("confirmCancel").addEventListener("click",()=>{
  _q("confirmModal").classList.remove("open");
  _confirmCallback=null;
});
_q("confirmModal").addEventListener("click",e=>{
  if(e.target===_q("confirmModal")){_q("confirmModal").classList.remove("open");_confirmCallback=null;}
});
