const messageService = require('../services/messageService');
const notificationService = require('../services/notificationService');

exports.getContactPage = (req, res) => {
  res.render('contact', {
    title: 'Nous contacter',
    success: null,
    error: null,
    old: {}
  });
};

exports.sendCustomerMessage = async (req, res) => {
  try {
    const {
      message_type,
      customer_name,
      customer_email,
      customer_phone,
      company_name,
      subject,
      message
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).render('contact', {
        title: 'Nous contacter',
        success: null,
        error: 'Merci d’écrire votre message.',
        old: req.body
      });
    }

    const savedMessage = await messageService.createMessage({
      message_type: message_type || 'general',
      customer_name,
      customer_email,
      customer_phone,
      company_name,
      subject,
      message,
      priority: message_type === 'reclamation' ? 'haute' : 'normal'
    });

    notificationService.notifyNewMessage(savedMessage);

    res.render('contact', {
      title: 'Nous contacter',
      success: 'Merci, votre message a bien été envoyé.',
      error: null,
      old: {}
    });
  } catch (error) {
    console.error('Erreur sendCustomerMessage:', error);

    res.status(500).render('contact', {
      title: 'Nous contacter',
      success: null,
      error: 'Erreur lors de l’envoi du message. Merci de réessayer.',
      old: req.body
    });
  }
};

exports.getMeetingRequestPage = (req, res) => {
  res.render('meeting-request', {
    title: 'Demande spéciale entreprise',
    success: null,
    error: null,
    old: {}
  });
};

exports.sendMeetingRequest = async (req, res) => {
  try {
    const {
      customer_name,
      customer_email,
      customer_phone,
      company_name,
      preferred_date,
      preferred_time,
      message
    } = req.body;

    if (!company_name || !customer_phone || !preferred_date || !preferred_time || !message) {
      return res.status(400).render('meeting-request', {
        title: 'Demande spéciale entreprise',
        success: null,
        error: 'Merci de remplir les champs obligatoires.',
        old: req.body
      });
    }

    const savedMessage = await messageService.createMessage({
      message_type: 'meeting_request',
      customer_name,
      customer_email,
      customer_phone,
      company_name,
      subject: 'Demande livraison spéciale / réunion',
      preferred_date,
      preferred_time,
      message,
      priority: 'haute'
    });

    notificationService.notifyNewMessage(savedMessage);

    res.render('meeting-request', {
      title: 'Demande spéciale entreprise',
      success: 'Votre demande a bien été envoyée. Je vous recontacterai pour confirmer l’organisation.',
      error: null,
      old: {}
    });
  } catch (error) {
    console.error('Erreur sendMeetingRequest:', error);

    res.status(500).render('meeting-request', {
      title: 'Demande spéciale entreprise',
      success: null,
      error: 'Erreur lors de l’envoi de la demande. Merci de réessayer.',
      old: req.body
    });
  }
};