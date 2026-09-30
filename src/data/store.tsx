/**
 * Kho du lieu trung tam cua ung dung (mo phong backend).
 *
 * - Luu du lieu trong bo nho + localStorage (demo khong can server).
 * - Quan ly PHIEN DANG NHAP co thoi han (het han se tu dong dang xuat).
 * - MOI thao tac thay doi du lieu deu di qua tang dich vu (src/services) de:
 *     kiem tra quyen -> kiem tra nghiep vu -> ghi audit log -> thong bao.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { AppState, Permission, Role, Session, User } from '@/types';
import { buildSeedState, DEMO_PASSWORD, STATE_VERSION } from './seed';
import { changeOwnPassword as changeOwnPasswordOp, runOperation, type OperationName } from '@/services';
import type { OpResult } from '@/services/common';
import { draftFrom, writeLog } from '@/services/common';
import { verifyPassword } from '@/lib/crypto';
import { roleHasPermission } from '@/lib/permissions';
import { useToast } from '@/components/ui/Toast';

const STATE_KEY = 'iem.state.v1';
const SESSION_KEY = 'iem.session.v1';
const OVERDUE_KEY = 'iem.overdueKeys.v1';

/** Phien dang nhap het han sau 8 gio khong hoat dong. */
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/* ---------------------------------- Doc / ghi localStorage ---------------------------------- */

function loadState(): AppState {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed.version === STATE_VERSION) return parsed;
    }
  } catch {
    /* du lieu hong -> tao lai du lieu mau */
  }
  return buildSeedState();
}

function persistState(state: AppState): void {
  try {
    window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Vuot han muc luu tru (thuong do anh dinh kem) -> chi canh bao, khong lam hong phien lam viec
    console.warn('Không lưu được dữ liệu cục bộ: dung lượng lưu trữ đã đầy.');
  }
}

function loadSession(): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.userId || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistSession(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* bo qua */
  }
}

