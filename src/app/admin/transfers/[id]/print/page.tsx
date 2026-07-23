import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export default async function PrintTransferPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const transfer = await db.stockTransfer.findUnique({
    where: { id: resolvedParams.id },
    include: {
      fromBranch: true,
      toBranch: true,
      createdBy: true,
      approvedBy: true,
      items: {
        include: { product: true }
      }
    }
  })

  if (!transfer) return notFound()

  return (
    <div className="bg-white min-h-screen text-black p-8 max-w-4xl mx-auto print:p-0 print:m-0">
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">
            {transfer.type === "REGULAR" ? "Зарлагын баримт" : transfer.type === "RETURN" ? "Буцаалтын баримт" : "Гологдлын баримт"}
          </h1>
          <p className="text-gray-600">Огноо: {transfer.createdAt.toLocaleString('mn-MN')}</p>
          <p className="text-gray-600">Дугаар: <span className="font-bold">{transfer.referenceNumber}</span></p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">БИЛЭГ ХҮРГЭЛТ</h2>
          <p className="text-sm text-gray-500">Агуулахын удирдлагын систем</p>
        </div>
      </div>

      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4 border-r">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Гаргагч салбар</h3>
          <p className="font-bold text-lg">{transfer.fromBranch.name}</p>
          <p>Хариуцагч: {transfer.createdBy.name}</p>
        </div>
        <div className="w-1/2 pl-4">
          <h3 className="font-bold text-gray-500 mb-2 uppercase text-xs">Хүлээн авагч салбар</h3>
          <p className="font-bold text-lg">{transfer.toBranch.name}</p>
          <p>Төлөв: <span className="uppercase font-bold">{transfer.status}</span></p>
        </div>
      </div>

      <table className="w-full text-left border-collapse mb-8">
        <thead>
          <tr className="border-b-2 border-gray-800">
            <th className="py-2">№</th>
            <th className="py-2">Барааны нэр</th>
            <th className="py-2">Баркод</th>
            <th className="py-2 text-right">Тоо ширхэг</th>
          </tr>
        </thead>
        <tbody>
          {transfer.items.map((item, idx) => (
            <tr key={item.id} className="border-b border-gray-200">
              <td className="py-3">{idx + 1}</td>
              <td className="py-3 font-medium">{item.product.name}</td>
              <td className="py-3 text-sm text-gray-500">{item.product.barcode || item.product.sku}</td>
              <td className="py-3 text-right font-bold">{item.quantity}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-800">
            <td colSpan={3} className="py-3 text-right font-bold uppercase">Нийт дүн:</td>
            <td className="py-3 text-right font-bold text-xl">
              {transfer.items.reduce((sum, i) => sum + i.quantity, 0)}
            </td>
          </tr>
        </tbody>
      </table>

      {transfer.note && (
        <div className="mb-12 p-4 bg-gray-50 border border-gray-200 rounded">
          <h4 className="font-bold mb-1">Тэмдэглэл:</h4>
          <p>{transfer.note}</p>
        </div>
      )}

      <div className="flex justify-between mt-16 pt-8 border-t">
        <div className="text-center w-1/3">
          <p className="mb-8 font-bold">Бараа хүлээлгэн өгсөн:</p>
          <div className="border-b border-black w-4/5 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">/ Гарын үсэг /</p>
        </div>
        <div className="text-center w-1/3">
          <p className="mb-8 font-bold">Тээвэрлэсэн жолооч:</p>
          <div className="border-b border-black w-4/5 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">/ Гарын үсэг /</p>
        </div>
        <div className="text-center w-1/3">
          <p className="mb-8 font-bold">Бараа хүлээн авсан:</p>
          <div className="border-b border-black w-4/5 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">/ Гарын үсэг /</p>
        </div>
      </div>

      {/* Non-printable buttons area */}
      <div className="mt-8 print:hidden text-center">
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') window.print()
          }}
          className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-gray-800 transition transform hover:scale-105"
        >
          🖨️ Баримт хэвлэх
        </button>
      </div>
    </div>
  )
}
