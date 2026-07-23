"use client"

import { useState, useEffect } from "react"
import Barcode from "react-barcode"

export default function PrintBarcodesPage() {
  const [products, setProducts] = useState<any[]>([])
  const [selectedProducts, setSelectedProducts] = useState<{ id: string, name: string, barcode: string, count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = (product: any) => {
    if (!product.barcode) {
      alert("Энэ бараанд баркод бүртгэгдээгүй байна.")
      return
    }
    const existing = selectedProducts.find(p => p.id === product.id)
    if (existing) {
      setSelectedProducts(selectedProducts.map(p => 
        p.id === product.id ? { ...p, count: p.count + 1 } : p
      ))
    } else {
      setSelectedProducts([...selectedProducts, { 
        id: product.id, 
        name: product.name, 
        barcode: product.barcode, 
        count: 1 
      }])
    }
  }

  const handleCountChange = (id: string, count: string) => {
    const val = parseInt(count) || 0
    setSelectedProducts(selectedProducts.map(p => 
      p.id === id ? { ...p, count: val } : p
    ))
  }

  const removeProduct = (id: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.id !== id))
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="print:hidden">
        <h1 className="text-2xl font-bold mb-6">Баркод хэвлэх (Sticker Printing)</h1>
        
        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="w-full md:w-1/2 bg-white p-4 border rounded shadow h-96 overflow-y-auto">
            <h2 className="font-bold mb-4">Бүх бараа</h2>
            {loading ? <p>Уншиж байна...</p> : (
              <ul className="space-y-2">
                {products.map(p => (
                  <li key={p.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-gray-500">Баркод: {p.barcode || "Байхгүй"}</p>
                    </div>
                    <button 
                      onClick={() => handleSelect(p)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm hover:bg-blue-200"
                    >
                      Сонгох
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="w-full md:w-1/2 bg-white p-4 border rounded shadow h-96 overflow-y-auto">
            <h2 className="font-bold mb-4">Хэвлэх жагсаалт</h2>
            {selectedProducts.length === 0 ? (
              <p className="text-gray-400 italic">Сонгосон бараа алга байна.</p>
            ) : (
              <ul className="space-y-2">
                {selectedProducts.map(p => (
                  <li key={p.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b">
                    <div className="w-1/2">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.barcode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number" 
                        className="w-16 border p-1 rounded text-center" 
                        value={p.count} 
                        min="1"
                        onChange={e => handleCountChange(p.id, e.target.value)}
                      />
                      <span className="text-xs">ш</span>
                      <button onClick={() => removeProduct(p.id)} className="text-red-500 text-xs ml-2 hover:underline">Устгах</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {selectedProducts.length > 0 && (
              <button 
                onClick={() => window.print()}
                className="w-full mt-6 bg-black text-white py-3 rounded-full font-bold shadow hover:bg-gray-800"
              >
                🖨️ Хэвлэх
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print View Only */}
      <div className="hidden print:flex flex-wrap gap-4 items-center justify-start">
        {selectedProducts.flatMap(p => 
          Array.from({ length: p.count }).map((_, i) => (
            <div key={`${p.id}-${i}`} className="w-[180px] h-[100px] border border-gray-300 flex flex-col items-center justify-center p-2 mb-2 bg-white text-black break-inside-avoid">
              <p className="text-[10px] font-bold text-center truncate w-full mb-1">{p.name}</p>
              <Barcode 
                value={p.barcode} 
                width={1.5} 
                height={40} 
                fontSize={12} 
                margin={0} 
                displayValue={true} 
              />
            </div>
          ))
        )}
      </div>
      
      {/* Global Print Styles specifically to hide standard layout headers/navs if any, but handled well by print:hidden above */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:flex, .print\\:flex * {
            visibility: visible;
          }
          .print\\:flex {
            position: absolute;
            left: 0;
            top: 0;
          }
        }
      `}} />
    </div>
  )
}
