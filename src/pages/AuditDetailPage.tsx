/**
 * UC-06: Chi tiet dot kiem ke - quet QR doi chieu, liet ke chenh lech, xuat bien ban kiem ke.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { DiscrepancyType, EquipmentStatus, InventoryAuditItem } from '@/types';
import { DISCREPANCY_LABELS, EQUIPMENT_STATUS } from '@/lib/labels';
import { documentHeader, escapeHtml, formatDate, formatDateTime, printDocument } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getUserName } from '@/services/selectors';
import { summarizeAudit } from '@/services/audit';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  StatCard,
  Textarea,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { AuditStatusBadge, DiscrepancyBadge } from '@/components/StatusBadges';
import { QrScanner } from '@/components/QrScanner';
import { useAction } from '@/hooks/useAction';

export function AuditDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const { state, can } = useApp();
  const action = useAction();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const audit = state.audits.find((a) => a.id === id);

  if (!audit) {
    return (
      <>
        <PageHeader title="Không tìm thấy đợt kiểm kê" />
        <EmptyState
          icon="🔍"
          title="Đợt kiểm kê không tồn tại"
          description="Vui lòng quay lại danh sách kiểm kê để chọn đợt khác."
        />
      </>
    );
  }

  const stats = summarizeAudit(audit);
  const editable = audit.status === 'DANG_KIEM_KE' && can('audit.perform');

  /** In bien ban kiem ke (co chu ky thanh phan tham gia). */
  const printMinutes = (): void => {
    const rows = audit.items
      .map((item) => {
        const equipment = state.equipment.find((e) => e.id === item.equipmentId);
        return `<tr>
          <td>${escapeHtml(equipment?.code ?? '—')}</td>
          <td>${escapeHtml(equipment?.name ?? '—')}</td>
          <td>${escapeHtml(EQUIPMENT_STATUS[item.expectedStatus].label)}</td>
          <td>${escapeHtml(getUserName(state, item.expectedHolderId))}</td>
          <td>${escapeHtml(
            item.actualStatus ? EQUIPMENT_STATUS[item.actualStatus].label : 'Không tìm thấy',
          )}</td>
          <td>${escapeHtml(
            item.discrepancy ? DISCREPANCY_LABELS[item.discrepancy].label : 'Khớp dữ liệu',
          )}</td>
          <td>${escapeHtml(item.note ?? '')}</td>
        </tr>`;
      })
      .join('');

    printDocument(
      `Biên bản kiểm kê ${audit.code}`,
      `${documentHeader('Biên bản kiểm kê trang thiết bị')}
      <h1>Biên bản kiểm kê trang thiết bị</h1>
      <p class="center muted">Số biên bản: ${escapeHtml(audit.code)} — ${escapeHtml(audit.name)}</p>
      <p class="muted">Thời gian kiểm kê: ${escapeHtml(formatDate(audit.periodFrom))} đến ${escapeHtml(
        formatDate(audit.periodTo),
      )}. Thời điểm lập biên bản: ${escapeHtml(formatDateTime(new Date().toISOString()))}.</p>
      <p class="muted">Thành phần tham gia: ${escapeHtml(audit.participants.join(', ') || '—')}.</p>
      <h2>Kết quả kiểm kê</h2>
      <p>Tổng số thiết bị kiểm kê: <strong>${stats.total}</strong> — Đã đối chiếu: <strong>${
        stats.scanned
      }</strong>.</p>
      <p>Thiếu: <strong>${stats.missing}</strong> — Thừa: <strong>${stats.extra}</strong> — Sai tình trạng:
        <strong>${stats.wrongStatus}</strong> — Sai người giữ: <strong>${stats.wrongHolder}</strong>.</p>
      <h2>Chi tiết từng thiết bị</h2>
      <table>
        <thead><tr><th>Mã thiết bị</th><th>Tên thiết bị</th><th>Trạng thái hệ thống</th>
        <th>Người giữ (hệ thống)</th><th>Thực tế</th><th>Chênh lệch</th><th>Ghi chú</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <h2>Kết luận &amp; kiến nghị</h2>
      <p>${escapeHtml(audit.note ?? 'Biên bản ghi nhận kết quả kiểm kê thực tế tại thời điểm kiểm kê.')}</p>
      <div class="sign">
        <div><p class="role">Người lập biên bản</p><p class="hint">(Ký, ghi rõ họ tên)</p><br/><br/><br/>
          <p>${escapeHtml(getUserName(state, audit.createdById))}</p></div>
        <div><p class="role">Thành phần tham gia</p><p class="hint">(Ký, ghi rõ họ tên)</p><br/><br/><br/>
          <p>${escapeHtml(audit.participants.join(', ') || '—')}</p></div>
        <div><p class="role">Quản lý Phòng Sản xuất</p><p class="hint">(Ký, ghi rõ họ tên)</p><br/><br/><br/>
          <p>&nbsp;</p></div>
      </div>`,
    );
  };

  const columns: Column<InventoryAuditItem>[] = [
    {
      key: 'equipment',
      header: 'Thiết bị',
      render: (item) => {
        const equipment = state.equipment.find((e) => e.id === item.equipmentId);
        return (
          <div>
            <p className="font-semibold text-navy-800">{equipment?.code ?? '—'}</p>
            <p className="text-[11px] text-ink-500">{equipment?.name ?? '—'}</p>
          </div>
        );
      },
      sortValue: (item) => state.equipment.find((e) => e.id === item.equipmentId)?.code ?? '',
    },
    {
      key: 'expected',
      header: 'Dữ liệu hệ thống',
      render: (item) => (
        <div className="text-[11px]">
          <p>Trạng thái: {EQUIPMENT_STATUS[item.expectedStatus].label}</p>
          <p>Người giữ: {getUserName(state, item.expectedHolderId)}</p>
        </div>
      ),
    },
    {
      key: 'actual',
      header: 'Thực tế kiểm kê',
      render: (item) => (
        <div className="text-[11px]">
          <p>
            {item.scanned
              ? item.actualStatus
                ? EQUIPMENT_STATUS[item.actualStatus].label
                : 'Không tìm thấy thiết bị'
              : 'Chưa đối chiếu'}
          </p>
          <p>Người giữ: {item.scanned ? getUserName(state, item.actualHolderId) : '—'}</p>
          {item.scannedAt && <p className="text-ink-500">Lúc: {formatDateTime(item.scannedAt)}</p>}
        </div>
      ),
    },
    {
      key: 'discrepancy',
      header: 'Chênh lệch',
      render: (item) =>
        item.scanned ? (
          <DiscrepancyBadge value={item.discrepancy as DiscrepancyType | null} />
        ) : (
          <Badge tone="neutral">Chưa kiểm kê</Badge>
        ),
      sortValue: (item) => item.discrepancy ?? 'OK',
    },
    {
      key: 'note',
      header: 'Ghi chú',
      hideOnMobile: true,
      render: (item) => <span className="text-[11px] text-ink-600">{item.note ?? '—'}</span>,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (item) =>
        editable ? (
          <div className="flex flex-wrap items-end justify-end gap-1.5">
            {!item.scanned && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  action('markAuditItemMissing', {
                    auditId: audit.id,
                    equipmentId: item.equipmentId,
                  })
                }
              >
                Ghi nhận thiếu
              </Button>
            )}
            <label className="sr-only" htmlFor={`actual-${item.equipmentId}`}>
              Cập nhật tình trạng thực tế
            </label>
            <select
              id={`actual-${item.equipmentId}`}
              className="rounded-md border border-ink-300 px-2 py-1 text-[11px]"
              value={item.actualStatus ?? ''}
              onChange={(e) =>
                action('setAuditItemActual', {
                  auditId: audit.id,
                  equipmentId: item.equipmentId,
                  actualStatus: (e.target.value as EquipmentStatus) || undefined,
                  actualHolderId: item.expectedHolderId,
                })
              }
            >
              <option value="">-- Thực tế --</option>
              {Object.entries(EQUIPMENT_STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={`${audit.code} — ${audit.name}`}
        description={`Thời gian kiểm kê: ${formatDate(audit.periodFrom)} → ${formatDate(
          audit.periodTo,
        )} · Người tạo: ${getUserName(state, audit.createdById)} · Thành phần: ${
          audit.participants.join(', ') || '—'
        }`}
        breadcrumb={[
          { label: 'Indruino Equipment Manager' },
          { label: 'Kiểm kê' },
          { label: audit.code },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AuditStatusBadge status={audit.status} />
            <Button variant="secondary" onClick={printMinutes}>
              🖨 Xuất biên bản kiểm kê (PDF)
            </Button>
            {audit.status === 'DANG_KIEM_KE' && can('audit.create') && (
              <>
                <Button onClick={() => setConfirmComplete(true)}>✔ Hoàn tất kiểm kê</Button>
                <Button variant="danger" onClick={() => setCancelOpen(true)}>
                  Hủy đợt kiểm kê
                </Button>
              </>
            )}
          </div>
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Tổng thiết bị kiểm kê" value={stats.total} />
        <StatCard label="Đã đối chiếu" value={`${stats.scanned}/${stats.total}`} tone="info" />
        <StatCard label="Thiếu" value={stats.missing} tone={stats.missing ? 'danger' : 'success'} />
        <StatCard label="Thừa" value={stats.extra} tone={stats.extra ? 'warning' : 'success'} />
        <StatCard
          label="Sai tình trạng / người giữ"
          value={stats.wrongStatus + stats.wrongHolder}
          tone={stats.wrongStatus + stats.wrongHolder ? 'warning' : 'success'}
        />
      </section>

      {editable && (
        <div className="mt-4">
          <Card
            title="Quét mã QR để đối chiếu"
            description="Thiết bị có trong danh sách sẽ được ghi nhận là tìm thấy; thiết bị không thuộc danh sách được ghi nhận là “Thừa”."
          >
            <QrScanner onDetected={(code) => action('scanAuditItem', { auditId: audit.id, code })} />
          </Card>
        </div>
      )}

      <div className="mt-4">
        <Card title={`Danh sách thiết bị trong đợt kiểm kê (${audit.items.length})`}>
          <DataTable
            columns={columns}
            rows={audit.items}
            rowKey={(item) => item.equipmentId}
            pageSize={15}
            searchable={(item) => {
              const equipment = state.equipment.find((e) => e.id === item.equipmentId);
              return `${equipment?.code ?? ''} ${equipment?.name ?? ''}`;
            }}
            searchPlaceholder="Tìm theo mã hoặc tên thiết bị..."
            emptyTitle="Đợt kiểm kê không có thiết bị nào"
          />
        </Card>
      </div>

      <ConfirmDialog
        open={confirmComplete}
        tone="primary"
        title={`Hoàn tất đợt kiểm kê ${audit.code}`}
        message={`Bạn xác nhận hoàn tất đợt kiểm kê? ${
          stats.total - stats.scanned
        } thiết bị chưa được đối chiếu sẽ được ghi nhận là “Thiếu” trong biên bản.`}
        confirmLabel="Hoàn tất kiểm kê"
        onCancel={() => setConfirmComplete(false)}
        onConfirm={() => {
          setConfirmComplete(false);
          action('completeInventoryAudit', { auditId: audit.id });
        }}
      />

      <Modal
        open={cancelOpen}
        title={`Hủy đợt kiểm kê ${audit.code}`}
        description="Đợt kiểm kê đã hủy sẽ không thể tiếp tục đối chiếu."
        size="sm"
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelOpen(false)}>
              Đóng
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                const result = action('cancelInventoryAudit', {
                  auditId: audit.id,
                  reason: cancelReason,
                });
                if (result.ok) setCancelOpen(false);
              }}
            >
              Xác nhận hủy
            </Button>
          </>
        }
      >
        <Field label="Lý do hủy đợt kiểm kê" htmlFor="cancel-reason" required>
          <Textarea
            id="cancel-reason"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="VD: Trùng thời điểm kiểm kê với đợt kiểm kê của Ban Giám đốc."
          />
        </Field>
      </Modal>
    </>
  );
}
