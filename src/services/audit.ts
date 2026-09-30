/**
 * NGHIEP VU KIEM KE DINH KY (UC-06)
 *  - Tao dot kiem ke (chup lai trang thai he thong lam "du kien")
 *  - Quet ma QR doi chieu tung thiet bi
 *  - Phat hien chenh lech: Thieu / Thua / Sai tinh trang / Sai nguoi giu
 *  - Hoan tat dot kiem ke -> xuat bien ban (o tang giao dien, in PDF)
 */
import type { DiscrepancyType, InventoryAuditItem } from '@/types';
import {
  draftFrom,
  fail,
  ok,
  required,
  requirePermission,
  type OpContext,
  type OpResult,
  writeLog,
} from './common';

/** Tinh chenh lech giua thuc te kiem ke va du lieu he thong. */
function computeDiscrepancy(item: InventoryAuditItem): DiscrepancyType | null {
  if (!item.actualFound) return 'THIEU';
  if (item.actualStatus && item.actualStatus !== item.expectedStatus) return 'SAI_TINH_TRANG';
  if (item.actualHolderId !== item.expectedHolderId) return 'SAI_NGUOI_GIU';
  return null;
}

export interface CreateAuditPayload {
  name: string;
  periodFrom: string;
  periodTo: string;
  participants: string[];
  note?: string;
  /** Gioi han pham vi kiem ke theo nhom thiet bi (bo trong = toan bo Phong San xuat) */
  categoryIds?: string[];
}

/** UC-06: Tao dot kiem ke dinh ky - snapshot trang thai hien tai cua tat ca thiet bi. */
export function createInventoryAudit(ctx: OpContext, payload: CreateAuditPayload): OpResult {
  const denied = requirePermission(ctx, 'audit.create');
  if (denied) return fail(denied);

  const errors = [
    required(payload.name, 'Tên đợt kiểm kê'),
    required(payload.periodFrom, 'Thời gian bắt đầu'),
    required(payload.periodTo, 'Thời gian kết thúc'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));
  if (new Date(payload.periodTo) < new Date(payload.periodFrom)) {
    return fail('Thời gian kết thúc phải sau thời gian bắt đầu.');
  }

  const draft = draftFrom(ctx.state);
  const existing = draft.audits.find((a) => a.status === 'DANG_KIEM_KE');
  if (existing) {
    return fail(`Đang có đợt kiểm kê ${existing.code} chưa hoàn thành. Vui lòng hoàn tất trước.`);
  }

  // Chi kiem ke thiet bi con trong he thong (da thanh ly thi khong kiem ke)
  const scope = draft.equipment.filter(
    (e) =>
      e.status !== 'DA_THANH_LY' &&
      (!payload.categoryIds?.length || payload.categoryIds.includes(e.categoryId)),
  );
  if (!scope.length) return fail('Không có thiết bị nào trong phạm vi kiểm kê.');

  draft.counters.audit = (draft.counters.audit ?? 0) + 1;
  const n = draft.counters.audit;
  const audit = {
    id: `aud-${String(n).padStart(4, '0')}`,
    code: `KK-${String(n).padStart(4, '0')}`,
    name: payload.name.trim(),
    periodFrom: new Date(payload.periodFrom).toISOString(),
    periodTo: new Date(payload.periodTo).toISOString(),
    createdById: ctx.actor.id,
    createdAt: new Date().toISOString(),
    status: 'DANG_KIEM_KE' as const,
    items: scope.map<InventoryAuditItem>((e) => ({
      equipmentId: e.id,
      expectedStatus: e.status,
      expectedHolderId: e.holderId,
      scanned: false,
      scannedAt: null,
      actualFound: false,
      actualStatus: null,
      actualHolderId: null,
      discrepancy: null,
    })),
    completedAt: null,
    participants: payload.participants.filter(Boolean),
    note: payload.note?.trim(),
  };
  draft.audits = [audit, ...draft.audits];

  writeLog(draft, ctx.actor, {
    action: 'Tạo đợt kiểm kê',
    entity: 'InventoryAudit',
    entityId: audit.id,
    entityLabel: audit.code,
    before: null,
    after: 'DANG_KIEM_KE',
    detail: `${audit.name} — ${scope.length} thiết bị trong phạm vi kiểm kê.`,
  });

  return ok(draft, `Đã tạo đợt kiểm kê ${audit.code} với ${scope.length} thiết bị.`);
}

