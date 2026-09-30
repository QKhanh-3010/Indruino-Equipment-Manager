/**
 * KICH BAN DEMO END-TO-END (chay bang Node, khong can trinh duyet).
 *
 * Muc dich: chung minh toan bo luong nghiep vu chinh hoat dong dung, bao gom:
 *   nhan vien gui yeu cau -> quan ly duyet/tu choi -> ban giao bang quet QR ->
 *   nhan tra (phat hien hu hong -> tu sinh phieu sua chua) -> ky thuat vien sua ->
 *   de xuat & thanh ly -> kiem ke dinh ky -> bao cao/nhat ky.
 * Dong thoi kiem chung cac QUY TAC NGHIEP VU va PHAN QUYEN (cac thao tac sai bi chan).
 *
 * Cach chay:
 *   npx esbuild scripts/demo-flows.ts --bundle --platform=node --format=esm \
 *       --outfile=tmp/demo-flows.mjs && node tmp/demo-flows.mjs
 */
import { buildSeedState } from '@/data/seed';
import { runOperation, summarizeAudit, type OperationName } from '@/services';
import { dashboardStats, overdueBorrows, stockByCategory } from '@/services/selectors';
import type { AppState, Equipment, User } from '@/types';

let state: AppState = buildSeedState();
let step = 0;
let passed = 0;
let blocked = 0;

const line = (char = '─'): void => console.log(char.repeat(78));
const heading = (title: string): void => {
  step += 1;
  console.log('');
  line();
  console.log(`BƯỚC ${step}. ${title}`);
  line();
};

const actorOf = (id: string): User => {
  const user = state.users.find((u) => u.id === id);
  if (!user) throw new Error(`Không tìm thấy người dùng ${id}`);
  return user;
};

const equipmentOf = (id: string): Equipment => {
  const item = state.equipment.find((e) => e.id === id);
  if (!item) throw new Error(`Không tìm thấy thiết bị ${id}`);
  return item;
};

/** Goi mot thao tac nghiep vu; in ket qua va tra ve OpResult. */
function call<T = unknown>(name: OperationName, actorId: string, payload?: unknown): {
  ok: boolean;
  data?: T;
  error?: string;
} {
  const result = runOperation(name, { state, actor: actorOf(actorId) }, payload ?? {});
  if (result.ok) {
    state = result.state as AppState;
    passed += 1;
    console.log(`   ✔ ${result.message}`);
    return { ok: true, data: result.data as T };
  }
  blocked += 1;
  console.log(`   ✖ BỊ CHẶN: ${result.error}`);
  return { ok: false, error: result.error };
}

const expectBlocked = (result: { ok: boolean }): void => {
  console.log(result.ok ? '   ⚠ LỖI DEMO: thao tác lẽ ra phải bị chặn!' : '   → Quy tắc/phân quyền hoạt động đúng.');
};

/** Thiet bi "San sang" chua nam trong bat ky phieu muon/tra nao dang xu ly. */
const busyIds = new Set(
  state.borrowRequests
    .filter((r) => ['CHO_DUYET', 'DA_DUYET', 'DA_BAN_GIAO'].includes(r.status))
    .flatMap((r) => r.equipmentIds),
);
const findAvailable = (count: number): Equipment[] =>
  state.equipment
    .filter((e) => e.status === 'SAN_SANG' && !e.holderId && !busyIds.has(e.id))
    .slice(0, count);

/** Goi thao tac nhung khong in tung buoc (dung cho vong lap quet nhieu thiet bi). */
function callQuiet(name: OperationName, actorId: string, payload?: unknown): void {
  const result = runOperation(name, { state, actor: actorOf(actorId) }, payload ?? {});
  if (result.ok) {
    state = result.state as AppState;
    passed += 1;
  } else {
    blocked += 1;
    console.log(`   ✖ BỊ CHẶN: ${result.error}`);
  }
}

/* ================================ 0. TONG QUAN DU LIEU MAU ================================ */
heading('Dữ liệu mẫu khởi tạo (seed)');
const stats0 = dashboardStats(state);
console.log(`   Thiết bị đang quản lý : ${stats0.total} (sẵn sàng ${stats0.available}, đang mượn ${stats0.borrowed})`);
console.log(`   Đã thanh lý            : ${stats0.retired}`);
console.log(`   Yêu cầu mượn/trả       : ${state.borrowRequests.length} phiếu (chờ duyệt ${stats0.pendingApprovals})`);
console.log(`   Phiếu sửa chữa         : ${state.repairTickets.length}`);
console.log(`   Đợt kiểm kê            : ${state.audits.length}`);
console.log(`   Nhật ký hoạt động      : ${state.auditLogs.length} bản ghi`);
console.log(`   Tài khoản              : ${state.users.map((u) => `${u.username}(${u.roleId}${u.status === 'LOCKED' ? ',đã khóa' : ''})`).join(', ')}`);

