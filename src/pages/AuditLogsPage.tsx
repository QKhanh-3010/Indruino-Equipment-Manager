/**
 * Trang NHAT KY HOAT DONG (audit log) - CHI DOC.
 * Hien thi: ai, lam gi, tren thiet bi nao, luc nao, gia tri truoc/sau.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { AuditLog } from '@/types';
import { documentHeader, escapeHtml, exportExcel, formatDateTime, printDocument } from '@/lib/utils';
import { useApp } from '@/data/store';
import { Badge, Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';

export function AuditLogsPage(): JSX.Element {
  const { state, can } = useApp();
  const [actorId, setActorId] = useState('');
  const [entity, setEntity] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const entities = useMemo(
    () => Array.from(new Set(state.auditLogs.map((log) => log.entity))).sort(),
    [state.auditLogs],
  );

  const logs = useMemo(
    () =>
      state.auditLogs
        .filter((log) => (actorId ? log.actorId === actorId : true))
        .filter((log) => (entity ? log.entity === entity : true))
        .filter((log) => (fromDate ? new Date(log.at) >= new Date(`${fromDate}T00:00:00`) : true))
        .filter((log) => (toDate ? new Date(log.at) <= new Date(`${toDate}T23:59:59`) : true)),
    [state.auditLogs, actorId, entity, fromDate, toDate],
  );

  const exportable = can('report.export');

  const exportLogs = (): void => {
    exportExcel(
      'nhat-ky-hoat-dong-indruino.xls',
      'NHẬT KÝ HOẠT ĐỘNG HỆ THỐNG — PHÒNG SẢN XUẤT',
      [
        { header: 'Thời gian', value: (log: AuditLog) => formatDateTime(log.at) },
        { header: 'Người thực hiện', value: (log: AuditLog) => log.actorName },
        { header: 'Hành động', value: (log: AuditLog) => log.action },
        { header: 'Đối tượng', value: (log: AuditLog) => `${log.entity} (${log.entityLabel})` },
        { header: 'Giá trị trước', value: (log: AuditLog) => log.before ?? '' },
        { header: 'Giá trị sau', value: (log: AuditLog) => log.after ?? '' },
        { header: 'Chi tiết', value: (log: AuditLog) => log.detail ?? '' },
      ],
      logs,
    );
  };

  const printLogs = (): void => {
    printDocument(
      'Nhật ký hoạt động hệ thống',
      `${documentHeader('Nhật ký hoạt động (audit log)')}
      <h1>Nhật ký hoạt động hệ thống</h1>
      <p class="center muted">Trích xuất ${logs.length} bản ghi — ${escapeHtml(
        formatDateTime(new Date().toISOString()),
      )}</p>
      <table>
        <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Đối tượng</th>
        <th>Trước → Sau</th><th>Chi tiết</th></tr></thead>
        <tbody>${logs
          .map(
            (log) => `<tr>
            <td>${escapeHtml(formatDateTime(log.at))}</td>
            <td>${escapeHtml(log.actorName)}</td>
            <td>${escapeHtml(log.action)}</td>
            <td>${escapeHtml(`${log.entity} (${log.entityLabel})`)}</td>
            <td>${escapeHtml(`${log.before ?? '—'} → ${log.after ?? '—'}`)}</td>
            <td>${escapeHtml(log.detail ?? '')}</td>
          </tr>`,
          )
          .join('')}</tbody></table>
      <p class="muted">Ghi chú: nhật ký hoạt động chỉ đọc, không thể sửa hoặc xóa nhằm bảo đảm tính truy vết trách nhiệm.</p>`,
    );
  };

  const columns: Column<AuditLog>[] = [
    {
      key: 'at',
      header: 'Thời gian',
      render: (log) => <span className="text-[12px]">{formatDateTime(log.at)}</span>,
      sortValue: (log) => log.at,
    },
    {
      key: 'actor',
      header: 'Người thực hiện',
      render: (log) => (
        <span className="text-[12px] font-medium text-ink-800">{log.actorName}</span>
      ),
      sortValue: (log) => log.actorName,
    },
    {
      key: 'action',
      header: 'Hành động',
      render: (log) => (
        <div>
          <p className="text-[12px] font-semibold text-navy-800">{log.action}</p>
          <p className="text-[11px] text-ink-500">
            {log.entity}: {log.entityLabel}
          </p>
        </div>
      ),
      sortValue: (log) => log.action,
    },
    {
      key: 'change',
      header: 'Giá trị trước → sau',
      hideOnMobile: true,
      render: (log) =>
        log.before || log.after ? (
          <span className="text-[11px] text-ink-600">
            {log.before ?? '—'} <span aria-hidden="true">→</span> {log.after ?? '—'}
          </span>
        ) : (
          <span className="text-ink-400">—</span>
        ),
    },
    {
      key: 'detail',
      header: 'Chi tiết',
      render: (log) => <span className="text-[11px] text-ink-600">{log.detail ?? '—'}</span>,
    },
    {
      key: 'link',
      header: '',
      align: 'right',
      render: (log) =>
        log.entity === 'Equipment' ? (
          <Link
            to={`/thiet-bi/${log.entityId}`}
            className="text-[11px] font-semibold text-navy-700 hover:underline"
          >
            Xem thiết bị
          </Link>
        ) : null,
    },
  ];

  return (
    <>
      <PageHeader
        title="Nhật ký hoạt động (Audit log)"
        description="Ghi lại mọi thao tác quan trọng: ai làm gì, trên thiết bị nào, lúc nào và giá trị trước/sau. Nhật ký chỉ đọc, không thể sửa hoặc xóa."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Nhật ký hoạt động' }]}
        actions={
          exportable ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={exportLogs}>
                ⬇ Xuất Excel
              </Button>
              <Button variant="secondary" onClick={printLogs}>
                🖨 Xuất PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone="info">Tổng {state.auditLogs.length} bản ghi</Badge>
        <Badge tone="neutral">Chỉ đọc — không thể sửa/xóa</Badge>
      </div>

      <Card title="Bộ lọc nhật ký">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Người thực hiện" htmlFor="log-actor">
            <Select id="log-actor" value={actorId} onChange={(e) => setActorId(e.target.value)}>
              <option value="">Tất cả người dùng</option>
              {state.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Đối tượng bị tác động" htmlFor="log-entity">
            <Select id="log-entity" value={entity} onChange={(e) => setEntity(e.target.value)}>
              <option value="">Tất cả đối tượng</option>
              {entities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Từ ngày" htmlFor="log-from">
            <Input
              id="log-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </Field>
          <Field label="Đến ngày" htmlFor="log-to">
            <Input id="log-to" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="mt-4">
        <Card title={`Kết quả (${logs.length} bản ghi)`}>
          <DataTable
            columns={columns}
            rows={logs}
            rowKey={(log) => log.id}
            pageSize={15}
            searchable={(log) =>
              `${log.actorName} ${log.action} ${log.entity} ${log.entityLabel} ${log.detail ?? ''}`
            }
            searchPlaceholder="Tìm theo người thực hiện, hành động, thiết bị..."
            emptyTitle="Không có bản ghi phù hợp"
            emptyDescription="Hãy thử đổi bộ lọc hoặc khoảng thời gian khác."
          />
        </Card>
      </div>
    </>
  );
}
