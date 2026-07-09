"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FileBarChart2, Printer, Percent, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface FinancialSummary {
  revenue: number;
  expenses: number;
  netProfit: number;
  purchases?: number;
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation(["reports", "common"]);
  const [summary, setSummary] = useState<FinancialSummary>({
    revenue: 0,
    expenses: 0,
    netProfit: 0,
    purchases: 0,
  });

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");
  const [taxRatePercentage, setTaxRatePercentage] = useState(0);

  useEffect(() => {
    fetchReportData();
    fetchSettings();
  }, [i18n.language]);

  const fetchSettings = async () => {
    try {
      const settings = await apiRequest("/settings");
      settings.forEach((s: any) => {
        if (s.key === "TAX_RATE" || s.key === "VAT_RATE") {
          setTaxRatePercentage(parseFloat(s.value) || 0);
        }
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

  const fetchReportData = async () => {
    try {
      const data = await apiRequest("/reports/financial-summary");
      setSummary({
        revenue: data.revenue || 0,
        expenses: data.expenses || 0,
        netProfit: data.netProfit || 0,
        purchases: data.purchases || 0,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const isRtl = i18n.language === "ar";

  const formatPrice = (val: number) => {
    const locale = isRtl ? "ar-IQ" : "en-US";
    return `${val.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currencySymbol}`;
  };

  const salesTax = summary.revenue * (taxRatePercentage / 100);
  const purchaseTax = (summary.purchases || 0) * (taxRatePercentage / 100);
  const netVatDue = salesTax - purchaseTax;

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start">
            <Printer className="h-4 w-4" />
            <span>{t("printReport")}</span>
          </button>
        </div>

        {/* Financial metrics boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex justify-between items-center">
            <div className={isRtl ? "text-right" : "text-left"}>
              <span className="text-slate-500 text-xs font-semibold">{t("revenueLabel")}</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">
                {formatPrice(summary.revenue)}
              </h3>
            </div>
            <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex justify-between items-center">
            <div className={isRtl ? "text-right" : "text-left"}>
              <span className="text-slate-500 text-xs font-semibold">{t("expenseLabel")}</span>
              <h3 className="text-2xl font-black text-slate-800 mt-2">
                {formatPrice(summary.expenses + (summary.purchases || 0))}
              </h3>
            </div>
            <div className="h-10 w-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex justify-between items-center">
            <div className={isRtl ? "text-right" : "text-left"}>
              <span className="text-slate-500 text-xs font-semibold">{t("netProfitLabel")}</span>
              <h3 className="text-2xl font-black text-blue-600 mt-2">
                {formatPrice(summary.netProfit)}
              </h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <FileBarChart2 className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* VAT Tax Declaration Template */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Percent className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">{t("vatDeclaration")} ({taxRatePercentage}% VAT)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            {/* Output Tax (Sales) */}
            <div className="space-y-4">
              <h4 className={`font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border ${isRtl ? "text-right" : "text-left"}`}>{t("outputTaxTitle")}</h4>
              <div className="flex justify-between text-xs px-2" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{t("outputTaxBase")}</span>
                <span className="font-bold text-slate-800">{formatPrice(summary.revenue)}</span>
              </div>
              <div className="flex justify-between text-xs px-2 border-t border-slate-100 pt-2.5" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{t("outputTaxVal")} ({taxRatePercentage}%):</span>
                <span className="font-bold text-emerald-600">+{formatPrice(salesTax)}</span>
              </div>
            </div>

            {/* Input Tax (Purchases) */}
            <div className="space-y-4">
              <h4 className={`font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border ${isRtl ? "text-right" : "text-left"}`}>{t("inputTaxTitle")}</h4>
              <div className="flex justify-between text-xs px-2" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{t("inputTaxBase")}</span>
                <span className="font-bold text-slate-800">{formatPrice(summary.expenses + (summary.purchases || 0))}</span>
              </div>
              <div className="flex justify-between text-xs px-2 border-t border-slate-100 pt-2.5" dir={isRtl ? "rtl" : "ltr"}>
                <span className="text-slate-400">{t("inputTaxVal")} ({taxRatePercentage}%):</span>
                <span className="font-bold text-rose-600">-{formatPrice(purchaseTax)}</span>
              </div>
            </div>
          </div>

          {/* Net Vat Payables */}
          <div className="bg-slate-900 rounded-xl p-5 border border-slate-850 flex flex-col md:flex-row justify-between items-center text-white text-xs md:text-sm mt-6">
            <div className={isRtl ? "text-right" : "text-left"}>
              <span className="text-slate-400 block font-semibold mb-1">{t("netVatDueLabel")}</span>
              <span className="text-[10px] text-slate-500 block">{t("netVatDueFormula")}</span>
            </div>
            <div className={`font-black text-lg text-blue-400 ${isRtl ? "text-left" : "text-right"}`}>
              {formatPrice(netVatDue)}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
