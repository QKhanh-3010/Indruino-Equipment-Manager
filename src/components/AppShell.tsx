/**
 * Bo cuc ung dung: thanh dieu huong ben trai (loc theo phan quyen), thanh tieu de
 * (ten nguoi dung + vai tro), breadcrumb, chuong thong bao.
 * Responsive: drawer tren dien thoai, co dinh tren man hinh lon.
 */
import { useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { Permission } from '@/types';
import { ROLE_LABELS } from '@/lib/labels';
import { cn, formatDateTime } from '@/lib/utils';
import { useApp } from '@/data/store';
import { dashboardStats, notificationsFor, unreadCount } from '@/services/selectors';
import { Badge, Button } from './ui';

interface NavEntry {
  to: string;
  label: string;
  icon: string;
  permission?: Permission;
  anyOf?: Permission[];
  /** So luong viec can xu ly hien thi kem tren menu */
  badge?: (counts: { pending: number; approved: number; repairs: number; audits: number }) => number;
}

interface NavGroup {
  title: string;
  items: NavEntry[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/', label: 'Bảng điều khiển', icon: '🏠' },
      { to: '/thong-bao', label: 'Thông báo', icon: '🔔' },
    ],
  },
  {
    title: 'Thiết bị & kho',
    items: [
      { to: '/thiet-bi', label: 'Danh sách thiết bị', icon: '🧰', permission: 'equipment.view' },
      { to: '/nhap-kho', label: 'Nhập kho thiết bị', icon: '📦', permission: 'equipment.create' },
      {
        to: '/thiet-bi-cua-toi',
        label: 'Thiết bị tôi đang giữ',
        icon: '🎒',
        anyOf: ['borrow.handover', 'borrow.create'],
      },
      { to: '/bao-hong', label: 'Báo hỏng thiết bị', icon: '🛠', permission: 'repair.report' },
    ],
  },
  {
    title: 'Mượn / trả',
    items: [
      {
        to: '/yeu-cau-muon-tra',
        label: 'Yêu cầu mượn – trả',
        icon: '📝',
        anyOf: ['borrow.create', 'borrow.viewAll', 'borrow.approve'],
        badge: (c) => c.pending,
      },
      {
        to: '/ban-giao-qr',
        label: 'Bàn giao / nhận trả (QR)',
        icon: '📷',
        permission: 'borrow.handover',
        badge: (c) => c.approved,
      },
    ],
  },
  {
    title: 'Sửa chữa & kiểm kê',
    items: [
      {
        to: '/sua-chua',
        label: 'Phiếu sửa chữa',
        icon: '🔧',
        anyOf: ['repair.handle', 'repair.report'],
        badge: (c) => c.repairs,
      },
      {
        to: '/kiem-ke',
        label: 'Kiểm kê định kỳ',
        icon: '📋',
        anyOf: ['audit.perform', 'audit.create'],
        badge: (c) => c.audits,
      },
    ],
  },
  {
    title: 'Báo cáo & truy vết',
    items: [
      { to: '/bao-cao', label: 'Báo cáo – thống kê', icon: '📊', permission: 'report.view' },
      { to: '/nhat-ky', label: 'Nhật ký hoạt động', icon: '🧾', permission: 'auditlog.view' },
    ],
  },
  {
    title: 'Quản trị hệ thống',
    items: [
      { to: '/nguoi-dung', label: 'Tài khoản người dùng', icon: '👥', permission: 'user.manage' },
      { to: '/phan-quyen', label: 'Phân quyền vai trò', icon: '🔐', permission: 'role.manage' },
      { to: '/danh-muc', label: 'Danh mục & định mức', icon: '🗂', permission: 'category.manage' },
    ],
  },
];

