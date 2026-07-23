"use client"

import { useState, useEffect } from "react"

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/audit")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLogs(data)
        else if (data.error) setError(data.error)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Аудит болон Хяналтын түүх</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <div className="bg-white border rounded shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border-b">Огноо</th>
              <th className="p-3 border-b">Хэрэглэгч</th>
              <th className="p-3 border-b">Үйлдэл (Action)</th>
              <th className="p-3 border-b">Дэлгэрэнгүй</th>
              <th className="p-3 border-b">Target ID</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center">Уншиж байна...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">Түүх олдсонгүй.</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="p-3 border-b whitespace-nowrap text-sm text-gray-600">
                  {new Date(log.createdAt).toLocaleString('mn-MN')}
                </td>
                <td className="p-3 border-b">
                  <span className="font-bold">{log.userName}</span>
                  <br/>
                  <span className="text-xs text-gray-500">{log.userRole}</span>
                </td>
                <td className="p-3 border-b">
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded font-bold">
                    {log.action}
                  </span>
                </td>
                <td className="p-3 border-b text-sm">{log.detail}</td>
                <td className="p-3 border-b text-xs text-gray-400 font-mono">{log.target || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
