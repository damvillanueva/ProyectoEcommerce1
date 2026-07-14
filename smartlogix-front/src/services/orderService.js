import {
  getOrders,
  createOrder,
  updateOrder,
  deleteOrder,
  getMyOrders,
  getMyOrder,
} from "../api/orderApi";

export async function loadOrderService() {
    return await getOrders();
}

export async function saveOrder(orderData) {
    return await createOrder(orderData);
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
