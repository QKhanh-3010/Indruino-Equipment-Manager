/**
 * NGHIEP VU SUA CHUA & THANH LY
 *  - UC-15 Bao hong thiet bi (mo ta su co + dinh kem anh)
 *  - UC-08 Tiep nhan yeu cau sua chua
 *  - UC-09/UC-10 Sua chua & cap nhat tinh trang thiet bi
 *  - UC-11 De xuat thanh ly thiet bi
 */
import type { AppState, EquipmentCondition, RepairPriority, RepairTicket } from '@/types';
import {
  categoryName,
  draftFrom,
  fail,
  notify,
  notifyRole,
  ok,
  required,
  requirePermission,
  type OpContext,
  type OpResult,
  writeLog,
} from './common';

/** Tao phieu sua chua - dung chung cho bao hong thu cong va tra thiet bi hong. */
export function createRepairTicket(
  draft: AppState,
  input: {
    equipmentId: string;
    reportedById: string;
    issue: string;
    images: string[];
    priority: RepairPriority;
    autoCreated: boolean;
  },
): RepairTicket {
  draft.counters.repair = (draft.counters.repair ?? 0) + 1;
  const n = draft.counters.repair;
  const ticket: RepairTicket = {
    id: `rt-${String(n).padStart(4, '0')}-${Math.random().toString(36).slice(2, 5)}`,
    code: `SC-${String(n).padStart(4, '0')}`,
    equipmentId: input.equipmentId,
    reportedById: input.reportedById,
    reportedAt: new Date().toISOString(),
    issue: input.issue,
    images: input.images,
    priority: input.priority,
    status: 'CHO_TIEP_NHAN',
    technicianId: null,
    acceptedAt: null,
    completedAt: null,
    solution: null,
    proposeLiquidation: false,
    liquidationReason: null,
    autoCreated: input.autoCreated,
  };
  draft.repairTickets = [ticket, ...draft.repairTickets];
  return ticket;
}

export interface DamageReportPayload {
  equipmentId: string;
  issue: string;
  images: string[];
  priority: RepairPriority;
  /** Muc do hu hong -> anh huong truc tiep den tinh trang thiet bi */
  severity: Extract<EquipmentCondition, 'HONG_NHE' | 'HONG_NANG'>;
}

/**
 * UC-15: Bao hong thiet bi.
 * Luu y nghiep vu: thiet bi dang duoc muon phai tra theo quy trinh - he thong se tu tao
 * phieu sua chua khi ghi nhan hu hong luc tra thiet bi.
 */
export function reportDamage(ctx: OpContext, payload: DamageReportPayload): OpResult {
  const denied = requirePermission(ctx, 'repair.report');
  if (denied) return fail(denied);

  const issueErr = required(payload.issue, 'Mô tả sự cố');
  if (issueErr) return fail(issueErr);
  if (payload.issue.trim().length < 10) {
    return fail('Mô tả sự cố cần cụ thể hơn (tối thiểu 10 ký tự) để Kỹ thuật viên xử lý nhanh.');
  }

  const draft = draftFrom(ctx.state);
  const index = draft.equipment.findIndex((e) => e.id === payload.equipmentId);
  if (index < 0) return fail('Không tìm thấy thiết bị cần báo hỏng.');
  const item = draft.equipment[index];

  if (item.status === 'DA_THANH_LY') return fail('Thiết bị đã thanh lý, không thể báo hỏng.');
  if (item.status === 'DANG_MUON') {
    return fail(
      'Thiết bị đang được mượn. Vui lòng thực hiện TRẢ thiết bị và ghi nhận hư hỏng khi trả để hệ thống tự tạo phiếu sửa chữa.',
    );
  }
  const existing = draft.repairTickets.find(
    (t) => t.equipmentId === item.id && ['CHO_TIEP_NHAN', 'DANG_SUA'].includes(t.status),
  );
  if (existing) {
    return fail(`Thiết bị đang có phiếu sửa chữa ${existing.code} chưa xử lý xong.`);
  }

  const ticket = createRepairTicket(draft, {
    equipmentId: item.id,
    reportedById: ctx.actor.id,
    issue: payload.issue.trim(),
    images: payload.images,
    priority: payload.priority,
    autoCreated: false,
  });

  const before = `${item.status} | ${item.condition}`;
  draft.equipment[index] = { ...item, status: 'CHO_SUA_CHUA', condition: payload.severity };

  writeLog(draft, ctx.actor, {
    action: 'Báo hỏng thiết bị',
    entity: 'Equipment',
    entityId: item.id,
    entityLabel: item.code,
    before,
    after: `CHO_SUA_CHUA | ${payload.severity}`,
    detail: `Phiếu ${ticket.code}: ${ticket.issue}`,
  });

  // Thong bao cho ky thuat vien + quan ly
  notifyRole(draft, 'TECHNICIAN', {
    title: `Phiếu sửa chữa mới ${ticket.code}`,
    message: `${ctx.actor.fullName} báo hỏng thiết bị ${item.code} (${item.name}). Mức độ ưu tiên: ${payload.priority}.`,
    level: payload.priority === 'CAO' ? 'DANGER' : 'WARNING',
    link: '/sua-chua',
  });
  notifyRole(draft, 'MANAGER', {
    title: `Thiết bị chờ sửa chữa: ${item.code}`,
    message: `${item.name} — ${categoryName(draft, item.categoryId)} đã chuyển sang trạng thái Chờ sửa chữa (phiếu ${ticket.code}).`,
    level: 'WARNING',
    link: '/sua-chua',
  });

  return ok(draft, `Đã gửi báo hỏng, phiếu sửa chữa ${ticket.code} đã được tạo.`);
}

