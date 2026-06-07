const supabase = require('../config/supabaseClient');

function cleanText(value) {
  return value ? String(value).trim() : null;
}

function normalizeCategory(value) {
  const category = cleanText(value);

  if (!category) {
    throw new Error('La catégorie est obligatoire.');
  }

  return category;
}

function normalizeProductPayload(body) {
  const name = cleanText(body.name);
  const category = normalizeCategory(body.category);
  const description = cleanText(body.description);
  const image_url = cleanText(body.image_url);

  const price = Number(String(body.price || '').replace(',', '.'));
  const stock_quantity = Number(body.stock_quantity || 0);

  if (!name) {
    throw new Error('Le nom du produit est obligatoire.');
  }

  if (Number.isNaN(price) || price < 0) {
    throw new Error('Le prix est invalide.');
  }

  if (Number.isNaN(stock_quantity) || stock_quantity < 0) {
    throw new Error('Le stock est invalide.');
  }

  return {
    name,
    description,
    price,
    category,
    image_url,
    stock_quantity,
    is_available: body.is_available === 'on' || body.is_available === true
  };
}

async function getAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('category', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  return data || [];
}

async function getProductById(productId) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

async function createProduct(body) {
  const payload = normalizeProductPayload(body);

  const { data, error } = await supabase
    .from('products')
    .insert([payload])
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function updateProduct(productId, body) {
  const payload = normalizeProductPayload(body);

  const { data, error } = await supabase
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function toggleProductAvailability(productId) {
  const product = await getProductById(productId);

  if (!product) {
    throw new Error('Produit introuvable.');
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      is_available: !product.is_available
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  toggleProductAvailability
};