/* ================================ 1. UC-13 GUI YEU CAU MUON ================================ */
heading('UC-13 — Nhân viên (nv.01) gửi yêu cầu mượn thiết bị');
const [chosen] = findAvailable(1);
console.log(`   Thiết bị chọn: ${chosen.code} — ${chosen.name}`);
call('createBorrowRequest', 'u-staff', {
  type: 'MUON',
  equipmentIds: [chosen.id],
  reason: 'Phục vụ bảo trì hệ thống điện khu vực đóng gói trong buổi chiều.',
  expectedReturnAt: new Date(Date.now() + 4 * 86_400_000).toISOString(),
});
const pendingRequest = state.borrowRequests.find(
  (r) => r.status === 'CHO_DUYET' && r.equipmentIds.includes(chosen.id),
);
console.log(`   Phiếu mới: ${pendingRequest?.code} — trạng thái: ${pendingRequest?.status}`);

/* ==================== 2. PHAN QUYEN + QUY TAC NGHIEP VU (cac thao tac phai bi chan) ==================== */
heading('Chống thao tác vượt quyền và kiểm tra quy tắc nghiệp vụ');

console.log('   ▸ Nhân viên nv.01 tự duyệt yêu cầu (không có quyền borrow.approve):');
expectBlocked(call('approveBorrowRequest', 'u-staff', { id: pendingRequest?.id }));

console.log('   ▸ Nhân viên gửi yêu cầu mượn thiết bị ĐANG được người khác mượn (INDR-EQ-0021):');
expectBlocked(
  call('createBorrowRequest', 'u-staff', {
    type: 'MUON',
    equipmentIds: ['eq-0021'],
    reason: 'Thử mượn thiết bị đang được người khác giữ để kiểm tra quy tắc.',
    expectedReturnAt: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  }),
);

console.log('   ▸ Kỹ thuật viên tự nhập kho thiết bị (thiếu quyền equipment.create):');
expectBlocked(
  call('createEquipmentStockIn', 'u-tech', {
    name: 'Quạt test',
    categoryId: 'cat-quat',
    quantity: 1,
    supplier: 'Nhà cung cấp test',
    receivedAt: new Date().toISOString(),
  }),
);

/* ================================ 3. UC-05 TU CHOI (BAT BUOC LY DO) ================================ */
heading('UC-05 — Từ chối yêu cầu: bắt buộc ghi lý do (tối thiểu 10 ký tự)');
console.log('   ▸ Quản lý từ chối với lý do quá ngắn:');
expectBlocked(
  call('rejectBorrowRequest', 'u-manager', { id: pendingRequest?.id, reason: 'Bận' }),
);
console.log('   ▸ Quản lý từ chối với lý do hợp lệ:');
call('rejectBorrowRequest', 'u-manager', {
  id: pendingRequest?.id,
  reason: 'Thiết bị đã được điều chuyển cho kế hoạch kiểm kê định kỳ, đề nghị gửi lại yêu cầu sau ngày 30.',
});

/* ================================ 4. UC-05 DUYET YEU CAU ================================ */
heading('UC-05 — Quản lý duyệt yêu cầu mượn YCM-0001 (nv.01, 2 thiết bị)');
const request1 = state.borrowRequests.find((r) => r.code === 'YCM-0001');
if (!request1) throw new Error('Không tìm thấy YCM-0001');
call('approveBorrowRequest', 'u-manager', { id: request1.id });

