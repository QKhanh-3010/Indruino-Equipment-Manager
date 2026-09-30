/**
 * UC-04: Nhap kho thiet bi moi.
 * He thong tu sinh ma dinh danh (INDR-EQ-xxxx) + ma QR cho tung thiet bi, ghi giao dich nhap kho
 * (UC-16 cap nhat ton kho) va cho phep in tem QR ngay sau khi nhap.
 */
import { useMemo, useState } from 'react';
import type { Equipment } from '@/types';
import { GROUP_LABELS } from '@/lib/labels';
import { formatCurrency, formatDate, toDateInput } from '@/lib/utils';
import { useApp } from '@/data/store';
import { useAction } from '@/hooks/useAction';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { QrLabelSheet } from '@/components/QrLabel';
import type { StockInPayload } from '@/services';

const EMPTY_FORM = (): StockInPayload => ({
  name: '',
  categoryId: '',
  quantity: 1,
  supplier: '',
  receivedAt: toDateInput(new Date()),
  price: undefined,
  location: 'Kho Phòng Sản xuất',
  note: '',
  serialPrefix: '',
});

export function StockInPage(): JSX.Element {
  const { state } = useApp();
  const action = useAction();

  const [form, setForm] = useState<StockInPayload>(EMPTY_FORM);
  const [created, setCreated] = useState<Equipment[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const groupedCategories = useMemo(
    () =>
      (['DIEN_DAN_DUNG', 'KY_THUAT'] as const).map((group) => ({
        group,
        label: GROUP_LABELS[group],
        items: state.categories.filter((c) => c.group === group),
      })),
    [state.categories],
  );

  const selectedCategory = state.categories.find((c) => c.id === form.categoryId);

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Vui lòng nhập tên thiết bị.';
    if (!form.categoryId) next.categoryId = 'Vui lòng chọn loại thiết bị.';
    if (!form.supplier.trim()) next.supplier = 'Vui lòng nhập nhà cung cấp.';
    if (!form.receivedAt) next.receivedAt = 'Vui lòng chọn ngày nhập kho.';
    if (!form.quantity || form.quantity < 1) next.quantity = 'Số lượng phải lớn hơn 0.';
    if (form.quantity > 50) next.quantity = 'Tối đa 50 thiết bị cho mỗi phiếu nhập.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (): void => {
    if (!validate()) return;
    const result = action<{ items: Equipment[] }>('createEquipmentStockIn', {
      ...form,
      quantity: Number(form.quantity),
      price: form.price ? Number(form.price) : undefined,
    });
    if (result.ok && result.data) {
      setCreated(result.data.items);
      setForm({ ...EMPTY_FORM(), categoryId: form.categoryId, supplier: form.supplier });
    }
  };

  return (
    <>
      <PageHeader
        title="Nhập kho thiết bị mới"
        description="Mỗi thiết bị được cấp một mã định danh duy nhất (INDR-EQ-xxxx) kèm mã QR để quét khi bàn giao, nhận trả và kiểm kê."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Nhập kho' }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title="Thông tin phiếu nhập"
          description="Trường có dấu * là bắt buộc."
          className="lg:col-span-2"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Tên thiết bị"
              htmlFor="stock-name"
              required
              error={errors.name}
              className="sm:col-span-2"
            >
              <Input
                id="stock-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="VD: Máy khoan bê tông Bosch GBH 2-26"
              />
            </Field>

            <Field
              label="Loại thiết bị (danh mục)"
              htmlFor="stock-category"
              required
              error={errors.categoryId}
              hint={
                selectedCategory
                  ? `Định mức tồn kho Min/Max: ${selectedCategory.minStock}/${selectedCategory.maxStock} ${selectedCategory.unit}`
                  : undefined
              }
            >
              <Select
                id="stock-category"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              >
                <option value="">-- Chọn loại thiết bị --</option>
                {groupedCategories.map((group) => (
                  <optgroup key={group.group} label={group.label}>
                    {group.items.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.unit})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>

            <Field
              label="Số lượng nhập"
              htmlFor="stock-quantity"
              required
              error={errors.quantity}
              hint="Hệ thống sinh mã QR riêng cho từng thiết bị."
            >
              <Input
                id="stock-quantity"
                type="number"
                min={1}
                max={50}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              />
            </Field>

            <Field label="Nhà cung cấp" htmlFor="stock-supplier" required error={errors.supplier}>
              <Input
                id="stock-supplier"
                value={form.supplier}
                onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                placeholder="VD: Điện máy Hà Nội"
              />
            </Field>

            <Field label="Ngày nhập kho" htmlFor="stock-date" required error={errors.receivedAt}>
              <Input
                id="stock-date"
                type="date"
                value={form.receivedAt}
                onChange={(e) => setForm({ ...form, receivedAt: e.target.value })}
              />
            </Field>

            <Field label="Đơn giá (VND)" htmlFor="stock-price" hint="Không bắt buộc.">
              <Input
                id="stock-price"
                type="number"
                min={0}
                value={form.price ?? ''}
                onChange={(e) =>
                  setForm({ ...form, price: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </Field>

            <Field label="Vị trí lưu kho" htmlFor="stock-location">
              <Input
                id="stock-location"
                value={form.location ?? ''}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="VD: Kho A – Kệ 1"
              />
            </Field>

            <Field
              label="Tiền tố serial"
              htmlFor="stock-serial"
              hint="Không bắt buộc. VD: BOSCH → BOSCH-001, BOSCH-002..."
            >
              <Input
                id="stock-serial"
                value={form.serialPrefix ?? ''}
                onChange={(e) => setForm({ ...form, serialPrefix: e.target.value })}
              />
            </Field>

            <Field label="Ghi chú" htmlFor="stock-note" className="sm:col-span-2">
              <Textarea
                id="stock-note"
                value={form.note ?? ''}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="VD: Nhập theo hợp đồng số 25/2026/HĐKT, bảo hành 24 tháng."
              />
            </Field>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="lg" onClick={submit}>
              📦 Nhập kho &amp; sinh mã QR
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setForm(EMPTY_FORM())}>
              Làm mới biểu mẫu
            </Button>
          </div>
        </Card>

        <Card title="Hướng dẫn nghiệp vụ" description="Quy trình nhập kho chuẩn của Phòng Sản xuất.">
          <ol className="space-y-2 text-xs leading-relaxed text-ink-600">
            <li>1. Chọn đúng danh mục thiết bị để hệ thống cảnh báo tồn kho theo định mức Min/Max.</li>
            <li>2. Nhập số lượng — mỗi thiết bị có mã định danh riêng, không dùng chung mã.</li>
            <li>3. Sau khi nhập kho, in tem QR và dán lên thiết bị (nút “In tem QR”).</li>
            <li>4. Hệ thống tự ghi một giao dịch nhập kho cho từng thiết bị (UC-16).</li>
            <li>5. Toàn bộ thao tác đều được ghi vào nhật ký hoạt động để truy vết.</li>
          </ol>
        </Card>
      </div>

      {created.length > 0 ? (
        <section className="mt-5 space-y-4">
          <Card
            title={`Kết quả nhập kho — ${created.length} thiết bị`}
            description="Đã sinh mã định danh và mã QR cho từng thiết bị."
            actions={<Badge tone="success">Nhập kho thành công</Badge>}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-ink-200 text-sm">
                <thead className="bg-ink-50">
                  <tr>
                    {['Mã thiết bị', 'Tên thiết bị', 'Loại', 'Serial', 'Ngày nhập', 'Đơn giá'].map(
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
                  {created.map((item) => (
                    <tr key={item.id} className="hover:bg-navy-50/60">
                      <td className="px-3 py-2.5 font-semibold text-navy-800">{item.code}</td>
                      <td className="px-3 py-2.5">{item.name}</td>
                      <td className="px-3 py-2.5">
                        {state.categories.find((c) => c.id === item.categoryId)?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">{item.serial ?? '—'}</td>
                      <td className="px-3 py-2.5">{formatDate(item.receivedAt)}</td>
                      <td className="px-3 py-2.5">{formatCurrency(item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="In tem QR cho thiết bị vừa nhập"
            description="Dán tem lên thiết bị để nhân viên quét khi nhận/trả và Kỹ thuật viên quét khi kiểm kê."
          >
            <QrLabelSheet
              items={created}
              categoryNameOf={(categoryId) =>
                state.categories.find((c) => c.id === categoryId)?.name ?? '—'
              }
            />
          </Card>
        </section>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon="📦"
            title="Chưa có thiết bị nào được nhập trong phiên làm việc này"
            description="Điền thông tin phiếu nhập và nhấn “Nhập kho & sinh mã QR” để hệ thống tạo mã định danh, mã QR và bản in tem."
          />
        </div>
      )}
    </>
  );
}
