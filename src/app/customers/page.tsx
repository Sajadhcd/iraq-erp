"use client";

import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import DataTable from "@/components/ui/DataTable";
import { UserPlus, Phone, Mail, Award, Edit2, Trash2, Search } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import { showToast } from "@/components/ui/toast";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditLimit: string;
  balance: string;
  taxNumber: string | null;
  loyaltyPoints: number;
}

export default function CustomersPage() {
  const { t, i18n } = useTranslation(["customers", "common"]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Edit / Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Add Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [creditLimit, setCreditLimit] = useState("");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");
  const [editCreditLimit, setEditCreditLimit] = useState("");

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");

  useEffect(() => {
    fetchCustomers();
    fetchSettings();
  }, [i18n.language]);

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
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiRequest("/customers");
      setCustomers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      await apiRequest("/customers", {
        method: "POST",
        body: JSON.stringify({
          name,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          taxNumber: taxNumber || undefined,
          creditLimit: parseFloat(creditLimit) || 0.00,
        }),
      });

      setModalOpen(false);
      fetchCustomers();
      setName(""); setPhone(""); setEmail(""); setAddress(""); setTaxNumber(""); setCreditLimit("");
    } catch (err: any) {
      showToast(`${t("common:generalError")}: ${err.message}`, "error");
    }
  };

  const handleOpenEdit = (c: Customer) => {
    setSelectedCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || "");
    setEditEmail(c.email || "");
    setEditAddress(c.address || "");
    setEditTaxNumber(c.taxNumber || "");
    setEditCreditLimit(c.creditLimit);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await apiRequest(`/customers/${selectedCustomer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          phone: editPhone || undefined,
          email: editEmail || undefined,
          address: editAddress || undefined,
          taxNumber: editTaxNumber || undefined,
          creditLimit: parseFloat(editCreditLimit) || 0,
        }),
      });
      setEditModalOpen(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(`${t("common:generalError")}: ${err.message}`, "error");
    }
  };

  const handleOpenDelete = (c: Customer) => {
    setSelectedCustomer(c);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCustomer) return;
    try {
      await apiRequest(`/customers/${selectedCustomer.id}`, { method: "DELETE" });
      setDeleteConfirmOpen(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch (err: any) {
      showToast(`${t("common:generalError")}: ${err.message}`, "error");
    }
  };

  const term = (searchTerm ?? "").toLowerCase().trim();
  const filteredCustomers = (Array.isArray(customers) ? customers : []).filter(
    (c) => (c?.name ?? "").toLowerCase().includes(term) || (c?.phone ?? "").toLowerCase().includes(term),
  );

  const isRtl = i18n.language === "ar";

  const formatPrice = (val: string) => {
    const parsed = parseFloat(val) || 0;
    const locale = isRtl ? "ar-IQ" : "en-US";
    return `${parsed.toLocaleString(locale, { minimumFractionDigits: 2 })} ${currencySymbol}`;
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
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start">
            <UserPlus className="h-5 w-5" />
            <span>{t("addCustomer")}</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <input type="text" className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`} placeholder={t("searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search className={`absolute top-2.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
          </div>
        </div>

        {/* Customer Directory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {(Array.isArray(filteredCustomers) ? filteredCustomers : []).map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <h3 className="font-bold text-slate-800 text-md">{c?.name || "—"}</h3>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{t("taxNumberLabel")}{c?.taxNumber || t("notAvailable")}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    <span>{c?.loyaltyPoints ?? 0} {t("pointsSuffix")}</span>
                  </div>
                </div>
              </div>

              <div className={`space-y-2 border-t border-b border-slate-100 py-3 text-xs text-slate-600 ${isRtl ? "text-right" : "text-left"}`}>
                {c?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span>{c.phone}</span>
                  </div>
                )}
                {c?.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{c.email}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-xs" dir={isRtl ? "rtl" : "ltr"}>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <span className="text-slate-400 block">{t("balanceLabel")}</span>
                  <span className={`font-bold ${parseFloat(String(c?.balance ?? 0)) > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatPrice(String(c?.balance ?? 0))}
                  </span>
                </div>
                <div className={isRtl ? "text-left" : "text-right"}>
                  <span className="text-slate-400 block">{t("creditLimitLabel")}</span>
                  <span className="font-bold text-slate-700">{formatPrice(String(c?.creditLimit ?? 0))}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2 pt-2 border-t border-slate-100 ${isRtl ? "justify-start" : "justify-end"}`}>
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{t("common:edit")}</span>
                </button>
                <button
                  onClick={() => handleOpenDelete(c)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-lg text-xs font-bold transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{t("common:delete")}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Customer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTitle")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("name")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" placeholder={t("placeholderName")} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("phone")}</label>
                <input type="text" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder={t("placeholderPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("email")}</label>
                <input type="email" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder={t("placeholderEmail")} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("taxNumberField")}</label>
                <input type="text" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder={t("placeholderTaxNumber")} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("creditLimitField")} ({currencySymbol})</label>
                <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold" placeholder="0.00" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("addressField")}</label>
                <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm h-16" placeholder={t("placeholderAddress")} value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">{t("saveBtn")}</button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Edit2 className="h-4 w-4 text-blue-600" />{t("common:edit")} — {selectedCustomer.name}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("name")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("phone")}</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("email")}</label>
                <input type="email" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("creditLimitField")} ({currencySymbol})</label>
                <input type="number" step="0.01" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center font-bold" value={editCreditLimit} onChange={(e) => setEditCreditLimit(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">{t("common:save")}</button>
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteConfirmOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="p-6 space-y-4 text-center">
              <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto"><Trash2 className="h-7 w-7 text-rose-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">{t("deleteConfirmTitle")}</h3>
              <p className="text-slate-500 text-sm">{t("deleteConfirmMsg")} <span className="font-bold text-slate-800">"{selectedCustomer.name}"</span>?</p>
              <div className="flex gap-3 pt-2">
                <button onClick={handleConfirmDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition">{t("common:delete")}</button>
                <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
