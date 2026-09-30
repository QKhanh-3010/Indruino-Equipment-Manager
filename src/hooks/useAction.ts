/**
 * Hook bao quanh tang dich vu: thuc thi thao tac + hien thi toast ket qua.
 * Giup cac trang ngan gon va thong nhat cach bao loi bang tieng Viet.
 */
import { useCallback } from 'react';
import type { OperationName } from '@/services';
import type { OpResult } from '@/services/common';
import { useApp } from '@/data/store';
import { useToast } from '@/components/ui/Toast';

export interface ActionOptions {
  /** Khong hien toast thanh cong (khi trang da tu hien thi ket qua rieng) */
  silentSuccess?: boolean;
  successMessage?: string;
}

export function useAction(): <T = unknown>(
  name: OperationName,
  payload?: unknown,
  options?: ActionOptions,
) => OpResult<T> {
  const { call } = useApp();
  const toast = useToast();

  return useCallback(
    <T,>(name: OperationName, payload?: unknown, options?: ActionOptions): OpResult<T> => {
      const result = call<T>(name, payload);
      if (result.ok) {
        if (!options?.silentSuccess) toast.success(options?.successMessage ?? result.message);
      } else {
        toast.error(result.error);
      }
      return result;
    },
    [call, toast],
  );
}
