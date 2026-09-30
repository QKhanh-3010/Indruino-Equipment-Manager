/**
 * NGHIEP VU MUON / TRA THIET BI
 *  - UC-13 Gui yeu cau muon / tra
 *  - UC-05 Duyet - tu choi yeu cau (bat buoc ghi ly do khi tu choi)
 *  - UC-14 Quet ma QR de ban giao / nhan tra
 *  - Job he thong: canh bao qua han tra
 */
import type { AppState, BorrowRequest, BorrowType, Equipment } from '@/types';
import {
  checkLowStock,
  draftFrom,
  fail,
  findEquipment,
  notify,
  notifyRole,
  ok,
  required,
  requirePermission,
  type OpContext,
  type OpResult,
  writeLog,
  writeTransaction,
} from './common';
import { createRepairTicket } from './repair';

/** Thong bao cho tat ca nguoi co quyen duyet yeu cau (theo ma tran phan quyen trong state). */
function notifyApprovers(
  draft: AppState,
  input: {
    title: string;
    message: string;
    level: 'INFO' | 'WARNING' | 'DANGER' | 'SUCCESS';
    link?: string;
  },
): void {
  const roleIds = draft.roles
    .filter((r) => r.permissions.includes('borrow.approve'))
    .map((r) => r.id);
  draft.users
    .filter((u) => roleIds.includes(u.roleId) && u.status === 'ACTIVE')
    .forEach((u) => notify(draft, { ...input, userId: u.id }));
}

export interface CreateBorrowPayload {
  type: BorrowType;
  equipmentIds: string[];
  reason: string;
  expectedReturnAt: string;
}

/** UC-13: Nhan vien gui yeu cau muon hoac tra thiet bi. */
export function createBorrowRequest(ctx: OpContext, payload: CreateBorrowPayload): OpResult {
  const denied = requirePermission(ctx, 'borrow.create');
  if (denied) return fail(denied);

  const reasonErr = required(payload.reason, 'Lý do mượn/trả');
  if (reasonErr) return fail(reasonErr);
  if (payload.reason.trim().length < 10) {
    return fail('Lý do cần ghi rõ mục đích sử dụng (tối thiểu 10 ký tự).');
  }
  if (!payload.equipmentIds.length) {
    return fail('Vui lòng chọn ít nhất một thiết bị.');
  }
  const returnErr = required(payload.expectedReturnAt, 'Thời gian dự kiến trả');
  if (returnErr) return fail(returnErr);

  const draft = draftFrom(ctx.state);
  const equipmentList = payload.equipmentIds
    .map((id) => findEquipment(draft, id))
    .filter((e): e is Equipment => Boolean(e));
  if (equipmentList.length !== payload.equipmentIds.length) {
    return fail('Một số thiết bị không còn tồn tại trong hệ thống.');
  }

  const expected = new Date(payload.expectedReturnAt);
  if (payload.type === 'MUON' && expected.getTime() <= Date.now()) {
    return fail('Thời gian dự kiến trả phải sau thời điểm hiện tại.');
  }

  // Moi thiet bi chi duoc xu ly trong MOT yeu cau tai mot thoi diem
  const busyIds = new Set(
    draft.borrowRequests
      .filter((r) => ['CHO_DUYET', 'DA_DUYET', 'DA_BAN_GIAO'].includes(r.status))
      .flatMap((r) => r.equipmentIds),
  );

  for (const item of equipmentList) {
    if (busyIds.has(item.id)) {
      return fail(`Thiết bị ${item.code} đang có yêu cầu mượn/trả khác chưa hoàn tất.`);
    }
    if (payload.type === 'MUON') {
      // Quy tac: chi duoc muon khi thiet bi o trang thai "San sang" va chua co nguoi giu
      if (item.status !== 'SAN_SANG' || item.holderId) {
        return fail(
          `Thiết bị ${item.code} (${item.name}) không ở trạng thái "Sẵn sàng" nên không thể mượn.`,
        );
      }
    } else if (item.holderId !== ctx.actor.id || item.status !== 'DANG_MUON') {
      return fail(
        `Thiết bị ${item.code} không phải do bạn đang giữ nên không thể gửi yêu cầu trả.`,
      );
    }
  }

  draft.counters.borrow = (draft.counters.borrow ?? 0) + 1;
  const n = draft.counters.borrow;
  const request: BorrowRequest = {
    id: `br-${String(n).padStart(4, '0')}-${Math.random().toString(36).slice(2, 5)}`,
    code: `YCM-${String(n).padStart(4, '0')}`,
    type: payload.type,
    requesterId: ctx.actor.id,
    equipmentIds: payload.equipmentIds,
    reason: payload.reason.trim(),
    expectedReturnAt: expected.toISOString(),
    status: 'CHO_DUYET',
    createdAt: new Date().toISOString(),
    approverId: null,
    approvedAt: null,
    rejectReason: null,
    handoverNote: null,
    completedAt: null,
    handoverById: null,
  };
  draft.borrowRequests = [request, ...draft.borrowRequests];

  writeLog(draft, ctx.actor, {
    action: payload.type === 'MUON' ? 'Tạo yêu cầu mượn thiết bị' : 'Tạo yêu cầu trả thiết bị',
    entity: 'BorrowRequest',
    entityId: request.id,
    entityLabel: request.code,
    before: null,
    after: 'CHO_DUYET',
    detail: `${equipmentList.map((e) => e.code).join(', ')} — ${request.reason}`,
  });

  notifyApprovers(draft, {
    title: `Yêu cầu ${payload.type === 'MUON' ? 'mượn' : 'trả'} mới ${request.code}`,
    message: `${ctx.actor.fullName} gửi yêu cầu ${payload.type === 'MUON' ? 'mượn' : 'trả'} ${equipmentList.length} thiết bị. Vui lòng xem xét và duyệt.`,
    level: 'WARNING',
    link: '/yeu-cau-muon-tra',
  });

  return ok(draft, `Đã gửi yêu cầu ${request.code}, đang chờ Quản lý Phòng Sản xuất duyệt.`);
}

