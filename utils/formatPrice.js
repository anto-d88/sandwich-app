function formatPrice(price) {
  return Number(price).toFixed(2).replace('.', ',') + ' €';
}

module.exports = formatPrice;