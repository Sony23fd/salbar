"use client"

import { useState, useEffect } from "react"

export default function BinManagementPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [selectedBranch, setSelectedBranch] = useState("")
  const [bins, setBins] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [name, setName] = useState("")
  const [aisle, setAisle] = useState("")
  const [rack, setRack] = useState("")
  const [shelf, setShelf] = useState("")

  useEffect(() => {
    fetch("/api/branches")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBranches(data)
      })
  }, [])

  useEffect(() => {
    if (selectedBranch) {
      loadBins()
    }
  }, [selectedBranch])

  const loadBins = () => {
    setLoading(true)
    fetch(`/api/bins?branchId=${selectedBranch}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setBins(data)
      })
      .finally(() => setLoading(false))
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBranch || !name) return

    try {
      const res = await fetch("/api/bins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: selectedBranch, name, aisle, rack, shelf })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Алдаа гарлаа")
      }

      setName("")
      setAisle("")
      setRack("")
      setShelf("")
      loadBins()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Агуулахын байршлын удирдлага (Bin Locations)</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="mb-6">
        <label className="block mb-1 font-medium">Салбар сонгох</label>
        <select 
          className="w-full md:w-1/2 border p-2 rounded" 
          value={selectedBranch} 
          onChange={(e) => {
            setSelectedBranch(e.target.value)
            setBins([])
          }}
        >
          <option value="">-- Сонгох --</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      {selectedBranch && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 bg-white p-4 border rounded shadow h-fit">
            <h2 className="font-bold mb-4">Шинэ байршил үүсгэх</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Нэр (Жишээ: A-1-02)*</label>
                <input required type="text" className="w-full border p-2 rounded" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Эгнээ (Aisle)</label>
                <input type="text" className="w-full border p-2 rounded" placeholder="A" value={aisle} onChange={e => setAisle(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Тавиур (Rack)</label>
                <input type="text" className="w-full border p-2 rounded" placeholder="1" value={rack} onChange={e => setRack(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Хавтан (Shelf)</label>
                <input type="text" className="w-full border p-2 rounded" placeholder="02" value={shelf} onChange={e => setShelf(e.target.value)} />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 font-medium">
                Хадгалах
              </button>
            </form>
          </div>

          <div className="md:col-span-2 bg-white border rounded shadow overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-3 border-b">Нэр</th>
                  <th className="p-3 border-b">Эгнээ</th>
                  <th className="p-3 border-b">Тавиур</th>
                  <th className="p-3 border-b">Хавтан</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="p-4 text-center">Уншиж байна...</td></tr>
                ) : bins.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-gray-500">Байршил бүртгээгүй байна.</td></tr>
                ) : bins.map(bin => (
                  <tr key={bin.id} className="hover:bg-gray-50">
                    <td className="p-3 border-b font-bold text-blue-600">{bin.name}</td>
                    <td className="p-3 border-b">{bin.aisle || "-"}</td>
                    <td className="p-3 border-b">{bin.rack || "-"}</td>
                    <td className="p-3 border-b">{bin.shelf || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
