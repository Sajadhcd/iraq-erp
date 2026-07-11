"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/services/api";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  Clock,
  CheckCircle,
  Calendar,
  Filter,
  UserCheck,
  FileText,
  AlertTriangle,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  Printer,
  CalendarDays,
  Activity,
  Layers,
} from "lucide-react";

export default function LeavePage() {
  const { t, i18n } = useTranslation(["leave", "common"]);
  const isRtl = i18n.language === "ar";

  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "myrequests" | "calendar" | "types">("dashboard");

  // Selection states
  const [employees, setEmployees] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [balances, setBalances] = useState<any[]>([]);

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    pendingRequests: 0,
    approved: 0,
    rejected: 0,
    onLeaveToday: 0,
  });
  const [employeesOnLeaveToday, setEmployeesOnLeaveToday] = useState<any[]>([]);

  // Filters
  const [empFilter, setEmpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  // Modals
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // Form states
  const [requestForm, setRequestForm] = useState({
    id: "",
    employeeId: "",
    leaveTypeId: "",
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date().toISOString().substring(0, 10),
    reason: "",
    attachment: "",
  });

  const [typeForm, setTypeForm] = useState({
    id: "",
    code: "",
    nameAr: "",
    nameEn: "",
    defaultDays: 14,
    paid: true,
    color: "#3B82F6",
    requiresApproval: true,
    active: true,
  });

  const [rejectForm, setRejectForm] = useState({
    id: "",
    reason: "",
  });

  // Load support lists and initial data
  useEffect(() => {
    fetchEmployees();
    fetchLeaveTypes();
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === "myrequests") {
      fetchRequests();
      if (selectedEmployeeId) {
        fetchBalances(selectedEmployeeId);
      } else {
        setBalances([]);
      }
    } else if (activeTab === "dashboard") {
      fetchRequests();
      fetchDashboardData();
    } else if (activeTab === "calendar") {
      fetchRequests();
    }
  }, [selectedEmployeeId, activeTab, empFilter, statusFilter, typeFilter, startDateFilter, endDateFilter]);

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest("/hrms/employees", { params: { limit: "100" } });
      const activeEmps = data.items || [];
      setEmployees(activeEmps);
      if (activeEmps.length > 0 && !selectedEmployeeId) {
        setSelectedEmployeeId(activeEmps[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLeaveTypes = async () => {
    try {
      const data = await apiRequest("/leave/types");
      setLeaveTypes(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const data = await apiRequest("/leave/dashboard");
      if (data) {
        setDashboardStats(data.stats || { pendingRequests: 0, approved: 0, rejected: 0, onLeaveToday: 0 });
        setEmployeesOnLeaveToday(data.employeesOnLeaveToday || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBalances = async (empId: string) => {
    try {
      const data = await apiRequest(`/leave/balances/${empId}`);
      setBalances(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRequests = async () => {
    try {
      const params: any = {};
      if (activeTab === "myrequests" && selectedEmployeeId) {
        params.employeeId = selectedEmployeeId;
      } else if (activeTab === "dashboard" || activeTab === "calendar") {
        if (empFilter) params.employeeId = empFilter;
        if (statusFilter) params.status = statusFilter;
        if (typeFilter) params.leaveTypeId = typeFilter;
        if (startDateFilter) params.startDate = startDateFilter;
        if (endDateFilter) params.endDate = endDateFilter;
      }

      const data = await apiRequest("/leave", { params });
      setLeaveRequests(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Create or Update Request
  const handleSaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestForm.employeeId || !requestForm.leaveTypeId || !requestForm.startDate || !requestForm.endDate) {
      alert(t("errRequiredFields"));
      return;
    }

    try {
      if (requestForm.id) {
        // Edit request (only allowed if DRAFT)
        await apiRequest(`/leave/${requestForm.id}`, {
          method: "PUT",
          body: JSON.stringify(requestForm),
        });
      } else {
        // Create request
        await apiRequest("/leave", {
          method: "POST",
          body: JSON.stringify(requestForm),
        });
      }
      alert(t("successSaved"));
      setRequestModalOpen(false);
      fetchRequests();
      if (requestForm.employeeId) {
        fetchBalances(requestForm.employeeId);
      }
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Submit request
  const handleSubmitRequest = async (id: string) => {
    try {
      await apiRequest(`/leave/${id}/submit`, { method: "POST" });
      alert(t("successSubmitted"));
      fetchRequests();
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Approve request
  const handleApproveRequest = async (id: string, empId: string) => {
    try {
      await apiRequest(`/leave/${id}/approve`, { method: "POST" });
      alert(t("successApproved"));
      fetchRequests();
      fetchDashboardData();
      if (empId === selectedEmployeeId) {
        fetchBalances(empId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Reject Request Trigger
  const triggerRejectRequest = (id: string) => {
    setRejectForm({ id, reason: "" });
    setRejectModalOpen(true);
  };

  // Reject Submit
  const handleRejectRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest(`/leave/${rejectForm.id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectForm.reason }),
      });
      alert(t("successRejected"));
      setRejectModalOpen(false);
      fetchRequests();
      fetchDashboardData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Cancel Request
  const handleCancelRequest = async (id: string, empId: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من إلغاء هذا الطلب؟" : "Are you sure you want to cancel this request?")) return;
    try {
      await apiRequest(`/leave/${id}/cancel`, { method: "POST" });
      alert(t("successCancelled"));
      fetchRequests();
      fetchDashboardData();
      if (empId === selectedEmployeeId) {
        fetchBalances(empId);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create / Update Leave Type
  const handleSaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeForm.code || !typeForm.nameAr || !typeForm.nameEn) {
      alert(t("errRequiredFields"));
      return;
    }

    try {
      if (typeForm.id) {
        await apiRequest(`/leave/types/${typeForm.id}`, {
          method: "PUT",
          body: JSON.stringify(typeForm),
        });
      } else {
        await apiRequest("/leave/types", {
          method: "POST",
          body: JSON.stringify(typeForm),
        });
      }
      alert(t("successTypeSaved"));
      setTypeModalOpen(false);
      fetchLeaveTypes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Leave Type
  const handleDeleteType = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف نوع الإجازة هذا؟" : "Are you sure you want to delete this leave type?")) return;
    try {
      await apiRequest(`/leave/types/${id}`, { method: "DELETE" });
      fetchLeaveTypes();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Helper to get status colors
  const getStatusBadge = (status: string) => {
    let classes = "";
    switch (status) {
      case "DRAFT":
        classes = "bg-slate-50 text-slate-655";
        break;
      case "SUBMITTED":
        classes = "bg-blue-50 text-blue-655";
        break;
      case "APPROVED":
        classes = "bg-emerald-50 text-emerald-655";
        break;
      case "REJECTED":
        classes = "bg-red-50 text-red-655";
        break;
      case "CANCELLED":
        classes = "bg-purple-50 text-purple-655";
        break;
      default:
        classes = "bg-slate-50 text-slate-655";
    }
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${classes}`}>{status}</span>;
  };

  // Print support
  const handlePrint = () => {
    window.print();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-5 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t("title")}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setRequestForm({
                  id: "",
                  employeeId: selectedEmployeeId || (employees.length > 0 ? employees[0].id : ""),
                  leaveTypeId: leaveTypes.length > 0 ? leaveTypes[0].id : "",
                  startDate: new Date().toISOString().substring(0, 10),
                  endDate: new Date().toISOString().substring(0, 10),
                  reason: "",
                  attachment: "",
                });
                setRequestModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t("btnNewRequest")}
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition text-sm"
            >
              <Printer className="h-4 w-4" />
              {isRtl ? "طباعة" : "Print"}
            </button>
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center border-b border-slate-200 pb-4">
          <h1 className="text-xl font-bold text-slate-800">{t("title")}</h1>
          <p className="text-xs text-slate-500 mt-1">{new Date().toLocaleString()}</p>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-200 text-sm font-semibold text-slate-500 gap-6 print:hidden">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-3 transition-all ${
              activeTab === "dashboard" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabDashboard")}
          </button>
          <button
            onClick={() => setActiveTab("myrequests")}
            className={`pb-3 transition-all ${
              activeTab === "myrequests" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabMyRequests")}
          </button>
          <button
            onClick={() => setActiveTab("calendar")}
            className={`pb-3 transition-all ${
              activeTab === "calendar" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabCalendar")}
          </button>
          <button
            onClick={() => setActiveTab("types")}
            className={`pb-3 transition-all ${
              activeTab === "types" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabLeaveTypes")}
          </button>
        </div>

        {/* TAB 1: Dashboard & Approvals Queue */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblPending")}</span>
                <span className="text-3xl font-black text-blue-600 mt-3">{dashboardStats.pendingRequests}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblApproved")}</span>
                <span className="text-3xl font-black text-emerald-600 mt-3">{dashboardStats.approved}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblRejected")}</span>
                <span className="text-3xl font-black text-red-655 mt-3">{dashboardStats.rejected}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblOnLeaveToday")}</span>
                <span className="text-3xl font-black text-purple-655 mt-3">{dashboardStats.onLeaveToday}</span>
              </div>
            </div>

            {/* Approval Queue Panel */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                {t("lblApprovalsQueue")}
              </h2>

              <div className="overflow-x-auto text-xs font-semibold text-slate-500">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">{t("colRequestNumber")}</th>
                      <th className="py-2.5 px-4">{t("colEmployee")}</th>
                      <th className="py-2.5 px-4">{t("colType")}</th>
                      <th className="py-2.5 px-4">{t("colStartDate")}</th>
                      <th className="py-2.5 px-4">{t("colEndDate")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colTotalDays")}</th>
                      <th className="py-2.5 px-4">{t("colReason")}</th>
                      <th className="py-2.5 px-4 text-left">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-650">
                    {(Array.isArray(leaveRequests) ? leaveRequests : []).filter(r => r?.status === "SUBMITTED").map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{r?.requestNumber || "—"}</td>
                        <td className="py-3 px-4 text-slate-800">
                          {(isRtl ? r?.employee?.arabicFullName : r?.employee?.englishFullName) || `${r?.employee?.firstName || ""} ${r?.employee?.lastName || ""}`.trim() || "—"}
                        </td>
                        <td className="py-3 px-4 font-bold" style={{ color: r?.leaveType?.color || "#64748B" }}>
                          {isRtl ? r?.leaveType?.nameAr : r?.leaveType?.nameEn || "—"}
                        </td>
                        <td className="py-3 px-4 font-mono">{r?.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}</td>
                        <td className="py-3 px-4 font-mono">{r?.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{r?.totalDays || 0}</td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{r?.reason || "-"}</td>
                        <td className="py-3 px-4 text-left flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleApproveRequest(r.id, r.employeeId)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <Check className="h-3 w-3" />
                            {t("btnApprove")}
                          </button>
                          <button
                            onClick={() => triggerRejectRequest(r.id)}
                            className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <X className="h-3 w-3" />
                            {t("btnReject")}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(Array.isArray(leaveRequests) ? leaveRequests : []).filter(r => r?.status === "SUBMITTED").length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          {isRtl ? "لا توجد طلبات معلقة للاعتماد حالياً." : "No pending requests in the queue."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employees on Leave Today List */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600" />
                {t("lblOnLeaveToday")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto text-xs">
                {employeesOnLeaveToday.map((e: any) => (
                  <div key={e.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800">
                        {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{e.employeeNumber}</p>
                    </div>
                    <span
                      className="px-2 py-0.5 text-[9px] font-bold text-white rounded"
                      style={{ backgroundColor: e.leaveType.color }}
                    >
                      {isRtl ? e.leaveType.nameAr : e.leaveType.nameEn}
                    </span>
                  </div>
                ))}
                {employeesOnLeaveToday.length === 0 && (
                  <p className="text-slate-400 text-center py-4 col-span-full">
                    {isRtl ? "جميع الموظفين على رأس عملهم اليوم." : "No employees are on leave today."}
                  </p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* TAB 2: My Requests & Balance Allocation */}
        {activeTab === "myrequests" && (
          <div className="space-y-6 animate-fade-in">
            {/* Employee Selector Dropdown for Admin */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 print:hidden">
              <span className="text-xs font-bold text-slate-500">{isRtl ? "استعراض الإجازات للموظف:" : "Browse leaves for Employee:"}</span>
              <select
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 font-bold"
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`} - {e.employeeNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Leave Balance Grid */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblLeaveBalance")}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {balances.map((b) => (
                  <div key={b.leaveTypeId} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 left-0 h-1" style={{ backgroundColor: b.color }} />
                    <span className="text-[10px] font-bold text-slate-400 truncate mt-1">
                      {isRtl ? b.nameAr : b.nameEn}
                    </span>
                    <div className="flex justify-between items-baseline mt-3">
                      <span className="text-2xl font-black text-slate-800">{b.remainingDays}</span>
                      <span className="text-[10px] text-slate-400 font-bold">/ {b.defaultDays} d</span>
                    </div>
                  </div>
                ))}
                {balances.length === 0 && (
                  <p className="text-slate-400 text-xs py-4">{isRtl ? "يرجى تحديد موظف لاستعراض الأرصدة." : "Please select an employee to view balances."}</p>
                )}
              </div>
            </div>

            {/* Employee Request History */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblApprovedList")}</h3>

              <div className="overflow-x-auto text-xs font-semibold text-slate-500">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">{t("colRequestNumber")}</th>
                      <th className="py-2.5 px-4">{t("colType")}</th>
                      <th className="py-2.5 px-4">{t("colStartDate")}</th>
                      <th className="py-2.5 px-4">{t("colEndDate")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colTotalDays")}</th>
                      <th className="py-2.5 px-4">{t("colReason")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colStatus")}</th>
                      <th className="py-2.5 px-4 text-left print:hidden">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-650">
                    {leaveRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">{r.requestNumber}</td>
                        <td className="py-3 px-4 font-bold" style={{ color: r.leaveType.color }}>
                          {isRtl ? r.leaveType.nameAr : r.leaveType.nameEn}
                        </td>
                        <td className="py-3 px-4 font-mono">{new Date(r.startDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 font-mono">{new Date(r.endDate).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{r.totalDays}</td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{r.reason || "-"}</td>
                        <td className="py-3 px-4 text-center">{getStatusBadge(r.status)}</td>
                        <td className="py-3 px-4 text-left flex gap-1 justify-end print:hidden">
                          {r.status === "DRAFT" && (
                            <>
                              <button
                                onClick={() => {
                                  setRequestForm({
                                    id: r.id,
                                    employeeId: r.employeeId,
                                    leaveTypeId: r.leaveTypeId,
                                    startDate: r.startDate.substring(0, 10),
                                    endDate: r.endDate.substring(0, 10),
                                    reason: r.reason || "",
                                    attachment: r.attachment || "",
                                  });
                                  setRequestModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 transition"
                                title={t("common:edit")}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleSubmitRequest(r.id)}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition"
                                title={t("btnSubmit")}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {(r.status === "SUBMITTED" || r.status === "APPROVED") && (
                            <button
                              onClick={() => handleCancelRequest(r.id, r.employeeId)}
                              className="p-1 text-slate-400 hover:text-purple-600 transition"
                              title={t("btnCancelRequest")}
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-400">
                          {isRtl ? "لا توجد سجلات طلبات إجازة للموظف المختار." : "No leave requests found for the selected employee."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: Leave Calendar */}
        {activeTab === "calendar" && (
          <div className="space-y-6 animate-fade-in">
            {/* Filter controls */}
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <select
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  value={empFilter}
                  onChange={(e) => setEmpFilter(e.target.value)}
                >
                  <option value="">{t("filterEmployee")}</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                    </option>
                  ))}
                </select>

                <select
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="">{t("filterType")}</option>
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {isRtl ? t.nameAr : t.nameEn}
                    </option>
                  ))}
                </select>

                <input
                  type="date"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />

                <input
                  type="date"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />

                <button
                  onClick={() => {
                    setEmpFilter("");
                    setTypeFilter("");
                    setStartDateFilter("");
                    setEndDateFilter("");
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg text-xs font-semibold"
                >
                  {isRtl ? "إعادة تعيين الفلاتر" : "Reset"}
                </button>
              </div>
            </div>

            {/* Upcoming leaves grid timeline */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                {isRtl ? "جدول الإجازات القادمة والنشطة" : "Upcoming & Active Leave Schedule"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {(Array.isArray(leaveRequests) ? leaveRequests : []).filter(r => r?.status === "APPROVED").map((r) => (
                  <div key={r.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl relative overflow-hidden flex flex-col justify-between gap-3">
                    <div className="absolute top-0 right-0 bottom-0 w-1.5" style={{ backgroundColor: r?.leaveType?.color || "#64748B" }} />
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-800 text-[13px]">
                          {(isRtl ? r?.employee?.arabicFullName : r?.employee?.englishFullName) || `${r?.employee?.firstName || ""} ${r?.employee?.lastName || ""}`.trim() || "—"}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r?.employee?.employeeNumber || "—"}</p>
                      </div>
                      <span
                        className="px-2 py-0.5 text-[9px] font-bold text-white rounded"
                        style={{ backgroundColor: r?.leaveType?.color || "#64748B" }}
                      >
                        {isRtl ? r?.leaveType?.nameAr : r?.leaveType?.nameEn || "—"}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 text-[11px] font-semibold mt-2">
                      <div className="flex gap-2">
                        <span>{r?.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}</span>
                        <span>←</span>
                        <span>{r?.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}</span>
                      </div>
                      <span className="text-slate-800 font-bold">{r?.totalDays || 0} {isRtl ? "يوم" : "days"}</span>
                    </div>
                  </div>
                ))}
                {(Array.isArray(leaveRequests) ? leaveRequests : []).filter(r => r?.status === "APPROVED").length === 0 && (
                  <p className="text-slate-400 text-center py-8 col-span-full">
                    {isRtl ? "لا توجد إجازات معتمدة في الفترة المحددة." : "No approved leaves found in the schedule."}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Leave Types Management */}
        {activeTab === "types" && (
          <div className="space-y-6 animate-fade-in">
            {/* Create Type trigger button */}
            <div className="flex justify-end print:hidden">
              <button
                onClick={() => {
                  setTypeForm({
                    id: "",
                    code: "",
                    nameAr: "",
                    nameEn: "",
                    defaultDays: 14,
                    paid: true,
                    color: "#3B82F6",
                    requiresApproval: true,
                    active: true,
                  });
                  setTypeModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-650 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {t("btnCreateType")}
              </button>
            </div>

            {/* Leave Types list */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h2 className="text-sm font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Layers className="h-4 w-4 text-blue-600" />
                {t("tabLeaveTypes")}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {leaveTypes.map((t) => (
                  <div key={t.id} className="p-4 bg-slate-50 border border-slate-150 rounded-xl relative overflow-hidden flex flex-col justify-between gap-3">
                    <div className="absolute top-0 right-0 bottom-0 w-1.5" style={{ backgroundColor: t.color }} />
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[9px] font-bold text-slate-450 uppercase">{t.code}</span>
                        <h4 className="font-bold text-slate-800 text-[13px] mt-1">{isRtl ? t.nameAr : t.nameEn}</h4>
                      </div>
                      <span className="font-bold text-slate-700">{t.defaultDays} {isRtl ? "يوم" : "days"}</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-400 mt-2 font-bold text-[10px] print:hidden">
                      <div className="flex gap-2">
                        {t.paid ? (
                          <span className="text-emerald-600">{isRtl ? "مدفوعة" : "Paid"}</span>
                        ) : (
                          <span className="text-slate-500">{isRtl ? "غير مدفوعة" : "Unpaid"}</span>
                        )}
                        {!t.requiresApproval && <span className="text-amber-600">{isRtl ? "لا تتطلب موافقة" : "No approval req"}</span>}
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setTypeForm({
                              id: t.id,
                              code: t.code,
                              nameAr: t.nameAr,
                              nameEn: t.nameEn,
                              defaultDays: t.defaultDays,
                              paid: t.paid,
                              color: t.color,
                              requiresApproval: t.requiresApproval,
                              active: t.active,
                            });
                            setTypeModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteType(t.id)}
                          className="p-1 text-slate-400 hover:text-red-650 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DIALOGS */}
        {/* ======================================================== */}

        {/* 1. Request Leave Modal */}
        {requestModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnNewRequest")}</h3>
                <button onClick={() => setRequestModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveRequest} className="space-y-4 text-xs font-semibold text-slate-500">
                
                <div>
                  <label className="block text-slate-500 mb-1">{t("colEmployee")} *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={requestForm.employeeId}
                    onChange={(e) => setRequestForm({ ...requestForm, employeeId: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">{t("colType")} *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                    value={requestForm.leaveTypeId}
                    onChange={(e) => setRequestForm({ ...requestForm, leaveTypeId: e.target.value })}
                  >
                    <option value="">Select Type</option>
                    {leaveTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {isRtl ? t.nameAr : t.nameEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 mb-1">{t("colStartDate")} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={requestForm.startDate}
                      onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 mb-1">{t("colEndDate")} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={requestForm.endDate}
                      onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">{t("colReason")}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={requestForm.reason}
                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">{t("lblAttachment")}</label>
                  <input
                    type="text"
                    placeholder="URL to attachment file"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    value={requestForm.attachment}
                    onChange={(e) => setRequestForm({ ...requestForm, attachment: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setRequestModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Leave Type Modal */}
        {typeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnCreateType")}</h3>
                <button onClick={() => setTypeModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveType} className="space-y-4 text-xs font-semibold text-slate-500">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("lblCode")} *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ANNUAL"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl uppercase font-mono text-slate-700"
                      value={typeForm.code}
                      onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("lblDefaultDays")} *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={typeForm.defaultDays}
                      onChange={(e) => setTypeForm({ ...typeForm, defaultDays: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-1">{t("lblNameAr")} *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={typeForm.nameAr}
                    onChange={(e) => setTypeForm({ ...typeForm, nameAr: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-1">{t("lblNameEn")} *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={typeForm.nameEn}
                    onChange={(e) => setTypeForm({ ...typeForm, nameEn: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("lblColor")}</label>
                    <input
                      type="color"
                      className="w-full h-8 px-1 py-0.5 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer"
                      value={typeForm.color}
                      onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                    />
                  </div>

                  <div className="flex flex-col justify-end gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={typeForm.paid}
                        onChange={(e) => setTypeForm({ ...typeForm, paid: e.target.checked })}
                      />
                      <span>{t("lblPaid")}</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={typeForm.requiresApproval}
                        onChange={(e) => setTypeForm({ ...typeForm, requiresApproval: e.target.checked })}
                      />
                      <span>{t("lblRequiresApproval")}</span>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setTypeModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Rejection Reason Modal */}
        {rejectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("lblRejectionReason")}</h3>
                <button onClick={() => setRejectModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRejectRequestSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block text-slate-500 mb-1">{t("lblRejectionReason")} *</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Enter reason for rejecting leave request"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
                    value={rejectForm.reason}
                    onChange={(e) => setRejectForm({ ...rejectForm, reason: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnReject")}
                  </button>
                  <button type="button" onClick={() => setRejectModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
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
