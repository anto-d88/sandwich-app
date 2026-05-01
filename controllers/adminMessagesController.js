const messageService = require('../services/messageService');

exports.getMessagesPage = async (req, res) => {
  try {
    const messages = await messageService.getAllMessages();

    res.render('admin-messages', {
      title: 'Messages clients',
      messages
    });
  } catch (error) {
    console.error('Erreur getMessagesPage:', error);
    res.status(500).send('Erreur chargement messages');
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const messageId = req.params.id;
    const { status } = req.body;

    await messageService.updateMessageStatus(messageId, status);

    res.redirect('/admin/messages');
  } catch (error) {
    console.error('Erreur updateStatus:', error);
    res.status(500).send('Erreur mise à jour message');
  }
};