/** UC-05: Duyet yeu cau muon/tra. */
export function approveBorrowRequest(ctx: OpContext, payload: { id: string }): OpResult {
  const denied = requirePermission(ctx, 'borrow.approve');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.borrowRequests.findIndex((r) => r.id === payload.id);
  if (index < 0) return fail('Không tìm thấy yêu cầu.');
  const request = draft.borrowRequests[index];
  if (request.status !== 'CHO_DUYET') {
    return fail('Chỉ có thể duyệt yêu cầu đang ở trạng thái "Chờ duyệt".');
  }

  // Kiem tra lai dieu kien thiet bi tai thoi diem duyet (du lieu co the da thay doi)
  for (const id of request.equipmentIds) {
    const item = findEquipment(draft, id);
    if (!item) return fail('Thiết bị trong yêu cầu không còn tồn tại.');
    if (request.type === 'MUON' && (item.status !== 'SAN_SANG' || item.holderId)) {
      return fail(
        `Thiết bị ${item.code} hiện không ở trạng thái "Sẵn sàng". Vui lòng từ chối hoặc đề nghị nhân viên cập nhật yêu cầu.`,
      );
    }
    if (request.type === 'TRA' && item.holderId !== request.requesterId) {
      return fail(`Thiết bị ${item.code} không còn do người yêu cầu giữ.`);
    }
  }

  draft.borrowRequests[index] = {
    ...request,
    status: 'DA_DUYET',
    approverId: ctx.actor.id,
    approvedAt: new Date().toISOString(),
  };

  writeLog(draft, ctx.actor, {
    action: request.type === 'MUON' ? 'Duyệt yêu cầu mượn' : 'Duyệt yêu cầu trả',
    entity: 'BorrowRequest',
    entityId: request.id,
    entityLabel: request.code,
    before: 'CHO_DUYET',
    after: 'DA_DUYET',
    detail: 'Đã kiểm tra điều kiện thiết bị trước khi duyệt.',
  });

  notify(draft, {
    userId: request.requesterId,
    title: `Yêu cầu ${request.code} đã được duyệt`,
    message:
      request.type === 'MUON'
        ? 'Vui lòng quét mã QR để nhận bàn giao thiết bị tại Phòng Sản xuất.'
        : 'Vui lòng mang thiết bị đến để Quản lý nhận trả theo quy trình quét mã QR.',
    level: 'SUCCESS',
    link: '/yeu-cau-muon-tra',
  });

  return ok(draft, `Đã duyệt yêu cầu ${request.code}.`);
}

