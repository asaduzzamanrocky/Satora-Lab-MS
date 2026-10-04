import React, { useState } from 'react';
import { api } from '../../services/api';
import { X, FileSpreadsheet, Download, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

interface SheetsMigrationModalProps {
  isOpen: boolean;
  onImportComplete: () => void;
  onClose: () => void;
}

export const SheetsMigrationModal: React.FC<SheetsMigrationModalProps> = ({
  isOpen,
  onImportComplete,
  onClose,
}) => {
  const [targetType, setTargetType] = useState<'projects' | 'transactions' | 'employees' | 'clients' | 'tasks'>('projects');
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ success: boolean; text: string } | null>(null);

  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    window.location.href = `/api/migrate/template/${targetType}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvContent.trim()) {
      setResultMessage({ success: false, text: 'Please provide CSV data to import.' });
      return;
    }

    setImporting(true);
    setResultMessage(null);
    try {
      const res = await api.importSheetCSV(targetType, csvContent);
      setResultMessage({
        success: true,
        text: `Successfully imported ${res.importedCount} records into ${targetType}!`,
      });
      onImportComplete();
    } catch (err: any) {
      setResultMessage({
        success: false,
        text: err.message || 'Import failed. Check column headers.',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 my-8 text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Google Sheets Data Migration</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-2 text-slate-500 leading-relaxed">
          Import your existing Google Sheets tracking spreadsheets into Satora Lab. All records are validated and saved to persistent database.
        </p>

        {resultMessage && (
          <div
            className={`mt-3 p-3 rounded-xl flex items-center gap-2 font-semibold ${
              resultMessage.success
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {resultMessage.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
            <span>{resultMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleExecuteImport} className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Target Entity to Import</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold focus:outline-hidden"
              >
                <option value="projects">Projects Sheet</option>
                <option value="transactions">Transactions & Finances Sheet</option>
                <option value="employees">Employees & Staff Sheet</option>
                <option value="clients">Clients / CRM Sheet</option>
                <option value="tasks">Tasks & Timeline Sheet</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 text-xs text-blue-600 font-bold bg-white border border-slate-200 hover:bg-slate-100 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample CSV</span>
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">Paste CSV Text or Upload .CSV File</label>
              <label className="text-blue-600 font-semibold hover:underline cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload File</span>
                <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Header1,Header2,Header3&#10;Value1,Value2,Value3"
              className="w-full rounded-xl border border-slate-200 p-3 font-mono text-[11px] focus:outline-hidden focus:border-blue-600"
            />
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-slate-600 text-[11px] space-y-1">
            <span className="font-bold text-blue-900 block">Google Sheets Migration Hint:</span>
            <p>
              In your existing Google Sheet, navigate to <strong>File → Download → Comma Separated Values (.csv)</strong> and either upload the file or paste its content above.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={importing}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {importing ? 'Importing Data...' : 'Start Migration Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
