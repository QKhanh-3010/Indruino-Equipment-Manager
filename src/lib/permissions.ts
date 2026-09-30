/**
 * Ma tran phan quyen mac dinh (UC-03).
 * Trong he thong nay, bang Roles trong state la nguon du lieu CHINH THUC de kiem tra quyen
 * (tang services se doc tu state.roles). File nay chi cung cap gia tri khoi tao + nhan hien thi.
 */
import type { Permission, Role, RoleId } from '@/types';

export interface PermissionGroup {
  title: string;
  permissions: { key: Permission; label: string }[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: 'Quản trị hệ thống',
    permissions: [
      { key: 'user.view', label: 'Xem danh sách tài khoản' },
      { key: 'user.manage', label: 'Thêm/sửa/khóa tài khoản' },
      { key: 'role.manage', label: 'Phân quyền cho vai trò' },
      { key: 'category.manage', label: 'Quản lý danh mục thiết bị (Min/Max)' },
      { key: 'notification.broadcast', label: 'Gửi thông báo toàn phòng' },
    ],
  },
  {
    title: 'Thiết bị & kho',
    permissions: [
      { key: 'equipment.view', label: 'Xem danh sách/chi tiết thiết bị' },
      { key: 'equipment.create', label: 'Nhập kho thiết bị mới' },
      { key: 'equipment.update', label: 'Cập nhật thiết bị, tình trạng' },
      { key: 'equipment.retire', label: 'Thanh lý thiết bị' },
    ],
  },
  {
    title: 'Mượn / trả',
    permissions: [
      { key: 'borrow.create', label: 'Gửi yêu cầu mượn/trả' },
      { key: 'borrow.viewAll', label: 'Xem tất cả yêu cầu mượn/trả' },
      { key: 'borrow.approve', label: 'Duyệt / từ chối yêu cầu' },
      { key: 'borrow.handover', label: 'Bàn giao / nhận trả (quét QR)' },
    ],
  },
  {
    title: 'Sửa chữa & thanh lý',
    permissions: [
      { key: 'repair.report', label: 'Báo hỏng thiết bị' },
      { key: 'repair.handle', label: 'Tiếp nhận & xử lý sửa chữa' },
      { key: 'repair.proposeLiquidation', label: 'Đề xuất thanh lý' },
    ],
  },
  {
    title: 'Kiểm kê & báo cáo',
    permissions: [
      { key: 'audit.create', label: 'Tạo đợt kiểm kê' },
      { key: 'audit.perform', label: 'Thực hiện kiểm kê, quét QR đối chiếu' },
      { key: 'report.view', label: 'Xem báo cáo, thống kê' },
      { key: 'report.export', label: 'Xuất Excel / PDF' },
      { key: 'auditlog.view', label: 'Xem nhật ký hoạt động (audit log)' },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key));

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleId, Permission[]> = {
  // Admin: toan quyen quan tri he thong, khong tham gia nghiep vu muon/tra
  ADMIN: ALL_PERMISSIONS.filter(
    (p) => !['borrow.create', 'repair.report', 'repair.handle'].includes(p),
  ),
  // Quan ly Phong San xuat: nghiep vu day du (nhap kho, cap phat, duyet, kiem ke, bao cao)
  MANAGER: [
    'user.view',
    'category.manage',
    'equipment.view',
    'equipment.create',
    'equipment.update',
    'equipment.retire',
    'borrow.create',
    'borrow.viewAll',
    'borrow.approve',
    'borrow.handover',
    'repair.report',
    'audit.create',
    'audit.perform',
    'report.view',
    'report.export',
    'auditlog.view',
    'notification.broadcast',
  ],
  // Ky thuat vien: tiep nhan, sua chua, cap nhat tinh trang, de xuat thanh ly
  TECHNICIAN: [
    'equipment.view',
    'equipment.update',
    'repair.report',
    'repair.handle',
    'repair.proposeLiquidation',
    'borrow.handover',
    'audit.perform',
    'report.view',
  ],
  // Nhan vien Phong San xuat: xem, muon/tra, quet QR, bao hong
  STAFF: ['equipment.view', 'borrow.create', 'borrow.handover', 'repair.report', 'report.view'],
};

export const DEFAULT_ROLES: Role[] = [
  {
    id: 'ADMIN',
    name: 'Admin',
    description: 'Quản lý tài khoản, phân quyền và danh mục dữ liệu hệ thống.',
    permissions: [...DEFAULT_ROLE_PERMISSIONS.ADMIN],
  },
  {
    id: 'MANAGER',
    name: 'Quản lý Phòng Sản xuất',
    description: 'Nhập kho, cấp phát, duyệt yêu cầu mượn/trả, kiểm kê định kỳ, báo cáo thống kê.',
    permissions: [...DEFAULT_ROLE_PERMISSIONS.MANAGER],
  },
  {
    id: 'TECHNICIAN',
    name: 'Kỹ thuật viên',
    description: 'Tiếp nhận yêu cầu sửa chữa, sửa thiết bị, cập nhật tình trạng, đề xuất thanh lý.',
    permissions: [...DEFAULT_ROLE_PERMISSIONS.TECHNICIAN],
  },
  {
    id: 'STAFF',
    name: 'Nhân viên Phòng Sản xuất',
    description: 'Xem thiết bị, gửi yêu cầu mượn/trả, quét QR nhận/trả, báo hỏng.',
    permissions: [...DEFAULT_ROLE_PERMISSIONS.STAFF],
  },
];

/** Kiem tra quyen dua tren bang Roles trong state (tuong duong kiem tra phia server). */
export function roleHasPermission(
  roles: Role[],
  roleId: RoleId | undefined,
  permission: Permission,
): boolean {
  if (!roleId) return false;
  const role = roles.find((r) => r.id === roleId);
  return Boolean(role?.permissions.includes(permission));
}

export function roleHasAnyPermission(
  roles: Role[],
  roleId: RoleId | undefined,
  permissions: Permission[],
): boolean {
  return permissions.some((p) => roleHasPermission(roles, roleId, p));
}

export const PERMISSION_LABELS: Record<Permission, string> = PERMISSION_GROUPS.reduce(
  (acc, group) => {
    group.permissions.forEach((p) => {
      acc[p.key] = p.label;
    });
    return acc;
  },
  {} as Record<Permission, string>,
);
