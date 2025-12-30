import { useState } from 'react';
import FileUploader from './components/FileUploader';
import AnalysisDashboard from './components/AnalysisDashboard';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUploadSuccess = (data) => {
    setResults(data);
    setLoading(false);
  };

  const handleReset = () => {
    setResults(null);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
            <span className="text-2xl">🌾</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Adatkinyerő</h1>
            <p className="text-xs text-slate-400">v7.5 Final</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem icon={<LayoutDashboard size={20} />} label="Vezérlőpult" active={!results} onClick={handleReset} />
          {results && (
            <div className="mt-8">
              <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Eredmények</p>
              <div className="space-y-1">
                {Object.values(results).map((res, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
                    <FileText size={16} className="text-brand-500" />
                    <span className="truncate">{res.filename}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button className="flex items-center gap-3 text-sm text-slate-400 hover:text-white transition-colors w-full px-4 py-2 rounded-lg hover:bg-slate-800">
            <Settings size={18} />
            <span>Beállítások</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10 flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-800">
            {results ? "Elemzés Eredménye" : "Új Elemzés Indítása"}
          </h2>
          {results && (
            <button onClick={handleReset} className="text-sm text-slate-500 hover:text-red-600 font-medium transition-colors">
              🗑️ Új feltöltés
            </button>
          )}
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 p-8 scroll-smooth">
          {!results ? (
            <div className="max-w-4xl mx-auto h-full flex flex-col justify-center pb-20 fade-in-up">
              <div className="text-center mb-10">
                <h3 className="text-3xl font-bold text-slate-800 mb-4">Üdvözöljük az Adatkinyerőben!</h3>
                <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                  Húzza be az Egységes Kérelem PDF fájlokat a gyors és pontos elemzéshez.
                  A rendszer automatikusan felismeri a fővetés, másodvetés és agrotechnikai adatokat.
                </p>
              </div>
              <FileUploader onUploadSuccess={handleUploadSuccess} setLoading={setLoading} isLoading={loading} />
            </div>
          ) : (
            <div className="max-w-7xl mx-auto space-y-8 fade-in">
              <AnalysisDashboard results={results} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

const NavItem = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${active
      ? "bg-brand-600 text-white shadow-lg shadow-brand-500/30"
      : "text-slate-400 hover:bg-slate-800 hover:text-white"
    }`}>
    {icon}
    {label}
  </button>
);

export default App;
