/**
 * Registry cua TANG DICH VU.
 * Giao dien chi duoc phep thay doi du lieu thong qua `runOperation`, dam bao moi thao tac
 * deu di qua kiem tra quyen + quy tac nghiep vu + ghi nhat ky hoat dong.
 */
import type { OpContext, OpResult } from './common';
import { changeOwnPassword, markNotificationsRead } from './admin';
import * as admin from './admin';
import * as equipment from './equipment';
import * as repair from './repair';
import * as borrow from './borrow';
import * as audit from './audit';

export const operations = {
  // Kho thiet bi
  createEquipmentStockIn: equipment.createEquipmentStockIn,
  updateEquipment: equipment.updateEquipment,
  retireEquipment: equipment.retireEquipment,
  // Sua chua
  reportDamage: repair.reportDamage,
  acceptRepair: repair.acceptRepair,
  completeRepair: repair.completeRepair,
  proposeLiquidation: repair.proposeLiquidation,
  // Muon / tra
  createBorrowRequest: borrow.createBorrowRequest,
  approveBorrowRequest: borrow.approveBorrowRequest,
  rejectBorrowRequest: borrow.rejectBorrowRequest,
  cancelBorrowRequest: borrow.cancelBorrowRequest,
  handoverEquipment: borrow.handoverEquipment,
  receiveReturnedEquipment: borrow.receiveReturnedEquipment,
  systemScanOverdue: borrow.systemScanOverdue,
  // Kiem ke
  createInventoryAudit: audit.createInventoryAudit,
  scanAuditItem: audit.scanAuditItem,
  markAuditItemMissing: audit.markAuditItemMissing,
  setAuditItemActual: audit.setAuditItemActual,
  completeInventoryAudit: audit.completeInventoryAudit,
  cancelInventoryAudit: audit.cancelInventoryAudit,
  // Quan tri
  createUser: admin.createUser,
  updateUser: admin.updateUser,
  setUserStatus: admin.setUserStatus,
  resetUserPassword: admin.resetUserPassword,
  updateRolePermissions: admin.updateRolePermissions,
  saveCategory: admin.saveCategory,
  broadcastNotification: admin.broadcastNotification,
  markNotificationsRead: admin.markNotificationsRead,
} as const;

export type OperationName = keyof typeof operations;

/** Thuc thi mot thao tac nghiep vu (tuong duong goi API len server). */
export function runOperation(
  name: OperationName,
  ctx: OpContext,
  payload: unknown,
): OpResult<unknown> {
  const fn = operations[name] as (
    context: OpContext,
    data: never,
  ) => OpResult<unknown>;
  return fn(ctx, payload as never);
}

/** Doi mat khau can them ham kiem tra mat khau -> tach rieng khoi registry. */
export { changeOwnPassword, markNotificationsRead };

// Re-export cac kieu du lieu payload de giao dien su dung
export type { StockInPayload, UpdateEquipmentPayload } from './equipment';
export type { DamageReportPayload } from './repair';
export type {
  CreateBorrowPayload,
  ReceiveReturnPayload,
  OverdueScanPayload,
} from './borrow';
export type { CreateAuditPayload, ScanAuditPayload } from './audit';
export type { CategoryPayload, CreateUserPayload, UpdateUserPayload } from './admin';
export type { OpContext, OpResult } from './common';
export { CONDITION_OPTIONS } from './equipment';
export { summarizeAudit } from './audit';
