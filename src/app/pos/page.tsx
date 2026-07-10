"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CreditCard,
  Percent,
  CheckCircle,
  Receipt,
} from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface POSProduct {
  id: string;
  name: string;
  sku: string;
  barcode: string;
  retailPrice: number;
  inventories: Array<{ quantity: number }>;
  category: { name: string };
}

interface CartItem {
  product: POSProduct;
  quantity: number;
}

export default function POSPage() {
  const { t, i18n } = useTranslation(["pos", "common"]);
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "DIGITAL_WALLET">("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [lastInvoiceNumber, setLastInvoiceNumber] = useState("");

  // Settings states
  const [currencySymbol, setCurrencySymbol] = useState("د.ع");
  const [taxRatePercentage, setTaxRatePercentage] = useState(0);

  useEffect(() => {
    setSelectedCategory("all");
    fetchProducts();
    fetchCategories();
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
      console.error("Error loading settings in POS page", e);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiRequest("/inventory/products");
      const mapped = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode || "",
        retailPrice: parseFloat(p.retailPrice),
        inventories: p.inventories || [],
        category: p.category || { name: "عام" },
      }));
      setProducts(mapped);
    } catch (e) {
      console.error("Error fetching products from backend API", e);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiRequest("/inventory/categories");
      const names = ["all", ...data.map((c: any) => c.name)];
      setCategoriesList(names);
    } catch (e) {
      console.error("Error fetching categories from backend API", e);
    }
  };

  const getProductStock = (p: POSProduct) => {
    return p.inventories.reduce((acc, inv) => acc + parseFloat(inv.quantity as any), 0);
  };

  // Filter products based on search
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.includes(searchTerm) ||
      p.barcode.includes(searchTerm) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "الكل" ||
      selectedCategory === "All" ||
      selectedCategory === "all" ||
      p.category.name === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: POSProduct) => {
    const stock = getProductStock(product);
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= stock) {
        alert(i18n.language === "ar" ? "لا يمكن إضافة كمية أكبر من المخزون المتاح!" : "Cannot add more than available stock!");
        return;
      }
      setCart(cart.map((item) => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        const stock = getProductStock(item.product);
        if (newQty > stock) {
          alert(i18n.language === "ar" ? "لا يمكن تجاوز كمية المخزون المتاحة!" : "Cannot exceed available stock!");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  // Cart Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.product.retailPrice * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (taxRatePercentage / 100);
  const total = taxableAmount + taxAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setAmountPaid(total.toFixed(2));
    setPaymentModalOpen(true);
  };

  const handleProcessPayment = async () => {
    try {
      const response = await apiRequest("/sales/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            unitPrice: i.product.retailPrice,
          })),
          paymentMethod,
          amountPaid: parseFloat(amountPaid),
          discountAmount,
        }),
      });

      setLastInvoiceNumber(response.invoiceNumber);
      setPaymentModalOpen(false);
      setOrderSuccess(true);
      fetchProducts(); // Refresh stocks from DB
    } catch (err: any) {
      alert(`Checkout failed: ${err.message}`);
    }
  };

  const resetPOS = () => {
    setCart([]);
    setDiscountPercent(0);
    setOrderSuccess(false);
  };

  const isRtl = i18n.language === "ar";

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] gap-6 overflow-hidden -m-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Right side: Products search & Grid */}
        <div className={`flex-1 flex flex-col bg-white p-6 overflow-hidden ${isRtl ? "border-l border-slate-200" : "border-r border-slate-200"}`}>
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
            <div className="relative flex-1">
              <input
                type="text"
                className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className={`absolute top-3 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
            </div>
            
            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {cat === "all" ? t("allCategories") : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Grid list */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
              {filteredProducts.map((p) => {
                const stock = getProductStock(p);
                return (
                  <button
                    key={p.id}
                    disabled={stock <= 0}
                    onClick={() => addToCart(p)}
                    className="flex flex-col text-right bg-slate-50 hover:bg-slate-100 border border-slate-200/60 rounded-2xl p-4 transition-all duration-205 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed group relative"
                  >
                    {stock <= 5 && stock > 0 && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] rounded font-bold">{t("limited")}</span>
                    )}
                    {stock === 0 && (
                      <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded font-bold">{t("outOfStock")}</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-semibold mb-1">{p.category?.name}</span>
                    <span className={`text-xs font-bold text-slate-800 line-clamp-2 h-8 group-hover:text-blue-600 transition ${isRtl ? "text-right" : "text-left"}`}>{p.name}</span>
                    <span className="text-[10px] text-slate-400 mt-1 font-mono">SKU: {p.sku}</span>
                    
                    <div className="mt-4 flex items-center justify-between w-full pt-3 border-t border-slate-200/50">
                      <span className="text-sm font-bold text-blue-600">{p.retailPrice.toFixed(2)} {currencySymbol}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded">{t("available")} {stock}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Left side: Invoicing Cart panel */}
        <div className="w-96 flex flex-col bg-slate-900 text-slate-300 p-6 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4 shrink-0">
            <h3 className="text-md font-bold text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-blue-400" />
              {t("cartTitle")} ({cart.length})
            </h3>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="p-1 rounded hover:bg-slate-800 text-rose-400 transition" title="Clear Cart">
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Cart list items */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <ShoppingCart className="h-10 w-10 text-slate-600" />
                <span className="text-xs">{t("emptyCart")}</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-white leading-tight w-2/3">{item.product.name}</span>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-slate-500 hover:text-rose-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 bg-slate-800 hover:bg-slate-700 rounded-md text-white">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold px-2 text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 bg-slate-800 hover:bg-slate-700 rounded-md text-white">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-xs font-bold text-blue-400">{(item.product.retailPrice * item.quantity).toFixed(2)} {currencySymbol}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Summary pricing and actions */}
          <div className="border-t border-slate-800 pt-4 mt-4 space-y-3 shrink-0">
            <div className="flex justify-between text-xs">
              <span className="text-slate-550">{t("subtotal")}</span>
              <span className="text-slate-300 font-bold">{subtotal.toFixed(2)} {currencySymbol}</span>
            </div>

            {/* Discount selector */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-550">{t("discount")}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-12 px-1 py-0.5 bg-slate-850 border border-slate-800 rounded text-center text-white font-bold"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                />
                <Percent className="h-3 w-3 text-slate-500" />
              </div>
            </div>

            <div className="flex justify-between text-xs">
              <span className="text-slate-550">{t("tax")} ({taxRatePercentage}%):</span>
              <span className="text-slate-300 font-bold">{taxAmount.toFixed(2)} {currencySymbol}</span>
            </div>

            <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
              <span>{t("total")}</span>
              <span className="text-blue-400">{total.toFixed(2)} {currencySymbol}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard className="h-5 w-5" />
              <span>{t("payBtn")}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payment Drawer Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{t("checkoutTitle")}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("payMethod")}</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { type: "CASH", name: t("cash") },
                    { type: "CARD", name: t("card") },
                    { type: "DIGITAL_WALLET", name: t("wallet") },
                  ].map((m) => (
                    <button
                      key={m.type}
                      onClick={() => setPaymentMethod(m.type as any)}
                      className={`py-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
                        paymentMethod === m.type
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("amountReq")}</label>
                <div className="text-xl font-black text-slate-800 bg-slate-50 p-3 rounded-xl border text-center">
                  {total.toFixed(2)} {currencySymbol}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">{t("paidAmount")}</label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold text-lg text-slate-800"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>

              {parseFloat(amountPaid) - total > 0 && (
                <div className="flex justify-between items-center text-sm font-semibold p-2 bg-emerald-50 rounded-lg text-emerald-700">
                  <span>{t("change")}</span>
                  <span>{(parseFloat(amountPaid) - total).toFixed(2)} {currencySymbol}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleProcessPayment}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md"
              >
                {t("confirm")}
              </button>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="px-5 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm text-center border border-slate-200 flex flex-col items-center">
            <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{t("successMsg")}</h3>
            <p className="text-slate-500 text-xs mb-6">{t("invoiceNo")} <span className="font-bold text-slate-800">{lastInvoiceNumber}</span></p>
            
            <div className="w-full space-y-2 mb-6">
              <button className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5">
                <Receipt className="h-4 w-4" />
                {t("printReceipt")}
              </button>
              <button className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition">
                {t("emailReceipt")}
              </button>
            </div>

            <button
              onClick={resetPOS}
              className="px-6 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition"
            >
              {t("newOrder")}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
