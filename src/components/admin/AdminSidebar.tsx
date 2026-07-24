"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Package,
  ListFilter,
  RefreshCw,
  ShoppingCart,
  Undo2,
  Users,
  Tag,
  Image as ImageIcon,
  Settings,
  Database,
  FileText,
  Truck,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CreditCard,
  CreditCardIcon,
  ShieldCheck,
  Building2,
  ArrowRightLeft,
  Boxes
} from "lucide-react"

type AdminRole = "ADMIN" | "CARGO_ADMIN" | "DATAADMIN"

interface SidebarItem {
  name: string
  url: string
  icon: React.ElementType
  roles: AdminRole[]
}

interface SidebarGroup {
  id: string
  label: string
  items: SidebarItem[]
}

const SIDEBAR_STRUCTURE: SidebarGroup[] = [
  {
    id: "general",
    label: "Үндсэн",
    items: [
      { name: "Хянах самбар", url: "/admin/home", icon: LayoutDashboard, roles: ["ADMIN", "CARGO_ADMIN", "DATAADMIN"] }
    ]
  },
  {
    id: "sales",
    label: "Борлуулалт",
    items: [
      { name: "Бүх захиалга", url: "/admin/orders", icon: ShoppingCart, roles: ["ADMIN", "CARGO_ADMIN"] },
      { name: "Буцаалт & Цуцлалт", url: "/admin/orders/returns", icon: Undo2, roles: ["ADMIN", "CARGO_ADMIN"] }
    ]
  },
  {
    id: "catalog",
    label: "Каталог",
    items: [
      { name: "Барааны жагсаалт", url: "/admin/products", icon: Package, roles: ["ADMIN"] },
      { name: "Ангилал & Төрөл", url: "/admin/categories", icon: ListFilter, roles: ["ADMIN"] },
      { name: "Баркод хэвлэх", url: "/admin/products/print-barcodes", icon: Package, roles: ["ADMIN"] }
    ]
  },
  {
    id: "warehouse",
    label: "Агуулах & Шилжүүлэг",
    items: [
      { name: "Салбарууд", url: "/admin/branches", icon: Building2, roles: ["ADMIN"] },
      { name: "Үлдэгдэл", url: "/admin/inventory", icon: Boxes, roles: ["ADMIN", "CARGO_ADMIN"] },
      { name: "Байршил & Тавиур", url: "/admin/inventory/bins", icon: Boxes, roles: ["ADMIN", "CARGO_ADMIN"] },
      { name: "Тооллого", url: "/admin/inventory/count", icon: Boxes, roles: ["ADMIN", "CARGO_ADMIN"] },
      { name: "Шилжүүлэг", url: "/admin/transfers", icon: ArrowRightLeft, roles: ["ADMIN", "CARGO_ADMIN"] }
    ]
  },
  {
    id: "customers",
    label: "Харилцагч",
    items: [
      { name: "Хэрэглэгчид", url: "/admin/customers", icon: Users, roles: ["ADMIN"] },
      { name: "Хөнгөлөлтийн карт", url: "/admin/customers/loyalty-cards", icon: CreditCardIcon, roles: ["ADMIN"] }
    ]
  },
  {
    id: "marketing",
    label: "Маркетинг",
    items: [
      { name: "Хямдрал & Урамшуулал", url: "/admin/marketing/promotions", icon: Tag, roles: ["ADMIN"] }
    ]
  },
  {
    id: "system",
    label: "Систем",
    items: [
      { name: "Өгөгдөл & POS Sync", url: "/admin/data-center", icon: RefreshCw, roles: ["DATAADMIN"] },
      { name: "Ерөнхий тохиргоо", url: "/admin/settings/general", icon: Settings, roles: ["ADMIN"] },
      { name: "Төлбөрийн тохиргоо", url: "/admin/settings/payment", icon: CreditCard, roles: ["ADMIN"] },
      { name: "Карго тохиргоо", url: "/admin/cargo-settings", icon: Truck, roles: ["CARGO_ADMIN"] },
      { name: "Админ хэрэглэгчид", url: "/admin/users", icon: ShieldCheck, roles: ["ADMIN", "DATAADMIN"] },
      { name: "Үйлдлийн лог", url: "/admin/analytics/audit", icon: Database, roles: ["ADMIN", "DATAADMIN"] },
      { name: "Гарын авлага", url: "/admin/guide", icon: BookOpen, roles: ["ADMIN", "CARGO_ADMIN"] }
    ]
  }
]

