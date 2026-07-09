"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Building2, Save } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t, i18n } = useTranslation(["settings", "common"]);

  // Form states
  const [companyName, setCompanyName] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [country, setCountry] = useState("IQ");
  const [currency, setCurrency] = useState("IQD");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [invoiceFormat, setInvoiceFormat] = useState("STANDARD");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [timezone, setTimezone] = useState("Asia/Baghdad");
  const [numberLocale, setNumberLocale] = useState("ar-IQ");

  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [i18n.language]);

  const fetchSettings = async () => {
    try {
      const settings = await apiRequest("/settings");
      settings.forEach((s: { key: string; value: string }) => {
        if (s.key === "COMPANY_NAME") setCompanyName(s.value);
        if (s.key === "TAX_NUMBER" || s.key === "VAT_NUMBER") setTaxNumber(s.value);
        if (s.key === "TAX_RATE" || s.key === "VAT_RATE") setTaxRate(s.value);
        if (s.key === "DEFAULT_COUNTRY") setCountry(s.value);
        if (s.key === "DEFAULT_CURRENCY" || s.key === "CURRENCY") setCurrency(s.value);
        if (s.key === "INVOICE_NUMBERING_PREFIX") setInvoicePrefix(s.value);
        if (s.key === "INVOICE_FORMAT") setInvoiceFormat(s.value);
        if (s.key === "DATE_FORMAT") setDateFormat(s.value);
        if (s.key === "TIME_ZONE") setTimezone(s.value);
        if (s.key === "NUMBER_FORMATTING_LOCALE") setNumberLocale(s.value);
      });
    } catch (e) {
      console.error("Error loading settings from DB API", e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    try {
      await apiRequest("/settings", {
        method: "PUT",
        body: JSON.stringify({
          COMPANY_NAME: companyName,
          TAX_NUMBER: taxNumber,
          TAX_RATE: taxRate,
          DEFAULT_COUNTRY: country,
          DEFAULT_CURRENCY: currency,
          INVOICE_NUMBERING_PREFIX: invoicePrefix,
          INVOICE_FORMAT: invoiceFormat,
          DATE_FORMAT: dateFormat,
          TIME_ZONE: timezone,
          NUMBER_FORMATTING_LOCALE: numberLocale,
        }),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(`Error updating settings: ${err.message}`);
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={isRtl ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("desc")}</p>
        </div>

        {/* Success Banner */}
        {success && (
          <div className="p-4 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold flex items-center gap-2">
            <Save className="h-5 w-5" />
            <span>{t("saveSuccess")}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-500" />
            {t("companyProfile")}
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("companyName")}</label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("taxNumber")}</label>
                <input
                  type="text"
                  required
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"} font-mono`}
                  value={taxNumber}
                  onChange={(e) => setTaxNumber(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("taxRate")}</label>
                <input
                  type="number"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("defaultCountry")}</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  <option value="IQ">{t("iraq")}</option>
                  <option value="SA">{t("saudi")}</option>
                  <option value="AE">{t("uae")}</option>
                  <option value="JO">{t("jordan")}</option>
                  <option value="EG">{t("egypt")}</option>
                </select>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("defaultCurrency")}</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="IQD">{t("iqd")}</option>
                  <option value="USD">{t("usd")}</option>
                  <option value="SAR">{t("sar")}</option>
                </select>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("invoicePrefix")}</label>
                <input
                  type="text"
                  required
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"} font-mono`}
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("invoiceFormat")}</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={invoiceFormat}
                  onChange={(e) => setInvoiceFormat(e.target.value)}
                >
                  <option value="STANDARD">{t("standard")}</option>
                  <option value="THERMAL">{t("thermal")}</option>
                </select>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("dateFormat")}</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                >
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("timezone")}</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                >
                  <option value="Asia/Baghdad">Asia/Baghdad (GMT+3)</option>
                  <option value="Asia/Riyadh">Asia/Riyadh (GMT+3)</option>
                  <option value="Africa/Cairo">Africa/Cairo (GMT+3)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                </select>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("numberLocale")}</label>
                <select
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={numberLocale}
                  onChange={(e) => setNumberLocale(e.target.value)}
                >
                  <option value="ar-IQ">ar-IQ (العربية - العراق)</option>
                  <option value="ar-SA">ar-SA (العربية - السعودية)</option>
                  <option value="en-US">en-US (English - US)</option>
                </select>
              </div>
            </div>

            <div className={`pt-4 border-t border-slate-100 flex ${isRtl ? "justify-start" : "justify-end"}`}>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20"
              >
                <Save className="h-4 w-4" />
                <span>{t("saveBtn")}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
