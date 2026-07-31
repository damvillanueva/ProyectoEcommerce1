import {
  closeCashRegister,
  createPosSale,
  getCashRegisterHistory,
  getCurrentCashRegister,
  getPosSales,
  openCashRegister,
} from "../api/posApi";

export const loadCurrentCashRegister = () => getCurrentCashRegister();
export const loadCashRegisterHistory = () => getCashRegisterHistory();
export const startCashRegister = (data) => openCashRegister(data);
export const finishCashRegister = (sessionNumber, data) =>
  closeCashRegister(sessionNumber, data);
export const loadPosSales = (sessionNumber) => getPosSales(sessionNumber);
export const savePosSale = (data) => createPosSale(data);
