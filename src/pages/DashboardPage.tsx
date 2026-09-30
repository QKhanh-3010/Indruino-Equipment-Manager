/**
 * Bang dieu khien theo vai tro: the so lieu, bieu do ton kho theo nhom,
 * danh sach viec can xu ly va canh bao qua han (mau do).
 */
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ROLE_LABELS } from '@/lib/labels';
import { formatDateTime } from '@/lib/utils';
import { useApp } from '@/data/store';
import {
  borrowedEquipment,
  dashboardStats,
  overdueBorrows,
  pendingTasks,
  stockByCategory,
  stockByGroup,
} from '@/services/selectors';
import { Badge, Card, EmptyState, PageHeader, StatCard } from '@/components/ui';
import { OverdueBadge } from '@/components/StatusBadges';

const STATUS_COLORS: Record<string, string> = {
  'Sẵn sàng': '#059669',
  'Đang mượn': '#2b5688',
  'Chờ sửa chữa': '#d97706',
  'Đang sửa': '#f59e0b',
  'Hỏng – chờ thanh lý': '#dc2626',
  'Đã thanh lý': '#94a3b8',
};

const TASK_TONE: Record<string, string> = {
  warning: 'border-amber-200 bg-amber-50',
  danger: 'border-red-200 bg-red-50',
  info: 'border-navy-200 bg-navy-50',
  success: 'border-emerald-200 bg-emerald-50',
};

