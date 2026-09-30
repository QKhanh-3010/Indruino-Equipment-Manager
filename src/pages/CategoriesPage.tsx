/**
 * Quan ly danh muc thiet bi + dinh muc ton kho Min/Max (phuc vu canh bao ton kho).
 */
import { useState } from 'react';
import type { Category, EquipmentGroup } from '@/types';
import { GROUP_LABELS } from '@/lib/labels';
import { useApp } from '@/data/store';
import { stockByCategory } from '@/services/selectors';
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useAction } from '@/hooks/useAction';

interface CategoryForm {
  id?: string;
  code: string;
  name: string;
  group: EquipmentGroup;
  unit: string;
  minStock: number;
  maxStock: number;
  description: string;
}

const EMPTY_FORM = (): CategoryForm => ({
  code: '',
  name: '',
  group: 'DIEN_DAN_DUNG',
  unit: 'cái',
  minStock: 3,
  maxStock: 20,
  description: '',
});

export function CategoriesPage(): JSX.Element {
  const { state } = useApp();
  const action = useAction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(EMPTY_FORM);
  const stock = stockByCategory(state);

  const submit = (): void => {
    const result = action('saveCategory', {
      ...form,
      minStock: Number(form.minStock),
      maxStock: Number(form.maxStock),
    });
    if (result.ok) {
      setOpen(false);
      setForm(EMPTY_FORM());
    }
  };

  const columns: Column<Category>[] = [
    {
      key: 'code',
      header: 'Mã',
      render: (category) => <span className="font-semibold text-navy-800">{category.code}</span>,
      sortValue: (category) => category.code,
    },
    {
      key: 'name',
      header: 'Loại thiết bị',
      render: (category) => (
        <div>
          <p className="font-medium text-ink-800">{category.name}</p>
          <p className="text-[11px] text-ink-500">{category.description ?? '—'}</p>
        </div>
      ),
      sortValue: (category) => category.name,
    },
    {
      key: 'group',
      header: 'Nhóm thiết bị',
      hideOnMobile: true,
      render: (category) => <Badge tone="info">{GROUP_LABELS[category.group]}</Badge>,
      sortValue: (category) => GROUP_LABELS[category.group],
    },
    {
      key: 'unit',
      header: 'Đơn vị',
      render: (category) => category.unit,
    },
    {
      key: 'minmax',
      header: 'Định mức Min/Max',
      align: 'center',
      render: (category) => `${category.minStock} / ${category.maxStock}`,
      sortValue: (category) => category.minStock,
    },
    {
      key: 'stock',
      header: 'Tồn kho hiện tại',
      render: (category) => {
        const row = stock.find((s) => s.category.id === category.id);
        if (!row) return '—';
        return (
          <div className="space-y-1">
            <p className="text-[12px]">
              Khả dụng <strong className="text-emerald-700">{row.available}</strong> · Đang mượn{' '}
              {row.borrowed} · Hỏng {row.broken}
            </p>
            {row.alert === 'low' ? (
              <Badge tone="danger">Dưới định mức Min</Badge>
            ) : row.alert === 'high' ? (
              <Badge tone="warning">Vượt định mức Max</Badge>
            ) : (
              <Badge tone="success">Trong định mức</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Thao tác',
      align: 'right',
      render: (category) => (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setForm({
              id: category.id,
              code: category.code,
              name: category.name,
              group: category.group,
              unit: category.unit,
              minStock: category.minStock,
              maxStock: category.maxStock,
              description: category.description ?? '',
            });
            setOpen(true);
          }}
        >
          Sửa định mức
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Danh mục thiết bị & định mức tồn kho"
        description="Quản lý loại thiết bị theo hai nhóm (điện dân dụng và kỹ thuật) cùng định mức Min/Max để hệ thống tự cảnh báo tồn kho."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Danh mục' }]}
        actions={
          <Button
            onClick={() => {
              setForm(EMPTY_FORM());
              setOpen(true);
            }}
          >
            ＋ Thêm danh mục
          </Button>
        }
      />

      <Card title={`Danh sách danh mục (${state.categories.length})`}>
        <DataTable
          columns={columns}
          rows={state.categories}
          rowKey={(category) => category.id}
          searchable={(category) => `${category.code} ${category.name} ${category.unit}`}
          searchPlaceholder="Tìm theo mã hoặc tên danh mục..."
          emptyTitle="Chưa có danh mục nào"
        />
      </Card>

      <Modal
        open={open}
        title={form.id ? `Sửa danh mục ${form.code}` : 'Thêm danh mục thiết bị'}
        description="Định mức Min/Max dùng để phát cảnh báo tồn kho tự động cho Phòng Sản xuất."
        onClose={() => setOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Hủy bỏ
            </Button>
            <Button onClick={submit}>Lưu danh mục</Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Mã danh mục" htmlFor="cat-code" required hint="VD: QT, MK, MH, DHD...">
            <Input
              id="cat-code"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Đơn vị tính" htmlFor="cat-unit" required>
            <Input
              id="cat-unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="cái / bộ / cuộn"
            />
          </Field>
          <Field label="Tên danh mục" htmlFor="cat-name" required className="sm:col-span-2">
            <Input
              id="cat-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="VD: Máy khoan"
            />
          </Field>
          <Field label="Nhóm thiết bị" htmlFor="cat-group" required>
            <Select
              id="cat-group"
              value={form.group}
              onChange={(e) => setForm({ ...form, group: e.target.value as EquipmentGroup })}
            >
              <option value="DIEN_DAN_DUNG">Thiết bị điện dân dụng</option>
              <option value="KY_THUAT">Thiết bị kỹ thuật</option>
            </Select>
          </Field>
          <Field label="Định mức tối thiểu (Min)" htmlFor="cat-min" required>
            <Input
              id="cat-min"
              type="number"
              min={0}
              value={form.minStock}
              onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
            />
          </Field>
          <Field label="Định mức tối đa (Max)" htmlFor="cat-max" required>
            <Input
              id="cat-max"
              type="number"
              min={0}
              value={form.maxStock}
              onChange={(e) => setForm({ ...form, maxStock: Number(e.target.value) })}
            />
          </Field>
          <Field label="Mô tả" htmlFor="cat-desc" className="sm:col-span-2">
            <Textarea
              id="cat-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="VD: Máy khoan bê tông, khoan bàn, khoan pin"
            />
          </Field>
        </div>
      </Modal>
    </>
  );
}
