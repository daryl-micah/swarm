type Col<T> = { key: string; label: string; num?: boolean; cell: (row: T) => React.ReactNode };

export function Table<T>({ cols, rows, rowKey, rowClass }: { cols: Col<T>[]; rows: T[]; rowKey: (r: T) => string; rowClass?: (r: T) => string }) {
  return (
    <div className="overflow-x-auto border border-border rounded-card bg-card">
      <table className="w-full data">
        <thead>
          <tr className="border-b border-border">
            {cols.map((c) => <th key={c.key} scope="col" className={`label px-4 py-3 ${c.num ? "text-right" : "text-left"}`}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={rowKey(r)} className={`border-b border-border last:border-0 ${rowClass?.(r) ?? ""}`}>
              {cols.map((c) => <td key={c.key} className={`px-4 py-3 align-top ${c.num ? "text-right" : "text-left"}`}>{c.cell(r)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
