const adminService = require('../services/adminService');

exports.getDashboard = async (req, res) => {
  try {
    const recentOrders = await adminService.getRecentOrders(5);
    const recentTeamOrders = await adminService.getRecentTeamOrders(5);
    const newOrdersCount = await adminService.countNewOrders();
    const openTeamOrdersCount = await adminService.countOpenTeamOrders();

    res.render('admin/dashboard', {
      title: 'Dashboard admin',
      recentOrders,
      recentTeamOrders,
      newOrdersCount,
      openTeamOrdersCount
    });
  } catch (error) {
    console.error('Erreur getDashboard:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getOrders = async (req, res) => {
  try {
    const orders = await adminService.getAllOrders();

    res.render('admin/orders', {
      title: 'Commandes',
      orders
    });
  } catch (error) {
    console.error('Erreur getOrders:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const order = await adminService.getOrderWithItems(orderId);

    res.render('admin/order-details', {
      title: `Commande #${order.id}`,
      order
    });
  } catch (error) {
    console.error('Erreur getOrderDetails:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    await adminService.updateOrderStatus(orderId, status);

    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error('Erreur updateOrderStatus:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getTeamOrders = async (req, res) => {
  try {
    const teamOrders = await adminService.getAllTeamOrders();

    res.render('admin/team-orders', {
      title: 'Commandes équipe',
      teamOrders
    });
  } catch (error) {
    console.error('Erreur getTeamOrders:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.getTeamOrderDetails = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const teamOrder = await adminService.getTeamOrderWithItems(teamOrderId);

    res.render('admin/team-order-details', {
      title: `Commande équipe #${teamOrder.id}`,
      teamOrder
    });
  } catch (error) {
    console.error('Erreur getTeamOrderDetails:', error);
    res.status(500).send('Erreur serveur');
  }
};

exports.updateTeamOrderStatus = async (req, res) => {
  try {
    const teamOrderId = Number(req.params.id);
    const { status } = req.body;

    await adminService.updateTeamOrderStatus(teamOrderId, status);

    res.redirect(`/admin/team-orders/${teamOrderId}`);
  } catch (error) {
    console.error('Erreur updateTeamOrderStatus:', error);
    res.status(500).send('Erreur serveur');
  }
};