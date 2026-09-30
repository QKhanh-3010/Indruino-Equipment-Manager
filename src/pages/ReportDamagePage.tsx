/**
 * UC-15: Bao hong thiet bi (mo ta su co + dinh kem anh).
 * Sau khi gui, he thong tao phieu sua chua va thong bao cho Ky thuat vien.
 */
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { RepairPriority } from '@/types';
import { readImageAsDataUrl } from '@/lib/utils';
import { useApp } from '@/data/store';
import { getCategoryName } from '@/services/selectors';
import { Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { useAction } from '@/hooks/useAction';
import { useToast } from '@/components/ui/Toast';

export function ReportDamagePage(): JSX.Element {
  const { state } = useApp();
  const action = useAction();
  const toast = useToast();
  const [searchParams] = useSearchParams();

  const candidates = state.equipment.filter(
    (e) => e.status !== 'DA_THANH_LY' && e.status !== 'DANG_MUON',
  );

  const preset = state.equipment.find(
    (e) => e.code.toUpperCase() === (searchParams.get('code') ?? '').toUpperCase(),
  );

  const [equipmentId, setEquipmentId] = useState(preset?.id ?? '');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState<RepairPriority>('BINH_THUONG');
  const [severity, setSeverity] = useState<'HONG_NHE' | 'HONG_NANG'>('HONG_NHE');
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const selected = state.equipment.find((e) => e.id === equipmentId);

  const handleFiles = async (files: FileList | null): Promise<void> => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const results: string[] = [];
      for (const file of Array.from(files).slice(0, 3)) {
        results.push(await readImageAsDataUrl(file));
      }
      setImages((prev) => [...prev, ...results].slice(0, 3));
      toast.success(`Đã đính kèm ${results.length} ảnh minh hoạ sự cố.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không xử lý được ảnh đính kèm.');
    } finally {
      setBusy(false);
    }
  };

  const submit = (): void => {
    const result = action('reportDamage', { equipmentId, issue, images, priority, severity });
    if (result.ok) {
      setIssue('');
      setImages([]);
      setPriority('BINH_THUONG');
      setSeverity('HONG_NHE');
    }
  };

  return (
    <>
      <PageHeader
        title="Báo hỏng thiết bị"
        description="Ghi nhận sự cố thiết bị để Kỹ thuật viên tiếp nhận sửa chữa. Có thể đính kèm tối đa 3 ảnh minh hoạ."
        breadcrumb={[{ label: 'Indruino Equipment Manager' }, { label: 'Báo hỏng' }]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Thông tin sự cố" description="Trường có dấu * là bắt buộc." className="lg:col-span-2">
          <div className="space-y-3">
            <Field
              label="Thiết bị bị hỏng"
              htmlFor="damage-equipment"
              required
              hint="Không thể báo hỏng thiết bị đang được mượn — hãy thực hiện trả thiết bị và ghi nhận hư hỏng khi trả."
            >
              <Select
                id="damage-equipment"
                value={equipmentId}
                onChange={(e) => setEquipmentId(e.target.value)}
              >
                <option value="">-- Chọn thiết bị --</option>
                {candidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </Select>
            </Field>

            {selected && (
              <div className="rounded-lg border border-ink-200 bg-ink-50/60 px-3 py-2 text-xs text-ink-600">
                Loại: {getCategoryName(state, selected.categoryId)} · Vị trí:{' '}
                {selected.location ?? '—'} · Serial: {selected.serial ?? '—'}
              </div>
            )}

            <Field
              label="Mô tả sự cố"
              htmlFor="damage-issue"
              required
              hint="Tối thiểu 10 ký tự. Ghi rõ hiện tượng, thời điểm phát hiện và điều kiện sử dụng."
            >
              <Textarea
                id="damage-issue"
                value={issue}
                onChange={(e) => setIssue(e.target.value)}
                placeholder="VD: Máy khoan bê tông phát ra tiếng kêu lạ, mũi khoan bị kẹt khi khoan trần bê tông."
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Mức độ ưu tiên" htmlFor="damage-priority" required>
                <Select
                  id="damage-priority"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as RepairPriority)}
                >
                  <option value="THAP">Thấp — thiết bị vẫn dùng tạm được</option>
                  <option value="BINH_THUONG">Bình thường</option>
                  <option value="CAO">Cao — ảnh hưởng tiến độ sản xuất</option>
                </Select>
              </Field>
              <Field label="Mức độ hư hỏng" htmlFor="damage-severity" required>
                <Select
                  id="damage-severity"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as 'HONG_NHE' | 'HONG_NANG')}
                >
                  <option value="HONG_NHE">Hỏng nhẹ — cần kiểm tra, sửa chữa</option>
                  <option value="HONG_NANG">Hỏng nặng</option>
                </Select>
              </Field>
            </div>

            <Field
              label="Ảnh minh hoạ sự cố"
              htmlFor="damage-images"
              hint="Tối đa 3 ảnh. Ảnh được thu nhỏ tự động trước khi lưu."
            >
              <Input
                id="damage-images"
                type="file"
                accept="image/*"
                multiple
                disabled={busy || images.length >= 3}
                onChange={(e) => void handleFiles(e.target.files)}
              />
            </Field>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((src, index) => (
                  <div key={index} className="relative">
                    <img
                      src={src}
                      alt={`Ảnh sự cố ${index + 1}`}
                      className="h-24 w-32 rounded-md border border-ink-200 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute -right-2 -top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white"
                      aria-label={`Xóa ảnh ${index + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <Button size="lg" onClick={submit} disabled={!equipmentId || busy}>
              🛠 Gửi báo hỏng &amp; tạo phiếu sửa chữa
            </Button>
          </div>
        </Card>

        <Card title="Quy trình xử lý sau khi báo hỏng">
          <ol className="space-y-2 text-xs leading-relaxed text-ink-600">
            <li>1. Thiết bị chuyển sang trạng thái “Chờ sửa chữa” và không thể cho mượn.</li>
            <li>2. Hệ thống tạo phiếu sửa chữa và thông báo cho Kỹ thuật viên + Quản lý.</li>
            <li>3. Kỹ thuật viên tiếp nhận → sửa chữa → ghi kết quả xử lý.</li>
            <li>4. Nếu không sửa được, Kỹ thuật viên đề xuất thanh lý để Quản lý quyết định.</li>
            <li>5. Toàn bộ diễn biến được lưu trong “Lịch sử thiết bị”.</li>
          </ol>
        </Card>
      </div>
    </>
  );
}
