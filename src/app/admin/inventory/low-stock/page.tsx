import { db } from "@/lib/db"
import { getWmsUserContext } from "@/lib/wms-auth"
import { redirect } from "next/navigation"

export default async function LowStockPage() {
  const { authorized, user } = await getWmsUserContext()
  if (!authorized) redirect("/admin")

  const branchFilter = user?.role === "ADMIN" || user?.canViewOtherBranches ? undefined : { id: user?.branchId! }

  const branches = await db.branch.findMany({
    where: branchFilter,
    include: {
      inventory: { 
        where: { minStockLevel: { gt: 0 } },
        include: { product: true } 
      }
    }
  })

  // filter only where quantity < minStockLevel
  const lowStockItems = branches.flatMap(b => 
    b.inventory
      .filter(inv => inv.quantity < inv.minStockLevel)
      .map(inv => ({ branch: b.name, product: inv.product.name, qty: inv.quantity, min: inv.minStockLevel, max: inv.maxStockLevel }))
  )

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Татан авалтын дохио (Low Stock)</h1>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4">Салбар</th>
              <th className="p-4">Бараа</th>
              <th className="p-4 text-right">Үлдэгдэл</th>
              <th className="p-4 text-right">Доод хязгаар</th>
              <th className="p-4 text-right">Татах санал (Max)</th>
            </tr>
          </thead>
          <tbody>
            {lowStockItems.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">Доод хязгаарт хүрсэн бараа алга байна.</td></tr>
            ) : (
              lowStockItems.map((item, i) => (
                <tr key={i} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="p-4">{item.branch}</td>
                  <td className="p-4">{item.product}</td>
                  <td className="p-4 text-right text-red-500 font-bold">{item.qty}</td>
                  <td className="p-4 text-right text-slate-500">{item.min}</td>
                  <td className="p-4 text-right text-green-600 font-bold">{item.max - item.qty}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
