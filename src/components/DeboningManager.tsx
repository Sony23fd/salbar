import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { DeboningLog, User } from '../types/wms';
import { Scissors, Plus, Scale, TrendingDown, CheckCircle2 } from 'lucide-react';

interface DeboningManagerProps {
  currentUser: User;
}

export const DeboningManager: React.FC<DeboningManagerProps> = ({ currentUser }) => {
  const [logs, setLogs] = useState<DeboningLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [animalType, setAnimalType] = useState('Адууны мах');
  const [grossWeight, setGrossWeight] = useState<number | ''>(150);
  const [boneWasteWeight, setBoneWasteWeight] = useState<number | ''>(33);
  const [notes, setNotes] = useState('');

  const netMeatWeight = (Number(grossWeight) || 0) - (Number(boneWasteWeight) || 0);
  const yieldPercentage = Number(grossWeight) > 0 ? (netMeatWeight / Number(grossWeight)) * 100 : 0;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getDeboningLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load deboning logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grossWeight || Number(grossWeight) <= 0) {
      alert('Бохир жинг зөв оруулна уу.');
      return;
    }

    try {
      await api.saveDeboningLog({
        animalType,
        grossWeight: Number(grossWeight),
        boneWasteWeight: Number(boneWasteWeight) || 0,
        netMeatWeight,
        yieldPercentage,
        notes
      });
      alert('Шулааны боловсруулалт амжилттай бүртгэгдлээ.');
      setShowModal(false);
      setGrossWeight(150);
      setBoneWasteWeight(33);
      setNotes('');
      loadLogs();
    } catch (err: any) {
      alert(err.message || 'Алдаа гарлаа');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Scissors className="w-6 h-6 text-purple-600" />
            Анхан шатны Шулаа & Боловсруулалт (Deboning Yield & Waste)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Малын гулууз, бохир малын шулааны жин, ясны хаягдал болон цэвэр цул махны гарцын (%) бүртгэл
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" /> Шинэ Шулааны Бүрэн Бүртгэл
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Нийт Шулаанд Орсон Бохир Жин</div>
            <div className="text-xl font-black text-slate-900 font-mono">
              {logs.reduce((sum, l) => sum + l.grossWeight, 0).toLocaleString()} кг
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Гарган Авсан Цэвэр Мах</div>
            <div className="text-xl font-black text-emerald-700 font-mono">
              {logs.reduce((sum, l) => sum + l.netMeatWeight, 0).toLocaleString()} кг
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase">Нийт Яс & Хаягдал Хорогдол</div>
            <div className="text-xl font-black text-red-600 font-mono">
              {logs.reduce((sum, l) => sum + l.boneWasteWeight, 0).toLocaleString()} кг
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Шулааны Гүйцэтгэлийн Түүхэн Журнал</h3>
          <span className="text-xs text-slate-500">Нийт: <strong>{logs.length}</strong></span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Ачааллаж байна...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">Шулааны бүртгэл байхгүй байна.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase">Огноо</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase">Малын Төрөл</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Бохир Жин (кг)</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Яс / Хаягдал (кг)</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Цэвэр Мах (кг)</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Шулааны Гарц (%)</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase">Тэмдэглэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">
                      {new Date(log.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{log.animalType}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{log.grossWeight} кг</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-red-600">{log.boneWasteWeight} кг</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{log.netMeatWeight} кг</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        log.yieldPercentage >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.yieldPercentage.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scissors className="w-5 h-5 text-purple-600" /> Шинэ Шулаа & Боловсруулалт Бүртгэх
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Малын Төрөл / Махны төрөл *</label>
                <select
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                >
                  <option value="Адууны мах">Адууны мах</option>
                  <option value="Хонины мах">Хонины мах</option>
                  <option value="Үхрийн мах">Үхрийн мах</option>
                  <option value="Ямааны мах">Ямааны мах</option>
                  <option value="Умс / Гэдэс">Умс / Гэдэс</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Бохир Жин (кг) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(parseFloat(e.target.value) || '')}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Яс / Хаягдал Жин (кг)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={boneWasteWeight}
                    onChange={(e) => setBoneWasteWeight(parseFloat(e.target.value) || '')}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-red-600"
                  />
                </div>
              </div>

              {/* Calculated Yield Summary Box */}
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-slate-700">
                  <span>Цэвэр гарах цул мах:</span>
                  <strong className="font-mono text-emerald-700">{netMeatWeight.toFixed(1)} кг</strong>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span>Шулааны гарц (%):</span>
                  <strong className="font-mono text-purple-800">{yieldPercentage.toFixed(1)}%</strong>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Тэмдэглэл</label>
                <input
                  type="text"
                  placeholder="Жишээ нь: Бойны ажилтан Цоомоо шулав"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Шулаа Бүртгэх
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
