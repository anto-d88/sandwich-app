const supabase = require('../config/supabaseClient');

async function getAllAvailableProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

async function getProductById(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  getAllAvailableProducts,
  getProductById
};