/* ================================ 5. UC-14 BAN GIAO BANG QUET QR ================================ */
heading('UC-14 — Bàn giao bằng quét mã QR (phải quét đủ tem của mọi thiết bị)');
const codes = request1.equipmentIds.map((id) => equipmentOf(id).code);
console.log(`   Tem QR cần quét: ${codes.join(', ')}`);
console.log(`   ▸ Quét thiếu 1 tem (chỉ ${codes[0]}):`);
expectBlocked(
  call('handoverEquipment', 'u-manager', {
    requestId: request1.id,
    scannedCodes: [codes[0]],
    note: 'Quét thiếu tem để kiểm tra quy tắc.',
  }),
);
console.log('   ▸ Quét đủ tem và xác nhận bàn giao:');
call('handoverEquipment', 'u-manager', {
  requestId: request1.id,
  scannedCodes: codes,
  note: 'Bàn giao đủ thiết bị, tình trạng tốt.',
});
request1.equipmentIds.forEach((id) => {
  const item = equipmentOf(id);
  console.log(
    `     ${item.code}: trạng thái=${item.status}, người chịu trách nhiệm=${state.users.find((u) => u.id === item.holderId)?.fullName ?? '—'}`,
  );
});

/* ================================ 6. UC-14 NHAN TRA + TU SINH PHIEU SUA CHUA ================================ */
heading('UC-14 — Nhận trả thiết bị, phát hiện hư hỏng khi trả');
const damagedCode = codes[0];
console.log(`   Ghi nhận ${damagedCode} hư hỏng nhẹ khi trả...`);
const ticketsBefore = state.repairTickets.length;
call('receiveReturnedEquipment', 'u-manager', {
  requestId: request1.id,
  scannedCodes: codes,
  damagedCodes: [damagedCode],
  note: `Thiết bị ${damagedCode} phát ra tiếng kêu lạ khi vận hành, cần kiểm tra.`,
  severity: 'HONG_NHE',
});
console.log(`   Số phiếu sửa chữa trước: ${ticketsBefore} → sau: ${state.repairTickets.length}`);
const autoTicket = state.repairTickets[0];
console.log(
  `   Phiếu tự sinh: ${autoTicket.code} | tự động=${autoTicket.autoCreated} | trạng thái=${autoTicket.status} | thiết bị=${equipmentOf(autoTicket.equipmentId).code} (${equipmentOf(autoTicket.equipmentId).status})`,
);
const otherCode = codes[1];
console.log(`   Thiết bị còn lại ${otherCode}: trạng thái=${equipmentOf(request1.equipmentIds[1]).status} (đã về kho)`);

/* ================================ 7. UC-08/UC-09 KY THUAT VIEN SUA CHUA ================================ */
heading('UC-08 / UC-09 — Kỹ thuật viên tiếp nhận và sửa chữa thiết bị');
console.log('   ▸ Nhân viên thử tiếp nhận phiếu sửa chữa (thiếu quyền repair.handle):');
expectBlocked(call('acceptRepair', 'u-staff', { ticketId: autoTicket.id }));
console.log('   ▸ Kỹ thuật viên ktv.01 tiếp nhận phiếu:');
call('acceptRepair', 'u-tech', { ticketId: autoTicket.id });
console.log(`     → ${equipmentOf(autoTicket.equipmentId).code} chuyển sang trạng thái ${equipmentOf(autoTicket.equipmentId).status}`);
console.log('   ▸ Kỹ thuật viên hoàn thành sửa chữa:');
call('completeRepair', 'u-tech', {
  ticketId: autoTicket.id,
  solution: 'Vệ sinh khoang máy, thay bạc đạn và tra dầu, đã chạy thử đạt yêu cầu kỹ thuật.',
});
console.log(`     → ${equipmentOf(autoTicket.equipmentId).code} trạng thái=${equipmentOf(autoTicket.equipmentId).status}, tình trạng=${equipmentOf(autoTicket.equipmentId).condition}`);

/* ================================ 8. UC-11 DE XUAT & THANH LY ================================ */
heading('UC-11 — Đề xuất thanh lý (Kỹ thuật viên) và quyết định thanh lý (Quản lý)');
const ticket0016 = state.repairTickets.find((t) => t.equipmentId === 'eq-0016');
if (!ticket0016) throw new Error('Không tìm thấy phiếu sửa chữa của INDR-EQ-0016');
call('proposeLiquidation', 'u-tech', {
  ticketId: ticket0016.id,
  solution: 'Motor cháy hoàn toàn, không có linh kiện thay thế tương đương trên thị trường.',
  liquidationReason: 'Chi phí thay motor và phụ tùng vượt 70% giá trị thiết bị, không đảm bảo an toàn.',
});
console.log(`     → INDR-EQ-0016 trạng thái=${equipmentOf('eq-0016').status}`);
console.log('   ▸ Quản lý thanh lý thiết bị (KHÔNG xóa cứng, chỉ đổi trạng thái):');
call('retireEquipment', 'u-manager', {
  id: 'eq-0016',
  reason: 'Thanh lý theo biên bản họp ngày 28/09/2026 do thiết bị hỏng nặng, không còn khả năng sửa chữa.',
});
const retired = state.equipment.find((e) => e.id === 'eq-0016');
console.log(
  `     → Vẫn còn trong hệ thống: ${Boolean(retired)} | trạng thái=${retired?.status} | ngày thanh lý=${retired?.retiredAt?.slice(0, 10)} | số giao dịch lịch sử=${state.transactions.filter((t) => t.equipmentId === 'eq-0016').length}`,
);

