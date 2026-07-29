import React, { useState } from 'react';
import { Order, User, Product } from '../types/wms';
import { confirmDelivery } from '../actions/delivery';
import { OrderHistoryTimeline } from './OrderHistoryTimeline';
import { X, Truck, ShieldAlert, CheckCircle2, AlertTriangle, MapPin, PackageCheck, FileText } from 'lucide-react';

interface DeliveryModalProps {
  order: Order;
  currentUser: User;
  drivers: User[];
  allProducts: Product[];
  onClose: () => void;
  onSuccess: () => void;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  order,
  currentUser,
  drivers,
  allProducts,
  onClose,
  onSuccess,
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    currentUser.role === 'DELIVERY_DRIVER' ? currentUser.id : drivers[0]?.id || currentUser.id
  );
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'confirm' | 'audit'>('confirm');

  // Pre-check stock sufficiency for UI feedback
  const stockCheckResults = order.items.map((item) => {
    const prod = allProducts.find((p) => p.id === item.productId);
    const availableStock = prod ? prod.stockQuantity : 0;
    const isSufficient = availableStock >= item.quantity;

    return {
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      orderedQty: item.quantity,
      availableStock,
      isSufficient,
    };
  });

  const hasStockDeficit = stockCheckResults.some((res) => !res.isSufficient);

  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const response = await confirmDelivery(
        {
          orderId: order.id,
          driverId: selectedDriverId,
          deliveryNotes: deliveryNotes || `${order.branchName} салбарт хүргэгдсэн`,
        },
        currentUser.role
      );

      if (!response.success) {
        setErrorMsg(response.message);
      } else {
        setSuccessMsg(response.message);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Хүргэлт баталгаажуулахад алдаа гарлаа.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Захиалгын хүргэлт & Үлдэгдэл хасалт</h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  {order.orderNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">Салбар: {order.branchName}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 pt-2">
          <button
            onClick={() => setActiveTab('confirm')}
            className={`pb-3 text-xs font-bold border-b-2 px-4 transition-colors flex items-center gap-1.5 ${
              activeTab === 'confirm'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            Хүргэлт баталгаажуулах & Агуулахын шалгалт
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 text-xs font-bold border-b-2 px-4 transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Аудит түүх ({order.history.length})
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Success Banner */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium space-y-1">
              <div className="flex items-center gap-2 font-bold text-red-700">
                <ShieldAlert className="w-5 h-5 shrink-0 text-red-600" />
                <span>Атомик гүйлгээ амжилтгүй боллоо / Цуцлагдлаа</span>
              </div>
              <pre className="whitespace-pre-wrap text-[11px] font-mono text-red-800 bg-white p-2.5 rounded-lg border border-red-200">
                {errorMsg}
              </pre>
            </div>
          )}

          {activeTab === 'confirm' ? (
            <div className="space-y-6">
              {/* Order Overview Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-medium text-slate-500">Хүлээн авах салбар</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">{order.branchName}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {order.branchLocation}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-medium text-slate-500">Захиалгын нийт дүн</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5 font-mono">
                    {order.totalAmount.toLocaleString()} ₮
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Үүсгэсэн: <strong className="text-slate-800">{order.createdByName}</strong>
                  </div>
                </div>
              </div>

              {/* Items & Pre-check Stock Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 mb-2.5 uppercase tracking-wider flex items-center justify-between">
                  <span>Захиалсан бараа болон агуулахын үлдэгдлийн шалгалт</span>
                  {hasStockDeficit && (
                    <span className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Үлдэгдэл хүрэлцэхгүй сануулга
                    </span>
                  )}
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px]">
                      <tr>
                        <th className="p-3">SKU & Барааны нэр</th>
                        <th className="p-3 text-right">Захиалсан</th>
                        <th className="p-3 text-right">Боломжит үлдэгдэл</th>
                        <th className="p-3 text-center">Төлөв</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {stockCheckResults.map((res) => (
                        <tr key={res.productId} className="hover:bg-slate-50">
                          <td className="p-3 font-medium text-slate-900">
                            <div>{res.productName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{res.sku}</div>
                          </td>
                          <td className="p-3 text-right font-bold text-blue-700">{res.orderedQty}</td>
                          <td className="p-3 text-right font-bold font-mono">
                            <span className={res.isSufficient ? 'text-emerald-700' : 'text-red-600'}>
                              {res.availableStock}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {res.isSufficient ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Бэлэн
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
                                <AlertTriangle className="w-3 h-3 text-red-600" /> Хүрэлцэхгүй
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Delivery Confirmation Form */}
              {order.status === 'DELIVERED' ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <div className="text-sm font-bold text-emerald-800 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Захиалга хүргэгдсэн байна
                  </div>
                  <p className="text-xs text-slate-600">
                    Хүргэсэн огноо: {new Date(order.deliveredAt!).toLocaleString('mn-MN')},{' '}
                    <strong>{order.deliveredByName}</strong> хүргэсэн.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleConfirmDelivery} className="space-y-4 pt-2 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Хариуцсан жолооч
                      </label>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setSelectedDriverId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 font-medium"
                        required
                      >
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.role === 'DELIVERY_DRIVER' ? 'Жолооч' : d.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Хүргэлтийн тэмдэглэл & Баталгаажуулалт
                      </label>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="д.г. Салбарын менежер хүлээн авсан"
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Атомик гүйлгээний дүрэм:</strong> Хүргэлтийг баталгаажуулснаар мэдээллийн санд гүйлгээ хийгдэж (`db.$transaction`), барааны үлдэгдэл шууд хасагдана. Агуулахын үлдэгдэл хүрэлцэхгүй бол гүйлгээ цуцлагдана.
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                    >
                      Цуцлах
                    </button>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <span>Гүйлгээ боловсруулж байна...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Хүргэлт баталгаажуулж, үлдэгдэл хасах
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <OrderHistoryTimeline historyLogs={order.history} currentStatus={order.status} />
          )}
        </div>
      </div>
    </div>
  );
};

