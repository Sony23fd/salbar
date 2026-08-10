import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { LivestockLedger, User } from '../types/wms';
import { ShieldAlert, Plus, Calendar, Home, ArrowDownLeft, ArrowUpRight, Skull, ShoppingBag, RotateCcw } from 'lucide-react';

interface LivestockManagerProps {
  currentUser: User;
}

export const LivestockManager: React.FC<LivestockManagerProps> = ({ currentUser }) => {
  const [ledgers, setLedgers] = useState<LivestockLedger[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [receivedCount, setReceivedCount] = useState<number | ''>(0);
  const [slaughteredCount, setSlaughteredCount] = useState<number | ''>(0);
  const [staffFoodCount, setStaffFoodCount] = useState<number | ''>(0);
  const [deadCount, setDeadCount] = useState<number | ''>(0);
  const [soldCount, setSoldCount] = useState<number | ''>(0);
  const [returnedCount, setReturnedCount] = useState<number | ''>(0);
  const [notes, setNotes] = useState('');

  const previousBalance = ledgers.length > 0 ? ledgers[0].endingCount : 0;
  const calculatedEnding = previousBalance
    + (Number(receivedCount) || 0)
    - (Number(slaughteredCount) || 0)
    - (Number(staffFoodCount) || 0)
    - (Number(deadCount) || 0)
    - (Number(soldCount) || 0)
    - (Number(returnedCount) || 0);

  const loadLedgers = async () => {
    setLoading(true);
    try {
      const data = await api.getLivestockLedgers();
      setLedgers(data);
    } catch (err) {
      console.error('Failed to load livestock ledgers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedgers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveLivestockLedger({
        receivedCount: Number(receivedCount) || 0,
        slaughteredCount: Number(slaughteredCount) || 0,
        staffFoodCount: Number(staffFoodCount) || 0,
        deadCount: Number(deadCount) || 0,
        soldCount: Number(soldCount) || 0,
        returnedCount: Number(returnedCount) || 0,
        endingCount: calculatedEnding,
        notes
      });
      toast.success('Малын гүйлгээний тооцоо амжилттай бүртгэгдлээ.');
      setShowModal(false);
      setReceivedCount(0);
      setSlaughteredCount(0);
      setStaffFoodCount(0);
      setDeadCount(0);
      setSoldCount(0);
      setReturnedCount(0);
      setNotes('');
      loadLedgers();
    } catch (err: any) {
      toast.error(err.message || 'Алдаа гарлаа');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Home className="w-6 h-6 text-amber-600" />
            Малын Бүртгэл & Бойн Тооцоо (Livestock Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ферм/Нисхээс ирсэн мал, Хорхог/Бойд төхөөрсөн, Ажилчдын хоолонд олгосон, Зарагдсан ба Үхсэн малын баланс
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" /> Малын Гүйлгээ Бүртгэх
        </button>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Одоогийн Малын Үлдэгдэл</div>
          <div className="text-2xl font-black text-amber-600 font-mono mt-1">
            {previousBalance} толгой
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Нийт Нисхээс Хүлээн Авсан</div>
          <div className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {ledgers.reduce((s, l) => s + l.receivedCount, 0)} толгой
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Нийт Бойд Төхөөрсөн / Хорхог</div>
          <div className="text-2xl font-black text-blue-600 font-mono mt-1">
            {ledgers.reduce((s, l) => s + l.slaughteredCount, 0)} толгой
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Ажилчдад & Бусад зарцуулагдсан</div>
          <div className="text-2xl font-black text-purple-600 font-mono mt-1">
            {ledgers.reduce((s, l) => s + l.staffFoodCount + l.soldCount + l.deadCount, 0)} толгой
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">Малын Тооцооны Түүхэн Баланс</h3>
          <span className="text-xs text-slate-500">Нийт: <strong>{ledgers.length}</strong></span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Ачааллаж байна...</div>
        ) : ledgers.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">Малын бүртгэл одоогоор байхгүй байна.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase">Огноо</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right text-emerald-700">Ирсэн (Нисэх)</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right text-blue-700">Хорхог / Төхөөрсөн</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Ажилчид</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right text-red-600">Үхсэн</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Зарсан</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right">Буцаасан</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase text-right font-mono">Эцсийн Үлдэгдэл</th>
                  <th className="px-4 py-3 font-bold text-[11px] uppercase">Тэмдэглэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgers.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs font-mono text-slate-600">{new Date(l.date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">+{l.receivedCount}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">-{l.slaughteredCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">-{l.staffFoodCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">-{l.deadCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">-{l.soldCount}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700">-{l.returnedCount}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{l.endingCount} ш</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{l.notes || '-'}</td>
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
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-amber-600" /> Малын Тооцооны Гүйлгээ Бүртгэх
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-emerald-800 mb-1">Нисхээс Ирсэн Мал (+)</label>
                  <input
                    type="number"
                    min="0"
                    value={receivedCount}
                    onChange={(e) => setReceivedCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-blue-800 mb-1">Хорхог / Бойд Төхөөрсөн (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={slaughteredCount}
                    onChange={(e) => setSlaughteredCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold text-blue-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ажилчдад Олгосон (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={staffFoodCount}
                    onChange={(e) => setStaffFoodCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-red-700 mb-1">Үхсэн Мал (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={deadCount}
                    onChange={(e) => setDeadCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-red-600 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Амьдаар нь Зарсан (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={soldCount}
                    onChange={(e) => setSoldCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Нисэх рүү Буцаасан (-)</label>
                  <input
                    type="number"
                    min="0"
                    value={returnedCount}
                    onChange={(e) => setReturnedCount(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono"
                  />
                </div>
              </div>

              {/* Real-time Calculation Box */}
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between font-bold">
                <span className="text-slate-700">Эцсийн Бодогдсон Малын Үлдэгдэл:</span>
                <span className="text-base font-mono text-amber-800">{calculatedEnding} толгой</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Тэмдэглэл</label>
                <input
                  type="text"
                  placeholder="Жишээ нь: Дэлгэр 3ш авав, 15ш зарагдсан"
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white"
                >
                  Тооцоо Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
