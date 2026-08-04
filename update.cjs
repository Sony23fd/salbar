const fs = require('fs');

let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf8');

// 1. Replace the top imports
content = content.replace(
  "import React from 'react';",
  "import React, { useState, useMemo } from 'react';"
);

// 2. Add state and logic inside AdminDashboard
const logicStart = `  // Metrics
  const totalOrdersCount = orders.length;`;

const newLogic = `  // Date Range State
  const [dateRange, setDateRange] = useState<'30days' | 'thisMonth' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Derived Dates
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    let start = new Date(0); // All time
    if (dateRange === '30days') {
      start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'thisMonth') {
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    } else if (dateRange === 'custom') {
      start = new Date(customStartDate);
      start.setHours(0, 0, 0, 0);
      
      const customEnd = new Date(customEndDate);
      customEnd.setHours(23, 59, 59, 999);
      return { startDate: start, endDate: customEnd };
    }
    
    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const d = new Date(o.createdAt).getTime();
      return d >= startDate.getTime() && d <= endDate.getTime();
    });
  }, [orders, startDate, endDate]);

  // Metrics
  const totalOrdersCount = filteredOrders.length;
  const pendingOrdersCount = filteredOrders.filter((o) => o.status === 'PENDING' || o.status === 'PACKED' || o.status === 'IN_TRANSIT').length;
  const deliveredOrdersCount = filteredOrders.filter((o) => o.status === 'DELIVERED').length;

  const totalFulfilledRevenue = filteredOrders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);`;

content = content.replace(
  `  // Metrics
  const totalOrdersCount = orders.length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING' || o.status === 'PACKED' || o.status === 'IN_TRANSIT').length;
  const deliveredOrdersCount = orders.filter((o) => o.status === 'DELIVERED').length;

  const totalFulfilledRevenue = orders
    .filter((o) => o.status === 'DELIVERED')
    .reduce((sum, o) => sum + o.totalAmount, 0);`,
  newLogic
);

// 3. Chart data logic
const oldChartData = `  // 7-Day Order Volume Chart Data
  const last7DaysData = React.useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const year = d.getFullYear();
      const month = d.getMonth();
      const date = d.getDate();

      const dayOrders = orders.filter((o) => {
        const oDate = new Date(o.createdAt);
        return (
          oDate.getFullYear() === year &&
          oDate.getMonth() === month &&
          oDate.getDate() === date
        );
      });

      const shortMonth = d.getMonth() + 1;
      const shortDay = d.getDate();
      const shortDate = \`\${shortMonth}/\${shortDay}\`;

      const totalCount = dayOrders.length;
      const deliveredCount = dayOrders.filter((o) => o.status === 'DELIVERED').length;
      const totalAmount = dayOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      days.push({
        shortDate,
        'Нийт захиалга': totalCount,
        'Хүргэгдсэн': deliveredCount,
        'Нийт дүн (₮)': Math.round(totalAmount),
      });
    }
    return days;
  }, [orders]);

  const last7DaysTotalOrders = last7DaysData.reduce((sum, d) => sum + d['Нийт захиалга'], 0);
  const last7DaysTotalRevenue = last7DaysData.reduce((sum, d) => sum + d['Нийт дүн (₮)'], 0);

  const recentOrders = [...orders].sort(`;

const newChartData = `  // Dynamic Chart Data
  const chartData = React.useMemo(() => {
    // Determine if we should group by month (> 60 days) or day
    const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const isMonthly = diffDays > 60 || startDate.getTime() === 0;

    const dataMap = new Map<string, { label: string, total: number, delivered: number, revenue: number, sortKey: string }>();

    filteredOrders.forEach(o => {
      const d = new Date(o.createdAt);
      let key = '';
      let label = '';
      let sortKey = '';

      if (isMonthly) {
        key = \`\${d.getFullYear()}-\${d.getMonth() + 1}\`;
        label = \`\${d.getFullYear()}-\${(d.getMonth() + 1).toString().padStart(2, '0')}\`;
        sortKey = label;
      } else {
        key = \`\${d.getFullYear()}-\${d.getMonth() + 1}-\${d.getDate()}\`;
        label = \`\${(d.getMonth() + 1).toString().padStart(2, '0')}/\${d.getDate().toString().padStart(2, '0')}\`;
        sortKey = \`\${d.getFullYear()}-\${(d.getMonth() + 1).toString().padStart(2, '0')}-\${d.getDate().toString().padStart(2, '0')}\`;
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, { label, total: 0, delivered: 0, revenue: 0, sortKey });
      }
      const entry = dataMap.get(key)!;
      entry.total += 1;
      if (o.status === 'DELIVERED') {
        entry.delivered += 1;
        entry.revenue += o.totalAmount;
      }
    });

    const result = Array.from(dataMap.values()).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return result.map(r => ({
      shortDate: r.label,
      'Нийт захиалга': r.total,
      'Хүргэгдсэн': r.delivered,
      'Нийт дүн (₮)': Math.round(r.revenue),
    }));
  }, [filteredOrders, startDate, endDate]);

  const chartTotalOrders = chartData.reduce((sum, d) => sum + d['Нийт захиалга'], 0);
  const chartTotalRevenue = chartData.reduce((sum, d) => sum + d['Нийт дүн (₮)'], 0);

  const recentOrders = [...filteredOrders].sort(`;

content = content.replace(oldChartData, newChartData);

// 4. Update the chart render and text
content = content.replace(/Сүүлийн 7 хоногийн захиалгын хэмжээ/g, 'Захиалгын график харьцуулалт');
content = content.replace(/Сүүлийн 7 хоногт:/g, 'Нийт шүүгдсэн:');
content = content.replace(/last7DaysTotalOrders/g, 'chartTotalOrders');
content = content.replace(/last7DaysTotalRevenue/g, 'chartTotalRevenue');
content = content.replace(/data=\{last7DaysData\}/g, 'data={chartData}');
content = content.replace(/Салбаруудаас өдөр тутам ирсэн ба хүргэгдсэн захиалгын тооны харьцуулалт/g, 'Сонгосон хугацаан дахь өдөр/сарын захиалгын харьцуулалт');

// 5. Inject the Date Picker UI
const datePickerUI = `      {/* Date Range Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Хугацаагаар шүүх</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-sm font-semibold rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-colors hover:bg-slate-100"
          >
            <option value="30days">Сүүлийн 30 хоног</option>
            <option value="thisMonth">Энэ сар</option>
            <option value="all">Бүх хугацаа (All time)</option>
            <option value="custom">Дурын хугацаа сонгох</option>
          </select>

          {dateRange === 'custom' && (
            <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
              <input 
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <span className="text-slate-400 font-bold">-</span>
              <input 
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}`;

content = content.replace('{/* KPI Cards Grid */}', datePickerUI);

// Fix recentOrders from 'orders.length' to 'filteredOrders.length' in the "All view" button
content = content.replace(/Бүгдийг харах \(\{orders.length\}\)/g, 'Бүгдийг харах ({filteredOrders.length})');

fs.writeFileSync('src/components/AdminDashboard.tsx', content, 'utf8');
