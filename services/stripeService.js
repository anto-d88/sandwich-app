const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createCheckoutSession({ cart, customer }) {
  const line_items = cart.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.name
      },
      unit_amount: Math.round(Number(item.price) * 100)
    },
    quantity: item.quantity
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items,
    customer_email: customer.customer_email || undefined,
    metadata: {
      customer_name: customer.customer_name || '',
      customer_phone: customer.customer_phone || '',
      customer_email: customer.customer_email || '',
      company_name: customer.company_name || '',
      delivery_address: customer.delivery_address || '',
      delivery_slot: customer.delivery_slot || ''
    },
success_url: `${process.env.BASE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${process.env.BASE_URL}/order/cancel`
  });

  return session;
}
async function createTeamOrderCheckoutSession({ teamOrder, items }) {
  const line_items = items.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: `${item.product_name} — ${item.participant_name}`
      },
      unit_amount: Math.round(Number(item.unit_price) * 100)
    },
    quantity: item.quantity
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items,
    metadata: {
      type: 'team_order',
      team_order_id: String(teamOrder.id),
      team_name: teamOrder.team_name || '',
      delivery_address: teamOrder.delivery_address || '',
      delivery_slot: teamOrder.delivery_slot || ''
    },
success_url: `${process.env.BASE_URL}/team-order/${teamOrder.id}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
cancel_url: `${process.env.BASE_URL}/team-order/${teamOrder.id}/summary`
  });

  return session;
}

async function retrieveCheckoutSession(sessionId) {
  return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = {
  createCheckoutSession,
  createTeamOrderCheckoutSession,
  retrieveCheckoutSession
};