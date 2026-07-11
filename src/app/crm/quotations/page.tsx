"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import {
  FileText, Search, Plus, Edit3, Trash2, Calendar, CheckCircle2,
  AlertCircle, Clock, ArrowRight, Printer, Share2, Clipboard,
  TrendingUp, RefreshCw, X, ChevronRight, DollarSign, Eye, Play
} from "lucide-react";

interface QuotationItem {
  id: string;
  productId: string;
  product: {
    name: string;
    sku: string;
  };
  description?: string;
  quantity: string | number;
  unit: string;
  unitPrice: string | number;
  discountPct: string | number;
  taxPct: string | number;
  subtotal: string | number;
  total: string | number;
}

interface Quotation {
  id: string;
  quotationNumber: string;
  version: number;
  isCurrent: boolean;
  customerId: string;
  customer: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  leadId?: string;
  lead?: {
    companyName: string;
  };
  opportunityId?: string;
  salesperson?: {
    email: string;
  };
  status: string;
  currency: string;
  exchangeRate: string | number;
  issueDate: string;
  expiryDate: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  internalNotes?: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
  rejectedAt?: string;
  convertedAt?: string;
  submittedById?: string;
  submittedBy?: { email: string; employee?: { firstName: string; lastName: string } };
  submittedAt?: string;
  approvedById?: string;
  approvedBy?: { email: string; employee?: { firstName: string; lastName: string } };
  approvedAt?: string;
  rejectedById?: string;
  rejectedBy?: { email: string; employee?: { firstName: string; lastName: string } };
  rejectionComment?: string;
  createdAt: string;
  items: QuotationItem[];
}

