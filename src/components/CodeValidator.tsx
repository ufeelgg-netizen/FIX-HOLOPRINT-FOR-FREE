import { useState } from 'react';
import { supabase, Code } from '../lib/supabase';
import { getDeviceId } from '../lib/deviceId';
import { translations, Language } from '../lib/translations';

interface CodeValidatorProps {
  onValidCode: (code: Code) => void;
  language: Language;
}

export default function CodeValidator({ onValidCode, language }: CodeValidatorProps) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  const formatCode = (value: string) => {
    const cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const parts = [];

    for (let i = 0; i < cleaned.length && i < 12; i += 4) {
      parts.push(cleaned.substring(i, i + 4));
    }

    return parts.join('-');
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCode(e.target.value);
    setCode(formatted);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: codeData, error: fetchError } = await supabase
        .from('codes')
        .select('*')
        .eq('code', code)
        .maybeSingle();

      if (fetchError || !codeData) {
        setError(t.invalidCode);
        setLoading(false);
        return;
      }

      if (!codeData.is_active) {
        setError(t.invalidCode);
        setLoading(false);
        return;
      }

      const deviceId = getDeviceId();

      if (codeData.device_id && codeData.device_id !== deviceId) {
        setError(t.codeUsedOnOtherDevice);
        setLoading(false);
        return;
      }

      if (codeData.type === 'limited' && codeData.max_uses !== null) {
        if (codeData.current_uses >= codeData.max_uses) {
          setError(t.noUsesLeft);
          setLoading(false);
          return;
        }
      }

      if (!codeData.device_id) {
        const { error: updateError } = await supabase
          .from('codes')
          .update({ device_id: deviceId, updated_at: new Date().toISOString() })
          .eq('id', codeData.id);

        if (updateError) {
          setError(t.error);
          setLoading(false);
          return;
        }
        codeData.device_id = deviceId;
      }

      onValidCode(codeData);
    } catch (err) {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">{t.enterCode}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="text"
            value={code}
            onChange={handleCodeChange}
            placeholder={t.codePlaceholder}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-center text-xl font-mono tracking-wider"
            maxLength={14}
          />
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || code.length !== 14}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
        >
          {loading ? t.processing : t.submit}
        </button>
      </form>
    </div>
  );
}
