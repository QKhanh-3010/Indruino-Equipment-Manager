/**
 * NGHIEP VU QUAN TRI (Admin)
 *  - UC-02 Quan ly tai khoan (them / sua / khoa, dat lai mat khau)
 *  - UC-03 Phan quyen theo vai tro
 *  - Quan ly danh muc du lieu he thong (dinh muc Min/Max)
 *  - Gui thong bao noi bo
 *
 * Bao mat: mat khau duoc bam SHA-256 + salt rieng cho tung tai khoan, khong luu plaintext
 * va khong ghi mat khau vao nhat ky hoat dong.
 */
import type { Category, EquipmentGroup, NotificationLevel, Permission, RoleId, User } from '@/types';
import { generateSalt, hashPassword } from '@/lib/crypto';
import {
  draftFrom,
  fail,
  notify,
  ok,
  required,
  requirePermission,
  type OpContext,
  type OpResult,
  writeLog,
} from './common';

const USERNAME_PATTERN = /^[a-z0-9._-]{3,30}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface CreateUserPayload {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: RoleId;
}

/** UC-02: Them tai khoan moi. */
export function createUser(ctx: OpContext, payload: CreateUserPayload): OpResult {
  const denied = requirePermission(ctx, 'user.manage');
  if (denied) return fail(denied);

  const username = payload.username.trim().toLowerCase();
  if (!USERNAME_PATTERN.test(username)) {
    return fail('Tên đăng nhập chỉ gồm chữ, số và các ký tự . _ - (từ 3 đến 30 ký tự).');
  }
  const errors = [
    required(payload.fullName, 'Họ và tên'),
    required(payload.email, 'Email'),
    required(payload.phone, 'Số điện thoại'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));
  if (!EMAIL_PATTERN.test(payload.email.trim())) {
    return fail('Email không đúng định dạng (ví dụ: nhanvien@indruino.vn).');
  }
  if (!payload.password || payload.password.length < 8) {
    return fail('Mật khẩu phải có tối thiểu 8 ký tự để đảm bảo an toàn.');
  }

  const draft = draftFrom(ctx.state);
  if (draft.users.some((u) => u.username.toLowerCase() === username)) {
    return fail(`Tên đăng nhập "${username}" đã tồn tại trong hệ thống.`);
  }
  if (!draft.roles.some((r) => r.id === payload.roleId)) {
    return fail('Vai trò không hợp lệ.');
  }

  draft.counters.user = (draft.counters.user ?? 0) + 1;
  const salt = generateSalt();
  const user: User = {
    id: `u-${username}-${Math.random().toString(36).slice(2, 5)}`,
    username,
    passwordHash: hashPassword(payload.password, salt),
    salt,
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    roleId: payload.roleId,
    department: 'Phòng Sản xuất',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  draft.users = [user, ...draft.users];

  writeLog(draft, ctx.actor, {
    action: 'Thêm tài khoản người dùng',
    entity: 'User',
    entityId: user.id,
    entityLabel: user.username,
    before: null,
    after: `${user.fullName} | ${user.roleId} | Đang hoạt động`,
    detail: 'Mật khẩu đã được băm bằng SHA-256 kèm salt riêng.',
  });

  return ok(draft, `Đã tạo tài khoản ${user.username} cho ${user.fullName}.`);
}

export interface UpdateUserPayload {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: RoleId;
}

/** UC-02: Sua thong tin tai khoan. */
export function updateUser(ctx: OpContext, payload: UpdateUserPayload): OpResult {
  const denied = requirePermission(ctx, 'user.manage');
  if (denied) return fail(denied);

  const errors = [
    required(payload.fullName, 'Họ và tên'),
    required(payload.email, 'Email'),
    required(payload.phone, 'Số điện thoại'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));
  if (!EMAIL_PATTERN.test(payload.email.trim())) {
    return fail('Email không đúng định dạng.');
  }

  const draft = draftFrom(ctx.state);
  const index = draft.users.findIndex((u) => u.id === payload.id);
  if (index < 0) return fail('Không tìm thấy tài khoản.');
  const before = draft.users[index];

  // Khong de he thong mat het quan tri vien dang hoat dong
  if (before.roleId === 'ADMIN' && payload.roleId !== 'ADMIN') {
    const activeAdmins = draft.users.filter((u) => u.roleId === 'ADMIN' && u.status === 'ACTIVE');
    if (activeAdmins.length <= 1) {
      return fail('Không thể đổi vai trò của Admin đang hoạt động cuối cùng trong hệ thống.');
    }
  }

  draft.users[index] = {
    ...before,
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    phone: payload.phone.trim(),
    roleId: payload.roleId,
  };

  writeLog(draft, ctx.actor, {
    action: 'Cập nhật tài khoản người dùng',
    entity: 'User',
    entityId: before.id,
    entityLabel: before.username,
    before: `${before.fullName} | ${before.roleId}`,
    after: `${payload.fullName} | ${payload.roleId}`,
    detail: 'Cập nhật thông tin và vai trò của tài khoản.',
  });

  return ok(draft, `Đã cập nhật tài khoản ${before.username}.`);
}

/** UC-02: Khoa / mo khoa tai khoan (khong xoa cung - giu lai lich su xu ly). */
export function setUserStatus(
  ctx: OpContext,
  payload: { id: string; status: User['status']; reason?: string },
): OpResult {
  const denied = requirePermission(ctx, 'user.manage');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.users.findIndex((u) => u.id === payload.id);
  if (index < 0) return fail('Không tìm thấy tài khoản.');
  const user = draft.users[index];

  if (user.id === ctx.actor.id && payload.status === 'LOCKED') {
    return fail('Bạn không thể tự khóa tài khoản đang đăng nhập.');
  }
  if (user.roleId === 'ADMIN' && payload.status === 'LOCKED') {
    const activeAdmins = draft.users.filter((u) => u.roleId === 'ADMIN' && u.status === 'ACTIVE');
    if (activeAdmins.length <= 1) {
      return fail('Không thể khóa Admin đang hoạt động cuối cùng của hệ thống.');
    }
  }
  if (payload.status === 'LOCKED' && (payload.reason ?? '').trim().length < 10) {
    return fail('Vui lòng ghi rõ lý do khóa tài khoản (tối thiểu 10 ký tự).');
  }

  draft.users[index] = { ...user, status: payload.status };

  writeLog(draft, ctx.actor, {
    action: payload.status === 'LOCKED' ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản',
    entity: 'User',
    entityId: user.id,
    entityLabel: user.username,
    before: user.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa',
    after: payload.status === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa',
    detail: payload.reason?.trim() || 'Mở khóa tài khoản để tiếp tục sử dụng hệ thống.',
  });

  return ok(
    draft,
    payload.status === 'LOCKED'
      ? `Đã khóa tài khoản ${user.username}.`
      : `Đã mở khóa tài khoản ${user.username}.`,
  );
}

/** Dat lai mat khau (Admin thao tac) - mat khau moi khong duoc ghi vao nhat ky. */
export function resetUserPassword(
  ctx: OpContext,
  payload: { id: string; newPassword: string },
): OpResult {
  const denied = requirePermission(ctx, 'user.manage');
  if (denied) return fail(denied);
  if (!payload.newPassword || payload.newPassword.length < 8) {
    return fail('Mật khẩu mới phải có tối thiểu 8 ký tự.');
  }

  const draft = draftFrom(ctx.state);
  const index = draft.users.findIndex((u) => u.id === payload.id);
  if (index < 0) return fail('Không tìm thấy tài khoản.');
  const user = draft.users[index];
  const salt = generateSalt();
  draft.users[index] = { ...user, salt, passwordHash: hashPassword(payload.newPassword, salt) };

  writeLog(draft, ctx.actor, {
    action: 'Đặt lại mật khẩu người dùng',
    entity: 'User',
    entityId: user.id,
    entityLabel: user.username,
    detail: 'Mật khẩu mới đã được băm SHA-256 kèm salt mới (không lưu plaintext).',
  });

  notify(draft, {
    userId: user.id,
    title: 'Mật khẩu của bạn đã được đặt lại',
    message: 'Quản trị viên đã đặt lại mật khẩu cho tài khoản của bạn. Vui lòng đăng nhập lại.',
    level: 'WARNING',
    link: '/thong-bao',
  });

  return ok(draft, `Đã đặt lại mật khẩu cho tài khoản ${user.username}.`);
}

/** Nguoi dung tu doi mat khau cua chinh minh. */
export function changeOwnPassword(
  ctx: OpContext,
  payload: { currentPassword: string; newPassword: string },
  verify: (password: string, salt: string, hash: string) => boolean,
): OpResult {
  if (!verify(payload.currentPassword, ctx.actor.salt, ctx.actor.passwordHash)) {
    return fail('Mật khẩu hiện tại không đúng.');
  }
  if (!payload.newPassword || payload.newPassword.length < 8) {
    return fail('Mật khẩu mới phải có tối thiểu 8 ký tự.');
  }
  if (payload.newPassword === payload.currentPassword) {
    return fail('Mật khẩu mới phải khác mật khẩu hiện tại.');
  }

  const draft = draftFrom(ctx.state);
  const index = draft.users.findIndex((u) => u.id === ctx.actor.id);
  if (index < 0) return fail('Không tìm thấy tài khoản.');
  const salt = generateSalt();
  draft.users[index] = {
    ...draft.users[index],
    salt,
    passwordHash: hashPassword(payload.newPassword, salt),
  };

  writeLog(draft, ctx.actor, {
    action: 'Đổi mật khẩu',
    entity: 'User',
    entityId: ctx.actor.id,
    entityLabel: ctx.actor.username,
    detail: 'Người dùng tự đổi mật khẩu thành công.',
  });

  return ok(draft, 'Đã đổi mật khẩu thành công.');
}

/**
 * UC-03: Cap nhat ma tran phan quyen cho mot vai tro.
 * Vai tro ADMIN luon giu toan quyen (khoa cung de tranh tu khoa quyen quan tri).
 */
export function updateRolePermissions(
  ctx: OpContext,
  payload: { roleId: RoleId; permissions: Permission[] },
): OpResult {
  const denied = requirePermission(ctx, 'role.manage');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.roles.findIndex((r) => r.id === payload.roleId);
  if (index < 0) return fail('Không tìm thấy vai trò.');
  if (payload.roleId === 'ADMIN') {
    return fail(
      'Không thể thay đổi quyền của vai trò Admin (đảm bảo hệ thống luôn có người quản trị).',
    );
  }

  const before = draft.roles[index];
  const removed = before.permissions.filter((p) => !payload.permissions.includes(p));
  const added = payload.permissions.filter((p) => !before.permissions.includes(p));

  draft.roles[index] = { ...before, permissions: [...payload.permissions] };

  writeLog(draft, ctx.actor, {
    action: 'Cập nhật phân quyền vai trò',
    entity: 'Role',
    entityId: before.id,
    entityLabel: before.name,
    before: `${before.permissions.length} quyền`,
    after: `${payload.permissions.length} quyền`,
    detail: `Thêm: ${added.join(', ') || 'không'} | Bỏ: ${removed.join(', ') || 'không'}`,
  });

  return ok(draft, `Đã cập nhật quyền cho vai trò ${before.name}.`);
}

export interface CategoryPayload {
  id?: string;
  code: string;
  name: string;
  group: EquipmentGroup;
  unit: string;
  minStock: number;
  maxStock: number;
  description?: string;
}

/** Quan ly danh muc thiet bi + dinh muc ton kho Min/Max (UC-07: canh bao ton kho). */
export function saveCategory(ctx: OpContext, payload: CategoryPayload): OpResult {
  const denied = requirePermission(ctx, 'category.manage');
  if (denied) return fail(denied);

  const errors = [
    required(payload.code, 'Mã danh mục'),
    required(payload.name, 'Tên danh mục'),
    required(payload.unit, 'Đơn vị tính'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));
  if (payload.minStock < 0 || payload.maxStock < 0) {
    return fail('Định mức Min/Max không được là số âm.');
  }
  if (payload.maxStock < payload.minStock) {
    return fail('Định mức Max phải lớn hơn hoặc bằng định mức Min.');
  }

  const draft = draftFrom(ctx.state);
  const duplicated = draft.categories.find(
    (c) => c.code.toUpperCase() === payload.code.trim().toUpperCase() && c.id !== payload.id,
  );
  if (duplicated) return fail(`Mã danh mục "${payload.code}" đã tồn tại.`);

  if (payload.id) {
    const index = draft.categories.findIndex((c) => c.id === payload.id);
    if (index < 0) return fail('Không tìm thấy danh mục cần cập nhật.');
    const before = draft.categories[index];
    const next: Category = {
      ...before,
      code: payload.code.trim().toUpperCase(),
      name: payload.name.trim(),
      group: payload.group,
      unit: payload.unit.trim(),
      minStock: payload.minStock,
      maxStock: payload.maxStock,
      description: payload.description?.trim(),
    };
    draft.categories[index] = next;
    writeLog(draft, ctx.actor, {
      action: 'Cập nhật danh mục thiết bị',
      entity: 'Category',
      entityId: next.id,
      entityLabel: next.name,
      before: `Min ${before.minStock} / Max ${before.maxStock}`,
      after: `Min ${next.minStock} / Max ${next.maxStock}`,
      detail: 'Cập nhật định mức tồn kho tối thiểu/tối đa.',
    });
    return ok(draft, `Đã cập nhật danh mục ${next.name}.`);
  }

  const created: Category = {
    id: `cat-${payload.code.trim().toLowerCase()}-${Math.random().toString(36).slice(2, 5)}`,
    code: payload.code.trim().toUpperCase(),
    name: payload.name.trim(),
    group: payload.group,
    unit: payload.unit.trim(),
    minStock: payload.minStock,
    maxStock: payload.maxStock,
    description: payload.description?.trim(),
  };
  draft.categories = [...draft.categories, created];

  writeLog(draft, ctx.actor, {
    action: 'Thêm danh mục thiết bị',
    entity: 'Category',
    entityId: created.id,
    entityLabel: created.name,
    before: null,
    after: `Min ${created.minStock} / Max ${created.maxStock}`,
    detail: `Nhóm thiết bị: ${created.group}.`,
  });

  return ok(draft, `Đã thêm danh mục ${created.name}.`);
}

/** Gui thong bao noi bo cho toan bo nguoi dung dang hoat dong. */
export function broadcastNotification(
  ctx: OpContext,
  payload: { title: string; message: string; level: NotificationLevel },
): OpResult {
  const denied = requirePermission(ctx, 'notification.broadcast');
  if (denied) return fail(denied);

  const errors = [
    required(payload.title, 'Tiêu đề thông báo'),
    required(payload.message, 'Nội dung thông báo'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));

  const draft = draftFrom(ctx.state);
  draft.users
    .filter((u) => u.status === 'ACTIVE')
    .forEach((u) =>
      notify(draft, {
        userId: u.id,
        title: payload.title.trim(),
        message: payload.message.trim(),
        level: payload.level,
        link: '/thong-bao',
      }),
    );

  writeLog(draft, ctx.actor, {
    action: 'Gửi thông báo toàn phòng',
    entity: 'Notification',
    entityId: 'broadcast',
    entityLabel: payload.title.trim(),
    detail: payload.message.trim(),
  });

  return ok(draft, 'Đã gửi thông báo tới toàn bộ người dùng đang hoạt động.');
}

/** Danh dau thong bao da doc (chi ap dung cho thong bao cua chinh minh). */
export function markNotificationsRead(ctx: OpContext, payload: { ids?: string[] }): OpResult {
  const draft = draftFrom(ctx.state);
  draft.notifications = draft.notifications.map((n) => {
    const mine = n.userId === ctx.actor.id || n.userId === null;
    const target = payload.ids?.length ? payload.ids.includes(n.id) : mine;
    return mine && target ? { ...n, read: true } : n;
  });
  return ok(
    draft,
    payload.ids?.length ? 'Đã đánh dấu thông báo đã đọc.' : 'Đã đọc toàn bộ thông báo.',
  );
}
