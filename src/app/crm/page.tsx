"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import {
  Briefcase, Search, Plus, Edit3, Trash2, Calendar, FileText,
  TrendingUp, Activity, CheckCircle2, AlertCircle, Clock,
  ArrowRight, Upload, Phone, Mail, MapPin, Building, ShieldAlert, Users
} from "lucide-react";
import { showToast } from '@/components/ui/toast';

interface Lead {
  id: string;
  leadNumber: string;
  companyName: string;
  contactPerson: string;
  mobile?: string;
  email?: string;
  country?: string;
  city?: string;
  address?: string;
  industry?: string;
  source?: string;
  expectedValue?: number;
  probability?: number;
  status: string;
  priority: string;
  notes?: string;
  createdAt: string;
  assignedSalesperson?: {
    email: string;
  };
}

interface Opportunity {
  id: string;
  leadId: string;
  lead: {
    companyName: string;
    contactPerson: string;
  };
  expectedRevenue: number;
  expectedClosingDate: string;
  probability: number;
  stage: string;
  assignedUser?: {
    email: string;
  };
}

export default function CRMPage() {
  const { t, i18n } = useTranslation(["crm", "common"]);
  const isRtl = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<"dashboard" | "leads" | "opportunities">("dashboard");

  // CRM Dashboard stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Leads list
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsSearch, setLeadsSearch] = useState("");
  const [leadsStatusFilter, setLeadsStatusFilter] = useState("");
  const [leadsPriorityFilter, setLeadsPriorityFilter] = useState("");

  // Opportunities list
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [oppsTotal, setOppsTotal] = useState(0);
  const [oppsPage, setOppsPage] = useState(1);
  const [oppStageFilter, setOppStageFilter] = useState("");

  // Detailed views & Modals
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [detailedLead, setDetailedLead] = useState<any>(null);

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [leadForm, setLeadForm] = useState({
    companyName: "",
    contactPerson: "",
    mobile: "",
    email: "",
    country: "",
    city: "",
    address: "",
    industry: "",
    source: "",
    expectedValue: "",
    probability: "10",
    status: "NEW",
    priority: "MEDIUM",
    notes: "",
  });

  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [convertForm, setConvertForm] = useState({
    expectedRevenue: "",
    expectedClosingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    probability: "50",
    stage: "QUALIFICATION",
    notes: "",
  });

  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityForm, setActivityForm] = useState({
    type: "CALL",
    date: new Date().toISOString().slice(0, 16),
    reminder: "",
    notes: "",
    status: "PENDING",
  });

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchLeads();
    fetchOpportunities();
  }, [leadsPage, leadsSearch, leadsStatusFilter, leadsPriorityFilter, oppsPage, oppStageFilter]);

  useEffect(() => {
    if (selectedLeadId) {
      fetchDetailedLead(selectedLeadId);
    }
  }, [selectedLeadId]);

  const fetchDashboardStats = async () => {
    try {
      const data = await apiRequest("/crm/dashboard");
      setDashboardStats(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeads = async () => {
    try {
      let query = `?page=${leadsPage}&limit=8`;
      if (leadsSearch) query += `&search=${leadsSearch}`;
      if (leadsStatusFilter) query += `&status=${leadsStatusFilter}`;
      if (leadsPriorityFilter) query += `&priority=${leadsPriorityFilter}`;
      
      const data = await apiRequest(`/crm/leads${query}`);
      setLeads(data.items);
      setLeadsTotal(data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOpportunities = async () => {
    try {
      let query = `?page=${oppsPage}&limit=8`;
      if (oppStageFilter) query += `&stage=${oppStageFilter}`;

      const data = await apiRequest(`/crm/opportunities${query}`);
      setOpportunities(data.items);
      setOppsTotal(data.total);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDetailedLead = async (id: string) => {
    try {
      const data = await apiRequest(`/crm/leads/${id}`);
      setDetailedLead(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Create & Update Lead Handlers
  const handleOpenNewLeadModal = () => {
    setEditingLeadId(null);
    setLeadForm({
      companyName: "",
      contactPerson: "",
      mobile: "",
      email: "",
      country: "",
      city: "",
      address: "",
      industry: "",
      source: "",
      expectedValue: "",
      probability: "10",
      status: "NEW",
      priority: "MEDIUM",
      notes: "",
    });
    setLeadModalOpen(true);
  };

  const handleOpenEditLeadModal = (lead: Lead) => {
    setEditingLeadId(lead.id);
    setLeadForm({
      companyName: lead.companyName,
      contactPerson: lead.contactPerson,
      mobile: lead.mobile || "",
      email: lead.email || "",
      country: lead.country || "",
      city: lead.city || "",
      address: lead.address || "",
      industry: lead.industry || "",
      source: lead.source || "",
      expectedValue: lead.expectedValue?.toString() || "",
      probability: lead.probability?.toString() || "10",
      status: lead.status,
      priority: lead.priority,
      notes: lead.notes || "",
    });
    setLeadModalOpen(true);
  };

  const handleSaveLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...leadForm,
        expectedValue: leadForm.expectedValue ? parseFloat(leadForm.expectedValue) : undefined,
        probability: parseInt(leadForm.probability),
      };

      if (editingLeadId) {
        await apiRequest(`/crm/leads/${editingLeadId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest("/crm/leads", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setLeadModalOpen(false);
      fetchLeads();
      fetchDashboardStats();
      if (selectedLeadId && selectedLeadId === editingLeadId) {
        fetchDetailedLead(selectedLeadId);
      }
    } catch (err: any) {
      showToast(`Error saving lead: ${err.message}`, 'error');
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!window.confirm(isRtl ? "هل أنت متأكد من رغبتك في حذف هذا العميل المحتمل؟" : "Are you sure you want to delete this lead?")) return;
    try {
      await apiRequest(`/crm/leads/${id}`, { method: "DELETE" });
      setSelectedLeadId(null);
      setDetailedLead(null);
      fetchLeads();
      fetchDashboardStats();
    } catch (e: any) {
      showToast(`Deletion failed: ${e.message}`, 'error');
    }
  };

  // Convert Lead Handlers
  const handleOpenConvertModal = () => {
    setConvertForm({
      expectedRevenue: detailedLead?.expectedValue?.toString() || "",
      expectedClosingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      probability: detailedLead?.probability?.toString() || "50",
      stage: "QUALIFICATION",
      notes: "",
    });
    setConvertModalOpen(true);
  };

  const handleConvertLead = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/crm/leads/${detailedLead.id}/convert`, {
        method: "POST",
        body: JSON.stringify({
          expectedRevenue: parseFloat(convertForm.expectedRevenue),
          expectedClosingDate: convertForm.expectedClosingDate,
          probability: parseInt(convertForm.probability),
          stage: convertForm.stage,
          notes: convertForm.notes,
        }),
      });

      setConvertModalOpen(false);
      setSelectedLeadId(null);
      setDetailedLead(null);
      fetchLeads();
      fetchOpportunities();
      fetchDashboardStats();
      showToast(t("successLeadConvert"), 'success');
    } catch (err: any) {
      showToast(`Conversion failed: ${err.message}`, 'error');
    }
  };

  // Schedule Activity Handlers
  const handleOpenActivityModal = () => {
    setActivityForm({
      type: "CALL",
      date: new Date().toISOString().slice(0, 16),
      reminder: "",
      notes: "",
      status: "PENDING",
    });
    setActivityModalOpen(true);
  };

  const handleSaveActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/crm/activities", {
        method: "POST",
        body: JSON.stringify({
          leadId: detailedLead.id,
          type: activityForm.type,
          date: new Date(activityForm.date).toISOString(),
          reminder: activityForm.reminder ? new Date(activityForm.reminder).toISOString() : undefined,
          notes: activityForm.notes,
          status: activityForm.status,
        }),
      });

      setActivityModalOpen(false);
      fetchDetailedLead(detailedLead.id);
    } catch (err: any) {
      showToast(`Error scheduling activity: ${err.message}`, 'error');
    }
  };

  const handleCompleteActivity = async (activityId: string) => {
    try {
      await apiRequest(`/crm/activities/${activityId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      fetchDetailedLead(detailedLead.id);
    } catch (err: any) {
      showToast(`Error completing activity: ${err.message}`, 'error');
    }
  };

  // File Upload Handlers
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detailedLead) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      await apiRequest(`/crm/leads/${detailedLead.id}/attachments`, {
        method: "POST",
        body: formData,
      });

      fetchDetailedLead(detailedLead.id);
    } catch (err: any) {
      showToast(`File upload failed: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Global opportunities stage update
  const handleUpdateOpportunityStage = async (oppId: string, stage: string) => {
    try {
      await apiRequest(`/crm/opportunities/${oppId}`, {
        method: "PUT",
        body: JSON.stringify({ stage }),
      });
      fetchOpportunities();
      fetchDashboardStats();
    } catch (err: any) {
      showToast(`Failed updating stage: ${err.message}`, 'error');
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "NEW": return "bg-sky-50 text-sky-700 border-sky-200";
      case "CONTACTED": return "bg-amber-50 text-amber-700 border-amber-200";
      case "QUALIFIED": return "bg-purple-50 text-purple-700 border-purple-200";
      case "PROPOSAL_SENT": return "bg-indigo-50 text-indigo-700 border-indigo-200";
      case "NEGOTIATION": return "bg-orange-50 text-orange-700 border-orange-200";
      case "WON": return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "LOST": return "bg-rose-50 text-rose-700 border-rose-200";
      default: return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "HIGH": return "bg-rose-50 text-rose-700 font-extrabold";
      case "MEDIUM": return "bg-amber-50 text-amber-700";
      case "LOW": return "bg-slate-50 text-slate-500";
      default: return "bg-slate-50 text-slate-700";
    }
  };

  const formatPrice = (val: number | undefined) => {
    if (val === undefined) return "-";
    return `${val.toLocaleString(isRtl ? "ar-IQ" : "en-US")} د.ع`;
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
          
          {activeTab === "leads" && (
            <button
              onClick={handleOpenNewLeadModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
            >
              <Plus className="h-4 w-4" />
              <span>{t("btnNewLead")}</span>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-6 overflow-x-auto scrollbar-none pb-1">
          {[
            { id: "dashboard", name: t("tabDashboard"), icon: Briefcase },
            { id: "leads", name: t("tabLeads"), icon: Users },
            { id: "opportunities", name: t("tabOpportunities"), icon: TrendingUp },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSelectedLeadId(null);
                  setDetailedLead(null);
                }}
                className={`pb-3 text-sm font-bold transition shrink-0 ${
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

        {/* 1. Dashboard Overview Tab */}
        {activeTab === "dashboard" && dashboardStats && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { label: t("lblNewLeads"), value: dashboardStats.newLeads, icon: Clock, color: "text-sky-600 bg-sky-50" },
                { label: t("lblWonDeals"), value: dashboardStats.wonDeals, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
                { label: t("lblLostDeals"), value: dashboardStats.lostDeals, icon: AlertCircle, color: "text-rose-600 bg-rose-50" },
                { label: t("lblPipeline"), value: formatPrice(dashboardStats.pipelineValue), icon: Briefcase, color: "text-blue-600 bg-blue-50" },
                { label: t("lblConversionRate"), value: `${dashboardStats.conversionRate}%`, icon: TrendingUp, color: "text-purple-600 bg-purple-50" },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between shadow-sm">
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <span className="text-slate-500 text-xs font-semibold">{stat.label}</span>
                      <h3 className="text-xl font-black text-slate-800 mt-2">{stat.value}</h3>
                    </div>
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${stat.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts & Funnel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Funnel Stage distribution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4">{t("lblFunnelChart")}</h3>
                <div className="space-y-4">
                  {(dashboardStats.funnel || []).map((stage: any, idx: number) => {
                    const maxCount = Math.max(...(dashboardStats.funnel || []).map((f: any) => f.count), 1);
                    const pct = (stage.count / maxCount) * 100;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span>{stage.stage}</span>
                          <span className="font-mono text-slate-500">{stage.count} deals | {formatPrice(stage.value)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800 border-b pb-3 mb-4">{t("lblTrendsChart")}</h3>
                <div className="space-y-4">
                  {(dashboardStats.statusDistribution || []).map((item: any, idx: number) => {
                    const totalCount = dashboardStats.totalLeads || 1;
                    const pct = ((item.count / totalCount) * 100).toFixed(1);
                    return (
                      <div key={idx} className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-650">
                        <span className="w-24 truncate">{item.status}</span>
                        <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-mono font-bold">{item.count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. Leads Tab */}
        {activeTab === "leads" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            
            {/* Leads Table & list (Left 2 columns) */}
            <div className="xl:col-span-2 space-y-4">
              
              {/* Search & Filters */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder={t("filterSearch")}
                    value={leadsSearch}
                    onChange={(e) => setLeadsSearch(e.target.value)}
                  />
                  <Search className={`absolute top-2.5 h-4 w-4 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <select
                    value={leadsStatusFilter}
                    onChange={(e) => setLeadsStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                  >
                    <option value="">{t("filterStatus")}</option>
                    <option value="NEW">{t("statusNew")}</option>
                    <option value="CONTACTED">{t("statusContacted")}</option>
                    <option value="QUALIFIED">{t("statusQualified")}</option>
                    <option value="PROPOSAL_SENT">{t("statusProposal")}</option>
                    <option value="NEGOTIATION">{t("statusNegotiation")}</option>
                    <option value="WON">{t("statusWon")}</option>
                    <option value="LOST">{t("statusLost")}</option>
                  </select>

                  <select
                    value={leadsPriorityFilter}
                    onChange={(e) => setLeadsPriorityFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:bg-white"
                  >
                    <option value="">{t("filterPriority")}</option>
                    <option value="LOW">{t("priorityLow")}</option>
                    <option value="MEDIUM">{t("priorityMedium")}</option>
                    <option value="HIGH">{t("priorityHigh")}</option>
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-slate-600 text-center">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                    <tr>
                      <th className="px-4 py-3">{t("colLeadNo")}</th>
                      <th className="px-4 py-3">{t("colCompany")}</th>
                      <th className="px-4 py-3">{t("colContact")}</th>
                      <th className="px-4 py-3">{t("colExpectedValue")}</th>
                      <th className="px-4 py-3">{t("colStatus")}</th>
                      <th className="px-4 py-3">{t("colPriority")}</th>
                      <th className="px-4 py-3 print:hidden">{t("actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150">
                    {leads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        onClick={() => setSelectedLeadId(lead.id)}
                        className={`hover:bg-slate-50/50 cursor-pointer transition ${selectedLeadId === lead.id ? "bg-blue-50/40" : ""}`}
                      >
                        <td className="px-4 py-3 font-mono text-slate-500 text-xs">{lead.leadNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-800">{lead.companyName}</td>
                        <td className="px-4 py-3 text-slate-500">{lead.contactPerson}</td>
                        <td className="px-4 py-3 font-mono font-bold">{lead.expectedValue ? formatPrice(lead.expectedValue) : "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadgeClass(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityBadgeClass(lead.priority)}`}>
                            {lead.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 print:hidden" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <button 
                              onClick={() => handleOpenEditLeadModal(lead)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-500"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-1 hover:bg-rose-50 rounded text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detailed view (Right column) */}
            <div className="xl:col-span-1">
              {!detailedLead && (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 text-sm">
                  {isRtl ? "اختر عميلاً محتملاً لعرض التفاصيل والخط الزمني." : "Select a lead to view details and action timeline."}
                </div>
              )}

              {detailedLead && (
                <div className="space-y-6">
                  {/* Summary Card */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-slate-400 font-mono text-[10px] font-bold block">{detailedLead.leadNumber}</span>
                        <h3 className="text-lg font-black text-slate-800 mt-0.5">{detailedLead.companyName}</h3>
                        <p className="text-xs text-slate-500 font-semibold">{detailedLead.contactPerson}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadgeClass(detailedLead.status)}`}>
                        {detailedLead.status}
                      </span>
                    </div>

                    <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
                      {detailedLead.mobile && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono">{detailedLead.mobile}</span>
                        </div>
                      )}
                      {detailedLead.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-mono">{detailedLead.email}</span>
                        </div>
                      )}
                      {(detailedLead.city || detailedLead.country) && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          <span>{detailedLead.city}, {detailedLead.country}</span>
                        </div>
                      )}
                      {detailedLead.industry && (
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-slate-400" />
                          <span>{detailedLead.industry}</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {detailedLead.status !== "WON" && (
                        <button
                          onClick={handleOpenConvertModal}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex justify-center items-center gap-1.5"
                        >
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span>{t("btnConvert")}</span>
                        </button>
                      )}
                      <button
                        onClick={handleOpenActivityModal}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1"
                      >
                        <Activity className="h-3.5 w-3.5" />
                        <span>{t("btnAddActivity")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Scheduled Activities Panel */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">{t("lblActivities")}</h4>
                    <div className="space-y-3">
                      {(detailedLead.activities || []).map((act: any) => (
                        <div key={act.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                          <div>
                            <span className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-bold uppercase text-[9px]">{act.type}</span>
                            <span className="font-mono text-slate-500 block mt-1.5">{new Date(act.date).toLocaleString()}</span>
                            <p className="text-slate-700 mt-1 font-semibold">{act.notes || "لا توجد ملاحظات"}</p>
                          </div>
                          {act.status === "PENDING" && (
                            <button
                              onClick={() => handleCompleteActivity(act.id)}
                              className="p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition"
                              title={isRtl ? "تحديد كمكتمل" : "Mark completed"}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* File Attachments */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">{t("lblAttachments")}</h4>
                    
                    <div className="space-y-3">
                      {(detailedLead.attachments || []).map((att: any) => (
                        <div key={att.id} className="flex justify-between items-center text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span className="font-semibold text-slate-750 truncate max-w-[150px]">{att.fileName}</span>
                          </div>
                          <span className="font-mono text-slate-400 text-[10px]">{(att.size / 1024).toFixed(1)} KB</span>
                        </div>
                      ))}
                    </div>

                    <div className="relative pt-2">
                      <input
                        type="file"
                        id="crm-file-upload"
                        onChange={handleUploadFile}
                        className="hidden"
                        accept=".pdf,.docx,image/*"
                      />
                      <label
                        htmlFor="crm-file-upload"
                        className="w-full py-2.5 border border-dashed border-slate-300 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="h-4 w-4 text-slate-400" />
                        <span>{uploading ? "Uploading..." : t("btnUpload")}</span>
                      </label>
                    </div>
                  </div>

                  {/* Action Timeline */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b pb-2">{t("lblTimeline")}</h4>
                    
                    <div className="relative border-l border-slate-150 pl-4 space-y-5">
                      {(detailedLead.timelineEvents || []).map((ev: any) => (
                        <div key={ev.id} className="relative text-xs">
                          {/* Bullet marker */}
                          <div className="absolute -left-[21.5px] top-1.5 h-2 w-2 rounded-full bg-blue-600 border border-white" />
                          <span className="font-mono text-slate-400 text-[10px] block">{new Date(ev.createdAt).toLocaleString()}</span>
                          <span className="font-bold text-slate-700 block mt-0.5">{ev.type}</span>
                          <p className="text-slate-500 font-semibold">{ev.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        )}

        {/* 3. Opportunities Tab */}
        {activeTab === "opportunities" && (
          <div className="space-y-4">
            
            {/* Stage filter */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4">
              <span className="text-xs font-bold text-slate-500">{t("colStage")}:</span>
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {[
                  { id: "", name: isRtl ? "الكل" : "All" },
                  { id: "QUALIFICATION", name: t("stageQual") },
                  { id: "PROPOSAL", name: t("stageProposal") },
                  { id: "NEGOTIATION", name: t("stageNego") },
                  { id: "CLOSED_WON", name: t("stageWon") },
                  { id: "CLOSED_LOST", name: t("stageLost") },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setOppStageFilter(st.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                      oppStageFilter === st.id
                        ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-650"
                    }`}
                  >
                    {st.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Opportunities Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm text-slate-600 text-center">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                  <tr>
                    <th className="px-4 py-3">{t("colCompany")}</th>
                    <th className="px-4 py-3">{t("colContact")}</th>
                    <th className="px-4 py-3 text-emerald-600">{t("colExpectedRevenue")}</th>
                    <th className="px-4 py-3">{t("colProbability")}</th>
                    <th className="px-4 py-3">{t("colClosingDate")}</th>
                    <th className="px-4 py-3">{t("colStage")}</th>
                    <th className="px-4 py-3">{t("colAssigned")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3 font-bold text-slate-800">{opp.lead.companyName}</td>
                      <td className="px-4 py-3 text-slate-500">{opp.lead.contactPerson}</td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600">{formatPrice(opp.expectedRevenue)}</td>
                      <td className="px-4 py-3 font-mono font-bold">{opp.probability}%</td>
                      <td className="px-4 py-3">{new Date(opp.expectedClosingDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <select
                          value={opp.stage}
                          onChange={(e) => handleUpdateOpportunityStage(opp.id, e.target.value)}
                          className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                        >
                          <option value="QUALIFICATION">{t("stageQual")}</option>
                          <option value="PROPOSAL">{t("stageProposal")}</option>
                          <option value="NEGOTIATION">{t("stageNego")}</option>
                          <option value="CLOSED_WON">{t("stageWon")}</option>
                          <option value="CLOSED_LOST">{t("stageLost")}</option>
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono">{opp.assignedUser?.email || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ==========================================
            MODAL FORMS
           ========================================== */}

        {/* 1. Lead Add/Edit Modal */}
        {leadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl border border-slate-200 overflow-y-auto max-h-[85vh]">
              <h3 className="text-lg font-bold text-slate-800 mb-6">
                {editingLeadId ? t("btnEditLead") : t("btnNewLead")}
              </h3>
              
              <form onSubmit={handleSaveLead} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colCompany")} *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={leadForm.companyName}
                      onChange={(e) => setLeadForm({ ...leadForm, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colContact")} *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={leadForm.contactPerson}
                      onChange={(e) => setLeadForm({ ...leadForm, contactPerson: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colMobile")}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      value={leadForm.mobile}
                      onChange={(e) => setLeadForm({ ...leadForm, mobile: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colEmail")}</label>
                    <input
                      type="email"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      value={leadForm.email}
                      onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colExpectedValue")}</label>
                    <input
                      type="number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      value={leadForm.expectedValue}
                      onChange={(e) => setLeadForm({ ...leadForm, expectedValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colProbability")} (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      value={leadForm.probability}
                      onChange={(e) => setLeadForm({ ...leadForm, probability: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colStatus")}</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={leadForm.status}
                      onChange={(e) => setLeadForm({ ...leadForm, status: e.target.value })}
                    >
                      <option value="NEW">{t("statusNew")}</option>
                      <option value="CONTACTED">{t("statusContacted")}</option>
                      <option value="QUALIFIED">{t("statusQualified")}</option>
                      <option value="PROPOSAL_SENT">{t("statusProposal")}</option>
                      <option value="NEGOTIATION">{t("statusNegotiation")}</option>
                      <option value="WON">{t("statusWon")}</option>
                      <option value="LOST">{t("statusLost")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">{t("colPriority")}</label>
                    <select
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={leadForm.priority}
                      onChange={(e) => setLeadForm({ ...leadForm, priority: e.target.value })}
                    >
                      <option value="LOW">{t("priorityLow")}</option>
                      <option value="MEDIUM">{t("priorityMedium")}</option>
                      <option value="HIGH">{t("priorityHigh")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{isRtl ? "ملاحظات وتفاصيل إضافية" : "Notes / Additional Details"}</label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={leadForm.notes}
                    onChange={(e) => setLeadForm({ ...leadForm, notes: e.target.value })}
                  />
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
                    onClick={() => setLeadModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition text-sm"
                  >
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Convert to Opportunity Modal */}
        {convertModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">{t("btnConvert")}</h3>
              
              <form onSubmit={handleConvertLead} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("colExpectedRevenue")} *</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    value={convertForm.expectedRevenue}
                    onChange={(e) => setConvertForm({ ...convertForm, expectedRevenue: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("colClosingDate")} *</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={convertForm.expectedClosingDate}
                    onChange={(e) => setConvertForm({ ...convertForm, expectedClosingDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("colProbability")} (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    value={convertForm.probability}
                    onChange={(e) => setConvertForm({ ...convertForm, probability: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-100 justify-end">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
                  >
                    {t("confirm")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConvertModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition text-sm"
                  >
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Schedule Activity Modal */}
        {activityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">{t("btnAddActivity")}</h3>
              
              <form onSubmit={handleSaveActivity} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{isRtl ? "نوع النشاط" : "Activity Type"} *</label>
                  <select
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={activityForm.type}
                    onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })}
                  >
                    <option value="CALL">{t("actCall")}</option>
                    <option value="MEETING">{t("actMeeting")}</option>
                    <option value="EMAIL">{t("actEmail")}</option>
                    <option value="TASK">{t("actTask")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{t("colClosingDate")} *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={activityForm.date}
                    onChange={(e) => setActivityForm({ ...activityForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">{isRtl ? "تفاصيل النشاط" : "Details / Memo"}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={activityForm.notes}
                    onChange={(e) => setActivityForm({ ...activityForm, notes: e.target.value })}
                  />
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
                    onClick={() => setActivityModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition text-sm"
                  >
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