export interface ScanAuditPayload {
  auditId: string;
  /** Ma QR quet duoc (chinh la ma dinh danh thiet bi). */
  code: string;
}

/**
 * UC-06: Quet QR doi chieu.
 *  - Thiet bi co trong danh sach -> ghi nhan tim thay, tu dong so sanh tinh trang/nguoi giu.
 *  - Thiet bi KHONG co trong danh sach -> ghi nhan "Thua".
 */
export function scanAuditItem(
  ctx: OpContext,
  payload: ScanAuditPayload,
): OpResult<{ result: 'FOUND' | 'EXTRA'; label: string; discrepancy: DiscrepancyType | null }> {
  const denied = requirePermission(ctx, 'audit.perform');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const aIndex = draft.audits.findIndex((a) => a.id === payload.auditId);
  if (aIndex < 0) return fail('Không tìm thấy đợt kiểm kê.');
  const audit = draft.audits[aIndex];
  if (audit.status !== 'DANG_KIEM_KE') return fail('Đợt kiểm kê này đã kết thúc.');

  const code = payload.code.trim().toUpperCase();
  const equipment = draft.equipment.find((e) => e.code.toUpperCase() === code);
  if (!equipment) return fail(`Không tìm thấy thiết bị nào có mã "${payload.code}".`);

  const iIndex = audit.items.findIndex((i) => i.equipmentId === equipment.id);
  const now = new Date().toISOString();

  if (iIndex < 0) {
    audit.items = [
      {
        equipmentId: equipment.id,
        expectedStatus: equipment.status,
        expectedHolderId: equipment.holderId,
        scanned: true,
        scannedAt: now,
        actualFound: true,
        actualStatus: equipment.status,
        actualHolderId: equipment.holderId,
        discrepancy: 'THUA',
        note: 'Thiết bị không có trong danh sách kiểm kê (thừa).',
      },
      ...audit.items,
    ];
    writeLog(draft, ctx.actor, {
      action: 'Quét QR kiểm kê - thiết bị thừa',
      entity: 'Equipment',
      entityId: equipment.id,
      entityLabel: equipment.code,
      after: 'THUA',
      detail: `Đợt ${audit.code}.`,
    });
    return ok(draft, `Thiết bị ${equipment.code} không có trong danh sách kiểm kê (ghi nhận: Thừa).`, {
      result: 'EXTRA' as const,
      label: equipment.name,
      discrepancy: 'THUA' as const,
    });
  }

  const updated: InventoryAuditItem = {
    ...audit.items[iIndex],
    scanned: true,
    scannedAt: now,
    actualFound: true,
    actualStatus: equipment.status,
    actualHolderId: equipment.holderId,
    discrepancy: null,
  };
  updated.discrepancy = computeDiscrepancy(updated);
  audit.items[iIndex] = updated;

  writeLog(draft, ctx.actor, {
    action: 'Quét QR kiểm kê',
    entity: 'Equipment',
    entityId: equipment.id,
    entityLabel: equipment.code,
    after: updated.discrepancy ?? 'KHOP',
    detail: `Đợt ${audit.code} — ${
      updated.discrepancy ? `Chênh lệch: ${updated.discrepancy}` : 'Khớp dữ liệu hệ thống'
    }.`,
  });

  return ok(
    draft,
    updated.discrepancy
      ? `Đã ghi nhận ${equipment.code}. Phát hiện chênh lệch (${updated.discrepancy}).`
      : `Đã ghi nhận ${equipment.code} — khớp dữ liệu hệ thống.`,
    { result: 'FOUND' as const, label: equipment.name, discrepancy: updated.discrepancy },
  );
}

/* ------------- Ghi nhan thu cong (khong quet duoc tem QR / thiet bi khong tim thay) ------------- */

import type { EquipmentStatus, InventoryAudit } from '@/types';
import { findEquipment, notify } from './common';

