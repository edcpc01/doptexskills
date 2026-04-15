"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Grid3X3,
  ClipboardCheck,
  CalendarCheck,
  FileBarChart,
  Settings,
  LogOut,
  Users,
  BookOpen,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/gestor", icon: <LayoutDashboard size={20} />, roles: ["admin", "gestor"] },
  { label: "Matriz", href: "/gestor/matriz", icon: <Grid3X3 size={20} />, roles: ["admin", "gestor"] },
  { label: "Avaliações", href: "/gestor/avaliacoes", icon: <ClipboardCheck size={20} />, roles: ["admin", "gestor"] },
  { label: "Assiduidade", href: "/gestor/assiduidade", icon: <CalendarCheck size={20} />, roles: ["admin", "gestor"] },
  { label: "Provas", href: "/gestor/provas", icon: <BookOpen size={20} />, roles: ["admin", "gestor"] },
  { label: "Meu Painel", href: "/colaborador", icon: <User size={20} />, roles: ["colaborador"] },
  { label: "Minhas Provas", href: "/colaborador/provas", icon: <BookOpen size={20} />, roles: ["colaborador"] },
  { label: "Histórico", href: "/colaborador/historico", icon: <FileBarChart size={20} />, roles: ["colaborador"] },
  { label: "Colaboradores", href: "/admin/colaboradores", icon: <Users size={20} />, roles: ["admin"] },
  { label: "Competências", href: "/admin/competencias", icon: <Grid3X3 size={20} />, roles: ["admin"] },
  { label: "Configurações", href: "/admin/configuracoes", icon: <Settings size={20} />, roles: ["admin"] },
];

export default function Sidebar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = NAV_ITEMS.filter((item) =>
    profile ? item.roles.includes(profile.role) : false
  );

  const roleLabel = profile?.role === "admin" ? "Administrador" : profile?.role === "gestor" ? "Gestor" : "Colaborador";

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-40 flex flex-col transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-64"
      }`}
      style={{ background: "linear-gradient(180deg, #0F172A 0%, #1E293B 100%)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
          D
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-bold text-sm text-white leading-tight">Doptex Skills</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">{roleLabel}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              } ${collapsed ? "justify-center" : ""}`}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User + collapse */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        {!collapsed && profile && (
          <div className="px-2 py-1">
            <p className="text-xs text-slate-400 truncate">{profile.email}</p>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={signOut}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${
              collapsed ? "justify-center w-full" : ""
            }`}
            title="Sair"
          >
            <LogOut size={18} />
            {!collapsed && <span>Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/50 transition-all"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
