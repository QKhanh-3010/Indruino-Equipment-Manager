/**
 * Trang THONG BAO trong he thong: canh bao qua han, yeu cau cho duyet, phieu sua chua...
 * Nguoi co quyen 'notification.broadcast' co the gui thong bao cho toan Phong San xuat.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { NotificationLevel } from '@/types';
import { NOTIFICATION_LEVEL } from '@/lib/labels';
import { cn, formatDateTime } from '@/lib/utils';
import { useApp } from '@/data/store';
import { notificationsFor } from '@/services/selectors';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { useAction } from '@/hooks/useAction';

export function NotificationsPage(): JSX.Element {
  const { state, currentUser, can } = useApp();
  const action = useAction();
  const [form, setForm] = useState<{ title: string; message: string; level: NotificationLevel }>({
    title: '',
    message: '',
    level: 'INFO',
  });

  if (!currentUser) return <></>;

  const items = notificationsFor(state, currentUser.id);
  const unread = items.filter((n) => !n.read).length;

  const sendBroadcast = (): void => {
    const result = action('broadcastNotification', form);
    if (result.ok) setForm({ title: '', message: '', level: 'INFO' });
  };

  return (
    <>
      <PageHeader
        title="Thông báo trong hệ thống"
        description="Cảnh báo quá hạn trả thiết bị, yêu cầu mượn/trả chờ duyệt, phiếu sửa chữa mới và cảnh báo tồn kho theo định mức Min/Max."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Thông báo' }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={unread > 0 ? 'danger' : 'success'}>{unread} chưa đọc</Badge>
            <Button
              variant="secondary"
              onClick={() => action('markNotificationsRead', {})}
              disabled={unread === 0}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {items.length === 0 ? (
            <EmptyState
              icon="🔔"
              title="Chưa có thông báo nào"
              description="Các thông báo về yêu cầu mượn/trả, sửa chữa và cảnh báo tồn kho sẽ hiển thị tại đây."
            />
          ) : (
            items.map((item) => {
              const meta = NOTIFICATION_LEVEL[item.level];
              return (
                <article
                  key={item.id}
                  className={cn(
                    'rounded-lg border px-4 py-3',
                    item.read ? 'border-ink-200 bg-white' : 'border-navy-200 bg-navy-50',
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-ink-800">{item.title}</p>
                      <p className="mt-0.5 text-[11px] text-ink-500">
                        {formatDateTime(item.at)} ·{' '}
                        {item.userId ? 'Thông báo cá nhân' : 'Thông báo chung'}
                      </p>
                    </div>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-700">{item.message}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {item.link && (
                      <Link
                        to={item.link}
                        className="text-[11px] font-semibold text-navy-700 hover:underline"
                      >
                        Xem chi tiết →
                      </Link>
                    )}
                    {!item.read && (
                      <button
                        type="button"
                        onClick={() => action('markNotificationsRead', { ids: [item.id] })}
                        className="text-[11px] font-semibold text-ink-600 hover:underline"
                      >
                        Đánh dấu đã đọc
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {can('notification.broadcast') ? (
          <Card
            title="Gửi thông báo toàn Phòng Sản xuất"
            description="Thông báo gửi tới toàn bộ người dùng đang hoạt động."
          >
            <div className="space-y-3">
              <Field label="Tiêu đề" htmlFor="notif-title" required>
                <Input
                  id="notif-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Lịch kiểm kê định kỳ tháng 10/2026"
                />
              </Field>
              <Field label="Mức độ" htmlFor="notif-level" required>
                <Select
                  id="notif-level"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as NotificationLevel })}
                >
                  {Object.entries(NOTIFICATION_LEVEL).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Nội dung" htmlFor="notif-message" required>
                <Textarea
                  id="notif-message"
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Nhập nội dung thông báo tới toàn bộ nhân viên Phòng Sản xuất..."
                />
              </Field>
              <Button block onClick={sendBroadcast}>
                📢 Gửi thông báo
              </Button>
            </div>
          </Card>
        ) : (
          <Card title="Ghi chú nghiệp vụ">
            <p className="text-xs leading-relaxed text-ink-600">
              Hệ thống tự động gửi thông báo khi: yêu cầu mượn/trả được gửi hoặc xử lý, thiết bị quá hạn
              trả, thiết bị hư hỏng khi trả (tự tạo phiếu sửa chữa), phiếu sửa chữa hoàn thành và cảnh báo
              tồn kho thấp theo định mức Min/Max.
            </p>
            <p className="mt-2 text-xs text-ink-500">
              Chỉ Quản lý Phòng Sản xuất và Admin mới có quyền gửi thông báo chung.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}
