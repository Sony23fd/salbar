import React, { useState } from 'react';
import { Database, Download, Trash2, AlertTriangle, ShieldAlert, LogOut } from 'lucide-react';
import toast from 'react-hot-toast';

export const DataAdminPanel: React.FC = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
  };

  const handleBackup = async () => {
    try {
      setIsDownloading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/data-admin/backup', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Backup failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wms_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Өгөгдөл амжилттай татагдлаа');
    } catch (err: any) {
      toast.error('Өгөгдөл нөөцлөхөд алдаа гарлаа');
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClearData = async () => {
    const confirmText = prompt('Энэ үйлдэл нь хэрэглэгчдээс БУСАД бүх өгөгдлийг устгах бөгөөд буцаах боломжгүй! Баталгаажуулахын тулд "CLEAR" гэж бичнэ үү.');
    if (confirmText !== 'CLEAR') {
      toast.error('Үйлдэл цуцлагдлаа');
      return;
    }

    try {
      setIsClearing(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/data-admin/clear', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Clear failed');
      }
      
      toast.success('Хэрэглэгчдээс бусад бүх өгөгдөл амжилттай устгагдлаа!');
    } catch (err: any) {
      toast.error(err.message || 'Өгөгдөл устгахад алдаа гарлаа');
      console.error(err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="w-full space-y-6">
        <div className="flex justify-end">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" /> Системээс гарах
          </button>
        </div>

        <div className="bg-red-50 border border-red-200 p-6 rounded-2xl flex items-start gap-4">
          <ShieldAlert className="w-8 h-8 text-red-600 shrink-0 mt-1" />
          <div>
            <h1 className="text-2xl font-black text-red-900 mb-2">Data Admin Control Panel</h1>
            <p className="text-sm text-red-700 font-medium">
              Энэ хуудас нь зөвхөн DATA_ADMIN эрхтэй хэрэглэгчид харагдана. Энд хийгдэх үйлдлүүд нь системийн нийт өгөгдөлд шууд нөлөөлөх тул маш болгоомжтой хандана уу.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <Database className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Өгөгдөл нөөцлөх (Backup)</h3>
            <p className="text-sm text-slate-500 mb-6">
              Системийн бүх хүснэгтийн мэдээллийг JSON форматаар татаж авна. Устгал хийхээс өмнө заавал нөөцлөлт хийхийг зөвлөж байна.
            </p>
            <button
              onClick={handleBackup}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isDownloading ? 'Татаж байна...' : <><Download className="w-5 h-5" /> Бүрэн нөөцлөлт татах</>}
            </button>
          </div>

          {/* Clear Data Card */}
          <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-red-900 mb-2">Өгөгдөл цэвэрлэх</h3>
            <p className="text-sm text-slate-500 mb-6">
              Хэрэглэгчдээс (Users) бусад <strong>бүх мэдээллийг</strong> өгөгдлийн сангаас бүр мөсөн устгана. Буцаах ямар ч боломжгүй!
            </p>
            <button
              onClick={handleClearData}
              disabled={isClearing}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
            >
              {isClearing ? 'Устгаж байна...' : <><AlertTriangle className="w-5 h-5" /> Бүх өгөгдлийг устгах</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
