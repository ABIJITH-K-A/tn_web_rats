const EMAILJS_CONFIG = {
  publicKey:     "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId:     "YOUR_SERVICE_ID",
  ownerTplId:    "template_owner_order",
  customerTplId: "template_customer_confirm"
};
const OWNER_EMAIL = "unofficials113@gmail.com";

(function(){
  if (typeof emailjs !== "undefined") emailjs.init(EMAILJS_CONFIG.publicKey);
})();

function sendOrderEmails(o, paymentId) {
  // Completely non-blocking — never awaited
  Promise.resolve().then(() => {
    if (typeof emailjs === "undefined") {
      console.log("[email.js] EmailJS SDK not loaded"); return;
    }
    const discountPct = (o.discountPercent ?? o.discountPct ?? 0);
    const discountLabel = discountPct > 0
      ? `-₹${o.discount||0} (${discountPct}% | ${o.referralCode||"N/A"})`
      : "None";
    // Owner email
    emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.ownerTplId, {
      to_email:         OWNER_EMAIL,
      order_id:         o.orderId||"N/A",
      service:          o.service||"",
      package:          o.package||"",
      original_price:   `₹${o.originalPrice||0}`,
      discount:         discountLabel,
      final_price:      `₹${o.finalPrice||0}`,
      payment_id:       paymentId||"WhatsApp/Manual",
      customer_name:    o.customerName||"",
      customer_email:   o.customerEmail||"",
      customer_phone:   o.customerPhone||"",
      project_name:     o.projectName||"",
      deadline:         o.deadline||"",
      instructions:     o.instructions||"",
      drive_link:       o.driveLink||"Not provided",
      extra_fields:     _extras(o),
      delivery_date:    o.deliveryDate||""
    }).catch(err => console.log("[email.js] Owner email failed:", err));

    // Customer confirmation email
    emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.customerTplId, {
      to_email:          o.customerEmail||"",
      customer_name:     o.customerName||"",
      order_id:          o.orderId||"N/A",
      service:           o.service||"",
      package:           o.package||"",
      amount_paid:       `₹${o.finalPrice||0}`,
      delivery_date:     o.deliveryDate||"",
      contact_whatsapp:  "+91 8300920680",
      contact_email:     OWNER_EMAIL,
      instagram:         "@tn_web_rats"
    }).catch(err => console.log("[email.js] Customer email failed:", err));
  });
}

function _extras(o) {
  const lines = [];
  if (o.slideCount)    lines.push(`Slides: ${o.slideCount}`);
  if (o.topic)         lines.push(`Topic: ${o.topic}`);
  if (o.audience)      lines.push(`Audience: ${o.audience}`);
  if (o.posterSize)    lines.push(`Poster Size: ${o.posterSize}`);
  if (o.headline)      lines.push(`Headline: ${o.headline}`);
  if (o.brandColors)   lines.push(`Brand Colors: ${o.brandColors}`);
  if (o.websiteType)   lines.push(`Website Type: ${o.websiteType}`);
  if (o.domain)        lines.push(`Domain: ${o.domain}`);
  if (o.referenceUrls) lines.push(`References: ${o.referenceUrls}`);
  return lines.join("\n") || "N/A";
}

window.TNWR_EMAIL = { sendOrderEmails };