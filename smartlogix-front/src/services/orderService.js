import {
  cancelMyOrder,
  cancelOrder,
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getMyOrders,
  getMyOrder,
  getMyOrderTracking,
  quoteShipping,
  validateDiscount,
} from "../api/orderApi";

export async function loadOrderService() {
    return await getOrders();
}

export async function saveOrder(orderData) {
    return await createOrder(orderData);
}

export function loadShippingQuote(quoteData) {
  return quoteShipping(quoteData);
}

export function validateOrderDiscount(code, subtotal) {
  return validateDiscount(code, subtotal);
}

export async function editOrder(orderNumber, orderData) {
  return await updateOrder(orderNumber, orderData);
}

export async function removeOrder(orderNumber) {
    return await deleteOrder(orderNumber);
}

export function loadMyOrders() {
  return getMyOrders();
}

export function loadMyOrder(orderNumber) {
  return getMyOrder(orderNumber);
}

export function loadMyOrderTracking(orderNumber) {
  return getMyOrderTracking(orderNumber);
}

export function cancelCustomerOrder(orderNumber, reason) {
  return cancelMyOrder(orderNumber, reason);
}

export function cancelManagedOrder(orderNumber, reason) {
  return cancelOrder(orderNumber, reason);
}
