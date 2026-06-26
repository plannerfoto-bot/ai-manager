const isAlinePromoActiveOnStore = true;

function countAlineItemsInCart() {
  return 0; // Copa do Mundo
}

function parseCartValue(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') {
    return val > 100000 ? val / 100 : val;
  }
  if (typeof val === 'string') {
    var match = val.match(/[\d.,]+/);
    if (match) {
      var clean = match[0];
      if (clean.indexOf('.') !== -1 && clean.indexOf(',') !== -1) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.indexOf(',') !== -1) {
        clean = clean.replace(',', '.');
      }
      var parsed = parseFloat(clean);
      return isNaN(parsed) ? 0 : (parsed > 100000 ? parsed / 100 : parsed);
    }
  }
  return 0;
}

function shouldHideFrete(cart) {
  var window = { LS: { cart: cart } };
  
  if (window.LS && window.LS.cart) {
    var promoDiscount = 0;
    if (window.LS.cart.promotional_discount) {
      if (typeof window.LS.cart.promotional_discount === 'object') {
        promoDiscount = parseCartValue(window.LS.cart.promotional_discount.total_discount_amount);
      } else {
        promoDiscount = parseCartValue(window.LS.cart.promotional_discount);
      }
    }
    
    var couponDiscount = 0;
    if (window.LS.cart.coupon_discount) {
      if (typeof window.LS.cart.coupon_discount === 'object') {
        couponDiscount = parseCartValue(window.LS.cart.coupon_discount.total_discount_amount);
      } else {
        couponDiscount = parseCartValue(window.LS.cart.coupon_discount);
      }
    }

    var sub = parseCartValue(window.LS.cart.subtotal);
    var tot = parseCartValue(window.LS.cart.total);
    
    console.log(`Debug: sub=${sub}, tot=${tot}, promoDiscount=${promoDiscount}, couponDiscount=${couponDiscount}`);
    
    if (promoDiscount > 0 || couponDiscount > 0 || tot < sub - 1) {
      var alineQty = countAlineItemsInCart();
      if (isAlinePromoActiveOnStore && alineQty > 0) {
        return false;
      }
      return true;
    }
  }
  return false;
}

// Caso 1: Copa do Mundo (sem desconto, total com frete no DOM, mas no JS?)
console.log("Caso 1 (total = subtotal):", shouldHideFrete({
  subtotal: "R$ 94,00",
  total: "R$ 94,00",
  promotional_discount: { total_discount_amount: "0.00" },
  coupon_discount: []
}));

console.log("Caso 2 (total com frete no JS):", shouldHideFrete({
  subtotal: "R$ 94,00",
  total: "R$ 112,79",
  promotional_discount: { total_discount_amount: "0.00" },
  coupon_discount: []
}));

console.log("Caso 3 (total indefinido ou null):", shouldHideFrete({
  subtotal: "R$ 94,00",
  total: null,
  promotional_discount: { total_discount_amount: "0.00" },
  coupon_discount: []
}));
