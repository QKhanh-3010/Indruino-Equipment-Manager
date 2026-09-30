/**
 * Du lieu mau (seed) thuc te cho Phong San xuat - Cong ty Indruino.
 * Tat ca thoi gian duoc tinh TUONG DOI so voi thoi diem hien tai de cac canh bao
 * (qua han, sap den han) luon dung khi demo.
 *
 * Tai khoan demo (mat khau chung: Indruino@2026):
 *  - admin      / Admin
 *  - ql.sanxuat / Quan ly Phong San xuat
 *  - ktv.01     / Ky thuat vien
 *  - nv.01      / Nhan vien Phong San xuat
 */
import type {
  AppState,
  AuditLog,
  BorrowRequest,
  Category,
  Equipment,
  EquipmentCondition,
  EquipmentStatus,
  InventoryAudit,
  InventoryAuditItem,
  Notification,
  RepairTicket,
  Transaction,
  User,
} from '@/types';
import { DEFAULT_ROLES } from '@/lib/permissions';
import { formatCode, formatEquipmentCode, hashPassword, uid } from '@/lib/index';

/* ---------------------------------- Tien ich thoi gian ---------------------------------- */

const MS_DAY = 86_400_000;
const iso = (offsetDays: number, offsetHours = 0): string =>
  new Date(Date.now() + offsetDays * MS_DAY + offsetHours * 3_600_000).toISOString();

/** Mat khau chung cho cac tai khoan demo. */
export const DEMO_PASSWORD = 'Indruino@2026';

/* ---------------------------------- Nguoi dung ---------------------------------- */

interface UserSeed {
  id: string;
  username: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: User['roleId'];
  status?: User['status'];
  createdAtDaysAgo: number;
  lastLoginDaysAgo?: number;
}

const USER_SEEDS: UserSeed[] = [
  {
    id: 'u-admin',
    username: 'admin',
    fullName: 'Nguyễn Quốc Khánh',
    email: 'khanh.nguyen@indruino.vn',
    phone: '0901 234 567',
    roleId: 'ADMIN',
    createdAtDaysAgo: 400,
    lastLoginDaysAgo: 0,
  },
  {
    id: 'u-manager',
    username: 'ql.sanxuat',
    fullName: 'Trần Thị Minh Hà',
    email: 'ha.tran@indruino.vn',
    phone: '0902 345 678',
    roleId: 'MANAGER',
    createdAtDaysAgo: 380,
    lastLoginDaysAgo: 0,
  },
  {
    id: 'u-tech',
    username: 'ktv.01',
    fullName: 'Lê Văn Hùng',
    email: 'hung.le@indruino.vn',
    phone: '0903 456 789',
    roleId: 'TECHNICIAN',
    createdAtDaysAgo: 300,
    lastLoginDaysAgo: 1,
  },
  {
    id: 'u-staff',
    username: 'nv.01',
    fullName: 'Phạm Thu Trang',
    email: 'trang.pham@indruino.vn',
    phone: '0904 567 890',
    roleId: 'STAFF',
    createdAtDaysAgo: 250,
    lastLoginDaysAgo: 0,
  },
  {
    id: 'u-staff2',
    username: 'nv.02',
    fullName: 'Võ Minh Tuấn',
    email: 'tuan.vo@indruino.vn',
    phone: '0905 678 901',
    roleId: 'STAFF',
    createdAtDaysAgo: 200,
    lastLoginDaysAgo: 2,
  },
  {
    id: 'u-staff3',
    username: 'nv.03',
    fullName: 'Đỗ Thanh Bình',
    email: 'binh.do@indruino.vn',
    phone: '0906 789 012',
    roleId: 'STAFF',
    status: 'LOCKED',
    createdAtDaysAgo: 150,
    lastLoginDaysAgo: 45,
  },
];

const buildUsers = (): User[] =>
  USER_SEEDS.map((s) => {
    // Salt co dinh de du lieu mau on dinh giua cac lan tai lai trang (demo).
    const salt = `indruino-demo-salt-${s.id}`;
    return {
      id: s.id,
      username: s.username,
      passwordHash: hashPassword(DEMO_PASSWORD, salt),
      salt,
      fullName: s.fullName,
      email: s.email,
      phone: s.phone,
      roleId: s.roleId,
      department: 'Phòng Sản xuất',
      status: s.status ?? 'ACTIVE',
      createdAt: iso(-s.createdAtDaysAgo),
      lastLoginAt: s.lastLoginDaysAgo === undefined ? null : iso(-s.lastLoginDaysAgo),
    };
  });

/* ---------------------------------- Danh muc thiet bi ---------------------------------- */

