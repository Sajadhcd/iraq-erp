"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/services/api";
import {
  Users,
  Plus,
  Edit2,
  Lock,
  CheckCircle,
  FileText,
  Printer,
  Calendar,
  Layers,
  Save,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Building,
  TrendingDown,
  X,
  Check,
} from "lucide-react";

export default function PayrollPage() {
  const { t, i18n } = useTranslation(["payroll", "common"]);
  const isRtl = i18n.language === "ar";

  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "runs" | "structures" | "allow_deduct" | "payslips" | "reports">("dashboard");

  // Selection/Data states
  const [employees, setEmployees] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [payslips, setPayslips] = useState<any[]>([]);

  // Modals
  const [structModalOpen, setStructModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [runModalOpen, setRunModalOpen] = useState(false);

  // Active Payslip for popup
  const [activePayslip, setActivePayslip] = useState<any>(null);

  // Forms
  const [structForm, setStructForm] = useState({
    employeeId: "",
    basicSalary: 0,
    housing: 0,
    transportation: 0,
    food: 0,
    risk: 0,
    otherAllowances: 0,
    taxPct: 0,
    insurance: 0,
    active: true,
  });

  const [periodForm, setPeriodForm] = useState({
    code: "",
    nameAr: "",
    nameEn: "",
    startDate: new Date().toISOString().substring(0, 10),
    endDate: new Date().toISOString().substring(0, 10),
  });

  const [runForm, setRunForm] = useState({
    payrollPeriodId: "",
  });

  // Load baseline arrays
  useEffect(() => {
    fetchEmployees();
    fetchPeriods();
    fetchRuns();
    fetchStructures();
    fetchPayslips();
  }, []);

  useEffect(() => {
    if (activeTab === "runs") fetchRuns();
    if (activeTab === "structures") fetchStructures();
    if (activeTab === "payslips") fetchPayslips();
  }, [activeTab]);

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest("/hrms/employees", { params: { limit: "100" } });
      setEmployees(data.items || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPeriods = async () => {
    try {
      const data = await apiRequest("/payroll/periods");
      setPeriods(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRuns = async () => {
    try {
      const data = await apiRequest("/payroll/runs");
      setPayrollRuns(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStructures = async () => {
    try {
      const data = await apiRequest("/payroll/structures");
      setStructures(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPayslips = async () => {
    try {
      const data = await apiRequest("/payroll/payslips");
      setPayslips(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Salary Structure Upsert
  const handleSaveStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structForm.employeeId) {
      alert(isRtl ? "يرجى اختيار الموظف" : "Please select an employee");
      return;
    }
    try {
      await apiRequest("/payroll/structures", {
        method: "POST",
        body: JSON.stringify(structForm),
      });
      alert(t("successStructureSaved"));
      setStructModalOpen(false);
      fetchStructures();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Create Period
  const handleSavePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/payroll/periods", {
        method: "POST",
        body: JSON.stringify(periodForm),
      });
      alert(isRtl ? "تم إنشاء الدورة بنجاح." : "Period created successfully.");
      setPeriodModalOpen(false);
      fetchPeriods();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Run Payroll Batch
  const handleRunPayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runForm.payrollPeriodId) {
      alert(isRtl ? "يرجى تحديد فترة الرواتب" : "Please select a period");
      return;
    }
    try {
      await apiRequest("/payroll/runs", {
        method: "POST",
        body: JSON.stringify(runForm),
      });
      alert(t("successRun"));
      setRunModalOpen(false);
      fetchRuns();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Approve Run
  const handleApproveRun = async (id: string) => {
    try {
      await apiRequest(`/payroll/runs/${id}/approve`, { method: "POST" });
      alert(t("successApproved"));
      fetchRuns();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Lock Run
  const handleLockRun = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من قفل وترحيل هذا المسير نهائياً للدفاتر المالية؟" : "Are you sure you want to permanently lock and post this payroll run to the general ledger?")) return;
    try {
      await apiRequest(`/payroll/runs/${id}/lock`, { method: "POST" });
      alert(t("successLocked"));
      fetchRuns();
      fetchPayslips();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Open Payslip Details Modal
  const openPayslipDetails = async (id: string) => {
    try {
      const data = await apiRequest(`/payroll/payslips/${id}`);
      setActivePayslip(data);
      setPayslipModalOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Print single payslip & log audit
  const handlePrintPayslip = async (payslipId: string) => {
    try {
      await apiRequest(`/payroll/payslips/${payslipId}/print-log`, { method: "POST" });
      window.print();
    } catch (e) {
      console.error(e);
    }
  };

  // Summarize payroll statistics
  const lockedRuns = (Array.isArray(payrollRuns) ? payrollRuns : []).filter(r => r?.status === "LOCKED");
  const totalExpense = lockedRuns.reduce((acc, curr) => acc + (Number(curr?.totalNet) || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 print:space-y-4 print:p-0">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-5 print:hidden">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{t("title")}</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">{t("subtitle")}</p>
          </div>
          <div className="flex gap-2 text-xs">
            <button
              onClick={() => {
                setPeriodForm({
                  code: "",
                  nameAr: "",
                  nameEn: "",
                  startDate: new Date().toISOString().substring(0, 10),
                  endDate: new Date().toISOString().substring(0, 10),
                });
                setPeriodModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
            >
              <Calendar className="h-4 w-4" />
              {t("btnNewPeriod")}
            </button>

            <button
              onClick={() => {
                setRunForm({ payrollPeriodId: periods.length > 0 ? periods[0].id : "" });
                setRunModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md"
            >
              <DollarSign className="h-4 w-4" />
              {t("btnRunPayroll")}
            </button>
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-200 text-sm font-semibold text-slate-500 gap-6 print:hidden">
          <button onClick={() => setActiveTab("dashboard")} className={`pb-3 transition-all ${activeTab === "dashboard" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"}`}>{t("tabDashboard")}</button>
          <button onClick={() => setActiveTab("runs")} className={`pb-3 transition-all ${activeTab === "runs" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"}`}>{t("tabRuns")}</button>
          <button onClick={() => setActiveTab("structures")} className={`pb-3 transition-all ${activeTab === "structures" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"}`}>{t("tabStructures")}</button>
          <button onClick={() => setActiveTab("allow_deduct")} className={`pb-3 transition-all ${activeTab === "allow_deduct" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"}`}>{isRtl ? "البدلات والاستقطاعات" : "Allowances & Deductions"}</button>
          <button onClick={() => setActiveTab("payslips")} className={`pb-3 transition-all ${activeTab === "payslips" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"}`}>{t("tabPayslips")}</button>
          <button onClick={() => setActiveTab("reports")} className={`pb-3 transition-all ${activeTab === "reports" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"}`}>{t("tabReports")}</button>
        </div>

        {/* TAB 1: Dashboard */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblTotalSalaryExpense")}</span>
                <span className="text-3xl font-black text-emerald-600 mt-3">{totalExpense.toLocaleString()} IQD</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblPendingRuns")}</span>
                <span className="text-3xl font-black text-blue-600 mt-3">{(Array.isArray(payrollRuns) ? payrollRuns : []).filter(r => r?.status === "DRAFT").length}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblLockedRuns")}</span>
                <span className="text-3xl font-black text-slate-800 mt-3">{lockedRuns.length}</span>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("lblActiveContracts")}</span>
                <span className="text-3xl font-black text-purple-600 mt-3">{(Array.isArray(structures) ? structures : []).filter(s => s?.active).length}</span>
              </div>
            </div>

            {/* Quick overview table */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{isRtl ? "أحدث مسيرات الرواتب" : "Recent Payroll Batches"}</h3>
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">{t("colPeriod")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colGross")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colNet")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colStatus")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-600">
                    {payrollRuns.slice(0, 5).map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-bold text-slate-800">{isRtl ? r.payrollPeriod.nameAr : r.payrollPeriod.nameEn}</td>
                        <td className="py-3 px-4 text-center font-mono font-bold">{Number(r.totalGross).toLocaleString()} IQD</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-emerald-650">{Number(r.totalNet).toLocaleString()} IQD</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === "LOCKED" ? "bg-slate-100 text-slate-655" : r.status === "APPROVED" ? "bg-emerald-50 text-emerald-655" : "bg-blue-50 text-blue-655"
                          }`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Payroll Runs */}
        {activeTab === "runs" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in print:hidden text-xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("tabRuns")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">{t("colPeriod")}</th>
                    <th className="py-2.5 px-4 text-center">{t("colGross")}</th>
                    <th className="py-2.5 px-4 text-center">{t("colAllowances")}</th>
                    <th className="py-2.5 px-4 text-center">{t("colDeductions")}</th>
                    <th className="py-2.5 px-4 text-center">{t("colNet")}</th>
                    <th className="py-2.5 px-4 text-center">{t("colStatus")}</th>
                    <th className="py-2.5 px-4 text-left">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-650">
                  {payrollRuns.map((r) => (
                    <tr key={r.id}>
                      <td className="py-3 px-4 font-bold text-slate-800">{isRtl ? r.payrollPeriod.nameAr : r.payrollPeriod.nameEn}</td>
                      <td className="py-3 px-4 text-center font-mono">{Number(r.totalGross).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-600">+{Number(r.totalAllowances).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono text-red-600">-{Number(r.totalDeductions).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{Number(r.totalNet).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === "LOCKED" ? "bg-slate-100 text-slate-655" : r.status === "APPROVED" ? "bg-emerald-50 text-emerald-655" : "bg-blue-50 text-blue-655"
                        }`}>{r.status}</span>
                      </td>
                      <td className="py-3 px-4 text-left flex gap-1 justify-end">
                        {r.status === "DRAFT" && (
                          <button
                            onClick={() => handleApproveRun(r.id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            {t("btnApprove")}
                          </button>
                        )}
                        {r.status === "APPROVED" && (
                          <button
                            onClick={() => handleLockRun(r.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            {t("btnLock")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {payrollRuns.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        {isRtl ? "لا توجد عمليات تشغيل مسجلة." : "No payroll runs recorded."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Salary Structures */}
        {activeTab === "structures" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in print:hidden text-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("tabStructures")}</h3>
              <button
                onClick={() => {
                  setStructForm({
                    employeeId: employees.length > 0 ? employees[0].id : "",
                    basicSalary: 0,
                    housing: 0,
                    transportation: 0,
                    food: 0,
                    risk: 0,
                    otherAllowances: 0,
                    taxPct: 0,
                    insurance: 0,
                    active: true,
                  });
                  setStructModalOpen(true);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
              >
                {isRtl ? "إضافة/تعديل هيكل راتب" : "Add/Edit Structure"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">{isRtl ? "الموظف" : "Employee"}</th>
                    <th className="py-2.5 px-4 text-center">{t("lblBasicSalary")}</th>
                    <th className="py-2.5 px-4 text-center">{t("lblHousing")}</th>
                    <th className="py-2.5 px-4 text-center">{t("lblTransportation")}</th>
                    <th className="py-2.5 px-4 text-center">{t("lblTaxPct")}</th>
                    <th className="py-2.5 px-4 text-center">{t("lblInsurance")}</th>
                    <th className="py-2.5 px-4 text-center">{isRtl ? "الحالة" : "Status"}</th>
                    <th className="py-2.5 px-4 text-left">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-650">
                  {structures.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {(isRtl ? s.employee.arabicFullName : s.employee.englishFullName) || `${s.employee.firstName} ${s.employee.lastName}`}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">{Number(s.basicSalary).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono">{Number(s.housing).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono">{Number(s.transportation).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono">{s.taxPct}%</td>
                      <td className="py-3 px-4 text-center font-mono">{Number(s.insurance).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.active ? "bg-emerald-50 text-emerald-655" : "bg-red-50 text-red-655"}`}>
                          {s.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setStructForm({
                              employeeId: s.employeeId,
                              basicSalary: Number(s.basicSalary),
                              housing: Number(s.housing),
                              transportation: Number(s.transportation),
                              food: Number(s.food),
                              risk: Number(s.risk),
                              otherAllowances: Number(s.otherAllowances),
                              taxPct: Number(s.taxPct),
                              insurance: Number(s.insurance),
                              active: s.active,
                            });
                            setStructModalOpen(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Allowances & Deductions Overview */}
        {activeTab === "allow_deduct" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in print:hidden text-xs">
            {/* Allowances info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {t("tabAllowances")}
              </h3>
              <div className="divide-y divide-slate-100 font-semibold text-slate-600">
                <div className="py-3 flex justify-between"><span>{t("lblHousing")}</span><span className="text-slate-400">{isRtl ? "محدد بالهيكل المالي" : "Salary Structure Configured"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblTransportation")}</span><span className="text-slate-400">{isRtl ? "محدد بالهيكل المالي" : "Salary Structure Configured"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblFood")}</span><span className="text-slate-400">{isRtl ? "محدد بالهيكل المالي" : "Salary Structure Configured"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblRisk")}</span><span className="text-slate-400">{isRtl ? "محدد بالهيكل المالي" : "Salary Structure Configured"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblOvertimePay")}</span><span className="text-slate-400">{isRtl ? "محتسب تلقائياً من الحضور (1.5x)" : "Auto Calculated from logs (1.5x)"}</span></div>
              </div>
            </div>

            {/* Deductions info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <h3 className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-1">
                <TrendingDown className="h-4 w-4" />
                {t("tabDeductions")}
              </h3>
              <div className="divide-y divide-slate-100 font-semibold text-slate-600">
                <div className="py-3 flex justify-between"><span>{t("lblTaxPct")}</span><span className="text-slate-400">{isRtl ? "نسبة مئوية من إجمالي الراتب" : "% of Gross Salary"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblInsurance")}</span><span className="text-slate-400">{isRtl ? "مبلغ ثابت شهري" : "Fixed monthly fee"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblLateDeduction")}</span><span className="text-slate-400">{isRtl ? "مستقطع بالدقيقة من ساعات الحضور" : "Deducted per late minute"}</span></div>
                <div className="py-3 flex justify-between"><span>{t("lblAbsentDeduction")}</span><span className="text-slate-400">{isRtl ? "خصم يوم كامل عن كل يوم غياب" : "1 day basic pay deducted per day absent"}</span></div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Employee Payslips */}
        {activeTab === "payslips" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in print:hidden text-xs">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("tabPayslips")}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-455 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-4">{t("lblPayslipNumber")}</th>
                    <th className="py-2.5 px-4">{isRtl ? "الموظف" : "Employee"}</th>
                    <th className="py-2.5 px-4">{t("colPeriod")}</th>
                    <th className="py-2.5 px-4 text-center">{t("lblNetSalary")}</th>
                    <th className="py-2.5 px-4 text-left">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-650">
                  {payslips.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.payslipNumber}</td>
                      <td className="py-3 px-4 text-slate-800">
                        {(isRtl ? p.payrollItem.employee.arabicFullName : p.payrollItem.employee.englishFullName) || `${p.payrollItem.employee.firstName} ${p.payrollItem.employee.lastName}`}
                      </td>
                      <td className="py-3 px-4">{isRtl ? p.payrollItem.payrollRun.payrollPeriod.nameAr : p.payrollItem.payrollRun.payrollPeriod.nameEn}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-emerald-650">{Number(p.payrollItem.netSalary).toLocaleString()} IQD</td>
                      <td className="py-3 px-4 text-left flex gap-1 justify-end">
                        <button
                          onClick={() => openPayslipDetails(p.id)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-[10px] font-bold transition flex items-center gap-1"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {isRtl ? "استعراض" : "View"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {payslips.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        {isRtl ? "لا توجد قسائم رواتب صادرة. (يرجى قفل مسير رواتب أولاً)" : "No payslips issued yet. (Please lock a payroll run first)"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: Reports */}
        {activeTab === "reports" && (
          <div className="space-y-6 animate-fade-in print:hidden">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 text-xs font-semibold text-slate-500">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("tabReports")}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-450 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4">{t("colPeriod")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colGross")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colAllowances")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colDeductions")}</th>
                      <th className="py-2.5 px-4 text-center">{t("colNet")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-slate-650">
                    {lockedRuns.map((r) => (
                      <tr key={r.id}>
                        <td className="py-3 px-4 font-bold text-slate-800">{isRtl ? r.payrollPeriod.nameAr : r.payrollPeriod.nameEn}</td>
                        <td className="py-3 px-4 text-center font-mono">{Number(r.totalGross).toLocaleString()} IQD</td>
                        <td className="py-3 px-4 text-center font-mono text-emerald-600">+{Number(r.totalAllowances).toLocaleString()} IQD</td>
                        <td className="py-3 px-4 text-center font-mono text-red-650">-{Number(r.totalDeductions).toLocaleString()} IQD</td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">{Number(r.totalNet).toLocaleString()} IQD</td>
                      </tr>
                    ))}
                    {lockedRuns.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          {isRtl ? "لا توجد مسيرات رواتب مقفلة لاستعراض التقارير." : "No locked payroll periods available for reporting."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL DIALOGS */}
        {/* ======================================================== */}

        {/* 1. Salary Structure Modal */}
        {structModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("lblSalaryStructure")}</h3>
                <button onClick={() => setStructModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStructure} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block mb-1">{isRtl ? "الموظف" : "Employee"} *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    value={structForm.employeeId}
                    onChange={(e) => setStructForm({ ...structForm, employeeId: e.target.value })}
                  >
                    <option value="">Select Employee</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {(isRtl ? e.arabicFullName : e.englishFullName) || `${e.firstName} ${e.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{t("lblBasicSalary")} *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.basicSalary}
                      onChange={(e) => setStructForm({ ...structForm, basicSalary: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("lblHousing")}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.housing}
                      onChange={(e) => setStructForm({ ...structForm, housing: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1">{t("lblTransportation")}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.transportation}
                      onChange={(e) => setStructForm({ ...structForm, transportation: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("lblFood")}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.food}
                      onChange={(e) => setStructForm({ ...structForm, food: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("lblRisk")}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.risk}
                      onChange={(e) => setStructForm({ ...structForm, risk: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1">{t("lblOtherAllowances")}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.otherAllowances}
                      onChange={(e) => setStructForm({ ...structForm, otherAllowances: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("lblTaxPct")} (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.taxPct}
                      onChange={(e) => setStructForm({ ...structForm, taxPct: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{t("lblInsurance")}</label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={structForm.insurance}
                      onChange={(e) => setStructForm({ ...structForm, insurance: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setStructModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. New Period Modal */}
        {periodModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnNewPeriod")}</h3>
                <button onClick={() => setPeriodModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSavePeriod} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block mb-1">{isRtl ? "رمز الدورة (مثال: 2026-07)" : "Period Code (e.g., 2026-07)"} *</label>
                  <input
                    type="text"
                    required
                    placeholder="YYYY-MM"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-700"
                    value={periodForm.code}
                    onChange={(e) => setPeriodForm({ ...periodForm, code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-1">{isRtl ? "الاسم بالعربية" : "Name Arabic"} *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={periodForm.nameAr}
                    onChange={(e) => setPeriodForm({ ...periodForm, nameAr: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block mb-1">{isRtl ? "الاسم بالإنجليزية" : "Name English"} *</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    value={periodForm.nameEn}
                    onChange={(e) => setPeriodForm({ ...periodForm, nameEn: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1">{isRtl ? "تاريخ البداية" : "Start Date"} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={periodForm.startDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block mb-1">{isRtl ? "تاريخ النهاية" : "End Date"} *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                      value={periodForm.endDate}
                      onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setPeriodModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Run Payroll Modal */}
        {runModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:hidden">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-800">{t("btnRunPayroll")}</h3>
                <button onClick={() => setRunModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleRunPayrollSubmit} className="space-y-4 text-xs font-semibold text-slate-500">
                <div>
                  <label className="block mb-1">{t("colPeriod")} *</label>
                  <select
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700"
                    value={runForm.payrollPeriodId}
                    onChange={(e) => setRunForm({ ...runForm, payrollPeriodId: e.target.value })}
                  >
                    <option value="">Select Period</option>
                    {(Array.isArray(periods) ? periods : []).filter(p => p?.status === "OPEN").map((p) => (
                      <option key={p.id} value={p.id}>
                        {isRtl ? p?.nameAr : p?.nameEn} ({p?.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 text-sm">
                  <button type="submit" className="px-5 py-2.5 bg-blue-650 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow-md">
                    {isRtl ? "تشغيل الآن" : "Run Now"}
                  </button>
                  <button type="button" onClick={() => setRunModalOpen(false)} className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-655 rounded-xl font-bold transition">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Beautiful PDF-ready Payslip Popup */}
        {payslipModalOpen && activePayslip && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm print:absolute print:inset-0 print:bg-white print:backdrop-blur-none">
            <div className="bg-white rounded-2xl p-8 w-full max-w-2xl border border-slate-200 print:border-none print:shadow-none print:w-full print:max-w-none print:p-0">
              
              {/* Modal header (hidden during printing) */}
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-6 print:hidden">
                <h3 className="text-sm font-bold text-slate-800">{t("lblPrintPayslip")}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePrintPayslip(activePayslip.id)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    {t("lblPrintPayslip")}
                  </button>
                  <button onClick={() => setPayslipModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-450 transition">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Printable Body */}
              <div className="space-y-6 text-xs text-slate-700 font-semibold" dir={isRtl ? "rtl" : "ltr"}>
                
                {/* Logo and company headers */}
                <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-sm">ERP</div>
                    <div>
                      <h2 className="text-sm font-black text-slate-900">{isRtl ? "نظام إدارة الموارد المتكامل" : "Integrated ERP System Ltd."}</h2>
                      <p className="text-[10px] text-slate-400 font-medium">Baghdad, Iraq | contact@erp.co</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h2 className="text-base font-black text-slate-900">{isRtl ? "كشف راتب موظف" : "PAYSLIP INVOICE"}</h2>
                    <p className="font-mono text-[10px] text-slate-500 mt-1">{t("lblPayslipNumber")}: {activePayslip.payslipNumber}</p>
                  </div>
                </div>

                {/* Employee Specs */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isRtl ? "اسم الموظف" : "Employee Name"}</span>
                    <p className="text-slate-800 font-black text-sm mt-0.5">
                      {(isRtl ? activePayslip.payrollItem.employee.arabicFullName : activePayslip.payrollItem.employee.englishFullName) || `${activePayslip.payrollItem.employee.firstName} ${activePayslip.payrollItem.employee.lastName}`}
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {activePayslip.payrollItem.employee.employeeNumber}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{isRtl ? "دورة الرواتب" : "Payroll Period"}</span>
                    <p className="text-slate-800 font-bold text-xs mt-0.5">
                      {isRtl ? activePayslip.payrollItem.payrollRun.payrollPeriod.nameAr : activePayslip.payrollItem.payrollRun.payrollPeriod.nameEn}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{new Date(activePayslip.payrollItem.payrollRun.payrollPeriod.startDate).toLocaleDateString()} - {new Date(activePayslip.payrollItem.payrollRun.payrollPeriod.endDate).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Salary Breakdown (Earnings vs Deductions) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Earnings */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-wider border-b border-slate-150 pb-1">{isRtl ? "المستحقات (المدخول)" : "Earnings"}</h4>
                    <div className="space-y-1.5 font-medium">
                      <div className="flex justify-between"><span>{t("lblBasicSalary")}</span><span className="font-mono">{Number(activePayslip.payrollItem.basicSalary).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblHousing")}</span><span className="font-mono">{Number(activePayslip.payrollItem.housing).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblTransportation")}</span><span className="font-mono">{Number(activePayslip.payrollItem.transportation).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblFood")}</span><span className="font-mono">{Number(activePayslip.payrollItem.food).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblRisk")}</span><span className="font-mono">{Number(activePayslip.payrollItem.risk).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblOvertimePay")}</span><span className="font-mono text-emerald-650">+{Number(activePayslip.payrollItem.overtimePay).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblOtherAllowances")}</span><span className="font-mono">{Number(activePayslip.payrollItem.otherAllowances).toLocaleString()}</span></div>
                    </div>
                  </div>

                  {/* Deductions */}
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-red-650 uppercase tracking-wider border-b border-slate-150 pb-1">{isRtl ? "الاستقطاعات (المخصوم)" : "Deductions"}</h4>
                    <div className="space-y-1.5 font-medium">
                      <div className="flex justify-between"><span>{isRtl ? "ضريبة الدخل" : "Income Tax"}</span><span className="font-mono">-{Number(activePayslip.payrollItem.taxDeduction).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblInsurance")}</span><span className="font-mono">-{Number(activePayslip.payrollItem.insuranceDeduction).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblLateDeduction")}</span><span className="font-mono text-red-500">-{Number(activePayslip.payrollItem.lateDeduction).toLocaleString()}</span></div>
                      <div className="flex justify-between"><span>{t("lblAbsentDeduction")}</span><span className="font-mono text-red-500">-{Number(activePayslip.payrollItem.absentDeduction).toLocaleString()}</span></div>
                    </div>
                  </div>

                </div>

                {/* Net totals block */}
                <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center text-sm font-black">
                  <span>{isRtl ? "صافي الراتب المستلم" : "NET AMOUNT PAID"}</span>
                  <span className="text-base text-emerald-600 font-mono">{Number(activePayslip.payrollItem.netSalary).toLocaleString()} IQD</span>
                </div>

                {/* Footer signatures */}
                <div className="grid grid-cols-2 gap-8 pt-8 text-center text-[10px] text-slate-400">
                  <div className="border-t border-slate-200 pt-2">{isRtl ? "توقيع الموظف المستلم" : "Employee Signature"}</div>
                  <div className="border-t border-slate-200 pt-2">{isRtl ? "الاعتماد المالي والختم" : "Authorized Seal & Sign"}</div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
