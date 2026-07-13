import { getShipments, createShipment, updateShipment, deleteShipment } from "../api/shipmentApi";

export async function loadShipmentService() {
    return await getShipments();
}

export async function saveShipment(shipmentData) {
    return await createShipment(shipmentData);
}

export async function editShipment(trackingCode, shipmentData) {
  return await updateShipment(trackingCode, shipmentData);
}

export async function removeShipment(trackingCode) {
    return await deleteShipment(trackingCode);
}