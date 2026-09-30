/**
 * UC-08..UC-11: Tiep nhan yeu cau sua chua, sua chua, cap nhat tinh trang, de xuat thanh ly.
 */
import { useMemo, useState } from 'react';
import type { RepairStatus, RepairTicket } from '@/types';
import { REPAIR_STATUS } from '@/lib/labels';
import { formatDateTime } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getEquipment, getUserName } from '@/services/selectors';
import {
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  Select,
  StatCard,
  Textarea,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { RepairPriorityBadge, RepairStatusBadge } from '@/components/StatusBadges';
import { useAction } from '@/hooks/useAction';

export function RepairsPage(): JSX.Element {
  const { state, currentUser, can } = useApp();
  const action = useAction();
  const [statusFilter, setStatusFilter] = useState<RepairStatus | ''>('');
  const [completeTarget, setCompleteTarget] = useState<RepairTicket | null>(null);
  const [liquidateTarget, setLiquidateTarget] = useState<RepairTicket | null>(null);
  const [solution, setSolution] = useState('');
  const [liquidationReason, setLiquidationReason] = useState('');

  const canHandle = can('repair.handle');
  const canLiquidate = can('repair.proposeLiquidation');

  const tickets = useMemo(
    () =>
      state.repairTickets
        .filter((t) => (statusFilter ? t.status === statusFilter : true))
        .filter((t) => (canHandle || can('repair.report') ? true : t.reportedById === currentUser?.id))
        .sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()),
    [state.repairTickets, statusFilter, canHandle, can, currentUser?.id],
  );

  const columns: Column<RepairTicket>[] = [
    {
      key: 'code',
      header: 'Phiếu',
      render: (row) => {
        const item = getEquipment(state, row.equipmentId);
        return (
          <div>
            <p className="font-semibold text-navy-800">{row.code}</p>
            <p className="text-[11px] text-ink-500">
              {item?.code} — {item?.name}
            </p>
            {row.autoCreated && (
              <span className="mt-0.5 inline-block text-[10px] text-amber-700">
                Tự động tạo khi trả thiết bị hư hỏng
              </span>
            )}
          </div>
        );
      },
      sortValue: (row) => row.code,
    },
    {
      key: 'issue',
      header: 'Mô tả sự cố',
      render: (row) => (
        <div>
          <p className="text-[12px] text-ink-700">{row.issue}</p>
          <p className="mt-0.5 text-[11px] text-ink-500">
            Người báo: {getUserName(state, row.reportedById)} · {formatDateTime(row.reportedAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Ưu tiên',
      hideOnMobile: true,
      render: (row) => <RepairPriorityBadge priority={row.priority} />,
      sortValue: (row) => row.priority,
    },
    {
      key: 'technician',
      header: 'Kỹ thuật viên',
      hideOnMobile: true,
      render: (row) => (
        <span className={row.technicianId ? 'text-ink-700' : 'text-ink-400'}>
          {row.technicianId ? getUserName(state, row.technicianId) : 'Chưa tiếp nhận'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <RepairStatusBadge status={row.status} />,
      sortValue: (row) => REPAIR_STATUS[row.status].label,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          {canHandle && row.status === 'CHO_TIEP_NHAN' && (
            <Button size="sm" onClick={() => action('acceptRepair', { ticketId: row.id })}>
              Tiếp nhận
            </Button>
          )}
          {canHandle && row.status === 'DANG_SUA' && (
            <Button
              size="sm"
              onClick={() => {
                setCompleteTarget(row);
                setSolution(row.solution ?? '');
              }}
            >
              Hoàn thành
            </Button>
          )}
          {canLiquidate && ['DANG_SUA', 'CHO_TIEP_NHAN'].includes(row.status) && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setLiquidateTarget(row);
                setSolution('');
                setLiquidationReason('');
              }}
            >
              Đề xuất thanh lý
            </Button>
          )}
          {row.solution && (
            <span className="text-[11px] text-ink-500" title={row.solution}>
              Kết quả: {row.solution.slice(0, 40)}…
            </span>
          )}
        </div>
      ),
    },
  ];

  const counts = {
    pending: state.repairTickets.filter((t) => t.status === 'CHO_TIEP_NHAN').length,
    working: state.repairTickets.filter((t) => t.status === 'DANG_SUA').length,
    done: state.repairTickets.filter((t) => t.status === 'HOAN_THANH').length,
    unrepairable: state.repairTickets.filter((t) => t.status === 'KHONG_SUA_DUOC').length,
  };

  return (
    <>
      <PageHeader
        title="Phiếu sửa chữa thiết bị"
        description="Tiếp nhận yêu cầu sửa chữa thiết bị điện – kỹ thuật, cập nhật tình trạng và đề xuất thanh lý thiết bị hỏng nặng."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Sửa chữa' }]}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Chờ tiếp nhận"
          value={counts.pending}
          tone={counts.pending ? 'warning' : 'success'}
        />
        <StatCard label="Đang sửa" value={counts.working} tone="info" />
        <StatCard label="Đã hoàn thành" value={counts.done} tone="success" />
        <StatCard
          label="Không sửa được"
          value={counts.unrepairable}
          tone={counts.unrepairable ? 'danger' : 'success'}
          hint="Đã đề xuất thanh lý"
        />
      </section>

      <div className="mt-4">
        <Card title="Bộ lọc">
          <Field label="Trạng thái phiếu" htmlFor="repair-status">
            <Select
              id="repair-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as RepairStatus | '')}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(REPAIR_STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </Select>
          </Field>
        </Card>
      </div>

      <div className="mt-4">
        <Card title={`Danh sách phiếu sửa chữa (${tickets.length})`}>
          <DataTable
            columns={columns}
            rows={tickets}
            rowKey={(row) => row.id}
            searchable={(row) => {
              const item = getEquipment(state, row.equipmentId);
              return `${row.code} ${item?.code ?? ''} ${item?.name ?? ''} ${row.issue}`;
            }}
            searchPlaceholder="Tìm theo mã phiếu, mã thiết bị, nội dung sự cố..."
            emptyTitle="Không có phiếu sửa chữa nào"
            emptyDescription="Khi nhân viên báo hỏng hoặc trả thiết bị hư hỏng, phiếu sửa chữa sẽ xuất hiện tại đây."
          />
        </Card>
      </div>

      {/* --------------------------- Hoan thanh sua chua --------------------------- */}
      <Modal
        open={Boolean(completeTarget)}
        title={`Hoàn thành sửa chữa ${completeTarget?.code ?? ''}`}
        description="Ghi rõ kết quả xử lý (linh kiện thay thế, nội dung sửa chữa). Thiết bị trở về trạng thái Sẵn sàng."
        onClose={() => setCompleteTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCompleteTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant="success"
              onClick={() => {
                if (!completeTarget) return;
                const result = action('completeRepair', { ticketId: completeTarget.id, solution });
                if (result.ok) setCompleteTarget(null);
              }}
            >
              Xác nhận hoàn thành
            </Button>
          </>
        }
      >
        <Field label="Kết quả sửa chữa" htmlFor="repair-solution" required>
          <Textarea
            id="repair-solution"
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
            placeholder="VD: Thay chổi than, vệ sinh khoang máy, đã chạy thử đạt yêu cầu."
          />
        </Field>
      </Modal>

      {/* --------------------------- De xuat thanh ly --------------------------- */}
      <Modal
        open={Boolean(liquidateTarget)}
        title={`Đề xuất thanh lý thiết bị ${liquidateTarget?.code ?? ''}`}
        description="Dành cho thiết bị hư hỏng nặng, chi phí sửa chữa vượt 70% giá trị thiết bị."
        onClose={() => setLiquidateTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setLiquidateTarget(null)}>
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!liquidateTarget) return;
                const result = action('proposeLiquidation', {
                  ticketId: liquidateTarget.id,
                  solution,
                  liquidationReason,
                });
                if (result.ok) setLiquidateTarget(null);
              }}
            >
              Gửi đề xuất thanh lý
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sau khi gửi, thiết bị chuyển sang trạng thái “Hỏng – chờ thanh lý” và Quản lý Phòng Sản xuất
            sẽ quyết định thanh lý theo quy trình.
          </p>
          <Field label="Kết luận kỹ thuật" htmlFor="liquidate-solution" required>
            <Textarea
              id="liquidate-solution"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="VD: Motor cháy hoàn toàn, không có linh kiện thay thế tương đương."
            />
          </Field>
          <Field label="Lý do đề xuất thanh lý" htmlFor="liquidate-reason" required>
            <Textarea
              id="liquidate-reason"
              value={liquidationReason}
              onChange={(e) => setLiquidationReason(e.target.value)}
              placeholder="VD: Chi phí thay motor vượt 70% giá trị thiết bị, không đảm bảo an toàn khi sử dụng."
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