export function DashboardPage(): JSX.Element {
  const { state, currentUser } = useApp();
  if (!currentUser) return <></>;

  const stats = dashboardStats(state);
  const groups = stockByGroup(state);
  const held = borrowedEquipment(state);
  const overdue = overdueBorrows(state);
  const tasks = pendingTasks(state, currentUser);
  const stockRows = stockByCategory(state);

  // Du lieu bieu do: ton kho theo nhom thiet bi + phan bo trang thai
  const groupChartData = groups.map((g) => ({
    name: g.key === 'DIEN_DAN_DUNG' ? 'Điện dân dụng' : 'Kỹ thuật',
    'Sẵn sàng': g.available,
    'Đang mượn': g.borrowed,
    'Hỏng / chờ xử lý': g.broken,
  }));

  const statusCount = (statuses: string[]): number =>
    state.equipment.filter((e) => statuses.includes(e.status)).length;

  const statusChartData = [
    { name: 'Sẵn sàng', value: stats.available },
    { name: 'Đang mượn', value: stats.borrowed },
    { name: 'Chờ sửa chữa', value: statusCount(['CHO_SUA_CHUA']) },
    { name: 'Đang sửa', value: statusCount(['DANG_SUA']) },
    { name: 'Hỏng – chờ thanh lý', value: statusCount(['HONG_CHO_THANH_LY']) },
    { name: 'Đã thanh lý', value: stats.retired },
  ].filter((d) => d.value > 0);

  return (
    <>
      <PageHeader
        title="Bảng điều khiển"
        description={`Xin chào ${currentUser.fullName} — ${ROLE_LABELS[currentUser.roleId]}. Tổng quan hoạt động quản lý trang thiết bị Phòng Sản xuất.`}
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Bảng điều khiển' }]}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tổng thiết bị đang quản lý"
          value={stats.total}
          hint={`Đã thanh lý: ${stats.retired}`}
        />
        <StatCard
          label="Đang cho mượn"
          value={stats.borrowed}
          tone="info"
          hint={`${held.length} thiết bị có người chịu trách nhiệm`}
        />
        <StatCard
          label="Chờ duyệt"
          value={stats.pendingApprovals}
          tone={stats.pendingApprovals > 0 ? 'warning' : 'success'}
          hint={`Yêu cầu trả chờ duyệt: ${stats.returnRequests}`}
        />
        <StatCard
          label="Chờ sửa chữa"
          value={stats.waitingRepair}
          tone={stats.waitingRepair > 0 ? 'warning' : 'success'}
          hint={`Đang sửa: ${stats.repairing} · Phiếu mới: ${stats.newRepairRequests}`}
        />
        <StatCard
          label="Sẵn sàng"
          value={stats.available}
          tone="success"
          hint="Thiết bị có thể cấp phát/mượn ngay"
        />
        <StatCard
          label="Quá hạn trả"
          value={stats.overdue}
          tone={stats.overdue > 0 ? 'danger' : 'success'}
          hint={stats.overdue > 0 ? 'Cần nhắc nhở người mượn ngay' : 'Không có phiếu quá hạn'}
        />
        <StatCard
          label="Hỏng – chờ thanh lý"
          value={stats.pendingLiquidation}
          tone={stats.pendingLiquidation > 0 ? 'danger' : 'success'}
          hint="Chờ Quản lý quyết định thanh lý"
        />
        <StatCard
          label="Cảnh báo tồn kho"
          value={stats.lowStockCategories}
          tone={stats.lowStockCategories > 0 ? 'warning' : 'success'}
          hint="Số loại thiết bị lệch định mức Min/Max"
        />
      </section>

      {/* ------------------------------ Bieu do ------------------------------ */}
      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <Card
          title="Tồn kho theo nhóm thiết bị"
          description="So sánh tình trạng khả dụng giữa thiết bị điện dân dụng và thiết bị kỹ thuật."
          className="lg:col-span-2"
        >
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={groupChartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Sẵn sàng" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Đang mượn" fill="#2b5688" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Hỏng / chờ xử lý" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Phân bổ theo trạng thái" description="Toàn bộ thiết bị của Phòng Sản xuất.">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* --------------------- Canh bao qua han + viec can xu ly --------------------- */}
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <Card
          title="Việc cần xử lý"
          description="Danh sách được lọc theo quyền của vai trò đang đăng nhập."
        >
          {tasks.length === 0 ? (
            <EmptyState
              icon="✅"
              title="Không có việc nào cần xử lý"
              description="Mọi yêu cầu, phiếu sửa chữa và đợt kiểm kê đều đã được xử lý."
            />
          ) : (
            <ul className="space-y-2">
              {tasks.slice(0, 8).map((task, index) => (
                <li key={`${task.title}-${index}`}>
                  <Link
                    to={task.link}
                    className={`flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 transition hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300 ${
                      TASK_TONE[task.tone]
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-ink-800">{task.title}</span>
                      <span className="mt-0.5 block text-[11px] text-ink-600">{task.description}</span>
                    </span>
                    {task.at && (
                      <span className="whitespace-nowrap text-[11px] text-ink-500">
                        {formatDateTime(task.at)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title="Cảnh báo quá hạn trả"
          description="Quy tắc: quá hạn trả sẽ hiển thị cảnh báo đỏ và gửi thông báo trong hệ thống."
        >
          {overdue.length === 0 ? (
            <EmptyState
              icon="🕒"
              title="Không có thiết bị quá hạn"
              description="Tất cả thiết bị đều đang trong thời hạn mượn."
            />
          ) : (
            <ul className="space-y-2">
              {overdue.map((item) => (
                <li key={item.request.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-red-900">
                      {item.request.code} — {item.holder}
                    </span>
                    <OverdueBadge days={item.days} />
                  </div>
                  <p className="mt-1 text-[11px] text-red-700">
                    Thiết bị: {item.equipment.map((e) => e.code).join(', ') || '—'} · Dự kiến trả:{' '}
                    {formatDateTime(item.request.expectedReturnAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      {/* --------------------------- Ton kho theo loai thiet bi --------------------------- */}
      <section className="mt-5">
        <Card
          title="Tồn kho theo loại thiết bị (định mức Min/Max)"
          description="Cảnh báo tự động khi số lượng khả dụng thấp hơn Min hoặc vượt Max."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-ink-200 text-sm">
              <thead className="bg-ink-50">
                <tr>
                  {['Loại thiết bị', 'Khả dụng', 'Đang mượn', 'Hỏng/sửa', 'Min/Max', 'Cảnh báo'].map(
                    (header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {stockRows.map((row) => (
                  <tr key={row.category.id} className="hover:bg-navy-50/60">
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-ink-800">{row.category.name}</span>
                      <span className="block text-[11px] text-ink-500">
                        {row.category.group === 'DIEN_DAN_DUNG' ? 'Điện dân dụng' : 'Kỹ thuật'} · Đơn
                        vị: {row.category.unit}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-emerald-700">{row.available}</td>
                    <td className="px-3 py-2.5">{row.borrowed}</td>
                    <td className="px-3 py-2.5">{row.broken}</td>
                    <td className="px-3 py-2.5 text-ink-600">
                      {row.category.minStock} / {row.category.maxStock}
                    </td>
                    <td className="px-3 py-2.5">
                      {row.alert === 'low' ? (
                        <Badge tone="danger">Thấp hơn Min</Badge>
                      ) : row.alert === 'high' ? (
                        <Badge tone="warning">Vượt Max</Badge>
                      ) : (
                        <Badge tone="success">Trong định mức</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </>
  );
}