/** UC-05: Tu choi yeu cau - BAT BUOC ghi ly do. */
export function rejectBorrowRequest(
  ctx: OpContext,
  payload: { id: string; reason: string },
): OpResult {
  const denied = requirePermission(ctx, 'borrow.approve');
  if (denied) return fail(denied);

  const reasonErr = required(payload.reason, 'Lý do từ chối');
  if (reasonErr) return fail(reasonErr);
  if (payload.reason.trim().length < 10) {
    return fail('Vui lòng ghi rõ lý do từ chối (tối thiểu 10 ký tự) để nhân viên hiểu và xử lý lại.');
  }

  const draft = draftFrom(ctx.state);
  const index = draft.borrowRequests.findIndex((r) => r.id === payload.id);
  if (index < 0) return fail('Không tìm thấy yêu cầu.');
  const request = draft.borrowRequests[index];
  if (request.status !== 'CHO_DUYET') {
    return fail('Chỉ có thể từ chối yêu cầu đang ở trạng thái "Chờ duyệt".');
  }

  draft.borrowRequests[index] = {
    ...request,
    status: 'TU_CHOI',
    approverId: ctx.actor.id,
    approvedAt: new Date().toISOString(),
    rejectReason: payload.reason.trim(),
  };

  writeLog(draft, ctx.actor, {
    action: 'Từ chối yêu cầu mượn/trả',
    entity: 'BorrowRequest',
    entityId: request.id,
    entityLabel: request.code,
    before: 'CHO_DUYET',
    after: 'TU_CHOI',
    detail: `Lý do: ${payload.reason.trim()}`,
  });

  notify(draft, {
    userId: request.requesterId,
    title: `Yêu cầu ${request.code} bị từ chối`,
    message: `Lý do: ${payload.reason.trim()}`,
    level: 'DANGER',
    link: '/yeu-cau-muon-tra',
  });

  return ok(draft, `Đã từ chối yêu cầu ${request.code} và gửi lý do cho nhân viên.`);
}

/** Huy yeu cau khi chua ban giao (nguoi gui hoac nguoi co quyen duyet). */
export function cancelBorrowRequest(
  ctx: OpContext,
  payload: { id: string; reason?: string },
): OpResult {
  const draft = draftFrom(ctx.state);
  const index = draft.borrowRequests.findIndex((r) => r.id === payload.id);
  if (index < 0) return fail('Không tìm thấy yêu cầu.');
  const request = draft.borrowRequests[index];

  const isOwner = request.requesterId === ctx.actor.id;
  const canApprove = draft.roles
    .find((r) => r.id === ctx.actor.roleId)
    ?.permissions.includes('borrow.approve');
  if (!isOwner && !canApprove) {
    return fail('Bạn không có quyền hủy yêu cầu này.');
  }
  if (!['CHO_DUYET', 'DA_DUYET'].includes(request.status)) {
    return fail('Chỉ có thể hủy yêu cầu chưa bàn giao thiết bị.');
  }

  draft.borrowRequests[index] = {
    ...request,
    status: 'DA_HUY',
    completedAt: new Date().toISOString(),
    handoverNote: payload.reason?.trim() || 'Hủy yêu cầu theo đề nghị của người liên quan.',
  };

  writeLog(draft, ctx.actor, {
    action: 'Hủy yêu cầu mượn/trả',
    entity: 'BorrowRequest',
    entityId: request.id,
    entityLabel: request.code,
    before: request.status,
    after: 'DA_HUY',
    detail: payload.reason?.trim() || 'Không có lý do cụ thể.',
  });

  return ok(draft, `Đã hủy yêu cầu ${request.code}.`);
}

/* ---------------------------- UC-14: Ban giao / nhan tra bang quet ma QR ---------------------------- */

/**
 * Doi chieu ma QR quet duoc voi danh sach thiet bi trong yeu cau.
 * Bat buoc quet du tung thiet bi de dam bao ban giao day du (tranh that lac tai san).
 */
function validateScannedCodes(
  draft: AppState,
  request: BorrowRequest,
  scannedCodes: string[],
): string | null {
  const expectedCodes = request.equipmentIds
    .map((id) => findEquipment(draft, id)?.code)
    .filter((c): c is string => Boolean(c));
  const scanned = new Set(scannedCodes.map((c) => c.trim().toUpperCase()).filter(Boolean));

  const unknown = [...scanned].filter((c) => !expectedCodes.includes(c));
  if (unknown.length) {
    return `Mã QR không thuộc yêu cầu ${request.code}: ${unknown.join(', ')}.`;
  }
  const missing = expectedCodes.filter((c) => !scanned.has(c));
  if (missing.length) {
    return `Chưa quét đủ thiết bị. Còn thiếu: ${missing.join(', ')}.`;
  }
  return null;
}

