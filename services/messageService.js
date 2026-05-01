const supabase = require('../config/supabaseClient');

async function createMessage(payload) {
  const { data, error } = await supabase
    .from('customer_messages')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('ERREUR SUPABASE MESSAGE:', error);
    throw error;
  }

  return data;
}

async function getAllMessages() {
  const { data, error } = await supabase
    .from('customer_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function updateMessageStatus(id, status) {
  const { data, error } = await supabase
    .from('customer_messages')
    .update({
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  createMessage,
  getAllMessages,
  updateMessageStatus
};