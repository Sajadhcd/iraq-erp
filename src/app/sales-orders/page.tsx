"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import {
  FileText,
  Warehouse,
  Search,
  Plus,
  Printer,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  Truck,
  AlertCircle,
  Trash2,
  X,
  Lock,
} from "lucide-react";

interface SalesOrderItem {
  id: string;
  productId: string;
  product: { name: string; sku: string };
  description?: string;
  quantity: number;
  deliveredQuantity: number;
  invoicedQuantity: number;
  remainingQuantity: number;
  unit: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  subtotal: number;
  total: number;
}

interface DeliveryNote {
  id: string;
  deliveryNumber: string;
  deliveryDate: string;
  driver?: string;
  receiver?: string;
  status: string;
  notes?: string;
  items: Array<{ productId: string; quantity: number; product: { name: string } }>;
}

interface SalesOrder {
  id: string;
  salesOrderNumber: string;
  customerId: string;
  customer: { name: string };
  quotationId?: string;
  quotation?: { quotationNumber: string };
  salespersonId?: string;
  salesperson?: { email: string };
  warehouseId: string;
  warehouse: { name: string };
  currency: string;
  exchangeRate: number;
  orderDate: string;
  expectedDeliveryDate: string;
  status: string;
  notes?: string;
  internalNotes?: string;
  items: SalesOrderItem[];
  deliveryNotes: DeliveryNote[];
  sales: any[];
}

