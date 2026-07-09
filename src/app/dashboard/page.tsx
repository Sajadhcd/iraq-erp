"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import {
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
    netProfit: 0,
  });
  const [productsCount, setProductsCount] = useState(0);
  const [currencySymbol, setCurrencySymbol] = useState("د.ع");

  useEffect(() => {
    setMounted(true);
    fetchDashboardData();
    fetchSettings();
  }, [i18n.language]);

  const fetchSettings = async () => {
    try {
      const settings = await apiRequest("/settings");
      settings.forEach((s: any) => {
        if (s.key === "DEFAULT_CURRENCY" || s.key === "CURRENCY") {
          const symbolMap: Record<string, string> = {
            IQD: "د.ع",
            USD: "$",
            SAR: "ر.س",
            AED: "د.إ",
          };
          setCurrencySymbol(symbolMap[s.value] || s.value);
        }
      });
    } catch (e) {
      console.warn("Failed fetching settings in dashboard");
    }
  };

  const fetchDashboardData = async () => {
    try {
      const report = await apiRequest("/reports/financial-summary");
      setSummary(report);

      const productsList = await apiRequest("/inventory/products");
      setProductsCount(productsList.length);
    } catch (e) {
      console.warn("Failed fetching live metrics. Using defaults.");
    }
  };

  const formatCurrency = (val: number) => {
    const locale = i18n.language === "ar" ? "ar-IQ" : "en-US";
    return `${val.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currencySymbol}`;
  };

  const staticSalesData = [
    { name: t("weekdays.sat"), sales: 12000, profit: 3400 },
    { name: t("weekdays.sun"), sales: 18000, profit: 5100 },
    { name: t("weekdays.mon"), sales: 15000, profit: 4200 },
    { name: t("weekdays.tue"), sales: 22000, profit: 6800 },
    { name: t("weekdays.wed"), sales: 25000, profit: 7900 },
    { name: t("weekdays.thu"), sales: 30000, profit: 9200 },
    { name: t("weekdays.fri"), sales: 8000, profit: 2100 },
  ];

  const staticCategoryData = [
    { name: t("categories.electronics"), value: 45000, color: "#3b82f6" },
    { name: t("categories.food"), value: 28000, color: "#10b981" },
    { name: t("categories.clothing"), value: 18000, color: "#f59e0b" },
    { name: t("categories.household"), value: 14000, color: "#ef4444" },
  ];

  const kpis = [
    {
      title: t("salesCard"),
      value: formatCurrency(summary.revenue),
      change: "+12.5%",
      positive: true,
      icon: ShoppingCart,
      color: "bg-blue-500",
    },
    {
      title: t("netProfitCard"),
      value: formatCurrency(summary.netProfit),
      change: "+14.2%",
      positive: true,
      icon: TrendingUp,
      color: "bg-emerald-500",
    },
    {
      title: t("productsCount"),
      value: `${productsCount} ${t("activeLabel")}`,
      change: "+4.1%",
      positive: true,
      icon: Package,
      color: "bg-amber-500",
    },
    {
      title: t("expensesCard"),
      value: formatCurrency(summary.expenses),
      change: "+2.1%",
      positive: false,
      icon: AlertTriangle,
      color: "bg-rose-500",
    },
  ];

  const recentTransactions = [
    { id: "IQ-INV-001", customer: i18n.language === "ar" ? "مكتب بغداد للتجارة" : "Baghdad Trade Office", amount: formatCurrency(12450), status: t("completed"), date: i18n.language === "ar" ? "منذ 10 دقائق" : "10m ago" },
    { id: "IQ-INV-002", customer: i18n.language === "ar" ? "خالد عبد الرحمن" : "Khalid Abdulrahman", amount: formatCurrency(320), status: t("completed"), date: i18n.language === "ar" ? "منذ 25 دقيقة" : "25m ago" },
    { id: "IQ-INV-003", customer: i18n.language === "ar" ? "مجموعة النهرين" : "Al-Nahrain Group", amount: formatCurrency(5800), status: t("pending"), date: i18n.language === "ar" ? "منذ ساعة" : "1h ago" },
  ];

  const isRtl = i18n.language === "ar";

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Welcome Section */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("welcome")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("welcomeDesc")}</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition shadow-sm font-semibold">
              {t("filterWeekly")}
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition shadow-md shadow-blue-500/20">
              {t("exportData")}
            </button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{kpi.title}</span>
                  <h3 className="text-xl font-black text-slate-800">{kpi.value}</h3>
                  <div className="flex items-center gap-1">
                    {kpi.positive ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    )}
                    <span className={`text-xs font-bold ${kpi.positive ? "text-emerald-500" : "text-rose-500"}`}>
                      {kpi.change}
                    </span>
                    <span className="text-slate-400 text-[10px]">{t("comparisonText")}</span>
                  </div>
                </div>
                <div className={`h-12 w-12 rounded-xl ${kpi.color} flex items-center justify-center text-white shadow-lg shadow-slate-100`}>
                  <Icon className="h-6 w-6" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Sales Trend Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
            <h3 className={`text-md font-bold text-slate-800 mb-6 ${isRtl ? "text-right" : "text-left"}`}>{t("salesTrend")}</h3>
            <div className="h-80 w-full">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={staticSalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ direction: isRtl ? "rtl" : "ltr", borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Area type="monotone" dataKey="sales" name={i18n.language === "ar" ? "المبيعات" : "Sales"} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                    <Area type="monotone" dataKey="profit" name={i18n.language === "ar" ? "الأرباح" : "Profit"} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Category Distribution Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h3 className={`text-md font-bold text-slate-800 mb-6 ${isRtl ? "text-right" : "text-left"}`}>{t("salesByCat")}</h3>
            <div className="h-60 w-full relative flex items-center justify-center">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={staticCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {staticCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ direction: isRtl ? "rtl" : "ltr", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="space-y-2 mt-4">
              {staticCategoryData.map((cat, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs" dir={isRtl ? "rtl" : "ltr"}>
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-600">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tables section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent invoices */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-md font-bold text-slate-800">{t("recentInvoices")}</h3>
              <button className="text-xs text-blue-600 font-bold hover:underline">{t("viewAll")}</button>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold">
                    <th className="py-3 px-4">{t("invoiceNumber")}</th>
                    <th className="py-3 px-4">{t("customer")}</th>
                    <th className="py-3 px-4">{t("amount")}</th>
                    <th className="py-3 px-4">{t("status")}</th>
                    <th className={`py-3 px-4 ${isRtl ? "text-left" : "text-right"}`}>{t("date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.map((tx, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4 font-semibold text-slate-800">{tx.id}</td>
                      <td className="py-3 px-4 text-slate-600">{tx.customer}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{tx.amount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          tx.status === t("completed") ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          tx.status === t("pending") ? "bg-amber-50 text-amber-700 border border-amber-100" :
                          "bg-rose-50 text-rose-700 border border-rose-100"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-slate-400 text-xs ${isRtl ? "text-left" : "text-right"}`}>{tx.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warehouse status */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-bold text-slate-800">{t("warehouseStatus")}</h3>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold">{t("safe")}</span>
              </div>
              <div className="space-y-4">
                <div className={`p-3 bg-slate-50 rounded-xl border border-slate-100 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-xs font-semibold text-slate-800 block">{t("common:defaultWarehouse")}</span>
                  <span className="text-[10px] text-slate-400 block mt-1">{t("operatingNormal")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
