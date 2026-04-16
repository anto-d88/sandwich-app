const supabase = require('../config/supabaseClient');

async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getOrderWithItems(orderId) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (orderError) {
    throw orderError;
  }

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId)
    .order('id', { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  return {
    ...order,
    items: items || []
  };
}

async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function getAllTeamOrders() {
  const { data, error } = await supabase
    .from('team_orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getTeamOrderWithItems(teamOrderId) {
  const { data: teamOrder, error: teamOrderError } = await supabase
    .from('team_orders')
    .select('*')
    .eq('id', teamOrderId)
    .single();

  if (teamOrderError) {
    throw teamOrderError;
  }

  const { data: items, error: itemsError } = await supabase
    .from('team_order_items')
    .select('*')
    .eq('team_order_id', teamOrderId)
    .order('id', { ascending: true });

  if (itemsError) {
    throw itemsError;
  }

  return {
    ...teamOrder,
    items: items || []
  };
}

async function updateTeamOrderStatus(teamOrderId, status) {
  const { data, error } = await supabase
    .from('team_orders')
    .update({ status })
    .eq('id', teamOrderId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


async function getRecentOrders(limit = 5) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function getRecentTeamOrders(limit = 5) {
  const { data, error } = await supabase
    .from('team_orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function countNewOrders() {
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'nouvelle');

  if (error) throw error;
  return count || 0;
}

async function countOpenTeamOrders() {
  const { count, error } = await supabase
    .from('team_orders')
    .select('*', { count: 'exact', head: true })
    .in('status', ['ouverte', 'payée']);

  if (error) throw error;
  return count || 0;
}

module.exports = {
  getAllOrders,
  getOrderWithItems,
  updateOrderStatus,
  getAllTeamOrders,
  getTeamOrderWithItems,
  updateTeamOrderStatus,
  getRecentOrders,
  getRecentTeamOrders,
  countNewOrders,
  countOpenTeamOrders
};