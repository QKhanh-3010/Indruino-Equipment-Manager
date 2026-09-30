/**
 * Trang "Thiet bi toi dang giu": nhan vien xem thiet bi minh chiu trach nhiem,
 * canh bao qua han tra va gui nhanh yeu cau tra.
 */
import { Link } from 'react-router-dom';
import type { Equipment } from '@/types';
import { formatDate, formatDateTime, isOverdue, overdueDays } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getCategoryName } from '@/services/selectors';
import { Button, Card, PageHeader, StatCard } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EquipmentStatusBadge, OverdueBadge } from '@/components/StatusBadges';
import { useAction } from '@/hooks/useAction';

export function MyEquipmentPage(): JSX.Element {
  const { state, currentUser, can } = useApp();
  const action = useAction();
  if (!currentUser) return <></>;

  const items = state.equipment.filter(
    (e) => e.holderId === currentUser.id && e.status !== 'DA_THANH_LY',
  );

  /** Tim phieu muon dang hieu luc cua thiet bi (de lay han tra du kien). */
  const activeRequestOf = (equipmentId: string) =>
    state.borrowRequests.find(
      (r) =>
        r.equipmentIds.includes(equipmentId) &&
        r.status === 'DA_BAN_GIAO' &&
        r.requesterId === currentUser.id,
    );

  const overdueItems = items.filter((e) => {
    const request = activeRequestOf(e.id);
    return request ? isOverdue(request.expectedReturnAt) : false;
  });

  const myRequests = state.borrowRequests.filter((r) => r.requesterId === currentUser.id);

  const requestReturn = (equipment: Equipment): void => {
    action('createBorrowRequest', {
      type: 'TRA',
      equipmentIds: [equipment.id],
      reason: `Hoàn thành công việc, đề nghị nhận trả thiết bị ${equipment.code} (${equipment.name}) theo quy trình quét mã QR.`,
      expectedReturnAt: new Date().toISOString(),
    });
  };

  const columns: Column<Equipment>[] = [
    {
      key: 'code',
      header: 'Mã thiết bị',
      render: (row) => (
        <div>
          <p className="font-semibold text-navy-800">{row.code}</p>
          <p className="text-[11px] text-ink-500">{getCategoryName(state, row.categoryId)}</p>
        </div>
      ),
      sortValue: (row) => row.code,
    },
    {
      key: 'name',
      header: 'Tên thiết bị',
      render: (row) => (
        <div>
          <p className="font-medium text-ink-800">{row.name}</p>
          <p className="text-[11px] text-ink-500">{row.location ?? '—'}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <EquipmentStatusBadge status={row.status} />,
    },
    {
      key: 'dueAt',
      header: 'Hạn trả dự kiến',
      render: (row) => {
        const request = activeRequestOf(row.id);
        if (!request) return <span className="text-ink-400">Chưa có phiếu mượn</span>;
        return (
          <div className="space-y-1">
            <p className="text-ink-700">{formatDateTime(request.expectedReturnAt)}</p>
            {isOverdue(request.expectedReturnAt) ? (
              <OverdueBadge days={overdueDays(request.expectedReturnAt)} />
            ) : (
              <span className="text-[11px] text-emerald-700">Còn trong hạn</span>
            )}
          </div>
        );
      },
      sortValue: (row) => activeRequestOf(row.id)?.expectedReturnAt ?? '',
    },
    {
      key: 'borrowedAt',
      header: 'Ngày nhận thiết bị',
      hideOnMobile: true,
      render: (row) => formatDate(activeRequestOf(row.id)?.approvedAt ?? row.createdAt),
    },
    {
      key: 'action',
      header: 'Thao tác',
      align: 'right',
      render: (row) => {
        const request = activeRequestOf(row.id);
        const pendingReturn = myRequests.some(
          (r) =>
            r.type === 'TRA' &&
            r.equipmentIds.includes(row.id) &&
            ['CHO_DUYET', 'DA_DUYET'].includes(r.status),
        );
        if (!can('borrow.create') || !request) return <span className="text-ink-400">—</span>;
        if (pendingReturn) {
          return <span className="text-[11px] text-amber-700">Đã gửi yêu cầu trả</span>;
        }
        return (
          <Button size="sm" variant="secondary" onClick={() => requestReturn(row)}>
            Gửi yêu cầu trả
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Thiết bị tôi đang giữ"
        description="Danh sách thiết bị bạn đang chịu trách nhiệm, hạn trả và cảnh báo quá hạn. Vui lòng trả thiết bị đúng hạn qua quét mã QR."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Thiết bị của tôi' }]}
        actions={
          can('borrow.handover') ? (
            <Link to="/ban-giao-qr">
              <Button>📷 Quét QR nhận / trả thiết bị</Button>
            </Link>
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Thiết bị tôi đang giữ" value={items.length} tone="info" />
        <StatCard
          label="Quá hạn trả"
          value={overdueItems.length}
          tone={overdueItems.length > 0 ? 'danger' : 'success'}
          hint="Cần trả ngay để tránh bị nhắc nhở"
        />
        <StatCard
          label="Phiếu mượn đang hiệu lực"
          value={myRequests.filter((r) => r.status === 'DA_BAN_GIAO').length}
        />
        <StatCard
          label="Phiếu đang chờ duyệt"
          value={myRequests.filter((r) => r.status === 'CHO_DUYET').length}
          tone="warning"
        />
      </section>

      {overdueItems.length > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          ⚠ Bạn đang có {overdueItems.length} thiết bị quá hạn trả:{' '}
          <strong>{overdueItems.map((e) => e.code).join(', ')}</strong>. Vui lòng liên hệ Quản lý Phòng
          Sản xuất để hoàn tất thủ tục trả thiết bị.
        </div>
      )}

      <div className="mt-4">
        <Card title="Danh sách thiết bị đang giữ">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
            searchable={(row) => `${row.code} ${row.name}`}
            searchPlaceholder="Tìm theo mã hoặc tên thiết bị..."
            emptyTitle="Bạn chưa giữ thiết bị nào"
            emptyDescription="Khi yêu cầu mượn được duyệt và bàn giao, thiết bị sẽ xuất hiện tại đây."
          />
        </Card>
      </div>
    </>
  );
}
