/**
 * UC-02: Quan ly tai khoan nguoi dung (them, sua, khoa/mo khoa, dat lai mat khau).
 * Tai khoan bi khoa se bi mat phien dang nhap ngay lap tuc.
 */
import { useState } from 'react';
import type { RoleId, User } from '@/types';
import { ROLE_LABELS } from '@/lib/labels';
import { formatDateTime } from '@/lib/utils';
import { useApp } from '@/data/store';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  StatCard,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useAction } from '@/hooks/useAction';

export function UsersPage(): JSX.Element {
  const { state, currentUser } = useApp();
  const action = useAction();

  const [editUser, setEditUser] = useState<User | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [lockTarget, setLockTarget] = useState<User | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [form, setForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    roleId: 'STAFF' as RoleId,
  });

  const lockedCount = state.users.filter((u) => u.status === 'LOCKED').length;

  const submitCreate = (): void => {
    const result = action('createUser', form);
    if (result.ok) {
      setCreateOpen(false);
      setForm({ username: '', password: '', fullName: '', email: '', phone: '', roleId: 'STAFF' });
    }
  };

  const submitEdit = (): void => {
    if (!editUser) return;
    const result = action('updateUser', {
      id: editUser.id,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      roleId: form.roleId,
    });
    if (result.ok) setEditUser(null);
  };

  const columns: Column<User>[] = [
    {
      key: 'username',
      header: 'Tài khoản',
      render: (user) => (
        <div>
          <p className="font-semibold text-navy-800">{user.username}</p>
          <p className="text-[11px] text-ink-500">{user.fullName}</p>
        </div>
      ),
      sortValue: (user) => user.username,
    },
    {
      key: 'role',
      header: 'Vai trò',
      render: (user) => <Badge tone="info">{ROLE_LABELS[user.roleId]}</Badge>,
      sortValue: (user) => ROLE_LABELS[user.roleId],
    },
    {
      key: 'contact',
      header: 'Liên hệ',
      hideOnMobile: true,
      render: (user) => (
        <div className="text-[11px]">
          <p>{user.email}</p>
          <p className="text-ink-500">{user.phone}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (user) =>
        user.status === 'ACTIVE' ? (
          <Badge tone="success">Đang hoạt động</Badge>
        ) : (
          <Badge tone="danger">Đã khóa</Badge>
        ),
      sortValue: (user) => user.status,
    },
    {
      key: 'lastLogin',
      header: 'Đăng nhập gần nhất',
      hideOnMobile: true,
      render: (user) => formatDateTime(user.lastLoginAt),
      sortValue: (user) => user.lastLoginAt ?? '',
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (user) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditUser(user);
              setForm({
                username: user.username,
                password: '',
                fullName: user.fullName,
                email: user.email,
                phone: user.phone,
                roleId: user.roleId,
              });
            }}
          >
            Sửa
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setResetTarget(user)}>
            Đặt lại mật khẩu
          </Button>
          {user.status === 'ACTIVE' ? (
            <Button size="sm" variant="danger" onClick={() => setLockTarget(user)}>
              Khóa
            </Button>
          ) : (
            <Button
              size="sm"
              variant="success"
              onClick={() => action('setUserStatus', { id: user.id, status: 'ACTIVE' })}
            >
              Mở khóa
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Quản lý tài khoản người dùng"
        description="Thêm, sửa, khóa/mở khóa tài khoản và đặt lại mật khẩu. Tài khoản bị khóa sẽ mất phiên đăng nhập ngay lập tức."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Tài khoản' }]}
        actions={<Button onClick={() => setCreateOpen(true)}>＋ Thêm tài khoản</Button>}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tổng tài khoản" value={state.users.length} />
        <StatCard label="Đang hoạt động" value={state.users.length - lockedCount} tone="success" />
        <StatCard label="Đã khóa" value={lockedCount} tone={lockedCount ? 'danger' : 'success'} />
        <StatCard
          label="Quản trị viên"
          value={state.users.filter((u) => u.roleId === 'ADMIN').length}
          tone="info"
        />
      </section>

      <div className="mt-4">
        <Card title={`Danh sách tài khoản (${state.users.length})`}>
          <DataTable
            columns={columns}
            rows={state.users}
            rowKey={(user) => user.id}
            searchable={(user) =>
              `${user.username} ${user.fullName} ${user.email} ${ROLE_LABELS[user.roleId]}`
            }
            searchPlaceholder="Tìm theo tên đăng nhập, họ tên, email..."
            emptyTitle="Chưa có tài khoản nào"
          />
        </Card>
      </div>

      {/* --------------------------- Them tai khoan --------------------------- */}
      <Modal
        open={createOpen}
        title="Thêm tài khoản mới"
        description="Mật khẩu được băm SHA-256 kèm salt riêng, hệ thống không lưu mật khẩu gốc."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={submitCreate}>Tạo tài khoản</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Tên đăng nhập"
            htmlFor="user-username"
            required
            hint="Chỉ gồm chữ, số và các ký tự . _ -"
          >
            <Input
              id="user-username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="VD: nv.04"
            />
          </Field>
          <Field label="Mật khẩu ban đầu" htmlFor="user-password" required hint="Tối thiểu 8 ký tự.">
            <Input
              id="user-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Field label="Họ và tên" htmlFor="user-fullname" required>
            <Input
              id="user-fullname"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Vai trò" htmlFor="user-role" required>
            <Select
              id="user-role"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value as RoleId })}
            >
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Email" htmlFor="user-email" required>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="nhanvien@indruino.vn"
            />
          </Field>
          <Field label="Số điện thoại" htmlFor="user-phone" required>
            <Input
              id="user-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="09xx xxx xxx"
            />
          </Field>
        </div>
      </Modal>

      {/* --------------------------- Sua tai khoan --------------------------- */}
      <Modal
        open={Boolean(editUser)}
        title={`Sửa tài khoản ${editUser?.username ?? ''}`}
        onClose={() => setEditUser(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditUser(null)}>
              Hủy bỏ
            </Button>
            <Button onClick={submitEdit}>Lưu thay đổi</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Họ và tên" htmlFor="edit-fullname" required>
            <Input
              id="edit-fullname"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </Field>
          <Field label="Vai trò" htmlFor="edit-role" required>
            <Select
              id="edit-role"
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value as RoleId })}
            >
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Email" htmlFor="edit-email" required>
            <Input
              id="edit-email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Số điện thoại" htmlFor="edit-phone" required>
            <Input
              id="edit-phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* --------------------------- Khoa tai khoan (bat buoc ly do) --------------------------- */}
      <Modal
        open={Boolean(lockTarget)}
        title={`Khóa tài khoản ${lockTarget?.username ?? ''}`}
        description="Tài khoản bị khóa sẽ không thể đăng nhập và mất phiên làm việc hiện tại."
        size="sm"
        onClose={() => setLockTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLockTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!lockTarget) return;
                const result = action('setUserStatus', {
                  id: lockTarget.id,
                  status: 'LOCKED',
                  reason: lockReason,
                });
                if (result.ok) {
                  setLockTarget(null);
                  setLockReason('');
                }
              }}
            >
              Xác nhận khóa
            </Button>
          </>
        }
      >
        <Field
          label="Lý do khóa tài khoản"
          htmlFor="lock-reason"
          required
          hint="Tối thiểu 10 ký tự. Lý do được lưu vào nhật ký hoạt động."
        >
          <Input
            id="lock-reason"
            value={lockReason}
            onChange={(e) => setLockReason(e.target.value)}
            placeholder="VD: Nhân viên chuyển công tác sang phòng ban khác."
          />
        </Field>
        {currentUser?.id === lockTarget?.id && (
          <p className="mt-2 text-[11px] text-red-600">
            Lưu ý: không thể tự khóa tài khoản đang đăng nhập, hệ thống sẽ từ chối thao tác này.
          </p>
        )}
      </Modal>

      {/* --------------------------- Dat lai mat khau --------------------------- */}
      <Modal
        open={Boolean(resetTarget)}
        title={`Đặt lại mật khẩu cho ${resetTarget?.username ?? ''}`}
        description="Mật khẩu mới không được ghi vào nhật ký hoạt động."
        size="sm"
        onClose={() => setResetTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              onClick={() => {
                if (!resetTarget) return;
                const result = action('resetUserPassword', { id: resetTarget.id, newPassword });
                if (result.ok) {
                  setResetTarget(null);
                  setNewPassword('');
                }
              }}
            >
              Đặt lại mật khẩu
            </Button>
          </>
        }
      >
        <Field label="Mật khẩu mới" htmlFor="reset-password" required hint="Tối thiểu 8 ký tự.">
          <Input
            id="reset-password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
      </Modal>
    </>
  );
}
