/**
 * Trang "Lich su thiet bi": toan bo vong doi nhap kho -> muon/tra -> sua chua -> thanh ly,
 * kem ten nguoi chiu trach nhiem tung giai doan. Ho tro cap nhat thiet bi, bao hong,
 * de xuat/thanh ly va in tem QR, xuat PDF lich su thiet bi.
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { EquipmentCondition } from '@/types';
import {
  documentHeader,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  printDocument,
} from '@/lib/utils';
import { useApp } from '@/data/store';
import { CONDITION_OPTIONS } from '@/services/equipment';
import {
  equipmentTimeline,
  getCategoryName,
  getEquipment,
  getUserName,
} from '@/services/selectors';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { ConditionBadge, EquipmentStatusBadge } from '@/components/StatusBadges';
import { QrCodeBox, QrLabelSheet, printQrLabels } from '@/components/QrLabel';
import { useAction } from '@/hooks/useAction';

export function EquipmentDetailPage(): JSX.Element {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { state, can } = useApp();
  const action = useAction();

  const equipment = getEquipment(state, id);
  const [editOpen, setEditOpen] = useState(false);
  const [retireOpen, setRetireOpen] = useState(false);
  const [retireReason, setRetireReason] = useState('');
  const [form, setForm] = useState({
    name: '',
    serial: '',
    supplier: '',
    price: '',
    location: '',
    note: '',
    condition: 'TOT' as EquipmentCondition,
  });

  if (!equipment) {
    return (
      <>
        <PageHeader title="Không tìm thấy thiết bị" />
        <EmptyState
          icon="🔍"
          title="Thiết bị không tồn tại hoặc đã bị gỡ khỏi hệ thống"
          description="Dữ liệu thiết bị không bị xóa cứng, vui lòng kiểm tra lại mã thiết bị hoặc quay về danh sách."
          action={<Button onClick={() => navigate('/thiet-bi')}>Về danh sách thiết bị</Button>}
        />
      </>
    );
  }

  const timeline = equipmentTimeline(state, equipment.id);
  const category = getCategoryName(state, equipment.categoryId);

  const openEdit = (): void => {
    setForm({
      name: equipment.name,
      serial: equipment.serial ?? '',
      supplier: equipment.supplier ?? '',
      price: equipment.price ? String(equipment.price) : '',
      location: equipment.location ?? '',
      note: equipment.note ?? '',
      condition: equipment.condition,
    });
    setEditOpen(true);
  };

  const submitEdit = (): void => {
    const result = action('updateEquipment', {
      id: equipment.id,
      name: form.name,
      serial: form.serial,
      supplier: form.supplier,
      price: form.price ? Number(form.price) : undefined,
      location: form.location,
      note: form.note,
      condition: form.condition,
    });
    if (result.ok) setEditOpen(false);
  };

  const confirmRetire = (): void => {
    const result = action('retireEquipment', { id: equipment.id, reason: retireReason });
    if (result.ok) {
      setRetireOpen(false);
      setRetireReason('');
    }
  };

  /** Xuat PDF lich su (ly lich) thiet bi - phuc vu truy vet tai san. */
  const printHistory = (): void => {
    const rows = timeline
      .map(
        (entry) => `<tr>
          <td>${escapeHtml(formatDateTime(entry.at))}</td>
          <td>${escapeHtml(entry.title)}</td>
          <td>${escapeHtml(entry.actorName)}</td>
          <td>${escapeHtml(entry.description)}</td>
        </tr>`,
      )
      .join('');
    printDocument(
      `Lịch sử thiết bị ${equipment.code}`,
      `${documentHeader('Lý lịch trang thiết bị')}
      <h1>Lý lịch thiết bị ${escapeHtml(equipment.code)}</h1>
      <p class="center muted">${escapeHtml(equipment.name)} — ${escapeHtml(category)}</p>
      <h2>Thông tin chung</h2>
      <table>
        <tr><th>Mã thiết bị</th><td>${escapeHtml(equipment.code)}</td>
            <th>Serial</th><td>${escapeHtml(equipment.serial ?? '—')}</td></tr>
        <tr><th>Loại thiết bị</th><td>${escapeHtml(category)}</td>
            <th>Nhà cung cấp</th><td>${escapeHtml(equipment.supplier ?? '—')}</td></tr>
        <tr><th>Ngày nhập kho</th><td>${escapeHtml(formatDate(equipment.receivedAt))}</td>
            <th>Nguyên giá</th><td>${escapeHtml(formatCurrency(equipment.price))}</td></tr>
        <tr><th>Vị trí</th><td>${escapeHtml(equipment.location ?? '—')}</td>
            <th>Người chịu trách nhiệm</th><td>${escapeHtml(getUserName(state, equipment.holderId))}</td></tr>
        <tr><th>Trạng thái hiện tại</th><td colspan="3">${escapeHtml(equipment.status)}</td></tr>
      </table>
      <h2>Nhật ký vòng đời thiết bị</h2>
      <table><thead><tr><th style="width:15%">Thời gian</th><th style="width:25%">Sự kiện</th>
      <th style="width:20%">Người thực hiện</th><th>Chi tiết</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="sign">
        <div><p class="role">Người lập biểu</p><p class="hint">(Ký, ghi rõ họ tên)</p></div>
        <div><p class="role">Quản lý Phòng Sản xuất</p><p class="hint">(Ký, ghi rõ họ tên)</p></div>
      </div>`,
    );
  };

  const holderName = getUserName(state, equipment.holderId);
  const canReportDamage =
    can('repair.report') && !['DA_THANH_LY', 'DANG_MUON'].includes(equipment.status);
  const canBorrow = can('borrow.create') && equipment.status === 'SAN_SANG' && !equipment.holderId;
  const canRetire = can('equipment.retire') && equipment.status === 'HONG_CHO_THANH_LY';

  return (
    <>
      <PageHeader
        title={`${equipment.code} — ${equipment.name}`}
        description={`${category} · Nhóm ${
          state.categories.find((c) => c.id === equipment.categoryId)?.group === 'DIEN_DAN_DUNG'
            ? 'thiết bị điện dân dụng'
            : 'thiết bị kỹ thuật'
        } · ${equipment.location ?? 'Chưa xác định vị trí'}`}
        breadcrumb={[
          { label: 'Indruino Equipment Manager' },
          { label: 'Thiết bị' },
          { label: equipment.code },
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            {can('equipment.update') && (
              <Button variant="secondary" onClick={openEdit}>
                ✎ Cập nhật thiết bị
              </Button>
            )}
            {canReportDamage && (
              <Button variant="secondary" onClick={() => navigate(`/bao-hong?code=${equipment.code}`)}>
                🛠 Báo hỏng
              </Button>
            )}
            {canBorrow && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/yeu-cau-muon-tra?code=${equipment.code}`)}
              >
                📝 Yêu cầu mượn
              </Button>
            )}
            {canRetire && (
              <Button variant="danger" onClick={() => setRetireOpen(true)}>
                ♻ Thanh lý thiết bị
              </Button>
            )}
            <Button variant="secondary" onClick={printHistory}>
              🖨 In lý lịch thiết bị (PDF)
            </Button>
          </div>
        }
      />

      {equipment.status === 'DANG_MUON' && equipment.holderId && (
        <div className="mb-4 rounded-lg border border-navy-200 bg-navy-50 px-4 py-3 text-sm text-navy-800">
          Thiết bị đang do <strong>{holderName}</strong> chịu trách nhiệm. Theo quy định, tại một thời
          điểm mỗi thiết bị chỉ có một người chịu trách nhiệm.
        </div>
      )}

      {equipment.status === 'HONG_CHO_THANH_LY' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Thiết bị đang chờ thanh lý. Lý do: {equipment.retiredReason ?? 'Kỹ thuật viên đề xuất thanh lý.'}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Thông tin thiết bị" className="lg:col-span-2">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Mã thiết bị</dt>
              <dd className="text-sm font-semibold text-navy-800">{equipment.code}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Trạng thái</dt>
              <dd className="mt-1">
                <EquipmentStatusBadge status={equipment.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Tình trạng</dt>
              <dd className="mt-1">
                <ConditionBadge condition={equipment.condition} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Serial</dt>
              <dd className="text-sm">{equipment.serial ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Nhà cung cấp</dt>
              <dd className="text-sm">{equipment.supplier ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Ngày nhập kho</dt>
              <dd className="text-sm">{formatDate(equipment.receivedAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Nguyên giá</dt>
              <dd className="text-sm">{formatCurrency(equipment.price)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Người chịu trách nhiệm</dt>
              <dd className="text-sm">{equipment.holderId ? holderName : 'Kho Phòng Sản xuất'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Vị trí hiện tại</dt>
              <dd className="text-sm">{equipment.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-ink-500">Ngày thanh lý</dt>
              <dd className="text-sm">
                {equipment.retiredAt ? formatDate(equipment.retiredAt) : 'Chưa thanh lý'}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold uppercase text-ink-500">Ghi chú</dt>
              <dd className="text-sm text-ink-700">{equipment.note ?? '—'}</dd>
            </div>
          </dl>
        </Card>

        <Card
          title="Mã QR định danh"
          description="Dán tem QR lên thiết bị để quét khi bàn giao, nhận trả và kiểm kê."
        >
          <div className="flex flex-col items-center gap-3">
            <QrCodeBox value={equipment.code} size={148} />
            <p className="text-center text-xs text-ink-500">
              Nội dung mã QR: <span className="font-semibold text-navy-700">{equipment.code}</span>
            </p>
            <Button variant="secondary" block onClick={printQrLabels}>
              🖨 In tem QR
            </Button>
          </div>
        </Card>
      </div>

      <section className="mt-4">
        <Card
          title="Tem QR để in và dán lên thiết bị"
          description="Xem trước tem QR (khổ A4, 3 tem/hàng) trước khi in."
        >
          <QrLabelSheet
            items={[equipment]}
            categoryNameOf={(categoryId) => getCategoryName(state, categoryId)}
            title="Tem QR thiết bị — Phòng Sản xuất"
          />
        </Card>
      </section>

      <section className="mt-4">
        <Card
          title="Lịch sử thiết bị — toàn bộ vòng đời"
          description="Nhập kho → mượn/trả → sửa chữa → kiểm kê → thanh lý, kèm người chịu trách nhiệm từng giai đoạn."
        >
          {timeline.length === 0 ? (
            <EmptyState
              icon="🗂"
              title="Chưa có sự kiện nào"
              description="Thiết bị vừa được tạo nhưng chưa phát sinh giao dịch nào."
            />
          ) : (
            <ol className="relative space-y-4 border-l border-ink-200 pl-5">
              {timeline.map((entry, index) => (
                <li key={`${entry.at}-${index}`} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[26px] top-1.5 h-3 w-3 rounded-full ring-4 ring-white ${
                      entry.tone === 'success'
                        ? 'bg-emerald-500'
                        : entry.tone === 'danger'
                          ? 'bg-red-500'
                          : entry.tone === 'warning'
                            ? 'bg-amber-500'
                            : entry.tone === 'info'
                              ? 'bg-navy-500'
                              : 'bg-ink-400'
                    }`}
                  />
                  <div className="rounded-lg border border-ink-200 bg-white px-3 py-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-800">{entry.title}</p>
                      <span className="text-[11px] text-ink-500">{formatDateTime(entry.at)}</span>
                    </div>
                    <p className="mt-1 text-xs text-ink-600">{entry.description}</p>
                    <p className="mt-1 text-[11px] text-ink-500">
                      Người thực hiện:{' '}
                      <span className="font-medium text-ink-700">{entry.actorName}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </section>

      {/* --------------------------- Cap nhat thong tin thiet bi --------------------------- */}
      <Modal
        open={editOpen}
        title={`Cập nhật thiết bị ${equipment.code}`}
        description="Thay đổi sẽ được ghi vào nhật ký hoạt động với giá trị trước/sau."
        onClose={() => setEditOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={submitEdit}>Lưu thay đổi</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tên thiết bị" htmlFor="edit-name" required>
            <Input
              id="edit-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Serial" htmlFor="edit-serial">
            <Input
              id="edit-serial"
              value={form.serial}
              onChange={(e) => setForm({ ...form, serial: e.target.value })}
            />
          </Field>
          <Field label="Nhà cung cấp" htmlFor="edit-supplier">
            <Input
              id="edit-supplier"
              value={form.supplier}
              onChange={(e) => setForm({ ...form, supplier: e.target.value })}
            />
          </Field>
          <Field label="Nguyên giá (VND)" htmlFor="edit-price">
            <Input
              id="edit-price"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
          </Field>
          <Field label="Vị trí hiện tại" htmlFor="edit-location">
            <Input
              id="edit-location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
            />
          </Field>
          <Field
            label="Tình trạng thiết bị"
            htmlFor="edit-condition"
            hint="Thiết bị hỏng nặng không thể để ở trạng thái Sẵn sàng."
          >
            <Select
              id="edit-condition"
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value as EquipmentCondition })}
            >
              {CONDITION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ghi chú" htmlFor="edit-note" className="sm:col-span-2">
            <Textarea
              id="edit-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
        </div>
      </Modal>

      {/* --------------------------- Thanh ly thiet bi (khong the hoan tac) --------------------------- */}
      <Modal
        open={retireOpen}
        title={`Thanh lý thiết bị ${equipment.code}`}
        description="Sau khi thanh lý, thiết bị chỉ có thể xem lại lịch sử, không thể mượn/cấp phát."
        onClose={() => setRetireOpen(false)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRetireOpen(false)}>
              Hủy bỏ
            </Button>
            <Button variant="danger" onClick={confirmRetire}>
              Xác nhận thanh lý
            </Button>
          </>
        }
      >
        <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Thao tác này không thể hoàn tác. Dữ liệu thiết bị KHÔNG bị xóa cứng, hệ thống chỉ chuyển
          trạng thái sang “Đã thanh lý” để giữ lịch sử tài sản.
        </p>
        <Field
          label="Lý do thanh lý"
          htmlFor="retire-reason"
          required
          hint="Tối thiểu 10 ký tự, ví dụ: motor cháy, chi phí sửa vượt 70% giá trị thiết bị."
        >
          <Textarea
            id="retire-reason"
            value={retireReason}
            onChange={(e) => setRetireReason(e.target.value)}
            placeholder="Nhập lý do thanh lý..."
          />
        </Field>
      </Modal>
    </>
  );
}
