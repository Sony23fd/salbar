const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

const metricCalcStr = `  const totalFulfilledRevenue = filteredOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);`;

const newMetricCalcStr = `  const totalFulfilledRevenue = filteredOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const totalMarginProfit = filteredOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + (o.marginProfit || 0), 0);`;

content = content.replace(metricCalcStr, newMetricCalcStr);

const gridStr = `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">`;
const newGridStr = `<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">`;
content = content.replace(gridStr, newGridStr);

const revenueCard = `{/* Fulfilled Revenue */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Хүргэгдсэн борлуулалт</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalFulfilledRevenue.toLocaleString()}₮
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              {deliveredOrdersCount} Хүргэгдсэн
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Агуулахын нөөцөөс автомат хасагдсан</p>
        </div>`;

const profitCard = `        {/* Margin Profit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Цэвэр ашиг (Margin)</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 font-mono">
              {totalMarginProfit.toLocaleString()}₮
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Салбаруудын нэмэгдэл үнээс олсон</p>
        </div>`;

content = content.replace(revenueCard, revenueCard + '\n\n' + profitCard);

fs.writeFileSync('src/components/AdminDashboard.tsx', content, 'utf8');