function loadOverdueKeys(): string[] {
  try {
    const raw = window.localStorage.getItem(OVERDUE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Danh sach tai khoan demo de dang nhap nhanh tren trang dang nhap. */
export const DEMO_ACCOUNTS: { username: string; role: Role['id']; note: string }[] = [
  { username: 'admin', role: 'ADMIN', note: 'Quản lý tài khoản, phân quyền, danh mục hệ thống' },
  { username: 'ql.sanxuat', role: 'MANAGER', note: 'Nhập kho, duyệt mượn/trả, kiểm kê, báo cáo' },
  { username: 'ktv.01', role: 'TECHNICIAN', note: 'Tiếp nhận sửa chữa, đề xuất thanh lý' },
  { username: 'nv.01', role: 'STAFF', note: 'Mượn/trả thiết bị, quét QR, báo hỏng' },
];

/* ---------------------------------- Kieu du lieu cua context ---------------------------------- */

export interface LoginResult {
  ok: boolean;
  error?: string;
}

interface AppContextValue {
  state: AppState;
  currentUser: User | null;
  role: Role | null;
  session: Session | null;
  /** Kiem tra quyen cua vai tro hien tai (dung de an/hien menu va nut thao tac) */
  can: (permission: Permission) => boolean;
  /** Thuc thi thao tac nghiep vu qua tang dich vu */
  call: <T = unknown>(name: OperationName, payload?: unknown) => OpResult<T>;
  login: (username: string, password: string) => LoginResult;
  loginDemo: (username: string) => LoginResult;
  logout: (reason?: string) => void;
  changePassword: (currentPassword: string, newPassword: string) => OpResult<unknown>;
  resetDemoData: () => void;
  demoPassword: string;
}

const AppContext = createContext<AppContextValue | null>(null);

/* ---------------------------------- Provider ---------------------------------- */

export function AppProvider({ children }: { children: ReactNode }): JSX.Element {
  const toast = useToast();
  const [state, setState] = useState<AppState>(() => loadState());
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const stateRef = useRef<AppState>(state);
  const overdueScanDone = useRef(false);

  /** Cap nhat state + luu xuong localStorage. */
  const apply = useCallback((next: AppState) => {
    stateRef.current = next;
    setState(next);
    persistState(next);
  }, []);

  const currentUser = useMemo(() => {
    if (!session) return null;
    const user = state.users.find((u) => u.id === session.userId);
    // Tai khoan bi khoa -> coi nhu mat phien dang nhap (kiem tra phia "server")
    if (!user || user.status !== 'ACTIVE') return null;
    return user;
  }, [session, state.users]);

  const role = useMemo(
    () => (currentUser ? (state.roles.find((r) => r.id === currentUser.roleId) ?? null) : null),
    [currentUser, state.roles],
  );

  const can = useCallback(
    (permission: Permission): boolean =>
      currentUser ? roleHasPermission(state.roles, currentUser.roleId, permission) : false,
    [state.roles, currentUser],
  );

  /* ------------------------- Thuc thi thao tac nghiep vu ------------------------- */

  const call = useCallback(
    <T,>(name: OperationName, payload?: unknown): OpResult<T> => {
      const actor = currentUser;
      if (!actor) {
        return {
          ok: false,
          error: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
        } as OpResult<T>;
      }
      const result = runOperation(name, { state: stateRef.current, actor }, payload ?? {});
      if (result.ok) {
        apply(result.state as AppState);
      }
      return result as OpResult<T>;
    },
    [apply, currentUser],
  );

  /* ------------------------------- Dang nhap / dang xuat ------------------------------- */

  const loginWith = useCallback(
    (username: string, password: string): LoginResult => {
      const user = stateRef.current.users.find(
        (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
      );
      if (!user) {
        return { ok: false, error: 'Tên đăng nhập không tồn tại trong hệ thống.' };
      }
      if (user.status === 'LOCKED') {
        return {
          ok: false,
          error: 'Tài khoản đã bị khóa. Vui lòng liên hệ Admin để được mở khóa.',
        };
      }
      // Mat khau duoc bam SHA-256 + salt: so sanh hash, khong luu plaintext
      if (!verifyPassword(password, user.salt, user.passwordHash)) {
        return { ok: false, error: 'Mật khẩu không đúng. Vui lòng kiểm tra lại.' };
      }

      const draft = draftFrom(stateRef.current);
      const index = draft.users.findIndex((u) => u.id === user.id);
      const updated: User = { ...draft.users[index], lastLoginAt: new Date().toISOString() };
      draft.users[index] = updated;
      writeLog(draft, updated, {
        action: 'Đăng nhập hệ thống',
        entity: 'Session',
        entityId: updated.id,
        entityLabel: updated.username,
        detail: 'Đăng nhập thành công.',
      });
      apply(draft);

      const nextSession: Session = {
        userId: updated.id,
        startedAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS,
      };
      setSession(nextSession);
      persistSession(nextSession);
      overdueScanDone.current = false;
      return { ok: true };
    },
    [apply],
  );

  const logout = useCallback(
    (reason?: string) => {
      const actor = currentUser;
      if (actor) {
        const draft = draftFrom(stateRef.current);
        writeLog(draft, actor, {
          action: 'Đăng xuất',
          entity: 'Session',
          entityId: actor.id,
          entityLabel: actor.username,
          detail: reason ?? 'Người dùng chủ động đăng xuất khỏi hệ thống.',
        });
        apply(draft);
      }
      setSession(null);
      persistSession(null);
    },
    [apply, currentUser],
  );

  /* ------------- Het han phien dang nhap & canh bao qua han tra (job he thong) ------------- */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSession((current) => {
        if (current && current.expiresAt <= Date.now()) {
          toast.warning('Phiên đăng nhập đã hết hạn sau 8 giờ không hoạt động. Vui lòng đăng nhập lại.');
          persistSession(null);
          return null;
        }
        return current;
      });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [toast]);

  useEffect(() => {
    if (!currentUser || overdueScanDone.current) return;
    overdueScanDone.current = true;
    const result = runOperation(
      'systemScanOverdue',
      { state: stateRef.current, actor: currentUser },
      { notifiedKeys: loadOverdueKeys() },
    );
    if (result.ok) {
      const data = result.data as { notifiedKeys: string[]; created: number } | undefined;
      apply(result.state as AppState);
      if (data) {
        try {
          window.localStorage.setItem(OVERDUE_KEY, JSON.stringify(data.notifiedKeys));
        } catch {
          /* bo qua */
        }
        if (data.created > 0) {
          toast.warning(`Có ${data.created / 2} phiếu mượn quá hạn trả. Đã gửi thông báo cảnh báo.`);
        }
      }
    }
  }, [currentUser, apply, toast]);

  /* ---------------------------------- Cac ham bo tro ---------------------------------- */

  const changePassword = useCallback(
    (currentPassword: string, newPassword: string): OpResult<unknown> => {
      const actor = currentUser;
      if (!actor) return { ok: false, error: 'Phiên đăng nhập đã hết hạn.' };
      const result = changeOwnPasswordOp(
        { state: stateRef.current, actor },
        { currentPassword, newPassword },
        verifyPassword,
      );
      if (result.ok) apply(result.state as AppState);
      return result as OpResult<unknown>;
    },
    [apply, currentUser],
  );

  const resetDemoData = useCallback(() => {
    apply(buildSeedState());
    overdueScanDone.current = false;
    try {
      window.localStorage.removeItem(OVERDUE_KEY);
    } catch {
      /* bo qua */
    }
  }, [apply]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      currentUser,
      role,
      session,
      can,
      call,
      login: loginWith,
      loginDemo: (username: string) => loginWith(username, DEMO_PASSWORD),
      logout,
      changePassword,
      resetDemoData,
      demoPassword: DEMO_PASSWORD,
    }),
    [state, currentUser, role, session, can, call, loginWith, logout, changePassword, resetDemoData],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/** Hook truy cap kho du lieu + phien dang nhap. */
export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp phải được dùng bên trong <AppProvider>.');
  return ctx;
}

/** Hook lay nguoi dung hien tai (da dam bao dang nhap nho ProtectedRoute). */
export function useCurrentUser(): User {
  const { currentUser } = useApp();
  if (!currentUser) throw new Error('Chưa đăng nhập.');
  return currentUser;
}