/** UC-08: Ky thuat vien tiep nhan yeu cau sua chua. */
export function acceptRepair(ctx: OpContext, payload: { ticketId: string }): OpResult {
  const denied = requirePermission(ctx, 'repair.handle');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const tIndex = draft.repairTickets.findIndex((t) => t.id === payload.ticketId);
  if (tIndex < 0) return fail('Không tìm thấy phiếu sửa chữa.');
  const ticket = draft.repairTickets[tIndex];
  if (ticket.status !== 'CHO_TIEP_NHAN') {
    return fail('Chỉ có thể tiếp nhận phiếu đang ở trạng thái "Chờ tiếp nhận".');
  }

  draft.repairTickets[tIndex] = {
    ...ticket,
    status: 'DANG_SUA',
    technicianId: ctx.actor.id,
    acceptedAt: new Date().toISOString(),
  };

  const eIndex = draft.equipment.findIndex((e) => e.id === ticket.equipmentId);
  if (eIndex >= 0) {
    draft.equipment[eIndex] = { ...draft.equipment[eIndex], status: 'DANG_SUA' };
  }

  writeLog(draft, ctx.actor, {
    action: 'Tiếp nhận phiếu sửa chữa',
    entity: 'RepairTicket',
    entityId: ticket.id,
    entityLabel: ticket.code,
    before: 'CHO_TIEP_NHAN',
    after: 'DANG_SUA',
    detail: `Kỹ thuật viên ${ctx.actor.fullName} tiếp nhận xử lý.`,
  });

  notify(draft, {
    userId: ticket.reportedById,
    title: `Phiếu ${ticket.code} đã được tiếp nhận`,
    message: `Kỹ thuật viên ${ctx.actor.fullName} đã tiếp nhận và đang xử lý thiết bị.`,
    level: 'INFO',
    link: '/sua-chua',
  });

  return ok(draft, `Đã tiếp nhận phiếu ${ticket.code}.`);
}

