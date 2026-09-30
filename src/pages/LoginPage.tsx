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
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* ------------- Cot gioi thieu thuong hieu ------------- */}
      <div className="hidden flex-col justify-between bg-navy-900 p-10 text-navy-100 lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-700 text-lg font-bold text-white"
            >
              IN
            </span>
            <div>
              <p className="text-lg font-bold text-white">Indruino Equipment Manager</p>
              <p className="text-xs text-navy-300">Phòng Sản xuất · Công ty Indruino</p>
            </div>
          </div>

          <h1 className="mt-12 text-3xl font-bold leading-snug text-white">
            Quản lý trang thiết bị &amp; vật tư
            <br /> Phòng Sản xuất tập trung, minh bạch
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-navy-200">
            Hệ thống quản lý hai nhóm thiết bị: <strong>thiết bị điện dân dụng</strong> (quạt, ổ cắm,
            đèn chiếu sáng…) và <strong>thiết bị kỹ thuật</strong> (máy khoan, máy hàn, đồng hồ đo
            điện, tủ điện…), tập trung vào nghiệp vụ mượn – trả, nhập kho, bảo trì – sửa chữa, kiểm kê
            và báo cáo.
          </p>

          <ul className="mt-8 space-y-2 text-sm text-navy-200">
            <li>✓ Mỗi thiết bị có mã định danh duy nhất và mã QR để quét khi nhận/trả/kiểm kê</li>
            <li>✓ Kiểm tra quyền ở tầng nghiệp vụ, chống thao tác vượt quyền</li>
            <li>✓ Nhật ký hoạt động (audit log) chỉ đọc cho mọi thao tác quan trọng</li>
            <li>✓ Cảnh báo quá hạn trả, cảnh báo tồn kho thấp theo định mức Min/Max</li>
          </ul>
        </div>
        <p className="text-xs text-navy-400">
          Bản demo: dữ liệu được lưu cục bộ trên trình duyệt, không gửi lên máy chủ.
        </p>
      </div>

      {/* ------------- Cot dang nhap ------------- */}
      <div className="flex items-center justify-center bg-ink-50 p-6 sm:p-10">
        <div className="w-full max-w-md space-y-5">
          <div className="lg:hidden">
            <p className="text-lg font-bold text-navy-900">Indruino Equipment Manager</p>
            <p className="text-xs text-ink-500">Hệ thống quản lý trang thiết bị Phòng Sản xuất</p>
          </div>

          <Card title="Đăng nhập hệ thống" description="Sử dụng tài khoản được cấp bởi Admin.">
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

              <Button type="submit" block size="lg" loading={busy}>
                Đăng nhập
              </Button>
            </form>
          </Card>

          <Card
            title="Đăng nhập nhanh 4 vai trò demo"
            description={`Mật khẩu chung cho tất cả tài khoản demo: ${demoPassword}`}
          >
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
                    className="flex w-full items-start justify-between gap-3 rounded-lg border border-ink-200 px-3 py-2.5 text-left transition hover:border-navy-300 hover:bg-navy-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink-800">
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
