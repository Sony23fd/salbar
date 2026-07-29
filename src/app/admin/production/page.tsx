"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProductionPage() {
  const router = useRouter()
  const [batches, setBatches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  // Form state
  const [showForm, setShowForm] = useState(false)
  const [productId, setProductId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [cost, setCost] = useState("")
  const [manufacturedDate, setManufacturedDate] = useState("")
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/production").then(res => res.json()).then(data => {
      if (Array.isArray(data)) setBatches(data)
    })
    fetch("/api/products").then(res => res.json()).then(data => {
      if (data.products) setProducts(data.products)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const res = await fetch("/api/production", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        quantity,
        cost,
        manufacturedDate
      })
    })

    if (res.ok) {
      alert("Үйлдвэрлэл бүртгэгдэж агуулахад орлогодов!")
      setShowForm(false)
      // Refresh list
      const updated = await fetch("/api/production").then(r => r.json())
      setBatches(Array.isArray(updated) ? updated : [])
      
      // Reset form
      setProductId("")
      setQuantity("")
      setCost("")
      setManufacturedDate("")
    } else {
      const err = await res.json()
      alert(err.error || "Алдаа гарлаа")
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Үйлдвэрлэлийн бүртгэл (Production)</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
        >
          {showForm ? "Болих" : "+ Шинэ орлого бүртгэх"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Шинээр үйлдвэрлэсэн бараа бүртгэх</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Бараа сонгох</label>
              <select required className="w-full border rounded-lg p-2" value={productId} onChange={e => setProductId(e.target.value)}>
                <option value="">Сонгох...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Тоо хэмжээ (Ширхэг)</label>
              <input required type="number" min="1" className="w-full border rounded-lg p-2" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Нэгжийн өртөг (Сонголттой)</label>
              <input type="number" min="0" step="0.01" className="w-full border rounded-lg p-2" value={cost} onChange={e => setCost(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Үйлдвэрлэсэн огноо</label>
              <input type="date" className="w-full border rounded-lg p-2" value={manufacturedDate} onChange={e => setManufacturedDate(e.target.value)} />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#F26522] text-white py-2 rounded-lg font-bold hover:bg-[#e05b1f]">
            {loading ? "Түр хүлээнэ үү..." : "Орлогодох (Агуулах руу шилжүүлэх)"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 border-b">Багцын дугаар</th>
              <th className="p-4 border-b">Бараа</th>
              <th className="p-4 border-b">Тоо хэмжээ</th>
              <th className="p-4 border-b">Огноо</th>
              <th className="p-4 border-b">Бүртгэсэн</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(batch => (
              <tr key={batch.id} className="hover:bg-slate-50 border-b last:border-b-0">
                <td className="p-4 font-mono text-sm text-blue-600 font-bold">{batch.batchNumber}</td>
                <td className="p-4">{batch.product?.name}</td>
                <td className="p-4 font-bold text-green-600">+{batch.quantity}</td>
                <td className="p-4 text-sm text-slate-500">
                  {new Date(batch.createdAt).toLocaleString('mn-MN')}
                </td>
                <td className="p-4 text-sm">{batch.recordedBy?.name || "-"}</td>
              </tr>
            ))}
            {batches.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400">
                  Одоогоор бүртгэл алга байна.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
