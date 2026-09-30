/**
 * NGHIEP VU KHO THIET BI
 *  - UC-04 Nhap kho thiet bi moi (tu sinh ma thiet bi + ma QR)
 *  - UC-11 Thanh ly thiet bi (khong xoa cung du lieu)
 *  - UC-12 Cap nhat thong tin / tinh trang thiet bi
 */
import type { Equipment, EquipmentCondition } from '@/types';
import {
  categoryName,
  checkLowStock,
  draftFrom,
  fail,
  nextEquipmentCode,
  ok,
  required,
  requirePermission,
  type OpContext,
  type OpResult,
  writeLog,
  writeTransaction,
} from './common';

export interface StockInPayload {
  name: string;
  categoryId: string;
  quantity: number;
  supplier: string;
  receivedAt: string;
  price?: number;
  location?: string;
  note?: string;
  serialPrefix?: string;
}

/**
 * UC-04: Nhap kho thiet bi moi.
 *  - Sinh ma dinh danh duy nhat cho tung thiet bi (INDR-EQ-xxxx) - cung la noi dung ma QR.
 *  - Ghi giao dich NHAP_KHO cho tung thiet bi (UC-16: cap nhat ton kho tu dong).
 *  - Canh bao ton kho thap/cao theo dinh muc Min/Max cua danh muc.
 */
export function createEquipmentStockIn(
  ctx: OpContext,
  payload: StockInPayload,
): OpResult<{ items: Equipment[] }> {
  const denied = requirePermission(ctx, 'equipment.create');
  if (denied) return fail(denied);

  const errors = [
    required(payload.name, 'Tên thiết bị'),
    required(payload.categoryId, 'Loại thiết bị'),
    required(payload.supplier, 'Nhà cung cấp'),
    required(payload.receivedAt, 'Ngày nhập kho'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));
  if (!payload.quantity || payload.quantity < 1) {
    return fail('Số lượng nhập kho phải là số nguyên lớn hơn 0.');
  }
  if (payload.quantity > 50) {
    return fail('Mỗi phiếu nhập cho phép tối đa 50 thiết bị để đảm bảo in tem QR đúng định dạng.');
  }
  if (!ctx.state.categories.some((c) => c.id === payload.categoryId)) {
    return fail('Loại thiết bị không tồn tại trong danh mục hệ thống.');
  }

  const draft = draftFrom(ctx.state);
  const now = new Date().toISOString();
  const created: Equipment[] = [];

  for (let i = 0; i < payload.quantity; i += 1) {
    const code = nextEquipmentCode(draft);
    const item: Equipment = {
      id: `eq-${code.slice(-4)}-${Math.random().toString(36).slice(2, 6)}`,
      code,
      name: payload.name.trim(),
      categoryId: payload.categoryId,
      serial: payload.serialPrefix
        ? `${payload.serialPrefix}-${String(i + 1).padStart(3, '0')}`
        : `SN-${Date.now().toString().slice(-6)}${i + 1}`,
      supplier: payload.supplier.trim(),
      receivedAt: new Date(payload.receivedAt).toISOString(),
      price: payload.price,
      status: 'SAN_SANG',
      condition: 'TOT',
      holderId: null,
      location: payload.location?.trim() || 'Kho Phòng Sản xuất',
      note: payload.note?.trim() || undefined,
      createdAt: now,
      retiredAt: null,
      retiredReason: null,
    };
    draft.equipment = [item, ...draft.equipment];
    created.push(item);

    // UC-16: tu dong cap nhat ton kho bang giao dich nhap kho
    writeTransaction(draft, {
      type: 'NHAP_KHO',
      equipmentId: item.id,
      performedById: ctx.actor.id,
      condition: 'TOT',
      note: `Nhập kho từ ${item.supplier} (${i + 1}/${payload.quantity}).`,
    });

    writeLog(draft, ctx.actor, {
      action: 'Nhập kho thiết bị mới',
      entity: 'Equipment',
      entityId: item.id,
      entityLabel: item.code,
      before: null,
      after: 'Sẵn sàng',
      detail: `${item.name} — ${categoryName(draft, item.categoryId)}, nhà cung cấp ${item.supplier}.`,
    });
  }

  checkLowStock(draft, payload.categoryId);

  return ok(
    draft,
    `Đã nhập kho ${created.length} thiết bị (${created.map((e) => e.code).join(', ')}).`,
    { items: created },
  );
}

/** Danh sach tinh trang hop le khi cap nhat thiet bi. */
export const CONDITION_OPTIONS: { value: EquipmentCondition; label: string }[] = [
  { value: 'TOT', label: 'Tốt' },
  { value: 'CAN_KIEM_TRA', label: 'Cần kiểm tra' },
  { value: 'HONG_NHE', label: 'Hỏng nhẹ' },
  { value: 'HONG_NANG', label: 'Hỏng nặng' },
];

