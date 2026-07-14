import {
  createCustomerAddressRequest,
  deleteCustomerAddressRequest,
  getCustomerProfileRequest,
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
