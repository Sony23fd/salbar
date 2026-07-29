"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function B2BClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form
  const [companyName, setCompanyName] = useState("")
  const [registryNumber, setRegistryNumber] = useState("")
  const [contactPerson, setContactPerson] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [creditLimit, setCreditLimit] = useState("")

  useEffect(() => {
    fetch("/api/b2b-clients").then(res => res.json()).then(data => {
      if (Array.isArray(data)) setClients(data)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch("/api/b2b-clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        registryNumber,
        contactPerson,
        phoneNumber,
        creditLimit
      })
    })

    if (res.ok) {
      alert("Харилцагч амжилттай бүртгэгдлээ.")
      setShowForm(false)
      const updated = await fetch("/api/b2b-clients").then(r => r.json())
      setClients(Array.isArray(updated) ? updated : [])
      
      setCompanyName("")
      setRegistryNumber("")
      setContactPerson("")
      setPhoneNumber("")
      setCreditLimit("")
    } else {
      const err = await res.json()
      alert(err.error || "Алдаа гарлаа")
    }
    setLoading(false)
  }

  // Calculate receivables
  const getReceivable = (client: any) => {
    if (!client.orders) return 0
    return client.orders
      .filter((o: any) => o.paymentStatus !== "PAID" && o.orderStatus !== "CANCELLED")
      .reduce((sum: number, o: any) => sum + Number(o.totalAmount), 0)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">B2B Харилцагчид (CRM)</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
        >
          {showForm ? "Болих" : "+ Харилцагч нэмэх"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="font-bold text-lg border-b pb-2">Шинэ харилцагч бүртгэх</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Байгууллагын нэр *</label>
              <input required className="w-full border rounded-lg p-2" value={companyName} onChange={e => setCompanyName(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Регистрийн дугаар</label>
              <input className="w-full border rounded-lg p-2" value={registryNumber} onChange={e => setRegistryNumber(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Холбогдох хүн</label>
              <input className="w-full border rounded-lg p-2" value={contactPerson} onChange={e => setContactPerson(e.target.value)} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Утасны дугаар</label>
              <input className="w-full border rounded-lg p-2" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Зээлийн эрх (Авлагын дээд хязгаар) ₮</label>
              <input type="number" className="w-full border rounded-lg p-2" value={creditLimit} onChange={e => setCreditLimit(e.target.value)} />
            </div>
          </div>

          <button disabled={loading} type="submit" className="w-full bg-[#F26522] text-white py-2 rounded-lg font-bold hover:bg-[#e05b1f]">
            {loading ? "Түр хүлээнэ үү..." : "Хадгалах"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-4 border-b">Байгууллага</th>
              <th className="p-4 border-b">Холбогдох хүн</th>
              <th className="p-4 border-b">Нийт захиалга</th>
              <th className="p-4 border-b">Үүссэн авлага (₮)</th>
              <th className="p-4 border-b">Зээлийн эрх (₮)</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => {
              const receivable = getReceivable(client)
              const limit = Number(client.creditLimit) || 0
              const isOverLimit = limit > 0 && receivable > limit

              return (
                <tr key={client.id} className="hover:bg-slate-50 border-b last:border-b-0">
                  <td className="p-4">
                    <p className="font-bold">{client.companyName}</p>
                    <p className="text-xs text-slate-500">РД: {client.registryNumber || "-"}</p>
                  </td>
                  <td className="p-4">
                    <p>{client.contactPerson || "-"}</p>
                    <p className="text-xs text-slate-500">{client.phoneNumber}</p>
                  </td>
                  <td className="p-4">{client.orders?.length || 0}</td>
                  <td className="p-4 font-bold text-red-600">
                    {receivable.toLocaleString()} ₮
                    {isOverLimit && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Хэтэрсэн</span>}
                  </td>
                  <td className="p-4 text-sm">{limit > 0 ? limit.toLocaleString() : "Хязгааргүй"}</td>
                </tr>
              )
            })}
            {clients.length === 0 && (
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