/** UC-14: Ban giao thiet bi cho nhan vien (quet QR xac nhan nhan). */
export function handoverEquipment(
  ctx: OpContext,
  payload: { requestId: string; scannedCodes: string[]; note?: string },
): OpResult {
  const denied = requirePermission(ctx, 'borrow.handover');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.borrowRequests.findIndex((r) => r.id === payload.requestId);
  if (index < 0) return fail('Không tìm thấy yêu cầu bàn giao.');
  const request = draft.borrowRequests[index];

  if (request.type !== 'MUON') {
    return fail('Yêu cầu trả thiết bị không dùng thao tác bàn giao. Vui lòng dùng chức năng "Nhận trả".');
  }
  if (request.status !== 'DA_DUYET') {
    return fail('Chỉ bàn giao được yêu cầu đã được duyệt.');
  }
  const qrError = validateScannedCodes(draft, request, payload.scannedCodes);
  if (qrError) return fail(qrError);

  const now = new Date().toISOString();
  const handoverItems: Equipment[] = [];

  for (const id of request.equipmentIds) {
    const eIndex = draft.equipment.findIndex((e) => e.id === id);
    if (eIndex < 0) continue;
    const item = draft.equipment[eIndex];
    if (item.status !== 'SAN_SANG') {
      return fail(`Thiết bị ${item.code} không còn ở trạng thái "Sẵn sàng", không thể bàn giao.`);
    }
    // Quy tac: tai mot thoi diem moi thiet bi chi co MOT nguoi chiu trach nhiem
    draft.equipment[eIndex] = {
      ...item,
      status: 'DANG_MUON',
      holderId: request.requesterId,
      condition: item.condition === 'TOT' ? 'TOT' : item.condition,
    };
    handoverItems.push(draft.equipment[eIndex]);

    writeTransaction(draft, {
      type: 'BAN_GIAO',
      equipmentId: item.id,
      requestId: request.id,
      fromUserId: null,
      toUserId: request.requesterId,
      performedById: ctx.actor.id,
      condition: item.condition,
      note: payload.note?.trim() || 'Bàn giao thiết bị, xác nhận bằng quét mã QR.',
    });

    writeLog(draft, ctx.actor, {
      action: 'Bàn giao thiết bị (quét QR)',
      entity: 'Equipment',
      entityId: item.id,
      entityLabel: item.code,
      before: 'SAN_SANG',
      after: `DANG_MUON | Người giữ: ${request.requesterId === ctx.actor.id ? ctx.actor.fullName : 'người yêu cầu'}`,
      detail: `Theo yêu cầu ${request.code}.`,
    });
  }

  draft.borrowRequests[index] = {
    ...request,
    status: 'DA_BAN_GIAO',
    handoverById: ctx.actor.id,
    handoverNote: payload.note?.trim() || request.handoverNote || null,
  };

  notify(draft, {
    userId: request.requesterId,
    title: `Đã bàn giao thiết bị theo yêu cầu ${request.code}`,
    message: `${handoverItems.length} thiết bị đã được bàn giao. Vui lòng trả đúng hạn để tránh cảnh báo quá hạn.`,
    level: 'SUCCESS',
    link: '/thiet-bi-cua-toi',
  });

  return ok(
    draft,
    `Đã bàn giao ${handoverItems.length} thiết bị theo yêu cầu ${request.code}.`,
    { request: draft.borrowRequests[index], items: handoverItems, at: now },
  );
}

export interface ReceiveReturnPayload {
  requestId: string;
  scannedCodes: string[];
  /** Thiet bi hu hong khi tra -> tu dong chuyen sang luong bao hong + tao phieu sua chua */
  damagedCodes: string[];
  note?: string;
  severity?: 'HONG_NHE' | 'HONG_NANG';
}

