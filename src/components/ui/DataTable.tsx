/**
 * Bang du lieu dung chung: tim kiem, sap xep, phan trang + trang thai rong ro rang.
 * Ho tro thao tac bang ban phim (nut sap xep, nut phan trang deu la <button>).
 */
import { useMemo, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button, EmptyState, Input } from './index';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** Gia tri dung de sap xep (bo trong neu cot khong can sap xep) */
  sortValue?: (row: T) => string | number;
  className?: string;
  align?: 'left' | 'right' | 'center';
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  onRowClick?: (row: T) => void;
  pageSize?: number;
  /** Ham tra ve chuoi de tim kiem */
  searchable?: (row: T) => string;
  searchPlaceholder?: string;
  toolbar?: ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription,
  emptyAction,
  onRowClick,
  pageSize = 10,
  searchable,
  searchPlaceholder = 'Tìm kiếm...',
  toolbar,
}: DataTableProps<T>): JSX.Element {
  const [keyword, setKeyword] = useState('');
  const [sortKey, setSortKey] = useState<string | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw || !searchable) return rows;
    return rows.filter((row) => searchable(row).toLowerCase().includes(kw));
  }, [rows, keyword, searchable]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const column = columns.find((c) => c.key === sortKey);
    if (!column?.sortValue) return filtered;
    const get = column.sortValue;
    return [...filtered].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (typeof va === 'number' && typeof vb === 'number') {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      return sortDir === 'asc'
        ? String(va).localeCompare(String(vb), 'vi')
        : String(vb).localeCompare(String(va), 'vi');
    });
  }, [filtered, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return;
    if (sortKey === column.key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(column.key);
      setSortDir('asc');
    }
  };

  const header = (searchable || toolbar) && (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {searchable ? (
        <div className="w-full sm:max-w-xs">
          <label className="sr-only" htmlFor="data-table-search">
            {searchPlaceholder}
          </label>
          <Input
            id="data-table-search"
            type="search"
            value={keyword}
            placeholder={searchPlaceholder}
            onChange={(e) => {
              setKeyword(e.target.value);
              setPage(1);
            }}
          />
        </div>
      ) : (
        <span />
      )}
      {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
    </div>
  );

  if (sorted.length === 0) {
    return (
      <div className="space-y-3">
        {header}
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {header}
      <div className="overflow-x-auto rounded-lg border border-ink-200">
        <table className="min-w-full divide-y divide-ink-200 text-sm">
          <thead className="bg-ink-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-500',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.hideOnMobile && 'hidden md:table-cell',
                  )}
                >
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column)}
                      className="inline-flex items-center gap-1 rounded text-ink-600 hover:text-navy-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-300"
                      aria-label={`Sắp xếp theo ${column.header}`}
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-[10px]">
                        {sortKey === column.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 bg-white">
            {pageRows.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('transition hover:bg-navy-50/60', onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-3 py-2.5 align-top text-ink-700',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.hideOnMobile && 'hidden md:table-cell',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
        <span>
          Hiển thị {pageRows.length} / {sorted.length} bản ghi
          {keyword ? ` (đã lọc theo "${keyword}")` : ''}
        </span>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              ← Trước
            </Button>
            <span aria-live="polite">
              Trang {currentPage} / {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Sau →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