const buildCategories = (): Category[] => [
  {
    id: 'cat-quat',
    code: 'QT',
    name: 'Quạt (dân dụng & công nghiệp)',
    group: 'DIEN_DAN_DUNG',
    unit: 'cái',
    minStock: 6,
    maxStock: 20,
    description: 'Quạt treo tường, quạt bàn, quạt công nghiệp, quạt thông gió',
  },
  {
    id: 'cat-ocam',
    code: 'OC',
    name: 'Ổ cắm & phích cắm',
    group: 'DIEN_DAN_DUNG',
    unit: 'bộ',
    minStock: 8,
    maxStock: 30,
    description: 'Ổ cắm đôi, ổ cắm công nghiệp, nẹp ổ cắm nổi',
  },
  {
    id: 'cat-den',
    code: 'DC',
    name: 'Đèn chiếu sáng',
    group: 'DIEN_DAN_DUNG',
    unit: 'bộ',
    minStock: 10,
    maxStock: 40,
    description: 'Đèn LED panel, đèn pha, đèn bàn, bóng tuýp',
  },
  {
    id: 'cat-daydien',
    code: 'DD',
    name: 'Dây điện & vật tư điện',
    group: 'DIEN_DAN_DUNG',
    unit: 'cuộn',
    minStock: 5,
    maxStock: 20,
    description: 'Dây đơn, dây đôi, băng keo điện, đầu cos',
  },
  {
    id: 'cat-aptomat',
    code: 'AP',
    name: 'Aptomat & thiết bị đóng cắt',
    group: 'DIEN_DAN_DUNG',
    unit: 'cái',
    minStock: 4,
    maxStock: 15,
    description: 'Aptomat MCB, aptomat chống rò, công tắc tơ',
  },
  {
    id: 'cat-mkhoan',
    code: 'MK',
    name: 'Máy khoan',
    group: 'KY_THUAT',
    unit: 'cái',
    minStock: 3,
    maxStock: 10,
    description: 'Máy khoan bê tông, khoan bàn, khoan pin',
  },
  {
    id: 'cat-mhan',
    code: 'MH',
    name: 'Máy hàn',
    group: 'KY_THUAT',
    unit: 'cái',
    minStock: 2,
    maxStock: 8,
    description: 'Máy hàn điện tử, hàn MIG/TIG',
  },
  {
    id: 'cat-dhd',
    code: 'DHD',
    name: 'Đồng hồ đo điện',
    group: 'KY_THUAT',
    unit: 'cái',
    minStock: 4,
    maxStock: 12,
    description: 'Đồng hồ vạn năng, ampe kìm, megaohm',
  },
  {
    id: 'cat-tdien',
    code: 'TD',
    name: 'Tủ điện',
    group: 'KY_THUAT',
    unit: 'cái',
    minStock: 2,
    maxStock: 8,
    description: 'Tủ điện phân phối, tủ điều khiển, tủ điện 12 module',
  },
  {
    id: 'cat-mcat',
    code: 'MC',
    name: 'Máy cắt & máy mài cầm tay',
    group: 'KY_THUAT',
    unit: 'cái',
    minStock: 3,
    maxStock: 10,
    description: 'Máy cắt sắt, máy mài góc, máy mài thẳng',
  },
];

/* ---------------------------------- Thiet bi (30 thiet bi) ---------------------------------- */

/** [ten, ma danh muc, nha cung cap, don gia, so ngay truoc khi nhap, trang thai, tinh trang, nguoi giu, vi tri] */
type EqSpec = [
  string,
  string,
  string,
  number,
  number,
  EquipmentStatus,
  EquipmentCondition,
  string | null,
  string,
];

const S = {
  dmhn: 'Điện máy Hà Nội',
  binhduong: 'Thiết bị điện Bình Dương',
  minhphat: 'Công ty TNHH Kỹ thuật Minh Phát',
  daiviet: 'Máy công nghiệp Đại Việt',
  hongky: 'Đại lý Hồng Ký Miền Bắc',
  indruino: 'Indruino tự mua sắm',
};

