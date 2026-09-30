/**
 * TANG DICH VU (service layer) - tuong duong "server-side" cua ung dung.
 *
 * MOI thao tac thay doi du lieu deu phai di qua cac ham trong thu muc nay.
 * Tai day luon thuc hien:
 *   1. Kiem tra quyen cua vai tro (chong thao tac vuot quyen) + trang thai tai khoan.
 *   2. Kiem tra quy tac nghiep vu (trang thai thiet bi, nguoi chiu trach nhiem, ly do tu choi...).
 *   3. Ghi nhat ky hoat dong (audit log) voi gia tri truoc/sau - chi doc, khong the sua/xoa.
 *   4. Sinh thong bao trong he thong khi can thiet.
 */
import type {
  AppState,
  AuditLog,
  Equipment,
  EquipmentCondition,
  EquipmentStatus,
  Notification,
  NotificationLevel,
  Permission,
  User,
} from '@/types';
import { EQUIPMENT_STATUS, CONDITION_LABELS } from '@/lib/labels';
import { formatCode, formatEquipmentCode } from '@/lib/utils';
import { roleHasPermission } from '@/lib/permissions';

export interface OpContext {
  state: AppState;
  actor: User;
}

export type OpResult<T = unknown> =
  | { ok: true; state: AppState; message: string; data?: T }
  | { ok: false; error: string };

export const ok = <T>(state: AppState, message: string, data?: T): OpResult<T> => ({
  ok: true,
  state,
  message,
  data,
});

export const fail = (error: string): OpResult<never> => ({ ok: false, error });

/** Kiem tra quyen - tuong duong kiem tra o phia server, khong the bo qua tu giao dien. */
export function requirePermission(ctx: OpContext, permission: Permission): string | null {
  if (ctx.actor.status !== 'ACTIVE') {
    return 'Tài khoản của bạn đang bị khóa, không thể thực hiện thao tác.';
  }
  if (!roleHasPermission(ctx.state.roles, ctx.actor.roleId, permission)) {
    return `Bạn không có quyền thực hiện thao tác này (yêu cầu quyền: ${permission}).`;
  }
  return null;
}

/** Ban sao doc lap cua state (moi thao tac tra ve state MOI, khong sua truc tiep). */
export function draftFrom(state: AppState): AppState {
  return structuredClone(state);
}

/* ---------------------------------- Ghi nhat ky & thong bao ---------------------------------- */

export interface LogInput {
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  before?: string | null;
  after?: string | null;
  detail?: string;
  actorName?: string;
}

/** Ghi nhat ky hoat dong - nguon du lieu truy vet bat buoc. */
export function writeLog(draft: AppState, actor: User, input: LogInput): AuditLog {
  draft.counters.auditLog = (draft.counters.auditLog ?? 0) + 1;
  const log: AuditLog = {
    id: `log-${String(draft.counters.auditLog).padStart(5, '0')}`,
    at: new Date().toISOString(),
    actorId: actor.id,
    actorName: input.actorName ?? actor.fullName,
    action: input.action,
    entity: input.entity,
    entityId: input.entityId,
    entityLabel: input.entityLabel,
    before: input.before ?? null,
    after: input.after ?? null,
    detail: input.detail,
  };
  // Nhat ky moi nhat luon o dau danh sach de hien thi nhanh
  draft.auditLogs = [log, ...draft.auditLogs];
  return log;
}

export interface NotifyInput {
  userId: string | null;
  title: string;
  message: string;
  level: NotificationLevel;
  link?: string;
}

/** Gui thong bao trong he thong (userId = null nghia la thong bao chung). */
export function notify(draft: AppState, input: NotifyInput): Notification {
  draft.counters.notification = (draft.counters.notification ?? 0) + 1;
  const item: Notification = {
    id: `ng-${String(draft.counters.notification).padStart(5, '0')}`,
    userId: input.userId,
    title: input.title,
    message: input.message,
    level: input.level,
    at: new Date().toISOString(),
    read: false,
    link: input.link,
  };
  draft.notifications = [item, ...draft.notifications];
  return item;
}

/** Gui thong bao cho tat ca nguoi dung dang hoat dong thuoc mot vai tro. */
export function notifyRole(
  draft: AppState,
  roleId: User['roleId'],
  input: Omit<NotifyInput, 'userId'>,
): void {
  draft.users
    .filter((u) => u.roleId === roleId && u.status === 'ACTIVE')
    .forEach((u) => notify(draft, { ...input, userId: u.id }));
}

