import {
  createCustomerAddressRequest,
  deleteCustomerAddressRequest,
  getCustomerFavoritesRequest,
  getCustomerProfileRequest,
  addCustomerFavoriteRequest,
  removeCustomerFavoriteRequest,
  updateCustomerAddressRequest,
  updateCustomerProfileRequest,
} from "../api/authApi";

export function loadCustomerProfile() {
  return getCustomerProfileRequest();
}

export function saveCustomerProfile(profile) {
  return updateCustomerProfileRequest(profile);
}

export function createCustomerAddress(address) {
  return createCustomerAddressRequest(address);
}

export function updateCustomerAddress(addressId, address) {
  return updateCustomerAddressRequest(addressId, address);
}

export function deleteCustomerAddress(addressId) {
  return deleteCustomerAddressRequest(addressId);
}

export function loadCustomerFavorites() {
  return getCustomerFavoritesRequest();
}

export function addCustomerFavorite(sku) {
  return addCustomerFavoriteRequest(sku);
}

export function removeCustomerFavorite(sku) {
  return removeCustomerFavoriteRequest(sku);
}
