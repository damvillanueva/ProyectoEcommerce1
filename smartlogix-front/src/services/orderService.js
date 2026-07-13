import { getOrders, createOrder, updateOrder, deleteOrder } from "../api/orderApi";

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