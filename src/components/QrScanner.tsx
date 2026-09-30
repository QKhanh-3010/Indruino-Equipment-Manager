/**
 * Quet ma QR bang camera trinh duyet (UC-14 & UC-06).
 * Su dung thu vien html5-qrcode; luon co o nhap ma thu cong du phong cho thiet bi khong co camera.
 */
import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button, Field, Input } from './ui';

export interface QrScannerProps {
  /** Duoc goi moi khi quet duoc ma (hoac nhap ma thu cong) */
  onDetected: (code: string) => void;
  /** Cho phep hien thi nut bat dau quet */
  label?: string;
  /** Tu dong bat camera khi hien thi */
  autoStart?: boolean;
  disabled?: boolean;
}

export function QrScanner({
  onDetected,
  label = 'Mã thiết bị (VD: INDR-EQ-0001)',
  autoStart = false,
  disabled,
}: QrScannerProps): JSX.Element {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [lastCode, setLastCode] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'qr-scanner-region';

  // Don dep camera khi component bi go bo (tranh camera sang lien tuc)
  useEffect(() => {
    return () => {
      const instance = scannerRef.current;
      if (instance) {
        instance.stop().catch(() => undefined);
        scannerRef.current = null;
      }
    };
  }, []);

  const start = async (): Promise<void> => {
    setError(null);
    try {
      let instance = scannerRef.current;
      if (!instance) {
        instance = new Html5Qrcode(regionId, { verbose: false });
        scannerRef.current = instance;
      }
      await instance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const code = decodedText.trim();
          setLastCode(code);
          onDetected(code);
        },
        () => undefined,
      );
      setRunning(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/NotAllowed|Permission/i.test(message)) {
        setError(
          'Trình duyệt chưa được cấp quyền truy cập camera. Vui lòng cho phép quyền camera hoặc nhập mã thiết bị thủ công bên dưới.',
        );
      } else if (/NotFound|no camera|Overconstrained/i.test(message)) {
        setError('Không tìm thấy camera trên thiết bị. Vui lòng nhập mã thiết bị thủ công bên dưới.');
      } else {
        setError(`Không khởi động được camera: ${message}`);
      }
    }
  };

  const stop = async (): Promise<void> => {
    const instance = scannerRef.current;
    if (!instance) return;
    try {
      await instance.stop();
      instance.clear();
    } catch {
      /* bo qua loi dung camera */
    }
    scannerRef.current = null;
    setRunning(false);
  };

  useEffect(() => {
    if (autoStart && !disabled) {
      void start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, disabled]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {running ? (
          <Button variant="secondary" size="lg" onClick={() => void stop()}>
            ⏹ Tắt camera
          </Button>
        ) : (
          <Button size="lg" block onClick={() => void start()} disabled={disabled}>
            📷 Bật camera và quét mã QR
          </Button>
        )}
      </div>

      <div
        id={regionId}
        className={
          running
            ? 'overflow-hidden rounded-lg border border-navy-200 bg-ink-900/5 p-2'
            : 'hidden'
        }
        aria-live="polite"
      />

      {running && (
        <p className="text-xs text-ink-500">
          Đưa mã QR vào giữa khung hình. Hệ thống tự xác nhận khi đọc được mã.
          {lastCode && (
            <>
              {' '}
              Mã vừa quét: <span className="font-semibold text-navy-700">{lastCode}</span>
            </>
          )}
        </p>
      )}

      {error && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="alert">
          {error}
        </p>
      )}

      {/* Du phong: nhap ma thu cong khi camera khong dung duoc */}
      <form
        className="rounded-lg border border-ink-200 bg-ink-50/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const code = manualCode.trim();
          if (!code) return;
          onDetected(code.toUpperCase());
          setManualCode('');
        }}
      >
        <Field label={label} htmlFor="qr-manual-input" hint="Dùng khi thiết bị không có camera hoặc tem QR bị mờ.">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="qr-manual-input"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase())}
              placeholder="INDR-EQ-0001"
              autoComplete="off"
            />
            <Button type="submit" variant="secondary" disabled={disabled}>
              Xác nhận mã
            </Button>
          </div>
        </Field>
      </form>
    </div>
  );
}
