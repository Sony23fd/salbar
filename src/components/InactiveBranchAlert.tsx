import React from 'react';
import { InactiveBranchAlert as InactiveBranchType } from '../types/wms';
import { AlertTriangle, Clock, ShoppingCart, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';

interface InactiveBranchAlertProps {
  alerts: InactiveBranchType[];
  onQuickOrder: (branchId: string) => void;
  onSimulateActivity: (branchId: string) => void;
  userRole: string;
}

export const InactiveBranchAlertComponent: React.FC<InactiveBranchAlertProps> = ({
  alerts,
  onQuickOrder,
  onSimulateActivity,
  userRole,
}) => {
  if (alerts.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-4 shadow-xs">
        <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-600 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-2">
            Бүх салбар идэвхтэй байна
          </h3>
          <p className="text-xs text-emerald-700 mt-0.5">
            Сүүлийн 7 хоногт идэвхгүй болсон салбар байхгүй. Бүх салбарууд захиалга хийсэн эсвэл хүргэлт авсан байна.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 mb-6 shadow-xs transition-all">
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-amber-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0 shadow-sm animate-pulse">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-amber-950">
                АНХААРУУЛГА: 7 хоног идэвхгүй салбар илэрлээ
              </h3>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-500 text-white">
                {alerts.length} Салбар
              </span>
            </div>
            <p className="text-xs text-amber-800 mt-0.5">
              Дараах салбарууд сүүлийн 7 хоног болон түүнээс дээш хугацаанд ямар ч захиалга хийгээгүй байна.
            </p>
          </div>
        </div>

        {userRole !== 'ADMIN' && (
          <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 self-start sm:self-auto">
            Админ харах
          </span>
        )}
      </div>

      {/* List of Inactive Branches */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {alerts.map((branch) => {
          const lastDateFormatted = new Date(branch.lastActivityAt).toLocaleDateString('mn-MN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          });

          return (
            <div
              key={branch.branchId}
              className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-4 transition-all flex flex-col justify-between space-y-3 shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    {branch.branchName}
                  </h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-red-100 text-red-700 border border-red-200">
                    <Clock className="w-3 h-3" />
                    {branch.daysInactive} хоног идэвхгүй
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{branch.location}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Менежер: <strong className="text-slate-800">{branch.contactPerson}</strong></span>
                    <span>Сүүлийн идэвх: <strong className="text-amber-700">{lastDateFormatted}</strong></span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <a href={`mailto:${branch.email}`} className="hover:text-blue-600 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> Э-мэйл
                  </a>
                  <span>•</span>
                  <a href={`tel:${branch.phone}`} className="hover:text-blue-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Утас
                  </a>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSimulateActivity(branch.branchId)}
                    title="Анхааруулгыг арилгах"
                    className="px-2 py-1 text-[11px] font-bold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                  >
                    Арилгах
                  </button>

                  <button
                    onClick={() => onQuickOrder(branch.branchId)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-xs"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Захиалга хийх
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

