/**
 * UC-01: Dang nhap / dang xuat.
 * Trang dang nhap co 4 nut dang nhap nhanh theo vai tro demo (mat khau chung: Indruino@2026).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_LABELS } from '@/lib/labels';
import { DEMO_ACCOUNTS, useApp } from '@/data/store';
import { Button, Card, Field, Input } from '@/components/ui';

export function LoginPage(): JSX.Element {
  const navigate = useNavigate();
  const { login, currentUser, demoPassword } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Da dang nhap thi khong can hien thi trang dang nhap
  useEffect(() => {
    if (currentUser) navigate('/', { replace: true });
  }, [currentUser, navigate]);

  const submit = (user: string, pass: string): void => {
    setBusy(true);
    setError(null);
    const result = login(user, pass);
    if (!result.ok) {
      setError(result.error ?? 'Đăng nhập không thành công.');
      setBusy(false);
      return;
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="grid min-h-screen bg-[#f4f7f8] lg:grid-cols-[1.08fr_0.92fr]">
      {/* ------------- Cot gioi thieu thuong hieu ------------- */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#102c48_0%,#132a44_48%,#0b1c30_100%)] p-10 text-navy-100 lg:flex xl:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -right-20 top-1/3 h-72 w-72 rounded-full border-[32px] border-amber-400/10" />
        <div className="pointer-events-none absolute -right-8 top-[38%] h-48 w-48 rounded-full border border-amber-300/20" />
        <div>
          <div className="relative flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400 text-lg font-black tracking-tight text-navy-950 shadow-lg shadow-black/20"
            >
              IN
            </span>
            <div>
              <p className="text-lg font-bold text-white">Indruino Equipment Manager</p>
              <p className="text-xs text-navy-300">Phòng Sản xuất · Công ty Indruino</p>
            </div>
          </div>

          <div className="relative mt-16 max-w-xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Vận hành gọn gàng</p>
            <h1 className="text-4xl font-black leading-[1.12] tracking-tight text-white xl:text-5xl">
              Mọi thiết bị,
              <br /> một nơi kiểm soát.
            </h1>
          </div>
          <p className="relative mt-5 max-w-lg text-sm leading-relaxed text-navy-200">
            Quản lý mượn – trả, nhập kho, bảo trì và kiểm kê trong một không gian làm việc rõ ràng,
            minh bạch cho Phòng Sản xuất.
          </p>

          <ul className="relative mt-8 grid max-w-xl gap-3 sm:grid-cols-2 text-sm text-navy-200">
            <li className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">✓ QR nhận, trả và kiểm kê</li>
            <li className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">✓ Phân quyền theo vai trò</li>
            <li className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">✓ Nhật ký mọi thao tác</li>
            <li className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5">✓ Cảnh báo quá hạn, tồn kho</li>
          </ul>
        </div>
        <p className="relative text-xs text-navy-400">
          Bản demo: dữ liệu được lưu cục bộ trên trình duyệt, không gửi lên máy chủ.
        </p>
      </div>

      {/* ------------- Cot dang nhap ------------- */}
      <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
        <div className="w-full max-w-md space-y-6">
          <div className="lg:hidden">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-sm font-black text-navy-950">IN</span>
              <div>
                <p className="text-lg font-bold tracking-tight text-navy-900">Indruino Equipment</p>
                <p className="text-xs text-ink-500">Phòng Sản xuất · Đăng nhập hệ thống</p>
              </div>
            </div>
          </div>

          <Card title="Chào mừng trở lại" description="Đăng nhập để tiếp tục quản lý thiết bị." className="shadow-pop">
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit(username, password);
              }}
            >
              <Field label="Tên đăng nhập" htmlFor="username" required>
                <Input
                  id="username"
                  value={username}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="VD: nv.01"
                  required
                />
              </Field>
              <Field label="Mật khẩu" htmlFor="password" required>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                />
              </Field>

              {error && (
                <p
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <Button type="submit" block size="lg" loading={busy} className="shadow-lg shadow-navy-900/10">
                Đăng nhập
              </Button>
            </form>
          </Card>

          <Card title="Thử nhanh theo vai trò" description={`Mật khẩu demo dùng chung: ${demoPassword}`}>
            <ul className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.username}>
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(account.username);
                      setPassword(demoPassword);
                      submit(account.username, demoPassword);
                    }}
                    className="group flex w-full items-start justify-between gap-3 rounded-xl border border-ink-200/80 bg-white/70 px-3 py-3 text-left transition duration-150 hover:-translate-y-0.5 hover:border-navy-300 hover:bg-navy-50 hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
                  >
                    <span>
                      <span className="block text-sm font-bold text-ink-800 group-hover:text-navy-800">
                        {ROLE_LABELS[account.role]}
                      </span>
                      <span className="block text-[11px] text-ink-500">{account.note}</span>
                    </span>
                    <span className="whitespace-nowrap rounded bg-ink-100 px-2 py-1 text-[11px] font-semibold text-ink-600">
                      {account.username}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-ink-500">
              Tài khoản <strong>nv.03</strong> đang bị khóa để minh hoạ chức năng khóa tài khoản của
              Admin.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
