import { db } from "@/lib/db"
import { getWmsUserContext } from "@/lib/wms-auth"
import { redirect } from "next/navigation"

export default async function WMSAnalyticsPage() {
  const { authorized, user } = await getWmsUserContext()
  if (!authorized) redirect("/admin")

  // Simple analytics logic for demo
  const branchFilter = user?.role === "ADMIN" || user?.canViewOtherBranches ? undefined : { id: user?.branchId! }

  const branches = await db.branch.findMany({
    where: branchFilter,
    include: {
      inventory: { include: { product: true } }
    }
  })

  let totalValue = 0
  let lowStockCount = 0
  
  const branchStats = branches.map(b => {
    let value = 0
    let lowStock = 0
    b.inventory.forEach(inv => {
      value += (Number(inv.product.price) * inv.quantity)
      if (inv.quantity < inv.minStockLevel) {
        lowStock++
      }
    })
    totalValue += value
    lowStockCount += lowStock
    return { name: b.name, value, lowStock }
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">WMS Аналитик (Advanced)</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-sm text-slate-500">Нийт үлдэгдлийн өртөг</p>
          <p className="text-2xl font-bold">{totalValue.toLocaleString()} ₮</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <p className="text-sm text-slate-500">Доод хязгаарт хүрсэн (Татах шаардлагатай)</p>
          <p className="text-2xl font-bold text-red-500">{lowStockCount} төрөл</p>
        </div>
      </div>

      <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <h2 className="text-lg font-bold mb-4">Салбаруудын мэдээлэл</h2>
        <div className="space-y-4">
          {branchStats.map((stat, i) => (
            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
              <div>
                <p className="font-semibold">{stat.name}</p>
                <p className="text-sm text-slate-500">Үлдэгдлийн дүн: {stat.value.toLocaleString()} ₮</p>
              </div>
              {stat.lowStock > 0 && (
                <div className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-bold">
                  {stat.lowStock} бараа дуусч байна
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