/**
 * UC-14 + quy tac nghiep vu: Nhan tra thiet bi bang quet QR.
 * Neu phát hiện hư hỏng khi trả, hệ thống TỰ ĐỘNG tạo phiếu sửa chữa và chuyển thiết bị
 * sang trạng thái "Chờ sửa chữa" (không cần nhập liệu thủ công).
 */
export function receiveReturnedEquipment(
  ctx: OpContext,
  payload: ReceiveReturnPayload,
): OpResult<{ request: BorrowRequest; damaged: Equipment[]; returned: Equipment[] }> {
  const denied = requirePermission(ctx, 'borrow.handover');
  if (denied) return fail(denied);

  const draft = draftFrom(ctx.state);
  const index = draft.borrowRequests.findIndex((r) => r.id === payload.requestId);
  if (index < 0) return fail('Không tìm thấy yêu cầu trả thiết bị.');
  const request = draft.borrowRequests[index];

  const isValidStep =
    (request.type === 'MUON' && request.status === 'DA_BAN_GIAO') ||
    (request.type === 'TRA' && request.status === 'DA_DUYET');
  if (!isValidStep) {
    return fail(
      'Yêu cầu phải ở trạng thái "Đã bàn giao" (mượn) hoặc "Đã duyệt" (trả) mới có thể nhận trả thiết bị.',
    );
  }
  const qrError = validateScannedCodes(draft, request, payload.scannedCodes);
  if (qrError) return fail(qrError);

  const damagedSet = new Set(payload.damagedCodes.map((c) => c.trim().toUpperCase()));
  const damaged: Equipment[] = [];
  const returned: Equipment[] = [];

  for (const id of request.equipmentIds) {
    const eIndex = draft.equipment.findIndex((e) => e.id === id);
    if (eIndex < 0) continue;
    const item = draft.equipment[eIndex];
    const isDamaged = damagedSet.has(item.code);

    if (isDamaged) {
      // Thiet bi hong khi tra -> luong sua chua, KHONG dua ve kho
      draft.equipment[eIndex] = {
        ...item,
        status: 'CHO_SUA_CHUA',
        condition: payload.severity ?? 'HONG_NHE',
        holderId: null,
      };
      damaged.push(draft.equipment[eIndex]);

      const ticket = createRepairTicket(draft, {
        equipmentId: item.id,
        reportedById: ctx.actor.id,
        issue:
          payload.note?.trim() ||
          `Phát hiện hư hỏng khi nhận trả thiết bị theo yêu cầu ${request.code}. Cần kiểm tra và sửa chữa.`,
        images: [],
        priority: (payload.severity ?? 'HONG_NHE') === 'HONG_NANG' ? 'CAO' : 'BINH_THUONG',
        autoCreated: true,
      });

      writeLog(draft, ctx.actor, {
        action: 'Nhận trả thiết bị hư hỏng',
        entity: 'Equipment',
        entityId: item.id,
        entityLabel: item.code,
        before: 'DANG_MUON',
        after: 'CHO_SUA_CHUA',
        detail: `Đã tự động tạo phiếu sửa chữa ${ticket.code}.`,
      });

      notifyRole(draft, 'TECHNICIAN', {
        title: `Phiếu sửa chữa mới ${ticket.code}`,
        message: `Thiết bị ${item.code} (${item.name}) hư hỏng khi nhận trả theo ${request.code}. Vui lòng kiểm tra và sửa chữa.`,
        level: 'WARNING',
        link: '/sua-chua',
      });
    } else {
      draft.equipment[eIndex] = {
        ...item,
        status: 'SAN_SANG',
        condition: 'TOT',
        holderId: null,
      };
      returned.push(draft.equipment[eIndex]);
    }

    // UC-16: giao dich TRA cap nhat ton kho
    writeTransaction(draft, {
      type: 'TRA',
      equipmentId: item.id,
      requestId: request.id,
      fromUserId: request.requesterId,
      toUserId: null,
      performedById: ctx.actor.id,
      condition: isDamaged ? (payload.severity ?? 'HONG_NHE') : 'TOT',
      note: isDamaged
        ? 'Nhận trả - thiết bị hư hỏng, đã chuyển sang chờ sửa chữa.'
        : 'Nhận trả thiết bị nguyên vẹn.',
    });
  }

  draft.borrowRequests[index] = {
    ...request,
    status: 'DA_HOAN_TAT',
    completedAt: new Date().toISOString(),
    handoverById: ctx.actor.id,
    handoverNote: payload.note?.trim() || request.handoverNote || null,
    damagedEquipmentIds: damaged.map((e) => e.id),
  };

  writeLog(draft, ctx.actor, {
    action: 'Nhận trả thiết bị (quét QR)',
    entity: 'BorrowRequest',
    entityId: request.id,
    entityLabel: request.code,
    before: request.status,
    after: 'DA_HOAN_TAT',
    detail: `Đã nhận ${request.equipmentIds.length} thiết bị, trong đó ${damaged.length} thiết bị hư hỏng.`,
  });

  notify(draft, {
    userId: request.requesterId,
    title: `Đã nhận trả thiết bị theo yêu cầu ${request.code}`,
    message:
      damaged.length > 0
        ? `${damaged.length} thiết bị được ghi nhận hư hỏng và đã chuyển cho Kỹ thuật viên: ${damaged
            .map((e) => e.code)
            .join(', ')}.`
        : 'Toàn bộ thiết bị đã được nhận trả nguyên vẹn. Cảm ơn bạn đã hoàn tất thủ tục.',
    level: damaged.length > 0 ? 'WARNING' : 'SUCCESS',
    link: '/yeu-cau-muon-tra',
  });

  if (damaged.length > 0) {
    notifyApprovers(draft, {
      title: `Thiết bị hư hỏng khi trả: ${damaged.map((e) => e.code).join(', ')}`,
      message: `Phiếu sửa chữa đã được tạo tự động cho ${damaged.length} thiết bị theo yêu cầu ${request.code}.`,
      level: 'DANGER',
      link: '/sua-chua',
    });
  }

  // Ton kho thay doi sau khi nhan tra -> kiem tra dinh muc Min/Max
  const categories = new Set(request.equipmentIds.map((id) => findEquipment(draft, id)?.categoryId));
  categories.forEach((c) => c && checkLowStock(draft, c));

  return ok(draft, `Đã nhận trả ${request.equipmentIds.length} thiết bị (${damaged.length} hư hỏng).`, {
    request: draft.borrowRequests[index],
    damaged,
    returned,
  });
}

