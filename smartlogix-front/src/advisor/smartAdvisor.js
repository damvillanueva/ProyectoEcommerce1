export function generateSmartRecommendations({ inventory = [], orders = [], shipments = [] }) {
  const recommendations = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  inventory.forEach((item) => {
    const available =
      Number(item.availableQuantity || 0) - Number(item.reservedQuantity || 0);
    const reorderLevel = Number(item.reorderLevel || 0);

    if (available <= reorderLevel) {
      recommendations.push({
        priority: "Alta",
        type: "Inventario",
        title: `Reponer ${item.sku}`,
        message: `${item.productName} está bajo el nivel de reposición.`,
        action: `Disponible: ${available} / mínimo sugerido: ${reorderLevel}`,
      });
    }
  });

  orders.forEach((order) => {
    if (order.status === "FAILED" || order.status === "REJECTED") {
      recommendations.push({
        priority: "Alta",
        type: "Pedidos",
        title: `Revisar ${order.orderNumber}`,
        message: `El pedido está en estado ${order.status}.`,
        action: order.reason || "Validar stock, inventario o servicio de envíos.",
      });
    }

    if (!order.trackingCode && order.status !== "FAILED" && order.status !== "REJECTED") {
      recommendations.push({
        priority: "Media",
        type: "Pedidos",
        title: "Pedido sin tracking",
        message: `${order.orderNumber} aún no tiene seguimiento.`,
        action: "Coordinar despacho o generación de tracking.",
      });
    }
  });

  shipments.forEach((shipment) => {
    const deliveryDate = shipment.estimatedDeliveryDate
      ? new Date(shipment.estimatedDeliveryDate)
      : null;

    const isDelayed =
      deliveryDate &&
      deliveryDate < today &&
      shipment.status !== "DELIVERED" &&
      shipment.status !== "CANCELLED";

    if (isDelayed) {
      recommendations.push({
        priority: "Alta",
        type: "Envíos",
        title: "Envío atrasado",
        message: `${shipment.trackingCode} superó su fecha estimada de entrega.`,
        action: `Entrega estimada: ${shipment.estimatedDeliveryDate}. Revisar transporte.`,
      });
    } else if (shipment.status === "PLANNED") {
      recommendations.push({
        priority: "Media",
        type: "Envíos",
        title: "Despacho pendiente",
        message: `${shipment.trackingCode} está planificado.`,
        action: "Actualizar estado cuando salga a ruta.",
      });
    }
  });

  if (recommendations.length === 0) {
    recommendations.push({
      priority: "Baja",
      type: "Sistema",
      title: "Operación estable",
      message: "No se detectaron riesgos críticos.",
      action: "Mantener seguimiento operativo normal.",
    });
  }

  return recommendations.slice(0, 4);
}