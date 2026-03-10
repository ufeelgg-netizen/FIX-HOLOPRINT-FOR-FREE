import { useState } from 'react';
import { Upload } from 'lucide-react';
import { processFile } from '../lib/fileProcessor';
import { supabase, Code } from '../lib/supabase';
import { translations, Language } from '../lib/translations';

interface FileUploaderProps {
  codeData: Code;
  language: Language;
}

export default function FileUploader({ codeData, language }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const t = translations[language];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    if (fileName.endsWith('.mcpack') || fileName.endsWith('.zip')) {
      setFile(selectedFile);
      setError('');
      setSuccess(false);
    } else {
      setError('Please select a .mcpack or .zip file');
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setError('');

    try {
      await processFile(file);

      const newUses = codeData.current_uses + 1;
      await supabase
        .from('codes')
        .update({ current_uses: newUses, updated_at: new Date().toISOString() })
        .eq('id', codeData.id);

      setSuccess(true);
      setFile(null);
    } catch (err) {
      setError(t.error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t.uploadFile}</h2>

      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">{t.dragDrop}</p>
        <p className="text-gray-500 mb-4">{t.or}</p>
        <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg cursor-pointer transition duration-200">
          {t.browse}
          <input
            type="file"
            className="hidden"
            accept=".mcpack,.zip"
            onChange={handleFileInput}
          />
        </label>
      </div>

      {file && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-4">
            <span className="font-semibold">Selected:</span> {file.name}
          </p>
          <button
            onClick={handleProcess}
            disabled={processing}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {processing ? t.processing : t.download}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {t.fileProcessed}
        </div>
      )}

      {codeData.type === 'limited' && codeData.max_uses && (
        <div className="mt-6 text-center text-sm text-gray-600">
          {t.uses}: {codeData.current_uses} / {codeData.max_uses}
        </div>
      )}
    </div>
  );
}
