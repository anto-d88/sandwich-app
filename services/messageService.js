const supabase = require('../config/supabaseClient');

async function createMessage(payload) {
  const { data, error } = await supabase
    .from('customer_messages')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  createMessage
};