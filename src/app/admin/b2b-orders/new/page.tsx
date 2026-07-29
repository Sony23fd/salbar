"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function NewB2BOrderPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  
  const [clientId, setClientId] = useState("")
  const [items, setItems] = useState<any[]>([])
  
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/b2b-clients").then(res => res.json()).then(data => {
      if (Array.isArray(data)) setClients(data)
    })
    fetch("/api/products").then(res => res.json()).then(data => {
      if (data.products) setProducts(data.products)
    })
  }, [])

  const handleAddItem = (productId: string) => {
    if (!productId) return
    const product = products.find(p => p.id === productId)
    if (!product) return

    setItems([...items, {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unitPrice: product.price,
      customPrice: product.price,
      quantity: 1
    }])
  }

  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || items.length === 0) {
      return alert("Харилцагч болон бараа сонгоно уу.")
    }
    
    setLoading(true)
    const res = await fetch("/api/b2b-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        items
      })
    })

    if (res.ok) {
      alert("B2B Захиалга амжилттай үүслээ!")
      router.push("/admin/orders") // For now, redirect to existing orders page, which we'll need to adapt for B2B.
    } else {
      const err = await res.json()
      alert(err.error || "Алдаа гарлаа")
    }
    setLoading(false)
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.customPrice || item.unitPrice)), 0)

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Шинэ B2B Захиалга үүсгэх</h1>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-6">
        
        <div>
          <label className="block text-sm font-medium mb-1">Харилцагч байгууллага (B2B Client) *</label>
          <select required className="w-full border rounded-lg p-3" value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Сонгох...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.companyName} (РД: {c.registryNumber || "-"})</option>
            ))}
          </select>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium mb-1">Бараа нэмэх</label>
          <select 
            className="w-full border rounded-lg p-2"
            onChange={e => {
              handleAddItem(e.target.value)
              e.target.value = "" // reset
            }}
          >
            <option value="">+ Бараа сонгож нэмэх...</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
        </div>

        {items.length > 0 && (
          <table className="w-full text-left mt-4 border">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-3 border-b">Бараа</th>
                <th className="p-3 border-b w-24">Тоо</th>
                <th className="p-3 border-b">Нэгж үнэ (₮)</th>
                <th className="p-3 border-b">Тохиролцсон үнэ (₮)</th>
                <th className="p-3 border-b text-right">Нийт (₮)</th>
                <th className="p-3 border-b w-16"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index} className="border-b">
                  <td className="p-3 font-medium text-sm">{item.productName}</td>
                  <td className="p-3">
                    <input type="number" min="1" className="w-full border rounded p-1" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} />
                  </td>
                  <td className="p-3 text-slate-500 line-through text-sm">{Number(item.unitPrice).toLocaleString()}</td>
                  <td className="p-3">
                    <input type="number" min="0" className="w-full border rounded p-1 font-bold text-green-600" value={item.customPrice} onChange={e => updateItem(index, "customPrice", e.target.value)} />
                  </td>
                  <td className="p-3 text-right font-bold">
                    {(Number(item.quantity) * Number(item.customPrice || item.unitPrice)).toLocaleString()}
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => removeItem(index)} className="text-red-500 text-sm">Устгах</button>
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold text-lg">
                <td colSpan={4} className="p-4 text-right">Нийт дүн:</td>
                <td className="p-4 text-right text-blue-600">{subtotal.toLocaleString()} ₮</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        )}

        <button disabled={loading} type="submit" className="w-full bg-[#F26522] text-white py-3 rounded-lg font-bold hover:bg-[#e05b1f] text-lg">
          {loading ? "Түр хүлээнэ үү..." : "Захиалга Батлах"}
        </button>
      </form>
    </div>
  )
}
