/**
 * Cac tien ich nho dung chung (re-export) giup import ngan gon hon.
 */
export { cn, formatDate, formatDateTime, formatCurrency, formatNumber } from '@/lib/utils';
export {
  escapeHtml,
  exportCsv,
  exportExcel,
  printDocument,
  downloadFile,
  documentHeader,
  isOverdue,
  overdueDays,
  toDateInput,
  toDateTimeInput,
  uid,
  formatCode,
  formatEquipmentCode,
  readImageAsDataUrl,
} from '@/lib/utils';
export type { ExportColumn } from '@/lib/utils';
export { hashPassword, verifyPassword, generateSalt, sha256Hex } from '@/lib/crypto';
export {
  roleHasPermission,
  roleHasAnyPermission,
  DEFAULT_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from '@/lib/permissions';