/** Ghi nhan thiet bi KHONG tim thay khi kiem ke -> chenh lech "Thieu". */
export function markAuditItemMissing(
  ctx: OpContext,
  payload: { auditId: string; equipmentId: string; note?: string },
): OpResult {
  const denied = requirePermission(ctx, 'audit.perform');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const audit = draft.audits.find((a) => a.id === payload.auditId);
  if (!audit) return fail('Không tìm thấy đợt kiểm kê.');
  if (audit.status !== 'DANG_KIEM_KE') return fail('Đợt kiểm kê này đã kết thúc.');
  const index = audit.items.findIndex((i) => i.equipmentId === payload.equipmentId);
  if (index < 0) return fail('Thiết bị không thuộc đợt kiểm kê này.');

  const equipment = findEquipment(draft, payload.equipmentId);
  const before = audit.items[index].expectedStatus;
  audit.items[index] = {
    ...audit.items[index],
    scanned: true,
    scannedAt: new Date().toISOString(),
    actualFound: false,
    actualStatus: null,
    actualHolderId: null,
    discrepancy: 'THIEU',
    note: payload.note?.trim() || 'Không tìm thấy thiết bị trong quá trình kiểm kê.',
  };

  writeLog(draft, ctx.actor, {
    action: 'Kiểm kê - ghi nhận thiếu thiết bị',
    entity: 'Equipment',
    entityId: payload.equipmentId,
    entityLabel: equipment?.code ?? payload.equipmentId,
    before,
    after: 'THIEU',
    detail: audit.items[index].note,
  });

  return ok(draft, `Đã ghi nhận thiếu thiết bị ${equipment?.code ?? ''} trong đợt ${audit.code}.`);
}

/** Doi chieu thu cong: bo sung tinh trang/nguoi giu thuc te cho mot thiet bi trong dot kiem ke. */
export function setAuditItemActual(
  ctx: OpContext,
  payload: {
    auditId: string;
    equipmentId: string;
    actualStatus?: EquipmentStatus;
    actualHolderId?: string | null;
    note?: string;
  },
): OpResult {
  const denied = requirePermission(ctx, 'audit.perform');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const audit = draft.audits.find((a) => a.id === payload.auditId);
  if (!audit) return fail('Không tìm thấy đợt kiểm kê.');
  if (audit.status !== 'DANG_KIEM_KE') return fail('Đợt kiểm kê này đã kết thúc.');
  const index = audit.items.findIndex((i) => i.equipmentId === payload.equipmentId);
  if (index < 0) return fail('Thiết bị không thuộc đợt kiểm kê này.');

  const updated: InventoryAuditItem = {
    ...audit.items[index],
    actualFound: true,
    scanned: true,
    scannedAt: audit.items[index].scannedAt ?? new Date().toISOString(),
    actualStatus: payload.actualStatus ?? audit.items[index].actualStatus,
    actualHolderId:
      payload.actualHolderId !== undefined
        ? payload.actualHolderId
        : audit.items[index].actualHolderId,
    note: payload.note?.trim() || audit.items[index].note,
    discrepancy: null,
  };
  updated.discrepancy = computeDiscrepancy(updated);
  audit.items[index] = updated;

  writeLog(draft, ctx.actor, {
    action: 'Kiểm kê - cập nhật thực tế',
    entity: 'Equipment',
    entityId: payload.equipmentId,
    entityLabel: findEquipment(draft, payload.equipmentId)?.code ?? payload.equipmentId,
    after: updated.actualStatus ?? null,
    detail: `Đợt ${audit.code} — chênh lệch: ${updated.discrepancy ?? 'Không có'}.`,
  });

  return ok(draft, 'Đã cập nhật kết quả đối chiếu thực tế.');
}

/** Tong hop chenh lech cua mot dot kiem ke (dung cho giao dien + bien ban). */
export function summarizeAudit(audit: InventoryAudit): {
  total: number;
  scanned: number;
  missing: number;
  extra: number;
  wrongStatus: number;
  wrongHolder: number;
} {
  return {
    total: audit.items.length,
    scanned: audit.items.filter((i) => i.scanned).length,
    missing: audit.items.filter((i) => i.discrepancy === 'THIEU').length,
    extra: audit.items.filter((i) => i.discrepancy === 'THUA').length,
    wrongStatus: audit.items.filter((i) => i.discrepancy === 'SAI_TINH_TRANG').length,
    wrongHolder: audit.items.filter((i) => i.discrepancy === 'SAI_NGUOI_GIU').length,
  };
}

