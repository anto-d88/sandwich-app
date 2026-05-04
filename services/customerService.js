const supabase = require('../config/supabaseClient');

async function findOrCreateCompany({ name, address = null, city = null, notes = null }) {
  if (!name || !name.trim()) {
    return null;
  }

  const cleanName = name.trim();

  const { data: existingCompany, error: searchError } = await supabase
    .from('companies')
    .select('*')
    .ilike('name', cleanName)
    .maybeSingle();

  if (searchError) {
    console.error('Erreur recherche entreprise:', searchError);
    throw searchError;
  }

  if (existingCompany) {
    return existingCompany;
  }

  const { data: company, error: insertError } = await supabase
    .from('companies')
    .insert([{
      name: cleanName,
      address,
      city,
      notes
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Erreur création entreprise:', insertError);
    throw insertError;
  }

  return company;
}

async function findOrCreateCustomer({
  full_name = null,
  phone = null,
  email = null,
  company_name = null,
  company_address = null,
  category = 'client',
  source = 'commande',
  notes = null
}) {
  const company = await findOrCreateCompany({
    name: company_name,
    address: company_address
  });

  let query = supabase.from('customers').select('*');

  if (phone && phone.trim()) {
    query = query.eq('phone', phone.trim());
  } else if (email && email.trim()) {
    query = query.eq('email', email.trim());
  } else {
    query = null;
  }

  if (query) {
    const { data: existingCustomer, error: searchError } = await query.maybeSingle();

    if (searchError) {
      console.error('Erreur recherche client:', searchError);
      throw searchError;
    }

    if (existingCustomer) {
      return existingCustomer;
    }
  }

  const { data: customer, error: insertError } = await supabase
    .from('customers')
    .insert([{
      company_id: company ? company.id : null,
      full_name,
      phone,
      email,
      category,
      source,
      notes
    }])
    .select()
    .single();

  if (insertError) {
    console.error('Erreur création client:', insertError);
    throw insertError;
  }

  return customer;
}

async function addCustomerInteraction({
  customer_id,
  interaction_type,
  message
}) {
  if (!customer_id) return null;

  const { data, error } = await supabase
    .from('customer_interactions')
    .insert([{
      customer_id,
      interaction_type,
      message
    }])
    .select()
    .single();

  if (error) {
    console.error('Erreur interaction client:', error);
    throw error;
  }

  return data;
}

async function registerCustomerActivity({
  full_name,
  phone,
  email,
  company_name,
  company_address,
  category,
  source,
  interaction_type,
  message,
  notes
}) {
  const customer = await findOrCreateCustomer({
    full_name,
    phone,
    email,
    company_name,
    company_address,
    category,
    source,
    notes
  });

  await addCustomerInteraction({
    customer_id: customer.id,
    interaction_type,
    message
  });

  return customer;
}

module.exports = {
  findOrCreateCompany,
  findOrCreateCustomer,
  addCustomerInteraction,
  registerCustomerActivity
};