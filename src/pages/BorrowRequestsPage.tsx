/**
 * UC-13: Gui yeu cau muon/tra thiet bi.
 * UC-05: Quan ly duyet / tu choi yeu cau (BAT BUOC ghi ly do khi tu choi).
 */
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { BorrowRequest, BorrowStatus, BorrowType, Equipment } from '@/types';
import { BORROW_STATUS, BORROW_TYPE_LABELS } from '@/lib/labels';
import { formatDateTime, isOverdue, overdueDays, toDateTimeInput } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getUserName } from '@/services/selectors';
import {
  Button,
  Card,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { BorrowStatusBadge, OverdueBadge } from '@/components/StatusBadges';
import { useAction } from '@/hooks/useAction';

export function BorrowRequestsPage(): JSX.Element {
  const { state, currentUser, can } = useApp();
  const action = useAction();
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<BorrowStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<BorrowType | ''>('');
  const [createOpen, setCreateOpen] = useState(Boolean(searchParams.get('code')));
  const [detail, setDetail] = useState<BorrowRequest | null>(null);
  const [confirmApprove, setConfirmApprove] = useState<BorrowRequest | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BorrowRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<{
    type: BorrowType;
    reason: string;
    expectedReturnAt: string;
  }>({
    type: 'MUON',
    reason: '',
    expectedReturnAt: toDateTimeInput(new Date(Date.now() + 3 * 86_400_000)),
  });
  const [selected, setSelected] = useState<string[]>(() => {
    const code = searchParams.get('code');
    if (!code) return [];
    const found = state.equipment.find((e) => e.code.toUpperCase() === code.toUpperCase());
    return found ? [found.id] : [];
  });

  const userId = currentUser?.id ?? '';
  const canViewAll = can('borrow.viewAll');
  const canApprove = can('borrow.approve');

  /** Thiet bi co the chon khi tao yeu cau (phu thuoc loai yeu cau). */
  const selectableEquipment: Equipment[] = useMemo(() => {
    if (form.type === 'MUON') {
      return state.equipment.filter((e) => e.status === 'SAN_SANG' && !e.holderId);
    }
    return state.equipment.filter((e) => e.holderId === userId && e.status === 'DANG_MUON');
  }, [state.equipment, form.type, userId]);

  const requests = useMemo(
    () =>
      state.borrowRequests
        .filter((r) => (canViewAll ? true : r.requesterId === userId))
        .filter((r) => (statusFilter ? r.status === statusFilter : true))
        .filter((r) => (typeFilter ? r.type === typeFilter : true))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.borrowRequests, statusFilter, typeFilter, canViewAll, userId],
  );

  if (!currentUser) return <></>;

  const closeCreate = (): void => {
    setCreateOpen(false);
    if (searchParams.get('code')) {
      searchParams.delete('code');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const submitCreate = (): void => {
    const result = action('createBorrowRequest', {
      type: form.type,
      equipmentIds: selected,
      reason: form.reason,
      expectedReturnAt: new Date(form.expectedReturnAt).toISOString(),
    });
    if (result.ok) {
      setSelected([]);
      setForm({ ...form, reason: '' });
      closeCreate();
    }
  };

  const submitReject = (): void => {
    if (!rejectTarget) return;
    const result = action('rejectBorrowRequest', { id: rejectTarget.id, reason: rejectReason });
    if (result.ok) {
      setRejectTarget(null);
      setRejectReason('');
      setDetail(null);
    }
  };

  const toggleEquipment = (id: string): void => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const columns: Column<BorrowRequest>[] = [
    {
      key: 'code',
      header: 'Mã phiếu',
      render: (row) => (
        <div>
          <p className="font-semibold text-navy-800">{row.code}</p>
          <p className="text-[11px] text-ink-500">{BORROW_TYPE_LABELS[row.type]}</p>
        </div>
      ),
      sortValue: (row) => row.code,
    },
    {
      key: 'requester',
      header: 'Người gửi',
      render: (row) => (
        <div>
          <p className="font-medium text-ink-800">{getUserName(state, row.requesterId)}</p>
          <p className="text-[11px] text-ink-500">Gửi lúc {formatDateTime(row.createdAt)}</p>
        </div>
      ),
      sortValue: (row) => getUserName(state, row.requesterId),
    },
    {
      key: 'equipment',
      header: 'Thiết bị',
      render: (row) => (
        <div className="space-y-0.5">
          {row.equipmentIds.slice(0, 3).map((id) => {
            const item = state.equipment.find((e) => e.id === id);
            return (
              <p key={id} className="text-[11px] text-ink-700">
                {item?.code} — {item?.name}
              </p>
            );
          })}
          {row.equipmentIds.length > 3 && (
            <p className="text-[11px] text-ink-500">+{row.equipmentIds.length - 3} thiết bị khác</p>
          )}
        </div>
      ),
    },
    {
      key: 'dueAt',
      header: 'Hạn trả dự kiến',
      hideOnMobile: true,
      render: (row) =>
        row.type === 'MUON' ? (
          <div className="space-y-1">
            <p className="text-ink-700">{formatDateTime(row.expectedReturnAt)}</p>
            {row.status === 'DA_BAN_GIAO' && isOverdue(row.expectedReturnAt) && (
              <OverdueBadge days={overdueDays(row.expectedReturnAt)} />
            )}
          </div>
        ) : (
          <span className="text-ink-500">Yêu cầu trả thiết bị</span>
        ),
      sortValue: (row) => row.expectedReturnAt,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => <BorrowStatusBadge status={row.status} />,
      sortValue: (row) => BORROW_STATUS[row.status].label,
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (row) => (
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="secondary" onClick={() => setDetail(row)}>
            Chi tiết
          </Button>
          {canApprove && row.status === 'CHO_DUYET' && (
            <>
              <Button size="sm" onClick={() => setConfirmApprove(row)}>
                Duyệt
              </Button>
              <Button size="sm" variant="danger" onClick={() => setRejectTarget(row)}>
                Từ chối
              </Button>
            </>
          )}
          {row.requesterId === currentUser.id && ['CHO_DUYET', 'DA_DUYET'].includes(row.status) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                action('cancelBorrowRequest', {
                  id: row.id,
                  reason: 'Nhân viên chủ động hủy yêu cầu.',
                })
              }
            >
              Hủy
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Yêu cầu mượn – trả thiết bị"
        description={
          canViewAll
            ? 'Theo dõi và xử lý toàn bộ yêu cầu mượn/trả của Phòng Sản xuất. Khi từ chối bắt buộc ghi rõ lý do.'
            : 'Gửi yêu cầu mượn thiết bị và theo dõi trạng thái xử lý của Quản lý Phòng Sản xuất.'
        }
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Yêu cầu mượn/trả' }]}
        actions={
          can('borrow.create') ? (
            <Button onClick={() => setCreateOpen(true)}>＋ Tạo yêu cầu mượn/trả</Button>
          ) : undefined
        }
      />

      <Card title="Bộ lọc yêu cầu">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Trạng thái" htmlFor="req-status">
            <Select
              id="req-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BorrowStatus | '')}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(BORROW_STATUS).map(([key, value]) => (
                <option key={key} value={key}>
                  {value.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Loại yêu cầu" htmlFor="req-type">
            <Select
              id="req-type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as BorrowType | '')}
            >
              <option value="">Tất cả loại</option>
              <option value="MUON">Yêu cầu mượn</option>
              <option value="TRA">Yêu cầu trả</option>
            </Select>
          </Field>
        </div>
      </Card>

      <div className="mt-4">
        <Card title={`Danh sách yêu cầu (${requests.length})`}>
          <DataTable
            columns={columns}
            rows={requests}
            rowKey={(row) => row.id}
            searchable={(row) =>
              `${row.code} ${getUserName(state, row.requesterId)} ${row.reason}`
            }
            searchPlaceholder="Tìm theo mã phiếu, người gửi, lý do..."
            pageSize={10}
            emptyTitle="Chưa có yêu cầu nào"
            emptyDescription="Nhấn “Tạo yêu cầu mượn/trả” để gửi yêu cầu đầu tiên tới Quản lý Phòng Sản xuất."
          />
        </Card>
      </div>

      {/* --------------------------- Tao yeu cau muon / tra --------------------------- */}
      <Modal
        open={createOpen}
        title="Tạo yêu cầu mượn / trả thiết bị"
        description="Chỉ thiết bị “Sẵn sàng” mới được đưa vào yêu cầu mượn; yêu cầu trả chỉ áp dụng cho thiết bị bạn đang giữ."
        onClose={closeCreate}
        footer={
          <>
            <Button variant="secondary" onClick={closeCreate}>
              Hủy bỏ
            </Button>
            <Button onClick={submitCreate} disabled={selected.length === 0}>
              Gửi yêu cầu ({selected.length} thiết bị)
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Loại yêu cầu" htmlFor="create-type" required>
            <Select
              id="create-type"
              value={form.type}
              onChange={(e) => {
                setForm({ ...form, type: e.target.value as BorrowType });
                setSelected([]);
              }}
            >
              <option value="MUON">Yêu cầu mượn thiết bị</option>
              <option value="TRA">Yêu cầu trả thiết bị</option>
            </Select>
          </Field>

          <Field
            label="Lý do sử dụng"
            htmlFor="create-reason"
            required
            hint="Tối thiểu 10 ký tự, ghi rõ mục đích và tổ/khu vực sử dụng."
          >
            <Textarea
              id="create-reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="VD: Phục vụ lắp đặt hệ thống chiếu sáng khu vực đóng gói."
            />
          </Field>

          {form.type === 'MUON' && (
            <Field label="Thời gian dự kiến trả" htmlFor="create-due" required>
              <Input
                id="create-due"
                type="datetime-local"
                value={form.expectedReturnAt}
                onChange={(e) => setForm({ ...form, expectedReturnAt: e.target.value })}
              />
            </Field>
          )}

          <div>
            <p className="mb-1 text-xs font-semibold text-ink-700">
              Chọn thiết bị <span className="text-red-600">*</span>
            </p>
            {selectableEquipment.length === 0 ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {form.type === 'MUON'
                  ? 'Hiện không có thiết bị nào ở trạng thái “Sẵn sàng” để mượn.'
                  : 'Bạn không có thiết bị nào đang giữ để gửi yêu cầu trả.'}
              </p>
            ) : (
              <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-md border border-ink-200 p-2">
                {selectableEquipment.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-ink-50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-ink-300 text-navy-700 focus:ring-navy-300"
                      checked={selected.includes(item.id)}
                      onChange={() => toggleEquipment(item.id)}
                    />
                    <span>
                      <span className="block text-sm font-medium text-ink-800">
                        {item.code} — {item.name}
                      </span>
                      <span className="block text-[11px] text-ink-500">
                        {state.categories.find((c) => c.id === item.categoryId)?.name} ·{' '}
                        {item.location ?? '—'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* --------------------------- Xac nhan duyet (khong the hoan tac) --------------------------- */}
      <ConfirmDialog
        open={Boolean(confirmApprove)}
        tone="primary"
        title={`Duyệt yêu cầu ${confirmApprove?.code ?? ''}`}
        message={`Bạn xác nhận duyệt yêu cầu ${
          confirmApprove ? BORROW_TYPE_LABELS[confirmApprove.type].toLowerCase() : ''
        } của ${
          confirmApprove ? getUserName(state, confirmApprove.requesterId) : ''
        }? Sau khi duyệt, nhân viên có thể quét mã QR để nhận/trả thiết bị.`}
        confirmLabel="Duyệt yêu cầu"
        onCancel={() => setConfirmApprove(null)}
        onConfirm={() => {
          if (!confirmApprove) return;
          action('approveBorrowRequest', { id: confirmApprove.id });
          setConfirmApprove(null);
        }}
      />

      {/* --------------------------- Tu choi (bat buoc ly do) --------------------------- */}
      <Modal
        open={Boolean(rejectTarget)}
        title={`Từ chối yêu cầu ${rejectTarget?.code ?? ''}`}
        description="Bắt buộc ghi rõ lý do từ chối để nhân viên hiểu và xử lý lại."
        size="sm"
        onClose={() => setRejectTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>
              Hủy bỏ
            </Button>
            <Button variant="danger" onClick={submitReject}>
              Xác nhận từ chối
            </Button>
          </>
        }
      >
        <Field
          label="Lý do từ chối"
          htmlFor="reject-reason"
          required
          hint="Tối thiểu 10 ký tự. Lý do sẽ được gửi tới người gửi yêu cầu và lưu vào nhật ký hoạt động."
        >
          <Textarea
            id="reject-reason"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="VD: Thiết bị đã được điều chuyển cho kế hoạch kiểm kê định kỳ."
          />
        </Field>
      </Modal>

      {/* --------------------------- Chi tiet yeu cau --------------------------- */}
      <Modal
        open={Boolean(detail)}
        title={`Chi tiết yêu cầu ${detail?.code ?? ''}`}
        onClose={() => setDetail(null)}
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setDetail(null)}>
            Đóng
          </Button>
        }
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                <span className="text-ink-500">Loại yêu cầu: </span>
                {BORROW_TYPE_LABELS[detail.type]}
              </p>
              <p>
                <span className="text-ink-500">Trạng thái: </span>
                <BorrowStatusBadge status={detail.status} />
              </p>
              <p>
                <span className="text-ink-500">Người gửi: </span>
                {getUserName(state, detail.requesterId)}
              </p>
              <p>
                <span className="text-ink-500">Người duyệt: </span>
                {getUserName(state, detail.approverId)}
              </p>
              <p>
                <span className="text-ink-500">Gửi lúc: </span>
                {formatDateTime(detail.createdAt)}
              </p>
              <p>
                <span className="text-ink-500">Duyệt lúc: </span>
                {formatDateTime(detail.approvedAt)}
              </p>
              <p>
                <span className="text-ink-500">Dự kiến trả: </span>
                {formatDateTime(detail.expectedReturnAt)}
              </p>
              <p>
                <span className="text-ink-500">Hoàn tất: </span>
                {formatDateTime(detail.completedAt)}
              </p>
            </div>
            <p className="rounded-md bg-ink-50 px-3 py-2">
              <span className="text-ink-500">Lý do: </span>
              {detail.reason}
            </p>
            {detail.rejectReason && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                <span className="font-semibold">Lý do từ chối: </span>
                {detail.rejectReason}
              </p>
            )}
            {detail.handoverNote && (
              <p className="rounded-md border border-navy-200 bg-navy-50 px-3 py-2 text-navy-800">
                <span className="font-semibold">Ghi chú bàn giao/nhận trả: </span>
                {detail.handoverNote}
              </p>
            )}
            <div>
              <p className="mb-1 font-semibold text-ink-700">Thiết bị trong yêu cầu</p>
              <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
                {detail.equipmentIds.map((id) => {
                  const item = state.equipment.find((e) => e.id === id);
                  return (
                    <li key={id} className="flex flex-wrap justify-between gap-2 px-3 py-2">
                      <span>
                        <strong className="text-navy-800">{item?.code}</strong> — {item?.name}
                      </span>
                      <span className="text-[11px] text-ink-500">
                        Người giữ:{' '}
                        {item?.holderId ? getUserName(state, item.holderId) : 'Kho Phòng Sản xuất'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
