/**
 * Bo UI nguyen to (primitives) dung thong nhat tren toan he thong:
 * nut, o nhap, the, huy hieu trang thai, hop thoai, bang du lieu, trang thai rong/loi...
 * Tat ca deu co nhan (label) va ho tro thao tac bang ban phim.
 */
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import type { Tone } from '@/lib/labels';
import { TONE_CLASSES } from '@/lib/labels';

/* ---------------------------------- Nut bam ---------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'subtle';

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-navy-700 text-white shadow-xs hover:bg-navy-800 active:bg-navy-900 focus-visible:ring-navy-400',
  secondary:
    'border border-ink-300 bg-white text-ink-700 shadow-xs hover:border-ink-400 hover:bg-ink-50 focus-visible:ring-navy-300',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-800 focus-visible:ring-navy-300',
  danger: 'bg-red-600 text-white shadow-xs hover:bg-red-700 focus-visible:ring-red-300',
  success: 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 focus-visible:ring-emerald-300',
  subtle: 'bg-navy-50 text-navy-800 hover:bg-navy-100 focus-visible:ring-navy-300',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
  loading?: boolean;
  /** Bieu tuong hien thi truoc nhan (dung SVG/emoji nho) */
  leftIcon?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  leftIcon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps): JSX.Element {
  const sizes = {
    sm: 'h-8 gap-1.5 px-3 text-xs',
    md: 'h-9 gap-2 px-3.5 text-[13px]',
    lg: 'h-11 gap-2 px-5 text-sm',
  } as const;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-semibold transition-all duration-150 ease-out-quint focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-55',
        BUTTON_STYLES[variant],
        sizes[size],
        block && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : (
        leftIcon && (
          <span aria-hidden="true" className="shrink-0 text-[1.05em] leading-none">
            {leftIcon}
          </span>
        )
      )}
      {children}
    </button>
  );
}

/* ---------------------------------- Huy hieu trang thai ---------------------------------- */

export function Badge({
  tone = 'neutral',
  children,
  className,
  dot = false,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  /** Hien thi cham mau truoc nhan: giup phan biet trang thai ca khi in den trang */
  dot?: boolean;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-[3px] text-2xs font-semibold ring-1 ring-inset',
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot && (
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-80" />
      )}
      {children}
    </span>
  );
}

/* ---------------------------------- The / khung noi dung ---------------------------------- */

export function Card({
  title,
  description,
  actions,
  icon,
  children,
  footer,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Bieu tuong nho hien thi trong o vuong ben trai tieu de */
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
}): JSX.Element {
  return (
    <section className={cn('surface overflow-hidden', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-200/80 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span
                aria-hidden="true"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-navy-50 text-[15px] text-navy-700 ring-1 ring-inset ring-navy-100"
              >
                {icon}
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="text-[13.5px] font-semibold text-ink-900 sm:text-sm">{title}</h2>
              )}
              {description && (
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn('px-4 py-4 sm:px-5', bodyClassName)}>{children}</div>
      {footer && (
        <footer className="border-t border-ink-200/80 bg-ink-50/60 px-4 py-3 sm:px-5">
          {footer}
        </footer>
      )}
    </section>
  );
}

/* ---------------------------------- Truong nhap lieu ---------------------------------- */

export function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-700">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-2xs leading-relaxed text-ink-500">{hint}</p>}
      {error && (
        <p className="flex items-start gap-1 text-2xs font-medium text-red-600" role="alert">
          <span aria-hidden="true">⚠</span>
          {error}
        </p>
      )}
    </div>
  );
}

const CONTROL_CLASS =
  'w-full rounded-lg border border-ink-300 bg-white px-3 text-[13px] text-ink-800 shadow-xs transition placeholder:text-ink-400 focus:border-navy-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-navy-100 disabled:cursor-not-allowed disabled:bg-ink-100 disabled:text-ink-500';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input className={cn(CONTROL_CLASS, 'h-9', className)} {...rest} />;
}

