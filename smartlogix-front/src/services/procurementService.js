import {
  approvePurchaseOrderRequest,
  cancelPurchaseOrderRequest,
  createPurchaseOrderRequest,
  createSupplierRequest,
  deactivateSupplierRequest,
  getPurchaseOrdersRequest,
  getReplenishmentProposalsRequest,
  getSuppliersRequest,
  receivePurchaseOrderRequest,
  removeSupplierProductRequest,
  saveSupplierProductRequest,
  updateSupplierRequest,
} from "../api/procurementApi";

export const fetchSuppliers = () => getSuppliersRequest();
export const saveSupplier = (payload) => createSupplierRequest(payload);
export const editSupplier = (id, payload) => updateSupplierRequest(id, payload);
export const deactivateSupplier = (id) => deactivateSupplierRequest(id);
export const saveSupplierProduct = (supplierId, payload) =>
  saveSupplierProductRequest(supplierId, payload);
export const removeSupplierProduct = (supplierId, sku) =>
  removeSupplierProductRequest(supplierId, sku);

export const fetchPurchaseOrders = () => getPurchaseOrdersRequest();
export const savePurchaseOrder = (payload) => createPurchaseOrderRequest(payload);
export const approvePurchaseOrder = (id) => approvePurchaseOrderRequest(id);
export const receivePurchaseOrder = (id, payload) =>
  receivePurchaseOrderRequest(id, payload);
export const cancelPurchaseOrder = (id) => cancelPurchaseOrderRequest(id);
export const fetchReplenishmentProposals = () => getReplenishmentProposalsRequest();
