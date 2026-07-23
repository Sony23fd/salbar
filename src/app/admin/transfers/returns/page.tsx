"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarcodeScanner } from "@/components/admin/BarcodeScanner"

export default function ReturnsForm() {
  const router = useRouter()
  const [branches, setBranches] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [fromBranchId, setFromBranchId] = useState("")
  const [toBranchId, setToBranchId] = useState("")
  const [type, setType] = useState("RETURN")
  const [items, setItems] = useState<{productId: string, quantity: number}[]>([])

  useEffect(() => {
    fetch("/api/branches").then(res => res.json()).then(setBranches)
    fetch("/api/products").then(res => res.json()).then(data => setProducts(data.products || []))
  }, [])

  const handleScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode || p.sku === barcode)
    if (product) {
      const existing = items.find(i => i.productId === product.id)
      if (existing) {
        setItems(items.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i))
      } else {
        setItems([...items, { productId: product.id, quantity: 1 }])
      }
    } else {
      alert("Бараа олдсонгүй: " + barcode)
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault()
    if (!fromBranchId || !toBranchId || items.length === 0) return alert("Мэдээллийг бүрэн бөглөнө үү.")
    
    const res = await fetch("/api/transfers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromBranchId,
        toBranchId,
        items,
        type,
        note: type === "RETURN" ? "Барааны буцаалт" : "Гологдлын устгал"
      })
    })

    if (res.ok) {
      router.push("/admin/transfers")
    } else {
      const err = await res.json()
      alert(err.error)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Буцаалт болон Гологдол</h1>
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Төрөл</label>
            <select className="w-full border rounded-lg p-2" value={type} onChange={e => setType(e.target.value)}>
              <option value="RETURN">Барааны буцаалт (Төв рүү)</option>
              <option value="DAMAGE_WRITE_OFF">Гологдол устгал</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Хаанаас (Салбар)</label>
            <select className="w-full border rounded-lg p-2" value={fromBranchId} onChange={e => setFromBranchId(e.target.value)}>
              <option value="">Сонгох...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Хаашаа (Төв)</label>
            <select className="w-full border rounded-lg p-2" value={toBranchId} onChange={e => setToBranchId(e.target.value)}>
              <option value="">Сонгох...</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Буцаах бараанууд</h3>
            <BarcodeScanner onScan={handleScan} />
          </div>
          
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 border-b">Бараа</th>
                <th className="p-2 border-b w-32">Тоо</th>
                <th className="p-2 border-b w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const product = products.find(p => p.id === item.productId)
                return (
                  <tr key={i} className="border-b">
                    <td className="p-2">{product?.name}</td>
                    <td className="p-2">
                      <input 
                        type="number" 
                        className="w-20 border rounded p-1"
                        value={item.quantity}
                        onChange={e => {
                          const newItems = [...items]
                          newItems[i].quantity = parseInt(e.target.value) || 0
                          setItems(newItems)
                        }}
                      />
                    </td>
                    <td className="p-2 text-right">
                      <button type="button" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-red-500 text-sm">Устгах</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button type="submit" className="bg-[#F26522] text-white px-6 py-2 rounded-xl font-bold w-full hover:bg-[#e05b1f] transition">
          Шилжүүлэг үүсгэх
        </button>
      </form>
    </div>
  )
}
