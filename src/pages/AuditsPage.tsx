/**
 * UC-06: Kiem ke dinh ky - tao dot kiem ke, theo doi tien do, xuat bien ban.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { InventoryAudit } from '@/types';
import { formatDate, formatDateTime, toDateInput } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getUserName } from '@/services/selectors';
import { summarizeAudit } from '@/services/audit';
import {
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Textarea,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { AuditStatusBadge } from '@/components/StatusBadges';
import { useAction } from '@/hooks/useAction';

export function AuditsPage(): JSX.Element {
  const { state, can } = useApp();
  const action = useAction();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    periodFrom: toDateInput(new Date()),
    periodTo: toDateInput(new Date(Date.now() + 7 * 86_400_000)),
    participants: [] as string[],
    note: '',
    categoryIds: [] as string[],
  });

  const activeAudit = state.audits.find((a) => a.status === 'DANG_KIEM_KE');

  const submit = (): void => {
    const result = action('createInventoryAudit', form);
    if (result.ok) {
      setCreateOpen(false);
      setForm({ ...form, name: '', note: '' });
    }
  };

  const columns: Column<InventoryAudit>[] = [
    {
      key: 'code',
      header: 'Đợt kiểm kê',
      render: (row) => (
        <div>
          <p className="font-semibold text-navy-800">{row.code}</p>
          <p className="text-[11px] text-ink-500">{row.name}</p>
        </div>
      ),
      sortValue: (row) => row.code,
    },
    {
      key: 'period',
      header: 'Thời gian',
      render: (row) => (
        <span className="text-[12px]">
          {formatDate(row.periodFrom)} → {formatDate(row.periodTo)}
        </span>
      ),
      sortValue: (row) => row.createdAt,
    },
    {
      key: 'progress',
      header: 'Tiến độ đối chiếu',
      render: (row) => {
        const stats = summarizeAudit(row);
        const percent = stats.total ? Math.round((stats.scanned / stats.total) * 100) : 0;
        return (
          <div className="w-40">
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-200">
              <div
                className="h-full rounded-full bg-navy-600"
                style={{ width: `${percent}%` }}
                aria-hidden="true"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-600">
              {stats.scanned}/{stats.total} thiết bị ({percent}%)
            </p>
          </div>
        );
      },
      sortValue: (row) => summarizeAudit(row).scanned,
    },
    {
      key: 'discrepancy',
      header: 'Chênh lệch',
      hideOnMobile: true,
      render: (row) => {
        const stats = summarizeAudit(row);
        const total =
          stats.missing + stats.extra + stats.wrongStatus + stats.wrongHolder;
        return total === 0 ? (
          <span className="text-[12px] text-emerald-700">Không có</span>
        ) : (
          <span className="text-[12px] text-red-700">
            Thiếu {stats.missing} · Thừa {stats.extra} · Sai TT {stats.wrongStatus}
          </span>
        );
      },
    },
    {
      key: 'createdBy',
      header: 'Người tạo',
      hideOnMobile: true,
      render: (row) => (
        <div>
          <p className="text-[12px]">{getUserName(state, row.createdById)}</p>
          <p className="text-[11px] text-ink-500">{formatDateTime(row.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <AuditStatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (row) => (
        <Link to={`/kiem-ke/${row.id}`}>
          <Button size="sm" variant="secondary">
            {row.status === 'DANG_KIEM_KE' && can('audit.perform')
              ? 'Tiếp tục kiểm kê'
              : 'Xem chi tiết'}
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Kiểm kê định kỳ trang thiết bị"
        description="Tạo đợt kiểm kê, quét mã QR đối chiếu thực tế, liệt kê chênh lệch (thiếu/thừa/sai tình trạng) và xuất biên bản kiểm kê."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Kiểm kê' }]}
        actions={
          can('audit.create') ? (
            <Button onClick={() => setCreateOpen(true)} disabled={Boolean(activeAudit)}>
              ＋ Tạo đợt kiểm kê
            </Button>
          ) : undefined
        }
      />

      {activeAudit && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Đang có đợt kiểm kê <strong>{activeAudit.code}</strong> chưa hoàn thành. Cần hoàn tất hoặc hủy
          đợt này trước khi tạo đợt mới.{' '}
          <Link to={`/kiem-ke/${activeAudit.id}`} className="font-semibold underline">
            Tiếp tục kiểm kê
          </Link>
        </div>
      )}

      <Card title={`Danh sách đợt kiểm kê (${state.audits.length})`}>
        <DataTable
          columns={columns}
          rows={state.audits}
          rowKey={(row) => row.id}
          searchable={(row) => `${row.code} ${row.name} ${row.note ?? ''}`}
          searchPlaceholder="Tìm theo mã hoặc tên đợt kiểm kê..."
          emptyTitle="Chưa có đợt kiểm kê nào"
          emptyDescription="Nhấn “Tạo đợt kiểm kê” để bắt đầu kiểm kê định kỳ toàn bộ thiết bị Phòng Sản xuất."
        />
      </Card>

      {/* --------------------------- Tao dot kiem ke --------------------------- */}
      <Modal
        open={createOpen}
        title="Tạo đợt kiểm kê định kỳ"
        description="Hệ thống chụp lại trạng thái và người giữ của từng thiết bị tại thời điểm tạo đợt để làm dữ liệu đối chiếu."
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={submit}>Tạo đợt kiểm kê</Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Tên đợt kiểm kê" htmlFor="audit-name" required>
            <Input
              id="audit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Kiểm kê định kỳ Quý IV/2026"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bắt đầu" htmlFor="audit-from" required>
              <Input
                id="audit-from"
                type="date"
                value={form.periodFrom}
                onChange={(e) => setForm({ ...form, periodFrom: e.target.value })}
              />
            </Field>
            <Field label="Kết thúc dự kiến" htmlFor="audit-to" required>
              <Input
                id="audit-to"
                type="date"
                value={form.periodTo}
                onChange={(e) => setForm({ ...form, periodTo: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Thành phần tham gia kiểm kê" htmlFor="audit-participants">
            <div
              id="audit-participants"
              className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-ink-200 p-2"
            >
              {state.users
                .filter((u) => u.status === 'ACTIVE')
                .map((user) => (
                  <label key={user.id} className="flex items-center gap-2 text-xs text-ink-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-ink-300 text-navy-700"
                      checked={form.participants.includes(user.fullName)}
                      onChange={() =>
                        setForm({
                          ...form,
                          participants: form.participants.includes(user.fullName)
                            ? form.participants.filter((n) => n !== user.fullName)
                            : [...form.participants, user.fullName],
                        })
                      }
                    />
                    {user.fullName} — {user.department}
                  </label>
                ))}
            </div>
          </Field>

          <Field label="Ghi chú" htmlFor="audit-note">
            <Textarea
              id="audit-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="VD: Kiểm kê theo yêu cầu của Ban Giám đốc sau sự cố thiếu thiết bị."
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
