const supabase = require("../config/supabaseClient");

async function createOrderWithItems(orderPayload, cart) {
  // 🔥 1. Vérification du stock AVANT commande
  await checkStockBeforeOrder(cart);

  // 🔥 2. Calcul du total
  const total = cart.reduce((sum, item) => {
    return sum + Number(item.price || 0) * Number(item.quantity || 0);
  }, 0);

  // 🔥 3. Création commande
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert([
      {
        ...orderPayload,
        total_amount: total,
        status: orderPayload.status || "nouvelle",
      },
    ])
    .select()
    .single();

  if (orderError) throw orderError;

  // 🔥 4. Création order_items
  const orderItems = cart.map((item) => ({
    order_id: order.id,
    product_id: Number(item.id) || null,
    product_name: item.name,
    unit_price: Number(item.price || 0),
    quantity: Number(item.quantity || 0),
    line_total: Number(item.price || 0) * Number(item.quantity || 0),
  }));

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(orderItems);

  if (itemsError) throw itemsError;

  // 🔥 5. Décrémentation stock
  await decrementStockFromCart(cart);

  return order;
}

async function getOrderByStripeSessionId(stripeSessionId) {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function countOrdersBySlot(deliverySlot) {
  const { count, error } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("delivery_slot", deliverySlot);

  if (error) throw error;
  return count || 0;
}

// 🔥 Vérification du stock AVANT commande
async function checkStockBeforeOrder(cart) {
  for (const item of cart) {
    if (item.is_formula && item.formula_items) {
      for (const subItem of item.formula_items) {
        await checkSingleProductStock(subItem.id, item.quantity);
      }
    } else {
      await checkSingleProductStock(item.id, item.quantity);
    }
  }
}

async function checkSingleProductStock(productId, quantity) {
  const { data: product, error } = await supabase
    .from("products")
    .select("id, name, stock_quantity")
    .eq("id", productId)
    .single();

  if (error) throw error;

  const stock = Number(product.stock_quantity || 0);
  const requested = Number(quantity || 0);

  if (stock <= 0) {
    throw new Error(`${product.name} est en rupture de stock`);
  }

  if (requested > stock) {
    throw new Error(
      `Stock insuffisant pour ${product.name} (disponible: ${stock})`
    );
  }
}

// 🔥 Décrémentation stock
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

async function decrementStockFromCart(cart) {
  for (const item of cart) {
    if (item.is_formula && item.formula_items) {
      for (const subItem of item.formula_items) {
        await decrementSingleProductStock(subItem.id, item.quantity);
      }
    } else {
      await decrementSingleProductStock(item.id, item.quantity);
    }
  }
}

module.exports = {
  createOrderWithItems,
  getOrderByStripeSessionId,
  countOrdersBySlot,
  decrementStockFromCart,
};