/* ================================ 9. UC-06 KIEM KE DINH KY ================================ */
heading('UC-06 — Kiểm kê định kỳ: quét QR đối chiếu và liệt kê chênh lệch');
console.log('   ▸ Tạo đợt kiểm kê mới khi đã có đợt đang thực hiện (phải bị chặn):');
expectBlocked(
  call('createInventoryAudit', 'u-manager', {
    name: 'Kiểm kê đột xuất lần 2',
    periodFrom: new Date().toISOString(),
    periodTo: new Date(Date.now() + 3 * 86_400_000).toISOString(),
    participants: ['Trần Thị Minh Hà'],
  }),
);

const activeAudit = state.audits.find((a) => a.status === 'DANG_KIEM_KE');
if (!activeAudit) throw new Error('Không tìm thấy đợt kiểm kê đang thực hiện');
console.log(`   Đợt đang thực hiện: ${activeAudit.code} (${summarizeAudit(activeAudit).scanned}/${activeAudit.items.length} thiết bị đã đối chiếu)`);
console.log('   ▸ Quét thiết bị ĐÃ THANH LÝ (không có trong danh sách kiểm kê) → ghi nhận "Thừa":');
call('scanAuditItem', 'u-manager', { auditId: activeAudit.id, code: 'INDR-EQ-0030' });
console.log('   ▸ Hủy đợt kiểm kê chưa hoàn thành (bắt buộc ghi lý do):');
call('cancelInventoryAudit', 'u-manager', {
  auditId: activeAudit.id,
  reason: 'Trùng thời điểm với đợt kiểm kê của Ban Giám đốc, hủy để tạo đợt mới.',
});

console.log('   ▸ Tạo đợt kiểm kê mới sau khi đã hủy đợt cũ:');
call('createInventoryAudit', 'u-manager', {
  name: 'Kiểm kê định kỳ Quý IV/2026',
  periodFrom: new Date(Date.now() - 86_400_000).toISOString(),
  periodTo: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  participants: ['Trần Thị Minh Hà', 'Lê Văn Hùng', 'Phạm Thu Trang'],
  note: 'Kiểm kê toàn bộ trang thiết bị của Phòng Sản xuất bằng quét mã QR.',
});

const freshAudit = state.audits.find((a) => a.status === 'DANG_KIEM_KE');
if (!freshAudit) throw new Error('Không tạo được đợt kiểm kê mới');
const scannable = state.equipment.filter((e) => e.status !== 'DA_THANH_LY');
const missingItem = scannable[0];
console.log(`   ▸ Quét QR lần lượt ${scannable.length - 1} thiết bị trong danh sách (ẩn chi tiết từng lần quét)...`);
scannable.slice(1).forEach((item) => {
  callQuiet('scanAuditItem', 'u-manager', { auditId: freshAudit.id, code: item.code });
});
console.log(`     Đã đối chiếu ${summarizeAudit(state.audits.find((a) => a.id === freshAudit.id)!).scanned} thiết bị.`);
console.log(`   ▸ Ghi nhận thủ công: không tìm thấy ${missingItem.code} (${missingItem.name}) khi kiểm kê thực tế.`);
call('markAuditItemMissing', 'u-manager', {
  auditId: freshAudit.id,
  equipmentId: missingItem.id,
  note: 'Không tìm thấy thiết bị tại kho A – Ngăn 4, cần truy tìm trong tuần.',
});
const wrongStatusItem = scannable[1];
console.log(`   ▸ Đối chiếu sai tình trạng: ${wrongStatusItem.code} thực tế đang hỏng nhẹ (hệ thống ghi "Sẵn sàng").`);
call('setAuditItemActual', 'u-manager', {
  auditId: freshAudit.id,
  equipmentId: wrongStatusItem.id,
  actualStatus: 'CHO_SUA_CHUA',
  actualHolderId: wrongStatusItem.holderId,
  note: 'Thiết bị có dấu hiệu hỏng, chuyển sang chờ sửa chữa.',
});
console.log('   ▸ Hoàn tất đợt kiểm kê và chốt biên bản:');
call('completeInventoryAudit', 'u-manager', { auditId: freshAudit.id });

