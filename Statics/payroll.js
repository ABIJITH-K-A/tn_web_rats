(async function() {
  await new Promise(res => {
    if (window.TNWR_AUTH) { res(); return; }
    document.addEventListener("tnwr:authReady", res, { once:true });
  });

  const { db } = window.TNWR_AUTH;
  const { collection, addDoc, doc, updateDoc, getDocs, getDoc,
          query, where, orderBy, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  // ── SUGGESTED PAY FORMULA ─────────────────────────────────
  function calcSuggestedPay(workerOrders, teamOrders, allocatedAmount, referrals, avgRating) {
    if (teamOrders === 0) return 0;
    const base  = (workerOrders / teamOrders) * allocatedAmount;
    const bonus = referrals * 20;
    const mult  = avgRating >= 4.5 ? 1.15
                : avgRating >= 4.0 ? 1.05
                : avgRating <  3.0 ? 0.90 : 1.00;
    return Math.round((base + bonus) * mult);
  }

  // ── ADMIN: Create Payroll Entry ───────────────────────────
  async function createPayroll({ totalIncome, managerAllocations, month }) {
    const ud = window.TNWR_AUTH.getCurrentUserData();
    if (!["admin","superadmin"].includes(ud?.role))
      return { success:false, error:"Insufficient permissions." };

    try {
      const ref = await addDoc(collection(db,"payroll"), {
        month, totalIncome,
        managerAllocations,   // { [managerUid]: amount }
        workerAllocations: {},
        distributed: false,
        status: "pending",
        createdBy: window.TNWR_AUTH.getCurrentUser().uid,
        createdAt: serverTimestamp()
      });
      return { success:true, payrollId:ref.id };
    } catch(e) { return { success:false, error:e.message }; }
  }

  // ── MANAGER: Distribute to Workers ────────────────────────
  async function distributeToWorkers(payrollId, workerAllocations) {
    const uid = window.TNWR_AUTH.getCurrentUser()?.uid;
    const ud  = window.TNWR_AUTH.getCurrentUserData();
    if (!["manager","admin","superadmin"].includes(ud?.role))
      return { success:false, error:"Insufficient permissions." };

    try {
      const payrollSnap = await getDoc(doc(db,"payroll",payrollId));
      if (!payrollSnap.exists()) return { success:false, error:"Payroll not found." };
      const payroll  = payrollSnap.data();
      const myAlloc  = payroll.managerAllocations?.[uid] || 0;
      const totalOut = Object.values(workerAllocations).reduce((a,b)=>a+b, 0);

      if (totalOut > myAlloc)
        return { success:false, error:`Cannot distribute more than ₹${myAlloc} allocated to you.` };

      await updateDoc(doc(db,"payroll",payrollId), {
        [`workerAllocations`]: {
          ...(payroll.workerAllocations || {}),
          ...workerAllocations
        },
        distributed: true,
        status: "distributed"
      });
      return { success:true };
    } catch(e) { return { success:false, error:e.message }; }
  }

  // ── LOAD PAYROLL LIST ─────────────────────────────────────
  async function loadPayrolls() {
    try {
      const q = query(collection(db,"payroll"), orderBy("createdAt","desc"));
      const s = await getDocs(q);
      return s.docs.map(d => ({ id:d.id, ...d.data() }));
    } catch(e) { return []; }
  }

  // ── LOAD WORKERS WITH STATS ───────────────────────────────
  async function loadWorkerStats() {
    try {
      // Get all workers
      const uq = query(collection(db,"users"), where("role","==","worker"));
      const us = await getDocs(uq);
      const workers = us.docs.map(d => ({ uid:d.id, ...d.data() }));

      // Get all complete orders
      const oq = query(collection(db,"orders"), where("status","==","complete"));
      const os = await getDocs(oq);
      const orders = os.docs.map(d => ({ id:d.id, ...d.data() }));

      // Get referral counts
      const rq = query(collection(db,"referralCodes"));
      const rs = await getDocs(rq);
      const refMap = {};
      rs.docs.forEach(d => {
        const data = d.data();
        refMap[data.ownerUid] = (refMap[data.ownerUid] || 0) + (data.timesUsed || 0);
      });

      const teamOrders = orders.length;

      return workers.map(w => {
        const myOrders = orders.filter(o => o.workerAssigned === w.uid);
        const ratings  = myOrders.filter(o => o.review?.rating).map(o => o.review.rating);
        const avgRating = ratings.length
          ? Math.round((ratings.reduce((a,b)=>a+b,0)/ratings.length)*10)/10 : 0;
        return {
          ...w,
          ordersCompleted: myOrders.length,
          teamOrders,
          referralsGenerated: refMap[w.uid] || 0,
          avgRating,
          suggestedPay: 0 // calculated when allocation is known
        };
      });
    } catch(e) { return []; }
  }

  // ── RENDER PAYROLL ADMIN UI ───────────────────────────────
  window.TNWR_PAYROLL = {
    createPayroll, distributeToWorkers, loadPayrolls,
    loadWorkerStats, calcSuggestedPay,

    renderAdminPayrollUI(containerId) {
      const el = document.getElementById(containerId);
      if (!el) return;
      el.innerHTML = `
        <div class="payroll-card">
          <h4 class="text-cyan mb-4"><i class="fas fa-money-bill-wave me-2"></i>Create Payroll</h4>
          <div class="row g-3">
            <div class="col-md-4">
              <label class="form-label text-cyan">Month</label>
              <input type="month" id="pay-month" class="form-control booking-input">
            </div>
            <div class="col-md-4">
              <label class="form-label text-cyan">Total Income (₹)</label>
              <input type="number" id="pay-total" class="form-control booking-input" placeholder="Enter total">
            </div>
            <div class="col-md-4 d-flex align-items-end">
              <button class="btn btn-primary w-100" onclick="TNWR_PAYROLL.handleCreate()">
                <i class="fas fa-plus me-2"></i>Create Payroll
              </button>
            </div>
          </div>
          <div id="payroll-history" class="mt-5"></div>
        </div>`;
      this.loadHistory();
    },

    async loadHistory() {
      const list = await loadPayrolls();
      const el   = document.getElementById("payroll-history");
      if (!el) return;
      if (!list.length) { el.innerHTML='<p class="text-muted">No payroll records yet.</p>'; return; }
      el.innerHTML = `
        <h5 class="text-cyan mb-3">History</h5>
        <div class="table-responsive">
          <table class="table table-dark table-hover">
            <thead><tr>
              <th>Month</th><th>Total</th><th>Status</th><th>Created</th>
            </tr></thead>
            <tbody>
              ${list.map(p=>`
                <tr>
                  <td>${p.month||"—"}</td>
                  <td>₹${(p.totalIncome||0).toLocaleString("en-IN")}</td>
                  <td><span class="badge bg-${p.status==="distributed"?"success":"warning"}">${p.status}</span></td>
                  <td>${p.createdAt?.toDate?.().toLocaleDateString("en-IN")||"—"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    },

    async handleCreate() {
      const month = document.getElementById("pay-month")?.value;
      const total = parseFloat(document.getElementById("pay-total")?.value);
      if (!month || !total) { alert("Enter month and total income."); return; }
      const result = await createPayroll({ totalIncome:total, managerAllocations:{}, month });
      if (result.success) {
        alert("Payroll created! ID: " + result.payrollId);
        this.loadHistory();
      } else { alert("Error: " + result.error); }
    }
  };
})();