"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, Building2, User, Phone, Mail, MapPin, Edit2, Trash2 } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface Supplier {
  id: string;
  companyName: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  taxNumber: string | null;
}

export default function SuppliersPage() {
  const { t, i18n } = useTranslation(["suppliers", "common"]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Edit / Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Add Form State
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [taxNumber, setTaxNumber] = useState("");

  // Edit Form State
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editContactName, setEditContactName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTaxNumber, setEditTaxNumber] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const data = await apiRequest("/purchasing/suppliers");
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    try {
      await apiRequest("/purchasing/suppliers", {
        method: "POST",
        body: JSON.stringify({
          companyName,
          contactName: contactName || undefined,
          phone: phone || undefined,
          email: email || undefined,
          address: address || undefined,
          taxNumber: taxNumber || undefined,
        }),
      });

      setModalOpen(false);
      fetchSuppliers();
      setCompanyName(""); setContactName(""); setPhone(""); setEmail(""); setAddress(""); setTaxNumber("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenEdit = (s: Supplier) => {
    setSelectedSupplier(s);
    setEditCompanyName(s.companyName);
    setEditContactName(s.contactName || "");
    setEditPhone(s.phone || "");
    setEditEmail(s.email || "");
    setEditAddress(s.address || "");
    setEditTaxNumber(s.taxNumber || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    try {
      await apiRequest(`/purchasing/suppliers/${selectedSupplier.id}`, {
        method: "PUT",
        body: JSON.stringify({
          companyName: editCompanyName,
          contactName: editContactName || undefined,
          phone: editPhone || undefined,
          email: editEmail || undefined,
          address: editAddress || undefined,
          taxNumber: editTaxNumber || undefined,
        }),
      });
      setEditModalOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenDelete = (s: Supplier) => {
    setSelectedSupplier(s);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedSupplier) return;
    try {
      await apiRequest(`/purchasing/suppliers/${selectedSupplier.id}`, { method: "DELETE" });
      setDeleteConfirmOpen(false);
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) => s.companyName.includes(searchTerm) || (s.contactName && s.contactName.includes(searchTerm)),
  );

  const isRtl = i18n.language === "ar";

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
            <Plus className="h-5 w-5" />
            <span>{t("addSupplier")}</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <input type="text" className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`} placeholder={t("searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search className={`absolute top-2.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
          </div>
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSuppliers.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{s.companyName}</h3>
                      <span className="text-[10px] text-slate-400 font-medium">{t("taxNumberLabel")}{s.taxNumber || t("notAvailable")}</span>
                    </div>
                  </div>
                </div>

                <div className={`space-y-2 border-t border-slate-100 mt-4 pt-3 text-xs text-slate-650 ${isRtl ? "text-right" : "text-left"}`}>
                  {s.contactName && (
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-slate-400" /><span>{t("contactNameLabel")}{s.contactName}</span></div>
                  )}
                  {s.phone && (
                    <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><span>{s.phone}</span></div>
                  )}
                  {s.email && (
                    <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-slate-400" /><span>{s.email}</span></div>
                  )}
                  {s.address && (
                    <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-slate-400" /><span>{s.address}</span></div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2 pt-2 border-t border-slate-100 ${isRtl ? "justify-start" : "justify-end"}`}>
                <button
                  onClick={() => handleOpenEdit(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-lg text-xs font-bold transition"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  <span>{t("common:edit")}</span>
                </button>
                <button
                  onClick={() => handleOpenDelete(s)}
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

      {/* Add Supplier Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTitle")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("companyName")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" placeholder={t("placeholderCompanyName")} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("contactName")}</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" placeholder={t("placeholderContactName")} value={contactName} onChange={(e) => setContactName(e.target.value)} />
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
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("taxNumber")}</label>
                <input type="text" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder={t("placeholderTaxNumber")} value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("address")}</label>
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

      {/* Edit Supplier Modal */}
      {editModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Edit2 className="h-4 w-4 text-blue-600" />{t("common:edit")} — {selectedSupplier.companyName}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("companyName")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("contactName")}</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editContactName} onChange={(e) => setEditContactName(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("phone")}</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("email")}</label>
                <input type="email" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
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
      {deleteConfirmOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="p-6 space-y-4 text-center">
              <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto"><Trash2 className="h-7 w-7 text-rose-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">{t("deleteConfirmTitle")}</h3>
              <p className="text-slate-500 text-sm">{t("deleteConfirmMsg")} <span className="font-bold text-slate-800">"{selectedSupplier.companyName}"</span>?</p>
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
