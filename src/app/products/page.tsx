"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  Barcode,
  Eye,
  Filter,
  X,
} from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  category: { id: string; name: string };
  brand: { name: string } | null;
  costPrice: string;
  retailPrice: string;
  inventories: Array<{ quantity: number }>;
  alertQuantity: string;
  isActive: boolean;
}

export default function ProductsPage() {
  const { t, i18n } = useTranslation(["products", "common"]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [modalOpen, setModalOpen] = useState(false);

  // Edit / View / Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Add Form State
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brand, setBrand] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [retailPrice, setRetailPrice] = useState("");
  const [stock, setStock] = useState("");
  const [unit, setUnit] = useState("PCS");
  const [alertQuantity, setAlertQuantity] = useState("10");

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editBarcode, setEditBarcode] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editCostPrice, setEditCostPrice] = useState("");
  const [editRetailPrice, setEditRetailPrice] = useState("");
  const [editAlertQuantity, setEditAlertQuantity] = useState("10");

  const [currencySymbol, setCurrencySymbol] = useState("د.ع");

  useEffect(() => {
    fetchProducts();
    fetchCategories();
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
      console.warn("Failed fetching settings in products page");
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest("/inventory/products");
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiRequest("/inventory/categories");
      setCategories(data);
      if (data.length > 0) {
        setCategoryId(data[0].id);
        setEditCategoryId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getProductStock = (p: Product) => {
    return p.inventories.reduce((acc, inv) => acc + parseFloat(inv.quantity as any), 0);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.includes(searchTerm) || p.sku.toLowerCase().includes(searchTerm.toLowerCase()) || (p.barcode && p.barcode.includes(searchTerm));
    const allText = i18n.language === "ar" ? "الكل" : "All";
    const matchesCategory = selectedCategory === "الكل" || selectedCategory === "All" || selectedCategory === allText || p.category.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku || !costPrice || !retailPrice) return;

    try {
      const warehouses = await apiRequest("/inventory/warehouses");
      const defaultWhId = warehouses[0]?.id;

      await apiRequest("/inventory/products", {
        method: "POST",
        body: JSON.stringify({
          name,
          sku,
          barcode: barcode || undefined,
          categoryId,
          costPrice: parseFloat(costPrice),
          retailPrice: parseFloat(retailPrice),
          unit,
          alertQuantity: parseFloat(alertQuantity),
          initialStock: parseFloat(stock) || 0,
          warehouseId: defaultWhId,
        }),
      });

      setModalOpen(false);
      fetchProducts();

      setName("");
      setSku("");
      setBarcode("");
      setCostPrice("");
      setRetailPrice("");
      setStock("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenEdit = (p: Product) => {
    setSelectedProduct(p);
    setEditName(p.name);
    setEditSku(p.sku);
    setEditBarcode(p.barcode || "");
    setEditCategoryId(p.category?.id || (categories[0]?.id ?? ""));
    setEditBrand(p.brand?.name || "");
    setEditCostPrice(p.costPrice);
    setEditRetailPrice(p.retailPrice);
    setEditAlertQuantity(p.alertQuantity);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await apiRequest(`/inventory/products/${selectedProduct.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          sku: editSku,
          barcode: editBarcode || undefined,
          categoryId: editCategoryId,
          costPrice: parseFloat(editCostPrice),
          retailPrice: parseFloat(editRetailPrice),
          alertQuantity: parseFloat(editAlertQuantity),
        }),
      });

      setEditModalOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenDelete = (p: Product) => {
    setSelectedProduct(p);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      await apiRequest(`/inventory/products/${selectedProduct.id}`, {
        method: "DELETE",
      });
      setDeleteConfirmOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenView = (p: Product) => {
    setSelectedProduct(p);
    setViewModalOpen(true);
  };

  const isRtl = i18n.language === "ar";
  const allLabel = isRtl ? "الكل" : "All";

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
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
          >
            <Plus className="h-5 w-5" />
            <span>{t("addProduct")}</span>
          </button>
        </div>

        {/* Filters and Search */}
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

          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <Filter className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs text-slate-500 shrink-0 font-semibold">{t("filterBy")}</span>
            <button
              onClick={() => setSelectedCategory(allLabel)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                selectedCategory === allLabel ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
              }`}
            >
              {allLabel}
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.name)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                  selectedCategory === cat.name ? "bg-slate-900 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-6">{t("tableProduct")}</th>
                  <th className="py-3 px-6">{t("tableSku")}</th>
                  <th className="py-3 px-6">{t("tableCategory")}</th>
                  <th className="py-3 px-6">{t("costPrice")}</th>
                  <th className="py-3 px-6">{t("retailPrice")}</th>
                  <th className="py-3 px-6">{t("tableStock")}</th>
                  <th className="py-3 px-6">{t("tableStatus")}</th>
                  <th className={`py-3 px-6 ${isRtl ? "text-left" : "text-right"}`}>{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((p) => {
                  const stock = getProductStock(p);
                  const isLowStock = stock <= parseFloat(p.alertQuantity);
                  return (
                    <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        <div className="flex flex-col">
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col text-slate-600 font-mono text-xs">
                          <span>{p.sku}</span>
                          {p.barcode && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Barcode className="h-3 w-3" />
                              {p.barcode}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-slate-700">{p.category?.name}</span>
                          <span className="text-[10px] text-slate-400">{p.brand?.name || t("common:general")}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-700">{formatPrice(p.costPrice)}</td>
                      <td className="py-4 px-6 font-bold text-blue-600">{formatPrice(p.retailPrice)}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isLowStock ? "text-rose-600" : "text-slate-800"}`}>
                            {stock}
                          </span>
                          {isLowStock && (
                            <span className="p-0.5 bg-rose-50 text-rose-600 rounded border border-rose-100" title="Low stock warning!">
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : "bg-slate-50 text-slate-600 border border-slate-100"
                        }`}>
                          {p.isActive ? t("statusActive") : t("statusInactive")}
                        </span>
                      </td>
                      <td className={`py-4 px-6 ${isRtl ? "text-left" : "text-right"}`}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenView(p)}
                            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition"
                            title={t("viewDetails")}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="p-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-lg border border-slate-200 hover:border-blue-100 transition"
                            title={t("common:edit")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(p)}
                            className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 transition"
                            title={t("common:delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTitle")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("productName")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" placeholder={t("placeholderName")} value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("sku")}</label>
                  <input type="text" required className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder={t("placeholderSku")} value={sku} onChange={(e) => setSku(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("category")}</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("brand")}</label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" placeholder="Apple, Almarai..." value={brand} onChange={(e) => setBrand(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("purchasePrice")}</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold" placeholder="0.00" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("sellingPrice")}</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center font-bold" placeholder="0.00" value={retailPrice} onChange={(e) => setRetailPrice(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("initialQty")}</label>
                  <input type="number" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center" placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("alertQty")}</label>
                  <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-center" value={alertQuantity} onChange={(e) => setAlertQuantity(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("barcodeUpc")}</label>
                  <input type="text" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder={t("barcodePlaceholder")} value={barcode} onChange={(e) => setBarcode(e.target.value)} />
                </div>

                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("unit")}</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" value={unit} onChange={(e) => setUnit(e.target.value)}>
                    <option value="PCS">{t("unitPcs")}</option>
                    <option value="KG">{t("unitKg")}</option>
                    <option value="LITER">{t("unitLiter")}</option>
                    <option value="BOX">{t("unitBox")}</option>
                    <option value="PACK">{t("unitPack")}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">
                  {t("saveBtn")}
                </button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-blue-600" />
                {t("editProduct")} — {selectedProduct.name}
              </h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("productName")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("sku")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editSku} onChange={(e) => setEditSku(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("category")}</label>
                  <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("barcodeUpc")}</label>
                  <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editBarcode} onChange={(e) => setEditBarcode(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("purchasePrice")}</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center font-bold" value={editCostPrice} onChange={(e) => setEditCostPrice(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("sellingPrice")}</label>
                  <input type="number" step="0.01" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center font-bold" value={editRetailPrice} onChange={(e) => setEditRetailPrice(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("alertQty")}</label>
                  <input type="number" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center" value={editAlertQuantity} onChange={(e) => setEditAlertQuantity(e.target.value)} />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">
                  {t("common:save")}
                </button>
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {viewModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
              <h3 className="text-md font-bold text-white">{selectedProduct.name}</h3>
              <button onClick={() => setViewModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold">×</button>
            </div>
            <div className={`p-6 space-y-3 text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <div className="flex justify-between"><span className="text-slate-400">{t("tableSku")}:</span><span className="font-bold font-mono">{selectedProduct.sku}</span></div>
              {selectedProduct.barcode && <div className="flex justify-between"><span className="text-slate-400">{t("barcodeUpc")}:</span><span className="font-bold font-mono">{selectedProduct.barcode}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">{t("tableCategory")}:</span><span className="font-bold">{selectedProduct.category?.name}</span></div>
              {selectedProduct.brand && <div className="flex justify-between"><span className="text-slate-400">{t("brand")}:</span><span className="font-bold">{selectedProduct.brand.name}</span></div>}
              <div className="flex justify-between"><span className="text-slate-400">{t("purchasePrice")}:</span><span className="font-bold text-slate-700">{formatPrice(selectedProduct.costPrice)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">{t("sellingPrice")}:</span><span className="font-bold text-blue-600">{formatPrice(selectedProduct.retailPrice)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">{t("tableStock")}:</span><span className="font-bold">{getProductStock(selectedProduct)}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">{t("tableStatus")}:</span><span className={`font-bold ${selectedProduct.isActive ? "text-emerald-600" : "text-slate-500"}`}>{selectedProduct.isActive ? t("statusActive") : t("statusInactive")}</span></div>
            </div>
            <div className="px-6 pb-4">
              <button onClick={() => setViewModalOpen(false)} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition">
                {t("common:cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="p-6 space-y-4 text-center">
              <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto">
                <Trash2 className="h-7 w-7 text-rose-600" />
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{t("deleteConfirmTitle")}</h3>
              <p className="text-slate-500 text-sm">{t("deleteConfirmMsg")} <span className="font-bold text-slate-800">"{selectedProduct.name}"</span>?</p>
              <div className="flex gap-3 pt-2">
                <button onClick={handleConfirmDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition">
                  {t("common:delete")}
                </button>
                <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">
                  {t("common:cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
