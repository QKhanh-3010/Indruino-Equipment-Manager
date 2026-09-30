/**
 * Cac ham TONG HOP DU LIEU (selector) phuc vu giao dien: thong ke, canh bao ton kho,
 * lich su vong doi thiet bi, danh sach viec can xu ly...
 * Cac ham nay chi DOC du lieu, khong thay doi trang thai he thong.
 */
import type {
  AppState,
  BorrowRequest,
  Category,
  Equipment,
  EquipmentStatus,
  Notification,
  RepairTicket,
  User,
} from '@/types';
import { formatDateTime, isOverdue, overdueDays } from '@/lib/utils';
import { EQUIPMENT_STATUS, REPAIR_STATUS, BORROW_TYPE_LABELS } from '@/lib/labels';

/* ---------------------------------- Tra cuu co ban ---------------------------------- */

export const getUser = (state: AppState, id?: string | null): User | undefined =>
  id ? state.users.find((u) => u.id === id) : undefined;

export const getUserName = (state: AppState, id?: string | null): string =>
  getUser(state, id)?.fullName ?? '—';

export const getCategory = (state: AppState, id: string): Category | undefined =>
  state.categories.find((c) => c.id === id);

export const getCategoryName = (state: AppState, id: string): string =>
  getCategory(state, id)?.name ?? '—';

export const getEquipment = (state: AppState, id: string): Equipment | undefined =>
  state.equipment.find((e) => e.id === id);

export const getEquipmentName = (state: AppState, id: string): string =>
  getEquipment(state, id)?.name ?? '—';

export const getEquipmentByCode = (state: AppState, code: string): Equipment | undefined =>
  state.equipment.find((e) => e.code.toUpperCase() === code.trim().toUpperCase());

export const getRequest = (state: AppState, id: string): BorrowRequest | undefined =>
  state.borrowRequests.find((r) => r.id === id);

export const getTicket = (state: AppState, id: string): RepairTicket | undefined =>
  state.repairTickets.find((t) => t.id === id);

/** Thiet bi con duoc quan ly (chua thanh ly) */
export const activeEquipment = (state: AppState): Equipment[] =>
  state.equipment.filter((e) => e.status !== 'DA_THANH_LY');

/** Thiet bi dang co nguoi chiu trach nhiem */
export const borrowedEquipment = (state: AppState): Equipment[] =>
  state.equipment.filter((e) => e.status === 'DANG_MUON' && e.holderId);

/** Danh sach thiet bi dang do mot nguoi dung giu (trang "Thiet bi cua toi"). */
export function equipmentHeldBy(state: AppState, userId: string): Equipment[] {
  return state.equipment.filter((e) => e.holderId === userId && e.status !== 'DA_THANH_LY');
}

export const equipmentStatusLabel = (status: EquipmentStatus): string =>
  EQUIPMENT_STATUS[status].label;

export const shortTime = (value?: string | null): string => formatDateTime(value);

/* ---------------------------------- Canh bao qua han ---------------------------------- */

export interface OverdueInfo {
  request: BorrowRequest;
  equipment: Equipment[];
  days: number;
  holder: string;
}

/** Danh sach phieu muon qua han tra (canh bao do tren giao dien). */
export function overdueBorrows(state: AppState): OverdueInfo[] {
  return state.borrowRequests
    .filter((r) => r.status === 'DA_BAN_GIAO' && isOverdue(r.expectedReturnAt))
    .map((r) => ({
      request: r,
      equipment: r.equipmentIds
        .map((id) => getEquipment(state, id))
        .filter((e): e is Equipment => Boolean(e)),
      days: overdueDays(r.expectedReturnAt),
      holder: getUserName(state, r.requesterId),
    }))
    .sort((a, b) => b.days - a.days);
}

/* ---------------------------------- Ton kho theo danh muc & nhom ---------------------------------- */

export interface CategoryStock {
  category: Category;
  total: number;
  available: number;
  borrowed: number;
  broken: number;
  retired: number;
  /** low = duoi dinh muc Min, high = vuot dinh muc Max */
  alert: 'low' | 'high' | 'ok';
}