/** UC-09/UC-10: Hoan thanh sua chua, dua thiet bi ve trang thai "San sang". */
export function completeRepair(
  ctx: OpContext,
  payload: { ticketId: string; solution: string },
): OpResult {
  const denied = requirePermission(ctx, 'repair.handle');
  if (denied) return fail(denied);

  const solutionErr = required(payload.solution, 'Kết quả sửa chữa');
  if (solutionErr) return fail(solutionErr);

  const draft = draftFrom(ctx.state);
  const tIndex = draft.repairTickets.findIndex((t) => t.id === payload.ticketId);
  if (tIndex < 0) return fail('Không tìm thấy phiếu sửa chữa.');
  const ticket = draft.repairTickets[tIndex];
  if (ticket.status !== 'DANG_SUA') {
    return fail('Chỉ có thể hoàn thành phiếu đang ở trạng thái "Đang sửa".');
  }

  draft.repairTickets[tIndex] = {
    ...ticket,
    status: 'HOAN_THANH',
    solution: payload.solution.trim(),
    completedAt: new Date().toISOString(),
    technicianId: ticket.technicianId ?? ctx.actor.id,
  };

  const eIndex = draft.equipment.findIndex((e) => e.id === ticket.equipmentId);
  const equipment = eIndex >= 0 ? draft.equipment[eIndex] : undefined;
  if (eIndex >= 0 && equipment) {
    draft.equipment[eIndex] = { ...equipment, status: 'SAN_SANG', condition: 'TOT', holderId: null };
  }

  writeLog(draft, ctx.actor, {
    action: 'Hoàn thành sửa chữa',
    entity: 'RepairTicket',
    entityId: ticket.id,
    entityLabel: ticket.code,
    before: 'DANG_SUA',
    after: 'HOAN_THANH',
    detail: payload.solution.trim(),
  });

  notify(draft, {
    userId: ticket.reportedById,
    title: `Đã sửa xong thiết bị ${equipment?.code ?? ''}`,
    message: `Kết quả: ${payload.solution.trim()}. Thiết bị đã trở lại trạng thái Sẵn sàng.`,
    level: 'SUCCESS',
    link: equipment ? `/thiet-bi/${equipment.id}` : '/sua-chua',
  });

  return ok(draft, `Đã hoàn thành sửa chữa phiếu ${ticket.code}.`);
}

/** UC-11: Ket luan khong sua duoc va de xuat thanh ly (cho Quan ly phe duyet). */
export function proposeLiquidation(
  ctx: OpContext,
  payload: { ticketId: string; solution: string; liquidationReason: string },
): OpResult {
  const denied = requirePermission(ctx, 'repair.proposeLiquidation');
  if (denied) return fail(denied);

  const errors = [
    required(payload.solution, 'Kết luận kỹ thuật'),
    required(payload.liquidationReason, 'Lý do đề xuất thanh lý'),
  ].filter((e): e is string => Boolean(e));
  if (errors.length) return fail(errors.join(' '));

  const draft = draftFrom(ctx.state);
  const tIndex = draft.repairTickets.findIndex((t) => t.id === payload.ticketId);
  if (tIndex < 0) return fail('Không tìm thấy phiếu sửa chữa.');
  const ticket = draft.repairTickets[tIndex];
  if (!['DANG_SUA', 'CHO_TIEP_NHAN'].includes(ticket.status)) {
    return fail('Chỉ có thể đề xuất thanh lý với phiếu đang xử lý.');
  }

  draft.repairTickets[tIndex] = {
    ...ticket,
    status: 'KHONG_SUA_DUOC',
    solution: payload.solution.trim(),
    proposeLiquidation: true,
    liquidationReason: payload.liquidationReason.trim(),
    completedAt: new Date().toISOString(),
    technicianId: ticket.technicianId ?? ctx.actor.id,
  };

  const eIndex = draft.equipment.findIndex((e) => e.id === ticket.equipmentId);
  const equipment = eIndex >= 0 ? draft.equipment[eIndex] : undefined;
  if (eIndex >= 0 && equipment) {
    draft.equipment[eIndex] = { ...equipment, status: 'HONG_CHO_THANH_LY', condition: 'HONG_NANG' };
  }

  writeLog(draft, ctx.actor, {
    action: 'Đề xuất thanh lý thiết bị',
    entity: 'Equipment',
    entityId: equipment?.id ?? ticket.equipmentId,
    entityLabel: equipment?.code ?? ticket.code,
    before: equipment?.status ?? 'DANG_SUA',
    after: 'HONG_CHO_THANH_LY',
    detail: `Phiếu ${ticket.code} — ${payload.liquidationReason.trim()}`,
  });

  notifyRole(draft, 'MANAGER', {
    title: `Đề xuất thanh lý thiết bị ${equipment?.code ?? ''}`,
    message: `Kỹ thuật viên ${ctx.actor.fullName} đề xuất thanh lý: ${payload.liquidationReason.trim()}`,
    level: 'DANGER',
    link: equipment ? `/thiet-bi/${equipment.id}` : '/sua-chua',
  });

  return ok(draft, `Đã ghi nhận kết luận và đề xuất thanh lý cho phiếu ${ticket.code}.`);
}