/* ---------------------------------- Sinh ma ---------------------------------- */

export function nextCode(draft: AppState, counterKey: string, prefix: string, pad = 4): string {
  const value = (draft.counters[counterKey] ?? 0) + 1;
  draft.counters[counterKey] = value;
  return formatCode(prefix, value, pad);
}

export function nextEquipmentCode(draft: AppState): string {
  const value = (draft.counters.equipment ?? 0) + 1;
  draft.counters.equipment = value;
  return formatEquipmentCode(value);
}

/* ---------------------------------- Tra cuu & kiem tra du lieu ---------------------------------- */

export const findEquipment = (state: AppState, id: string): Equipment | undefined =>
  state.equipment.find((e) => e.id === id);

export const findUser = (state: AppState, id: string): User | undefined =>
  state.users.find((u) => u.id === id);

export const userName = (state: AppState, id?: string | null): string =>
  id ? (findUser(state, id)?.fullName ?? 'Không xác định') : '—';

export const categoryName = (state: AppState, categoryId: string): string =>
  state.categories.find((c) => c.id === categoryId)?.name ?? 'Không xác định';

export const statusText = (status: EquipmentStatus): string => EQUIPMENT_STATUS[status].label;

export const conditionText = (condition: EquipmentCondition): string =>
  CONDITION_LABELS[condition].label;

/** Kiem tra truong bat buoc. */
export function required(value: unknown, fieldName: string): string | null {
  return value === undefined || value === null || String(value).trim() === ''
    ? `${fieldName} không được để trống.`
    : null;
}

/** Ghi giao dich - nguon du lieu de tinh ton kho (UC-16). */
export function writeTransaction(
  draft: AppState,
  data: {
    type: 'NHAP_KHO' | 'BAN_GIAO' | 'TRA' | 'THANH_LY' | 'DIEU_CHUYEN';
    equipmentId: string;
    requestId?: string | null;
    fromUserId?: string | null;
    toUserId?: string | null;
    performedById: string;
    condition: EquipmentCondition;
    note?: string;
  },
): void {
  draft.counters.transaction = (draft.counters.transaction ?? 0) + 1;
  draft.transactions = [
    {
      id: `tx-${String(draft.counters.transaction).padStart(5, '0')}`,
      code: formatCode('GD', draft.counters.transaction, 5),
      at: new Date().toISOString(),
      requestId: data.requestId ?? null,
      fromUserId: data.fromUserId ?? null,
      toUserId: data.toUserId ?? null,
      ...data,
    },
    ...draft.transactions,
  ];
}

/**
 * Canh bao ton kho thap (Min/Max) theo tung loai thiet bi.
 * Duoc goi sau moi thao tac lam thay doi ton kho (nhap kho / thanh ly).
 */
export function checkLowStock(draft: AppState, categoryId: string): void {
  const category = draft.categories.find((c) => c.id === categoryId);
  if (!category) return;
  const inCategory = draft.equipment.filter((e) => e.categoryId === categoryId);
  const usable = inCategory.filter((e) => e.status !== 'DA_THANH_LY' && e.status !== 'HONG_CHO_THANH_LY');
  const available = usable.filter((e) => e.status === 'SAN_SANG');
  if (available.length < category.minStock) {
    notify(draft, {
      userId: null,
      title: `Cảnh báo tồn kho thấp: ${category.name}`,
      message: `Danh mục "${category.name}" chỉ còn ${available.length} ${category.unit} khả dụng, thấp hơn định mức tối thiểu (Min = ${category.minStock}). Đề nghị lập kế hoạch nhập kho.`,
      level: 'WARNING',
      link: '/bao-cao',
    });
  }
  if (inCategory.filter((e) => e.status !== 'DA_THANH_LY').length > category.maxStock) {
    notify(draft, {
      userId: null,
      title: `Cảnh báo tồn kho cao: ${category.name}`,
      message: `Danh mục "${category.name}" đang có ${inCategory.length} ${category.unit}, vượt định mức tối đa (Max = ${category.maxStock}).`,
      level: 'WARNING',
      link: '/bao-cao',
    });
  }
}