/** Ton kho theo tung loai thiet bi + canh bao dinh muc Min/Max. */
export function stockByCategory(state: AppState): CategoryStock[] {
  return state.categories.map((category) => {
    const items = state.equipment.filter((e) => e.categoryId === category.id);
    const retired = items.filter((e) => e.status === 'DA_THANH_LY').length;
    const inSystem = items.length - retired;
    const available = items.filter((e) => e.status === 'SAN_SANG').length;
    const borrowed = items.filter((e) => e.status === 'DANG_MUON').length;
    const broken = items.filter((e) =>
      ['CHO_SUA_CHUA', 'DANG_SUA', 'HONG_CHO_THANH_LY'].includes(e.status),
    ).length;
    const alert: CategoryStock['alert'] =
      available < category.minStock ? 'low' : inSystem > category.maxStock ? 'high' : 'ok';
    return { category, total: inSystem, available, borrowed, broken, retired, alert };
  });
}

export interface GroupSummary {
  key: 'DIEN_DAN_DUNG' | 'KY_THUAT';
  label: string;
  available: number;
  borrowed: number;
  broken: number;
  total: number;
}

/** Tong hop ton kho theo nhom thiet bi (bieu do Dashboard). */
export function stockByGroup(state: AppState): GroupSummary[] {
  const groups: GroupSummary[] = [
    {
      key: 'DIEN_DAN_DUNG',
      label: 'Thiết bị điện dân dụng',
      available: 0,
      borrowed: 0,
      broken: 0,
      total: 0,
    },
    { key: 'KY_THUAT', label: 'Thiết bị kỹ thuật', available: 0, borrowed: 0, broken: 0, total: 0 },
  ];
  state.equipment
    .filter((e) => e.status !== 'DA_THANH_LY')
    .forEach((e) => {
      const category = getCategory(state, e.categoryId);
      const group = groups.find((g) => g.key === category?.group);
      if (!group) return;
      group.total += 1;
      if (e.status === 'SAN_SANG') group.available += 1;
      else if (e.status === 'DANG_MUON') group.borrowed += 1;
      else group.broken += 1;
    });
  return groups;
}

/* ---------------------------------- Thong ke tong quan ---------------------------------- */

export interface DashboardStats {
  total: number;
  available: number;
  borrowed: number;
  waitingRepair: number;
  repairing: number;
  pendingLiquidation: number;
  retired: number;
  pendingApprovals: number;
  approvedNotHandedOver: number;
  newRepairRequests: number;
  overdue: number;
  lowStockCategories: number;
  returnRequests: number;
}

/** Cac chi so dung cho the so lieu tren Dashboard theo vai tro. */
export function dashboardStats(state: AppState): DashboardStats {
  const count = (statuses: EquipmentStatus[]): number =>
    state.equipment.filter((e) => statuses.includes(e.status)).length;

  return {
    total: state.equipment.filter((e) => e.status !== 'DA_THANH_LY').length,
    available: count(['SAN_SANG']),
    borrowed: count(['DANG_MUON']),
    waitingRepair: count(['CHO_SUA_CHUA']),
    repairing: count(['DANG_SUA']),
    pendingLiquidation: count(['HONG_CHO_THANH_LY']),
    retired: count(['DA_THANH_LY']),
    pendingApprovals: state.borrowRequests.filter((r) => r.status === 'CHO_DUYET').length,
    approvedNotHandedOver: state.borrowRequests.filter((r) => r.status === 'DA_DUYET').length,
    newRepairRequests: state.repairTickets.filter((t) => t.status === 'CHO_TIEP_NHAN').length,
    overdue: overdueBorrows(state).length,
    lowStockCategories: stockByCategory(state).filter((c) => c.alert !== 'ok').length,
    returnRequests: state.borrowRequests.filter((r) => r.type === 'TRA' && r.status === 'CHO_DUYET')
      .length,
  };
}

/* ---------------------------------- Vong doi thiet bi (truy vet) ---------------------------------- */

export interface TimelineEntry {
  at: string;
  kind: 'NHAP_KHO' | 'BAN_GIAO' | 'TRA' | 'THANH_LY' | 'SUA_CHUA' | 'KIEM_KE' | 'CAP_NHAT';
  title: string;
  description: string;
  actorName: string;
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}

const conditionLabel = (c: string): string =>
  c === 'TOT' ? 'Tốt' : c === 'HONG_NHE' ? 'Hỏng nhẹ' : c === 'HONG_NANG' ? 'Hỏng nặng' : 'Cần kiểm tra';

/**
 * Lich su thiet bi: toan bo vong doi nhap kho -> muon/tra -> sua chua -> thanh ly,
 * kem ten nguoi chiu trach nhiem o tung giai doan (yeu cau truy vet bat buoc).
 */
