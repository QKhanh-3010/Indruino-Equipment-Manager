/**
 * UC-12: Xem / tim kiem / loc danh sach thiet bi theo loai, tinh trang, nguoi dang giu.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Equipment, EquipmentStatus } from '@/types';
import { EQUIPMENT_STATUS } from '@/lib/labels';
import { exportExcel, formatCurrency, formatDate } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getUserName } from '@/services/selectors';
import { Button, Card, Field, PageHeader, Select } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConditionBadge, EquipmentStatusBadge } from '@/components/StatusBadges';

export function EquipmentListPage(): JSX.Element {
  const navigate = useNavigate();
  const { state, can } = useApp();
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<EquipmentStatus | ''>('');
  const [holderId, setHolderId] = useState('');
  const [group, setGroup] = useState('');

  const rows = useMemo(
    () =>
      state.equipment.filter((e) => {
        if (categoryId && e.categoryId !== categoryId) return false;
        if (status && e.status !== status) return false;
        if (holderId === 'NONE' && e.holderId) return false;
        if (holderId && holderId !== 'NONE' && e.holderId !== holderId) return false;
        if (group) {
          const category = state.categories.find((c) => c.id === e.categoryId);
          if (category?.group !== group) return false;
        }
        return true;
      }),
    [state.equipment, state.categories, categoryId, status, holderId, group],
  );

  const columns: Column<Equipment>[] = [
    {
      key: 'code',
      header: 'Mã thiết bị',
      render: (row) => (
        <div>
          <p className="font-semibold text-navy-800">{row.code}</p>
          <p className="text-[11px] text-ink-500">Serial: {row.serial ?? '—'}</p>
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
          <p className="text-[11px] text-ink-500">
            {state.categories.find((c) => c.id === row.categoryId)?.name ?? '—'} · {row.location ?? '—'}
          </p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <EquipmentStatusBadge status={row.status} />,
      sortValue: (row) => EQUIPMENT_STATUS[row.status].label,
    },
    {
      key: 'condition',
      header: 'Tình trạng',
      hideOnMobile: true,
      render: (row) => <ConditionBadge condition={row.condition} />,
      sortValue: (row) => row.condition,
    },
    {
      key: 'holder',
      header: 'Người chịu trách nhiệm',
      render: (row) => (
        <span className={row.holderId ? 'font-medium text-navy-700' : 'text-ink-400'}>
          {row.holderId ? getUserName(state, row.holderId) : 'Kho Phòng Sản xuất'}
        </span>
      ),
      sortValue: (row) => getUserName(state, row.holderId),
    },
    {
      key: 'receivedAt',
      header: 'Ngày nhập kho',
      hideOnMobile: true,
      render: (row) => formatDate(row.receivedAt),
      sortValue: (row) => row.receivedAt,
    },
    {
      key: 'price',
      header: 'Nguyên giá',
      align: 'right',
      hideOnMobile: true,
      render: (row) => formatCurrency(row.price),
      sortValue: (row) => row.price ?? 0,
    },
    {
      key: 'action',
      header: 'Chi tiết',
      align: 'right',
      render: (row) => (
        <Button size="sm" variant="secondary" onClick={() => navigate(`/thiet-bi/${row.id}`)}>
          Xem
        </Button>
      ),
    },
  ];

  const handleExport = (): void => {
    exportExcel(
      'danh-sach-thiet-bi-indruino.xls',
      'DANH SÁCH TRANG THIẾT BỊ — PHÒNG SẢN XUẤT',
      [
        { header: 'Mã thiết bị', value: (row: Equipment) => row.code },
        { header: 'Tên thiết bị', value: (row: Equipment) => row.name },
        {
          header: 'Loại thiết bị',
          value: (row: Equipment) =>
            state.categories.find((c) => c.id === row.categoryId)?.name ?? '',
        },
        { header: 'Trạng thái', value: (row: Equipment) => EQUIPMENT_STATUS[row.status].label },
        {
          header: 'Người chịu trách nhiệm',
          value: (row: Equipment) => getUserName(state, row.holderId),
        },
        { header: 'Vị trí', value: (row: Equipment) => row.location ?? '' },
        { header: 'Nhà cung cấp', value: (row: Equipment) => row.supplier ?? '' },
        { header: 'Ngày nhập kho', value: (row: Equipment) => formatDate(row.receivedAt) },
        { header: 'Nguyên giá (VND)', value: (row: Equipment) => row.price ?? 0 },
      ],
      rows,
    );
  };

  return (
    <>
      <PageHeader
        title="Danh sách trang thiết bị"
        description="Toàn bộ thiết bị điện dân dụng và thiết bị kỹ thuật của Phòng Sản xuất. Thiết bị không bị xóa cứng — chỉ chuyển trạng thái “Đã thanh lý” để giữ lịch sử."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Thiết bị' }]}
        actions={
          can('report.export') ? (
            <Button variant="secondary" onClick={handleExport}>
              ⬇ Xuất Excel
            </Button>
          ) : undefined
        }
      />

      <Card title="Bộ lọc" description="Kết hợp nhiều điều kiện để tra cứu nhanh thiết bị cần tìm.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nhóm thiết bị" htmlFor="filter-group">
            <Select id="filter-group" value={group} onChange={(e) => setGroup(e.target.value)}>
              <option value="">Tất cả nhóm</option>
              <option value="DIEN_DAN_DUNG">Thiết bị điện dân dụng</option>
              <option value="KY_THUAT">Thiết bị kỹ thuật</option>
            </Select>
          </Field>
          <Field label="Loại thiết bị" htmlFor="filter-category">
            <Select
              id="filter-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Tất cả loại</option>
              {state.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Trạng thái thiết bị" htmlFor="filter-status">
            <Select
              id="filter-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EquipmentStatus | '')}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(EQUIPMENT_STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Người đang giữ" htmlFor="filter-holder">
            <Select id="filter-holder" value={holderId} onChange={(e) => setHolderId(e.target.value)}>
              <option value="">Tất cả</option>
              <option value="NONE">Đang ở kho (không ai giữ)</option>
              {state.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Card>

      <div className="mt-4">
        <Card title={`Kết quả (${rows.length} thiết bị)`}>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.id}
            searchable={(row) =>
              `${row.code} ${row.name} ${row.serial ?? ''} ${row.supplier ?? ''} ${getUserName(
                state,
                row.holderId,
              )}`
            }
            searchPlaceholder="Tìm theo mã, tên, serial, nhà cung cấp..."
            pageSize={10}
            emptyTitle="Không tìm thấy thiết bị phù hợp"
            emptyDescription="Hãy thử nới lỏng điều kiện lọc hoặc xóa từ khóa tìm kiếm."
            onRowClick={(row) => navigate(`/thiet-bi/${row.id}`)}
          />
        </Card>
      </div>
    </>
  );
}