/* ------------------------- Job he thong: canh bao qua han tra ------------------------- */

export interface OverdueScanPayload {
  /** Cac khoa da thong bao truoc do (tranh gui trung lap moi lan tai lai trang). */
  notifiedKeys: string[];
}

/**
 * Quy tac: qua han tra -> hien thi canh bao do + gui thong bao trong he thong.
 * Duoc chay tu dong khi tai ung dung (khong ghi audit log vi day la tac vu he thong).
 */
export function systemScanOverdue(
  ctx: OpContext,
  payload: OverdueScanPayload,
): OpResult<{ notifiedKeys: string[]; created: number }> {
  const draft = draftFrom(ctx.state);
  const keys = [...payload.notifiedKeys];
  const today = new Date().toISOString().slice(0, 10);
  let created = 0;

  draft.borrowRequests
    .filter((r) => r.status === 'DA_BAN_GIAO' && new Date(r.expectedReturnAt) < new Date())
    .forEach((r) => {
      const days = Math.max(
        1,
        Math.round((Date.now() - new Date(r.expectedReturnAt).getTime()) / 86_400_000),
      );
      const key = `${r.id}:${today}`;
      if (keys.includes(key)) return;

      notify(draft, {
        userId: r.requesterId,
        title: `Cảnh báo: thiết bị quá hạn trả ${days} ngày`,
        message: `Yêu cầu ${r.code} đã quá hạn trả ${days} ngày. Vui lòng liên hệ Quản lý Phòng Sản xuất để hoàn tất thủ tục trả thiết bị.`,
        level: 'DANGER',
        link: '/thiet-bi-cua-toi',
      });
      notifyApprovers(draft, {
        title: `Yêu cầu ${r.code} quá hạn trả ${days} ngày`,
        message: `Người mượn chưa hoàn tất thủ tục trả thiết bị. Đề nghị nhắc nhở và theo dõi.`,
        level: 'DANGER',
        link: '/bao-cao',
      });
      keys.push(key);
      created += 2;
    });

  if (created === 0) {
    return ok(draft, 'Không có yêu cầu quá hạn mới.', { notifiedKeys: keys, created });
  }
  return ok(draft, `Đã gửi ${created} thông báo cảnh báo quá hạn.`, { notifiedKeys: keys, created });
}
