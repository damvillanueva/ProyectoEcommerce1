export const TRACKING_ORIGIN = {
  label: "Bodega Central SmartLogix",
  shortLabel: "Bodega Central SmartLogix",
  query: "Duoc UC Puente Alto, Chile",
  lat: -33.6117,
  lng: -70.5758,
};

const STATUS_META = {
  PLANNED: {
    label: "Planificado",
    classes: "bg-sky-500/20 text-sky-200",
  },
  IN_TRANSIT: {
    label: "En ruta",
    classes: "bg-amber-500/20 text-amber-200",
  },
  DELIVERED: {
    label: "Entregado",
    classes: "bg-emerald-500/20 text-emerald-200",
  },
  CANCELLED: {
    label: "Cancelado",
    classes: "bg-rose-500/20 text-rose-200",
  },
};

const BASE_TIMELINE = [
  {
    key: "PLANNED",
    label: "Preparacion",
    description: "El despacho fue registrado y quedo listo para planificacion.",
  },
  {
    key: "IN_TRANSIT",
    label: "En ruta",
    description: "El envio se encuentra avanzando hacia el destino.",
  },
  {
    key: "DELIVERED",
    label: "Entrega final",
    description: "El pedido se entrego correctamente al destinatario.",
  },
];

export function getShipmentStatusMeta(status) {
  return (
    STATUS_META[status] || {
      label: status || "Sin estado",
      classes: "bg-white/10 text-slate-200",
    }
  );
}

export function formatShipmentDate(value) {
  if (!value) {
    return "Sin fecha estimada";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
  }).format(parsedDate);
}

export function isShipmentDelayed(shipment) {
  if (!shipment?.estimatedDeliveryDate) {
    return false;
  }

  if (shipment.status === "DELIVERED" || shipment.status === "CANCELLED") {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const estimatedDate = new Date(shipment.estimatedDeliveryDate);
  estimatedDate.setHours(0, 0, 0, 0);

  return estimatedDate < today;
}

export function getShipmentProgress(status) {
  if (status === "DELIVERED") {
    return 100;
  }

  if (status === "IN_TRANSIT") {
    return 68;
  }

  if (status === "CANCELLED") {
    return 18;
  }

  return 28;
}

export function buildShipmentTimeline(status) {
  const isCancelled = status === "CANCELLED";
  const steps = isCancelled
    ? [
        ...BASE_TIMELINE.slice(0, 2),
        {
          key: "CANCELLED",
          label: "Incidencia",
          description: "El envio fue cancelado y requiere revision manual.",
        },
      ]
    : BASE_TIMELINE;
  const currentStepIndex = steps.findIndex((step) => step.key === status);
  const safeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

  return steps.map((step, index) => ({
    ...step,
    state:
      index < safeIndex
        ? "complete"
        : index === safeIndex
          ? "current"
          : "upcoming",
  }));
}

export function buildRouteCoordinates(origin, destination) {
  if (!origin || !destination) {
    return [];
  }

  return [
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
  ];
}

export function getOpenStreetMapDirectionsUrl(origin, destination) {
  if (!destination) {
    return null;
  }

  if (!origin) {
    return getOpenStreetMapSearchUrl(destination.label);
  }

  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${origin.lat}%2C${origin.lng}%3B${destination.lat}%2C${destination.lng}`;
}

export function getOpenStreetMapSearchUrl(address) {
  const query = address?.trim();

  if (!query) {
    return "https://www.openstreetmap.org";
  }

  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}