export interface UpdateEquipmentPayload {
  id: string;
  name?: string;
  serial?: string;
  supplier?: string;
  price?: number;
  location?: string;
  note?: string;
  condition?: EquipmentCondition;
}

/** UC-12: Cap nhat thong tin / tinh trang thiet bi (khong thay doi ma dinh danh). */
export function updateEquipment(ctx: OpContext, payload: UpdateEquipmentPayload): OpResult {
  const denied = requirePermission(ctx, 'equipment.update');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.equipment.findIndex((e) => e.id === payload.id);
  if (index < 0) return fail('Không tìm thấy thiết bị cần cập nhật.');
  const before = draft.equipment[index];
  const updated: Equipment = {
    ...before,
    name: payload.name?.trim() || before.name,
    serial: payload.serial?.trim() || before.serial,
    supplier: payload.supplier?.trim() || before.supplier,
    price: payload.price ?? before.price,
    location: payload.location?.trim() || before.location,
    note: payload.note?.trim() || before.note,
    condition: payload.condition ?? before.condition,
  };

  // Quy tac nghiep vu: thiet bi hong nang khong the o trang thai "San sang"
  if (updated.condition === 'HONG_NANG' && updated.status === 'SAN_SANG') {
    return fail(
      'Thiết bị hỏng nặng không thể ở trạng thái "Sẵn sàng". Vui lòng chuyển sang luồng báo hỏng / sửa chữa.',
    );
  }

  draft.equipment[index] = updated;
  writeLog(draft, ctx.actor, {
    action: 'Cập nhật thiết bị',
    entity: 'Equipment',
    entityId: updated.id,
    entityLabel: updated.code,
    before: `${before.name} | ${before.condition}`,
    after: `${updated.name} | ${updated.condition}`,
    detail: 'Cập nhật thông tin/tình trạng thiết bị.',
  });

  return ok(draft, `Đã cập nhật thiết bị ${updated.code}.`);
}

/**
 * UC-11: Thanh ly thiet bi.
 * Quy tac: KHONG xoa cung du lieu, chi chuyen trang thai "Da thanh ly" de giu lich su.
 */
export function retireEquipment(
  ctx: OpContext,
  payload: { id: string; reason: string },
): OpResult {
  const denied = requirePermission(ctx, 'equipment.retire');
  if (denied) return fail(denied);

  const reasonErr = required(payload.reason, 'Lý do thanh lý');
  if (reasonErr) return fail(reasonErr);
  if (payload.reason.trim().length < 10) {
    return fail('Lý do thanh lý cần ghi rõ ràng (tối thiểu 10 ký tự) để lưu hồ sơ tài sản.');
  }

  const draft = draftFrom(ctx.state);
  const index = draft.equipment.findIndex((e) => e.id === payload.id);
  if (index < 0) return fail('Không tìm thấy thiết bị cần thanh lý.');
  const item = draft.equipment[index];

  if (item.status === 'DA_THANH_LY') return fail('Thiết bị này đã được thanh lý trước đó.');
  if (item.status === 'DANG_MUON') {
    return fail('Thiết bị đang được mượn, phải thu hồi về kho trước khi thanh lý.');
  }
  if (item.status !== 'HONG_CHO_THANH_LY' && item.status !== 'CHO_SUA_CHUA') {
    return fail(
      'Chỉ được thanh lý thiết bị ở trạng thái "Hỏng – chờ thanh lý" (theo đề xuất của Kỹ thuật viên).',
    );
  }

  const now = new Date().toISOString();
  draft.equipment[index] = {
    ...item,
    status: 'DA_THANH_LY',
    holderId: null,
    retiredAt: now,
    retiredReason: payload.reason.trim(),
  };

  // Dong cac phieu sua chua con lien quan (giu lai lich su phieu)
  draft.repairTickets = draft.repairTickets.map((t) =>
    t.equipmentId === item.id && !['DA_THANH_LY', 'HOAN_THANH'].includes(t.status)
      ? { ...t, status: 'DA_THANH_LY', completedAt: now }
      : t,
  );

  writeTransaction(draft, {
    type: 'THANH_LY',
    equipmentId: item.id,
    performedById: ctx.actor.id,
    condition: item.condition,
    note: `Thanh lý thiết bị. Lý do: ${payload.reason.trim()}`,
  });

  writeLog(draft, ctx.actor, {
    action: 'Thanh lý thiết bị',
    entity: 'Equipment',
    entityId: item.id,
    entityLabel: item.code,
    before: item.status,
    after: 'DA_THANH_LY',
    detail: payload.reason.trim(),
  });

  return ok(draft, `Đã thanh lý thiết bị ${item.code}. Dữ liệu lịch sử vẫn được giữ nguyên.`);
}