const EQUIPMENT_SPECS: EqSpec[] = [
  ['Quạt treo tường Senko 1800', 'cat-quat', S.dmhn, 620000, 210, 'SAN_SANG', 'TOT', null, 'Kho A – Kệ 1'],
  ['Quạt công nghiệp Deton 750W', 'cat-quat', S.daiviet, 1850000, 190, 'SAN_SANG', 'TOT', null, 'Kho A – Kệ 1'],
  ['Quạt bàn Komasu 40cm', 'cat-quat', S.dmhn, 480000, 150, 'SAN_SANG', 'TOT', null, 'Kho A – Kệ 2'],
  ['Quạt thông gió BFC 300mm', 'cat-quat', S.binhduong, 950000, 120, 'SAN_SANG', 'CAN_KIEM_TRA', null, 'Kho A – Kệ 2'],
  ['Ổ cắm đôi Panasonic 3 chấu', 'cat-ocam', S.dmhn, 145000, 200, 'SAN_SANG', 'TOT', null, 'Kho A – Ngăn 3'],
  ['Ổ cắm công nghiệp 16A 3P', 'cat-ocam', S.binhduong, 320000, 175, 'SAN_SANG', 'TOT', null, 'Kho A – Ngăn 3'],
  ['Nẹp ổ cắm nổi 4 vị trí', 'cat-ocam', S.dmhn, 210000, 140, 'SAN_SANG', 'TOT', null, 'Kho A – Ngăn 4'],
  ['Đèn LED panel 600x600 36W', 'cat-den', S.binhduong, 390000, 230, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 1'],
  ['Đèn bàn chống cận 12W', 'cat-den', S.dmhn, 250000, 160, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 1'],
  ['Đèn pha LED 100W chống nước', 'cat-den', S.daiviet, 720000, 130, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 2'],
  ['Bóng đèn tuýp LED 1m2', 'cat-den', S.dmhn, 165000, 90, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 2'],
  ['Cuộn dây điện Cadivi 2.5mm', 'cat-daydien', S.dmhn, 780000, 110, 'DANG_MUON', 'TOT', 'u-staff2', 'Tổ lắp ráp 2'],
  ['Cuộn dây điện đôi 1.0mm', 'cat-daydien', S.binhduong, 420000, 100, 'SAN_SANG', 'TOT', null, 'Kho A – Ngăn 5'],
  ['Aptomat Panasonic 32A', 'cat-aptomat', S.dmhn, 185000, 175, 'SAN_SANG', 'TOT', null, 'Kho A – Ngăn 6'],
  ['Aptomat chống rò ELCB 40A', 'cat-aptomat', S.binhduong, 620000, 95, 'SAN_SANG', 'CAN_KIEM_TRA', null, 'Kho A – Ngăn 6'],
  ['Máy khoan bê tông Bosch GBH 2-26', 'cat-mkhoan', S.minhphat, 4650000, 260, 'CHO_SUA_CHUA', 'HONG_NHE', null, 'Phòng kỹ thuật'],
  ['Máy khoan bàn Makita DP2011', 'cat-mkhoan', S.minhphat, 7250000, 240, 'SAN_SANG', 'TOT', null, 'Xưởng – Bàn máy 1'],
  ['Máy khoan pin Makita 12V', 'cat-mkhoan', S.minhphat, 3100000, 180, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 3'],
  ['Máy hàn điện tử Hồng Ký 200A', 'cat-mhan', S.hongky, 3850000, 220, 'SAN_SANG', 'TOT', null, 'Xưởng – Khu hàn'],
  ['Máy hàn MIG 250 Inverter', 'cat-mhan', S.daiviet, 12800000, 165, 'DANG_MUON', 'TOT', 'u-staff2', 'Tổ lắp ráp 2'],
  ['Đồng hồ vạn năng Kyoritsu 1009', 'cat-dhd', S.minhphat, 1950000, 200, 'DANG_MUON', 'CAN_KIEM_TRA', 'u-staff', 'Tổ lắp ráp 1'],
  ['Ampe kìm Hioki 3280-10F', 'cat-dhd', S.minhphat, 3450000, 170, 'SAN_SANG', 'TOT', null, 'Phòng kỹ thuật'],
  ['Megaohm kế 1000V', 'cat-dhd', S.minhphat, 5600000, 145, 'SAN_SANG', 'TOT', null, 'Phòng kỹ thuật'],
  ['Tủ điện 12 module', 'cat-tdien', S.binhduong, 1250000, 155, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 4'],
  ['Tủ điện điều khiển 800x600', 'cat-tdien', S.daiviet, 8900000, 300, 'SAN_SANG', 'TOT', null, 'Xưởng – Góc Đông'],
  ['Tủ điện phân phối tổng MSB', 'cat-tdien', S.daiviet, 15400000, 330, 'DANG_SUA', 'HONG_NANG', null, 'Phòng điện – Vị trí 1'],
  ['Máy cắt sắt cầm tay Makita', 'cat-mcat', S.minhphat, 2950000, 190, 'DANG_MUON', 'TOT', 'u-staff', 'Tổ lắp ráp 1'],
  ['Máy mài góc Bosch GWS 900', 'cat-mcat', S.minhphat, 2450000, 140, 'SAN_SANG', 'TOT', null, 'Kho B – Kệ 3'],
  ['Máy mài thẳng Makita 906', 'cat-mcat', S.minhphat, 2750000, 350, 'HONG_CHO_THANH_LY', 'HONG_NANG', null, 'Khu chờ thanh lý'],
  ['Máy khoan bàn cũ (đã thanh lý)', 'cat-mkhoan', S.indruino, 1200000, 900, 'DA_THANH_LY', 'HONG_NANG', null, 'Khu chờ thanh lý'],
];

const buildEquipment = (): Equipment[] =>
  EQUIPMENT_SPECS.map((spec, index) => {
    const [
      name,
      categoryId,
      supplier,
      price,
      receivedDaysAgo,
      status,
      condition,
      holderId,
      location,
    ] = spec;
    const n = index + 1;
    const retired = status === 'DA_THANH_LY';
    return {
      id: `eq-${String(n).padStart(4, '0')}`,
      code: formatEquipmentCode(n),
      name,
      categoryId,
      serial: `SN-${100000 + n * 37}`,
      supplier,
      receivedAt: iso(-receivedDaysAgo),
      price,
      status,
      condition,
      holderId,
      location,
      createdAt: iso(-receivedDaysAgo),
      retiredAt: retired ? iso(-45) : null,
      retiredReason: retired
        ? 'Motor cháy, chi phí sửa chữa vượt 70% giá trị thiết bị (đề xuất của Kỹ thuật viên).'
        : null,
    };
  });

/* ---------------------------------- Yeu cau muon / tra ---------------------------------- */

const buildBorrowRequests = (equipment: Equipment[]): BorrowRequest[] => {
  const codeOf = (id: string) => equipment.find((e) => e.id === id)?.code ?? id;
  const base = (
    n: number,
    data: Omit<BorrowRequest, 'id' | 'code'>,
  ): BorrowRequest => ({ id: `br-${String(n).padStart(4, '0')}`, code: formatCode('YCM', n), ...data });

  return [
    // 1. Cho duyet - Quan ly can xu ly
    base(1, {
      type: 'MUON',
      requesterId: 'u-staff',
      equipmentIds: ['eq-0001', 'eq-0005'],
      reason: 'Phục vụ lắp đặt hệ thống chiếu sáng khu vực đóng gói (tổ lắp ráp 1).',
      expectedReturnAt: iso(7),
      status: 'CHO_DUYET',
      createdAt: iso(-1, -3),
      approverId: null,
      approvedAt: null,
      rejectReason: null,
    }),
    // 2. Da duyet - cho ban giao bang quet QR
    base(2, {
      type: 'MUON',
      requesterId: 'u-staff2',
      equipmentIds: ['eq-0017'],
      reason: 'Gia công chi tiết khung nhôm cho dây chuyền mới.',
      expectedReturnAt: iso(5),
      status: 'DA_DUYET',
      createdAt: iso(-2, -5),
      approverId: 'u-manager',
      approvedAt: iso(-2),
      rejectReason: null,
    }),
    // 3. Da ban giao nhung QUA HAN tra (-5 ngay) => canh bao do + thong bao
    base(3, {
      type: 'MUON',
      requesterId: 'u-staff',
      equipmentIds: ['eq-0021'],
      reason: 'Đo kiểm tra thông số điện áp tủ điện phân phối.',
      expectedReturnAt: iso(-5),
      status: 'DA_BAN_GIAO',
      createdAt: iso(-12),
      approverId: 'u-manager',
      approvedAt: iso(-12, 2),
      rejectReason: null,
      handoverById: 'u-manager',
    }),
    // 4. Dang muon, con han
    base(4, {
      type: 'MUON',
      requesterId: 'u-staff2',
      equipmentIds: ['eq-0020'],
      reason: 'Hàn khung bảo vệ máy đóng gói trong 3 ngày.',
      expectedReturnAt: iso(3),
      status: 'DA_BAN_GIAO',
      createdAt: iso(-3, -2),
      approverId: 'u-manager',
      approvedAt: iso(-3),
      rejectReason: null,
      handoverById: 'u-manager',
    }),
    // 5. Bi tu choi - bat buoc co ly do
    base(5, {
      type: 'MUON',
      requesterId: 'u-staff',
      equipmentIds: ['eq-0009'],
      reason: 'Mượn đèn bàn cho tổ kiểm tra chất lượng.',
      expectedReturnAt: iso(10),
      status: 'TU_CHOI',
      createdAt: iso(-6),
      approverId: 'u-manager',
      approvedAt: iso(-6, 3),
      rejectReason: 'Thiết bị đã được điều chuyển cho kế hoạch kiểm kê định kỳ, đề nghị sử dụng đèn bàn của tổ và gửi lại yêu cầu sau ngày 30.',
    }),
    // 6. Da hoan tat (muon + da tra)
    base(6, {
      type: 'MUON',
      requesterId: 'u-staff2',
      equipmentIds: ['eq-0024'],
      reason: 'Thay thế tủ điện 12 module cho xưởng phụ.',
      expectedReturnAt: iso(-9),
      status: 'DA_HOAN_TAT',
      createdAt: iso(-20),
      approverId: 'u-manager',
      approvedAt: iso(-20, 2),
      rejectReason: null,
      completedAt: iso(-8),
      handoverById: 'u-manager',
    }),
    // 7. Yeu cau tra dang cho duyet (thiet bi dang qua han)
    base(7, {
      type: 'TRA',
      requesterId: 'u-staff',
      equipmentIds: ['eq-0021'],
      reason: 'Đã hoàn thành đo kiểm, đề nghị nhận trả thiết bị theo đúng quy trình.',
      expectedReturnAt: iso(0, 4),
      status: 'CHO_DUYET',
      createdAt: iso(-1),
      approverId: null,
      approvedAt: null,
      rejectReason: null,
      handoverNote: `Thiết bị ${codeOf('eq-0021')} còn hoạt động tốt, đã vệ sinh.`,
    }),
    // 8. Qua han - may cat sat
    base(8, {
      type: 'MUON',
      requesterId: 'u-staff',
      equipmentIds: ['eq-0027'],
      reason: 'Cắt sắt làm giá đỡ băng tải tổ lắp ráp 1.',
      expectedReturnAt: iso(-2),
      status: 'DA_BAN_GIAO',
      createdAt: iso(-9),
      approverId: 'u-manager',
      approvedAt: iso(-9, 1),
      rejectReason: null,
      handoverById: 'u-manager',
    }),
    // 9. Dang muon binh thuong
    base(9, {
      type: 'MUON',
      requesterId: 'u-staff2',
      equipmentIds: ['eq-0012'],
      reason: 'Đi dây điện cho bảng điều khiển tổ lắp ráp 2.',
      expectedReturnAt: iso(2),
      status: 'DA_BAN_GIAO',
      createdAt: iso(-5),
      approverId: 'u-manager',
      approvedAt: iso(-5, 2),
      rejectReason: null,
      handoverById: 'u-manager',
    }),
  ];
};

/* ---------------------------------- Giao dich (nhat ky nhap/xuat kho) ---------------------------------- */

const buildTransactions = (
  equipment: Equipment[],
  requests: BorrowRequest[],
): Transaction[] => {
  const rows: Transaction[] = [];
  let n = 0;
  const push = (data: Omit<Transaction, 'id' | 'code'>): void => {
    n += 1;
    rows.push({ id: `tx-${String(n).padStart(4, '0')}`, code: formatCode('GD', n, 5), ...data });
  };

  // UC-04: moi thiet bi deu co giao dich NHAP_KHO
  equipment.forEach((e) => {
    push({
      type: 'NHAP_KHO',
      equipmentId: e.id,
      fromUserId: null,
      toUserId: null,
      performedById: 'u-manager',
      at: e.receivedAt,
      condition: e.condition,
      note: `Nhập kho từ ${e.supplier ?? 'nhà cung cấp'} theo phiếu nhập kho.`,
    });
  });

  // Ban giao / nhan tra theo cac yeu cau da duoc xu ly
  requests.forEach((r) => {
    const handled = ['DA_BAN_GIAO', 'DA_HOAN_TAT'].includes(r.status);
    if (!handled) return;
    r.equipmentIds.forEach((eqId) => {
      push({
        type: 'BAN_GIAO',
        equipmentId: eqId,
        requestId: r.id,
        fromUserId: null,
        toUserId: r.requesterId,
        performedById: r.handoverById ?? r.approverId ?? 'u-manager',
        at: r.approvedAt ? iso(
          Math.round((new Date(r.approvedAt).getTime() - Date.now()) / MS_DAY),
        ) : r.createdAt,
        condition: 'TOT',
        note: `Bàn giao theo yêu cầu ${r.code} (quét mã QR xác nhận).`,
      });
    });
  });

  // Tra thiet bi cua yeu cau da hoan tat
  requests
    .filter((r) => r.status === 'DA_HOAN_TAT')
    .forEach((r) => {
      r.equipmentIds.forEach((eqId) => {
        push({
          type: 'TRA',
          equipmentId: eqId,
          requestId: r.id,
          fromUserId: r.requesterId,
          toUserId: null,
          performedById: 'u-manager',
          at: r.completedAt ?? iso(-8),
          condition: 'TOT',
          note: `Nhận trả thiết bị theo yêu cầu ${r.code}.`,
        });
      });
    });

  // Thanh ly: giu lich su, khong xoa du lieu
  const retired = equipment.find((e) => e.status === 'DA_THANH_LY');
  if (retired) {
    push({
      type: 'THANH_LY',
      equipmentId: retired.id,
      fromUserId: null,
      toUserId: null,
      performedById: 'u-manager',
      at: retired.retiredAt ?? iso(-45),
      condition: 'HONG_NANG',
      note: 'Thanh lý theo biên bản thanh lý trang thiết bị đã hỏng.',
    });
  }

  return rows;
};

/* ---------------------------------- Phieu sua chua ---------------------------------- */

const buildRepairTickets = (): RepairTicket[] => {
  const base = (n: number, data: Omit<RepairTicket, 'id' | 'code'>): RepairTicket => ({
    id: `rt-${String(n).padStart(4, '0')}`,
    code: formatCode('SC', n),
    ...data,
  });

  return [
    // RT-01: sinh TU DONG khi tra thiet bi hong (quy tac nghiep vu)
    base(1, {
      equipmentId: 'eq-0016',
      reportedById: 'u-staff',
      reportedAt: iso(-2, -4),
      issue:
        'Khi trả thiết bị phát hiện máy khoan bê tông phát ra tiếng kêu lạ, mũi khoan bị kẹt và đầu khoan nóng bất thường.',
      images: [],
      priority: 'CAO',
      status: 'CHO_TIEP_NHAN',
      technicianId: null,
      acceptedAt: null,
      completedAt: null,
      solution: null,
      proposeLiquidation: false,
      liquidationReason: null,
      autoCreated: true,
    }),
    // RT-02: dang sua
    base(2, {
      equipmentId: 'eq-0026',
      reportedById: 'u-manager',
      reportedAt: iso(-4),
      issue: 'Tủ điện phân phối tổng MSB bị chập aptomat tổng, có mùi khét, không cấp điện được cho xưởng.',
      images: [],
      priority: 'CAO',
      status: 'DANG_SUA',
      technicianId: 'u-tech',
      acceptedAt: iso(-3),
      completedAt: null,
      solution: 'Đang thay aptomat tổng 63A, kiểm tra lại thanh cái và đường dây cấp nguồn.',
      proposeLiquidation: false,
      liquidationReason: null,
    }),
    // RT-03: da hoan thanh
    base(3, {
      equipmentId: 'eq-0028',
      reportedById: 'u-staff2',
      reportedAt: iso(-9),
      issue: 'Máy mài góc bị rung mạnh, chổi than mòn, không đạt tốc độ quay định mức.',
      images: [],
      priority: 'BINH_THUONG',
      status: 'HOAN_THANH',
      technicianId: 'u-tech',
      acceptedAt: iso(-8),
      completedAt: iso(-6),
      solution: 'Thay chổi than mới, vệ sinh khoang máy, tra dầu bạc đạn. Đã chạy thử đạt yêu cầu.',
      proposeLiquidation: false,
      liquidationReason: null,
    }),
    // RT-04: khong sua duoc + de xuat thanh ly
    base(4, {
      equipmentId: 'eq-0029',
      reportedById: 'u-staff',
      reportedAt: iso(-7),
      issue: 'Máy mài thẳng cháy motor, có mùi khét, không lên nguồn sau khi thử cắm điện.',
      images: [],
      priority: 'CAO',
      status: 'KHONG_SUA_DUOC',
      technicianId: 'u-tech',
      acceptedAt: iso(-6),
      completedAt: iso(-4),
      solution: 'Motor cháy hoàn toàn, không có linh kiện thay thế tương đương trên thị trường.',
      proposeLiquidation: true,
      liquidationReason:
        'Chi phí thay motor và phụ tùng vượt 70% giá trị thiết bị, không đảm bảo an toàn khi sử dụng.',
    }),
  ];
};

/* ---------------------------------- Kiem ke dinh ky (UC-06) ---------------------------------- */

const mkAuditItem = (
  e: Equipment,
  override: Partial<InventoryAuditItem> = {},
): InventoryAuditItem => ({
  equipmentId: e.id,
  expectedStatus: e.status,
  expectedHolderId: e.holderId,
  scanned: false,
  scannedAt: null,
  actualFound: false,
  actualStatus: null,
  actualHolderId: null,
  discrepancy: null,
  ...override,
});

const buildAudits = (equipment: Equipment[], users: User[]): InventoryAudit[] => {
  const inSystem = equipment.filter((e) => e.status !== 'DA_THANH_LY');
  const manager = users.find((u) => u.id === 'u-manager');
  const tech = users.find((u) => u.id === 'u-tech');
  const staff = users.find((u) => u.id === 'u-staff');

  // Đợt 1: đã hoàn thành, có phát hiện chênh lệch (thiếu 1, sai tình trạng 1)
  const items1 = inSystem.map((e) =>
    mkAuditItem(e, {
      scanned: true,
      scannedAt: iso(-29),
      actualFound: true,
      actualStatus: e.status,
      actualHolderId: e.holderId,
    }),
  );
  const idx4 = items1.findIndex((i) => i.equipmentId === 'eq-0004');
  if (idx4 >= 0) {
    items1[idx4] = {
      ...items1[idx4],
      discrepancy: 'SAI_TINH_TRANG',
      actualStatus: 'CHO_SUA_CHUA',
      note: 'Quạt thông gió chạy yếu, phát tiếng ồn – đã lập phiếu yêu cầu kiểm tra.',
    };
  }
  const idx15 = items1.findIndex((i) => i.equipmentId === 'eq-0015');
  if (idx15 >= 0) {
    items1[idx15] = {
      ...items1[idx15],
      actualFound: false,
      actualStatus: null,
      actualHolderId: null,
      discrepancy: 'THIEU',
      note: 'Không tìm thấy tại kho A – Ngăn 6, đã ghi nhận để truy tìm.',
    };
  }

  // Đợt 2: đang thực hiện (đã quét 4 thiết bị, 1 thiết bị thiếu)
  const items2 = inSystem.map((e) => mkAuditItem(e));
  const scannedMap: Record<string, Partial<InventoryAuditItem>> = {
    'eq-0001': { actualStatus: 'SAN_SANG', actualHolderId: null },
    'eq-0002': { actualStatus: 'SAN_SANG', actualHolderId: null },
    'eq-0003': { actualStatus: 'SAN_SANG', actualHolderId: null },
    'eq-0021': {
      actualStatus: 'DANG_MUON',
      actualHolderId: 'u-staff',
      discrepancy: 'SAI_NGUOI_GIU',
      note: 'Thiết bị đang quá hạn trả, người giữ thực tế: Phạm Thu Trang.',
    },
  };
  items2.forEach((item, index) => {
    const override = scannedMap[item.equipmentId];
    if (override) {
      items2[index] = {
        ...item,
        scanned: true,
        actualFound: true,
        scannedAt: iso(-0.5, index),
        ...override,
      };
    }
  });

  return [
    {
      id: 'aud-0001',
      code: formatCode('KK', 1),
      name: 'Kiểm kê định kỳ Quý III/2026',
      periodFrom: iso(-31),
      periodTo: iso(-28),
      createdById: 'u-manager',
      createdAt: iso(-31),
      status: 'HOAN_THANH',
      items: items1,
      completedAt: iso(-28),
      participants: [manager?.fullName ?? '', tech?.fullName ?? '', staff?.fullName ?? ''].filter(
        Boolean,
      ),
      note: 'Kiểm kê toàn bộ trang thiết bị của Phòng Sản xuất, đối chiếu bằng quét mã QR.',
    },
    {
      id: 'aud-0002',
      code: formatCode('KK', 2),
      name: 'Kiểm kê đột xuất tháng 9/2026',
      periodFrom: iso(-2),
      periodTo: iso(5),
      createdById: 'u-manager',
      createdAt: iso(-1),
      status: 'DANG_KIEM_KE',
      items: items2,
      completedAt: null,
      participants: [manager?.fullName ?? '', tech?.fullName ?? ''].filter(Boolean),
      note: 'Kiểm kê đột xuất theo yêu cầu của Ban Giám đốc sau khi phát hiện thiếu thiết bị.',
    },
  ];
};

/* ---------------------------------- Nhat ky hoat dong (audit log) ---------------------------------- */

interface LogSeed {
  daysAgo: number;
  hours?: number;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  entityLabel: string;
  before?: string;
  after?: string;
  detail?: string;
}

const LOG_SEEDS: LogSeed[] = [
  {
    daysAgo: 0.2,
    actorId: 'u-staff',
    actorName: 'Phạm Thu Trang',
    action: 'Đăng nhập hệ thống',
    entity: 'Session',
    entityId: 'u-staff',
    entityLabel: 'Phạm Thu Trang',
    detail: 'Đăng nhập thành công từ trình duyệt Chrome (demo).',
  },
  {
    daysAgo: 1,
    actorId: 'u-staff',
    actorName: 'Phạm Thu Trang',
    action: 'Tạo yêu cầu trả thiết bị',
    entity: 'BorrowRequest',
    entityId: 'br-0007',
    entityLabel: 'YCM-0007',
    after: 'Chờ duyệt',
    detail: 'Yêu cầu trả thiết bị INDR-EQ-0021 (đồng hồ vạn năng Kyoritsu).',
  },
  {
    daysAgo: 1.3,
    actorId: 'u-staff',
    actorName: 'Phạm Thu Trang',
    action: 'Tạo yêu cầu mượn thiết bị',
    entity: 'BorrowRequest',
    entityId: 'br-0001',
    entityLabel: 'YCM-0001',
    after: 'Chờ duyệt',
    detail: 'Mượn 2 thiết bị: INDR-EQ-0001, INDR-EQ-0005.',
  },
  {
    daysAgo: 2,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Bàn giao thiết bị (quét QR)',
    entity: 'Equipment',
    entityId: 'eq-0016',
    entityLabel: 'INDR-EQ-0016',
    before: 'Chờ sửa chữa',
    after: 'Chờ sửa chữa',
    detail: 'Tiếp nhận thiết bị hư hỏng khi trả, hệ thống tự sinh phiếu sửa chữa SC-0001.',
  },
  {
    daysAgo: 2.1,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Duyệt yêu cầu mượn',
    entity: 'BorrowRequest',
    entityId: 'br-0002',
    entityLabel: 'YCM-0002',
    before: 'Chờ duyệt',
    after: 'Đã duyệt',
    detail: 'Duyệt cho Võ Minh Tuấn mượn máy khoan bàn Makita DP2011.',
  },
  {
    daysAgo: 2,
    actorId: 'u-manager',
    actorName: 'Hệ thống',
    action: 'Thông báo tự động',
    entity: 'Equipment',
    entityId: 'eq-0027',
    entityLabel: 'INDR-EQ-0027',
    detail: 'Phát hiện thiết bị quá hạn trả 2 ngày, gửi cảnh báo cho người giữ và Quản lý.',
  },
  {
    daysAgo: 3,
    actorId: 'u-tech',
    actorName: 'Lê Văn Hùng',
    action: 'Tiếp nhận phiếu sửa chữa',
    entity: 'RepairTicket',
    entityId: 'rt-0002',
    entityLabel: 'SC-0002',
    before: 'Chờ tiếp nhận',
    after: 'Đang sửa',
    detail: 'Tiếp nhận sửa tủ điện phân phối tổng MSB.',
  },
  {
    daysAgo: 4,
    actorId: 'u-tech',
    actorName: 'Lê Văn Hùng',
    action: 'Đề xuất thanh lý thiết bị',
    entity: 'Equipment',
    entityId: 'eq-0029',
    entityLabel: 'INDR-EQ-0029',
    before: 'Đang sửa',
    after: 'Hỏng – chờ thanh lý',
    detail: 'Motor cháy, chi phí sửa vượt 70% giá trị thiết bị.',
  },
  {
    daysAgo: 6,
    actorId: 'u-tech',
    actorName: 'Lê Văn Hùng',
    action: 'Hoàn thành sửa chữa',
    entity: 'RepairTicket',
    entityId: 'rt-0003',
    entityLabel: 'SC-0003',
    before: 'Đang sửa',
    after: 'Hoàn thành',
    detail: 'Thay chổi than cho máy mài góc Bosch GWS 900.',
  },
  {
    daysAgo: 6.2,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Từ chối yêu cầu mượn',
    entity: 'BorrowRequest',
    entityId: 'br-0005',
    entityLabel: 'YCM-0005',
    before: 'Chờ duyệt',
    after: 'Từ chối',
    detail: 'Lý do: thiết bị đã được điều chuyển cho kế hoạch kiểm kê định kỳ.',
  },
  {
    daysAgo: 8,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Nhận trả thiết bị',
    entity: 'Equipment',
    entityId: 'eq-0024',
    entityLabel: 'INDR-EQ-0024',
    before: 'Đang mượn',
    after: 'Sẵn sàng',
    detail: 'Nhận trả tủ điện 12 module theo yêu cầu YCM-0006, tình trạng Tốt.',
  },
  {
    daysAgo: 30,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Tạo đợt kiểm kê',
    entity: 'InventoryAudit',
    entityId: 'aud-0001',
    entityLabel: 'KK-0001',
    after: 'Đang kiểm kê',
    detail: 'Tạo đợt kiểm kê định kỳ Quý III/2026 cho toàn bộ trang thiết bị Phòng Sản xuất.',
  },
  {
    daysAgo: 28,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Hoàn thành kiểm kê',
    entity: 'InventoryAudit',
    entityId: 'aud-0001',
    entityLabel: 'KK-0001',
    before: 'Đang kiểm kê',
    after: 'Hoàn thành',
    detail: 'Phát hiện 1 thiết bị thiếu và 1 thiết bị sai tình trạng, đã xuất biên bản kiểm kê.',
  },
  {
    daysAgo: 45,
    actorId: 'u-manager',
    actorName: 'Trần Thị Minh Hà',
    action: 'Thanh lý thiết bị',
    entity: 'Equipment',
    entityId: 'eq-0030',
    entityLabel: 'INDR-EQ-0030',
    before: 'Hỏng – chờ thanh lý',
    after: 'Đã thanh lý',
    detail: 'Thanh lý máy khoan bàn cũ theo biên bản, giữ nguyên lịch sử thiết bị.',
  },
  {
    daysAgo: 50,
    actorId: 'u-admin',
    actorName: 'Nguyễn Quốc Khánh',
    action: 'Khóa tài khoản người dùng',
    entity: 'User',
    entityId: 'u-staff3',
    entityLabel: 'nv.03',
    before: 'Đang hoạt động',
    after: 'Đã khóa',
    detail: 'Khóa tài khoản do nhân viên chuyển công tác khác.',
  },
];

const buildAuditLogs = (): AuditLog[] =>
  LOG_SEEDS.map((s, index) => ({
    id: `log-${String(index + 1).padStart(4, '0')}`,
    at: iso(-s.daysAgo, s.hours ?? 0),
    actorId: s.actorId,
    actorName: s.actorName,
    action: s.action,
    entity: s.entity,
    entityId: s.entityId,
    entityLabel: s.entityLabel,
    before: s.before ?? null,
    after: s.after ?? null,
    detail: s.detail,
  }));

/* ---------------------------------- Thong bao ---------------------------------- */

const buildNotifications = (): Notification[] => [
  {
    id: 'ng-0001',
    userId: 'u-staff',
    title: 'Thiết bị quá hạn trả 5 ngày',
    message:
      'Thiết bị INDR-EQ-0021 (Đồng hồ vạn năng Kyoritsu 1009) đã quá hạn trả. Vui lòng liên hệ Quản lý Phòng Sản xuất để hoàn tất thủ tục trả.',
    level: 'DANGER',
    at: iso(-1, -2),
    read: false,
    link: '/yeu-cau-muon-tra',
  },
  {
    id: 'ng-0002',
    userId: 'u-staff',
    title: 'Thiết bị quá hạn trả 2 ngày',
    message:
      'Thiết bị INDR-EQ-0027 (Máy cắt sắt cầm tay Makita) đã quá hạn trả. Đề nghị trả thiết bị trong hôm nay.',
    level: 'DANGER',
    at: iso(-1, -1),
    read: false,
    link: '/thiet-bi-cua-toi',
  },
  {
    id: 'ng-0003',
    userId: 'u-manager',
    title: 'Có 2 yêu cầu mượn/trả chờ duyệt',
    message: 'Yêu cầu YCM-0001 (mượn) và YCM-0007 (trả) đang chờ Quản lý xử lý.',
    level: 'WARNING',
    at: iso(-1, -3),
    read: false,
    link: '/yeu-cau-muon-tra',
  },
  {
    id: 'ng-0004',
    userId: 'u-tech',
    title: 'Có phiếu sửa chữa chờ tiếp nhận',
    message:
      'Phiếu SC-0001 cho thiết bị INDR-EQ-0016 (Máy khoan bê tông Bosch) đang chờ Kỹ thuật viên tiếp nhận.',
    level: 'WARNING',
    at: iso(-2, -4),
    read: false,
    link: '/sua-chua',
  },
  {
    id: 'ng-0005',
    userId: 'u-manager',
    title: 'Kỹ thuật viên đề xuất thanh lý thiết bị',
    message:
      'Thiết bị INDR-EQ-0029 (Máy mài thẳng Makita 906) được đề xuất thanh lý do hư hỏng nặng.',
    level: 'DANGER',
    at: iso(-4),
    read: false,
    link: '/thiet-bi/eq-0029',
  },
  {
    id: 'ng-0006',
    userId: null,
    title: 'Cảnh báo tồn kho thấp',
    message:
      'Danh mục "Máy hàn" chỉ còn 1 thiết bị khả dụng, thấp hơn định mức tối thiểu (Min = 2). Đề nghị lập kế hoạch nhập kho.',
    level: 'WARNING',
    at: iso(-3, -6),
    read: false,
    link: '/bao-cao',
  },
  {
    id: 'ng-0007',
    userId: 'u-manager',
    title: 'Đã hoàn thành sửa chữa SC-0003',
    message:
      'Máy mài góc Bosch GWS 900 (INDR-EQ-0028) đã được sửa xong và đưa về trạng thái Sẵn sàng.',
    level: 'SUCCESS',
    at: iso(-6),
    read: true,
    link: '/sua-chua',
  },
];

/* ---------------------------------- Khoi tao state ---------------------------------- */

export const STATE_VERSION = 1;

/** Tao toan bo du lieu mau cho he thong. */
export function buildSeedState(): AppState {
  const users = buildUsers();
  const categories = buildCategories();
  const equipment = buildEquipment();
  const borrowRequests = buildBorrowRequests(equipment);
  const transactions = buildTransactions(equipment, borrowRequests);
  const repairTickets = buildRepairTickets();
  const audits = buildAudits(equipment, users);
  const auditLogs = buildAuditLogs();
  const notifications = buildNotifications();

  return {
    version: STATE_VERSION,
    roles: DEFAULT_ROLES.map((r) => ({ ...r, permissions: [...r.permissions] })),
    users,
    categories,
    equipment,
    borrowRequests,
    transactions,
    repairTickets,
    audits,
    auditLogs,
    notifications,
    counters: {
      equipment: equipment.length,
      user: users.length,
      borrow: borrowRequests.length,
      repair: repairTickets.length,
      audit: audits.length,
      transaction: transactions.length,
      auditLog: auditLogs.length,
      notification: notifications.length,
      category: categories.length,
    },
  };
}

/** Id duy nhat cho cac ban ghi sinh ra trong qua trinh su dung. */
export const nextId = (prefix: string): string => uid(prefix);
