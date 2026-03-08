(async function() {
  // Wait for auth to be ready
  await new Promise(res => {
    if (window.TNWR_AUTH) { res(); return; }
    document.addEventListener("tnwr:authReady", res, { once:true });
  });

  const { db } = window.TNWR_AUTH;

  const { doc, updateDoc, setDoc, collection,
          addDoc, serverTimestamp, query,
          where, getDocs, getDoc, orderBy, limit } =
    await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

  // ── Render Review Prompt Modal ──────────────────────────────
  document.addEventListener("tnwr:showReview", ({ detail }) => {
    const { orderId, orderData } = detail;
    const modal = document.getElementById("review-modal");
    if (!modal) return;
    document.getElementById("review-order-service").textContent =
      `${orderData.service} — ${orderData.package}`;
    document.getElementById("review-order-id-label").textContent = orderId;
    modal.style.display = "flex";
    bindStarRating(orderId);
  });

  function bindStarRating(orderId) {
    const stars  = document.querySelectorAll(".review-star");
    const submit = document.getElementById("btn-submit-review");
    let selectedRating = 0;

    stars.forEach((star, i) => {
      star.addEventListener("mouseover", () => highlightStars(i+1));
      star.addEventListener("mouseleave", () => highlightStars(selectedRating));
      star.addEventListener("click", () => {
        selectedRating = i + 1;
        highlightStars(selectedRating);
      });
    });

    function highlightStars(n) {
      stars.forEach((s, i) => {
        s.classList.toggle("active", i < n);
        s.innerHTML = i < n ? "★" : "☆";
      });
    }

    submit?.addEventListener("click", async () => {
      if (!selectedRating) { alert("Please select a rating."); return; }
      const comment = document.getElementById("review-comment")?.value.trim() || "";
      submit.disabled=true; submit.textContent="Submitting...";
      await submitReview(orderId, selectedRating, comment);
      submit.disabled=false;
      document.getElementById("review-modal").style.display = "none";
      showReviewSuccess();
    }, { once:true });
  }

  async function submitReview(orderId, rating, comment) {
    try {
      const uid = window.TNWR_AUTH.getCurrentUser()?.uid;
      // Update order doc
      await updateDoc(doc(db,"orders",orderId), {
        "review.rating":    rating,
        "review.comment":   comment,
        "review.createdAt": serverTimestamp(),
        reviewDone: true
      });
      const orderSnap = await getDoc(doc(db,"orders",orderId)).catch(() => null);
      const orderData = orderSnap?.data ? orderSnap.data() : null;
      // Add to /reviews/ collection
      await addDoc(collection(db,"reviews"), {
        orderId, rating, comment,
        customerId: uid,
        workerAssigned: orderData?.workerAssigned || null,
        service: orderData?.service || document.getElementById("review-order-service")?.textContent || null,
        package: orderData?.package || null,
        createdAt: serverTimestamp()
      });
    } catch(e) { console.error("submitReview:", e); }
  }

  function showReviewSuccess() {
    const t = document.createElement("div");
    t.className = "booking-toast show success";
    t.textContent = "Thank you for your review! ⭐";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  // ── Load Reviews for Admin/Manager Display ──────────────────
  window.TNWR_REVIEWS = {
    async loadWorkerReviews(workerUid) {
      try {
        const q = query(collection(db,"reviews"),
          where("workerAssigned","==",workerUid), orderBy("createdAt","desc"));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id:d.id, ...d.data() }));
      } catch(e) { return []; }
    },

    async loadAllReviews() {
      try {
        const q = query(collection(db,"reviews"), orderBy("createdAt","desc"), limit(50));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id:d.id, ...d.data() }));
      } catch(e) { return []; }
    },

    renderStars(rating) {
      return Array.from({length:5}, (_,i) =>
        `<span class="${i<rating?'text-yellow':'text-muted'}" style="font-size:1.1rem">${i<rating?'★':'☆'}</span>`
      ).join("");
    }
  };
})();