export default function SalesOrdersPage() {
  const { t, i18n } = useTranslation(["sales_orders", "common"]);
  const isRtl = i18n.language === "ar";

  // Dashboard state
  const [dashboard, setDashboard] = useState<any>({
    kpis: {},
    openOrders: 0,
    processingOrders: 0,
    readyForDelivery: 0,
    deliveredToday: 0,
    pendingDeliveries: 0,
  });

  // Table state
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");

  // Fulfilling data
  const [customers, setCustomers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [salespersons, setSalespersons] = useState<any[]>([]);

  // Modals / Selection state
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [printDoc, setPrintDoc] = useState<{ type: "SO" | "DN"; data: any } | null>(null);

  // Form states
  const [form, setForm] = useState({
    customerId: "",
    warehouseId: "",
    salespersonId: "",
    notes: "",
    internalNotes: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    items: [] as any[],
  });

  const [deliveryForm, setDeliveryForm] = useState({
    deliveryDate: new Date().toISOString().split("T")[0],
    driver: "",
    receiver: "",
    items: [] as any[],
  });

  const [invoiceForm, setInvoiceForm] = useState({
    amountPaid: "0",
    paymentMethod: "CASH",
  });

  const [errorMsg, setErrorMsg] = useState("");

  // Fetch initial data
  useEffect(() => {
    fetchDashboard();
    fetchOrders();
    fetchDropdowns();
  }, [page, search, statusFilter, warehouseFilter]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/sales-orders/dashboard");
      const data = await res.json();
      setDashboard(data);
    } catch (e) {
      console.error("Error fetching dashboard KPIs", e);
    }
  };

  const fetchOrders = async () => {
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
        status: statusFilter,
        warehouseId: warehouseFilter,
      });
      const res = await fetch(`http://localhost:3001/api/sales-orders?${query}`);
      const data = await res.json();
      setOrders(data.items);
      setTotal(data.total);
    } catch (e) {
      console.error("Error fetching sales orders", e);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [cRes, wRes, pRes, uRes] = await Promise.all([
        fetch("http://localhost:3001/api/customers"),
        fetch("http://localhost:3001/api/inventory/warehouses"),
        fetch("http://localhost:3001/api/products"),
        fetch("http://localhost:3001/api/users"),
      ]);
      setCustomers(await cRes.json());
      setWarehouses(await wRes.json());
      setProducts(await pRes.json());
      setSalespersons(await uRes.json());
    } catch (e) {
      console.error("Error fetching dropdown assets", e);
    }
  };

  const handleSelectOrder = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/sales-orders/${id}`);
      const data = await res.json();
      setSelectedOrder(data);
    } catch (e) {
      console.error("Error fetching details", e);
    }
  };

  const handleConfirmOrder = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/sales-orders/${id}/confirm`, {
        method: "PUT",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to confirm Sales Order");
      }
      fetchDashboard();
      fetchOrders();
      handleSelectOrder(id);
      setErrorMsg("");
    } catch (err: any) {
      setErrorMsg(err.message);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:3001/api/sales-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setCreateModalOpen(false);
      fetchDashboard();
      fetchOrders();
      setForm({
        customerId: "",
        warehouseId: "",
        salespersonId: "",
        notes: "",
        internalNotes: "",
        orderDate: new Date().toISOString().split("T")[0],
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        items: [],
      });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateDeliveryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await fetch(`http://localhost:3001/api/sales-orders/${selectedOrder.id}/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deliveryForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setDeliveryModalOpen(false);
      fetchDashboard();
      fetchOrders();
      handleSelectOrder(selectedOrder.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteDeliveryNote = async (deliveryId: string) => {
    if (!selectedOrder) return;
    try {
      const res = await fetch(`http://localhost:3001/api/sales-orders/deliveries/${deliveryId}/complete`, {
        method: "PUT",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      fetchDashboard();
      fetchOrders();
      handleSelectOrder(selectedOrder.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await fetch(`http://localhost:3001/api/sales-orders/${selectedOrder.id}/invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invoiceForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      setInvoiceModalOpen(false);
      fetchDashboard();
      fetchOrders();
      handleSelectOrder(selectedOrder.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelOrder = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من إلغاء أمر البيع هذا؟" : "Are you sure you want to cancel this order?")) return;
    try {
      const res = await fetch(`http://localhost:3001/api/sales-orders/${id}/cancel`, {
        method: "PUT",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      fetchDashboard();
      fetchOrders();
      handleSelectOrder(id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const addItemToForm = () => {
    setForm({
      ...form,
      items: [...form.items, { productId: "", quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 15 }],
    });
  };

  const removeItemFromForm = (idx: number) => {
    const next = [...form.items];
    next.splice(idx, 1);
    setForm({ ...form, items: next });
  };

  const updateFormItem = (idx: number, key: string, val: any) => {
    const next = [...form.items];
    next[idx] = { ...next[idx], [key]: val };
    
    // Auto populate unitPrice if productId changes
    if (key === "productId") {
      const product = products.find((p) => p.id === val);
      if (product) {
        next[idx].unitPrice = parseFloat(product.retailPrice);
      }
    }
    setForm({ ...form, items: next });
  };

  const handlePrint = (type: "SO" | "DN", doc: any) => {
    setPrintDoc({ type, data: doc });
    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:p-0">
        
        {/* Main Interface Content (Hidden on Print) */}
        <div className="space-y-6 print:hidden">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-slate-100 pb-5">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t("title")}</h1>
              <p className="text-xs text-slate-500 font-medium mt-1">{t("subtitle")}</p>
            </div>
            <button
              onClick={() => {
                setCreateModalOpen(true);
                setErrorMsg("");
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t("btnCreateOrder")}
            </button>
          </div>

          {/* Pending Delivery Warning Banner */}
          {dashboard.pendingDeliveries > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 px-5 py-4 rounded-2xl shadow-sm animate-pulse">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="text-xs font-bold leading-normal">
                {isRtl
                  ? `تنبيه: لديك ${dashboard.pendingDeliveries} أمر مبيعات قيد تسليم الشحنات المعلقة. الرجاء استكمال أذونات التسليم.`
                  : `Attention: There are ${dashboard.pendingDeliveries} sales orders pending delivery notes completion.`}
              </div>
            </div>
          )}

          {/* Dashboard KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{t("lblOpenOrders")}</span>
              <div className="flex justify-between items-end mt-4">
                <span className="text-2xl font-black text-slate-800">{dashboard.openOrders}</span>
                <div className="h-8 w-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{t("lblProcessingOrders")}</span>
              <div className="flex justify-between items-end mt-4">
                <span className="text-2xl font-black text-slate-800">{dashboard.processingOrders}</span>
                <div className="h-8 w-8 bg-orange-50 text-orange-500 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{t("lblReadyForDelivery")}</span>
              <div className="flex justify-between items-end mt-4">
                <span className="text-2xl font-black text-slate-800">{dashboard.readyForDelivery}</span>
                <div className="h-8 w-8 bg-amber-50 text-amber-500 rounded-lg flex items-center justify-center">
                  <Truck className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-sm">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{t("lblDeliveredToday")}</span>
              <div className="flex justify-between items-end mt-4">
                <span className="text-2xl font-black text-slate-800">{dashboard.deliveredToday}</span>
                <div className="h-8 w-8 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between shadow-sm col-span-2 lg:col-span-1">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">{t("lblPendingDeliveries")}</span>
              <div className="flex justify-between items-end mt-4">
                <span className="text-2xl font-black text-slate-800">{dashboard.pendingDeliveries}</span>
                <div className="h-8 w-8 bg-red-50 text-red-500 rounded-lg flex items-center justify-center">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Core Layout: Left List, Right Side Details Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sales Orders Grid List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                
                {/* Search & Filter Controls */}
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder={t("filterSearch")}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-3">
                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="">{t("filterStatus")}</option>
                      <option value="DRAFT">{t("statusDraft")}</option>
                      <option value="CONFIRMED">{t("statusConfirmed")}</option>
                      <option value="PROCESSING">{t("statusProcessing")}</option>
                      <option value="READY_FOR_DELIVERY">{t("statusReady")}</option>
                      <option value="PARTIALLY_DELIVERED">{t("statusPartial")}</option>
                      <option value="DELIVERED">{t("statusDelivered")}</option>
                      <option value="CANCELLED">{t("statusCancelled")}</option>
                      <option value="CLOSED">{t("statusClosed")}</option>
                    </select>

                    <select
                      className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                      value={warehouseFilter}
                      onChange={(e) => setWarehouseFilter(e.target.value)}
                    >
                      <option value="">{isRtl ? "تصفية المستودع" : "Warehouse"}</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Orders Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                        <th className="py-3 px-4">{t("colOrderNo")}</th>
                        <th className="py-3 px-4">{t("colCustomer")}</th>
                        <th className="py-3 px-4">{t("colWarehouse")}</th>
                        <th className="py-3 px-4 text-center">{t("colStatus")}</th>
                        <th className="py-3 px-4 text-left">{t("colTotal")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {orders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => handleSelectOrder(o.id)}
                          className={`hover:bg-slate-50 cursor-pointer transition text-xs font-medium text-slate-700 ${
                            selectedOrder?.id === o.id ? "bg-slate-50/70 font-semibold" : ""
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{o.salesOrderNumber}</td>
                          <td className="py-3.5 px-4">{o.customer.name}</td>
                          <td className="py-3.5 px-4 text-slate-500">{o.warehouse.name}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                                o.status === "DRAFT"
                                  ? "bg-slate-100 text-slate-650"
                                  : o.status === "CONFIRMED"
                                    ? "bg-blue-50 text-blue-600"
                                    : o.status === "PROCESSING"
                                      ? "bg-orange-50 text-orange-600"
                                      : o.status === "READY_FOR_DELIVERY"
                                        ? "bg-amber-50 text-amber-600"
                                        : o.status === "PARTIALLY_DELIVERED"
                                          ? "bg-amber-100 text-amber-700"
                                          : o.status === "DELIVERED"
                                            ? "bg-emerald-50 text-emerald-650"
                                            : o.status === "CLOSED"
                                              ? "bg-purple-50 text-purple-650"
                                              : "bg-red-50 text-red-600"
                              }`}
                            >
                              {t(`status${o.status.charAt(0) + o.status.slice(1).toLowerCase().replace(/_([a-z])/g, (g) => g[1].toUpperCase())}`)}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-left font-mono font-bold">
                            {o.items.reduce((sum, item) => sum + item.total, 0).toLocaleString()} IQD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {total > 10 && (
                  <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-slate-500 text-xs">
                    <span>
                      {isRtl
                        ? `عرض ${(page - 1) * 10 + 1} إلى ${Math.min(page * 10, total)} من أصل ${total}`
                        : `Showing ${(page - 1) * 10 + 1} to ${Math.min(page * 10, total)} of ${total}`}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page * 10 >= total}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Sales Order Details Sidebar Panel */}
            <div className="lg:col-span-1">
              {selectedOrder ? (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                  
                  {/* Title & Document Status */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-black text-slate-800 text-md uppercase tracking-tight">{selectedOrder.salesOrderNumber}</h3>
                      <p className="text-[10px] text-slate-400 mt-0.5">{selectedOrder.customer.name}</p>
                    </div>
                    <button
                      onClick={() => handlePrint("SO", selectedOrder)}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-650 transition"
                      title={t("btnPrint")}
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl font-medium border border-red-100">
                      {errorMsg}
                    </div>
                  )}

                  {/* Quick Metadata */}
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider">{t("colWarehouse")}</span>
                      <span className="font-semibold text-slate-700 mt-1 block">{selectedOrder.warehouse.name}</span>
                    </div>
                    <div>
                      <span className="block font-bold text-slate-400 uppercase text-[9px] tracking-wider">{t("colOrderDate")}</span>
                      <span className="font-semibold text-slate-700 mt-1 block">
                        {new Date(selectedOrder.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Dashboard Workflow */}
                  <div className="pt-4 border-t border-slate-50 space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "إجراءات المسار" : "Workflow Actions"}</h4>
                    
                    <div className="grid grid-cols-2 gap-2">
                      {selectedOrder.status === "DRAFT" && (
                        <button
                          onClick={() => handleConfirmOrder(selectedOrder.id)}
                          className="col-span-2 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                          {t("btnConfirmOrder")}
                        </button>
                      )}

                      {["CONFIRMED", "PROCESSING", "READY_FOR_DELIVERY", "PARTIALLY_DELIVERED"].includes(selectedOrder.status) && (
                        <button
                          onClick={() => {
                            // Populate delivery draft form matching remaining quantities
                            const items = selectedOrder.items
                              .filter((i) => i.remainingQuantity > 0)
                              .map((i) => ({ productId: i.productId, name: i.product.name, quantity: i.remainingQuantity }));
                            setDeliveryForm({
                              deliveryDate: new Date().toISOString().split("T")[0],
                              driver: "",
                              receiver: "",
                              items,
                            });
                            setDeliveryModalOpen(true);
                          }}
                          className="py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <Truck className="h-4.5 w-4.5" />
                          {t("btnCreateDelivery")}
                        </button>
                      )}

                      {["PARTIALLY_DELIVERED", "DELIVERED"].includes(selectedOrder.status) && (
                        <button
                          onClick={() => {
                            // Verify there are delivered quantities not yet invoiced
                            const hasDeliveredUninvoiced = selectedOrder.items.some(
                              (i) => i.deliveredQuantity > i.invoicedQuantity,
                            );
                            if (!hasDeliveredUninvoiced) {
                              alert(isRtl ? "تمت فوترة جميع البنود التي تم تسليمها بالفعل." : "All delivered items have already been invoiced.");
                              return;
                            }
                            setInvoiceForm({ amountPaid: "0", paymentMethod: "CASH" });
                            setInvoiceModalOpen(true);
                          }}
                          className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-1.5"
                        >
                          <FileText className="h-4.5 w-4.5" />
                          {t("btnGenerateInvoice")}
                        </button>
                      )}

                      {!["DELIVERED", "CLOSED", "CANCELLED"].includes(selectedOrder.status) && (
                        <button
                          onClick={() => handleCancelOrder(selectedOrder.id)}
                          className="py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition border border-red-200 flex items-center justify-center gap-1.5"
                        >
                          <X className="h-4.5 w-4.5" />
                          {t("btnCancelOrder")}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="pt-4 border-t border-slate-50 space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "بنود الطلب" : "Order Items"}</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                          <div className="flex justify-between items-start font-semibold text-slate-700">
                            <span>{item.product.name}</span>
                            <span>{(item.quantity * item.unitPrice).toLocaleString()} IQD</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 font-bold">
                            <div>
                              <span>{t("lblOrderedQty")}: </span>
                              <span className="text-slate-800">{item.quantity}</span>
                            </div>
                            <div>
                              <span>{t("lblDeliveredQty")}: </span>
                              <span className="text-slate-800">{item.deliveredQuantity}</span>
                            </div>
                            <div>
                              <span>{t("lblRemainingQty")}: </span>
                              <span className="text-slate-800">{item.remainingQuantity}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Completed Delivery Notes */}
                  {selectedOrder.deliveryNotes.length > 0 && (
                    <div className="pt-4 border-t border-slate-50 space-y-3">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "أذونات التسليم الصادرة" : "Delivery Notes"}</h4>
                      <div className="space-y-2">
                        {selectedOrder.deliveryNotes.map((dn) => (
                          <div key={dn.id} className="flex justify-between items-center p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl text-xs">
                            <div>
                              <span className="font-bold text-slate-700 block">{dn.deliveryNumber}</span>
                              <span className="text-[10px] text-slate-400">{new Date(dn.deliveryDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex gap-2 items-center">
                              {dn.status === "DRAFT" ? (
                                <button
                                  onClick={() => handleCompleteDeliveryNote(dn.id)}
                                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition"
                                >
                                  {t("btnCompleteDelivery")}
                                </button>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-650 rounded text-[9px] font-bold">
                                  {isRtl ? "مكتمل" : "Completed"}
                                </span>
                              )}
                              <button
                                onClick={() => handlePrint("DN", dn)}
                                className="p-1 bg-white hover:bg-slate-100 rounded text-slate-550 border border-slate-200 transition"
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-slate-100 text-center text-slate-400 text-xs shadow-sm py-16">
                  {isRtl ? "اختر أمر بيع للتفاصيل" : "Select a sales order to view details"}
                </div>
              )}
            </div>

          </div>

        </div>

        {/* 1. Create Sales Order Modal (Draft) */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">{t("btnCreateOrder")}</h3>
                <button onClick={() => setCreateModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colCustomer")} *</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    >
                      <option value="">Select Customer</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colWarehouse")} *</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.warehouseId}
                      onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                    >
                      <option value="">Select Warehouse</option>
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{isRtl ? "تاريخ تسليم متوقع" : "Expected Delivery"} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.expectedDeliveryDate}
                      onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items grid selection */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "بنود الفاتورة" : "Order Items"}</h4>
                    <button
                      type="button"
                      onClick={addItemToForm}
                      className="px-3 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-black transition"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                    {form.items.map((item, idx) => (
                      <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end p-3 bg-slate-50 rounded-xl">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Product</label>
                          <select
                            required
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                            value={item.productId}
                            onChange={(e) => updateFormItem(idx, "productId", e.target.value)}
                          >
                            <option value="">Select Product</option>
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Quantity</label>
                          <input
                            type="number"
                            required
                            min="1"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none"
                            value={item.quantity}
                            onChange={(e) => updateFormItem(idx, "quantity", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">UnitPrice (IQD)</label>
                          <input
                            type="number"
                            required
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none font-mono"
                            value={item.unitPrice}
                            onChange={(e) => updateFormItem(idx, "unitPrice", e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1">Discount %</label>
                          <input
                            type="number"
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none font-mono"
                            value={item.discountPct}
                            onChange={(e) => updateFormItem(idx, "discountPct", e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => removeItemFromForm(idx)}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblNotes")}</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblInternalNotes")}</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none"
                      value={form.internalNotes}
                      onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setCreateModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Create Delivery Note Modal */}
        {deliveryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">{t("lblCreateDeliveryTitle")}</h3>
                <button onClick={() => setDeliveryModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateDeliveryNote} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblDriver")}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none"
                      value={deliveryForm.driver}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, driver: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblReceiver")}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none"
                      value={deliveryForm.receiver}
                      onChange={(e) => setDeliveryForm({ ...deliveryForm, receiver: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblDeliveryDate")} *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none"
                    value={deliveryForm.deliveryDate}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "بنود الشحنة" : "Shipment Items"}</h4>
                  {deliveryForm.items.map((item, idx) => (
                    <div key={item.productId} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs">
                      <span className="font-semibold text-slate-700">{item.name}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-[10px] text-slate-400">Max: {item.quantity}</span>
                        <input
                          type="number"
                          required
                          min="1"
                          max={item.quantity}
                          className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none font-bold font-mono text-center"
                          value={item.quantity}
                          onChange={(e) => {
                            const next = [...deliveryForm.items];
                            next[idx].quantity = parseFloat(e.target.value);
                            setDeliveryForm({ ...deliveryForm, items: next });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setDeliveryModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Create Invoice Modal */}
        {invoiceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">{t("lblCompleteInvoiceTitle")}</h3>
                <button onClick={() => setInvoiceModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblPaymentMethod")} *</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none"
                    value={invoiceForm.paymentMethod}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card Payment</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblAmountPaid")} *</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white outline-none font-mono"
                    value={invoiceForm.amountPaid}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amountPaid: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {isRtl ? "تأكيد وإصدار" : "Confirm & Invoice"}
                  </button>
                  <button type="button" onClick={() => setInvoiceModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* Printable Document Canvas (Hidden on Screen, Visible on Print) */}
        {/* ========================================================== */}
        {printDoc && (
          <div className="hidden print:block font-sans text-slate-800 text-xs p-6 space-y-8" dir={isRtl ? "rtl" : "ltr"}>
            
            {/* Logo / Company Header */}
            <div className="flex justify-between items-center border-b-2 border-slate-800 pb-5">
              <div className="space-y-1">
                <h1 className="text-xl font-black">{isRtl ? "شركة الأنوار للتجارة العامة" : "Al-Anwar General Trading Co."}</h1>
                <p className="text-[10px] text-slate-500">Baghdad, Karrada District | Phone: +96477000000</p>
                <p className="text-[10px] text-slate-500">Tax Registration Number: 0021-998372-23</p>
              </div>
              <div className="h-14 w-14 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-350">
                <Warehouse className="h-8 w-8 text-slate-650" />
              </div>
            </div>

            {/* Document Details Block */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {printDoc.type === "SO" ? t("lblPrintSO") : t("lblPrintDN")}
                </h2>
                <div className="space-y-1 mt-2">
                  <span className="block font-bold">
                    {isRtl ? "رقم المستند: " : "Doc Number: "}
                    <span className="font-mono text-blue-700 font-bold">
                      {printDoc.type === "SO" ? printDoc.data.salesOrderNumber : printDoc.data.deliveryNumber}
                    </span>
                  </span>
                  <span className="block text-slate-500">
                    {isRtl ? "التاريخ: " : "Date: "}
                    {new Date(printDoc.type === "SO" ? printDoc.data.orderDate : printDoc.data.deliveryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* QR verification code placeholder */}
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 bg-slate-50 border border-slate-300 rounded flex items-center justify-center">
                  <div className="text-[8px] text-slate-400 font-mono text-center">QR Code Verified</div>
                </div>
                <span className="text-[8px] text-slate-400 mt-1 uppercase tracking-wider">{t("lblVerificationQR")}</span>
              </div>
            </div>

            {/* Fulfill Details Table */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl">
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px] tracking-wider">{t("colCustomer")}</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">
                  {printDoc.type === "SO" ? printDoc.data.customer?.name : printDoc.data.salesOrder?.customer?.name || "Client"}
                </span>
              </div>
              <div>
                <span className="block font-bold text-slate-500 uppercase text-[9px] tracking-wider">{t("colWarehouse")}</span>
                <span className="font-semibold text-slate-800 mt-0.5 block">{printDoc.data.warehouse?.name}</span>
              </div>
            </div>

            {/* Items Grid */}
            <div className="mt-6">
              <table className="w-full text-right border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 font-bold text-[10px] text-slate-650 uppercase border-b border-slate-300">
                    <th className="py-2 px-3 border border-slate-200">#</th>
                    <th className="py-2 px-3 border border-slate-200">{isRtl ? "البند" : "Item"}</th>
                    <th className="py-2 px-3 border border-slate-200 text-center">{isRtl ? "الكمية" : "Qty"}</th>
                    {printDoc.type === "SO" && (
                      <>
                        <th className="py-2 px-3 border border-slate-200 text-left">{isRtl ? "سعر الوحدة" : "Unit Price"}</th>
                        <th className="py-2 px-3 border border-slate-200 text-left">{isRtl ? "الإجمالي" : "Total"}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[10px]">
                  {printDoc.data.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 border border-slate-200">{idx + 1}</td>
                      <td className="py-2 px-3 border border-slate-200">{item.product?.name}</td>
                      <td className="py-2 px-3 border border-slate-200 text-center">{item.quantity}</td>
                      {printDoc.type === "SO" && (
                        <>
                          <td className="py-2 px-3 border border-slate-200 text-left font-mono">{item.unitPrice.toLocaleString()} IQD</td>
                          <td className="py-2 px-3 border border-slate-200 text-left font-mono">{item.total.toLocaleString()} IQD</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total / Signatures block */}
            {printDoc.type === "SO" && (
              <div className="flex justify-end pt-4">
                <div className="w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between font-bold border-b border-slate-300 pb-1">
                    <span>{isRtl ? "الإجمالي الكلي: " : "Grand Total: "}</span>
                    <span className="font-mono text-blue-700">
                      {printDoc.data.items.reduce((sum: number, i: any) => sum + i.total, 0).toLocaleString()} IQD
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-16 pt-16 text-center text-[10px] font-bold">
              <div>
                <span className="border-t border-slate-400 pt-1 px-8 block w-2/3 mx-auto">{isRtl ? "توقيع المسؤول" : "Authorized Signature"}</span>
              </div>
              <div>
                <span className="border-t border-slate-400 pt-1 px-8 block w-2/3 mx-auto">{isRtl ? "توقيع المستلم" : "Receiver Signature"}</span>
              </div>
            </div>

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
