/**
 * Huy hieu trang thai dung thong nhat toan he thong (badge).
 * Bang mau: xanh la = tot/hoan tat, cam = can chu y, do = loi/qua han, xam = trung tinh.
 */
import type {
  AuditStatus,
  BorrowStatus,
  DiscrepancyType,
  EquipmentCondition,
  EquipmentStatus,
  RepairPriority,
  RepairStatus,
} from '@/types';
import {
  AUDIT_STATUS,
  BORROW_STATUS,
  CONDITION_LABELS,
  DISCREPANCY_LABELS,
  EQUIPMENT_STATUS,
  REPAIR_PRIORITY,
  REPAIR_STATUS,
} from '@/lib/labels';
import { Badge } from './ui';

export const EquipmentStatusBadge = ({ status }: { status: EquipmentStatus }): JSX.Element => (
  <Badge tone={EQUIPMENT_STATUS[status].tone}>{EQUIPMENT_STATUS[status].label}</Badge>
);

export const ConditionBadge = ({ condition }: { condition: EquipmentCondition }): JSX.Element => (
  <Badge tone={CONDITION_LABELS[condition].tone}>{CONDITION_LABELS[condition].label}</Badge>
);

export const BorrowStatusBadge = ({ status }: { status: BorrowStatus }): JSX.Element => (
  <Badge tone={BORROW_STATUS[status].tone}>{BORROW_STATUS[status].label}</Badge>
);

export const RepairStatusBadge = ({ status }: { status: RepairStatus }): JSX.Element => (
  <Badge tone={REPAIR_STATUS[status].tone}>{REPAIR_STATUS[status].label}</Badge>
);

export const RepairPriorityBadge = ({ priority }: { priority: RepairPriority }): JSX.Element => (
  <Badge tone={REPAIR_PRIORITY[priority].tone}>Ưu tiên: {REPAIR_PRIORITY[priority].label}</Badge>
);

export const AuditStatusBadge = ({ status }: { status: AuditStatus }): JSX.Element => (
  <Badge tone={AUDIT_STATUS[status].tone}>{AUDIT_STATUS[status].label}</Badge>
);

export const DiscrepancyBadge = ({
  value,
}: {
  value: DiscrepancyType | null;
}): JSX.Element =>
  value ? (
    <Badge tone={DISCREPANCY_LABELS[value].tone}>{DISCREPANCY_LABELS[value].label}</Badge>
  ) : (
    <Badge tone="success">Khớp dữ liệu</Badge>
  );

/** Huy hieu canh bao qua han tra (mau do). */
export const OverdueBadge = ({ days }: { days: number }): JSX.Element => (
  <Badge tone="danger">Quá hạn {days} ngày</Badge>
);

/** Huy hieu thiet bi dang co nguoi chiu trach nhiem. */
export const HolderBadge = ({ name }: { name: string }): JSX.Element => (
  <Badge tone="info">Người giữ: {name}</Badge>
);