/** Hop chon co mui ten tuy chinh (thay cho mui ten mac dinh cua trinh duyet). */
export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return (
    <div className="relative">
      <select className={cn(CONTROL_CLASS, 'h-9 appearance-none pr-9', className)} {...rest}>
        {children}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
      >
        <path
          d="M6 8l4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export function Textarea({
  className,
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn(CONTROL_CLASS, 'min-h-[96px] resize-y py-2', className)} {...rest} />;
}

/* ---------------------------------- Hop thoai ---------------------------------- */

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}): JSX.Element | null {
  // Dong hop thoai bang phim Escape (ho tro thao tac bang ban phim)
  useEffect(() => {
    if (!open) return undefined;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' } as const;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink-950/60 p-4 backdrop-blur-[2px] sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full overflow-hidden rounded-2xl border border-ink-200/80 bg-white shadow-pop animate-fade-in-scale',
          widths[size],
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-ink-200/80 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink-900">{title}</h2>
            {description && (
              <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
          >
            ✕
          </button>
        </header>
        <div className="scroll-thin max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-200/80 bg-ink-50/70 px-5 py-3.5">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

/**
 * Hop thoai xac nhan cho hanh dong KHONG THE HOAN TAC
 * (duyet, tu choi, thanh ly, khoa tai khoan...).
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element | null {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-full text-base',
            tone === 'danger' ? 'bg-red-50 text-red-600 ring-1 ring-inset ring-red-200' : 'bg-navy-50 text-navy-700 ring-1 ring-inset ring-navy-200',
          )}
        >
          {tone === 'danger' ? '!' : '?'}
        </span>
        <p className="pt-1 text-[13px] leading-relaxed text-ink-700">{message}</p>
      </div>
      <p className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-2xs leading-relaxed text-amber-800">
        <span aria-hidden="true">⚠</span>
        Thao tác này không thể hoàn tác và sẽ được ghi vào nhật ký hoạt động.
      </p>
    </Modal>
  );
}

/* ---------------------------------- Trang thai rong / loi / dang tai ---------------------------------- */

export function EmptyState({
  title,
  description,
  action,
  icon = '📋',
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: string;
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink-300 bg-ink-50/60 px-6 py-10 text-center">
      <span aria-hidden="true" className="text-2xl">
        {icon}
      </span>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description && <p className="max-w-md text-xs text-ink-500">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}): JSX.Element {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
      <p className="text-sm font-semibold text-red-800">Đã xảy ra lỗi</p>
      <p className="mt-1 text-xs text-red-700">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/* ---------------------------------- Tieu de trang + breadcrumb ---------------------------------- */

export function Breadcrumb({ items }: { items: { label: string; to?: string }[] }): JSX.Element {
  return (
    <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-1 text-xs text-ink-500">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 && (
            <span aria-hidden="true" className="text-ink-300">
              /
            </span>
          )}
          {item.to ? (
            <a
              href={item.to}
              className="rounded text-navy-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
            >
              {item.label}
            </a>
          ) : (
            <span className="font-medium text-ink-700">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumb?: { label: string; to?: string }[];
  actions?: ReactNode;
}): JSX.Element {
  return (
    <header className="mb-5 flex flex-col gap-3 border-b border-ink-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {breadcrumb && <Breadcrumb items={breadcrumb} />}
        <h1 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">{title}</h1>
        {description && <p className="max-w-3xl text-sm text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/* ---------------------------------- The so lieu (Dashboard) ---------------------------------- */

export function StatCard({
  label,
  value,
  tone = 'info',
  hint,
  onClick,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  hint?: string;
  onClick?: () => void;
}): JSX.Element {
  const accent: Record<Tone, string> = {
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
    info: 'text-navy-700',
    neutral: 'text-ink-600',
  };

  const content = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn('mt-2 text-2xl font-bold', accent[tone])}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
    </>
  );

  const baseClass =
    'w-full rounded-xl border border-ink-200 bg-white p-4 text-left shadow-card transition';

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          baseClass,
          'hover:border-navy-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300',
        )}
      >
        {content}
      </button>
    );
  }
  return <div className={baseClass}>{content}</div>;
}
