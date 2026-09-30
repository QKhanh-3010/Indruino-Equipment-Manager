/**
 * Mo hinh du lieu (domain model) cua he thong Indruino Equipment Manager.
 * Chi quan ly thiet bi cua MOT phong ban: Phong San xuat.
 */

/* ============================== VAI TRO & PHAN QUYEN ============================== */

export type RoleId = 'ADMIN' | 'MANAGER' | 'TECHNICIAN' | 'STAFF';

/** Danh sach quyen (permission) duoc kiem tra o tang "server" (src/services/*). */
export type Permission =
  | 'user.view'
  | 'user.manage'
  | 'role.manage'
  | 'category.manage'
  | 'equipment.view'
  | 'equipment.create'
  | 'equipment.update'
  | 'equipment.retire'
  | 'borrow.create'
  | 'borrow.viewAll'
  | 'borrow.approve'
  | 'borrow.handover'
  | 'repair.report'
  | 'repair.handle'
  | 'repair.proposeLiquidation'
  | 'audit.create'
  | 'audit.perform'
  | 'report.view'
  | 'report.export'
  | 'auditlog.view'
  | 'notification.broadcast';

export interface Role {
  id: RoleId;
  name: string;
  description: string;
  permissions: Permission[];
}

export type UserStatus = 'ACTIVE' | 'LOCKED';

export interface User {
  id: string;
  username: string;
  /** Mat khau duoc bam SHA-256 kem salt - khong luu plaintext. */
  passwordHash: string;
  salt: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: RoleId;
  department: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
}

/* ============================== DANH MUC & THIET BI ============================== */

/** Hai nhom thiet bi theo yeu cau nghiep vu. */
export type EquipmentGroup = 'DIEN_DAN_DUNG' | 'KY_THUAT';

export interface Category {
  id: string;
  code: string;
  name: string;
  group: EquipmentGroup;
  unit: string;
  /** Canh bao ton kho thap khi so luong kha dung < minStock. */
  minStock: number;
  /** Canh bao ton kho cao khi so luong trong he thong > maxStock. */
  maxStock: number;
  description?: string;
}

/** Trang thai vong doi cua thiet bi (UC-08..UC-11). */
export type EquipmentStatus =
  | 'SAN_SANG'
  | 'DANG_MUON'
  | 'CHO_SUA_CHUA'
  | 'DANG_SUA'
  | 'HONG_CHO_THANH_LY'
  | 'DA_THANH_LY';

/** Tinh trang vat ly cua thiet bi. */
export type EquipmentCondition = 'TOT' | 'CAN_KIEM_TRA' | 'HONG_NHE' | 'HONG_NANG';

export interface Equipment {
  id: string;
  /** Ma dinh danh duy nhat, cung la noi dung ma QR (VD: INDR-EQ-0001). */
  code: string;
  name: string;
  categoryId: string;
  serial?: string;
  supplier?: string;
  /** Ngay nhap kho (UC-04). */
  receivedAt: string;
  price?: number;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  /** Tai mot thoi diem chi co MOT nguoi chiu trach nhiem (quy tac nghiep vu). */
  holderId: string | null;
  location?: string;
  note?: string;
  createdAt: string;
  /** Ngay thanh ly - du lieu khong bi xoa cung, chi chuyen trang thai. */
  retiredAt?: string | null;
  retiredReason?: string | null;
}

/* ============================== MUON / TRA ============================== */

export type BorrowType = 'MUON' | 'TRA';

export type BorrowStatus =
  | 'CHO_DUYET'
  | 'DA_DUYET'
  | 'TU_CHOI'
  | 'DA_BAN_GIAO'
  | 'DA_HOAN_TAT'
  | 'DA_HUY';

export interface BorrowRequest {
  id: string;
  code: string;
  type: BorrowType;
  requesterId: string;
  equipmentIds: string[];
  reason: string;
  /** Thoi gian du kien tra (bat buoc voi yeu cau muon). */
  expectedReturnAt: string;
  status: BorrowStatus;
  createdAt: string;
  approverId?: string | null;
  approvedAt?: string | null;
  /** Bat buoc khi tu choi (UC-05). */
  rejectReason?: string | null;
  /** Ghi chu khi ban giao / tra (tinh trang thiet bi khi tra...). */
  handoverNote?: string | null;
  /** Thiet bi hong khi tra -> sinh phieu sua chua tu dong. */
  damagedEquipmentIds?: string[];
  completedAt?: string | null;
  handoverById?: string | null;
}

