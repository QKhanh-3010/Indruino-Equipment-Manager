/**
 * UC-14: Quet ma QR de BAN GIAO (muon) va NHAN TRA (co ghi nhan hu hong).
 *
 * Quy trinh:
 *  - Ban giao: yeu cau da duyet -> quet du tung tem QR -> xac nhan -> thiet bi chuyen "Dang muon".
 *  - Nhan tra: thiet bi dang muon -> quet QR -> danh dau thiet bi hu hong (neu co)
 *    -> he thong TU DONG tao phieu sua chua va chuyen sang "Cho sua chua".
 */
import { useState } from 'react';
import type { BorrowRequest, Equipment } from '@/types';
import { documentHeader, escapeHtml, formatDateTime, isOverdue, overdueDays, printDocument } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getUserName } from '@/services/selectors';
import { useToast } from '@/components/ui/Toast';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  Field,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { QrScanner } from '@/components/QrScanner';
import { OverdueBadge } from '@/components/StatusBadges';
import { useAction } from '@/hooks/useAction';

type Mode = 'BAN_GIAO' | 'NHAN_TRA';

export function HandoverPage(): JSX.Element {
  const { state } = useApp();
  const action = useAction();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('BAN_GIAO');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string[]>([]);
  const [damaged, setDamaged] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [severity, setSeverity] = useState<'HONG_NHE' | 'HONG_NANG'>('HONG_NHE');
  const [confirmOpen, setConfirmOpen] = useState(false);

  /** Danh sach yeu cau cho tung che do xu ly. */
  const handoverCandidates = state.borrowRequests.filter(
    (r) => r.type === 'MUON' && r.status === 'DA_DUYET',
  );
  const returnCandidates = state.borrowRequests.filter(
    (r) =>
      (r.type === 'MUON' && r.status === 'DA_BAN_GIAO') || (r.type === 'TRA' && r.status === 'DA_DUYET'),
  );
  const candidates = mode === 'BAN_GIAO' ? handoverCandidates : returnCandidates;
  const active = candidates.find((r) => r.id === activeId) ?? null;

  const activeEquipment: Equipment[] = active
    ? active.equipmentIds
        .map((id) => state.equipment.find((e) => e.id === id))
        .filter((e): e is Equipment => Boolean(e))
    : [];

  const reset = (): void => {
    setActiveId(null);
    setScanned([]);
    setDamaged([]);
    setNote('');
    setSeverity('HONG_NHE');
  };

  const selectRequest = (request: BorrowRequest): void => {
    setActiveId(request.id);
    setScanned([]);
    setDamaged([]);
    setNote(request.handoverNote ?? '');
  };

  /** Xu ly ma QR quet duoc: chi chap nhan ma thuoc yeu cau dang xu ly. */
  const handleDetected = (code: string): void => {
    if (!active) {
      toast.warning('Vui lòng chọn một yêu cầu trước khi quét mã QR.');
      return;
    }
    const normalized = code.trim().toUpperCase();
    const item = activeEquipment.find((e) => e.code.toUpperCase() === normalized);
    if (!item) {
      toast.error(`Mã QR "${code}" không thuộc yêu cầu ${active.code}.`);
      return;
    }
    if (scanned.includes(normalized)) {
      toast.info(`Thiết bị ${normalized} đã được quét trước đó.`);
      return;
    }
    setScanned((prev) => [...prev, normalized]);
    toast.success(`Đã ghi nhận thiết bị ${normalized} — ${item.name}.`);
  };

  const submit = (): void => {
    if (!active) return;
    if (mode === 'BAN_GIAO') {
      const result = action('handoverEquipment', {
        requestId: active.id,
        scannedCodes: scanned,
        note,
      });
      if (result.ok) reset();
      return;
    }
    const result = action('receiveReturnedEquipment', {
      requestId: active.id,
      scannedCodes: scanned,
      damagedCodes: damaged,
      note,
      severity,
    });
    if (result.ok) reset();
  };

  /** In bien ban ban giao / bien ban nhan tra (co ten nguoi giao - nguoi nhan). */
  const printMinutes = (request: BorrowRequest, title: string): void => {

    const items = request.equipmentIds
      .map((id) => state.equipment.find((e) => e.id === id))
      .filter((e): e is Equipment => Boolean(e));
    const rows = items
      .map(
        (item, index) => `<tr>
          <td class="center">${index + 1}</td>
          <td>${escapeHtml(item.code)}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.serial ?? '—')}</td>
          <td>${escapeHtml(item.location ?? '—')}</td>
          <td>${damaged.includes(item.code) ? 'Hư hỏng' : 'Bình thường'}</td>
        </tr>`,
      )
      .join('');

    printDocument(
      `${title} ${request.code}`,
      `${documentHeader(title)}
      <h1>${escapeHtml(title)}</h1>
      <p class="center muted">Số phiếu: ${escapeHtml(request.code)} — Thời điểm lập: ${escapeHtml(
        formatDateTime(new Date().toISOString()),
      )}</p>
      <h2>Thông tin bàn giao</h2>
      <table>
        <tr><th>Người giao (Phòng Sản xuất)</th><td>${escapeHtml(
          getUserName(state, request.handoverById) === '—' ? '' : getUserName(state, request.handoverById),
        )}</td></tr>
        <tr><th>Người nhận / trả thiết bị</th><td>${escapeHtml(
          getUserName(state, request.requesterId),
        )}</td></tr>
        <tr><th>Lý do sử dụng</th><td>${escapeHtml(request.reason)}</td></tr>
        <tr><th>Ghi chú</th><td>${escapeHtml(note || request.handoverNote || '—')}</td></tr>
      </table>
      <h2>Danh sách thiết bị</h2>
      <table>
        <thead><tr><th style="width:6%">TT</th><th>Mã thiết bị</th><th>Tên thiết bị</th>
        <th>Serial</th><th>Vị trí</th><th>Tình trạng khi giao/trả</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="sign">
        <div><p class="role">Người giao thiết bị</p><p class="hint">(Ký, ghi rõ họ tên)</p><br/><br/><br/>
          <p>${escapeHtml(getUserName(state, request.handoverById))}</p></div>
        <div><p class="role">Người nhận thiết bị</p><p class="hint">(Ký, ghi rõ họ tên)</p><br/><br/><br/>
          <p>${escapeHtml(getUserName(state, request.requesterId))}</p></div>
      </div>`,
    );
  };

  const allScanned = active ? scanned.length === activeEquipment.length : false;

  return (
    <>
      <PageHeader
        title="Bàn giao / nhận trả thiết bị bằng mã QR"
        description="Quét mã QR trên tem thiết bị để xác nhận bàn giao hoặc nhận trả. Hệ thống kiểm tra đúng thiết bị trong yêu cầu trước khi ghi nhận."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Bàn giao QR' }]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title="Bước 1 — Chọn yêu cầu cần xử lý"
          description="Chỉ hiển thị các yêu cầu đã được duyệt (bàn giao) hoặc đang mượn (nhận trả)."
        >
          <div className="mb-3 flex flex-wrap gap-2">
            <Button
              variant={mode === 'BAN_GIAO' ? 'primary' : 'secondary'}
              onClick={() => {
                setMode('BAN_GIAO');
                reset();
              }}
            >
              📦 Bàn giao mượn ({handoverCandidates.length})
            </Button>
            <Button
              variant={mode === 'NHAN_TRA' ? 'primary' : 'secondary'}
              onClick={() => {
                setMode('NHAN_TRA');
                reset();
              }}
            >
              📥 Nhận trả ({returnCandidates.length})
            </Button>
          </div>

          {candidates.length === 0 ? (
            <EmptyState
              icon="🗓"
              title="Không có yêu cầu nào cần xử lý"
              description={
                mode === 'BAN_GIAO'
                  ? 'Các yêu cầu mượn đã được duyệt sẽ hiển thị tại đây để bàn giao.'
                  : 'Các thiết bị đang được mượn hoặc yêu cầu trả đã duyệt sẽ hiển thị tại đây.'
              }
            />
          ) : (
            <ul className="space-y-2">
              {candidates.map((request) => {
                const isActive = request.id === activeId;
                const overdue = isOverdue(request.expectedReturnAt);
                return (
                  <li key={request.id}>
                    <button
                      type="button"
                      onClick={() => selectRequest(request)}
                      className={`w-full rounded-lg border px-3 py-2.5 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300 ${
                        isActive ? 'border-navy-400 bg-navy-50' : 'border-ink-200 hover:bg-ink-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink-800">{request.code}</span>
                        {overdue && request.status === 'DA_BAN_GIAO' && (
                          <OverdueBadge days={overdueDays(request.expectedReturnAt)} />
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-ink-600">
                        {request.type === 'MUON' ? 'Mượn' : 'Trả'} · {request.equipmentIds.length} thiết
                        bị · {getUserName(state, request.requesterId)}
                      </p>
                      <p className="text-[11px] text-ink-500">
                        Hạn trả dự kiến: {formatDateTime(request.expectedReturnAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Bước 2 — Quét mã QR và xác nhận"
          description="Có thể bật camera hoặc nhập mã thủ công. Danh sách bên dưới hiển thị tiến độ quét từng thiết bị."
        >
          {!active ? (
            <EmptyState
              icon="📷"
              title="Chưa chọn yêu cầu"
              description="Chọn một yêu cầu ở bước 1 để bắt đầu quét mã QR."
            />
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2 text-xs text-ink-600">
                Đang xử lý <strong className="text-navy-800">{active.code}</strong> —{' '}
                {getUserName(state, active.requesterId)} · Đã quét{' '}
                <strong>
                  {scanned.length}/{activeEquipment.length}
                </strong>{' '}
                thiết bị.
              </div>

              <QrScanner onDetected={handleDetected} disabled={allScanned} />

              <div>
                <p className="mb-1 text-xs font-semibold text-ink-700">
                  Danh sách thiết bị trong yêu cầu
                </p>
                <ul className="divide-y divide-ink-100 rounded-md border border-ink-200">
                  {activeEquipment.map((item) => {
                    const isScanned = scanned.includes(item.code);
                    const isDamaged = damaged.includes(item.code);
                    return (
                      <li key={item.id} className="px-3 py-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            <strong className="text-navy-800">{item.code}</strong> — {item.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {isScanned ? (
                              <Badge tone="success">Đã quét</Badge>
                            ) : (
                              <Badge tone="neutral">Chưa quét</Badge>
                            )}
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                setScanned((prev) =>
                                  prev.includes(item.code)
                                    ? prev.filter((c) => c !== item.code)
                                    : [...prev, item.code],
                                )
                              }
                            >
                              {isScanned ? 'Bỏ' : 'Đánh dấu'}
                            </Button>
                          </div>
                        </div>
                        {mode === 'NHAN_TRA' && (
                          <label className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-600">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-ink-300 text-red-600"
                              checked={isDamaged}
                              onChange={() =>
                                setDamaged((prev) =>
                                  prev.includes(item.code)
                                    ? prev.filter((c) => c !== item.code)
                                    : [...prev, item.code],
                                )
                              }
                            />
                            Thiết bị hư hỏng khi trả (hệ thống sẽ tự tạo phiếu sửa chữa)
                          </label>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {mode === 'NHAN_TRA' && damaged.length > 0 && (
                <Field
                  label="Mức độ hư hỏng"
                  htmlFor="severity"
                  hint="Hỏng nặng sẽ được đánh dấu ưu tiên cao cho Kỹ thuật viên."
                >
                  <Select
                    id="severity"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as 'HONG_NHE' | 'HONG_NANG')}
                  >
                    <option value="HONG_NHE">Hỏng nhẹ — cần kiểm tra, sửa chữa</option>
                    <option value="HONG_NANG">Hỏng nặng — ưu tiên cao</option>
                  </Select>
                </Field>
              )}

              <Field
                label="Ghi chú khi bàn giao / nhận trả"
                htmlFor="handover-note"
                hint="Ví dụ: tình trạng thiết bị, phụ kiện kèm theo, hoặc mô tả hư hỏng."
              >
                <Textarea
                  id="handover-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nhập ghi chú (không bắt buộc)..."
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Button size="lg" disabled={!allScanned} onClick={() => setConfirmOpen(true)}>
                  {allScanned
                    ? mode === 'BAN_GIAO'
                      ? '✅ Xác nhận bàn giao'
                      : '✅ Xác nhận nhận trả'
                    : `Cần quét đủ ${activeEquipment.length} thiết bị`}
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() =>
                    printMinutes(
                      active,
                      mode === 'BAN_GIAO'
                        ? 'Biên bản bàn giao thiết bị'
                        : 'Biên bản nhận trả thiết bị',
                    )
                  }
                >
                  🖨 In biên bản
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        tone={mode === 'BAN_GIAO' ? 'primary' : 'danger'}
        title={mode === 'BAN_GIAO' ? 'Xác nhận bàn giao thiết bị' : 'Xác nhận nhận trả thiết bị'}
        message={
          mode === 'BAN_GIAO'
            ? `Xác nhận bàn giao ${scanned.length} thiết bị theo yêu cầu ${active?.code ?? ''} cho ${
                active ? getUserName(state, active.requesterId) : ''
              }? Thiết bị sẽ chuyển sang trạng thái "Đang mượn".`
            : `Xác nhận nhận trả ${scanned.length} thiết bị theo yêu cầu ${active?.code ?? ''}?${
                damaged.length > 0
                  ? ` ${damaged.length} thiết bị hư hỏng sẽ được tạo phiếu sửa chữa tự động.`
                  : ''
              }`
        }
        confirmLabel={mode === 'BAN_GIAO' ? 'Bàn giao' : 'Nhận trả'}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          submit();
        }}
      />
    </>
  );
}
