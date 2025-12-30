import { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle } from 'lucide-react';
import { uploadFiles } from '../services/api';

const FileUploader = ({ onUploadSuccess, setLoading, isLoading }) => {
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState(null);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = async (files) => {
        setLoading(true);
        setError(null);
        try {
            const data = await uploadFiles(files);
            onUploadSuccess(data);
        } catch (err) {
            console.error(err);
            setError("Hiba történt a feltöltés során. Ellenőrizze a fájlokat és próbálja újra.");
            setLoading(false);
        }
    };

    const onButtonClick = () => {
        inputRef.current.click();
    };

    return (
        <div className="w-full">
            <form id="form-file-upload" onDragEnter={handleDrag} onSubmit={(e) => e.preventDefault()}>
                <input ref={inputRef} type="file" id="input-file-upload" multiple={true} onChange={handleChange} className="hidden" accept=".pdf" />

                <div
                    className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl transition-all duration-300 ease-in-out cursor-pointer group
                        ${dragActive ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50"}
                        ${isLoading ? "opacity-50 pointer-events-none" : ""}
                    `}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={onButtonClick}
                >
                    {isLoading ? (
                        <div className="flex flex-col items-center animate-pulse">
                            <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-lg font-medium text-slate-600">Elemzés folyamatban...</p>
                            <p className="text-sm text-slate-400">Kérjük várjon, ez eltarthat pár másodpercig.</p>
                        </div>
                    ) : (
                        <>
                            <div className={`p-4 rounded-full bg-slate-100 text-slate-400 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:bg-brand-100 group-hover:text-brand-600`}>
                                <UploadCloud size={40} />
                            </div>
                            <p className="text-xl font-semibold text-slate-700 mb-2">Húzza ide a fájlokat</p>
                            <p className="text-sm text-slate-500 mb-6">vagy kattinson a tallózáshoz</p>
                            <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                                <File size={12} />
                                PDF formátum támogatott
                            </div>
                        </>
                    )}

                    {dragActive && <div className="absolute inset-0 w-full h-full rounded-2xl bg-brand-500/10 backdrop-blur-sm pointer-events-none" />}
                </div>
            </form>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-700 animate-in slide-in-from-top-2">
                    <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Hiba történt!</p>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploader;
