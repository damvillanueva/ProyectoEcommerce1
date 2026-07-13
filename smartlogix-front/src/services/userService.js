import { getUsers, createUser, updateUser } from "../api/userApi";

export async function loadUsersService() {
  return await getUsers();
}

export async function saveUser(userData) {
  return await createUser(userData);
}

export async function editUser(id, userData) {
  return await updateUser(id, userData);
}