const finished = state.audits.find((a) => a.id === freshAudit.id);
if (!finished) throw new Error('Không tìm thấy đợt kiểm kê vừa hoàn tất');
const summary = summarizeAudit(finished);
console.log(`   KẾT QUẢ BIÊN BẢN ${finished.code}: tổng ${summary.total} thiết bị | đã đối chiếu ${summary.scanned}`);
console.log(
  `     Thiếu: ${summary.missing} | Thừa: ${summary.extra} | Sai tình trạng: ${summary.wrongStatus} | Sai người giữ: ${summary.wrongHolder}`,
);

/* ================================ 10. UC-16 TON KHO & CANH BAO MIN/MAX ================================ */
heading('UC-16 — Tồn kho tự động cập nhật & cảnh báo định mức Min/Max');
const stock = stockByCategory(state);
stock.forEach((row) => {
  const flag =
    row.alert === 'low' ? 'CẢNH BÁO: dưới Min' : row.alert === 'high' ? 'CẢNH BÁO: vượt Max' : 'trong định mức';
  console.log(
    `   ${row.category.name.padEnd(34)} khả dụng ${String(row.available).padStart(2)} | đang mượn ${row.borrowed} | hỏng ${row.broken} | Min/Max ${row.category.minStock}/${row.category.maxStock} → ${flag}`,
  );
});
const lowStockNotices = state.notifications.filter((n) => n.title.startsWith('Cảnh báo tồn kho'));
console.log(`   Số thông báo cảnh báo tồn kho đã sinh: ${lowStockNotices.length}`);
console.log(`   Tổng giao dịch kho (nhập/bàn giao/trả/thanh lý): ${state.transactions.length}`);

/* ================================ 11. JOB HE THONG: CANH BAO QUA HAN ================================ */
heading('Job hệ thống — Tự động cảnh báo quá hạn trả');
const overdue = overdueBorrows(state);
overdue.forEach((item) => {
  console.log(
    `   ${item.request.code} — ${item.holder}: quá hạn ${item.days} ngày (${item.equipment.map((e) => e.code).join(', ')})`,
  );
});
const scan = call<{ created: number; notifiedKeys: string[] }>('systemScanOverdue', 'u-manager', {
  notifiedKeys: [],
});
console.log(`   Số thông báo quá hạn đã gửi: ${(scan.data as { created?: number } | undefined)?.created ?? 0}`);
console.log(`   Tổng thông báo trong hệ thống: ${state.notifications.length}`);

/* ================================ 12. NHAT KY HOAT DONG (AUDIT LOG) ================================ */
heading('Nhật ký hoạt động (audit log) — ai, làm gì, lúc nào, giá trị trước/sau');
console.log(`   Tổng số bản ghi: ${state.auditLogs.length} (mới nhất trước)`);
state.auditLogs.slice(0, 6).forEach((log) => {
  console.log(
    `   • [${log.at.slice(11, 19)}] ${log.actorName} — ${log.action} → ${log.entityLabel}${log.before || log.after ? ` (${log.before ?? '—'} → ${log.after ?? '—'})` : ''}`,
  );
});

/* ================================ KET THUC ================================ */
heading('Tổng kết kịch bản demo');
const statsEnd = dashboardStats(state);
console.log(`   Thao tác thành công   : ${passed}`);
console.log(`   Thao tác bị chặn đúng : ${blocked} (phân quyền + quy tắc nghiệp vụ)`);
console.log(`   Tồn kho cuối kỳ       : sẵn sàng ${statsEnd.available} | đang mượn ${statsEnd.borrowed} | chờ sửa ${statsEnd.waitingRepair} | chờ thanh lý ${statsEnd.pendingLiquidation} | đã thanh lý ${statsEnd.retired}`);
line('═');
console.log('DEMO HOÀN TẤT — toàn bộ luồng chính đã chạy trên đúng tầng nghiệp vụ của ứng dụng.');
console.log('Mở http://localhost:5173 để trải nghiệm giao diện (đăng nhập nhanh 4 vai trò).');
line('═');
