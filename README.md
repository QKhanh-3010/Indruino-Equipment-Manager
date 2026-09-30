# Indruino Equipment Manager

Hệ thống quản lý trang thiết bị / vật tư của **Phòng Sản xuất – Công ty Indruino**
(React + TypeScript + Tailwind CSS, chạy hoàn toàn trên trình duyệt với dữ liệu mẫu).

## 1. Chạy ứng dụng

```bash
npm install
npm run dev      # mở http://localhost:5173
```

Các lệnh khác:

```bash
npm run typecheck   # kiểm tra kiểu TypeScript
npm run build       # kiểm tra kiểu + build production vào thư mục dist/
npm run preview     # xem thử bản build (http://localhost:4173)
npm run demo        # chạy kịch bản demo end-to-end ngay trên terminal (không cần trình duyệt)
```

### Kịch bản demo end-to-end (`npm run demo`)

`scripts/demo-flows.ts` gọi **đúng tầng nghiệp vụ** của ứng dụng (`src/services`) và in ra từng bước:
gửi yêu cầu mượn → duyệt/từ chối → bàn giao bằng quét QR → nhận trả (hư hỏng ⇒ tự sinh phiếu sửa chữa)
→ kỹ thuật viên sửa chữa → đề xuất & quyết định thanh lý → kiểm kê định kỳ → cảnh báo tồn kho,
kèm các thao tác **cố tình sai để chứng minh phân quyền và quy tắc nghiệp vụ bị chặn đúng**.

## 2. Tài khoản demo (mật khẩu chung: `Indruino@2026`)

| Vai trò | Tài khoản | Nghiệp vụ chính |
| --- | --- | --- |
| Admin | `admin` | Quản lý tài khoản, phân quyền, danh mục & định mức, xem nhật ký |
| Quản lý Phòng Sản xuất | `ql.sanxuat` | Nhập kho, duyệt mượn/trả, bàn giao QR, kiểm kê, báo cáo |
| Kỹ thuật viên | `ktv.01` | Tiếp nhận & sửa chữa thiết bị, cập nhật tình trạng, đề xuất thanh lý |
| Nhân viên Phòng Sản xuất | `nv.01` | Gửi yêu cầu mượn/trả, quét QR nhận/trả, báo hỏng |

Tài khoản `nv.02` (nhân viên) và `nv.03` (đang bị khóa để minh hoạ chức năng khóa tài khoản).

Trang đăng nhập có **4 nút đăng nhập nhanh** theo vai trò để demo ngay không cần gõ mật khẩu.

## 3. Luồng nghiệp vụ chính (demo nhanh)

1. **Nhân viên (`nv.01`)** → *Yêu cầu mượn – trả* → **Tạo yêu cầu mượn/trả**: chọn thiết bị “Sẵn sàng”, lý do, thời gian dự kiến trả.
2. **Quản lý (`ql.sanxuat`)** → *Yêu cầu mượn – trả* → **Duyệt** (hoặc **Từ chối** — bắt buộc nhập lý do).
3. **Quản lý** → *Bàn giao / nhận trả (QR)* → chọn phiếu đã duyệt → bật camera quét QR trên tem
   (hoặc bấm “Đánh dấu”/nhập mã thủ công) → **Xác nhận bàn giao**. Thiết bị chuyển sang “Đang mượn” và có đúng một người chịu trách nhiệm.
4. **Quản lý** → cùng trang, chuyển sang tab **Nhận trả** → quét lại QR → nếu tích “Thiết bị hư hỏng khi trả”
   thì hệ thống **tự động tạo phiếu sửa chữa** và chuyển thiết bị sang “Chờ sửa chữa”.
5. **Kỹ thuật viên (`ktv.01`)** → *Phiếu sửa chữa* → **Tiếp nhận** → **Hoàn thành** (thiết bị về “Sẵn sàng”)
   hoặc **Đề xuất thanh lý** (thiết bị sang “Hỏng – chờ thanh lý”).
6. **Quản lý** → *Thiết bị* → mở thiết bị chờ thanh lý → **Thanh lý thiết bị** (không xóa cứng, chỉ đổi trạng thái).
7. **Kiểm kê**: *Kiểm kê định kỳ* → **Tạo đợt kiểm kê** → quét QR đối chiếu → xem chênh lệch
   (thiếu/thừa/sai tình trạng/sai người giữ) → **Xuất biên bản kiểm kê (PDF)**.
8. **Báo cáo**: *Báo cáo – thống kê* → 5 loại báo cáo, xuất **Excel** hoặc **PDF**.
9. **Truy vết**: *Nhật ký hoạt động* (chỉ đọc) và *Lịch sử thiết bị* trong trang chi tiết thiết bị.

## 4. Cấu trúc mã nguồn