export function AdminSidebar({ className, role }: { className?: string; role: AdminRole }) {
  const pathname = usePathname()
  
  // Track open/collapsed state of groups
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    general: false,
    sales: false,
    catalog: false,
    customers: false,
    marketing: false,
    system: true, // Default collapse system to save space
  })

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }))
  }

  return (
    <aside className={cn("w-[260px] flex flex-col bg-[#0B0F19] border-r border-white/5 h-full transition-all duration-300 relative overflow-hidden", className)}>
      {/* Decorative background glow */}
      <div className="absolute top-0 left-0 w-full h-[200px] bg-gradient-to-b from-[#4F46E5]/10 to-transparent pointer-events-none" />

      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-white/5 flex flex-col justify-center relative z-10">
        <Link href="/admin/home" className="flex items-center gap-3 w-max group">
          <div className="bg-gradient-to-br from-[#F26522] to-[#b3121f] text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-[0_0_20px_rgba(230,57,70,0.3)] group-hover:shadow-[0_0_25px_rgba(230,57,70,0.5)] transition-all duration-300 transform group-hover:scale-105">
            B
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold text-white tracking-tight leading-none group-hover:text-red-50 transition-colors">
              Store Admin
            </h2>
            <p className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Супермаркет</p>
          </div>
        </Link>
        {role === "CARGO_ADMIN" && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-500/10 rounded-md px-2.5 py-1.5 w-max border border-sky-500/20 backdrop-blur-sm">
            <Truck className="w-3 h-3" />
            Карго Админ
          </div>
        )}
        {role === "DATAADMIN" && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/10 rounded-md px-2.5 py-1.5 w-max border border-purple-500/20 backdrop-blur-sm">
            <Database className="w-3 h-3" />
            Дата Админ
          </div>
        )}
      </div>

      {/* Navigation Space */}
      <nav className="flex-1 min-h-0 px-3 py-6 space-y-5 overflow-y-auto custom-scrollbar relative z-10">
        {SIDEBAR_STRUCTURE.map((group) => {
          const visibleItems = group.items.filter(item => item.roles.includes(role))
          if (visibleItems.length === 0) return null

          const isCollapsed = collapsedGroups[group.id]

          return (
            <div key={group.id} className="space-y-1.5">
              {/* Group Header - Clickable to expand/collapse */}
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between px-3 py-1 text-[11px] font-bold text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors duration-150"
              >
                <span>{group.label}</span>
                {isCollapsed ? (
                  <ChevronRight className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Group Items */}
              <div
                className={cn(
                  "space-y-1 transition-all duration-300 overflow-hidden",
                  isCollapsed ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[500px] opacity-100 mt-1.5"
                )}
              >
                {visibleItems.map((item) => {
                  // Active state check supporting exact or nested routing
                  const isActive = pathname === item.url || (item.url !== "/admin/home" && pathname.startsWith(item.url.split("?")[0]))

                  return (
                    <Link
                      key={item.name}
                      href={item.url}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 group relative",
                        isActive
                          ? "bg-gradient-to-r from-[#4F46E5]/20 to-transparent text-white border border-[#4F46E5]/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#4F46E5] rounded-r-full shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                      )}
                      <item.icon className={cn("w-[18px] h-[18px] transition-colors", isActive ? "text-[#4F46E5]" : "text-slate-500 group-hover:text-slate-400")} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="px-6 py-4 border-t border-white/5 text-[11px] text-slate-500 font-medium flex items-center justify-between bg-black/20 relative z-10">
        <span>© 2026</span>
        <div className="flex items-center gap-2">
          <span>Online</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
        </div>
      </div>
    </aside>
  )
}
