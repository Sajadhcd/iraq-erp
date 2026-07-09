"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Receipt, Printer, Eye, FileText } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface InvoiceItemDetails {
  product: { name: string };
  quantity: string;
  unitPrice: string;
  totalAmount: string;
}

interface SaleRecord {
  id: string;
  invoiceNumber: string;
  customer?: { name: string } | null;
  netAmount: string;
  taxAmount: string;
  status: string;
  createdAt: string;
  payments: Array<{ method: string }>;
  invoice?: {
    qrHash: string;
    invoiceItems: InvoiceItemDetails[];
  };
}

export default function SalesPage() {
  const { t, i18n } = useTranslation(["sales", "common"]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");
  const [taxRatePercentage, setTaxRatePercentage] = useState(0);
  const [companyName, setCompanyName] = useState("");
  const [companyTaxNo, setCompanyTaxNo] = useState("");

  useEffect(() => {
    fetchSales();
    fetchSettings();
  }, [i18n.language]);

  const fetchSettings = async () => {
    try {
      const settings = await apiRequest("/settings");
      settings.forEach((s: any) => {
        if (s.key === "TAX_RATE" || s.key === "VAT_RATE") {
          setTaxRatePercentage(parseFloat(s.value) || 0);
        }
        if (s.key === "COMPANY_NAME") {
          setCompanyName(s.value);
        }
        if (s.key === "TAX_NUMBER" || s.key === "VAT_NUMBER") {
          setCompanyTaxNo(s.value);
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
      console.warn("Failed fetching settings in sales ledger page");
    }
  };

  const fetchSales = async () => {
    try {
      const data = await apiRequest("/sales");
      setSales(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenInvoice = async (invoiceNumber: string) => {
    try {
      const invoiceData = await apiRequest(`/sales/invoice/${invoiceNumber}`);
      setSelectedInvoice(invoiceData);
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const isRtl = i18n.language === "ar";

  const filteredSales = sales.filter((s) => {
    return s.invoiceNumber.includes(searchTerm) || (s.customer?.name || t("cashCustomer")).includes(searchTerm);
  });

  const formatPrice = (val: string) => {
    const parsed = parseFloat(val) || 0;
    const locale = isRtl ? "ar-IQ" : "en-US";
    return `${parsed.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currencySymbol}`;
  };

  const formatDate = (dateStr: string) => {
    const locale = isRtl ? "ar-IQ" : "en-US";
    return new Date(dateStr).toLocaleString(locale);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={isRtl ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
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

        {/* Invoice table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-5">{t("tableInvoice")}</th>
                  <th className="py-3 px-5">{t("tableCustomer")}</th>
                  <th className="py-3 px-5">{t("tableTotal")}</th>
                  <th className="py-3 px-5">{t("tableTax")} ({taxRatePercentage}%)</th>
                  <th className="py-3 px-5">{t("tableDate")}</th>
                  <th className="py-3 px-5">{t("tablePaymentMethod")}</th>
                  <th className="py-3 px-5">{t("tableStatus")}</th>
                  <th className={`py-3 px-5 ${isRtl ? "text-left" : "text-right"}`}>{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-4 px-5 font-bold text-slate-800 flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-blue-500" />
                      {s.invoiceNumber}
                    </td>
                    <td className="py-4 px-5 text-slate-700">{s.customer?.name || t("cashCustomer")}</td>
                    <td className="py-4 px-5 font-black text-slate-900">{formatPrice(s.netAmount)}</td>
                    <td className="py-4 px-5 text-slate-500">{formatPrice(s.taxAmount)}</td>
                    <td className="py-4 px-5 text-slate-600 font-mono text-xs">
                      {formatDate(s.createdAt)}
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700 border">
                        {s.payments[0]?.method === "CASH" ? t("cash") : s.payments[0]?.method === "CARD" ? t("card") : t("cash")}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        {s.status === "COMPLETED" ? t("statusCompleted") : t("statusCancelled")}
                      </span>
                    </td>
                    <td className={`py-4 px-5 ${isRtl ? "text-left" : "text-right"}`}>
                      <button
                        onClick={() => handleOpenInvoice(s.invoiceNumber)}
                        className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-100 transition inline-flex items-center gap-1 text-xs font-bold"
                      >
                        <Eye className="h-4 w-4" />
                        <span>{t("viewInvoice")}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 shadow-2xl animate-fade-in my-8 overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            {/* Modal Actions */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
              <span className="text-sm font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-400" />
                {t("modalTitle")}
              </span>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-white text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Invoicing Printable Content */}
            <div className={`p-6 space-y-6 text-slate-800 ${isRtl ? "text-right" : "text-left"}`}>
              {/* Header Invoice Info */}
              <div className="text-center border-b border-slate-200 pb-4">
                <h2 className="text-lg font-bold text-slate-900">{t("simplifiedInvoice")}</h2>
                <p className="text-xs text-slate-450 mt-1">{companyName}</p>
                {companyTaxNo && (
                  <p className="text-[10px] text-slate-500">{t("taxNoLabel")} {companyTaxNo}</p>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block">{t("tableInvoice")}:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t("dateLabel")}</span>
                  <span className="font-bold text-slate-800">{formatDate(selectedInvoice.issueDate)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t("customerLabel")}</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.sale?.customer?.name || t("cashCustomer")}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">{t("paymentMethodLabel")}</span>
                  <span className="font-bold text-slate-800">{t("cashCard")}</span>
                </div>
              </div>

              {/* Items List */}
              <table className={`w-full text-xs border-collapse ${isRtl ? "text-right" : "text-left"}`}>
                <thead>
                  <tr className="border-b border-slate-300 font-bold text-slate-900 bg-slate-50">
                    <th className="py-2 px-2">{t("item")}</th>
                    <th className="py-2 px-2 text-center">{t("qty")}</th>
                    <th className="py-2 px-2 text-center">{t("price")}</th>
                    <th className={`py-2 px-2 ${isRtl ? "text-left" : "text-right"}`}>{t("total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.invoiceItems?.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-2.5 px-2">{item.product?.name}</td>
                      <td className="py-2.5 px-2 text-center">{parseFloat(item.quantity)}</td>
                      <td className="py-2.5 px-2 text-center">{formatPrice(item.unitPrice)}</td>
                      <td className={`py-2.5 px-2 font-bold ${isRtl ? "text-left" : "text-right"}`}>{formatPrice(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summaries & QR Code Integration */}
              <div className="flex gap-4 items-center justify-between pt-4 border-t border-slate-200">
                {/* Generic QR code mapping */}
                {selectedInvoice.qrHash && (
                  <div className="p-2 border rounded-xl bg-slate-50 shrink-0">
                    <div className="h-24 w-24 bg-white border flex flex-col items-center justify-center text-center text-[8px] text-slate-400 font-bold relative overflow-hidden">
                      <div className="absolute inset-0 grid grid-cols-6 gap-1 opacity-25">
                        {[...Array(36)].map((_, i) => (
                          <div key={i} className={`bg-black ${i % 4 === 0 ? "opacity-0" : ""}`} />
                        ))}
                      </div>
                      <span className="z-10 bg-white/85 p-0.5 rounded leading-tight">{t("qrTitle")}</span>
                    </div>
                  </div>
                )}

                {/* Final math */}
                <div className="flex-1 space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">{t("subtotalLabel")}</span>
                    <span>{formatPrice((parseFloat(selectedInvoice.sale?.netAmount) - parseFloat(selectedInvoice.sale?.taxAmount)).toString())}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium">
                    <span>{t("taxLabel")} ({taxRatePercentage}%)</span>
                    <span>{formatPrice(selectedInvoice.sale?.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-100 pt-1.5">
                    <span>{t("grandTotalLabel")}</span>
                    <span className="text-blue-600">{formatPrice(selectedInvoice.sale?.netAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Compliant notes */}
              <div className="text-center text-[10px] text-slate-400 border-t border-slate-100 pt-4">
                <p>{t("footerComplianceNote")}</p>
              </div>
            </div>

            {/* Modal actions footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3">
              <button onClick={() => window.print()} className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm">
                <Printer className="h-4 w-4" />
                <span>{t("printInvoice")}</span>
              </button>
              <button onClick={() => setSelectedInvoice(null)} className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition">
                {t("common:cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
