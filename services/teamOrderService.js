const supabase = require('../config/supabaseClient');

async function createTeamOrder(payload) {
  const { data, error } = await supabase
    .from('team_orders')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getTeamOrderById(teamOrderId) {
  const { data, error } = await supabase
    .from('team_orders')
    .select('*')
    .eq('id', teamOrderId)
    .single();

  if (error) throw error;
  return data;
}

async function addParticipantItem(payload) {
  const { data, error } = await supabase
    .from('team_order_items')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getTeamOrderItems(teamOrderId) {
  const { data, error } = await supabase
    .from('team_order_items')
    .select('*')
    .eq('team_order_id', teamOrderId)
    .order('id', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function updateTeamOrderStripeSessionId(teamOrderId, stripeSessionId) {
  const { data, error } = await supabase
    .from('team_orders')
    .update({ stripe_session_id: stripeSessionId })
    .eq('id', teamOrderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getTeamOrderByStripeSessionId(stripeSessionId) {
  const { data, error } = await supabase
    .from('team_orders')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateTeamOrderStatus(teamOrderId, status) {
  const { data, error } = await supabase
    .from('team_orders')
    .update({ status })
    .eq('id', teamOrderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function countTeamOrdersBySlot(deliverySlot) {
  const { count, error } = await supabase
    .from('team_orders')
    .select('*', { count: 'exact', head: true })
    .eq('delivery_slot', deliverySlot);

  if (error) throw error;
  return count || 0;
}

async function decrementSingleProductStock(productId, quantity) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, stock_quantity')
    .eq('id', productId)
    .single();

  if (productError) {
    throw productError;
  }

  const currentStock = Number(product.stock_quantity || 0);
  const orderedQty = Number(quantity || 0);
  const newStock = currentStock - orderedQty;

  if (newStock < 0) {
    throw new Error(`Stock insuffisant pour ${product.name}`);
  }

  const { error: updateError } = await supabase
    .from('products')
    .update({ stock_quantity: newStock })
    .eq('id', productId);

  if (updateError) {
    throw updateError;
  }
}

async function decrementStockFromTeamOrder(teamOrderId) {
  const items = await getTeamOrderItems(teamOrderId);

  for (const item of items) {
    // Produit simple : sandwich seul, boisson seule, dessert seul
    if (item.item_type !== 'formule') {
      if (!item.product_id) {
        continue;
      }

      await decrementSingleProductStock(item.product_id, item.quantity);
    }

    // Formule : sandwich + boisson + dessert
    if (item.item_type === 'formule') {
      const productIds = [item.product_id, item.boisson_id, item.dessert_id].filter(Boolean);

      for (const productId of productIds) {
        await decrementSingleProductStock(productId, item.quantity);
      }
    }
  }
}

module.exports = {
  createTeamOrder,
  getTeamOrderById,
  addParticipantItem,
  getTeamOrderItems,
  updateTeamOrderStripeSessionId,
  getTeamOrderByStripeSessionId,
  updateTeamOrderStatus,
  countTeamOrdersBySlot,
  decrementStockFromTeamOrder
};