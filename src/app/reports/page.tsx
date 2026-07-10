"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import { 
  FileText, BarChart3, Landmark, Users, Truck, Wallet, 
  Printer, Download, RefreshCw, Calendar, ChevronDown 
} from "lucide-react";

interface OptionItem {
  id: string;
  name: string;
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation(["financial_reports", "common"]);
  const isRtl = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<"trial" | "pl" | "bs" | "customer" | "supplier" | "ledger">("trial");

  // Filters state
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split("T")[0]);
  
  // Selection options
  const [customers, setCustomers] = useState<OptionItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  
  const [suppliers, setSuppliers] = useState<OptionItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  
  const [cashBankAccounts, setCashBankAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");

  // Report Data
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Settings
  const [currencySymbol, setCurrencySymbol] = useState("د.ع");

  useEffect(() => {
    fetchFiltersData();
    fetchSettings();
  }, []);

  useEffect(() => {
    handleGenerateReport();
  }, [activeTab]);

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
      console.warn("Failed fetching settings in reports page");
    }
  };

  const fetchFiltersData = async () => {
    try {
      // 1. Fetch Customers
      const custData = await apiRequest("/customers");
      const mappedCust = custData.map((c: any) => ({ id: c.id, name: c.name }));
      setCustomers(mappedCust);
      if (mappedCust.length > 0) setSelectedCustomerId(mappedCust[0].id);

      // 2. Fetch Suppliers
      const suppData = await apiRequest("/purchasing/suppliers");
      const mappedSupp = suppData.map((s: any) => ({ id: s.id, name: s.companyName }));
      setSuppliers(mappedSupp);
      if (mappedSupp.length > 0) setSelectedSupplierId(mappedSupp[0].id);

      // 3. Fetch Cash & Bank accounts
      const cbData = await apiRequest("/accounting/cash-bank");
      setCashBankAccounts(cbData);
      if (cbData.length > 0) setSelectedAccountId(cbData[0].id);
    } catch (e) {
      console.error("Error loading filter criteria", e);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      let endpoint = "";
      let queryParams = "";

      if (activeTab === "trial") {
        endpoint = "/reports/trial-balance";
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeTab === "pl") {
        endpoint = "/reports/profit-loss";
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeTab === "bs") {
        endpoint = "/reports/balance-sheet";
        queryParams = `?date=${asOfDate}`;
      } else if (activeTab === "customer") {
        if (!selectedCustomerId) return;
        endpoint = `/reports/customer-statement/${selectedCustomerId}`;
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeTab === "supplier") {
        if (!selectedSupplierId) return;
        endpoint = `/reports/supplier-statement/${selectedSupplierId}`;
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeTab === "ledger") {
        if (!selectedAccountId) return;
        endpoint = `/reports/ledger/${selectedAccountId}`;
        queryParams = `?startDate=${startDate}&endDate=${endDate}`;
      }

      if (endpoint) {
        const data = await apiRequest(`${endpoint}${queryParams}`);
        setReportData(data);
      }
    } catch (e) {
      console.error("Error fetching report details", e);
    } finally {
      setLoading(false);
    }
  };

  // Helper formatting
  const formatCurrency = (val: string | number | undefined) => {
    if (val === undefined) return "-";
    const parsed = typeof val === "string" ? parseFloat(val) : val;
    return (parsed || 0).toLocaleString(isRtl ? "ar-IQ" : "en-US", {
      style: "currency",
      currency: "IQD",
      maximumFractionDigits: 0
    });
  };

  const getAccountTypeName = (type: string) => {
    switch (type) {
      case "ASSET": return t("typeAsset");
      case "LIABILITY": return t("typeLiability");
      case "EQUITY": return t("typeEquity");
      case "REVENUE": return t("typeRevenue");
      case "EXPENSE": return t("typeExpense");
      default: return type;
    }
  };

  // CSV Export utility
  const handleExportCSV = () => {
    if (!reportData) return;

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // BOM for UTF-8 Excel support
    let filename = `${activeTab}_report.csv`;

    if (activeTab === "trial") {
      csvContent += `${t("colCode")},${t("colAccountName")},${t("colType")},${t("colDebit")},${t("colCredit")}\n`;
      reportData.accounts.forEach((acc: any) => {
        csvContent += `"${acc.code}","${isRtl ? acc.nameAr : acc.nameEn}","${acc.type}",${acc.endingDebit},${acc.endingCredit}\n`;
      });
      csvContent += `,${t("lblTotal")},,${reportData.totalDebit},${reportData.totalCredit}\n`;
    } 
    else if (activeTab === "pl") {
      csvContent += `"${t("plRevenue")}",${reportData.revenue}\n`;
      csvContent += `"${t("plCOGS")}",${reportData.cogs}\n`;
      csvContent += `"${t("plGrossProfit")}",${reportData.grossProfit}\n\n`;
      csvContent += `"${t("plExpenses")}"\n`;
      reportData.expenses.forEach((exp: any) => {
        csvContent += `,"${isRtl ? exp.nameAr : exp.nameEn}",${exp.amount}\n`;
      });
      csvContent += `,"${t("lblTotal")}",${reportData.totalExpenses}\n`;
      csvContent += `"${t("plNetProfit")}",${reportData.netProfit}\n`;
    } 
    else if (activeTab === "bs") {
      csvContent += `"${t("bsAssets")}"\n`;
      reportData.assets.forEach((item: any) => {
        csvContent += `,"${isRtl ? item.nameAr : item.nameEn}",${item.balance}\n`;
      });
      csvContent += `,"${t("bsTotalAssets")}",${reportData.totalAssets}\n\n`;

      csvContent += `"${t("bsLiabilities")}"\n`;
      reportData.liabilities.forEach((item: any) => {
        csvContent += `,"${isRtl ? item.nameAr : item.nameEn}",${item.balance}\n`;
      });
      csvContent += `,"${t("bsTotalLiabilities")}",${reportData.totalLiabilities}\n\n`;

      csvContent += `"${t("bsEquity")}"\n`;
      reportData.equity.forEach((item: any) => {
        csvContent += `,"${isRtl ? item.nameAr : item.nameEn}",${item.balance}\n`;
      });
      csvContent += `,"${t("bsTotalEquity")}",${reportData.totalEquity}\n\n`;
      csvContent += `"${t("bsTotalLiabilitiesAndEquity")}",${reportData.totalLiabilitiesAndEquity}\n`;
    }
    else if (activeTab === "customer" || activeTab === "supplier") {
      const partyName = activeTab === "customer" ? reportData.customer?.name : reportData.supplier?.companyName;
      csvContent += `"${partyName}"\n`;
      csvContent += `"${t("lblOpeningBalance")}",${reportData.openingBalance}\n\n`;
      csvContent += `"${t("colDate")}","${t("colRefNo")}","${t("colNotes")}","${t("colDebit")}","${t("colCredit")}","${t("colBalance")}"\n`;
      reportData.transactions.forEach((tx: any) => {
        csvContent += `"${new Date(tx.date).toLocaleDateString()}","${tx.reference}","${tx.notes || ""}",${tx.debit},${tx.credit},${tx.runningBalance}\n`;
      });
      csvContent += `\n"${t("lblClosingBalance")}",${reportData.closingBalance}\n`;
    }
    else if (activeTab === "ledger") {
      csvContent += `"${isRtl ? reportData.account?.nameAr : reportData.account?.nameEn}"\n`;
      csvContent += `"${t("lblOpeningBalance")}",${reportData.openingBalance}\n\n`;
      csvContent += `"${t("colDate")}","${t("colRefNo")}","${t("colNotes")}","${t("colDebitMovement")}","${t("colCreditMovement")}","${t("colBalance")}"\n`;
      reportData.transactions.forEach((tx: any) => {
        csvContent += `"${new Date(tx.date).toLocaleDateString()}","${tx.entryNumber}","${tx.notes || tx.description || ""}",${tx.debit},${tx.credit},${tx.runningBalance}\n`;
      });
      csvContent += `\n"${t("lblClosingBalance")}",${reportData.closingBalance}\n`;
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Printable Letterhead Header */}
        <div className="hidden print:block text-center border-b pb-4 mb-6">
          <h2 className="text-xl font-bold text-slate-800">{t("statementCompany")}</h2>
          <p className="text-xs text-slate-400 font-mono mt-1">SIMS ERP Automated Statement Roster Ledger</p>
          <div className="text-xs text-slate-500 mt-2 font-semibold">
            {t("statementDocTitle")} — {new Date().toLocaleDateString(isRtl ? "ar-IQ" : "en-US")}
          </div>
        </div>

        {/* Regular Interactive Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
          </div>
          
          <div className="flex gap-3 self-start">
            <button
              onClick={handleExportCSV}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold transition shadow-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>{t("btnExportExcel")}</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!reportData}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>{t("btnPrint")}</span>
            </button>
          </div>
        </div>

        {/* Tab Selection Navigation (Hidden in print) */}
        <div className="flex border-b border-slate-200 gap-6 overflow-x-auto print:hidden scrollbar-none pb-1">
          {[
            { id: "trial", name: t("tabTrialBalance"), icon: BarChart3 },
            { id: "pl", name: t("tabProfitLoss"), icon: FileText },
            { id: "bs", name: t("tabBalanceSheet"), icon: Landmark },
            { id: "customer", name: t("tabCustomerStatement"), icon: Users },
            { id: "supplier", name: t("tabSupplierStatement"), icon: Truck },
            { id: "ledger", name: t("tabLedgers"), icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-bold transition shrink-0 ${
                  isActive
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters Panel (Hidden in print) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
            
            {/* Conditional Filter input depending on Tab */}
            {activeTab === "customer" && (
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("filterCustomer")}</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === "supplier" && (
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("filterSupplier")}</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === "ledger" && (
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("filterAccount")}</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                >
                  {cashBankAccounts.map(cb => (
                    <option key={cb.id} value={cb.id}>
                      {cb.code} - {isRtl ? cb.nameAr : cb.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Inputs */}
            {activeTab !== "bs" ? (
              <>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("filterStartDate")}</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("filterEndDate")}</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                  />
                </div>
              </>
            ) : (
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("filterAsOfDate")}</label>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-blue-500 outline-none transition"
                />
              </div>
            )}

            <button
              onClick={handleGenerateReport}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition shadow-md w-full"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>{t("btnUpdateReport")}</span>
            </button>
          </div>
        </div>

        {/* Report Content Output */}
        
        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center shadow-sm">
            <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
            <span className="text-slate-400 text-sm font-bold mt-4">{t("common:loading")}</span>
          </div>
        )}

        {!loading && reportData && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm print:border-none print:shadow-none print:p-0">
            
            {/* Report 1: Trial Balance */}
            {activeTab === "trial" && (
              <div className="space-y-4">
                <h3 className="text-md font-bold text-slate-800 border-b pb-2 print:border-none">{t("tabTrialBalance")}</h3>
                <table className="w-full text-sm text-slate-600 text-center">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3">{t("colCode")}</th>
                      <th className="px-4 py-3">{t("colAccountName")}</th>
                      <th className="px-4 py-3">{t("colType")}</th>
                      <th className="px-4 py-3 text-emerald-600">{t("colDebit")}</th>
                      <th className="px-4 py-3 text-blue-600">{t("colCredit")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {(reportData?.accounts ?? []).map((acc: any) => (
                      <tr key={acc.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3 font-mono text-slate-500">{acc.code}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{isRtl ? acc.nameAr : acc.nameEn}</td>
                        <td className="px-4 py-3 text-xs">{getAccountTypeName(acc.type)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {acc.endingDebit > 0 ? formatCurrency(acc.endingDebit) : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">
                          {acc.endingCredit > 0 ? formatCurrency(acc.endingCredit) : "-"}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-bold text-base">
                      <td colSpan={3} className="px-4 py-3">{t("lblTotal")}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(reportData.totalDebit)}</td>
                      <td className="px-4 py-3 font-mono">{formatCurrency(reportData.totalCredit)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Report 2: Profit & Loss Statement */}
            {activeTab === "pl" && (
              <div className="space-y-6 max-w-xl mx-auto border p-6 rounded-2xl bg-slate-50/50">
                <h3 className="text-center font-bold text-slate-800 border-b pb-3 uppercase tracking-wider text-base">{t("tabProfitLoss")}</h3>
                
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex justify-between border-b pb-2 font-semibold">
                    <span className="text-slate-650">{t("plRevenue")}</span>
                    <span className="font-mono text-emerald-600">+{formatCurrency(reportData.revenue)}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2 font-semibold">
                    <span className="text-slate-650">{t("plCOGS")}</span>
                    <span className="font-mono text-rose-600">-{formatCurrency(reportData.cogs)}</span>
                  </div>

                  <div className="flex justify-between border-b pb-2.5 font-bold text-slate-800 text-md">
                    <span>{t("plGrossProfit")}</span>
                    <span className="font-mono text-blue-600">{formatCurrency(reportData.grossProfit)}</span>
                  </div>

                  {/* Expenses details */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">{t("plExpenses")}</h4>
                    {(reportData?.expenses ?? []).map((exp: any) => (
                      <div key={exp.code} className="flex justify-between text-xs px-3 py-1 bg-white border border-slate-100 rounded-lg">
                        <span className="text-slate-500 font-medium">
                          {isRtl ? exp.nameAr : exp.nameEn}
                          <span className="text-[10px] font-mono text-slate-400 block mt-0.5">CODE: {exp.code}</span>
                        </span>
                        <span className="font-mono text-slate-700 font-bold">{formatCurrency(exp.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t pt-2 font-semibold text-slate-700 text-xs px-2">
                      <span>{t("lblTotal")} {t("plExpenses")}</span>
                      <span className="font-mono text-rose-600">-{formatCurrency(reportData.totalExpenses)}</span>
                    </div>
                  </div>

                  {/* Net Profit Summary */}
                  <div className="bg-slate-900 rounded-xl p-5 border border-slate-800 text-white flex justify-between items-center text-base font-black mt-6">
                    <span>{t("plNetProfit")}</span>
                    <span className="font-mono text-blue-400 text-lg">{formatCurrency(reportData.netProfit)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Report 3: Balance Sheet */}
            {activeTab === "bs" && (
              <div className="space-y-6">
                <h3 className="text-md font-bold text-slate-800 border-b pb-2 print:border-none">{t("tabBalanceSheet")}</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Assets Left Side */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-sm text-blue-600 uppercase border-b pb-1">{t("bsAssets")}</h4>
                    <div className="space-y-2.5">
                      {(reportData?.assets ?? []).map((item: any) => (
                        <div key={item.code} className="flex justify-between text-sm px-2 py-1.5 hover:bg-slate-50 transition border-b border-dashed border-slate-150">
                          <span className="text-slate-650 font-medium">{isRtl ? item.nameAr : item.nameEn}</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between font-black text-slate-900 border-t pt-3.5 text-md px-2 bg-slate-50 p-2.5 rounded-lg border">
                      <span>{t("bsTotalAssets")}</span>
                      <span className="font-mono">{formatCurrency(reportData.totalAssets)}</span>
                    </div>
                  </div>

                  {/* Liabilities and Equity Right Side */}
                  <div className="space-y-6">
                    {/* Liabilities */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-purple-600 uppercase border-b pb-1">{t("bsLiabilities")}</h4>
                      <div className="space-y-2.5">
                        {(reportData?.liabilities ?? []).map((item: any) => (
                          <div key={item.code} className="flex justify-between text-sm px-2 py-1.5 hover:bg-slate-50 transition border-b border-dashed border-slate-150">
                            <span className="text-slate-650 font-medium">{isRtl ? item.nameAr : item.nameEn}</span>
                            <span className="font-mono font-bold text-slate-800">{formatCurrency(item.balance)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 border-t pt-2.5 text-sm px-2">
                        <span>{t("bsTotalLiabilities")}</span>
                        <span className="font-mono">{formatCurrency(reportData.totalLiabilities)}</span>
                      </div>
                    </div>

                    {/* Equity */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-sm text-emerald-600 uppercase border-b pb-1">{t("bsEquity")}</h4>
                      <div className="space-y-2.5">
                        {(reportData?.equity ?? []).map((item: any) => (
                          <div key={item.code} className="flex justify-between text-sm px-2 py-1.5 hover:bg-slate-50 transition border-b border-dashed border-slate-150">
                            <span className="text-slate-650 font-medium">{isRtl ? item.nameAr : item.nameEn}</span>
                            <span className="font-mono font-bold text-slate-800">{formatCurrency(item.balance)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold text-slate-800 border-t pt-2.5 text-sm px-2">
                        <span>{t("bsTotalEquity")}</span>
                        <span className="font-mono">{formatCurrency(reportData.totalEquity)}</span>
                      </div>
                    </div>

                    {/* Combined Liabilities and Equity */}
                    <div className="flex justify-between font-black text-slate-900 border-t pt-3.5 text-md px-2 bg-slate-50 p-2.5 rounded-lg border">
                      <span>{t("bsTotalLiabilitiesAndEquity")}</span>
                      <span className="font-mono">{formatCurrency(reportData.totalLiabilitiesAndEquity)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Report 4 & 5: Customer / Supplier Statement */}
            {(activeTab === "customer" || activeTab === "supplier") && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-3 print:border-none">
                  <h3 className="text-md font-bold text-slate-800">
                    {activeTab === "customer" ? t("tabCustomerStatement") : t("tabSupplierStatement")}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {t("lblOpeningBalance")}: <span className="font-mono font-bold text-slate-850">{formatCurrency(reportData.openingBalance)}</span>
                  </div>
                </div>

                <table className="w-full text-sm text-slate-600 text-center">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3">{t("colDate")}</th>
                      <th className="px-4 py-3">{t("colTypeHeader")}</th>
                      <th className="px-4 py-3">{t("colRefNo")}</th>
                      <th className="px-4 py-3">{t("colNotes")}</th>
                      <th className="px-4 py-3 text-rose-600">{t("colDebit")}</th>
                      <th className="px-4 py-3 text-emerald-600">{t("colCredit")}</th>
                      <th className="px-4 py-3">{t("colBalance")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {(reportData?.transactions ?? []).map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3">{new Date(tx.date).toLocaleDateString(isRtl ? "ar-IQ" : "en-US")}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === "PAYMENT" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            tx.type === "INVOICE" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{tx.reference}</td>
                        <td className="px-4 py-3 max-w-[150px] truncate">{tx.notes}</td>
                        <td className="px-4 py-3 font-mono font-bold">{tx.debit > 0 ? formatCurrency(tx.debit) : "-"}</td>
                        <td className="px-4 py-3 font-mono font-bold">{tx.credit > 0 ? formatCurrency(tx.credit) : "-"}</td>
                        <td className="px-4 py-3 font-mono font-black text-slate-800">{formatCurrency(tx.runningBalance)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-bold text-sm">
                      <td colSpan={6} className="px-4 py-3">{t("lblClosingBalance")}</td>
                      <td className="px-4 py-3 font-mono text-base">{formatCurrency(reportData.closingBalance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Report 6: Ledgers (Cash/Bank) */}
            {activeTab === "ledger" && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b pb-3 print:border-none">
                  <h3 className="text-md font-bold text-slate-800">
                    {isRtl ? reportData.account?.nameAr : reportData.account?.nameEn}
                    <span className="text-xs text-slate-400 font-mono block mt-1">({reportData.account?.code})</span>
                  </h3>
                  <div className="text-xs text-slate-500 font-medium">
                    {t("lblOpeningBalance")}: <span className="font-mono font-bold text-slate-850">{formatCurrency(reportData.openingBalance)}</span>
                  </div>
                </div>

                <table className="w-full text-sm text-slate-600 text-center">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3">{t("colDate")}</th>
                      <th className="px-4 py-3">{t("colRefNo")}</th>
                      <th className="px-4 py-3">{t("colNotes")}</th>
                      <th className="px-4 py-3 text-emerald-600">{t("colDebitMovement")}</th>
                      <th className="px-4 py-3 text-rose-600">{t("colCreditMovement")}</th>
                      <th className="px-4 py-3">{t("colBalance")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {(reportData?.transactions ?? []).map((tx: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition">
                        <td className="px-4 py-3">{new Date(tx.date).toLocaleDateString(isRtl ? "ar-IQ" : "en-US")}</td>
                        <td className="px-4 py-3 font-mono text-xs">{tx.entryNumber}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{tx.notes || tx.description || "-"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{tx.debit > 0 ? formatCurrency(tx.debit) : "-"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{tx.credit > 0 ? formatCurrency(tx.credit) : "-"}</td>
                        <td className="px-4 py-3 font-mono font-black text-slate-800">{formatCurrency(tx.runningBalance)}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-bold text-sm">
                      <td colSpan={5} className="px-4 py-3">{t("lblClosingBalance")}</td>
                      <td className="px-4 py-3 font-mono text-base">{formatCurrency(reportData.closingBalance)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
