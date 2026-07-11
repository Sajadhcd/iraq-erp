"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, ShoppingBag, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface PurchaseItem {
  product: { name: string };
  quantity: string;
  unitPrice: string;
  totalAmount: string;
}

interface PurchaseRecord {
  id: string;
  purchaseNumber?: string;
  poNumber?: string;
  supplier?: { companyName?: string };
  warehouse?: { name?: string };
  totalAmount?: string | number;
  status?: string;
  createdAt?: string;
  purchaseItems?: PurchaseItem[];
}

export default function PurchasesPage() {
  const { t, i18n } = useTranslation(["purchases", "common"]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");

  useEffect(() => {
    fetchPurchases();
    fetchSuppliersProducts();
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
      console.warn("Failed fetching settings in purchases page");
    }
  };

  const fetchPurchases = async () => {
    try {
      const data = await apiRequest("/purchasing");
      setPurchases(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSuppliersProducts = async () => {
    try {
      const supps = await apiRequest("/purchasing/suppliers");
      setSuppliers(supps);
      if (supps.length > 0) setSupplierId(supps[0].id);

      const prods = await apiRequest("/inventory/products");
      setProducts(prods);
      if (prods.length > 0) setProductId(prods[0].id);

      const whs = await apiRequest("/inventory/warehouses");
      setWarehouses(whs);
      if (whs.length > 0) setWarehouseId(whs[0].id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !warehouseId || !productId || !quantity || !unitPrice) return;

    try {
      await apiRequest("/purchasing", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          warehouseId,
          items: [
            {
              productId,
              quantity: parseFloat(quantity),
              unitPrice: parseFloat(unitPrice),
            },
          ],
        }),
      });

      setModalOpen(false);
      fetchPurchases();

      setQuantity("");
      setUnitPrice("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      await apiRequest(`/purchasing/${id}/receive`, {
        method: "POST",
      });
      fetchPurchases();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const term = (searchTerm ?? "").toLowerCase().trim();
  const filteredPurchases = purchases.filter((p) => {
    const pNumber = (p?.purchaseNumber ?? p?.poNumber ?? "").toLowerCase();
    const sName = (p?.supplier?.companyName ?? "").toLowerCase();
    return pNumber.includes(term) || sName.includes(term);
  });

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
            <span>{t("newPurchaseOrder")}</span>
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

        {/* Purchases registry list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-5">{t("tablePoNumber")}</th>
                  <th className="py-3 px-5">{t("tableSupplier")}</th>
                  <th className="py-3 px-5">{t("tableWarehouse")}</th>
                  <th className="py-3 px-5">{t("tableTotal")}</th>
                  <th className="py-3 px-5">{t("tableDate")}</th>
                  <th className="py-3 px-5">{t("tableStatus")}</th>
                  <th className={`py-3 px-5 ${isRtl ? "text-left" : "text-right"}`}>{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-4 px-5 font-bold text-slate-800 flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-slate-400" />
                      {p.purchaseNumber || p.poNumber || "—"}
                    </td>
                    <td className="py-4 px-5 text-slate-700">{p?.supplier?.companyName || "—"}</td>
                    <td className="py-4 px-5 text-slate-650">{p?.warehouse?.name || "—"}</td>
                    <td className="py-4 px-5 font-bold text-slate-900">{formatPrice(String(p?.totalAmount ?? 0))}</td>
                    <td className="py-4 px-5 text-slate-500 font-mono text-xs">
                      {p?.createdAt ? formatDate(p.createdAt) : "—"}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.status === "RECEIVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-100"
                      }`}>
                        {p.status === "RECEIVED" ? t("statusReceived") : t("statusSent")}
                      </span>
                    </td>
                    <td className={`py-4 px-5 ${isRtl ? "text-left" : "text-right"}`}>
                      {p.status === "PENDING" && (
                        <button
                          onClick={() => handleReceive(p.id)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-lg transition flex items-center gap-1 text-xs font-bold"
                          title={t("receiveGoodsBtn")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{t("receiveGoodsBtn")}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add PO Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTitle")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("supplierField")}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.companyName}</option>
                  ))}
                </select>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("warehouseField")}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className={`text-xs font-bold text-slate-700 mb-2 ${isRtl ? "text-right" : "text-left"}`}>{t("itemTitle")}</h4>
                <div className="space-y-3">
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("productLabel")}</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("qtyLabel")}</label>
                      <input
                        type="number"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">{t("unitPriceLabel")} ({currencySymbol})</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
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
