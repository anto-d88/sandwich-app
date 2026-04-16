const supabase = require('../config/supabaseClient');

async function countOrdersBySlot(deliverySlot) {
  const { count, error } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('delivery_slot', deliverySlot);

  if (error) {
    throw error;
  }

  return count || 0;
}

async function getOrderByStripeSessionId(stripeSessionId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('stripe_session_id', stripeSessionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function decrementStockFromCart(cart) {
  for (const item of cart) {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, stock_quantity')
      .eq('id', item.id)
      .single();

    if (productError) {
      throw productError;
    }

    const currentStock = Number(product.stock_quantity || 0);
    const orderedQty = Number(item.quantity || 0);
    const newStock = currentStock - orderedQty;

    if (newStock < 0) {
      throw new Error(`Stock insuffisant pour ${product.name}`);
    }

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', item.id);

    if (updateError) {
      throw updateError;
    }
  }
}

async function createOrderWithItems(orderPayload, cart) {
  const existingOrder = orderPayload.stripe_session_id
    ? await getOrderByStripeSessionId(orderPayload.stripe_session_id)
    : null;

  if (existingOrder) {
    return existingOrder;
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([orderPayload])
    .select()
    .single();

  if (orderError) {
    throw orderError;
  }

  const orderItemsPayload = cart.map(item => ({
    order_id: order.id,
    product_id: item.id,
    product_name: item.name,
    unit_price: item.price,
    quantity: item.quantity
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload);

  if (itemsError) {
    throw itemsError;
  }

  // ✅ Décrémente le stock après insertion commande + lignes
  await decrementStockFromCart(cart);

  return order;
}

module.exports = {
  createOrderWithItems,
  getOrderByStripeSessionId,
  countOrdersBySlot
};