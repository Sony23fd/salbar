"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

export default function B2BOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = () => {
    fetch("/api/b2b-orders").then(res => res.json()).then(data => {
      if (Array.isArray(data)) setOrders(data)
    })
  }

  const handleDeliver = async (orderId: string) => {
    if (!confirm("Захиалгыг хүлээлгэн өгч, агуулахаас үлдэгдлийг хасах уу?")) return
    setLoading(true)

    const res = await fetch(`/api/b2b-orders/${orderId}/deliver`, {
      method: "PUT"
    })

    if (res.ok) {
      alert("Амжилттай хүргэгдэж, үлдэгдэл хасагдлаа!")
      fetchOrders()
    } else {
      const err = await res.json()
      alert(err.error || "Алдаа гарлаа")
    }
    setLoading(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">B2B Захиалгууд</h1>
        <Link 
          href="/admin/b2b-orders/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
        >
          + Шинэ захиалга
        </Link>
      </div>

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 border-b">Дугаар / Огноо</th>
              <th className="p-4 border-b">Харилцагч</th>
              <th className="p-4 border-b">Нийт дүн</th>
              <th className="p-4 border-b">Төлөв</th>
              <th className="p-4 border-b">Төлбөр</th>
              <th className="p-4 border-b text-right">Үйлдэл</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="hover:bg-slate-50 border-b last:border-b-0">
                <td className="p-4">
                  <p className="font-bold text-sm">#{order.orderNumber}</p>
                  <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleString('mn-MN')}</p>
                </td>
                <td className="p-4">
                  <p className="font-bold">{order.customerName}</p>
                  <p className="text-xs text-slate-500">{order.customerPhone}</p>
                </td>
                <td className="p-4 font-bold">{Number(order.totalAmount).toLocaleString()} ₮</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    order.orderStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    order.orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {order.orderStatus}
                  </span>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    order.paymentStatus === 'PENDING' ? 'bg-red-100 text-red-800' :
                    order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                  }`}>
                    {order.paymentStatus}
                  </span>
                </td>
                <td className="p-4 text-right">
                  {order.orderStatus === "PENDING" && (
                    <button 
                      disabled={loading}
                      onClick={() => handleDeliver(order.id)}
                      className="bg-[#F26522] text-white px-3 py-1 rounded text-sm hover:bg-[#e05b1f]"
                    >
                      Хүргэх & Зарлагадах
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400">
                  Одоогоор захиалга алга байна.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
