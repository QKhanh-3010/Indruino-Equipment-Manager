/**
 * UC-03: Phan quyen theo vai tro.
 * Ma tran quyen duoc luu trong state.roles va duoc tang dich vu kiem tra o moi thao tac.
 * Vai tro ADMIN luon giu toan quyen (khoa cung) de he thong khong bi mat nguoi quan tri.
 */
import { useState } from 'react';
import type { Permission, RoleId } from '@/types';
import { PERMISSION_GROUPS } from '@/lib/permissions';
import { useApp } from '@/data/store';
import { Badge, Button, Card, PageHeader } from '@/components/ui';
import { useAction } from '@/hooks/useAction';

export function RolesPage(): JSX.Element {
  const { state } = useApp();
  const action = useAction();
  const [draft, setDraft] = useState<Record<RoleId, Permission[]>>(() => ({
    ADMIN: [...(state.roles.find((r) => r.id === 'ADMIN')?.permissions ?? [])],
    MANAGER: [...(state.roles.find((r) => r.id === 'MANAGER')?.permissions ?? [])],
    TECHNICIAN: [...(state.roles.find((r) => r.id === 'TECHNICIAN')?.permissions ?? [])],
    STAFF: [...(state.roles.find((r) => r.id === 'STAFF')?.permissions ?? [])],
  }));

  const isDirty = (roleId: RoleId): boolean => {
    const original = state.roles.find((r) => r.id === roleId)?.permissions ?? [];
    const current = draft[roleId] ?? [];
    if (original.length !== current.length) return true;
    return original.some((p) => !current.includes(p));
  };

  const toggle = (roleId: RoleId, permission: Permission): void => {
    setDraft((prev) => {
      const list = prev[roleId] ?? [];
      return {
        ...prev,
        [roleId]: list.includes(permission)
          ? list.filter((p) => p !== permission)
          : [...list, permission],
      };
    });
  };

  const save = (roleId: RoleId): void => {
    action('updateRolePermissions', { roleId, permissions: draft[roleId] ?? [] });
  };

  return (
    <>
      <PageHeader
        title="Phân quyền vai trò"
        description="Bật/tắt quyền cho từng vai trò. Quyền được kiểm tra ở tầng nghiệp vụ cho MỌI thao tác, do đó thay đổi tại đây có hiệu lực ngay lập tức."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Phân quyền' }]}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {state.roles.map((role) => {
          const isAdmin = role.id === 'ADMIN';
          const permissions = draft[role.id] ?? [];
          return (
            <Card
              key={role.id}
              title={role.name}
              description={role.description}
              actions={
                <div className="flex items-center gap-2">
                  <Badge tone={isAdmin ? 'neutral' : isDirty(role.id) ? 'warning' : 'success'}>
                    {isAdmin ? 'Khóa cố định' : isDirty(role.id) ? 'Có thay đổi chưa lưu' : 'Đã lưu'}
                  </Badge>
                  <span className="text-[11px] text-ink-500">{permissions.length} quyền</span>
                  {!isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => save(role.id)}
                      disabled={!isDirty(role.id)}
                    >
                      Lưu phân quyền
                    </Button>
                  )}
                </div>
              }
            >
              <div className="space-y-4">
                {PERMISSION_GROUPS.map((group) => (
                  <fieldset key={group.title}>
                    <legend className="mb-1.5 text-xs font-semibold uppercase text-ink-500">
                      {group.title}
                    </legend>
                    <ul className="space-y-1">
                      {group.permissions.map((permission) => {
                        const checked = permissions.includes(permission.key);
                        return (
                          <li key={permission.key}>
                            <label
                              className={`flex items-start gap-2 rounded px-2 py-1.5 text-xs ${
                                isAdmin ? 'opacity-70' : 'cursor-pointer hover:bg-ink-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-navy-700"
                                checked={checked}
                                disabled={isAdmin}
                                onChange={() => toggle(role.id, permission.key)}
                              />
                              <span>
                                <span className="block font-medium text-ink-800">
                                  {permission.label}
                                </span>
                                <span className="block font-mono text-[10px] text-ink-400">
                                  {permission.key}
                                </span>
                              </span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ))}
                {isAdmin && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
                    Vai trò Admin luôn giữ toàn quyền quản trị để đảm bảo hệ thống không bị mất người
                    quản trị. Nếu cần thu hẹp quyền, hãy tạo vai trò khác thay vì sửa Admin.
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
