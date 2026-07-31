import {
  cancelMyPostSale,
  createMyPostSale,
  getMyPostSales,
  getPostSales,
  receivePostSale,
  resolvePostSale,
  reviewPostSale,
} from "../api/postSaleApi";

export const loadMyPostSales = getMyPostSales;
export const saveMyPostSale = createMyPostSale;
export const cancelCustomerPostSale = cancelMyPostSale;
export const loadPostSales = getPostSales;
export const reviewManagedPostSale = reviewPostSale;
export const receiveManagedPostSale = receivePostSale;
export const resolveManagedPostSale = resolvePostSale;
