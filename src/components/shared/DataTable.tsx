import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ColumnDef<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render: (row: T) => React.ReactNode;
}

export interface SortState {
  key: string;
  order: 'asc' | 'desc';
}

interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  isEmpty?: boolean;
  onRowClick?: (row: T) => void;
  sortState?: SortState;
  onSortChange?: (sort: SortState) => void;
  emptyContent?: React.ReactNode;
  loadingContent?: React.ReactNode;
  className?: string;
}

export function DataTable<T extends object>({
  data,
  columns,
  isLoading,
  isEmpty,
  onRowClick,
  sortState,
  onSortChange,
  emptyContent,
  loadingContent,
  className,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSortChange) return;
    if (sortState?.key === key) {
      onSortChange({ key, order: sortState.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, order: 'asc' });
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-[15px] border border-[#E5E5EA] px-5 py-6 overflow-x-auto',
        className
      )}
    >
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr className="border-b border-[#F0F0F0]">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={cn(
                  'text-left pb-4 pr-4 text-[18px] font-semibold text-[#161616]',
                  col.sortable && 'cursor-pointer select-none hover:text-[#0000FF] transition-colors'
                )}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && (
                    <SortIcon
                      active={sortState?.key === col.key}
                      order={sortState?.key === col.key ? sortState.order : undefined}
                    />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="pt-4">
                {loadingContent ?? <DefaultLoadingSkeleton columns={columns.length} />}
              </td>
            </tr>
          ) : isEmpty || data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="pt-4">
                {emptyContent ?? <DefaultEmpty />}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                className={cn(
                  'border-b border-[#F8F8F8] last:border-0',
                  'h-[96px]',
                  onRowClick && 'cursor-pointer hover:bg-[#FAFAFF] transition-colors'
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className="pr-4 text-[20px] text-[#191919] font-normal">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function SortIcon({ active, order }: { active: boolean; order?: 'asc' | 'desc' }) {
  return (
    <span className="inline-flex flex-col leading-none">
      <ChevronUp
        className={cn(
          'w-3 h-3 -mb-0.5',
          active && order === 'asc' ? 'text-[#0000FF]' : 'text-[#D0D5DD]'
        )}
      />
      <ChevronDown
        className={cn(
          'w-3 h-3',
          active && order === 'desc' ? 'text-[#0000FF]' : 'text-[#D0D5DD]'
        )}
      />
    </span>
  );
}

function DefaultLoadingSkeleton({ columns }: { columns: number }) {
  return (
    <div className="space-y-3 py-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4 h-[80px] items-center">
          {Array.from({ length: columns }).map((_, j) => (
            <div
              key={j}
              className="h-[20px] bg-[#F0F0F5] rounded-[6px] animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DefaultEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[#667085]">
      <p className="text-[16px]">Sin resultados</p>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  operational: '#228D70',
  active: '#228D70',
  installed: '#228D70',
  new_store: '#FADC45',
  maintenance: '#FADC45',
  connecting: '#FADC45',
  inactive: '#FF4163',
  failed: '#FF4163',
  uninstalled: '#FF4163',
  suspended: '#FF4163',
  pending: '#FADC45',
};

export function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#D0D5DD';
  return (
    <span
      className="inline-block w-[20px] h-[20px] rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
      title={status}
    />
  );
}
