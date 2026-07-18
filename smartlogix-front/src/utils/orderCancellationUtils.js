const CANCELLABLE_ORDER_STATUSES = new Set([
  "APPROVED",
  "FAILED",
  "SHIPMENT_REQUESTED",
]);

export function canCancelOrder(order, tracking) {
  if (!order || !CANCELLABLE_ORDER_STATUSES.has(order.status)) return false;
  if (!order.trackingCode) return true;
  return tracking?.shipmentStatus === "PLANNED";
}

export function cancellationBlockedReason(order, tracking) {
  if (!order || order.status === "CANCELLED") return "Este pedido ya fue cancelado.";
  if (["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(tracking?.shipmentStatus)) {
    return "El pedido ya fue entregado al transportista.";
  }
  return "Este pedido ya no admite cancelacion.";
}