export type TransactionType = 'NHAP_KHO' | 'BAN_GIAO' | 'TRA' | 'THANH_LY' | 'DIEU_CHUYEN';

/** Nhat ky giao dich (UC-16: nguon du lieu de tinh ton kho). */
export interface Transaction {
  id: string;
  code: string;
  type: TransactionType;
  equipmentId: string;
  requestId?: string | null;
  fromUserId?: string | null;
  toUserId?: string | null;
  performedById: string;
  at: string;
  condition: EquipmentCondition;
  note?: string;
}

/* ============================== SUA CHUA / THANH LY ============================== */

export type RepairStatus =
  | 'CHO_TIEP_NHAN'
  | 'DANG_SUA'
  | 'HOAN_THANH'
  | 'KHONG_SUA_DUOC'
  | 'DA_THANH_LY';

export type RepairPriority = 'THAP' | 'BINH_THUONG' | 'CAO';

export interface RepairTicket {
  id: string;
  code: string;
  equipmentId: string;
  reportedById: string;
  reportedAt: string;
  /** Mo ta su co (UC-15). */
  issue: string;
  /** Anh dinh kem dang data URL. */
  images: string[];
  priority: RepairPriority;
  status: RepairStatus;
  technicianId?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  /** Ket qua xu ly / linh kien thay the. */
  solution?: string | null;
  /** De xuat thanh ly (UC-11). */
  proposeLiquidation: boolean;
  liquidationReason?: string | null;
  /** Phieu sua chua sinh tu dong khi tra thiet bi hong. */
  autoCreated?: boolean;
}

/* ============================== KIEM KE ============================== */

export type AuditStatus = 'DANG_KIEM_KE' | 'HOAN_THANH' | 'DA_HUY';
export type DiscrepancyType = 'THIEU' | 'THUA' | 'SAI_TINH_TRANG' | 'SAI_NGUOI_GIU';

export interface InventoryAuditItem {
  equipmentId: string;
  /** Trang thai he thong ghi nhan tai thoi diem tao dot kiem ke. */
  expectedStatus: EquipmentStatus;
  expectedHolderId: string | null;
  /** Da quet QR doi chieu chua. */
  scanned: boolean;
  scannedAt?: string | null;
  actualFound: boolean;
  actualStatus?: EquipmentStatus | null;
  actualHolderId?: string | null;
  discrepancy: DiscrepancyType | null;
  note?: string;
}

export interface InventoryAudit {
  id: string;
  code: string;
  name: string;
  periodFrom: string;
  periodTo: string;
  createdById: string;
  createdAt: string;
  status: AuditStatus;
  items: InventoryAuditItem[];
  completedAt?: string | null;
  /** Thanh phan tham gia kiem ke (hien thi tren bien ban). */
  participants: string[];
  note?: string;
}

/* ============================== NHAT KY & THONG BAO ============================== */

/** Nhat ky hoat dong - CHI DOC, khong the sua/xoa tu giao dien (truy vet). */
export interface AuditLog {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  /** Gia tri truoc/sau khi thao tac. */
  before?: string | null;
  after?: string | null;
  detail?: string;
}

export type NotificationLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER';

export interface Notification {
  id: string;
  /** null = thong bao chung cho tat ca nguoi dung. */
  userId: string | null;
  title: string;
  message: string;
  level: NotificationLevel;
  at: string;
  read: boolean;
  link?: string;
}

/* ============================== TRANG THAI TOAN CUC ============================== */

export interface AppState {
  version: number;
  roles: Role[];
  users: User[];
  categories: Category[];
  equipment: Equipment[];
  borrowRequests: BorrowRequest[];
  transactions: Transaction[];
  repairTickets: RepairTicket[];
  audits: InventoryAudit[];
  auditLogs: AuditLog[];
  notifications: Notification[];
  counters: Record<string, number>;
}

export interface Session {
  userId: string;
  /** Thoi diem het han phien dang nhap (ms). */
  expiresAt: number;
  startedAt: number;
}
