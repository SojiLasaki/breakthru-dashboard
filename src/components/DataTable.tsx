import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export interface Column<T> {
  label: string;
  key?: keyof T;
  render?: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  footer?: ReactNode;
  rowKey: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  onRowClick,
  emptyMessage = 'No data found',
  footer,
  rowKey,
}: DataTableProps<T>) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {columns.map(col => (
                <th
                  key={col.label}
                  className={`text-left px-4 py-3 text-xs font-medium text-muted-foreground whitespace-nowrap ${col.headerClassName ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-muted-foreground text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  className={`border-b border-border transition-colors ${i % 2 === 1 ? 'bg-muted/10' : ''} ${onRowClick ? 'hover:bg-accent/30 cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.label} className={`px-4 py-3 ${col.className ?? ''}`}>
                      {col.render
                        ? col.render(row)
                        : col.key != null
                        ? String(row[col.key] ?? '')
                        : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {footer && (
        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
          {footer}
        </div>
      )}
    </div>
  );
}
