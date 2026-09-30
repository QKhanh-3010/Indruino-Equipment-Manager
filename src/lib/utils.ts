/**
 * Cac ham tien ich dung chung: dinh dang ngay/gia, xuat Excel/PDF, in an,
 * xu ly anh dinh kem, class name...
 */

/* ---------------------------------- Class name ---------------------------------- */

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/* ---------------------------------- Ngay thang ---------------------------------- */

const DATE_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const DATETIME_FMT = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDate = (value?: string | null): string =>
  value ? DATE_FMT.format(new Date(value)) : '—';

export const formatDateTime = (value?: string | null): string =>
  value ? DATETIME_FMT.format(new Date(value)) : '—';

/** Chuyen ISO -> gia tri cho <input type="date"> (theo gio dia phuong). */
export function toDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

/** Chuyen ISO -> gia tri cho <input type="datetime-local">. */
export function toDateTimeInput(value?: string | Date | null): string {
  if (!value) return '';
  const d = typeof value === 'string' ? new Date(value) : value;
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 16);
}

export function startOfDay(value: string | Date): Date {
  const d = typeof value === 'string' ? new Date(value) : new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** So ngay qua han (duong = qua han, am = con lai). */
export function overdueDays(dueAt: string, now: Date = new Date()): number {
  const diff = startOfDay(now).getTime() - startOfDay(dueAt).getTime();
  return Math.round(diff / 86_400_000);
}

/** Qua han tra? (quy tac: canh bao mau do + thong bao trong he thong) */
export function isOverdue(dueAt: string, now: Date = new Date()): boolean {
  return overdueDays(dueAt, now) > 0;
}

export const formatCurrency = (value?: number | null): string =>
  value || value === 0 ? `${value.toLocaleString('vi-VN')} ₫` : '—';

export const formatNumber = (value: number): string => value.toLocaleString('vi-VN');

/* ---------------------------------- Sinh ma & id ---------------------------------- */

let seq = 0;
export function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${Date.now().toString(36)}${seq.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

/** Ma thiet bi: INDR-EQ-0001 (cung la noi dung ma QR). */
export function formatEquipmentCode(n: number): string {
  return `INDR-EQ-${String(n).padStart(4, '0')}`;
}

export function formatCode(prefix: string, n: number, pad = 4): string {
  return `${prefix}-${String(n).padStart(pad, '0')}`;
}

/* ---------------------------------- An toan HTML ---------------------------------- */

export function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------------------------------- Tai file ---------------------------------- */

export function downloadFile(filename: string, content: string, mime: string): void {
  // BOM UTF-8 de Excel/CSV hien thi tieng Viet khong bi loi font
  const blob = new Blob([`\uFEFF${content}`], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

/** Xuat Excel (.xls) - dung bang HTML, Excel mo truc tiep, ho tro tieng Viet co dau. */
export function exportExcel<T>(
  filename: string,
  title: string,
  columns: ExportColumn<T>[],
  rows: T[],
): void {
  const head = columns.map((c) => `<th>${escapeHtml(c.header)}</th>`).join('');
  const body = rows
    .map((row) => `<tr>${columns.map((c) => `<td>${escapeHtml(c.value(row))}</td>`).join('')}</tr>`)
    .join('');
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="utf-8" />
<style>
  table { border-collapse: collapse; font-family: 'Times New Roman', serif; }
  th { background: #1b3552; color: #ffffff; border: 1px solid #14283f; padding: 6px 8px; font-size: 12pt; }
  td { border: 1px solid #cbd5e1; padding: 5px 8px; font-size: 11pt; }
  h2 { font-family: 'Times New Roman', serif; color: #14283f; }
</style></head>
<body>
  <h2>${escapeHtml(title)}</h2>
  <p>Ngày xuất: ${escapeHtml(formatDateTime(new Date().toISOString()))} — Phòng Sản xuất, Công ty Indruino</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
  downloadFile(filename, html, 'application/vnd.ms-excel');
}

export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [
    columns.map((c) => esc(c.header)).join(','),
    ...rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')),
  ].join('\r\n');
  downloadFile(filename, csv, 'text/csv');
}

/**
 * Xuat PDF: mo cua so in cua trinh duyet voi tai lieu dinh dang san (khổ A4).
 * Nguoi dung chon "Luu thanh PDF" - khong phu thuoc thu vien ngoai.
 */
export function printDocument(title: string, bodyHtml: string): boolean {
  const win = window.open('', '_blank', 'width=900,height=1000');
  if (!win) return false;
  win.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm; }
  body { font-family: 'Be Vietnam Pro', Inter, 'Times New Roman', serif; color: #0f172a; font-size: 13px; }
  h1 { font-size: 18px; text-align: center; margin: 0 0 4px; text-transform: uppercase; }
  h2 { font-size: 15px; margin: 18px 0 6px; }
  .muted { color: #475569; }
  .center { text-align: center; }
  .head { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 12px; }
  .head .box { font-size: 12px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #94a3b8; padding: 5px 6px; font-size: 12px; vertical-align: top; }
  th { background: #e3ecf6; text-align: left; }
  .sign { display: flex; justify-content: space-between; margin-top: 36px; text-align: center; gap: 18px; }
  .sign div { flex: 1; }
  .sign .role { font-weight: 600; }
  .sign .hint { font-style: italic; color: #64748b; font-size: 11px; }
  ul { margin: 4px 0 0 18px; }
</style></head><body>${bodyHtml}
<script>window.onload = function () { setTimeout(function () { window.print(); }, 300); };</script>
</body></html>`);
  win.document.close();
  return true;
}

/** Khoi tao phan dau cua bien ban (dung chung cho bien ban ban giao / kiem ke). */
export function documentHeader(subtitle: string): string {
  return `
<div class="head">
  <div class="box">
    <strong>CÔNG TY INDRUINO</strong><br />
    <strong>PHÒNG SẢN XUẤT</strong><br />
    <span class="muted">Hệ thống quản lý trang thiết bị</span>
  </div>
  <div class="box center">
    <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br />
    <strong>Độc lập – Tự do – Hạnh phúc</strong><br />
    <span class="muted">${escapeHtml(subtitle)}</span>
  </div>
</div>`;
}

/* ---------------------------------- Anh dinh kem ---------------------------------- */

/**
 * Doc file anh thanh data URL, dong thoi thu nho anh (toi da 900px chieu rong, JPEG 0.72)
 * de tranh vuot han muc luu tru cua trinh duyet.
 */
export function readImageAsDataUrl(file: File, maxWidth = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload = () => {
      const raw = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp không phải là ảnh hợp lệ.'));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}
