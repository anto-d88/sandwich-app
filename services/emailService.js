const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

const FORCE_TEST_EMAIL = process.env.FORCE_TEST_EMAIL === "true";
const TEST_EMAIL_TO = process.env.TEST_EMAIL_TO || "antonio-123@hotmail.be";

function formatPrice(value) {
  return Number(value || 0).toFixed(2).replace(".", ",") + "€";
}

function buildOrderConfirmationEmail(order) {
  const clientName = order.customer_name || order.client_name || "client";
  const total = formatPrice(order.total_amount || order.total || 0);
  const slot = order.delivery_slot || order.slot || "créneau prévu";
  const address = order.delivery_address || order.address || "adresse indiquée";
  const company = order.company || "";

  return `
  <div style="font-family: Arial, sans-serif; background:#f7f7f7; padding:24px;">
    <div style="max-width:600px; margin:auto; background:white; border-radius:14px; padding:24px;">
      <h2 style="margin-top:0;">Commande confirmée ✅</h2>

      <p>Bonjour ${clientName},</p>

      <p>
        Merci pour votre commande chez <strong>La Pause Sandwich</strong>.
        Votre paiement a bien été reçu.
      </p>

      <div style="background:#f2f2f2; border-radius:12px; padding:16px; margin:20px 0;">
        <p><strong>Total :</strong> ${total}</p>
        <p><strong>Créneau :</strong> ${slot}</p>
        ${company ? `<p><strong>Entreprise :</strong> ${company}</p>` : ""}
        <p><strong>Adresse :</strong> ${address}</p>
      </div>

      <p>
        Vous serez prévenu(e) pour le retrait ou la livraison.
      </p>

      <p style="margin-top:28px;">
        Merci pour votre confiance 😊<br>
        <strong>La Pause Sandwich</strong>
      </p>
    </div>
  </div>
  `;
}

async function sendOrderConfirmationEmail(order) {
  if (!order.customer_email && !order.email) {
    console.log("Aucun email client trouvé, mail non envoyé.");
    return null;
  }

  const realCustomerEmail = order.customer_email || order.email;
  const to = FORCE_TEST_EMAIL ? TEST_EMAIL_TO : realCustomerEmail;

  console.log("📧 Email confirmation commande");
  console.log("Destinataire réel :", realCustomerEmail);
  console.log("Destinataire utilisé :", to);
  console.log("Mode test forcé :", FORCE_TEST_EMAIL);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || "La Pause Sandwich <onboarding@resend.dev>",
    to: [to],
    subject: "Votre commande La Pause Sandwich est confirmée ✅",
    html: buildOrderConfirmationEmail(order),
  });

  if (error) {
    console.error("Erreur Resend:", error);
    throw error;
  }

  return data;
}

module.exports = {
  sendOrderConfirmationEmail,
};