export default function QuotationsPage() {
  const { t, i18n } = useTranslation(["quotations", "common"]);
  const isRtl = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<"dashboard" | "quotations" | "details">("dashboard");

  // Dashboard Stats
  const [stats, setStats] = useState<any>(null);

  // List data
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Detailed view
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [detailedQuote, setDetailedQuote] = useState<Quotation | null>(null);
  const [historyVersions, setHistoryVersions] = useState<Quotation[]>([]);

  // Modals / Forms
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);

  const [form, setForm] = useState({
    customerId: "",
    leadId: "",
    issueDate: new Date().toISOString().split("T")[0],
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    currency: "IQD",
    exchangeRate: "1.0",
    paymentTerms: "50% Advanced, 50% on Delivery",
    deliveryTerms: "Ex-Works Warehouse",
    notes: "Quotation valid for 15 days.",
    internalNotes: "",
  });

  const [formItems, setFormItems] = useState<any[]>([
    { productId: "", quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 0 }
  ]);

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    paymentMethod: "CASH",
    amountPaid: "",
  });

  // Approval workflow state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionComment, setRejectionComment] = useState("");

  useEffect(() => {
    fetchDashboardStats();
    fetchQuotations();
    fetchSupportData();
  }, [page, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (selectedQuoteId) {
      fetchDetailedQuotation(selectedQuoteId);
    }
  }, [selectedQuoteId]);

  const fetchDashboardStats = async () => {
    try {
      const data = await apiRequest("/quotations/dashboard");
      setStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchQuotations = async () => {
    try {
      let query = `?page=${page}&limit=8`;
      if (search) query += `&search=${search}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (dateFrom) query += `&dateFrom=${dateFrom}`;
      if (dateTo) query += `&dateTo=${dateTo}`;

      const data = await apiRequest(`/quotations${query}`);
      setQuotations(data.items);
      setTotalQuotes(data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetailedQuotation = async (id: string) => {
    try {
      const data = await apiRequest(`/quotations/${id}`);
      setDetailedQuote(data);

      // Fetch history versions
      const history = await apiRequest(`/quotations/history/${data.quotationNumber}`);
      setHistoryVersions(history);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSupportData = async () => {
    try {
      const custData = await apiRequest("/customers");
      setCustomers(custData.items || custData);

      const prodData = await apiRequest("/inventory/products?limit=100");
      setProducts(prodData.items || prodData);

      const leadData = await apiRequest("/crm/leads?limit=100");
      setLeads(leadData.items || leadData);
    } catch (e) {
      console.error(e);
    }
  };

  // Create Quotation Handler
  const handleAddItemRow = () => {
    setFormItems([...formItems, { productId: "", quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setFormItems(formItems.filter((_, i) => i !== idx));
  };

  const handleItemRowChange = (idx: number, field: string, value: any) => {
    const updated = [...formItems];
    updated[idx][field] = value;

    // Auto-update price if product is selected
    if (field === "productId") {
      const selectedProd = products.find(p => p.id === value);
      if (selectedProd) {
        updated[idx].unitPrice = Number(selectedProd.retailPrice);
      }
    }
    setFormItems(updated);
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formItems.some(i => !i.productId)) {
      alert(isRtl ? "الرجاء تحديد منتج لكل السطور." : "Please select a product for all rows.");
      return;
    }

    try {
      const payload = {
        ...form,
        exchangeRate: parseFloat(form.exchangeRate),
        items: formItems.map(item => ({
          productId: item.productId,
          quantity: parseFloat(item.quantity),
          unit: "PCS",
          unitPrice: parseFloat(item.unitPrice),
          discountPct: parseFloat(item.discountPct || 0),
          taxPct: parseFloat(item.taxPct || 0),
        })),
      };

      if (detailedQuote && activeTab === "details") {
        // Edit Mode (new version)
        await apiRequest(`/quotations/${detailedQuote.id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        // Create Mode
        await apiRequest("/quotations", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setCreateModalOpen(false);
      fetchQuotations();
      fetchDashboardStats();
      if (selectedQuoteId) {
        fetchDetailedQuotation(selectedQuoteId);
      }
      alert(t("successQuoteCreated"));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteQuotation = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من رغبتك في حذف عرض السعر هذا؟" : "Are you sure you want to delete this quotation?")) return;
    try {
      await apiRequest(`/quotations/${id}`, { method: "DELETE" });
      setSelectedQuoteId(null);
      setDetailedQuote(null);
      fetchQuotations();
      fetchDashboardStats();
      setActiveTab("quotations");
    } catch (err: any) {
      alert(`Error deleting quote: ${err.message}`);
    }
  };

  // Approval Workflow Handlers
  const handleSubmitForApproval = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/submit`, { method: "PUT" });
      fetchDetailedQuotation(id);
      fetchQuotations();
      fetchDashboardStats();
      alert(t("successSubmitted"));
    } catch (err: any) {
      alert(`Submit failed: ${err.message}`);
    }
  };

  const handleApproveQuotation = async (id: string) => {
    try {
      await apiRequest(`/quotations/${id}/approve`, { method: "PUT" });
      fetchDetailedQuotation(id);
      fetchQuotations();
      fetchDashboardStats();
      alert(t("successApproved"));
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    }
  };

  const handleRejectQuotation = async (id: string) => {
    if (!rejectionComment.trim()) {
      alert(t("lblRejectionRequired"));
      return;
    }
    try {
      await apiRequest(`/quotations/${id}/reject`, {
        method: "PUT",
        body: JSON.stringify({ comment: rejectionComment }),
      });
      setRejectModalOpen(false);
      setRejectionComment("");
      fetchDetailedQuotation(id);
      fetchQuotations();
      fetchDashboardStats();
      alert(t("successRejected"));
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    }
  };

  // Convert to Sales Invoice Handlers
  const handleOpenConvertModal = () => {
    if (!detailedQuote) return;
    const totalAmount = detailedQuote.items.reduce((sum, item) => sum + Number(item.total), 0);
    setConvertForm({
      paymentMethod: "CASH",
      amountPaid: totalAmount.toString(),
    });
    setConvertModalOpen(true);
  };

  const handleConvertQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailedQuote) return;

    try {
      await apiRequest(`/quotations/${detailedQuote.id}/convert`, {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: convertForm.paymentMethod,
          amountPaid: parseFloat(convertForm.amountPaid),
        }),
      });

      setConvertModalOpen(false);
      fetchDetailedQuotation(detailedQuote.id);
      fetchQuotations();
      fetchDashboardStats();
      alert(t("successConvertedInvoice"));
    } catch (err: any) {
      alert(`Conversion failed: ${err.message}`);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-slate-50 text-slate-700 border-slate-200";
      case "SUBMITTED": return "bg-amber-50 text-amber-700 border-amber-200";
      case "APPROVED": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "REJECTED": return "bg-rose-50 text-rose-700 border-rose-200";
      case "CONVERTED": return "bg-blue-50 text-blue-700 border-blue-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const formatPrice = (val: number | string | undefined) => {
    if (val === undefined) return "-";
    const num = typeof val === "string" ? parseFloat(val) : val;
    return `${num.toLocaleString(isRtl ? "ar-IQ" : "en-US")} د.ع`;
  };

  // QR Code URL generator
  const getVerificationQr = (quoteNo: string) => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent("https://my-erp.com/verify-quote/" + quoteNo)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* Header (Hidden on print) */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("title")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("subtitle")}</p>
          </div>
          
          <button
            onClick={() => {
              setForm({
                customerId: "",
                leadId: "",
                issueDate: new Date().toISOString().split("T")[0],
                expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                currency: "IQD",
                exchangeRate: "1.0",
                paymentTerms: "50% Advanced, 50% on Delivery",
                deliveryTerms: "Ex-Works Warehouse",
                notes: "Quotation valid for 15 days.",
                internalNotes: "",
              });
              setFormItems([{ productId: "", quantity: 1, unitPrice: 0, discountPct: 0, taxPct: 0 }]);
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
          >
            <Plus className="h-4 w-4" />
            <span>{t("btnCreateQuote")}</span>
          </button>
        </div>

        {/* Navigation Tabs (Hidden on print) */}
        <div className="flex border-b border-slate-200 gap-6 overflow-x-auto scrollbar-none pb-1 print:hidden">
          {[
            { id: "dashboard", name: t("tabDashboard"), icon: DollarSign },
            { id: "quotations", name: t("tabQuotations"), icon: FileText },
            { id: "details", name: t("tabVersions"), icon: Eye, disabled: !detailedQuote },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-3 text-sm font-bold transition shrink-0 ${
                  tab.disabled ? "opacity-30 cursor-not-allowed" : ""
                } ${
                  isActive
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 1. Dashboard Tab */}
        {activeTab === "dashboard" && stats && (
          <div className="space-y-6 print:hidden">

            {/* Pending Approval Notification Banner */}
            {stats.approvalWorkflow?.pendingApproval > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-amber-800">{t("lblPendingNotification")}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{stats.approvalWorkflow.pendingApproval} {t("lblPendingApproval")}</p>
                </div>
              </div>
            )}

            {/* Main KPIs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: t("lblDraftCount"), value: stats.kpis?.DRAFT ?? 0, color: "text-slate-600 bg-slate-50", icon: "📝" },
                { label: t("lblSubmittedCount"), value: stats.approvalWorkflow?.pendingApproval ?? 0, color: "text-amber-600 bg-amber-50", icon: "⏳" },
                { label: t("lblApprovedCount"), value: (stats.kpis?.APPROVED ?? 0) + (stats.kpis?.CONVERTED ?? 0), color: "text-emerald-600 bg-emerald-50", icon: "✅" },
                { label: t("lblConversionRate"), value: `${stats.conversionRate ?? 0}%`, color: "text-purple-600 bg-purple-50", icon: "📊" },
              ].map((kpi, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <span className="text-slate-500 text-xs font-semibold">{kpi.label}</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-2">{kpi.value}</h3>
                  </div>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${kpi.color} text-lg`}>
                    {kpi.icon}
                  </div>
                </div>
              ))}
            </div>

            {/* Approval Workflow KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: t("lblPendingApproval"), value: stats.approvalWorkflow?.pendingApproval ?? 0, color: "text-amber-600 bg-amber-50 border-amber-200" },
                { label: t("lblApprovedToday"), value: stats.approvalWorkflow?.approvedToday ?? 0, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                { label: t("lblRejectedToday"), value: stats.approvalWorkflow?.rejectedToday ?? 0, color: "text-rose-600 bg-rose-50 border-rose-200" },
                { label: t("lblAvgApprovalTime"), value: `${stats.approvalWorkflow?.averageApprovalTimeHours ?? 0} ${t("hours")}`, color: "text-blue-600 bg-blue-50 border-blue-200" },
              ].map((kpi, i) => (
                <div key={i} className={`rounded-2xl border p-5 flex items-center justify-between shadow-sm ${kpi.color}`}>
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <span className="text-xs font-semibold opacity-80">{kpi.label}</span>
                    <h3 className="text-xl font-black mt-1">{kpi.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Funnel distribution values */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4">{isRtl ? "قيمة خط الأنابيب والتدفقات" : "Pipeline Funnel Value"}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500">{t("lblPipeline")}</span>
                    <span className="font-bold text-slate-800 font-mono text-sm">{formatPrice(stats.pipelineValue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-500">{isRtl ? "العروض المعتمدة والمحولة" : "Approved / Converted Value"}</span>
                    <span className="font-bold text-emerald-600 font-mono text-sm">{formatPrice(stats.acceptedValue)}</span>
                  </div>
                </div>
              </div>

              {/* Status checklist */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4">{isRtl ? "توزيع الحالات" : "Status Summary"}</h3>
                <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                  <div className="flex justify-between p-2 bg-slate-50 rounded-lg">
                    <span>{t("statusDraft")}:</span>
                    <span className="font-mono text-slate-800">{stats.kpis?.DRAFT ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-amber-50 rounded-lg">
                    <span>{t("statusSubmitted")}:</span>
                    <span className="font-mono text-amber-700">{stats.kpis?.SUBMITTED ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-emerald-50 rounded-lg">
                    <span>{t("statusApproved")}:</span>
                    <span className="font-mono text-emerald-700">{stats.kpis?.APPROVED ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-blue-50 rounded-lg">
                    <span>{t("statusConverted")}:</span>
                    <span className="font-mono text-blue-700">{stats.kpis?.CONVERTED ?? 0}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-rose-50 rounded-lg col-span-2">
                    <span>{t("statusRejected")}:</span>
                    <span className="font-mono text-rose-700">{stats.kpis?.REJECTED ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Quotations List Tab */}
        {activeTab === "quotations" && (
          <div className="space-y-4 print:hidden">
            
            {/* Search & Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder={t("filterSearch")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search className={`absolute top-2.5 h-4 w-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
              </div>
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                >
                  <option value="">{t("filterStatus")}</option>
                  <option value="DRAFT">{t("statusDraft")}</option>
                  <option value="SUBMITTED">{t("statusSubmitted")}</option>
                  <option value="APPROVED">{t("statusApproved")}</option>
                  <option value="REJECTED">{t("statusRejected")}</option>
                  <option value="CONVERTED">{t("statusConverted")}</option>
                </select>

                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
                <span className="text-slate-400 text-xs self-center">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-slate-600 text-center">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">{t("colQuoteNo")}</th>
                    <th className="px-4 py-3">{t("colCustomer")}</th>
                    <th className="px-4 py-3">{t("colIssueDate")}</th>
                    <th className="px-4 py-3">{t("colExpiryDate")}</th>
                    <th className="px-4 py-3">{t("colValue")}</th>
                    <th className="px-4 py-3">{t("colStatus")}</th>
                    <th className="px-4 py-3">{t("colVersion")}</th>
                    <th className="px-4 py-3">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {(Array.isArray(quotations) ? quotations : []).map((quote) => {
                    const totalValue = (Array.isArray(quote?.items) ? quote.items : []).reduce((sum, item) => sum + Number(item?.total || 0), 0);
                    return (
                      <tr 
                        key={quote.id} 
                        onClick={() => {
                          setSelectedQuoteId(quote.id);
                          setActiveTab("details");
                        }}
                        className="hover:bg-slate-50/50 cursor-pointer transition"
                      >
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{quote?.quotationNumber || "—"}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{quote?.customer?.name || "—"}</td>
                        <td className="px-4 py-3 text-xs">{quote?.issueDate ? new Date(quote.issueDate).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 text-xs">{quote?.expiryDate ? new Date(quote.expiryDate).toLocaleDateString() : "—"}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{formatPrice(totalValue)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(quote?.status || "")}`}>
                            {quote?.status || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">v{quote?.version || 1}</td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setSelectedQuoteId(quote.id);
                                setActiveTab("details");
                              }}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            {quote.status !== "CONVERTED" && (
                              <button
                                onClick={() => handleDeleteQuotation(quote.id)}
                                className="p-1 hover:bg-rose-50 rounded text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* 3. Printable Details & Version History Tab */}
        {activeTab === "details" && detailedQuote && (
          <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
            
            {/* Version timeline & actions (Left 1 column - Hidden on print) */}
            <div className="xl:col-span-1 space-y-6 print:hidden">
              {/* Action operations */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">{isRtl ? "خيارات التحكم" : "Operations"}</h4>
                
                {/* Print button */}
                <button
                  onClick={() => window.print()}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  <span>{t("btnPrint")}</span>
                </button>

                {/* Submit for Approval (DRAFT only) */}
                {detailedQuote.status === "DRAFT" && (
                  <button
                    onClick={() => handleSubmitForApproval(detailedQuote.id)}
                    className="w-full py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="h-4 w-4" />
                    <span>{t("btnSubmitApproval")}</span>
                  </button>
                )}

                {/* Approve / Reject (SUBMITTED only, Manager) */}
                {detailedQuote.status === "SUBMITTED" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveQuotation(detailedQuote.id)}
                      className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-bold transition"
                    >
                      {t("btnApprove")}
                    </button>
                    <button
                      onClick={() => { setRejectionComment(""); setRejectModalOpen(true); }}
                      className="flex-1 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition"
                    >
                      {t("btnReject")}
                    </button>
                  </div>
                )}

                {/* Conversion to Sales Invoice (APPROVED only) */}
                {detailedQuote.status === "APPROVED" && (
                  <button
                    onClick={handleOpenConvertModal}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>{t("btnConvertInvoice")}</span>
                  </button>
                )}

                {/* Must Be Approved Warning */}
                {detailedQuote.status !== "APPROVED" && detailedQuote.status !== "CONVERTED" && detailedQuote.status !== "DRAFT" && detailedQuote.status !== "REJECTED" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{t("lblMustBeApproved")}</span>
                  </div>
                )}

                {detailedQuote.status === "REJECTED" && detailedQuote.rejectionComment && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-1">
                    <p className="font-bold text-rose-700">{t("lblRejectionComment")}:</p>
                    <p className="text-rose-600">{detailedQuote.rejectionComment}</p>
                    {detailedQuote.rejectedBy && (
                      <p className="text-rose-500 mt-1">{t("lblRejectedBy")}: {detailedQuote.rejectedBy.employee ? `${detailedQuote.rejectedBy.employee.firstName} ${detailedQuote.rejectedBy.employee.lastName}` : detailedQuote.rejectedBy.email}</p>
                    )}
                  </div>
                )}

                {/* Edit Quotation (New Version) - Only for DRAFT */}
                {detailedQuote.status === "DRAFT" && (
                  <button
                    onClick={() => {
                      setForm({
                        customerId: detailedQuote?.customerId || "",
                        leadId: detailedQuote?.leadId || "",
                        issueDate: detailedQuote?.issueDate ? new Date(detailedQuote.issueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                        expiryDate: detailedQuote?.expiryDate ? new Date(detailedQuote.expiryDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                        currency: detailedQuote?.currency || "IQD",
                        exchangeRate: detailedQuote?.exchangeRate ? detailedQuote.exchangeRate.toString() : "1.0",
                        paymentTerms: detailedQuote?.paymentTerms || "",
                        deliveryTerms: detailedQuote?.deliveryTerms || "",
                        notes: detailedQuote?.notes || "",
                        internalNotes: detailedQuote?.internalNotes || "",
                      });
                      setFormItems((Array.isArray(detailedQuote?.items) ? detailedQuote.items : []).map(i => ({
                        productId: i.productId,
                        quantity: Number(i.quantity || 1),
                        unitPrice: Number(i.unitPrice || 0),
                        discountPct: Number(i.discountPct || 0),
                        taxPct: Number(i.taxPct || 15),
                      })));
                      setCreateModalOpen(true);
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>{isRtl ? "تعديل (إصدار نسخة جديدة)" : "Edit (Create New Version)"}</span>
                  </button>
                )}
              </div>

              {/* Approval Timeline */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">{t("lblApprovalTimeline")}</h4>
                <div className="space-y-0">
                  {/* Created */}
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center"><Clipboard className="h-3 w-3 text-slate-600" /></div>
                      <div className="w-0.5 h-6 bg-slate-200"></div>
                    </div>
                    <div className="text-xs pb-3">
                      <p className="font-bold text-slate-700">{t("timelineCreated")}</p>
                      <p className="text-slate-500 font-mono">{new Date(detailedQuote.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {/* Submitted */}
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${detailedQuote.submittedAt ? "bg-amber-200" : "bg-slate-100"}`}><Play className={`h-3 w-3 ${detailedQuote.submittedAt ? "text-amber-700" : "text-slate-400"}`} /></div>
                      <div className="w-0.5 h-6 bg-slate-200"></div>
                    </div>
                    <div className="text-xs pb-3">
                      <p className={`font-bold ${detailedQuote.submittedAt ? "text-amber-700" : "text-slate-400"}`}>{t("timelineSubmitted")}</p>
                      {detailedQuote.submittedAt && (
                        <>
                          <p className="text-slate-500 font-mono">{new Date(detailedQuote.submittedAt).toLocaleString()}</p>
                          {detailedQuote.submittedBy && <p className="text-slate-400">{detailedQuote.submittedBy.employee ? `${detailedQuote.submittedBy.employee.firstName} ${detailedQuote.submittedBy.employee.lastName}` : detailedQuote.submittedBy.email}</p>}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Approved */}
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${detailedQuote.approvedAt ? "bg-emerald-200" : "bg-slate-100"}`}><CheckCircle2 className={`h-3 w-3 ${detailedQuote.approvedAt ? "text-emerald-700" : "text-slate-400"}`} /></div>
                      <div className="w-0.5 h-6 bg-slate-200"></div>
                    </div>
                    <div className="text-xs pb-3">
                      <p className={`font-bold ${detailedQuote.approvedAt ? "text-emerald-700" : "text-slate-400"}`}>{t("timelineApproved")}</p>
                      {detailedQuote.approvedAt && (
                        <>
                          <p className="text-slate-500 font-mono">{new Date(detailedQuote.approvedAt).toLocaleString()}</p>
                          {detailedQuote.approvedBy && <p className="text-slate-400">{detailedQuote.approvedBy.employee ? `${detailedQuote.approvedBy.employee.firstName} ${detailedQuote.approvedBy.employee.lastName}` : detailedQuote.approvedBy.email}</p>}
                        </>
                      )}
                    </div>
                  </div>
                  {/* Rejected */}
                  {detailedQuote.rejectedAt && (
                    <div className="flex gap-3 items-start">
                      <div className="flex flex-col items-center">
                        <div className="h-6 w-6 rounded-full bg-rose-200 flex items-center justify-center"><X className="h-3 w-3 text-rose-700" /></div>
                        <div className="w-0.5 h-6 bg-slate-200"></div>
                      </div>
                      <div className="text-xs pb-3">
                        <p className="font-bold text-rose-700">{t("timelineRejected")}</p>
                        <p className="text-slate-500 font-mono">{new Date(detailedQuote.rejectedAt).toLocaleString()}</p>
                        {detailedQuote.rejectedBy && <p className="text-slate-400">{detailedQuote.rejectedBy.employee ? `${detailedQuote.rejectedBy.employee.firstName} ${detailedQuote.rejectedBy.employee.lastName}` : detailedQuote.rejectedBy.email}</p>}
                      </div>
                    </div>
                  )}
                  {/* Converted */}
                  <div className="flex gap-3 items-start">
                    <div className="flex flex-col items-center">
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center ${detailedQuote.convertedAt ? "bg-blue-200" : "bg-slate-100"}`}><ArrowRight className={`h-3 w-3 ${detailedQuote.convertedAt ? "text-blue-700" : "text-slate-400"}`} /></div>
                    </div>
                    <div className="text-xs">
                      <p className={`font-bold ${detailedQuote.convertedAt ? "text-blue-700" : "text-slate-400"}`}>{t("timelineConverted")}</p>
                      {detailedQuote.convertedAt && (
                        <p className="text-slate-500 font-mono">{new Date(detailedQuote.convertedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Version History List */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">{t("tabVersions")}</h4>
                <div className="space-y-3">
                  {historyVersions.map((h) => (
                    <div 
                      key={h.id} 
                      onClick={() => fetchDetailedQuotation(h.id)}
                      className={`p-2.5 border rounded-xl cursor-pointer text-xs transition ${
                        h.id === detailedQuote.id
                          ? "bg-blue-50/50 border-blue-200"
                          : "bg-slate-50 border-slate-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex justify-between font-bold">
                        <span>Version {h.version}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] border ${getStatusBadgeClass(h.status)}`}>
                          {h.status}
                        </span>
                      </div>
                      <span className="font-mono text-slate-450 block mt-1.5">{new Date(h.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Formal Printable Invoice Panel (Left 3 columns) */}
            <div className="xl:col-span-3 bg-white border border-slate-250 rounded-2xl p-8 shadow-md print:border-none print:shadow-none print:p-0">
              
              {/* Header Letterhead */}
              <div className="flex justify-between items-start border-b-2 border-slate-200 pb-6">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">E</div>
                    <span className="text-lg font-black text-slate-800">ERP ENTERPRISE SYSTEM</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 space-y-0.5 font-medium">
                    <p>Baghdad, Iraq | Karrada District</p>
                    <p>Phone: +964 770 123 4567 | tax@system.com</p>
                    <p>Tax Registration No: 100482991</p>
                  </div>
                </div>

                <div className={isRtl ? "text-left" : "text-right"}>
                  <h2 className="text-2xl font-black text-blue-600 uppercase tracking-widest">{isRtl ? "عرض سعر" : "QUOTATION"}</h2>
                  <div className="mt-3 text-xs space-y-1.5 text-slate-700">
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400 font-bold">{t("colQuoteNo")}:</span>
                      <span className="font-mono font-bold text-slate-800">{detailedQuote.quotationNumber}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400 font-bold">{t("colVersion")}:</span>
                      <span className="font-mono font-bold text-slate-800">v{detailedQuote.version}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400 font-bold">{t("colIssueDate")}:</span>
                      <span className="font-mono font-bold">{new Date(detailedQuote.issueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400 font-bold">{t("colExpiryDate")}:</span>
                      <span className="font-mono font-bold text-rose-600">{new Date(detailedQuote.expiryDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info Card */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-6 text-xs">
                <div className={`p-4 bg-slate-50 border border-slate-150 rounded-2xl ${isRtl ? "text-right" : "text-left"}`}>
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-2">{isRtl ? "مقدم إلى العميل" : "Prepared For"}</h4>
                  <p className="text-sm font-black text-slate-850">{detailedQuote.customer.name}</p>
                  {detailedQuote.customer.phone && <p className="font-mono text-slate-500 mt-1">{detailedQuote.customer.phone}</p>}
                  {detailedQuote.customer.email && <p className="font-mono text-slate-500">{detailedQuote.customer.email}</p>}
                  {detailedQuote.customer.address && <p className="text-slate-500 mt-1.5 border-t border-slate-200/60 pt-1.5">{detailedQuote.customer.address}</p>}
                </div>

                <div className={`p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between ${isRtl ? "text-right" : "text-left"}`}>
                  <div>
                    <h4 className="font-bold text-slate-500 uppercase tracking-wider mb-2">{isRtl ? "وسيط المشروع" : "Project Reference"}</h4>
                    {detailedQuote.lead && (
                      <p className="text-xs font-bold text-slate-700">
                        {isRtl ? "العميل المحتمل: " : "Lead Ref: "}
                        <span className="font-black text-slate-800">{detailedQuote.lead.companyName}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-200/60 pt-2 font-mono">
                    Created by: {detailedQuote.salesperson?.email || "-"}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden my-6">
                <table className="w-full text-xs text-slate-650 text-center">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">{isRtl ? "اسم المنتج" : "Product"}</th>
                      <th className="px-4 py-2.5">{isRtl ? "الكمية" : "Qty"}</th>
                      <th className="px-4 py-2.5">{isRtl ? "سعر الوحدة" : "Unit Price"}</th>
                      <th className="px-4 py-2.5">{isRtl ? "الخصم" : "Disc"} %</th>
                      <th className="px-4 py-2.5">{isRtl ? "الضريبة" : "Tax"} %</th>
                      <th className="px-4 py-2.5">{isRtl ? "الإجمالي" : "Total"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {detailedQuote.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/20">
                        <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-4 py-2.5 text-slate-800 font-bold text-left md:text-center">
                          {item.product.name}
                          {item.description && <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">{item.description}</span>}
                        </td>
                        <td className="px-4 py-2.5 font-mono">{Number(item.quantity)} {item.unit}</td>
                        <td className="px-4 py-2.5 font-mono">{formatPrice(Number(item.unitPrice))}</td>
                        <td className="px-4 py-2.5 font-mono">{Number(item.discountPct)}%</td>
                        <td className="px-4 py-2.5 font-mono">{Number(item.taxPct)}%</td>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-700">{formatPrice(Number(item.total))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col md:flex-row justify-between items-end gap-6 my-6 text-xs">
                
                {/* QR and Verification details */}
                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-4 rounded-2xl w-full md:w-auto">
                  <img
                    src={getVerificationQr(detailedQuote.quotationNumber)}
                    alt="Verification QR"
                    className="h-20 w-20 bg-white p-1.5 border border-slate-200 rounded-lg shrink-0"
                  />
                  <div>
                    <span className="text-[10px] text-slate-450 font-bold block">{t("lblVerificationQR")}</span>
                    <p className="font-mono font-bold text-slate-700 mt-1">{detailedQuote.quotationNumber}</p>
                    <span className="text-[9px] text-slate-400 block mt-1">Verify digitally via ERP validator</span>
                  </div>
                </div>

                {/* Final Calculation Summary */}
                <div className="w-full md:w-80 space-y-2 border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">{isRtl ? "المجموع الفرعي" : "Subtotal"}:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatPrice(detailedQuote.items.reduce((sum, item) => sum + Number(item.subtotal), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-bold">{isRtl ? "إجمالي الضريبة" : "VAT Tax Sum"}:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {formatPrice(detailedQuote.items.reduce((sum, item) => sum + (Number(item.total) - Number(item.subtotal)), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-2 text-sm">
                    <span className="text-slate-800 font-black">{isRtl ? "المجموع الكلي" : "Grand Total"}:</span>
                    <span className="font-mono font-black text-blue-600">
                      {formatPrice(detailedQuote.items.reduce((sum, item) => sum + Number(item.total), 0))}
                    </span>
                  </div>
                </div>

              </div>

              {/* Terms and conditions */}
              <div className="border-t-2 border-slate-100 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-[10px] text-slate-500 font-medium">
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">{t("lblTermsHeader")}</h4>
                  {detailedQuote.paymentTerms && (
                    <div className="mb-2">
                      <span className="font-bold text-slate-600 block">{t("lblPaymentTerms")}:</span>
                      <p>{detailedQuote.paymentTerms}</p>
                    </div>
                  )}
                  {detailedQuote.deliveryTerms && (
                    <div>
                      <span className="font-bold text-slate-600 block">{t("lblDeliveryTerms")}:</span>
                      <p>{detailedQuote.deliveryTerms}</p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider mb-2">{t("lblNotes")}</h4>
                  <p className="whitespace-pre-wrap">{detailedQuote.notes || "لا توجد شروط إضافية"}</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==========================================
            MODAL FORMS
           ========================================== */}

        {/* 1. Create/Edit Quotation Modal */}
        {createModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl border border-slate-200 overflow-y-auto max-h-[90vh]">
              <h3 className="text-lg font-bold text-slate-800 mb-6">
                {detailedQuote && activeTab === "details" ? t("btnEditQuote") : t("btnCreateQuote")}
              </h3>

              <form onSubmit={handleSaveQuotation} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colCustomer")} *</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.customerId}
                      onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                    >
                      <option value="">Choose Customer</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colLead")}</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.leadId}
                      onChange={(e) => setForm({ ...form, leadId: e.target.value })}
                    >
                      <option value="">Link to Lead (Optional)</option>
                      {leads.map(l => <option key={l.id} value={l.id}>{l.companyName} ({l.contactPerson})</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colIssueDate")} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.issueDate}
                      onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colExpiryDate")} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.expiryDate}
                      onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblPaymentTerms")}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.paymentTerms}
                      onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblDeliveryTerms")}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.deliveryTerms}
                      onChange={(e) => setForm({ ...form, deliveryTerms: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items Row Form */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-sm font-bold text-slate-700">{isRtl ? "بنود العرض" : "Line Items"}</span>
                    <button
                      type="button"
                      onClick={handleAddItemRow}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                    >
                      + Add Item Row
                    </button>
                  </div>

                  {formItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col md:flex-row gap-2.5 items-end bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Product *</label>
                        <select
                          required
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg outline-none"
                          value={item.productId}
                          onChange={(e) => handleItemRowChange(idx, "productId", e.target.value)}
                        >
                          <option value="">Choose Product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
                        </select>
                      </div>

                      <div className="w-24 w-full md:w-auto">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Qty *</label>
                        <input
                          type="number"
                          required
                          min="0.001"
                          step="any"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono"
                          value={item.quantity}
                          onChange={(e) => handleItemRowChange(idx, "quantity", e.target.value)}
                        />
                      </div>

                      <div className="w-28 w-full md:w-auto">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Price *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="any"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono"
                          value={item.unitPrice}
                          onChange={(e) => handleItemRowChange(idx, "unitPrice", e.target.value)}
                        />
                      </div>

                      <div className="w-20 w-full md:w-auto">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Disc %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono"
                          value={item.discountPct}
                          onChange={(e) => handleItemRowChange(idx, "discountPct", e.target.value)}
                        />
                      </div>

                      <div className="w-20 w-full md:w-auto">
                        <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Tax %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg font-mono"
                          value={item.taxPct}
                          onChange={(e) => handleItemRowChange(idx, "taxPct", e.target.value)}
                        />
                      </div>

                      {formItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg transition self-end"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblNotes")}</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblInternalNotes")}</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={form.internalNotes}
                      onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
                  >
                    {t("btnSave")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm"
                  >
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Convert to Invoice Confirmation Modal */}
        {convertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">{t("btnConvertInvoice")}</h3>

              <form onSubmit={handleConvertQuotation} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{isRtl ? "طريقة الدفع" : "Payment Method"} *</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={convertForm.paymentMethod}
                    onChange={(e) => setConvertForm({ ...convertForm, paymentMethod: e.target.value })}
                  >
                    <option value="CASH">Cash</option>
                    <option value="CARD">Card Payment</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{isRtl ? "المبلغ المدفوع" : "Amount Paid"} *</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    value={convertForm.amountPaid}
                    onChange={(e) => setConvertForm({ ...convertForm, amountPaid: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-sm shadow-md"
                  >
                    {isRtl ? "تأكيد وتحويل للفاتورة" : "Confirm & Convert"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm"
                  >
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Rejection Comment Modal */}
        {rejectModalOpen && detailedQuote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <h3 className="text-lg font-bold text-rose-700 mb-2">{t("btnReject")}</h3>
              <p className="text-xs text-slate-500 mb-6">{isRtl ? "الرجاء توفير سبب لرفض عرض السعر هذا." : "Please provide a reason for rejecting this quotation."}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("lblRejectionComment")} *</label>
                  <textarea
                    rows={4}
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                    placeholder={isRtl ? "مثال: السعر منخفض جداً..." : "Example: Price too low..."}
                    value={rejectionComment}
                    onChange={(e) => setRejectionComment(e.target.value)}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                  <button
                    onClick={() => handleRejectQuotation(detailedQuote.id)}
                    disabled={!rejectionComment.trim()}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition text-sm shadow-md"
                  >
                    {t("btnReject")}
                  </button>
                  <button
                    onClick={() => setRejectModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm"
                  >
                    {t("btnCancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
