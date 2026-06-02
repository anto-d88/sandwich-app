async function sendTelegramMessage(text) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log("Telegram non configuré");
    console.log(text);
    return;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur Telegram :", errorText);
    }
  } catch (error) {
    console.error("Erreur envoi Telegram :", error);
  }
}

function notifyNewMessage(message) {
  const typeLabel =
    message.message_type === "meeting_request"
      ? "🔥 DEMANDE RÉUNION"
      : "📩 Nouveau message client";

  console.log("\n==============================");
  console.log(typeLabel);
  console.log("Nom:", message.customer_name || "Non renseigné");
  console.log("Entreprise:", message.company_name || "Non renseignée");
  console.log("Téléphone:", message.customer_phone || "Non renseigné");
  console.log("Email:", message.customer_email || "Non renseigné");
  console.log("Sujet:", message.subject || "Sans sujet");
  console.log("Message:", message.message);
  console.log("Date souhaitée:", message.preferred_date || "-");
  console.log("Heure souhaitée:", message.preferred_time || "-");
  console.log("==============================\n");
}

async function notifyNewTeamOrder(teamOrder) {
  const total = Number(teamOrder.total_amount || 0)
    .toFixed(2)
    .replace(".", ",");

  const text = `
🥪 <b>Nouvelle commande équipe payée</b>

Commande équipe #${teamOrder.id}

🏢 Entreprise : ${teamOrder.company_name || "Non renseignée"}
👤 Responsable : ${teamOrder.customer_name || "Non renseigné"}
📞 Téléphone : ${teamOrder.customer_phone || "Non renseigné"}
📍 Adresse : ${teamOrder.delivery_address || "Non renseignée"}
🕒 Créneau : ${teamOrder.delivery_slot_label || teamOrder.delivery_slot || "Non renseigné"}
💰 Total : ${total} €

➡️ À préparer en cuisine.
`;

  console.log("\n==============================");
  console.log("🥪 Nouvelle commande équipe payée");
  console.log("Commande équipe:", teamOrder.id);
  console.log("Entreprise:", teamOrder.company_name || "Non renseignée");
  console.log("Responsable:", teamOrder.customer_name || "Non renseigné");
  console.log("Téléphone:", teamOrder.customer_phone || "Non renseigné");
  console.log("Créneau:", teamOrder.delivery_slot_label || teamOrder.delivery_slot || "Non renseigné");
  console.log("Total:", `${total} €`);
  console.log("==============================\n");

  await sendTelegramMessage(text);
}

module.exports = {
  notifyNewMessage,
  notifyNewTeamOrder,
};