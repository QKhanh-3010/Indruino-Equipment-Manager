/**
 * Trang TAI KHOAN CA NHAN: thong tin tai khoan, doi mat khau, quyen han,
 * thong bao cua toi va (doi voi Admin) khoi phuc du lieu demo.
 */
import { useState } from 'react';
import { ROLE_LABELS } from '@/lib/labels';
import { formatDateTime } from '@/lib/utils';
import { DEMO_ACCOUNTS, SESSION_TTL_MS, useApp } from '@/data/store';
import { notificationsFor, unreadCount } from '@/services/selectors';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  PageHeader,
  StatCard,
} from '@/components/ui';
import { useAction } from '@/hooks/useAction';
import { useToast } from '@/components/ui/Toast';

export function ProfilePage(): JSX.Element {
  const { state, currentUser, session, changePassword, resetDemoData, can, demoPassword } = useApp();
  const action = useAction();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  if (!currentUser) return <></>;

  const role = state.roles.find((r) => r.id === currentUser.roleId);
  const myNotifications = notificationsFor(state, currentUser.id);

  const submit = (): void => {
    setError(null);
    if (next !== confirm) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }
    const result = changePassword(current, next);
    if (result.ok) {
      toast.success('Đã đổi mật khẩu thành công.');
      setCurrent('');
      setNext('');
      setConfirm('');
    } else {
      setError(result.error ?? 'Đổi mật khẩu không thành công.');
    }
  };

  return (
    <>
      <PageHeader
        title="Tài khoản của tôi"
        description="Thông tin tài khoản, vai trò, quyền hạn và phiên đăng nhập hiện tại."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Tài khoản của tôi' }]}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Vai trò" value={ROLE_LABELS[currentUser.roleId]} tone="info" />
        <StatCard label="Số quyền được cấp" value={role?.permissions.length ?? 0} />
        <StatCard
          label="Thông báo chưa đọc"
          value={unreadCount(state, currentUser.id)}
          tone="warning"
        />
        <StatCard
          label="Thiết bị đang giữ"
          value={state.equipment.filter((e) => e.holderId === currentUser.id).length}
        />
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Thông tin tài khoản">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Tên đăng nhập</dt>
              <dd className="font-semibold text-ink-800">{currentUser.username}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Họ và tên</dt>
              <dd className="font-medium text-ink-800">{currentUser.fullName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Email</dt>
              <dd className="text-ink-700">{currentUser.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Điện thoại</dt>
              <dd className="text-ink-700">{currentUser.phone}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Phòng ban</dt>
              <dd className="text-ink-700">{currentUser.department}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Trạng thái</dt>
              <dd>
                {currentUser.status === 'ACTIVE' ? (
                  <Badge tone="success">Đang hoạt động</Badge>
                ) : (
                  <Badge tone="danger">Đã khóa</Badge>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Đăng nhập gần nhất</dt>
              <dd className="text-ink-700">{formatDateTime(currentUser.lastLoginAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-500">Phiên hết hạn lúc</dt>
              <dd className="text-ink-700">
                {session ? formatDateTime(new Date(session.expiresAt).toISOString()) : '—'}
                <span className="ml-1 text-[11px] text-ink-500">
                  (tối đa {SESSION_TTL_MS / 3_600_000} giờ)
                </span>
              </dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Đổi mật khẩu"
          description="Mật khẩu mới tối thiểu 8 ký tự và phải khác mật khẩu hiện tại."
        >
          <div className="space-y-3">
            <Field label="Mật khẩu hiện tại" htmlFor="pw-current" required>
              <Input
                id="pw-current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            <Field label="Mật khẩu mới" htmlFor="pw-new" required>
              <Input
                id="pw-new"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Field
              label="Xác nhận mật khẩu mới"
              htmlFor="pw-confirm"
              required
              error={error ?? undefined}
            >
              <Input
                id="pw-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </Field>
            <Button onClick={submit} disabled={!current || !next}>
              Đổi mật khẩu
            </Button>
          </div>
        </Card>

        <Card title="Quyền hạn của vai trò" description={role?.description}>
          <ul className="flex flex-wrap gap-1.5">
            {(role?.permissions ?? []).map((permission) => (
              <li key={permission}>
                <Badge tone="info">{permission}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Thông báo gần đây của tôi">
          {myNotifications.length === 0 ? (
            <p className="text-xs text-ink-500">Chưa có thông báo nào.</p>
          ) : (
            <ul className="space-y-2">
              {myNotifications.slice(0, 5).map((item) => (
                <li key={item.id} className="rounded-md border border-ink-200 px-3 py-2">
                  <p className="text-xs font-semibold text-ink-800">{item.title}</p>
                  <p className="text-[11px] text-ink-500">{formatDateTime(item.at)}</p>
                </li>
              ))}
            </ul>
          )}
          {unreadCount(state, currentUser.id) > 0 && (
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => action('markNotificationsRead', {})}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </Card>

        {can('role.manage') && (
          <Card
            title="Khu vực quản trị (Admin)"
            description="Công cụ phục vụ demo và kiểm thử hệ thống."
          >
            <div className="space-y-3">
              <p className="text-xs leading-relaxed text-ink-600">
                Khôi phục dữ liệu mẫu sẽ xoá toàn bộ thay đổi hiện có (thiết bị, yêu cầu mượn/trả, phiếu
                sửa chữa, kiểm kê, nhật ký) và tạo lại bộ dữ liệu demo ban đầu. Tài khoản demo dùng mật
                khẩu chung: <strong>{demoPassword}</strong>.
              </p>
              <ul className="space-y-1 text-[11px] text-ink-500">
                {DEMO_ACCOUNTS.map((account) => (
                  <li key={account.username}>
                    <strong className="text-ink-700">{account.username}</strong> —{' '}
                    {ROLE_LABELS[account.role]}
                  </li>
                ))}
              </ul>
              <Button variant="danger" onClick={() => setResetOpen(true)}>
                ♻ Khôi phục dữ liệu mẫu
              </Button>
            </div>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="Khôi phục dữ liệu mẫu"
        message="Toàn bộ dữ liệu hiện tại sẽ bị thay thế bằng bộ dữ liệu demo ban đầu. Bạn có chắc chắn muốn tiếp tục?"
        confirmLabel="Khôi phục dữ liệu"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          resetDemoData();
          setResetOpen(false);
          toast.success('Đã khôi phục dữ liệu mẫu ban đầu.');
        }}
      />
    </>
  );
}
