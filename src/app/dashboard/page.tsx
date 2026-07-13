"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { TrendingUp, Package, ShoppingCart, AlertTriangle, ArrowUpRight, ArrowDownRight, Clock, CalendarRange, UserCheck, ShieldAlert, Award, FileText, MapPin, CheckCircle, RefreshCw } from "lucide-react";
import { apiRequest } from "@/services/api";
import { showToast } from '@/components/ui/toast';
import { useTranslation } from "react-i18next";
import { usePermissions } from "@/hooks/usePermissions";
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from "recharts";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const isRtl = i18n.language === "ar";
  const { role, currentUser } = usePermissions();

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");

  // Accounting State
  const [summary, setSummary] = useState({ revenue: 0, expenses: 0, netProfit: 0 });
  const [productsCount, setProductsCount] = useState(0);

  // HR State
  const [employeesCount, setEmployeesCount] = useState(0);
  const [pendingLeaves, setPendingLeaves] = useState(0);
  const [todayCheckedIn, setTodayCheckedIn] = useState(0);

  // Sales State
  const [salesOrdersCount, setSalesOrdersCount] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [quotationsCount, setQuotationsCount] = useState(0);

  // Inventory State
  const [totalStockQty, setTotalStockQty] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [warehousesCount, setWarehousesCount] = useState(0);

  // Employee State
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [myAttendanceCount, setMyAttendanceCount] = useState(0);
  const [myLeavesCount, setMyLeavesCount] = useState(0);
  const [myLastPayslip, setMyLastPayslip] = useState(0);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchSettings();
    if (currentUser) {
      loadRoleDashboardData();
    }
  }, [currentUser, i18n.language]);

  const fetchSettings = async () => {
    try {
      const settings = await apiRequest("/settings");
      settings.forEach((s: any) => {
        if (s.key === "DEFAULT_CURRENCY" || s.key === "CURRENCY") {
          const symbolMap: Record<string, string> = { IQD: "د.ع", USD: "$", SAR: "ر.س", AED: "د.إ" };
          setCurrencySymbol(symbolMap[s.value] || s.value);
        }
      });
    } catch (e) {
      console.warn("Failed fetching settings");
    }
  };

  const loadRoleDashboardData = async () => {
    const userRole = role || currentUser?.role;
    try {
      if (userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "ACCOUNTING_MANAGER" || userRole === "ACCOUNTANT" || userRole === "AUDITOR") {
        // Load Financial summary
        const report = await apiRequest("/reports/financial-summary").catch(() => ({ revenue: 0, expenses: 0, netProfit: 0 }));
        setSummary(report);
        const productsList = await apiRequest("/inventory/products").catch(() => []);
        setProductsCount(productsList.length);
      }

      if (userRole === "HR_MANAGER" || userRole === "HR_EMPLOYEE" || userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
        const emps = await apiRequest("/employees").catch(() => []);
        setEmployeesCount(emps.length);
        const leaves = await apiRequest("/leave").catch(() => []);
        setPendingLeaves(leaves.filter((l: any) => l.status === "SUBMITTED").length);
        const atts = await apiRequest("/attendance").catch(() => []);
        const todayStr = new Date().toISOString().split("T")[0];
        const presentToday = atts.filter((a: any) => a.attendanceDate.startsWith(todayStr) && a.status === "PRESENT").length;
        setTodayCheckedIn(presentToday);
      }

      if (userRole === "SALES_MANAGER" || userRole === "SALES_AGENT" || userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
        const orders = await apiRequest("/sales-orders").catch(() => []);
        setSalesOrdersCount(orders.length);
        const custs = await apiRequest("/customers").catch(() => []);
        setCustomersCount(custs.length);
        const quotes = await apiRequest("/crm/quotations").catch(() => []);
        setQuotationsCount(quotes.length);
      }

      if (userRole === "INVENTORY_MANAGER" || userRole === "WAREHOUSE_EMPLOYEE" || userRole === "SUPER_ADMIN" || userRole === "ADMIN") {
        const prods = await apiRequest("/inventory/products").catch(() => []);
        const whs = await apiRequest("/inventory/warehouses").catch(() => []);
        setWarehousesCount(whs.length);

        // Sum quantities
        let stockSum = 0;
        let lowCount = 0;
        prods.forEach((p: any) => {
          let qty = 0;
          p.inventories?.forEach((inv: any) => { qty += Number(inv.quantity); });
          stockSum += qty;
          if (qty <= Number(p.alertQuantity || 10)) {
            lowCount++;
          }
        });
        setTotalStockQty(stockSum);
        setLowStockCount(lowCount);
      }

      // Check current employee status
      if (currentUser) {
        // Fetch personal stats
        const emps = await apiRequest("/employees").catch(() => []);
        const myEmp = emps.find((e: any) => e.userId === currentUser.id);
        if (myEmp) {
          const myAtts = await apiRequest(`/attendance?employeeId=${myEmp.id}`).catch(() => []);
          setMyAttendanceCount(myAtts.length);
          const todayStr = new Date().toISOString().split("T")[0];
          const todayCheck = myAtts.find((a: any) => a.attendanceDate.startsWith(todayStr));
          if (todayCheck) {
            setIsCheckedIn(true);
            setCheckInTime(todayCheck.checkIn ? new Date(todayCheck.checkIn).toLocaleTimeString() : null);
          }
          const myLeaves = await apiRequest(`/leave`).catch(() => []);
          setMyLeavesCount(myLeaves.filter((l: any) => l.employeeId === myEmp.id).length);
          
          const slips = await apiRequest("/payroll/payslips").catch(() => []);
          const mySlips = slips.filter((s: any) => s.payrollItem?.employeeId === myEmp.id);
          if (mySlips.length > 0) {
            setMyLastPayslip(Number(mySlips[0].payrollItem?.netSalary || 0));
          }
        }
      }
    } catch (err) {
      console.warn("Failed fetching live dashboard metrics. Using defaults.");
    }
  };

  const handleCheckInOut = async () => {
    if (!currentUser) return;
    try {
      const emps = await apiRequest("/employees").catch(() => []);
      const myEmp = emps.find((e: any) => e.userId === currentUser.id);
      if (!myEmp) {
        showToast(isRtl ? "حساب المستخدم غير مربوط بملف موظف" : "This user account is not linked to any employee record.", 'warning');
        return;
      }

      if (!isCheckedIn) {
        // Check-in
        await apiRequest("/attendance/check-in", {
          method: "POST",
          body: JSON.stringify({ employeeId: myEmp.id })
        });
        showToast(isRtl ? "تم تسجيل الحضور بنجاح!" : "Checked in successfully!", 'success');
      } else {
        // Check-out
        await apiRequest("/attendance/check-out", {
          method: "PUT",
          body: JSON.stringify({ employeeId: myEmp.id })
        });
        showToast(isRtl ? "تم تسجيل الانصراف بنجاح!" : "Checked out successfully!", 'success');
      }
      loadRoleDashboardData();
    } catch (e: any) {
      showToast(`Error: ${e.message}`, 'error');
    }
  };

  const formatCurrency = (val: number) => {
    const locale = isRtl ? "ar-IQ" : "en-US";
    return `${val.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currencySymbol}`;
  };

  const userRole = role || currentUser?.role;

  // Chart data
  const staticSalesData = [
    { name: isRtl ? "السبت" : "Sat", sales: 12000, profit: 3400 },
    { name: isRtl ? "الأحد" : "Sun", sales: 18000, profit: 5100 },
    { name: isRtl ? "الاثنين" : "Mon", sales: 15000, profit: 4200 },
    { name: isRtl ? "الثلاثاء" : "Tue", sales: 22000, profit: 6800 },
    { name: isRtl ? "الأربعاء" : "Wed", sales: 25000, profit: 7900 },
    { name: isRtl ? "الخميس" : "Thu", sales: 30000, profit: 9200 },
    { name: isRtl ? "الجمعة" : "Fri", sales: 8000, profit: 2100 },
  ];

  const staticCategoryData = [
    { name: isRtl ? "إلكترونيات" : "Electronics", value: 45000, color: "#3b82f6" },
    { name: isRtl ? "مواد غذائية" : "Food Products", value: 28000, color: "#10b981" },
    { name: isRtl ? "ملابس وأزياء" : "Apparel", value: 18000, color: "#f59e0b" },
    { name: isRtl ? "مستلزمات منزلية" : "Household", value: 14000, color: "#ef4444" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* Welcome Block */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {isRtl ? `أهلاً بك، ${currentUser?.name || "المستخدم"}` : `Welcome back, ${currentUser?.name || "User"}`}
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {isRtl
                ? `أنت مسجل كـ (${userRole}). إليك ملخص مؤشرات الأداء الحالية لمسؤولياتك.`
                : `You are logged in as (${userRole}). Here is your dashboard summary.`}
            </p>
          </div>
          <button
            onClick={loadRoleDashboardData}
            className="p-2.5 bg-white hover:bg-slate-100 rounded-lg text-slate-650 font-bold transition flex items-center gap-1 border shadow-sm self-start text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{isRtl ? "تحديث البيانات" : "Refresh Metrics"}</span>
          </button>
        </div>

        {/* 1. FINANCIAL / ACCOUNTING / SUPER_ADMIN VIEW */}
        {(userRole === "SUPER_ADMIN" || userRole === "ADMIN" || userRole === "ACCOUNTING_MANAGER" || userRole === "ACCOUNTANT" || userRole === "AUDITOR") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "إيرادات المبيعات" : "Sales Revenue"}</span>
                  <h3 className="text-xl font-black text-slate-800">{formatCurrency(summary.revenue)}</h3>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-500">+12.5%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow shadow-blue-500/20">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "المصروفات التشغيلية" : "Operating Expenses"}</span>
                  <h3 className="text-xl font-black text-slate-800">{formatCurrency(summary.expenses)}</h3>
                  <div className="flex items-center gap-1">
                    <ArrowDownRight className="h-4 w-4 text-rose-500" />
                    <span className="text-xs font-bold text-rose-500">+2.1%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow shadow-rose-500/20">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "صافي الأرباح" : "Net Profit Balance"}</span>
                  <h3 className="text-xl font-black text-slate-800">{formatCurrency(summary.netProfit)}</h3>
                  <div className="flex items-center gap-1">
                    <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-bold text-emerald-500">+14.2%</span>
                  </div>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow shadow-emerald-500/20">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "المنتجات النشطة بالكتالوج" : "Catalog Products"}</span>
                  <h3 className="text-xl font-black text-slate-800">{productsCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "منتج مفعل بالمستودعات" : "Active products"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow shadow-amber-500/20">
                  <Package className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
                <h3 className={`text-sm font-bold text-slate-800 mb-6 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "منحنى المبيعات الأسبوعي والأرباح" : "Weekly Sales Revenue & Profit Trend"}</h3>
                <div className="h-72 w-full">
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
                        <Tooltip />
                        <Area type="monotone" dataKey="sales" name={isRtl ? "المبيعات" : "Sales"} stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                        <Area type="monotone" dataKey="profit" name={isRtl ? "الأرباح" : "Profit"} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                <h3 className={`text-sm font-bold text-slate-800 mb-6 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "توزيع الإيرادات حسب الأقسام" : "Sales Revenue by Category"}</h3>
                <div className="h-60 w-full relative flex items-center justify-center">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={staticCategoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                          {staticCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. HR VIEW */}
        {(userRole === "HR_MANAGER" || userRole === "HR_EMPLOYEE") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "إجمالي الموظفين" : "Total Employees"}</span>
                  <h3 className="text-xl font-black text-slate-800">{employeesCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "ملف موظف نشط بالنظام" : "Active staff profiles"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow shadow-blue-500/20">
                  <UserCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "طلبات الإجازات المعلقة" : "Pending Leave Requests"}</span>
                  <h3 className="text-xl font-black text-slate-800">{pendingLeaves}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "طلبات بانتظار الاعتماد" : "Awaiting approval"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow shadow-amber-500/20">
                  <CalendarRange className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "المسجلين حضور اليوم" : "Checked In Today"}</span>
                  <h3 className="text-xl font-black text-slate-800">{todayCheckedIn}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "تم إثبات حضورهم اليوم" : "Staff present today"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow shadow-emerald-500/20">
                  <Clock className="h-6 w-6" />
                </div>
              </div>
            </div>

            {/* Department bar chart */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-3xl">
              <h3 className="text-sm font-bold text-slate-800 mb-6">{isRtl ? "تعداد الموظفين حسب الأقسام الإدارية" : "Employee Count by Corporate Department"}</h3>
              <div className="h-64">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: isRtl ? "الإدارة" : "Admin", count: 4 },
                      { name: isRtl ? "المبيعات" : "Sales", count: 8 },
                      { name: isRtl ? "المخازن" : "Warehouse", count: 5 },
                      { name: isRtl ? "المحاسبة" : "Accounting", count: 3 },
                      { name: isRtl ? "الموارد البشرية" : "HR", count: 2 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name={isRtl ? "عدد الموظفين" : "Employee Count"} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. SALES VIEW */}
        {(userRole === "SALES_MANAGER" || userRole === "SALES_AGENT") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "أوامر البيع والطلبيات" : "Sales Orders Count"}</span>
                  <h3 className="text-xl font-black text-slate-800">{salesOrdersCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "طلب معتمد في النظام" : "Total sales orders"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow shadow-blue-500/20">
                  <ShoppingCart className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "العملاء المسجلين" : "Registered Customers"}</span>
                  <h3 className="text-xl font-black text-slate-800">{customersCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "عميل مسجل في CRM" : "CRM customers catalog"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow shadow-emerald-500/20">
                  <UserCheck className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "عروض الأسعار المالية" : "Financial Quotations"}</span>
                  <h3 className="text-xl font-black text-slate-800">{quotationsCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "عرض مالي مسجل" : "Quotations generated"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow shadow-amber-500/20">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-3xl">
              <h3 className="text-sm font-bold text-slate-800 mb-4">{isRtl ? "حالة الصفقات وعروض الأسعار" : "Quotation Funnel Statuses"}</h3>
              <div className="h-60">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: isRtl ? "مسودة" : "Draft", count: 3 },
                      { name: isRtl ? "مقدمة للعميل" : "Submitted", count: 7 },
                      { name: isRtl ? "معتمدة" : "Approved", count: 12 },
                      { name: isRtl ? "مرفوضة" : "Rejected", count: 2 },
                      { name: isRtl ? "تم تحويلها لأمر بيع" : "Converted", count: 8 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" name={isRtl ? "العدد" : "Count"} fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. INVENTORY VIEW */}
        {(userRole === "INVENTORY_MANAGER" || userRole === "WAREHOUSE_EMPLOYEE") && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "إجمالي المخزون السلعي" : "Total Stock Qty"}</span>
                  <h3 className="text-xl font-black text-slate-800">{totalStockQty}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "قطعة مخزنة في المستودعات" : "Units stored"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow shadow-blue-500/20">
                  <Package className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "إنذارات نقص المخزون" : "Low Stock Alerts"}</span>
                  <h3 className="text-xl font-black text-rose-600">{lowStockCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "منتجات تحت حد الطلب" : "Products below limit"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow shadow-rose-500/20">
                  <ShieldAlert className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-center justify-between">
                <div className={`space-y-2 ${isRtl ? "text-right" : "text-left"}`}>
                  <span className="text-slate-500 text-xs font-semibold">{isRtl ? "المستودعات الفعالة" : "Active Warehouses"}</span>
                  <h3 className="text-xl font-black text-slate-800">{warehousesCount}</h3>
                  <span className="text-[10px] text-slate-400 font-bold">{isRtl ? "مستودعات نشطة" : "Active warehouses count"}</span>
                </div>
                <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow shadow-amber-500/20">
                  <MapPin className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-lg">
              <div className="flex items-center gap-2 text-rose-700 font-bold mb-4">
                <ShieldAlert className="h-5 w-5" />
                <span>{isRtl ? "تحذيرات هامة: منتجات قاربت على النفاد" : "Critical Stock Depletions Warnings"}</span>
              </div>
              <div className="space-y-3 text-xs font-semibold text-slate-650">
                <p className="text-slate-500">{isRtl ? "المنتجات التالية انخفض رصيدها عن كمية التنبيه المحددة لها. يرجى تزويدها فوراً:" : "The following items require immediate restock as balances are below alert quantity limit:"}</p>
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
                  <div className="p-3 bg-rose-50/50 flex justify-between items-center">
                    <span>{isRtl ? "شاحن لاسلكي سريع" : "Fast Wireless Charger"}</span>
                    <span className="text-rose-600 font-mono font-bold">5 {isRtl ? "قطع متبقية" : "Units Left"}</span>
                  </div>
                  <div className="p-3 bg-rose-50/50 flex justify-between items-center">
                    <span>{isRtl ? "سماعات بلوتوث برو" : "Bluetooth Headphones Pro"}</span>
                    <span className="text-rose-600 font-mono font-bold">2 {isRtl ? "قطع متبقية" : "Units Left"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. GENERAL EMPLOYEE PERSONAL VIEW */}
        {userRole === "EMPLOYEE" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Quick check-in check-out widget */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span>{isRtl ? "إثبات الحضور والانصراف" : "Daily Attendance Check"}</span>
                </h3>
                <p className="text-slate-550 text-xs font-semibold leading-relaxed">
                  {isCheckedIn
                    ? (isRtl ? `أنت مسجل حضور اليوم. توقيت الدخول: ${checkInTime}` : `You are checked in today. Entry time: ${checkInTime}`)
                    : (isRtl ? "لم يتم إثبات حضورك اليوم بعد. يرجى تسجيل الدخول لبدء ساعات العمل." : "You have not checked in yet today. Please record attendance.")}
                </p>
              </div>
              <button
                onClick={handleCheckInOut}
                className={`w-full py-3 rounded-xl font-bold transition shadow-md flex items-center justify-center gap-2 ${
                  isCheckedIn
                    ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                }`}
              >
                <UserCheck className="h-5 w-5" />
                <span>{isCheckedIn ? (isRtl ? "تسجيل انصراف (Check Out)" : "Record Check Out") : (isRtl ? "تسجيل حضور (Check In)" : "Record Check In")}</span>
              </button>
            </div>

            {/* Stats list */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 bg-slate-50 rounded-2xl flex flex-col justify-between border border-slate-100">
                <span className="text-slate-500 text-xs font-bold">{isRtl ? "سجل الحضور هذا الشهر" : "My Attendance This Month"}</span>
                <div className="flex items-baseline gap-1.5 mt-4">
                  <span className="text-2xl font-black text-slate-800">{myAttendanceCount}</span>
                  <span className="text-xs text-slate-400 font-bold">{isRtl ? "أيام مسجلة" : "Days"}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl flex flex-col justify-between border border-slate-100">
                <span className="text-slate-500 text-xs font-bold">{isRtl ? "طلبات الإجازة الخاصة بي" : "My Leave Requests"}</span>
                <div className="flex items-baseline gap-1.5 mt-4">
                  <span className="text-2xl font-black text-slate-800">{myLeavesCount}</span>
                  <span className="text-xs text-slate-400 font-bold">{isRtl ? "طلب إجازة" : "Requests"}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl flex flex-col justify-between border border-slate-100">
                <span className="text-slate-500 text-xs font-bold">{isRtl ? "آخر صافي راتب مستحق" : "My Last Net Payslip"}</span>
                <div className="flex items-baseline gap-1.5 mt-4">
                  <span className="text-xl font-black text-slate-850">{myLastPayslip > 0 ? formatCurrency(myLastPayslip) : "—"}</span>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
