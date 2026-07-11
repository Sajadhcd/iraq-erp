"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Warehouse, Plus, ArrowLeftRight } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface WarehouseRecord {
  id: string;
  name: string;
  code: string;
  location: string | null;
  inventories: Array<{ quantity: number }>;
}

interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  inventories: Array<{ warehouseId: string; quantity: number }>;
}

export default function InventoryPage() {
  const { t, i18n } = useTranslation(["inventory", "common"]);
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Add Warehouse Form
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");

  // Transfer Form
  const [productId, setProductId] = useState("");
  const [fromWarehouseId, setFromWarehouseId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const data = await apiRequest("/inventory/warehouses");
      setWarehouses(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest("/inventory/products");
      setProducts(data);
      if (data.length > 0) {
        setProductId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;

    try {
      await apiRequest("/inventory/warehouses", {
        method: "POST",
        body: JSON.stringify({ name, code, location: location || undefined }),
      });

      setModalOpen(false);
      fetchWarehouses();

      setName("");
      setCode("");
      setLocation("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity) return;

    try {
      await apiRequest("/inventory/transfer", {
        method: "POST",
        body: JSON.stringify({
          productId,
          fromWarehouseId,
          toWarehouseId,
          quantity: parseFloat(quantity),
        }),
      });

      setTransferModalOpen(false);
      fetchWarehouses();
      fetchProducts();

      setQuantity("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const getWarehouseStockSum = (wh: WarehouseRecord) => {
    return Array.isArray(wh?.inventories) ? wh.inventories.reduce((acc, inv) => acc + (parseFloat(String(inv.quantity)) || 0), 0) : 0;
  };

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
          <div className="flex gap-3 self-start">
            <button
              onClick={() => {
                if (warehouses.length > 1) {
                  setFromWarehouseId(warehouses[0].id);
                  setToWarehouseId(warehouses[1].id);
                }
                setTransferModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-sm font-bold transition shadow-md"
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>{t("transferBtn")}</span>
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20"
            >
              <Plus className="h-5 w-5" />
              <span>{t("addWarehouse")}</span>
            </button>
          </div>
        </div>

        {/* Warehouse list Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(Array.isArray(warehouses) ? warehouses : []).map((wh) => {
            const stockCount = getWarehouseStockSum(wh);
            return (
              <div key={wh.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 flex items-center justify-center">
                      <Warehouse className="h-5 w-5" />
                    </div>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <h3 className="font-bold text-slate-800 text-sm leading-tight">{wh.name}</h3>
                      <span className="text-[10px] text-slate-400 font-mono">CODE: {wh.code}</span>
                    </div>
                  </div>
                </div>

                <div className={`space-y-2 border-t border-slate-100 mt-4 pt-3 text-xs text-slate-600 ${isRtl ? "text-right" : "text-left"}`}>
                  <div className="flex justify-between">
                    <span>{t("locationLabel")}</span>
                    <span className="font-bold text-slate-800">{wh.location || t("common:general")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("unitsLabel")}</span>
                    <span className="font-bold text-slate-800">{stockCount} {t("unitsSuffix")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Warehouse Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalAddTitle")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleAddWarehouse} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("nameField")}</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  placeholder={t("placeholderName")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("codeField")}</label>
                <input
                  type="text"
                  required
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`}
                  placeholder="WH-XXX-01"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("locationField")}</label>
                <input
                  type="text"
                  className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`}
                  placeholder={t("placeholderLocation")}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md"
                >
                  {t("saveWarehouseBtn")}
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

      {/* Transfer Stock Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTransferTitle")}</h3>
              <button onClick={() => setTransferModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("transferProductField")}</label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("fromField")}</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("toField")}</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("qtyField")}</label>
                <input
                  type="number"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold text-slate-800"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md"
                >
                  {t("transferSubmitBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => setTransferModalOpen(false)}
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
