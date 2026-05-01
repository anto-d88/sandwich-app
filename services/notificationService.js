function notifyNewMessage(message) {
  const typeLabel =
    message.message_type === 'meeting_request'
      ? '🔥 DEMANDE RÉUNION'
      : '📩 Nouveau message client';

  console.log('\n==============================');
  console.log(typeLabel);
  console.log('Nom:', message.customer_name || 'Non renseigné');
  console.log('Entreprise:', message.company_name || 'Non renseignée');
  console.log('Téléphone:', message.customer_phone || 'Non renseigné');
  console.log('Email:', message.customer_email || 'Non renseigné');
  console.log('Sujet:', message.subject || 'Sans sujet');
  console.log('Message:', message.message);
  console.log('Date souhaitée:', message.preferred_date || '-');
  console.log('Heure souhaitée:', message.preferred_time || '-');
  console.log('==============================\n');
}

module.exports = {
  notifyNewMessage
};