export function equipmentTimeline(state: AppState, equipmentId: string): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const equipment = getEquipment(state, equipmentId);

  // 1. Giao dich kho: nhap kho / ban giao / nhan tra / thanh ly
  state.transactions
    .filter((t) => t.equipmentId === equipmentId)
    .forEach((t) => {
      if (t.type === 'NHAP_KHO') {
        entries.push({
          at: t.at,
          kind: 'NHAP_KHO',
          title: 'Nhập kho thiết bị',
          description: `${t.note ?? ''} Người thực hiện: ${getUserName(state, t.performedById)}.`,
          actorName: getUserName(state, t.performedById),
          tone: 'success',
        });
      } else if (t.type === 'BAN_GIAO') {
        entries.push({
          at: t.at,
          kind: 'BAN_GIAO',
          title: `Bàn giao cho ${getUserName(state, t.toUserId)}`,
          description: `Người giao: ${getUserName(state, t.performedById)}${
            t.requestId ? ` — theo yêu cầu ${getRequest(state, t.requestId)?.code ?? ''}` : ''
          }.`,
          actorName: getUserName(state, t.performedById),
          tone: 'info',
        });
      } else if (t.type === 'TRA') {
        entries.push({
          at: t.at,
          kind: 'TRA',
          title: `Nhận trả từ ${getUserName(state, t.fromUserId)}`,
          description: `Người nhận: ${getUserName(state, t.performedById)}. Tình trạng: ${conditionLabel(t.condition)}.`,
          actorName: getUserName(state, t.performedById),
          tone: t.condition === 'TOT' ? 'success' : 'warning',
        });
      } else if (t.type === 'THANH_LY') {
        entries.push({
          at: t.at,
          kind: 'THANH_LY',
          title: 'Thanh lý thiết bị',
          description: t.note ?? '',
          actorName: getUserName(state, t.performedById),
          tone: 'danger',
        });
      }
    });

  // 2. Phieu sua chua
  state.repairTickets
    .filter((t) => t.equipmentId === equipmentId)
    .forEach((t) => {
      entries.push({
        at: t.acceptedAt ?? t.reportedAt,
        kind: 'SUA_CHUA',
        title: `Phiếu sửa chữa ${t.code} — ${REPAIR_STATUS[t.status].label}`,
        description: `${t.issue}${t.solution ? ` | Kết quả: ${t.solution}` : ''} Người báo: ${getUserName(
          state,
          t.reportedById,
        )}${t.technicianId ? `, Kỹ thuật viên: ${getUserName(state, t.technicianId)}` : ''}.`,
        actorName: getUserName(state, t.technicianId ?? t.reportedById),
        tone:
          t.status === 'HOAN_THANH'
            ? 'success'
            : t.status === 'KHONG_SUA_DUOC'
              ? 'danger'
              : 'warning',
      });
    });

  // 3. Ket qua kiem ke lien quan
  state.audits.forEach((audit) => {
    const item = audit.items.find((i) => i.equipmentId === equipmentId);
    if (!item || !item.scanned) return;
    entries.push({
      at: audit.completedAt ?? audit.createdAt,
      kind: 'KIEM_KE',
      title: `Kiểm kê ${audit.code} — ${item.discrepancy ? 'có chênh lệch' : 'khớp dữ liệu'}`,
      description: `${audit.name}. Người giữ theo hệ thống: ${getUserName(
        state,
        item.expectedHolderId,
      )}${item.note ? ` | Ghi chú: ${item.note}` : ''}.`,
      actorName: getUserName(state, audit.createdById),
      tone: item.discrepancy ? 'warning' : 'neutral',
    });
  });

  // 4. Nhat ky cap nhat thiet bi
  state.auditLogs
    .filter((l) => l.entityId === equipmentId)
    .forEach((l) => {
      entries.push({
        at: l.at,
        kind: 'CAP_NHAT',
        title: l.action,
        description: `${l.detail ?? ''}${
          l.before || l.after ? ` (${l.before ?? '—'} → ${l.after ?? '—'})` : ''
        }`,
        actorName: l.actorName,
        tone: 'neutral',
      });
    });

  if (equipment?.retiredAt) {
    entries.push({
      at: equipment.retiredAt,
      kind: 'THANH_LY',
      title: 'Thiết bị đã thanh lý',
      description: equipment.retiredReason ?? '',
      actorName: 'Quản lý Phòng Sản xuất',
      tone: 'danger',
    });
  }

  return entries.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

