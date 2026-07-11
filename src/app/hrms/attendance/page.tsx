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
} from "lucide-react";

export default function AttendancePage() {
  const { t, i18n } = useTranslation(["attendance", "common"]);
  const isRtl = i18n.language === "ar";

  // Tab State
  const [activeTab, setActiveTab] = useState<"logs" | "dashboard" | "settings">("logs");

  // Date and filter states
  const [employees, setEmployees] = useState<any[]>([]);
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  
  // Monthly stats
  const [stats, setStats] = useState({
    presentCount: 0,
    absentCount: 0,
    leaveCount: 0,
    holidayCount: 0,
    totalWorkHours: 0.0,
    totalOvertimeHours: 0.0,
    totalLateMinutes: 0,
  });

  // Today's Dashboard stats & lists
  const [todayDashboard, setTodayDashboard] = useState<any>({
    todayStats: {
      presentCount: 0,
      lateCount: 0,
      absentCount: 0,
      overtimeCount: 0,
    },
    presentEmployees: [],
    lateEmployees: [],
    absentEmployees: [],
    overtimeEmployees: [],
  });

  // Policy Settings Form State
  const [policyForm, setPolicyForm] = useState({
    startTime: "09:00",
    endTime: "17:00",
    gracePeriod: 15,
    minWorkHours: 8,
    overtimeStartsAfter: 8,
    weekendDays: [5, 6] as number[], // Friday, Saturday
  });

  // Filters
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [empFilter, setEmpFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Dialog Modals
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Form states
  const [checkInForm, setCheckInForm] = useState({
    employeeId: "",
    checkInTime: new Date().toISOString().substring(0, 16),
    notes: "",
  });

  const [checkOutForm, setCheckOutForm] = useState({
    employeeId: "",
    checkOutTime: new Date().toISOString().substring(0, 16),
    notes: "",
  });

  const [manualForm, setManualForm] = useState({
    employeeId: "",
    attendanceDate: new Date().toISOString().substring(0, 10),
    checkIn: "",
    checkOut: "",
    status: "PRESENT",
    notes: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    employeeId: "",
    attendanceDate: "",
    checkIn: "",
    checkOut: "",
    status: "PRESENT",
    notes: "",
  });

  // Load support lists and initial data
  useEffect(() => {
    fetchEmployeesList();
    fetchPolicy();
  }, []);

  useEffect(() => {
    if (activeTab === "logs") {
      fetchAttendanceData();
      fetchMonthlySummary();
    } else if (activeTab === "dashboard") {
      fetchTodayDashboard();
    }
  }, [page, empFilter, statusFilter, startDate, endDate, selectedMonth, selectedYear, activeTab]);

  const fetchEmployeesList = async () => {
    try {
      const data = await apiRequest("/hrms/employees", { params: { limit: "100" } });
      setEmployees(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPolicy = async () => {
    try {
      const data = await apiRequest("/attendance/policy");
      if (data) {
        setPolicyForm(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const params: any = {
        page: page.toString(),
        limit: "10",
      };
      if (empFilter) params.employeeId = empFilter;
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await apiRequest("/attendance", { params });
      setAttendanceList(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const data = await apiRequest("/attendance/monthly", {
        params: {
          year: selectedYear,
          month: selectedMonth,
        },
      });
      if (data && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTodayDashboard = async () => {
    try {
      const data = await apiRequest("/attendance/dashboard");
      if (data) {
        setTodayDashboard(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Check In Submit
  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInForm.employeeId) {
      alert(isRtl ? "يرجى تحديد الموظف" : "Please select an employee");
      return;
    }
    try {
      await apiRequest("/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({
          employeeId: checkInForm.employeeId,
          checkInTime: new Date(checkInForm.checkInTime).toISOString(),
          notes: checkInForm.notes,
        }),
      });
      alert(t("successCheckIn"));
      setCheckInModalOpen(false);
      setCheckInForm({ employeeId: "", checkInTime: new Date().toISOString().substring(0, 16), notes: "" });
      fetchAttendanceData();
      fetchMonthlySummary();
      fetchTodayDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Check Out Submit
  const handleCheckOut = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkOutForm.employeeId) {
      alert(isRtl ? "يرجى تحديد الموظف" : "Please select an employee");
      return;
    }
    try {
      await apiRequest("/attendance/check-out", {
        method: "PUT",
        body: JSON.stringify({
          employeeId: checkOutForm.employeeId,
          checkOutTime: new Date(checkOutForm.checkOutTime).toISOString(),
          notes: checkOutForm.notes,
        }),
      });
      alert(t("successCheckOut"));
      setCheckOutModalOpen(false);
      setCheckOutForm({ employeeId: "", checkOutTime: new Date().toISOString().substring(0, 16), notes: "" });
      fetchAttendanceData();
      fetchMonthlySummary();
      fetchTodayDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Manual Creation Submit
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.employeeId || !manualForm.attendanceDate) {
      alert(isRtl ? "يرجى تعبئة الحقول المطلوبة" : "Please fill required fields");
      return;
    }

    const checkInIso = manualForm.checkIn ? new Date(manualForm.checkIn).toISOString() : null;
    const checkOutIso = manualForm.checkOut ? new Date(manualForm.checkOut).toISOString() : null;

    if (checkInIso && checkOutIso && new Date(checkOutIso).getTime() < new Date(checkInIso).getTime()) {
      alert(t("errCheckOutBeforeCheckIn"));
      return;
    }

    try {
      await apiRequest("/attendance", {
        method: "POST",
        body: JSON.stringify({
          employeeId: manualForm.employeeId,
          attendanceDate: new Date(manualForm.attendanceDate).toISOString(),
          checkIn: checkInIso,
          checkOut: checkOutIso,
          status: manualForm.status,
          notes: manualForm.notes,
        }),
      });
      alert(t("successCreated"));
      setManualModalOpen(false);
      setManualForm({
        employeeId: "",
        attendanceDate: new Date().toISOString().substring(0, 10),
        checkIn: "",
        checkOut: "",
        status: "PRESENT",
        notes: "",
      });
      fetchAttendanceData();
      fetchMonthlySummary();
      fetchTodayDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Edit / Update Record
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checkInIso = editForm.checkIn ? new Date(editForm.checkIn).toISOString() : null;
    const checkOutIso = editForm.checkOut ? new Date(editForm.checkOut).toISOString() : null;

    if (checkInIso && checkOutIso && new Date(checkOutIso).getTime() < new Date(checkInIso).getTime()) {
      alert(t("errCheckOutBeforeCheckIn"));
      return;
    }

    try {
      await apiRequest(`/attendance/${editForm.id}`, {
        method: "PUT",
        body: JSON.stringify({
          checkIn: checkInIso,
          checkOut: checkOutIso,
          status: editForm.status,
          notes: editForm.notes,
        }),
      });
      alert(t("successUpdated"));
      setEditModalOpen(false);
      fetchAttendanceData();
      fetchMonthlySummary();
      fetchTodayDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Delete Record
  const handleDeleteAttendance = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا السجل بشكل نهائي؟" : "Are you sure you want to permanently delete this record?")) return;
    try {
      await apiRequest(`/attendance/${id}`, { method: "DELETE" });
      alert(t("successDeleted"));
      fetchAttendanceData();
      fetchMonthlySummary();
      fetchTodayDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Policy Settings
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/attendance/policy", {
        method: "POST",
        body: JSON.stringify(policyForm),
      });
      alert(t("successPolicySaved"));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleWeekendDay = (day: number) => {
    const currentDays = Array.isArray(policyForm.weekendDays) ? policyForm.weekendDays : [];
    if (currentDays.includes(day)) {
      setPolicyForm({
        ...policyForm,
        weekendDays: currentDays.filter((d) => d !== day),
      });
    } else {
      setPolicyForm({
        ...policyForm,
        weekendDays: [...currentDays, day],
      });
    }
  };

  const daysOfWeek = isRtl
    ? [
        { label: "الأحد", val: 0 },
        { label: "الاثنين", val: 1 },
        { label: "الثلاثاء", val: 2 },
        { label: "الأربعاء", val: 3 },
        { label: "الخميس", val: 4 },
        { label: "الجمعة", val: 5 },
        { label: "السبت", val: 6 },
      ]
    : [
        { label: "Sunday", val: 0 },
        { label: "Monday", val: 1 },
        { label: "Tuesday", val: 2 },
        { label: "Wednesday", val: 3 },
        { label: "Thursday", val: 4 },
        { label: "Friday", val: 5 },
        { label: "Saturday", val: 6 },
      ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t("title")}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCheckInModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition text-sm shadow-md"
            >
              <Play className="h-4 w-4" />
              {t("btnCheckIn")}
            </button>

            <button
              onClick={() => setCheckOutModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition text-sm shadow-md"
            >
              <Square className="h-4 w-4" />
              {t("btnCheckOut")}
            </button>

            <button
              onClick={() => setManualModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
            >
              <Plus className="h-4 w-4" />
              {t("btnManualEntry")}
            </button>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-200 text-sm font-semibold text-slate-500 gap-6">
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3 transition-all ${
              activeTab === "logs" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabLogs")}
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-3 transition-all ${
              activeTab === "dashboard" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabDashboard")}
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3 transition-all ${
              activeTab === "settings" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabSettings")}
          </button>
        </div>

        {/* TAB 1: Attendance Logs */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
            {/* Monthly stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblPresent")}</span>
                <span className="text-2xl font-black text-emerald-600 mt-2">{stats.presentCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblAbsent")}</span>
                <span className="text-2xl font-black text-red-650 mt-2">{stats.absentCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblOnLeave")}</span>
                <span className="text-2xl font-black text-blue-650 mt-2">{stats.leaveCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblHoliday")}</span>
                <span className="text-2xl font-black text-purple-650 mt-2">{stats.holidayCount}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblTotalWorkHours")}</span>
                <span className="text-2xl font-black text-slate-800 mt-2">{stats.totalWorkHours}h</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblTotalOvertime")}</span>
                <span className="text-2xl font-black text-orange-600 mt-2">+{stats.totalOvertimeHours}h</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblTotalLate")}</span>
                <span className="text-2xl font-black text-amber-600 mt-2">{stats.totalLateMinutes}m</span>
              </div>
            </div>

            {/* Filters panel & grid */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                <div className="flex gap-2">
                  <select
                    className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, "0")}
                      </option>
                    ))}
                  </select>

                  <select
                    className="w-1/2 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {["2025", "2026", "2027", "2028"].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <select
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
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
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">{t("filterStatus")}</option>
                  <option value="PRESENT">{t("lblPresent")}</option>
                  <option value="ABSENT">{t("lblAbsent")}</option>
                  <option value="LEAVE">{t("lblOnLeave")}</option>
                  <option value="HOLIDAY">{t("lblHoliday")}</option>
                </select>

                <input
                  type="date"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />

                <input
                  type="date"
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />

                <button
                  onClick={() => {
                    setEmpFilter("");
                    setStatusFilter("");
                    setStartDate("");
                    setEndDate("");
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-lg text-xs font-semibold transition"
                >
                  {isRtl ? "إعادة تعيين الفلاتر" : "Reset Filters"}
                </button>
              </div>

              {/* Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs font-medium text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">{t("colDate")}</th>
                      <th className="py-2.5 px-4">{t("colEmployee")}</th>
                      <th className="py-2.5 px-4">{t("colCheckIn")}</th>
                      <th className="py-2.5 px-4">{t("colCheckOut")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colWorkHours")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colOvertime")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colLate")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colStatus")}</th>
                      <th className="py-2.5 px-4 text-left">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendanceList.map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-semibold">
                          {new Date(record.attendanceDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {record.employee ? ((isRtl ? record.employee.arabicFullName : record.employee.englishFullName) || `${record.employee.firstName} ${record.employee.lastName}`) : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-500 font-mono">
                          {record.checkOut ? new Date(record.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "-"}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-800">{record.workHours}h</td>
                        <td className="py-3 px-4 text-center text-orange-655 font-bold">
                          {Number(record.overtimeHours) > 0 ? `+${record.overtimeHours}h` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-655 font-bold">
                          {record.lateMinutes > 0 ? `${record.lateMinutes}m` : "-"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              record.status === "PRESENT"
                                ? "bg-emerald-50 text-emerald-655"
                                : record.status === "ABSENT"
                                  ? "bg-red-50 text-red-655"
                                  : record.status === "LEAVE"
                                    ? "bg-blue-50 text-blue-655"
                                    : "bg-purple-50 text-purple-655"
                            }`}
                          >
                            {t(`lbl${record.status.charAt(0) + record.status.slice(1).toLowerCase()}`)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left flex gap-1 justify-end">
                          <button
                            onClick={() => {
                              setEditForm({
                                id: record.id,
                                employeeId: record.employeeId,
                                attendanceDate: record.attendanceDate.substring(0, 10),
                                checkIn: record.checkIn ? record.checkIn.substring(0, 16) : "",
                                checkOut: record.checkOut ? record.checkOut.substring(0, 16) : "",
                                status: record.status,
                                notes: record.notes || "",
                              });
                              setEditModalOpen(true);
                            }}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAttendance(record.id)}
                            className="p-1 text-slate-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 10 && (
                <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-slate-500 text-[10px]">
                  <span>
                    {isRtl
                      ? `عرض ${(page - 1) * 10 + 1} إلى ${Math.min(page * 10, total)} من أصل ${total}`
                      : `Showing ${(page - 1) * 10 + 1} to ${Math.min(page * 10, total)} of ${total}`}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page * 10 >= total}
                      className="p-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 transition"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 2: Today's Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? "حاضر اليوم" : "Present Today"}</span>
                <span className="text-3xl font-black text-emerald-600 mt-3">{todayDashboard.todayStats?.presentCount || 0}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? "متأخر اليوم" : "Late Today"}</span>
                <span className="text-3xl font-black text-amber-600 mt-3">{todayDashboard.todayStats?.lateCount || 0}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? "غائب اليوم" : "Absent Today"}</span>
                <span className="text-3xl font-black text-red-655 mt-3">{todayDashboard.todayStats?.absentCount || 0}</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isRtl ? "عمل إضافي اليوم" : "Overtime Today"}</span>
                <span className="text-3xl font-black text-orange-655 mt-3">{todayDashboard.todayStats?.overtimeCount || 0}</span>
              </div>
            </div>

            {/* Employees split lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
              
              {/* Late List */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblTodayLateList")}</h3>
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                  {todayDashboard.lateEmployees?.length > 0 ? (
                    todayDashboard.lateEmployees.map((e: any) => (
                      <div key={e.id} className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                        </span>
                        <span className="text-amber-650 font-mono font-bold">{e.employeeNumber}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">{isRtl ? "لا يوجد متأخرين اليوم" : "No late employees today"}</p>
                  )}
                </div>
              </div>

              {/* Overtime List */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblTodayOvertimeList")}</h3>
                <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
                  {todayDashboard.overtimeEmployees?.length > 0 ? (
                    todayDashboard.overtimeEmployees.map((e: any) => (
                      <div key={e.id} className="py-2.5 flex justify-between items-center">
                        <span className="font-bold text-slate-800">
                          {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                        </span>
                        <span className="text-orange-650 font-mono font-bold">{e.employeeNumber}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">{isRtl ? "لا يوجد عمل إضافي اليوم" : "No overtime today"}</p>
                  )}
                </div>
              </div>

              {/* Absent List */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 lg:col-span-2">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblTodayAbsentList")}</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[350px] overflow-y-auto">
                  {todayDashboard.absentEmployees?.length > 0 ? (
                    todayDashboard.absentEmployees.map((e: any) => (
                      <div key={e.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex flex-col justify-center">
                        <span className="font-bold text-slate-800 text-[11px]">
                          {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono mt-1">{e.employeeNumber}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4 col-span-full">{isRtl ? "الجميع حاضرون اليوم!" : "Everyone is present today!"}</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: Policy Settings */}
        {activeTab === "settings" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm max-w-2xl animate-fade-in">
            <h2 className="text-base font-black text-slate-800 border-b border-slate-150 pb-3 mb-6 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {t("tabSettings")}
            </h2>

            <form onSubmit={handleSavePolicy} className="space-y-6 text-xs font-semibold text-slate-500">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-550 mb-1">{t("lblStartTime")} *</label>
                  <input
                    type="time"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    value={policyForm.startTime}
                    onChange={(e) => setPolicyForm({ ...policyForm, startTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-slate-550 mb-1">{t("lblEndTime")} *</label>
                  <input
                    type="time"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    value={policyForm.endTime}
                    onChange={(e) => setPolicyForm({ ...policyForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-550 mb-1">{t("lblGracePeriod")} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={policyForm.gracePeriod}
                    onChange={(e) => setPolicyForm({ ...policyForm, gracePeriod: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-slate-550 mb-1">{t("lblMinWorkHours")} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={policyForm.minWorkHours}
                    onChange={(e) => setPolicyForm({ ...policyForm, minWorkHours: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="block text-slate-550 mb-1">{t("lblOvertimeRule")} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={policyForm.overtimeStartsAfter}
                    onChange={(e) => setPolicyForm({ ...policyForm, overtimeStartsAfter: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              {/* Weekends Selection */}
              <div>
                <label className="block text-slate-550 mb-2">{t("lblWeekends")}</label>
                <div className="flex flex-wrap gap-2">
                  {daysOfWeek.map((day) => {
                    const isSelected = (Array.isArray(policyForm.weekendDays) ? policyForm.weekendDays : []).includes(day.val);
                    return (
                      <button
                        type="button"
                        key={day.val}
                        onClick={() => toggleWeekendDay(day.val)}
                        className={`px-4 py-2 rounded-xl text-[11px] font-bold border transition flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-blue-50 border-blue-400 text-blue-700"
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600"
                        }`}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-150">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
                >
                  <Save className="h-4 w-4" />
                  {isRtl ? "حفظ السياسة" : "Save Policy"}
                </button>
              </div>

            </form>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DIALOGS */}
        {/* ======================================================== */}

        {/* 1. Register Check-In Modal */}
        {checkInModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnCheckIn")}</h3>
                <button onClick={() => setCheckInModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCheckIn} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block text-slate-500 mb-1">{t("colEmployee")} *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={checkInForm.employeeId}
                    onChange={(e) => setCheckInForm({ ...checkInForm, employeeId: e.target.value })}
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
                  <label className="block text-slate-500 mb-1">{t("colCheckIn")} *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    value={checkInForm.checkInTime}
                    onChange={(e) => setCheckInForm({ ...checkInForm, checkInTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">{t("colNotes")}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={checkInForm.notes}
                    onChange={(e) => setCheckInForm({ ...checkInForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnCheckIn")}
                  </button>
                  <button type="button" onClick={() => setCheckInModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Register Check-Out Modal */}
        {checkOutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnCheckOut")}</h3>
                <button onClick={() => setCheckOutModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleCheckOut} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block text-slate-500 mb-1">{t("colEmployee")} *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={checkOutForm.employeeId}
                    onChange={(e) => setCheckOutForm({ ...checkOutForm, employeeId: e.target.value })}
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
                  <label className="block text-slate-500 mb-1">{t("colCheckOut")} *</label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    value={checkOutForm.checkOutTime}
                    onChange={(e) => setCheckOutForm({ ...checkOutForm, checkOutTime: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-slate-500 mb-1">{t("colNotes")}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={checkOutForm.notes}
                    onChange={(e) => setCheckOutForm({ ...checkOutForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnCheckOut")}
                  </button>
                  <button type="button" onClick={() => setCheckOutModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Add Manual Attendance Record */}
        {manualModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnManualEntry")}</h3>
                <button onClick={() => setManualModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveManual} className="space-y-4 text-xs font-semibold text-slate-500">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("colEmployee")} *</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      value={manualForm.employeeId}
                      onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
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
                    <label className="block mb-1">{t("colDate")} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      value={manualForm.attendanceDate}
                      onChange={(e) => setManualForm({ ...manualForm, attendanceDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("colCheckIn")}</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                      value={manualForm.checkIn}
                      onChange={(e) => setManualForm({ ...manualForm, checkIn: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("colCheckOut")}</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                      value={manualForm.checkOut}
                      onChange={(e) => setManualForm({ ...manualForm, checkOut: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("colStatus")} *</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      value={manualForm.status}
                      onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                    >
                      <option value="PRESENT">{t("lblPresent")}</option>
                      <option value="ABSENT">{t("lblAbsent")}</option>
                      <option value="LEAVE">{t("lblOnLeave")}</option>
                      <option value="HOLIDAY">{t("lblHoliday")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1">{t("colNotes")}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setManualModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Edit Attendance Modal */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("colActions")}: {t("colStatus")}</h3>
                <button onClick={() => setEditModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block mb-1">{t("colDate")}</label>
                  <input
                    type="date"
                    disabled
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    value={editForm.attendanceDate}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("colCheckIn")}</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                      value={editForm.checkIn}
                      onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("colCheckOut")}</label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                      value={editForm.checkOut}
                      onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("colStatus")} *</label>
                    <select
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      <option value="PRESENT">{t("lblPresent")}</option>
                      <option value="ABSENT">{t("lblAbsent")}</option>
                      <option value="LEAVE">{t("lblOnLeave")}</option>
                      <option value="HOLIDAY">{t("lblHoliday")}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1">{t("colNotes")}</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
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
