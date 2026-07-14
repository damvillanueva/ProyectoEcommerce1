import {getDiscounts, createDiscount, updateDiscount, deleteDiscount,} from "../api/discountApi";

export async function loadDiscountsService() {
  return await getDiscounts();
}

export async function saveDiscount(discountData) {
  return await createDiscount(discountData);
}

export async function editDiscount(id, discountData) {
  return await updateDiscount(id, discountData);
}

export async function removeDiscount(id) {
  return await deleteDiscount(id);
}