/* ---------------------------------- Thong bao & viec can xu ly ---------------------------------- */

export function notificationsFor(state: AppState, userId: string): Notification[] {
  return state.notifications
    .filter((n) => n.userId === userId || n.userId === null)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export const unreadCount = (state: AppState, userId: string): number =>
  notificationsFor(state, userId).filter((n) => !n.read).length;

export interface PendingTask {
  title: string;
  description: string;
  tone: 'warning' | 'danger' | 'info' | 'success';
  link: string;
  at?: string;
}

/** Danh sach viec can xu ly theo vai tro (hien thi tren Dashboard). */
export function pendingTasks(state: AppState, user: User): PendingTask[] {
  const tasks: PendingTask[] = [];
  const role = state.roles.find((r) => r.id === user.roleId);
  const can = (p: string): boolean => Boolean(role?.permissions.includes(p as never));

  if (can('borrow.approve')) {
    state.borrowRequests
      .filter((r) => r.status === 'CHO_DUYET')
      .forEach((r) => {
        tasks.push({
          title: `${BORROW_TYPE_LABELS[r.type]} ${r.code} chờ duyệt`,
          description: `${getUserName(state, r.requesterId)} — ${r.reason}`,
          tone: 'warning',
          link: '/yeu-cau-muon-tra',
          at: r.createdAt,
        });
      });
    state.equipment
      .filter((e) => e.status === 'HONG_CHO_THANH_LY')
      .forEach((e) => {
        tasks.push({
          title: `Đề xuất thanh lý thiết bị ${e.code}`,
          description: `${e.name} — Kỹ thuật viên đề xuất thanh lý, cần Quản lý quyết định.`,
          tone: 'danger',
          link: `/thiet-bi/${e.id}`,
        });
      });
  }

  if (can('borrow.handover')) {
    state.borrowRequests
      .filter((r) => r.status === 'DA_DUYET')
      .forEach((r) => {
        tasks.push({
          title: `Bàn giao / nhận trả theo ${r.code}`,
          description: `${BORROW_TYPE_LABELS[r.type]} — quét mã QR để xác nhận.`,
          tone: 'info',
          link: '/ban-giao-qr',
          at: r.approvedAt ?? r.createdAt,
        });
      });
  }

  if (can('repair.handle')) {
    state.repairTickets
      .filter((t) => t.status === 'CHO_TIEP_NHAN')
      .forEach((t) => {
        tasks.push({
          title: `Phiếu sửa chữa ${t.code} chờ tiếp nhận`,
          description: `${getEquipmentName(state, t.equipmentId)} — ${t.issue}`,
          tone: 'warning',
          link: '/sua-chua',
          at: t.reportedAt,
        });
      });
  }

  if (can('audit.perform') || can('audit.create')) {
    state.audits
      .filter((a) => a.status === 'DANG_KIEM_KE')
      .forEach((a) => {
        const scanned = a.items.filter((i) => i.scanned).length;
        tasks.push({
          title: `Đợt kiểm kê ${a.code} đang thực hiện`,
          description: `Đã đối chiếu ${scanned}/${a.items.length} thiết bị.`,
          tone: 'info',
          link: `/kiem-ke/${a.id}`,
          at: a.createdAt,
        });
      });
  }

  if (can('borrow.create')) {
    state.borrowRequests
      .filter(
        (r) =>
          r.requesterId === user.id && ['DA_DUYET', 'CHO_DUYET'].includes(r.status) && r.type === 'MUON',
      )
      .forEach((r) => {
        tasks.push({
          title: `Yêu cầu ${r.code} ${
            r.status === 'DA_DUYET' ? 'đã duyệt — chờ nhận thiết bị' : 'đang chờ duyệt'
          }`,
          description: 'Quét mã QR khi nhận/trả thiết bị để xác nhận.',
          tone: r.status === 'DA_DUYET' ? 'info' : 'warning',
          link: '/yeu-cau-muon-tra',
          at: r.createdAt,
        });
      });
    overdueBorrows(state)
      .filter((o) => o.request.requesterId === user.id)
      .forEach((o) => {
        tasks.push({
          title: `Thiết bị ${o.equipment.map((e) => e.code).join(', ')} quá hạn ${o.days} ngày`,
          description: `Yêu cầu ${o.request.code} — vui lòng trả thiết bị ngay.`,
          tone: 'danger',
          link: '/thiet-bi-cua-toi',
          at: o.request.expectedReturnAt,
        });
      });
  }

  return tasks;
}
