/**
 * Dinh tuyen ung dung + bao ve duong dan theo phan quyen.
 * Tat ca route deu nam trong AppShell (tru trang dang nhap).
 */
import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { Permission } from '@/types';
import { ToastProvider } from './components/ui/Toast';
import { AppProvider, useApp } from './data/store';
import { AppShell } from './components/AppShell';
import { EmptyState, PageHeader } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { EquipmentListPage } from './pages/EquipmentListPage';
import { EquipmentDetailPage } from './pages/EquipmentDetailPage';
import { StockInPage } from './pages/StockInPage';
import { MyEquipmentPage } from './pages/MyEquipmentPage';
import { BorrowRequestsPage } from './pages/BorrowRequestsPage';
import { HandoverPage } from './pages/HandoverPage';
import { RepairsPage } from './pages/RepairsPage';
import { ReportDamagePage } from './pages/ReportDamagePage';
import { AuditsPage } from './pages/AuditsPage';
import { AuditDetailPage } from './pages/AuditDetailPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { UsersPage } from './pages/UsersPage';
import { RolesPage } from './pages/RolesPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProfilePage } from './pages/ProfilePage';

/** Trang thong bao khi nguoi dung truy cap ngoai pham vi quyen. */
function ForbiddenPage(): JSX.Element {
  return (
    <>
      <PageHeader
        title="Không có quyền truy cập"
        description="Vai trò của bạn không được phép thực hiện chức năng này. Vui lòng liên hệ Admin nếu cần cấp thêm quyền."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Từ chối truy cập' }]}
      />
      <EmptyState
        icon="⛔"
        title="Truy cập bị từ chối"
        description="Hệ thống kiểm tra quyền ở tầng nghiệp vụ (tương đương kiểm tra phía server), do đó thao tác này không thể thực hiện với vai trò hiện tại."
      />
    </>
  );
}

/** Chi cho phep truy cap khi vai tro co quyen tuong ung. */
function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}): JSX.Element {
  const { can } = useApp();
  return can(permission) ? <>{children}</> : <ForbiddenPage />;
}

/** Layout duoc bao ve: chua dang nhap thi chuyen ve trang dang nhap. */
function ProtectedShell(): JSX.Element {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/dang-nhap" replace />;
  return <AppShell />;
}

export default function App(): JSX.Element {
  return (
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/dang-nhap" element={<LoginPage />} />
            <Route element={<ProtectedShell />}>
              <Route index element={<DashboardPage />} />
              <Route
                path="/thiet-bi"
                element={
                  <RequirePermission permission="equipment.view">
                    <EquipmentListPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/thiet-bi/:id"
                element={
                  <RequirePermission permission="equipment.view">
                    <EquipmentDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/nhap-kho"
                element={
                  <RequirePermission permission="equipment.create">
                    <StockInPage />
                  </RequirePermission>
                }
              />
              <Route path="/thiet-bi-cua-toi" element={<MyEquipmentPage />} />
              <Route path="/yeu-cau-muon-tra" element={<BorrowRequestsPage />} />
              <Route
                path="/ban-giao-qr"
                element={
                  <RequirePermission permission="borrow.handover">
                    <HandoverPage />
                  </RequirePermission>
                }
              />
              <Route path="/sua-chua" element={<RepairsPage />} />
              <Route path="/bao-hong" element={<ReportDamagePage />} />
              <Route path="/kiem-ke" element={<AuditsPage />} />
              <Route path="/kiem-ke/:id" element={<AuditDetailPage />} />
              <Route
                path="/bao-cao"
                element={
                  <RequirePermission permission="report.view">
                    <ReportsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/nhat-ky"
                element={
                  <RequirePermission permission="auditlog.view">
                    <AuditLogsPage />
                  </RequirePermission>
                }
              />
              <Route path="/thong-bao" element={<NotificationsPage />} />
              <Route
                path="/nguoi-dung"
                element={
                  <RequirePermission permission="user.manage">
                    <UsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/phan-quyen"
                element={
                  <RequirePermission permission="role.manage">
                    <RolesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/danh-muc"
                element={
                  <RequirePermission permission="category.manage">
                    <CategoriesPage />
                  </RequirePermission>
                }
              />
              <Route path="/tai-khoan" element={<ProfilePage />} />
              <Route
                path="*"
                element={
                  <>
                    <PageHeader title="Không tìm thấy trang" />
                    <EmptyState
                      icon="🧭"
                      title="Đường dẫn không tồn tại"
                      description="Vui lòng kiểm tra lại đường dẫn hoặc quay về Bảng điều khiển."
                    />
                  </>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}