```
src/
├─ types/index.ts            Mô hình dữ liệu (Users, Roles, Equipment, Categories, BorrowRequests,
│                            Transactions, RepairTickets, InventoryAudits, AuditLogs, Notifications)
├─ lib/
│  ├─ crypto.ts              SHA-256 thuần TypeScript + băm mật khẩu kèm salt (đã kiểm thử vector NIST)
│  ├─ permissions.ts         Ma trận quyền mặc định theo vai trò
│  ├─ labels.ts              Nhãn tiếng Việt + màu badge thống nhất
│  └─ utils.ts               Định dạng ngày/tiền, xuất Excel/CSV, in PDF, nén ảnh đính kèm
├─ data/
│  ├─ seed.ts                Dữ liệu mẫu: 30 thiết bị, 6 tài khoản, 9 yêu cầu mượn/trả,
│  │                         4 phiếu sửa chữa, 2 đợt kiểm kê, nhật ký, thông báo
│  └─ store.tsx              Kho dữ liệu + phiên đăng nhập (hết hạn 8 giờ) + localStorage
├─ services/                 TẦNG NGHIỆP VỤ (tương đương kiểm tra phía server)
│  ├─ common.ts              Kiểm tra quyền, ghi audit log, sinh thông báo, cảnh báo Min/Max
│  ├─ equipment.ts           UC-04 nhập kho, UC-11 thanh lý, UC-12 cập nhật
│  ├─ borrow.ts              UC-13 tạo yêu cầu, UC-05 duyệt/từ chối, UC-14 bàn giao – nhận trả QR
│  ├─ repair.ts              UC-08..UC-11 sửa chữa & đề xuất thanh lý, UC-15 báo hỏng
│  ├─ audit.ts               UC-06 kiểm kê, đối chiếu QR, biên bản
│  ├─ admin.ts               UC-02 tài khoản, UC-03 phân quyền, danh mục, thông báo
│  ├─ selectors.ts           Thống kê, cảnh báo, lịch sử vòng đời thiết bị, việc cần xử lý
│  └─ index.ts               Registry thao tác (`runOperation`)
├─ components/               UI dùng chung: AppShell, DataTable, Modal, Toast, QrScanner, QrLabel…
└─ pages/                    20 trang theo vai trò (Dashboard, Thiết bị, Nhập kho, Mượn/trả, Bàn giao QR,
                             Sửa chữa, Báo hỏng, Kiểm kê, Báo cáo, Nhật ký, Tài khoản, Phân quyền…)
```

## 5. Quy tắc nghiệp vụ đã cài đặt trong mã nguồn

- Mỗi thiết bị tại một thời điểm chỉ có **một người chịu trách nhiệm** (`holderId`).
- Chỉ mượn được thiết bị ở trạng thái **“Sẵn sàng”** và yêu cầu **đã được duyệt**
  (kiểm tra cả khi duyệt và khi bàn giao).
- **Quét đủ tem QR** của mọi thiết bị trong phiếu mới cho bàn giao/nhận trả (`validateScannedCodes`).
- Trả thiết bị hư hỏng → **tự động sinh phiếu sửa chữa** + chuyển “Chờ sửa chữa”.
- **Quá hạn trả** → badge đỏ + thông báo trong hệ thống (job `systemScanOverdue` khi tải ứng dụng).
- **Cảnh báo tồn kho Min/Max** theo từng loại thiết bị (`checkLowStock`).
- **Không xóa cứng** dữ liệu thiết bị — chỉ chuyển trạng thái “Đã thanh lý”.
- **Từ chối yêu cầu / khóa tài khoản / thanh lý**: bắt buộc nhập lý do + hộp thoại xác nhận.
- Mọi thao tác quan trọng ghi **audit log** (ai, làm gì, thiết bị nào, lúc nào, giá trị trước/sau);
  nhật ký chỉ đọc, không thể sửa/xóa.
- **Bảo mật**: mật khẩu băm SHA-256 + salt riêng, phiên đăng nhập hết hạn sau 8 giờ,
  tài khoản bị khóa mất phiên ngay, mọi thao tác kiểm tra quyền ở tầng nghiệp vụ.

## 6. Xuất Excel / PDF

- **Excel (.xls)**: bảng HTML + BOM UTF-8, mở trực tiếp bằng Excel, hiển thị đúng tiếng Việt.
- **PDF**: mở cửa sổ in A4 với biên bản/báo cáo định dạng sẵn (chữ ký người giao – người nhận,
  thành phần kiểm kê) → chọn “Lưu thành PDF”.
- **In tem QR**: CSS `@media print` chỉ in vùng tem (`#qr-print-area`), khổ A4 – 3 tem/hàng.

## 7. Ghi chú kỹ thuật

- Dữ liệu demo lưu trong `localStorage` (khóa `iem.state.v1`); nút **Khôi phục dữ liệu mẫu** nằm ở
  trang *Tài khoản của tôi* (dành cho Admin) để trở về trạng thái ban đầu.
- Quét QR dùng camera qua `html5-qrcode`; luôn có ô **nhập mã thủ công** dự phòng.
- Định tuyến: `react-router-dom`; biểu đồ: `recharts`; tạo QR: `qrcode.react`; font Inter/Be Vietnam Pro.

## 8. Hướng phát triển tiếp theo

- Tách tầng nghiệp vụ hiện tại thành API thật (Node.js/NestJS hoặc Supabase) — các hàm trong
  `src/services` đã được thiết kế theo dạng `(context, payload) => result` nên có thể chuyển thẳng thành endpoint.
- Bổ sung refresh token, đăng nhập 2 lớp (2FA), nhật ký đăng nhập riêng và khóa tài khoản sau nhiều lần sai mật khẩu.
- Gửi thông báo qua email/Zalo OA và nhắc hạn trả tự động theo lịch (cron phía server).
- Phân trang & tìm kiếm phía server khi dữ liệu lớn; đính kèm tài liệu (hợp đồng, hóa đơn) lên cloud storage.
- Bổ sung ký số biên bản, xuất PDF chuẩn Unicode trực tiếp (không qua hộp thoại in) và quản lý bảo hành thiết bị.
- Kiểm thử tự động (unit test cho `services/`, e2e cho luồng mượn – trả – sửa chữa).
