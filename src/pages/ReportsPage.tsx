/**
 * UC-07: Bao cao, thong ke.
 *  - Ton kho theo loai thiet bi (dinh muc Min/Max)
 *  - Thiet bi dang cho muon (kem canh bao qua han)
 *  - Thiet bi hong / cho sua chua / cho thanh ly
 *  - Lich su theo thiet bi va theo nguoi dung
 * Ho tro xuat Excel (.xls) va xuat PDF (qua cua so in cua trinh duyet).
 */
import { useMemo, useState } from 'react';
import type { Equipment, Transaction } from '@/types';
import { EQUIPMENT_STATUS, TRANSACTION_TYPE_LABELS } from '@/lib/labels';
import {
  documentHeader,
  escapeHtml,
  exportExcel,
  formatCurrency,
  formatDate,
  formatDateTime,
  printDocument,
} from '@/lib/utils';
import { useApp } from '@/data/store';
import {
  borrowedEquipment,
  equipmentTimeline,
  getUserName,
  overdueBorrows,
  stockByCategory,
} from '@/services/selectors';
import { Badge, Button, Card, Field, PageHeader, Select, StatCard } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ConditionBadge, EquipmentStatusBadge, OverdueBadge } from '@/components/StatusBadges';

type ReportTab = 'TON_KHO' | 'DANG_MUON' | 'HONG' | 'LICH_SU_THIET_BI' | 'LICH_SU_NGUOI_DUNG';

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'TON_KHO', label: 'Tồn kho theo loại' },
  { key: 'DANG_MUON', label: 'Thiết bị đang cho mượn' },
  { key: 'HONG', label: 'Thiết bị hỏng / chờ xử lý' },
  { key: 'LICH_SU_THIET_BI', label: 'Lịch sử theo thiết bị' },
  { key: 'LICH_SU_NGUOI_DUNG', label: 'Lịch sử theo người dùng' },
];

