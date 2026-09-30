/**
 * Tao ma QR cho thiet bi + in tem QR (tem dan len thiet bi de quet khi nhan/tra/kiem ke).
 * - Ma QR = ma dinh danh thiet bi (VD: INDR-EQ-0001).
 * - In tem dung CSS @media print (xem src/index.css) nen khong phu thuoc thu vien ngoai.
 */
import { QRCodeSVG } from 'qrcode.react';
import type { Equipment } from '@/types';
import { formatDate } from '@/lib/utils';
import { Button } from './ui';

export function QrCodeBox({
  value,
  size = 128,
  className,
}: {
  value: string;
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={className} aria-label={`Mã QR của thiết bị ${value}`} role="img">
      <QRCodeSVG value={value} size={size} level="M" />
    </div>
  );
}

/** Khoi tao viec in: chi in vung tem QR (xem quy tac @media print trong index.css). */
export function printQrLabels(): void {
  document.body.classList.add('printing-labels');
  window.print();
  window.setTimeout(() => document.body.classList.remove('printing-labels'), 500);
}

export interface QrLabelSheetProps {
  items: Equipment[];
  /** Ten loai thiet bi theo id */
  categoryNameOf: (categoryId: string) => string;
  title?: string;
}

/**
 * Phieu tem QR kho A4 (3 tem/hang) - co nut in truc tiep.
 * Moi tem gom: ten cong ty, ma thiet bi, ten thiet bi, loai, vi tri va ma QR.
 */
export function QrLabelSheet({
  items,
  categoryNameOf,
  title = 'Tem QR thiết bị — Phòng Sản xuất',
}: QrLabelSheetProps): JSX.Element {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500">
          Tem QR được in theo khổ A4 (3 tem/hàng). Dán tem lên thiết bị để quét khi bàn giao, nhận
          trả và kiểm kê.
        </p>
        <Button size="sm" onClick={printQrLabels}>
          🖨 In tem QR ({items.length} tem)
        </Button>
      </div>

      <div id="qr-print-area" className="rounded-lg border border-ink-200 bg-white p-3">
        <h3 className="mb-3 text-center text-sm font-semibold uppercase text-ink-700">{title}</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-md border border-dashed border-ink-300 p-3"
            >
              <QRCodeSVG value={item.code} size={84} level="M" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-navy-700">
                  Công ty Indruino
                </p>
                <p className="text-sm font-bold text-ink-900">{item.code}</p>
                <p className="truncate text-[11px] font-medium text-ink-700">{item.name}</p>
                <p className="truncate text-[10px] text-ink-500">{categoryNameOf(item.categoryId)}</p>
                <p className="text-[10px] text-ink-500">
                  {item.location ?? '—'} · {formatDate(item.receivedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
