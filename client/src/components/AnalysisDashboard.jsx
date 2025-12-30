import { useState } from 'react';
import DataTable from './DataTable';
import { exportData } from '../services/api';
import { FileDown, FileSpreadsheet, FileArchive, Check, Layers, Sprout, Wheat } from 'lucide-react';
import { saveAs } from 'file-saver';

const AnalysisDashboard = ({ results }) => {
    const fileKeys = Object.keys(results);
    const [selectedFileKey, setSelectedFileKey] = useState(fileKeys[0]);
    const [activeTab, setActiveTab] = useState('summary');
    const [exporting, setExporting] = useState(false);

    const data = results[selectedFileKey];

    // Formatting helpers
    const fmt = (num) => typeof num === 'number' ? num.toFixed(4).replace('.', ',') : num;

    const handleExport = async (type, isGlobal = false) => {
        setExporting(true);
        try {
            const payloadData = isGlobal ? results : data;
            const filenameStr = isGlobal
                ? `Mind_(${fileKeys.length})_${new Date().toISOString().slice(0, 10)}`
                : data.analysis_data.applicant_info.name.replace(/ /g, '_');

            const ext = type === 'excel' ? 'xlsx' : type;
            const filename = `${filenameStr}.${ext}`;

            const blob = await exportData(type, payloadData, filename);
            saveAs(blob, filename);
        } catch (e) {
            console.error("Export failed", e);
            alert("Hiba a letöltés során");
        }
        setExporting(false);
    };

    const tabs = [
        { id: 'summary', label: 'Összefoglaló', icon: <Layers size={18} /> },
        { id: 'fovetes', label: 'Fővetés', icon: <Wheat size={18} /> },
        { id: 'masodvetes', label: 'Másodvetés', icon: <Sprout size={18} /> },
    ];

    if (!data) return null;

    const { applicant_info } = data.analysis_data;
    const stats = data.analysis_data.extra_stats;
    const totals = data.analysis_data.totals;

    return (
        <div className="space-y-6">
            {/* Top Bar: Selector & Export */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <label className="text-sm font-medium text-slate-500 whitespace-nowrap">Kiválasztott fájl:</label>
                    <select
                        className="form-select block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
                        value={selectedFileKey}
                        onChange={(e) => setSelectedFileKey(e.target.value)}
                    >
                        {fileKeys.map(key => (
                            <option key={key} value={key}>{key}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <ExportButton onClick={() => handleExport('zip', true)} icon={<FileArchive size={16} />} label="Összes (ZIP)" primary disabled={exporting} />
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>
                    <ExportButton onClick={() => handleExport('excel')} icon={<FileSpreadsheet size={16} />} label="Excel" disabled={exporting} />
                    <ExportButton onClick={() => handleExport('pdf')} icon={<FileDown size={16} />} label="PDF" disabled={exporting} />
                </div>
            </div>

            {/* Applicant Info & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Kérelmező Adatok</h3>
                    <div className="text-2xl font-bold mb-1">{applicant_info.name}</div>
                    <div className="text-green-400 font-mono text-sm bg-green-900/30 px-2 py-1 rounded inline-block">
                        {applicant_info.mak_id}
                    </div>
                </div>

                <StatCard label="Nitrátérzékeny" value={`${fmt(stats.nitrate_sum)} ha`} />
                <StatCard label="Top 5 Tábla" value={`${fmt(stats.top_5_plots_sum)} ha`} />
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                <div className="flex border-b border-slate-200 bg-slate-50">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors relative
                                ${activeTab === tab.id ? 'text-green-700 bg-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
                        >
                            {tab.icon}
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-600" />
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {activeTab === 'summary' && (
                        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
                            <div>
                                <h4 className="text-lg font-semibold text-slate-800 mb-4">Összesítő Táblázat</h4>
                                <DataTable
                                    columns={[
                                        { header: 'Kód', accessor: 'kod', className: 'font-mono text-slate-500' },
                                        { header: 'Megnevezés', accessor: 'megnevezes', className: 'font-medium' },
                                        { header: 'Eredeti (ha)', accessor: 'teruletEredeti', render: r => fmt(r.teruletEredeti), className: 'text-right' },
                                        { header: 'Fővetés (ha)', accessor: 'fovetesSzamitott', render: r => fmt(r.fovetesSzamitott), className: 'text-right' },
                                        { header: 'Másodvetés (ha)', accessor: 'masodvetesSzamitott', render: r => fmt(r.masodvetesSzamitott), className: 'text-right' },
                                        { header: 'Összesen (ha)', accessor: 'osszesenSzamitott', render: r => fmt(r.osszesenSzamitott), className: 'text-right font-bold text-green-700' },
                                    ]}
                                    data={data.analysis_data.summary_df}
                                    totalRow={totals}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Check className="text-green-600" size={16} /> Agrotechnikai műveletek
                                    </h5>
                                    <ul className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                                        {(stats.agrotechnics || []).map((item, i) => (
                                            <li key={i} className="px-4 py-3 text-sm text-slate-600">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                        <Check className="text-green-600" size={16} /> Támogatási igények
                                    </h5>
                                    <ul className="bg-slate-50 rounded-lg border border-slate-200 divide-y divide-slate-100">
                                        {(stats.support_requests || []).map((item, i) => (
                                            <li key={i} className="px-4 py-3 text-sm text-slate-600">{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'fovetes' && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <DataTable
                                columns={[
                                    { header: 'Vármegye', accessor: 'varmegye' },
                                    { header: 'Település', accessor: 'telepules' },
                                    { header: 'Blokk', accessor: 'blokk', className: 'font-mono' },
                                    { header: 'Tábla', accessor: 'tabla' },
                                    { header: 'Kód', accessor: 'kod', className: 'font-mono' },
                                    { header: 'Név', accessor: 'nev', className: 'font-medium' },
                                    { header: 'Méret (ha)', accessor: 'meret', render: r => fmt(r.meret), className: 'text-right font-bold' },
                                    {
                                        header: 'Nitrát', accessor: 'nitrat', render: r => (
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.nitrat === 'Igen' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                {r.nitrat}
                                            </span>
                                        )
                                    },
                                ]}
                                data={data.fovetes}
                            />
                        </div>
                    )}

                    {activeTab === 'masodvetes' && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <DataTable
                                columns={[
                                    { header: 'Blokk', accessor: 'blokk', className: 'font-mono' },
                                    { header: 'Tábla', accessor: 'tabla' },
                                    { header: 'Sorszám', accessor: 'sorszam' },
                                    { header: 'Típus', accessor: 'tipus' },
                                    { header: 'Megnevezés', accessor: 'megnevezes' },
                                    { header: 'Anyag', accessor: 'anyag' },
                                    { header: 'Növény', accessor: 'novenyKod' },
                                    { header: 'Terület (ha)', accessor: 'terulet', render: r => fmt(r.terulet), className: 'text-right font-bold' },
                                ]}
                                data={data.masodvetes}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const StatCard = ({ label, value }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
    </div>
);

const ExportButton = ({ icon, label, onClick, primary, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${primary
                ? "bg-green-700 text-white hover:bg-green-800 shadow-lg shadow-green-900/20"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        `}
    >
        {icon}
        {label}
    </button>
);

export default AnalysisDashboard;
