"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, Calendar } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface ExpenseRecord {
  id: string;
  category: string;
  amount: string;
  taxAmount: string;
  referenceNumber: string | null;
  description: string | null;
  createdAt: string;
}

export default function ExpensesPage() {
  const { t, i18n } = useTranslation(["accounting", "common"]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [category, setCategory] = useState("rent");
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [description, setDescription] = useState("");

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");
  const [taxRatePercentage, setTaxRatePercentage] = useState(0);

  const categories = [
    { key: "rent", name: t("categoriesList.rent") },
    { key: "salaries", name: t("categoriesList.salaries") },
    { key: "maintenance", name: t("categoriesList.maintenance") },
    { key: "marketing", name: t("categoriesList.marketing") },
    { key: "stationery", name: t("categoriesList.stationery") },
  ];

  useEffect(() => {
    fetchExpenses();
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
      console.warn("Failed fetching settings in expenses page");
    }
  };

  const fetchExpenses = async () => {
    try {
      const data = await apiRequest("/expenses");
      setExpenses(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount || !taxAmount) return;

    try {
      const displayCategoryName = categories.find(c => c.key === category)?.name || category;

      await apiRequest("/expenses", {
        method: "POST",
        body: JSON.stringify({
          category: displayCategoryName,
          amount: parseFloat(amount),
          taxAmount: parseFloat(taxAmount),
          referenceNumber: referenceNumber || undefined,
          description: description || undefined,
        }),
      });

      setModalOpen(false);
      fetchExpenses();

      setAmount("");
      setTaxAmount("");
      setReferenceNumber("");
      setDescription("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const amt = parseFloat(val) || 0;
    const computedTax = amt * (taxRatePercentage / 100);
    setTaxAmount(computedTax.toFixed(2));
  };

  const term = (searchTerm ?? "").toLowerCase().trim();
  const filteredExpenses = (Array.isArray(expenses) ? expenses : []).filter(
    (e) => (e?.category ?? "").toLowerCase().includes(term) || (e?.description ?? "").toLowerCase().includes(term),
  );

  const isRtl = i18n.language === "ar";

  const formatPrice = (val: string) => {
    const parsed = parseFloat(val) || 0;
    const locale = isRtl ? "ar-IQ" : "en-US";
    return `${parsed.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currencySymbol}`;
  };

  const formatDate = (dateStr: string) => {
    const locale = isRtl ? "ar-IQ" : "en-US";
    return new Date(dateStr).toLocaleDateString(locale);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
          >
            <Plus className="h-5 w-5" />
            <span>{t("addExpense")}</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`}
              placeholder={t("searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className={`absolute top-2.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-5">{t("tableReference")}</th>
                  <th className="py-3 px-5">{t("tableCategory")}</th>
                  <th className="py-3 px-5">{t("tableTotal")}</th>
                  <th className="py-3 px-5">{t("tableTax")} ({taxRatePercentage}%)</th>
                  <th className="py-3 px-5">{t("tableDate")}</th>
                  <th className={`py-3 px-5 ${isRtl ? "text-left" : "text-right"}`}>{t("tableDescription")}</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(filteredExpenses) ? filteredExpenses : []).map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-4 px-5 font-bold text-slate-800 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {e?.referenceNumber || t("internalVoucher")}
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                        {e?.category || "—"}
                      </span>
                    </td>
                    <td className="py-4 px-5 font-black text-rose-600">{formatPrice(String(e?.amount ?? 0))}</td>
                    <td className="py-4 px-5 text-slate-500 font-semibold">{formatPrice(String(e?.taxAmount ?? 0))}</td>
                    <td className="py-4 px-5 text-slate-500 font-mono text-xs">
                      {e?.createdAt ? formatDate(e.createdAt) : "—"}
                    </td>
                    <td className={`py-4 px-5 text-slate-600 max-w-xs truncate ${isRtl ? "text-right" : "text-left"}`}>{e?.description || t("noDescription")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTitle")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("categoryLabel")}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("amountLabel")}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold text-rose-650"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                  />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("taxLabel")} ({taxRatePercentage}%)*</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    readOnly
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-center font-semibold text-slate-600 focus:outline-none"
                    value={taxAmount}
                  />
                </div>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("referenceLabel")}</label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`}
                  placeholder={t("placeholderReference")}
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("descriptionLabel")}</label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm h-20"
                  placeholder={t("placeholderDescription")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md"
                >
                  {t("submitBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition"
                >
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