/**
 * UC-06: Hoan tat dot kiem ke.
 * Cac thiet bi chua duoc ghi nhan se duoc danh dau "Thieu" de dua vao bien ban.
 */
export function completeInventoryAudit(
  ctx: OpContext,
  payload: { auditId: string; note?: string },
): OpResult {
  const denied = requirePermission(ctx, 'audit.create');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.audits.findIndex((a) => a.id === payload.auditId);
  if (index < 0) return fail('Không tìm thấy đợt kiểm kê.');
  const audit = draft.audits[index];
  if (audit.status !== 'DANG_KIEM_KE') return fail('Đợt kiểm kê này đã kết thúc.');

  const scannedCount = audit.items.filter((i) => i.scanned).length;
  if (scannedCount === 0) {
    return fail('Chưa có thiết bị nào được đối chiếu. Vui lòng quét QR ít nhất một thiết bị.');
  }

  audit.items = audit.items.map((i) =>
    i.scanned
      ? i
      : {
          ...i,
          scanned: true,
          scannedAt: new Date().toISOString(),
          actualFound: false,
          discrepancy: 'THIEU' as const,
          note: 'Chưa được đối chiếu khi kết thúc đợt kiểm kê.',
        },
  );
  audit.status = 'HOAN_THANH';
  audit.completedAt = new Date().toISOString();
  audit.note = payload.note?.trim() || audit.note;

  const stats = summarizeAudit(audit);
  writeLog(draft, ctx.actor, {
    action: 'Hoàn thành kiểm kê',
    entity: 'InventoryAudit',
    entityId: audit.id,
    entityLabel: audit.code,
    before: 'DANG_KIEM_KE',
    after: 'HOAN_THANH',
    detail: `Tổng ${stats.total} thiết bị — thiếu ${stats.missing}, thừa ${stats.extra}, sai tình trạng ${stats.wrongStatus}, sai người giữ ${stats.wrongHolder}.`,
  });

  const discrepancies = stats.missing + stats.extra + stats.wrongStatus + stats.wrongHolder;
  if (discrepancies > 0) {
    notify(draft, {
      userId: null,
      title: `Biên bản kiểm kê ${audit.code} có chênh lệch`,
      message: `Kết quả kiểm kê: thiếu ${stats.missing}, thừa ${stats.extra}, sai tình trạng ${stats.wrongStatus}, sai người giữ ${stats.wrongHolder}. Đề nghị xem xét và xử lý.`,
      level: 'WARNING',
      link: `/kiem-ke/${audit.id}`,
    });
  }

  return ok(draft, `Đã hoàn tất đợt kiểm kê ${audit.code}. Biên bản sẵn sàng để in/xuất PDF.`);
}

/** Huy dot kiem ke (bat buoc ghi ly do). */
export function cancelInventoryAudit(
  ctx: OpContext,
  payload: { auditId: string; reason: string },
): OpResult {
  const denied = requirePermission(ctx, 'audit.create');
  if (denied) return fail(denied);
  const reasonErr = required(payload.reason, 'Lý do hủy đợt kiểm kê');
  if (reasonErr) return fail(reasonErr);

  const draft = draftFrom(ctx.state);
  const audit = draft.audits.find((a) => a.id === payload.auditId);
  if (!audit) return fail('Không tìm thấy đợt kiểm kê.');
  if (audit.status !== 'DANG_KIEM_KE') return fail('Chỉ hủy được đợt kiểm kê đang thực hiện.');

  audit.status = 'DA_HUY';
  audit.completedAt = new Date().toISOString();

  writeLog(draft, ctx.actor, {
    action: 'Hủy đợt kiểm kê',
    entity: 'InventoryAudit',
    entityId: audit.id,
    entityLabel: audit.code,
    before: 'DANG_KIEM_KE',
    after: 'DA_HUY',
    detail: payload.reason.trim(),
  });

  return ok(draft, `Đã hủy đợt kiểm kê ${audit.code}.`);
}
