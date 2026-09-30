/**
 * Nhan tieng Viet + mau huy hieu (badge) cho tat ca trang thai trong he thong.
 * Quy uoc mau: xanh la = tot/hoan tat, cam = can chu y, do = loi/qua han, xam = trung tinh.
 */
import type {
  AuditStatus,
  BorrowStatus,
  BorrowType,
  DiscrepancyType,
  EquipmentCondition,
  EquipmentGroup,
  EquipmentStatus,
  NotificationLevel,
  RepairPriority,
  RepairStatus,
  RoleId,
  TransactionType,
} from '@/types';

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface Labeled {
  label: string;
  tone: Tone;
}

export const ROLE_LABELS: Record<RoleId, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Quản lý Phòng Sản xuất',
  TECHNICIAN: 'Kỹ thuật viên',
  STAFF: 'Nhân viên Phòng Sản xuất',
};

export const GROUP_LABELS: Record<EquipmentGroup, string> = {
  DIEN_DAN_DUNG: 'Thiết bị điện dân dụng',
  KY_THUAT: 'Thiết bị kỹ thuật',
};

export const EQUIPMENT_STATUS: Record<EquipmentStatus, Labeled> = {
  SAN_SANG: { label: 'Sẵn sàng', tone: 'success' },
  DANG_MUON: { label: 'Đang mượn', tone: 'info' },
  CHO_SUA_CHUA: { label: 'Chờ sửa chữa', tone: 'warning' },
  DANG_SUA: { label: 'Đang sửa', tone: 'warning' },
  HONG_CHO_THANH_LY: { label: 'Hỏng – chờ thanh lý', tone: 'danger' },
  DA_THANH_LY: { label: 'Đã thanh lý', tone: 'neutral' },
};

export const CONDITION_LABELS: Record<EquipmentCondition, Labeled> = {
  TOT: { label: 'Tốt', tone: 'success' },
  CAN_KIEM_TRA: { label: 'Cần kiểm tra', tone: 'warning' },
  HONG_NHE: { label: 'Hỏng nhẹ', tone: 'warning' },
  HONG_NANG: { label: 'Hỏng nặng', tone: 'danger' },
};

export const BORROW_STATUS: Record<BorrowStatus, Labeled> = {
  CHO_DUYET: { label: 'Chờ duyệt', tone: 'warning' },
  DA_DUYET: { label: 'Đã duyệt', tone: 'info' },
  TU_CHOI: { label: 'Từ chối', tone: 'danger' },
  DA_BAN_GIAO: { label: 'Đã bàn giao', tone: 'info' },
  DA_HOAN_TAT: { label: 'Đã hoàn tất', tone: 'success' },
  DA_HUY: { label: 'Đã hủy', tone: 'neutral' },
};

export const BORROW_TYPE_LABELS: Record<BorrowType, string> = {
  MUON: 'Yêu cầu mượn',
  TRA: 'Yêu cầu trả',
};

export const REPAIR_STATUS: Record<RepairStatus, Labeled> = {
  CHO_TIEP_NHAN: { label: 'Chờ tiếp nhận', tone: 'warning' },
  DANG_SUA: { label: 'Đang sửa', tone: 'info' },
  HOAN_THANH: { label: 'Hoàn thành', tone: 'success' },
  KHONG_SUA_DUOC: { label: 'Không sửa được', tone: 'danger' },
  DA_THANH_LY: { label: 'Đã thanh lý', tone: 'neutral' },
};

export const REPAIR_PRIORITY: Record<RepairPriority, Labeled> = {
  THAP: { label: 'Thấp', tone: 'neutral' },
  BINH_THUONG: { label: 'Bình thường', tone: 'info' },
  CAO: { label: 'Cao', tone: 'danger' },
};

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  NHAP_KHO: 'Nhập kho',
  BAN_GIAO: 'Bàn giao (mượn)',
  TRA: 'Nhận trả',
  THANH_LY: 'Thanh lý',
  DIEU_CHUYEN: 'Điều chuyển',
};

export const AUDIT_STATUS: Record<AuditStatus, Labeled> = {
  DANG_KIEM_KE: { label: 'Đang kiểm kê', tone: 'warning' },
  HOAN_THANH: { label: 'Hoàn thành', tone: 'success' },
  DA_HUY: { label: 'Đã hủy', tone: 'neutral' },
};

export const DISCREPANCY_LABELS: Record<DiscrepancyType, Labeled> = {
  THIEU: { label: 'Thiếu', tone: 'danger' },
  THUA: { label: 'Thừa', tone: 'warning' },
  SAI_TINH_TRANG: { label: 'Sai tình trạng', tone: 'warning' },
  SAI_NGUOI_GIU: { label: 'Sai người giữ', tone: 'warning' },
};

export const NOTIFICATION_LEVEL: Record<NotificationLevel, Labeled> = {
  INFO: { label: 'Thông tin', tone: 'info' },
  SUCCESS: { label: 'Thành công', tone: 'success' },
  WARNING: { label: 'Cảnh báo', tone: 'warning' },
  DANGER: { label: 'Nghiêm trọng', tone: 'danger' },
};

/** Lop Tailwind tuong ung voi tung tone - dung thong nhat tren toan he thong. */
export const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  danger: 'bg-red-50 text-red-700 ring-red-200',
  info: 'bg-navy-50 text-navy-700 ring-navy-200',
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
};
