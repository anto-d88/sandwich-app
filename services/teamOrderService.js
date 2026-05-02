const supabase = require("../config/supabaseClient");

function getItemTotal(item) {
  const quantity = Number(item.quantity || 1);

  const unitPrice =
    Number(item.unit_price || 0) ||
    Number(item.price || 0) ||
    Number(item.formula_price || 0) ||
    Number(item.total_price || 0) ||
    0;

  return unitPrice * quantity;
}

async function recalculateTeamOrderTotal(teamOrderId) {
  const items = await getTeamOrderItems(teamOrderId);

  const total = items.reduce((sum, item) => {
    return sum + getItemTotal(item);
  }, 0);

  const { data, error } = await supabase
    .from("team_orders")
    .update({ total_amount: total })
    .eq("id", teamOrderId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function createTeamOrder(payload) {
  const { data, error } = await supabase
    .from("team_orders")
    .insert([
      {
        ...payload,
        total_amount: Number(payload.total_amount || payload.total_price || 0),
        status: payload.status || "nouvelle",
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getTeamOrderById(teamOrderId) {
  const { data, error } = await supabase
    .from("team_orders")
    .select("*")
    .eq("id", teamOrderId)
    .single();

  if (error) throw error;
  return data;
}

async function addParticipantItem(payload) {
  const quantity = Number(payload.quantity || 1);

  const unitPrice =
    Number(payload.unit_price || 0) ||
    Number(payload.price || 0) ||
    Number(payload.formula_price || 0) ||
    0;

  const lineTotal = Number(payload.line_total || unitPrice * quantity || 0);

  const { data, error } = await supabase
    .from("team_order_items")
    .insert([
      {
        ...payload,
        quantity,
        unit_price: unitPrice,
        line_total: lineTotal,
      },
    ])
    .select()
    .single();

  if (error) throw error;

  if (data.team_order_id) {
    await recalculateTeamOrderTotal(data.team_order_id);
  }

  return data;
}

async function getTeamOrderItems(teamOrderId) {
  const { data, error } = await supabase
    .from("team_order_items")
    .select("*")
    .eq("team_order_id", teamOrderId)
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

async function updateTeamOrderStripeSessionId(teamOrderId, stripeSessionId) {
  const { data, error } = await supabase
    .from("team_orders")
    .update({ stripe_session_id: stripeSessionId })
    .eq("id", teamOrderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getTeamOrderByStripeSessionId(stripeSessionId) {
  const { data, error } = await supabase
    .from("team_orders")
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateTeamOrderStatus(teamOrderId, status) {
  const { data, error } = await supabase
    .from("team_orders")
    .update({ status })
    .eq("id", teamOrderId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function countTeamOrdersBySlot(deliverySlot) {
  const { count, error } = await supabase
    .from("team_orders")
    .select("*", { count: "exact", head: true })
    .eq("delivery_slot", deliverySlot);

  if (error) throw error;
  return count || 0;
}

async function decrementSingleProductStock(productId, quantity) {
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name, stock_quantity")
    .eq("id", productId)
    .single();

  if (productError) throw productError;

  const currentStock = Number(product.stock_quantity || 0);
  const orderedQty = Number(quantity || 0);
  const newStock = currentStock - orderedQty;

  if (newStock < 0) {
    throw new Error(`Stock insuffisant pour ${product.name}`);
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({ stock_quantity: newStock })
    .eq("id", productId);

  if (updateError) throw updateError;
}

async function decrementStockFromTeamOrder(teamOrderId) {
  const items = await getTeamOrderItems(teamOrderId);

  for (const item of items) {
    if (item.item_type !== "formule") {
      if (!item.product_id) continue;
      await decrementSingleProductStock(item.product_id, item.quantity);
    }

    if (item.item_type === "formule") {
      const productIds = [
        item.product_id,
        item.boisson_id,
        item.dessert_id,
      ].filter(Boolean);

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
  decrementStockFromTeamOrder,
  recalculateTeamOrderTotal,
};