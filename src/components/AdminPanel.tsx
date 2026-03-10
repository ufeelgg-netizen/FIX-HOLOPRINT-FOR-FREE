import { useState, useEffect } from 'react';
import { supabase, Code } from '../lib/supabase';
import { translations, Language } from '../lib/translations';
import { Trash2, RotateCcw, Lock, Unlock, Plus } from 'lucide-react';

interface AdminPanelProps {
  language: Language;
  onLogout: () => void;
}

export default function AdminPanel({ language, onLogout }: AdminPanelProps) {
  const [codes, setCodes] = useState<Code[]>([]);
  const [newCodeType, setNewCodeType] = useState<'unlimited' | 'limited'>('unlimited');
  const [maxUses, setMaxUses] = useState(5);
  const [loading, setLoading] = useState(false);

  const t = translations[language];

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    const { data } = await supabase
      .from('codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setCodes(data);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const segments = [];

    for (let i = 0; i < 3; i++) {
      let segment = '';
      for (let j = 0; j < 4; j++) {
        segment += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      segments.push(segment);
    }

    return segments.join('-');
  };

  const handleCreateCode = async () => {
    setLoading(true);
    const newCode = generateCode();

    const { error } = await supabase.from('codes').insert({
      code: newCode,
      type: newCodeType,
      max_uses: newCodeType === 'limited' ? maxUses : null,
      current_uses: 0,
      is_active: true,
    });

    if (!error) {
      loadCodes();
    }
    setLoading(false);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    await supabase
      .from('codes')
      .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    loadCodes();
  };

  const handleResetUses = async (id: string) => {
    await supabase
      .from('codes')
      .update({ current_uses: 0, device_id: null, updated_at: new Date().toISOString() })
      .eq('id', id);
    loadCodes();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this code?')) {
      await supabase.from('codes').delete().eq('id', id);
      loadCodes();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">{t.adminPanel}</h1>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition duration-200"
            >
              {t.logout}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.createCode}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.codeType}
                </label>
                <select
                  value={newCodeType}
                  onChange={(e) => setNewCodeType(e.target.value as 'unlimited' | 'limited')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="unlimited">{t.unlimited}</option>
                  <option value="limited">{t.limited}</option>
                </select>
              </div>

              {newCodeType === 'limited' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t.maxUses}
                  </label>
                  <input
                    type="number"
                    value={maxUses}
                    onChange={(e) => setMaxUses(parseInt(e.target.value))}
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="flex items-end">
                <button
                  onClick={handleCreateCode}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  <Plus size={20} />
                  {t.create}
                </button>
              </div>
            </div>
          </div>

          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t.allCodes}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {t.code}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {t.type}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {t.uses}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {t.device}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {t.status}
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    {t.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {codes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{code.code}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          code.type === 'unlimited'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {code.type === 'unlimited' ? t.unlimited : t.limited}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {code.current_uses}
                      {code.type === 'limited' && code.max_uses && ` / ${code.max_uses}`}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-xs">
                      {code.device_id ? code.device_id.substring(0, 15) + '...' : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          code.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {code.is_active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(code.id, code.is_active)}
                          className="text-blue-600 hover:text-blue-800"
                          title={code.is_active ? t.deactivate : t.activate}
                        >
                          {code.is_active ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>
                        <button
                          onClick={() => handleResetUses(code.id)}
                          className="text-green-600 hover:text-green-800"
                          title={t.reset}
                        >
                          <RotateCcw size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="text-red-600 hover:text-red-800"
                          title={t.delete}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
