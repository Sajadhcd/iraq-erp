"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderTree,
  Users,
  Truck,
  TrendingDown,
  Warehouse,
  Receipt,
  BarChart3,
  UserCheck,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Bell,
  User,
  ShieldCheck,
  Globe,
  Briefcase,
  FileText,
  ClipboardList,
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface SidebarItem {
  key: string;
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

const sidebarItems: SidebarItem[] = [
  { key: "dashboard", name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { key: "pos", name: "نقطة البيع (POS)", href: "/pos", icon: ShoppingCart },
  { key: "products", name: "المنتجات", href: "/products", icon: Package },
  { key: "categories", name: "أقسام المنتجات", href: "/categories", icon: FolderTree },
  { key: "sales", name: "المبيعات والفواتير", href: "/sales", icon: Receipt },
  { key: "inventory", name: "المخزون والمستودعات", href: "/inventory", icon: Warehouse },
  { key: "purchases", name: "المشتريات", href: "/purchases", icon: Truck },
  { key: "expenses", name: "المصروفات", href: "/expenses", icon: TrendingDown },
  { key: "accounting", name: "الحسابات العامة", href: "/accounting", icon: Receipt },
  { key: "crm", name: "علاقات العملاء CRM", href: "/crm", icon: Briefcase },
  { key: "quotations", name: "عروض الأسعار", href: "/crm/quotations", icon: FileText },
  { key: "sales-orders", name: "أوامر البيع والتسليم", href: "/sales-orders", icon: ClipboardList },
  { key: "customers", name: "العملاء", href: "/customers", icon: Users },
  { key: "suppliers", name: "الموردين", href: "/suppliers", icon: Users },
  { key: "reports", name: "التقارير والتحليلات", href: "/reports", icon: BarChart3 },
  { key: "employees", name: "الموظفين", href: "/employees", icon: ShieldCheck },
  { key: "users", name: "مستخدمي النظام", href: "/users", icon: UserCheck },
  { key: "settings", name: "الإعدادات العامة", href: "/settings", icon: SettingsIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email: string; name: string; role: string } | null>(null);
  const { t, i18n } = useTranslation(["common"]);

  useEffect(() => {
    // Check session
    const session = localStorage.getItem("sims_session");
    if (!session) {
      router.push("/login");
    } else {
      try {
        setCurrentUser(JSON.parse(session));
      } catch (e) {
        router.push("/login");
      }
    }
  }, [router]);

  const toggleLanguage = () => {
    const nextLang = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(nextLang);
    localStorage.setItem("sims_lang", nextLang);
    document.documentElement.dir = nextLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = nextLang;
  };

  const handleLogout = () => {
    localStorage.removeItem("sims_session");
    router.push("/login");
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  const isRtl = i18n.language === "ar";

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans" dir={isRtl ? "rtl" : "ltr"}>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex lg:flex-col lg:w-64 lg:bg-slate-900 lg:text-slate-300 lg:border-slate-800 ${isRtl ? "lg:border-l" : "lg:border-r"}`}>
        <div className="h-16 flex items-center px-6 bg-slate-950 border-b border-slate-800 gap-3">
          <Warehouse className="h-6 w-6 text-blue-500" />
          <span className="text-lg font-bold text-white tracking-wider">{t("appName")}</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                    : "hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {currentUser.role === "SUPER_ADMIN" ? t("superAdmin") : t("salesAgent")}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-slate-800 hover:text-white text-slate-400 transition"
              title={t("logout")}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden bg-slate-900/60 backdrop-blur-sm">
          <div className={`relative flex flex-col w-64 max-w-xs bg-slate-900 text-slate-300 h-full ${isRtl ? "animate-slide-in-right" : "animate-slide-in-left"}`}>
            <div className="h-16 flex items-center justify-between px-6 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Warehouse className="h-6 w-6 text-blue-500" />
                <span className="text-md font-bold text-white">{t("appName")}</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-lg"
                        : "hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{t(item.key)}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-white leading-tight">{currentUser.name}</span>
                  <span className="text-[10px] text-slate-400">
                    {currentUser.role === "SUPER_ADMIN" ? t("superAdmin") : t("salesAgent")}
                  </span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md border border-blue-100 text-xs">
                {t("defaultWarehouse")}
              </span>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500 font-normal hidden md:inline">{t("fiscalYear")}: 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 transition"
              title="تغيير اللغة / Change Language"
            >
              <Globe className="h-4 w-4" />
              <span>{t("langName")}</span>
            </button>

            {/* Notifications */}
            <div className="relative">
              <button className="p-2 rounded-full hover:bg-slate-100 text-slate-600 transition relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>
            </div>
            
            {/* Profile Dropdown */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <User className="h-5 w-5" />
              </div>
              <div className={`hidden md:flex flex-col ${isRtl ? "text-right" : "text-left"}`}>
                <span className="text-sm font-semibold text-slate-800 leading-tight">{currentUser.name}</span>
                <span className="text-xs text-slate-500 leading-tight">
                  {currentUser.role === "SUPER_ADMIN" ? t("superAdmin") : t("salesAgent")}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
