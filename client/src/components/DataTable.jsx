import clsx from 'clsx';

const DataTable = ({ columns, data, className, totalRow }) => {
    if (!data || data.length === 0) {
        return <div className="p-8 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">Nincs megjeleníthető adat.</div>;
    }

    return (
        <div className={clsx("overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white", className)}>
            <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 text-slate-900 border-b border-slate-200 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-6 py-4 whitespace-nowrap">
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className={clsx("px-6 py-3 whitespace-nowrap", col.className)}>
                                    {col.render ? col.render(row) : row[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {totalRow && (
                        <tr className="bg-slate-50 font-bold text-slate-900 border-t-2 border-slate-200">
                            {columns.map((col, colIdx) => (
                                <td key={colIdx} className={clsx("px-6 py-4 whitespace-nowrap", col.className)}>
                                    {totalRow[col.accessor]}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default DataTable;