export function ReportsPage(): JSX.Element {
  const { state, can } = useApp();
  const [tab, setTab] = useState<ReportTab>('TON_KHO');
  const [equipmentId, setEquipmentId] = useState(state.equipment[0]?.id ?? '');
  const [userId, setUserId] = useState(state.users[0]?.id ?? '');

  const stock = stockByCategory(state);
  const borrowed = borrowedEquipment(state);
  const overdue = overdueBorrows(state);
  const broken = state.equipment.filter((e) =>
    ['CHO_SUA_CHUA', 'DANG_SUA', 'HONG_CHO_THANH_LY'].includes(e.status),
  );

  const timeline = useMemo(
    () => (equipmentId ? equipmentTimeline(state, equipmentId) : []),
    [state, equipmentId],
  );

  const userTransactions: Transaction[] = useMemo(
    () =>
      state.transactions
        .filter(
          (t) =>
            t.toUserId === userId || t.fromUserId === userId || t.performedById === userId,
        )
        .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()),
    [state.transactions, userId],
  );

  const exportable = can('report.export');
  const currentUserName = getUserName(state, userId);

  const exportCurrentTab = (): void => {
    if (tab === 'TON_KHO') {
      exportExcel(
        'bao-cao-ton-kho-indruino.xls',
        'BÁO CÁO TỒN KHO THEO LOẠI THIẾT BỊ — PHÒNG SẢN XUẤT',
        [
          { header: 'Loại thiết bị', value: (r) => r.category.name },
          { header: 'Nhóm', value: (r) => (r.category.group === 'DIEN_DAN_DUNG' ? 'Điện dân dụng' : 'Kỹ thuật') },
          { header: 'Đơn vị', value: (r) => r.category.unit },
          { header: 'Tổng đang quản lý', value: (r) => r.total },
          { header: 'Khả dụng', value: (r) => r.available },
          { header: 'Đang mượn', value: (r) => r.borrowed },
          { header: 'Hỏng / sửa chữa', value: (r) => r.broken },
          { header: 'Min', value: (r) => r.category.minStock },
          { header: 'Max', value: (r) => r.category.maxStock },
          {
            header: 'Cảnh báo',
            value: (r) => (r.alert === 'low' ? 'Thấp hơn Min' : r.alert === 'high' ? 'Vượt Max' : 'Trong định mức'),
          },
        ],
        stock,
      );
      return;
    }
    if (tab === 'DANG_MUON') {
      exportExcel(
        'bao-cao-thiet-bi-dang-muon.xls',
        'BÁO CÁO THIẾT BỊ ĐANG CHO MƯỢN — PHÒNG SẢN XUẤT',
        [
          { header: 'Mã thiết bị', value: (e: Equipment) => e.code },
          { header: 'Tên thiết bị', value: (e: Equipment) => e.name },
          { header: 'Người giữ', value: (e: Equipment) => getUserName(state, e.holderId) },
          { header: 'Tình trạng', value: (e: Equipment) => e.condition },
          { header: 'Vị trí', value: (e: Equipment) => e.location ?? '' },
        ],
        borrowed,
      );
      return;
    }
    if (tab === 'HONG') {
      exportExcel(
        'bao-cao-thiet-bi-hu-hong.xls',
        'BÁO CÁO THIẾT BỊ HỎNG / CHỜ XỬ LÝ',
        [
          { header: 'Mã thiết bị', value: (e: Equipment) => e.code },
          { header: 'Tên thiết bị', value: (e: Equipment) => e.name },
          { header: 'Trạng thái', value: (e: Equipment) => EQUIPMENT_STATUS[e.status].label },
          { header: 'Tình trạng', value: (e: Equipment) => e.condition },
          { header: 'Nguyên giá', value: (e: Equipment) => e.price ?? 0 },
          { header: 'Vị trí', value: (e: Equipment) => e.location ?? '' },
        ],
        broken,
      );
      return;
    }
    exportExcel(
      tab === 'LICH_SU_THIET_BI' ? 'lich-su-thiet-bi-indruino.xls' : 'lich-su-nguoi-dung-indruino.xls',
      tab === 'LICH_SU_THIET_BI'
        ? 'LỊCH SỬ VÒNG ĐỜI THIẾT BỊ'
        : 'LỊCH SỬ GIAO DỊCH THEO NGƯỜI DÙNG',
      [
        { header: 'Mã giao dịch', value: (t: Transaction) => t.code },
        { header: 'Loại', value: (t: Transaction) => TRANSACTION_TYPE_LABELS[t.type] },
        {
          header: 'Thiết bị',
          value: (t: Transaction) => state.equipment.find((e) => e.id === t.equipmentId)?.code ?? '',
        },
        { header: 'Người thực hiện', value: (t: Transaction) => getUserName(state, t.performedById) },
        { header: 'Người giao', value: (t: Transaction) => getUserName(state, t.fromUserId) },
        { header: 'Người nhận', value: (t: Transaction) => getUserName(state, t.toUserId) },
        { header: 'Thời gian', value: (t: Transaction) => formatDateTime(t.at) },
        { header: 'Ghi chú', value: (t: Transaction) => t.note ?? '' },
      ],
      userTransactions,
    );
  };

  /** Xuat PDF bao cao dang xem (qua cua so in cua trinh duyet). */
  const printCurrentTab = (): void => {
    let title = 'Báo cáo tồn kho thiết bị';
    let body = '';

    if (tab === 'TON_KHO') {
      title = 'Báo cáo tồn kho theo loại thiết bị';
      body = `<table>
        <thead><tr><th>Loại thiết bị</th><th>Nhóm</th><th>Tổng</th><th>Khả dụng</th>
        <th>Đang mượn</th><th>Hỏng/sửa</th><th>Min/Max</th><th>Cảnh báo</th></tr></thead>
        <tbody>${stock
          .map(
            (row) => `<tr>
            <td>${escapeHtml(row.category.name)}</td>
            <td>${row.category.group === 'DIEN_DAN_DUNG' ? 'Điện dân dụng' : 'Kỹ thuật'}</td>
            <td class="center">${row.total}</td>
            <td class="center">${row.available}</td>
            <td class="center">${row.borrowed}</td>
            <td class="center">${row.broken}</td>
            <td class="center">${row.category.minStock}/${row.category.maxStock}</td>
            <td>${
              row.alert === 'low' ? 'Thấp hơn Min' : row.alert === 'high' ? 'Vượt Max' : 'Trong định mức'
            }</td>
          </tr>`,
          )
          .join('')}</tbody></table>`;
    } else if (tab === 'DANG_MUON') {
      title = 'Báo cáo thiết bị đang cho mượn';
      body = `<p>Tổng số thiết bị đang cho mượn: <strong>${borrowed.length}</strong>. Số phiếu quá hạn: <strong>${overdue.length}</strong>.</p>
        <table>
        <thead><tr><th>Mã thiết bị</th><th>Tên thiết bị</th><th>Người giữ</th><th>Tình trạng</th><th>Vị trí</th></tr></thead>
        <tbody>${borrowed
          .map(
            (e) => `<tr><td>${escapeHtml(e.code)}</td><td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(getUserName(state, e.holderId))}</td><td>${escapeHtml(e.condition)}</td>
            <td>${escapeHtml(e.location ?? '')}</td></tr>`,
          )
          .join('')}</tbody></table>`;
    } else if (tab === 'HONG') {
      title = 'Báo cáo thiết bị hỏng / chờ xử lý';
      body = `<table>
        <thead><tr><th>Mã thiết bị</th><th>Tên thiết bị</th><th>Trạng thái</th><th>Tình trạng</th>
        <th>Nguyên giá</th><th>Vị trí</th></tr></thead>
        <tbody>${broken
          .map(
            (e) => `<tr><td>${escapeHtml(e.code)}</td><td>${escapeHtml(e.name)}</td>
            <td>${escapeHtml(EQUIPMENT_STATUS[e.status].label)}</td><td>${escapeHtml(e.condition)}</td>
            <td>${escapeHtml(formatCurrency(e.price))}</td><td>${escapeHtml(e.location ?? '')}</td></tr>`,
          )
          .join('')}</tbody></table>`;
    } else if (tab === 'LICH_SU_THIET_BI') {
      const equipment = state.equipment.find((e) => e.id === equipmentId);
      title = `Lịch sử vòng đời thiết bị ${equipment?.code ?? ''}`;
      body = `<p>Thiết bị: <strong>${escapeHtml(equipment?.code ?? '')}</strong> — ${escapeHtml(
        equipment?.name ?? '',
      )}. Người chịu trách nhiệm hiện tại: ${escapeHtml(getUserName(state, equipment?.holderId))}.</p>
        <table>
        <thead><tr><th>Thời gian</th><th>Sự kiện</th><th>Người thực hiện</th><th>Chi tiết</th></tr></thead>
        <tbody>${timeline
          .map(
            (entry) => `<tr><td>${escapeHtml(formatDateTime(entry.at))}</td>
            <td>${escapeHtml(entry.title)}</td><td>${escapeHtml(entry.actorName)}</td>
            <td>${escapeHtml(entry.description)}</td></tr>`,
          )
          .join('')}</tbody></table>`;
    } else {
      title = `Lịch sử giao dịch của ${currentUserName}`;
      body = `<p>Người dùng: <strong>${escapeHtml(currentUserName)}</strong> — Số giao dịch: ${userTransactions.length}.</p>
        <table>
        <thead><tr><th>Mã GD</th><th>Loại</th><th>Thiết bị</th><th>Người thực hiện</th><th>Thời gian</th><th>Ghi chú</th></tr></thead>
        <tbody>${userTransactions
          .map(
            (t) => `<tr><td>${escapeHtml(t.code)}</td><td>${escapeHtml(
              TRANSACTION_TYPE_LABELS[t.type],
            )}</td><td>${escapeHtml(
              state.equipment.find((e) => e.id === t.equipmentId)?.code ?? '',
            )}</td><td>${escapeHtml(getUserName(state, t.performedById))}</td>
            <td>${escapeHtml(formatDateTime(t.at))}</td><td>${escapeHtml(t.note ?? '')}</td></tr>`,
          )
          .join('')}</tbody></table>`;
    }

    printDocument(
      title,
      `${documentHeader('Báo cáo – thống kê trang thiết bị')}
      <h1>${escapeHtml(title)}</h1>
      <p class="center muted">Lập ngày ${escapeHtml(formatDate(new Date().toISOString()))} — Phòng Sản xuất, Công ty Indruino</p>
      ${body}
      <div class="sign">
        <div><p class="role">Người lập báo cáo</p><p class="hint">(Ký, ghi rõ họ tên)</p></div>
        <div><p class="role">Quản lý Phòng Sản xuất</p><p class="hint">(Ký, ghi rõ họ tên)</p></div>
      </div>`,
    );
  };

  return (
    <>
      <PageHeader
        title="Báo cáo – thống kê"
        description="Tổng hợp tình hình trang thiết bị Phòng Sản xuất: tồn kho, thiết bị đang cho mượn, thiết bị hỏng và lịch sử theo thiết bị/người dùng."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Báo cáo' }]}
        actions={
          exportable ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportCurrentTab}>
                ⬇ Xuất Excel
              </Button>
              <Button variant="secondary" onClick={printCurrentTab}>
                🖨 Xuất PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tổng thiết bị đang quản lý"
          value={state.equipment.filter((e) => e.status !== 'DA_THANH_LY').length}
        />
        <StatCard label="Đang cho mượn" value={borrowed.length} tone="info" />
        <StatCard
          label="Phiếu quá hạn trả"
          value={overdue.length}
          tone={overdue.length ? 'danger' : 'success'}
        />
        <StatCard
          label="Hỏng / chờ xử lý"
          value={broken.length}
          tone={broken.length ? 'warning' : 'success'}
        />
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <Button
            key={item.key}
            size="sm"
            variant={tab === item.key ? 'primary' : 'secondary'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === 'TON_KHO' && (
          <Card title="Tồn kho theo loại thiết bị (định mức Min/Max)">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200 text-sm">
                <thead className="bg-ink-50">
                  <tr>
                    {[
                      'Loại thiết bị',
                      'Nhóm',
                      'Tổng',
                      'Khả dụng',
                      'Đang mượn',
                      'Hỏng/sửa',
                      'Min/Max',
                      'Cảnh báo',
                    ].map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {stock.map((row) => (
                    <tr key={row.category.id} className="hover:bg-navy-50/60">
                      <td className="px-3 py-2.5 font-medium text-ink-800">{row.category.name}</td>
                      <td className="px-3 py-2.5 text-[12px] text-ink-600">
                        {row.category.group === 'DIEN_DAN_DUNG' ? 'Điện dân dụng' : 'Kỹ thuật'}
                      </td>
                      <td className="px-3 py-2.5">{row.total}</td>
                      <td className="px-3 py-2.5 font-semibold text-emerald-700">{row.available}</td>
                      <td className="px-3 py-2.5">{row.borrowed}</td>
                      <td className="px-3 py-2.5">{row.broken}</td>
                      <td className="px-3 py-2.5 text-ink-600">
                        {row.category.minStock} / {row.category.maxStock}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.alert === 'low' ? (
                          <Badge tone="danger">Thấp hơn Min</Badge>
                        ) : row.alert === 'high' ? (
                          <Badge tone="warning">Vượt Max</Badge>
                        ) : (
                          <Badge tone="success">Trong định mức</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tab === 'DANG_MUON' && (
          <Card
            title={`Thiết bị đang cho mượn (${borrowed.length})`}
            description={`Trong đó có ${overdue.length} phiếu quá hạn trả cần xử lý ngay.`}
          >
            <DataTable
              columns={[
                {
                  key: 'code',
                  header: 'Mã thiết bị',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-navy-800">{row.code}</p>
                      <p className="text-[11px] text-ink-500">{row.name}</p>
                    </div>
                  ),
                  sortValue: (row) => row.code,
                },
                {
                  key: 'holder',
                  header: 'Người giữ',
                  render: (row) => getUserName(state, row.holderId),
                  sortValue: (row) => getUserName(state, row.holderId),
                },
                {
                  key: 'due',
                  header: 'Hạn trả',
                  render: (row) => {
                    const request = state.borrowRequests.find(
                      (r) => r.status === 'DA_BAN_GIAO' && r.equipmentIds.includes(row.id),
                    );
                    if (!request) return <span className="text-ink-400">—</span>;
                    const late = overdue.find((o) => o.request.id === request.id);
                    return late ? (
                      <OverdueBadge days={late.days} />
                    ) : (
                      <span className="text-[12px]">{formatDateTime(request.expectedReturnAt)}</span>
                    );
                  },
                },
                {
                  key: 'condition',
                  header: 'Tình trạng',
                  render: (row) => <ConditionBadge condition={row.condition} />,
                },
                {
                  key: 'location',
                  header: 'Vị trí',
                  hideOnMobile: true,
                  render: (row) => row.location ?? '—',
                },
              ]}
              rows={borrowed}
              rowKey={(row) => row.id}
              searchable={(row) => `${row.code} ${row.name} ${getUserName(state, row.holderId)}`}
              emptyTitle="Không có thiết bị nào đang cho mượn"
            />
          </Card>
        )}

        {tab === 'HONG' && (
          <Card
            title={`Thiết bị hỏng / chờ sửa chữa / chờ thanh lý (${broken.length})`}
            description="Danh sách cần Kỹ thuật viên xử lý hoặc Quản lý quyết định thanh lý."
          >
            <DataTable
              columns={[
                {
                  key: 'code',
                  header: 'Mã thiết bị',
                  render: (row) => (
                    <div>
                      <p className="font-semibold text-navy-800">{row.code}</p>
                      <p className="text-[11px] text-ink-500">{row.name}</p>
                    </div>
                  ),
                  sortValue: (row) => row.code,
                },
                {
                  key: 'status',
                  header: 'Trạng thái',
                  render: (row) => <EquipmentStatusBadge status={row.status} />,
                },
                {
                  key: 'condition',
                  header: 'Tình trạng',
                  render: (row) => <ConditionBadge condition={row.condition} />,
                },
                {
                  key: 'price',
                  header: 'Nguyên giá',
                  align: 'right',
                  render: (row) => formatCurrency(row.price),
                  sortValue: (row) => row.price ?? 0,
                },
                {
                  key: 'location',
                  header: 'Vị trí',
                  hideOnMobile: true,
                  render: (row) => row.location ?? '—',
                },
              ]}
              rows={broken}
              rowKey={(row) => row.id}
              searchable={(row) => `${row.code} ${row.name}`}
              emptyTitle="Không có thiết bị hỏng"
              emptyDescription="Tất cả thiết bị đang hoạt động tốt hoặc đang được sử dụng."
            />
          </Card>
        )}

        {tab === 'LICH_SU_THIET_BI' && (
          <Card
            title="Lịch sử vòng đời theo thiết bị"
            description="Nhập kho → mượn/trả → sửa chữa → kiểm kê → thanh lý, kèm người chịu trách nhiệm từng giai đoạn."
          >
            <Field label="Chọn thiết bị" htmlFor="report-equipment" className="max-w-md">
              <Select
                id="report-equipment"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
              >
                {state.equipment.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </Select>
            </Field>

            <ol className="mt-4 space-y-3 border-l border-ink-200 pl-5">
              {timeline.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full bg-navy-500 ring-4 ring-white"
                  />
                  <p className="text-sm font-semibold text-ink-800">{entry.title}</p>
                  <p className="text-[11px] text-ink-500">
                    {formatDateTime(entry.at)} · {entry.actorName}
                  </p>
                  <p className="text-xs text-ink-600">{entry.description}</p>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {tab === 'LICH_SU_NGUOI_DUNG' && (
          <Card
            title="Lịch sử giao dịch theo người dùng"
            description="Bao gồm giao dịch người dùng thực hiện, nhận hoặc giao thiết bị."
          >
            <Field label="Chọn người dùng" htmlFor="report-user" className="max-w-md">
              <Select id="report-user" value={userId} onChange={(e) => setUserId(e.target.value)}>
                {state.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.fullName} ({user.username})
                  </option>
                ))}
              </Select>
            </Field>

            <div className="mt-4">
              <DataTable
                columns={[
                  {
                    key: 'code',
                    header: 'Mã giao dịch',
                    render: (row: Transaction) => (
                      <div>
                        <p className="font-semibold text-navy-800">{row.code}</p>
                        <p className="text-[11px] text-ink-500">
                          {TRANSACTION_TYPE_LABELS[row.type]}
                        </p>
                      </div>
                    ),
                    sortValue: (row: Transaction) => row.code,
                  },
                  {
                    key: 'equipment',
                    header: 'Thiết bị',
                    render: (row: Transaction) => {
                      const item = state.equipment.find((e) => e.id === row.equipmentId);
                      return `${item?.code ?? ''} — ${item?.name ?? ''}`;
                    },
                  },
                  {
                    key: 'at',
                    header: 'Thời gian',
                    render: (row: Transaction) => formatDateTime(row.at),
                    sortValue: (row: Transaction) => row.at,
                  },
                  {
                    key: 'parties',
                    header: 'Người giao / nhận',
                    hideOnMobile: true,
                    render: (row: Transaction) =>
                      `${getUserName(state, row.fromUserId)} → ${getUserName(state, row.toUserId)}`,
                  },
                  {
                    key: 'note',
                    header: 'Ghi chú',
                    hideOnMobile: true,
                    render: (row: Transaction) => (
                      <span className="text-[11px] text-ink-600">{row.note ?? '—'}</span>
                    ),
                  },
                ]}
                rows={userTransactions}
                rowKey={(row: Transaction) => row.id}
                emptyTitle="Người dùng này chưa có giao dịch nào"
              />
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
