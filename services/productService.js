const supabase = require('../config/supabaseClient');

function isCategoryOpen(product, settings = {}) {
  const category = product.category;

  if (category === 'sandwich') {
    return settings.sandwiches_open !== 'false';
  }

  if (category === 'salades') {
    return settings.salads_open !== 'false';
  }

  if (category === 'boisson') {
    return settings.drinks_open !== 'false';
  }

  if (category === 'dessert') {
    return settings.desserts_open !== 'false';
  }

  if (category === 'breakfast' || category === 'petit_dejeuner' || category === 'petit-dejeuner') {
    return settings.breakfast_open === 'true';
  }

  return true;
}

async function getAllAvailableProducts(settings = {}) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('id', { ascending: true });

  if (error) {
    throw error;
  }

  return (data || []).filter(product => isCategoryOpen(product, settings));
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