export function AppShell(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, role, can, state, logout } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const counts = useMemo(() => {
    const stats = dashboardStats(state);
    return {
      pending: stats.pendingApprovals,
      approved: stats.approvedNotHandedOver,
      repairs: stats.newRepairRequests,
      audits: state.audits.filter((a) => a.status === 'DANG_KIEM_KE').length,
    };
  }, [state]);

  const unread = currentUser ? unreadCount(state, currentUser.id) : 0;
  const myNotifications = currentUser ? notificationsFor(state, currentUser.id).slice(0, 5) : [];

  // Chi hien thi menu dung voi quyen cua vai tro dang dang nhap
  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.permission) return can(item.permission);
      if (item.anyOf) return item.anyOf.some((p) => can(p));
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  const handleLogout = () => {
    logout();
    navigate('/dang-nhap', { replace: true });
  };

  return (
    <div className="min-h-screen">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-72 overflow-y-auto bg-[linear-gradient(165deg,#102c48_0%,#132a44_48%,#0b1c30_100%)] text-navy-100 shadow-[12px_0_40px_-24px_rgba(11,28,48,0.8)] transition-transform lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Điều hướng chính"
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-sm font-black tracking-tight text-navy-950 shadow-lg shadow-amber-950/20"
          >
            IN
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-white">Indruino Equipment</p>
            <p className="mt-0.5 text-[11px] text-navy-300">Phòng Sản xuất</p>
          </div>
        </div>

        <nav className="space-y-5 px-3 py-5">
          {visibleGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-navy-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const badgeCount = item.to === '/thong-bao' ? unread : item.badge?.(counts) ?? 0;
                  return (
                    <li key={item.to}>
                      <NavLink
                        to={item.to}
                        end={item.to === '/'}
                        onClick={() => setMenuOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300',
                            isActive
                              ? 'bg-white/[0.12] text-white shadow-inner shadow-white/5'
                              : 'text-navy-200 hover:bg-white/[0.08] hover:text-white',
                          )
                        }
                      >
                        <span aria-hidden="true" className="text-base">
                          {item.icon}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {badgeCount > 0 && (
                          <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-navy-900">
                            {badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-xl border border-white/10 bg-white/[0.06] p-3 text-[11px] leading-relaxed text-navy-200">
          <p className="font-semibold text-navy-100">{role?.name ?? '—'}</p>
          <p className="mt-1">{role?.description}</p>
        </div>
      </aside>

      {menuOpen && (
        <button
          type="button"
          aria-label="Đóng menu"
          className="fixed inset-0 z-20 bg-ink-900/40 lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/70 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-md border border-ink-300 px-2.5 py-2 text-sm text-ink-600 lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Mở menu điều hướng"
              >
                ☰
              </button>
              <div>
                <p className="text-sm font-bold tracking-tight text-ink-900">
                  Hệ thống quản lý trang thiết bị – Phòng Sản xuất
                </p>
                <p className="text-[11px] text-ink-500">
                  Công ty Indruino · {formatDateTime(new Date().toISOString())}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative rounded-md border border-ink-300 px-2.5 py-2 text-sm text-ink-600 transition hover:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
                  aria-label={`Thông báo (${unread} chưa đọc)`}
                  aria-expanded={notifOpen}
                >
                  🔔
                  {unread > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {unread}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 rounded-lg border border-ink-200 bg-white p-3 shadow-xl">
                    <p className="mb-2 text-xs font-semibold uppercase text-ink-500">
                      Thông báo mới nhất
                    </p>
                    {myNotifications.length === 0 ? (
                      <p className="text-xs text-ink-500">Không có thông báo nào.</p>
                    ) : (
                      <ul className="space-y-2">
                        {myNotifications.map((n) => (
                          <li key={n.id} className="border-b border-ink-100 pb-2 last:border-0">
                            <Link
                              to={n.link ?? '/thong-bao'}
                              onClick={() => setNotifOpen(false)}
                              className="block rounded px-1 py-0.5 hover:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
                            >
                              <p className="text-xs font-semibold text-ink-800">{n.title}</p>
                              <p className="line-clamp-2 text-[11px] text-ink-500">{n.message}</p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link
                      to="/thong-bao"
                      onClick={() => setNotifOpen(false)}
                      className="mt-2 block text-center text-xs font-semibold text-navy-700 hover:underline"
                    >
                      Xem tất cả thông báo
                    </Link>
                  </div>
                )}
              </div>

              <Link
                to="/tai-khoan"
                className="hidden items-center gap-2 rounded-md border border-ink-200 px-3 py-1.5 text-left transition hover:border-navy-300 sm:flex"
              >
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-800"
                >
                  {currentUser?.fullName.trim().split(' ').slice(-1)[0]?.charAt(0) ?? '?'}
                </span>
                <span>
                  <span className="block text-xs font-semibold text-ink-800">
                    {currentUser?.fullName}
                  </span>
                  <span className="block text-[10px] text-ink-500">
                    {currentUser ? ROLE_LABELS[currentUser.roleId] : ''}
                  </span>
                </span>
              </Link>

              <Button variant="secondary" size="sm" onClick={handleLogout}>
                Đăng xuất
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-ink-100 px-4 py-1.5 text-[11px] text-ink-500 sm:px-6">
            <span className="font-medium text-ink-600">Indruino Equipment Manager</span>
            <span aria-hidden="true">/</span>
            <span>{location.pathname === '/' ? 'Bảng điều khiển' : location.pathname.replace('/', '')}</span>
            {currentUser && <Badge tone="info">{ROLE_LABELS[currentUser.roleId]}</Badge>}
          </div>
        </header>

        <main className="page-enter px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1600px]">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-ink-200 px-4 py-4 text-center text-[11px] text-ink-500 sm:px-6">
          Indruino Equipment Manager · Hệ thống quản lý trang thiết bị Phòng Sản xuất · Dữ liệu demo
          được lưu cục bộ trên trình duyệt
        </footer>
      </div>
    </div>
  );
}
