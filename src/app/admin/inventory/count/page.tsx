"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarcodeScanner } from "@/components/admin/BarcodeScanner"

export default function StockCountPage() {
  const router = useRouter()
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [products, setProducts] = useState<any[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [scannerOpen, setScannerOpen] = useState(false)
  const [manualBarcode, setManualBarcode] = useState("")

  useEffect(() => {
    fetch("/api/branches")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBranches(data)
      })
      .catch(err => console.error(err))

    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data)
      })
      .catch(err => console.error(err))
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      fetch(`/api/inventory?branchId=${selectedBranch}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setInventory(data)
        })
    }
  }, [selectedBranch])

  const handleScan = (barcode: string) => {
    if (!selectedBranch) {
      alert("Эхлээд салбараа сонгоно уу!")
      return
    }

    const product = products.find(p => p.barcode === barcode || p.sku === barcode)
    if (!product) {
      alert("Бараа олдсонгүй: " + barcode)
      return
    }

    // Check if already in items
    const existingIndex = items.findIndex(i => i.productId === product.id)
    if (existingIndex >= 0) {
      const newItems = [...items]
      newItems[existingIndex].countedQty += 1
      setItems(newItems)
    } else {
      // Find system qty
      const invItem = inventory.find(i => i.productId === product.id)
      const systemQty = invItem ? invItem.quantity : 0

      setItems([
        ...items,
        {
          productId: product.id,
          name: product.name,
          barcode: product.barcode || product.sku,
          systemQty: systemQty,
          countedQty: systemQty > 0 ? systemQty + 1 : 1, // Start by incrementing from what's there or just 1? Actually, if they are scanning to count, usually they enter total. Let's set countedQty to systemQty + 1. Or better: let them type it. Let's set it to systemQty, they can change it. Actually, if they scan, it means they found 1.
          // Wait, if systemQty is 50, and they scan 1, they probably want to type "50" or increment. Let's default to systemQty for convenience.
        }
      ])
    }
    setScannerOpen(false)
  }

  const updateItemQty = (index: number, val: string) => {
    const qty = parseInt(val) || 0
    const newItems = [...items]
    newItems[index].countedQty = qty
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleSubmit = async () => {
    if (!selectedBranch) return setError("Салбараа сонгоно уу")
    if (items.length === 0) return setError("Тоолсон бараа оруулна уу")

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const payload = {
        branchId: selectedBranch,
        note,
        items: items.map(i => ({
          productId: i.productId,
          countedQty: i.countedQty
        }))
      }

      const res = await fetch("/api/inventory/count", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Алдаа гарлаа")

      setSuccess("Тооллого амжилттай баталгаажлаа. Үлдэгдэл шинэчлэгдлээ.")
      setItems([])
      setNote("")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Ухаалаг Тооллого (Physical Stock Count)</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block mb-1 font-medium">Салбар сонгох</label>
          <select 
            className="w-full border p-2 rounded" 
            value={selectedBranch} 
            onChange={(e) => {
              setSelectedBranch(e.target.value)
              setItems([])
            }}
          >
            <option value="">-- Сонгох --</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium">Тооллогын тэмдэглэл</label>
          <input 
            type="text" 
            className="w-full border p-2 rounded" 
            placeholder="Жинхэнэ тооллого 2026-07..." 
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setScannerOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
        >
          📷 Камераар сканнердах
        </button>
        <div className="flex">
          <input 
            type="text" 
            placeholder="Баркод гараар бичих" 
            className="border p-2 rounded-l w-48"
            value={manualBarcode}
            onChange={(e) => setManualBarcode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && manualBarcode) {
                handleScan(manualBarcode)
                setManualBarcode("")
              }
            }}
          />
          <button 
            onClick={() => {
              handleScan(manualBarcode)
              setManualBarcode("")
            }}
            className="bg-gray-200 px-4 rounded-r border border-l-0 hover:bg-gray-300"
          >
            Нэмэх
          </button>
        </div>
      </div>

      {scannerOpen && (
        <div className="mb-6 p-4 border rounded bg-gray-50 relative">
          <button 
            onClick={() => setScannerOpen(false)}
            className="absolute top-2 right-2 text-red-500 font-bold"
          >
            Хаах
          </button>
          <h3 className="font-bold mb-2">Баркод сканнер</h3>
          <BarcodeScanner onDetected={(code) => handleScan(code)} />
        </div>
      )}

      {items.length > 0 ? (
        <div className="bg-white border rounded shadow overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 border-b">Бараа</th>
                <th className="p-3 border-b">Баркод</th>
                <th className="p-3 border-b text-center">Системийн үлдэгдэл</th>
                <th className="p-3 border-b text-center">Тоолсон дүн</th>
                <th className="p-3 border-b text-center">Зөрүү</th>
                <th className="p-3 border-b"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const diff = item.countedQty - item.systemQty;
                return (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 border-b font-medium">{item.name}</td>
                    <td className="p-3 border-b text-sm text-gray-500">{item.barcode}</td>
                    <td className="p-3 border-b text-center text-blue-600 font-bold">{item.systemQty}</td>
                    <td className="p-3 border-b text-center">
                      <input 
                        type="number" 
                        min="0"
                        className="w-20 border p-1 rounded text-center"
                        value={item.countedQty}
                        onChange={(e) => updateItemQty(idx, e.target.value)}
                      />
                    </td>
                    <td className={`p-3 border-b text-center font-bold ${diff < 0 ? 'text-red-500' : diff > 0 ? 'text-green-500' : 'text-gray-400'}`}>
                      {diff > 0 ? '+' : ''}{diff}
                    </td>
                    <td className="p-3 border-b text-right">
                      <button onClick={() => removeItem(idx)} className="text-red-500 hover:underline text-sm">
                        Устгах
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 flex justify-end">
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-2 rounded font-bold hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Хадгалж байна..." : "Тооллогыг баталгаажуулах"}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded border border-dashed">
          Баркод сканнердаж тооллогыг эхлүүлнэ үү.
        </div>
      )}
    </div>
  )
}
