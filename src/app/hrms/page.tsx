"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/services/api";
import {
  Users,
  CheckCircle,
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  FileText,
  Clock,
  Briefcase,
  FolderTree,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
} from "lucide-react";

export default function HrmsPage() {
  const { t, i18n } = useTranslation(["hrms", "common"]);
  const isRtl = i18n.language === "ar";

  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "departments" | "positions" | "profile">("dashboard");

  // Dashboard Stats State
  const [dashboard, setDashboard] = useState<any>({
    totalEmployees: 0,
    activeEmployees: 0,
    newEmployees: 0,
    employeesByDept: {},
    employeesByBranch: {},
  });

  // Master Data Lists
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Selected Employee profile
  const [selectedEmp, setSelectedEmp] = useState<any | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [posFilter, setPosFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Modals state
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [posModalOpen, setPosModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);

  // Form states
  const [empForm, setEmpForm] = useState({
    id: "", // empty for create, set for edit
    firstName: "",
    lastName: "",
    arabicFullName: "",
    englishFullName: "",
    nationalId: "",
    passportNumber: "",
    gender: "MALE",
    dateOfBirth: "",
    nationality: "",
    maritalStatus: "SINGLE",
    hireDate: new Date().toISOString().split("T")[0],
    employmentType: "FULL_TIME",
    branch: "",
    departmentId: "",
    positionId: "",
    managerId: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
    notes: "",
    status: "ACTIVE",
    roleId: "",
    userId: "",
  });

  const [deptForm, setDeptForm] = useState({
    id: "",
    arabicName: "",
    englishName: "",
    parentId: "",
    managerId: "",
    description: "",
    isActive: true,
  });

  const [posForm, setPosForm] = useState({
    id: "",
    arabicName: "",
    englishName: "",
    departmentId: "",
    description: "",
  });

  const [docForm, setDocForm] = useState({
    fileName: "",
    fileType: "Passport",
    fileUrl: "",
  });

  // Fetch initial data
  useEffect(() => {
    fetchDashboard();
    fetchEmployees();
    fetchSupportData();
  }, [page, search, deptFilter, posFilter, branchFilter, statusFilter, activeTab]);

  useEffect(() => {
    if (selectedEmp) {
      fetchEmployeeDetails(selectedEmp.id);
    }
  }, [selectedEmp?.id]);

  const fetchDashboard = async () => {
    try {
      const data = await apiRequest("/hrms/dashboard");
      setDashboard(data || {});
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest("/hrms/employees", {
        params: {
          page: page.toString(),
          limit: "10",
          search,
          departmentId: deptFilter,
          positionId: posFilter,
          branch: branchFilter,
          status: statusFilter,
        },
      });
      setEmployees(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployeeDetails = async (id: string) => {
    try {
      const data = await apiRequest(`/hrms/employees/${id}`);
      setSelectedEmp(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSupportData = async () => {
    try {
      const [depts, poses, systemRoles, systemUsers] = await Promise.all([
        apiRequest("/hrms/departments"),
        apiRequest("/hrms/positions"),
        apiRequest("/users/roles"), // existing roles api
        apiRequest("/users"), // existing users api
      ]);
      setDepartments(depts || []);
      setPositions(poses || []);
      setRoles(systemRoles?.items || systemRoles || []);
      setUsers(systemUsers?.items || systemUsers || []);
    } catch (e) {
      console.error(e);
    }
  };

  // Create/Edit Handlers
  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (empForm.id) {
        // Edit
        await apiRequest(`/hrms/employees/${empForm.id}`, {
          method: "PUT",
          body: JSON.stringify(empForm),
        });
        alert(t("successEmployeeUpdated"));
      } else {
        // Create
        await apiRequest("/hrms/employees", {
          method: "POST",
          body: JSON.stringify(empForm),
        });
        alert(t("successEmployeeCreated"));
      }
      setEmployeeModalOpen(false);
      fetchEmployees();
      fetchDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveDept = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (deptForm.id) {
        await apiRequest(`/hrms/departments/${deptForm.id}`, {
          method: "PUT",
          body: JSON.stringify(deptForm),
        });
      } else {
        await apiRequest("/hrms/departments", {
          method: "POST",
          body: JSON.stringify(deptForm),
        });
        alert(t("successDeptCreated"));
      }
      setDeptModalOpen(false);
      fetchSupportData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSavePos = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (posForm.id) {
        await apiRequest(`/hrms/positions/${posForm.id}`, {
          method: "PUT",
          body: JSON.stringify(posForm),
        });
      } else {
        await apiRequest("/hrms/positions", {
          method: "POST",
          body: JSON.stringify(posForm),
        });
        alert(t("successPosCreated"));
      }
      setPosModalOpen(false);
      fetchSupportData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    try {
      // simulate upload logic by prepending mock url
      const payload = {
        ...docForm,
        fileUrl: docForm.fileUrl || `/uploads/docs/${docForm.fileName}`,
      };
      await apiRequest(`/hrms/employees/${selectedEmp.id}/documents`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setDocModalOpen(false);
      fetchEmployeeDetails(selectedEmp.id);
      setDocForm({ fileName: "", fileType: "Passport", fileUrl: "" });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من إيقاف الخدمة وحذف هذا الموظف؟" : "Are you sure you want to soft delete this employee?")) return;
    try {
      await apiRequest(`/hrms/employees/${id}`, { method: "DELETE" });
      alert(t("successEmployeeDeleted"));
      fetchEmployees();
      fetchDashboard();
      if (selectedEmp?.id === id) {
        setSelectedEmp(null);
        setActiveTab("employees");
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا الملف؟" : "Are you sure you want to delete this document?")) return;
    try {
      await apiRequest(`/hrms/documents/${docId}`, { method: "DELETE" });
      if (selectedEmp) {
        fetchEmployeeDetails(selectedEmp.id);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

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
            {activeTab === "employees" && (
              <button
                onClick={() => {
                  setEmpForm({
                    id: "",
                    firstName: "",
                    lastName: "",
                    arabicFullName: "",
                    englishFullName: "",
                    nationalId: "",
                    passportNumber: "",
                    gender: "MALE",
                    dateOfBirth: "",
                    nationality: "",
                    maritalStatus: "SINGLE",
                    hireDate: new Date().toISOString().split("T")[0],
                    employmentType: "FULL_TIME",
                    branch: "",
                    departmentId: "",
                    positionId: "",
                    managerId: "",
                    email: "",
                    phone: "",
                    address: "",
                    emergencyContact: "",
                    notes: "",
                    status: "ACTIVE",
                    roleId: roles[0]?.id || "",
                    userId: "",
                  });
                  setEmployeeModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
              >
                <Plus className="h-4 w-4" />
                {t("btnCreateEmployee")}
              </button>
            )}

            {activeTab === "departments" && (
              <button
                onClick={() => {
                  setDeptForm({
                    id: "",
                    arabicName: "",
                    englishName: "",
                    parentId: "",
                    managerId: "",
                    description: "",
                    isActive: true,
                  });
                  setDeptModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
              >
                <Plus className="h-4 w-4" />
                {t("btnCreateDept")}
              </button>
            )}

            {activeTab === "positions" && (
              <button
                onClick={() => {
                  setPosForm({
                    id: "",
                    arabicName: "",
                    englishName: "",
                    departmentId: "",
                    description: "",
                  });
                  setPosModalOpen(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md"
              >
                <Plus className="h-4 w-4" />
                {t("btnCreatePos")}
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigator */}
        <div className="flex border-b border-slate-200 text-sm font-semibold text-slate-500 gap-6">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`pb-3 transition-all ${
              activeTab === "dashboard" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabDashboard")}
          </button>
          <button
            onClick={() => setActiveTab("employees")}
            className={`pb-3 transition-all ${
              activeTab === "employees" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabEmployees")}
          </button>
          <button
            onClick={() => setActiveTab("departments")}
            className={`pb-3 transition-all ${
              activeTab === "departments" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabDepartments")}
          </button>
          <button
            onClick={() => setActiveTab("positions")}
            className={`pb-3 transition-all ${
              activeTab === "positions" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
            }`}
          >
            {t("tabPositions")}
          </button>
          {selectedEmp && (
            <button
              onClick={() => setActiveTab("profile")}
              className={`pb-3 transition-all ${
                activeTab === "profile" ? "border-b-2 border-blue-600 text-blue-600 font-bold" : "hover:text-slate-800"
              }`}
            >
              {t("tabProfile")}: {isRtl ? selectedEmp.arabicFullName : selectedEmp.englishFullName}
            </button>
          )}
        </div>

        {/* Overview Tab Content */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("lblTotalEmployees")}</span>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-3xl font-black text-slate-850">{dashboard.totalEmployees || 0}</span>
                  <div className="h-10 w-10 bg-blue-50 text-blue-550 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("lblActiveEmployees")}</span>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-3xl font-black text-slate-850">{dashboard.activeEmployees || 0}</span>
                  <div className="h-10 w-10 bg-emerald-50 text-emerald-550 rounded-xl flex items-center justify-center">
                    <CheckCircle className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("lblNewEmployees")}</span>
                <div className="flex justify-between items-end mt-4">
                  <span className="text-3xl font-black text-slate-850">{dashboard.newEmployees || 0}</span>
                  <div className="h-10 w-10 bg-purple-50 text-purple-550 rounded-xl flex items-center justify-center">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Department / Branch split grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employees By Department */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider">{t("lblEmployeesByDept")}</h3>
                <div className="divide-y divide-slate-50">
                  {Object.entries(dashboard.employeesByDept || {}).map(([key, val]: any) => (
                    <div key={key} className="flex justify-between items-center py-3 text-sm">
                      <span className="font-semibold text-slate-700">{key}</span>
                      <span className="px-2.5 py-0.5 bg-blue-50 text-blue-650 rounded-lg text-xs font-black">{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Employees By Branch */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-450 uppercase tracking-wider">{t("lblEmployeesByBranch")}</h3>
                <div className="divide-y divide-slate-50">
                  {Object.entries(dashboard.employeesByBranch || {}).map(([key, val]: any) => (
                    <div key={key} className="flex justify-between items-center py-3 text-sm">
                      <span className="font-semibold text-slate-700">{key}</span>
                      <span className="px-2.5 py-0.5 bg-purple-50 text-purple-650 rounded-lg text-xs font-black">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Directory Tab Content */}
        {activeTab === "employees" && (
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in">
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder={t("filterSearch")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
              >
                <option value="">{t("filterDept")}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {isRtl ? d.arabicName : d.englishName}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
              >
                <option value="">{t("filterPosition")}</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {isRtl ? p.arabicName : p.englishName}
                  </option>
                ))}
              </select>

              <select
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t("filterStatus")}</option>
                <option value="ACTIVE">{t("statusActive")}</option>
                <option value="INACTIVE">{t("statusInactive")}</option>
                <option value="LEAVE">{t("statusLeave")}</option>
                <option value="SUSPENDED">{t("statusSuspended")}</option>
                <option value="TERMINATED">{t("statusTerminated")}</option>
              </select>
            </div>

            {/* Employee List Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                    <th className="py-3 px-4">{t("colEmpNo")}</th>
                    <th className="py-3 px-4">{t("colName")}</th>
                    <th className="py-3 px-4">{t("colDept")}</th>
                    <th className="py-3 px-4">{t("colPosition")}</th>
                    <th className="py-3 px-4">{t("colBranch")}</th>
                    <th className="py-3 px-4 text-center">{t("colStatus")}</th>
                    <th className="py-3 px-4 text-left">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition text-xs font-medium text-slate-700">
                      <td className="py-3 px-4 font-mono font-bold text-blue-600">{emp.employeeNumber}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedEmp(emp);
                            setActiveTab("profile");
                          }}
                          className="hover:underline font-bold text-slate-800 text-right block"
                        >
                          {isRtl ? emp.arabicFullName : emp.englishFullName}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {emp.department ? (isRtl ? emp.department.arabicName : emp.department.englishName) : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {emp.position ? (isRtl ? emp.position.arabicName : emp.position.englishName) : "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-450">{emp.branch || "-"}</td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                            emp.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-650"
                              : emp.status === "LEAVE"
                                ? "bg-blue-50 text-blue-650"
                                : emp.status === "SUSPENDED"
                                  ? "bg-amber-50 text-amber-650"
                                  : "bg-red-50 text-red-650"
                          }`}
                        >
                          {t(`status${emp.status.charAt(0) + emp.status.slice(1).toLowerCase()}`)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setEmpForm({
                              ...emp,
                              dateOfBirth: emp.dateOfBirth ? emp.dateOfBirth.split("T")[0] : "",
                              hireDate: emp.hireDate ? emp.hireDate.split("T")[0] : "",
                            });
                            setEmployeeModalOpen(true);
                          }}
                          className="p-1 text-slate-450 hover:text-blue-600 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(emp.id)}
                          className="p-1 text-slate-450 hover:text-red-600 transition"
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
              <div className="flex items-center justify-between border-t border-slate-50 pt-4 text-slate-550 text-xs">
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
        )}

        {/* Departments Structure Tab */}
        {activeTab === "departments" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in">
            <div className="divide-y divide-slate-50">
              {departments.map((d) => (
                <div key={d.id} className="flex justify-between items-center py-4 text-xs">
                  <div>
                    <span className="font-bold text-slate-800 text-sm block">
                      {isRtl ? d.arabicName : d.englishName}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {isRtl ? `كود القسم: ${d.departmentCode}` : `Code: ${d.departmentCode}`} 
                      {d.parent ? ` | ${isRtl ? "القسم الرئيسي" : "Parent"}: ${isRtl ? d.parent.arabicName : d.parent.englishName}` : ""}
                    </span>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div>
                      <span className="text-[10px] text-slate-400 block">{isRtl ? "مدير القسم" : "Manager"}</span>
                      <span className="font-semibold text-slate-700 block mt-0.5">
                        {d.manager ? (isRtl ? d.manager.arabicFullName : d.manager.englishFullName) : "-"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setDeptForm(d);
                          setDeptModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 transition"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا القسم؟" : "Are you sure you want to delete this department?")) return;
                          try {
                            await apiRequest(`/hrms/departments/${d.id}`, { method: "DELETE" });
                            fetchSupportData();
                          } catch (err: any) {
                            alert(err.message);
                          }
                        }}
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
        )}

        {/* Job Positions Tab */}
        {activeTab === "positions" && (
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4 animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold uppercase">
                    <th className="py-2.5 px-4">Code</th>
                    <th className="py-2.5 px-4">{isRtl ? "المسمى بالعربية" : "Name (AR)"}</th>
                    <th className="py-2.5 px-4">{isRtl ? "المسمى بالإنجليزية" : "Name (EN)"}</th>
                    <th className="py-2.5 px-4">{t("colDept")}</th>
                    <th className="py-2.5 px-4 text-left">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                  {positions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">{p.positionCode}</td>
                      <td className="py-3 px-4 font-bold">{p.arabicName}</td>
                      <td className="py-3 px-4">{p.englishName}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {p.department ? (isRtl ? p.department.arabicName : p.department.englishName) : "-"}
                      </td>
                      <td className="py-3 px-4 text-left flex gap-1 justify-end">
                        <button
                          onClick={() => {
                            setPosForm(p);
                            setPosModalOpen(true);
                          }}
                          className="p-1 text-slate-450 hover:text-blue-600 transition"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(isRtl ? "هل أنت متأكد من حذف هذه الوظيفة؟" : "Are you sure you want to delete this position?")) return;
                            try {
                              await apiRequest(`/hrms/positions/${p.id}`, { method: "DELETE" });
                              fetchSupportData();
                            } catch (err: any) {
                              alert(err.message);
                            }
                          }}
                          className="p-1 text-slate-450 hover:text-red-650 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Employee Details Profile Tab */}
        {activeTab === "profile" && selectedEmp && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            
            {/* Personal Details & Documents */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Detailed personal data */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  {t("lblPersonalSection")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">{t("lblArabicFullName")}</span>
                    <span className="block mt-1 font-bold text-slate-800">{selectedEmp.arabicFullName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">{t("lblEnglishFullName")}</span>
                    <span className="block mt-1 font-bold text-slate-800">{selectedEmp.englishFullName || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblNationalId")}</span>
                    <span className="block mt-1">{selectedEmp.nationalId || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblPassportNumber")}</span>
                    <span className="block mt-1">{selectedEmp.passportNumber || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblGender")}</span>
                    <span className="block mt-1">{selectedEmp.gender || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblDateOfBirth")}</span>
                    <span className="block mt-1">
                      {selectedEmp.dateOfBirth ? new Date(selectedEmp.dateOfBirth).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblNationality")}</span>
                    <span className="block mt-1">{selectedEmp.nationality || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblMaritalStatus")}</span>
                    <span className="block mt-1">{selectedEmp.maritalStatus || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Job Contract Details */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-2">
                  {t("lblJobSection")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("colHireDate")}</span>
                    <span className="block mt-1">
                      {selectedEmp.hireDate ? new Date(selectedEmp.hireDate).toLocaleDateString() : "-"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("lblEmploymentType")}</span>
                    <span className="block mt-1">{selectedEmp.employmentType || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t("colBranch")}</span>
                    <span className="block mt-1">{selectedEmp.branch || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">{isRtl ? "المسؤول المباشر" : "Direct Manager"}</span>
                    <span className="block mt-1">
                      {selectedEmp.manager ? (isRtl ? selectedEmp.manager.arabicFullName : selectedEmp.manager.englishFullName) : "-"}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-slate-400 block">{t("lblAddress")}</span>
                    <span className="block mt-1">{selectedEmp.address || "-"}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-[10px] text-slate-400 block">{t("lblEmergencyContact")}</span>
                    <span className="block mt-1">{selectedEmp.emergencyContact || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Documents Management */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblDocumentsSection")}</h3>
                  <button
                    onClick={() => setDocModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-[10px] font-black transition"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {t("btnUploadDoc")}
                  </button>
                </div>

                <div className="divide-y divide-slate-50">
                  {selectedEmp.documents?.map((d: any) => (
                    <div key={d.id} className="flex justify-between items-center py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-slate-400" />
                        <div>
                          <a
                            href={`http://localhost:3001${d.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-slate-800 hover:underline block"
                          >
                            {d.fileName}
                          </a>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{d.fileType}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 items-center">
                        <span className="text-slate-450">{new Date(d.uploadDate).toLocaleDateString()}</span>
                        <button
                          onClick={() => handleDeleteDoc(d.id)}
                          className="p-1 text-slate-400 hover:text-red-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Sidebar Details: Timeline & Notes */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Employee Notes */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblNotes")}</h3>
                <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                  {selectedEmp.notes || "-"}
                </p>
              </div>

              {/* Timeline Service Events */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">{t("lblTimelineSection")}</h3>
                <div className="relative border-r border-slate-100 mr-2 space-y-4 pl-4 pr-2 text-xs">
                  {selectedEmp.timeline?.map((t: any) => (
                    <div key={t.id} className="relative">
                      {/* Timeline dot */}
                      <span className="absolute -right-5 top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-500 shadow-sm flex items-center justify-center">
                        <Clock className="h-1.5 w-1.5 text-white" />
                      </span>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                          <span>{t.type}</span>
                          <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 leading-normal font-semibold">{t.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ======================================================== */}
        {/* MODAL WINDOWS FOR DIALOGS */}
        {/* ======================================================== */}

        {/* 1. Hire/Edit Employee Modal */}
        {employeeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">
                  {empForm.id ? t("btnEdit") : t("btnCreateEmployee")}
                </h3>
                <button onClick={() => setEmployeeModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEmployee} className="space-y-6">
                
                {/* Personal Inputs Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">{t("lblPersonalSection")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">First Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.firstName}
                        onChange={(e) => setEmpForm({ ...empForm, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Last Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.lastName}
                        onChange={(e) => setEmpForm({ ...empForm, lastName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblArabicFullName")}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.arabicFullName}
                        onChange={(e) => setEmpForm({ ...empForm, arabicFullName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblEnglishFullName")}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.englishFullName}
                        onChange={(e) => setEmpForm({ ...empForm, englishFullName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblNationalId")}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.nationalId}
                        onChange={(e) => setEmpForm({ ...empForm, nationalId: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblPassportNumber")}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.passportNumber}
                        onChange={(e) => setEmpForm({ ...empForm, passportNumber: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblGender")}</label>
                      <select
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.gender}
                        onChange={(e) => setEmpForm({ ...empForm, gender: e.target.value })}
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblDateOfBirth")}</label>
                      <input
                        type="date"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.dateOfBirth}
                        onChange={(e) => setEmpForm({ ...empForm, dateOfBirth: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Job / Contract Section */}
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider border-b border-slate-50 pb-1">{t("lblJobSection")}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("colHireDate")}</label>
                      <input
                        type="date"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.hireDate}
                        onChange={(e) => setEmpForm({ ...empForm, hireDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblEmploymentType")}</label>
                      <select
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.employmentType}
                        onChange={(e) => setEmpForm({ ...empForm, employmentType: e.target.value })}
                      >
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACTOR">Contractor</option>
                        <option value="INTERN">Intern</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblBranchInput")}</label>
                      <input
                        type="text"
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.branch}
                        onChange={(e) => setEmpForm({ ...empForm, branch: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("colStatus")}</label>
                      <select
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.status}
                        onChange={(e) => setEmpForm({ ...empForm, status: e.target.value })}
                      >
                        <option value="ACTIVE">{t("statusActive")}</option>
                        <option value="INACTIVE">{t("statusInactive")}</option>
                        <option value="LEAVE">{t("statusLeave")}</option>
                        <option value="SUSPENDED">{t("statusSuspended")}</option>
                        <option value="TERMINATED">{t("statusTerminated")}</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("colDept")}</label>
                      <select
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.departmentId}
                        onChange={(e) => setEmpForm({ ...empForm, departmentId: e.target.value })}
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {isRtl ? d.arabicName : d.englishName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{t("colPosition")}</label>
                      <select
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.positionId}
                        onChange={(e) => setEmpForm({ ...empForm, positionId: e.target.value })}
                      >
                        <option value="">Select Position</option>
                        {positions
                          .filter((p) => !empForm.departmentId || p.departmentId === empForm.departmentId)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {isRtl ? p.arabicName : p.englishName}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{isRtl ? "الدور الوظيفي بالسيستم *" : "System Role *"}</label>
                      <select
                        required
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.roleId}
                        onChange={(e) => setEmpForm({ ...empForm, roleId: e.target.value })}
                      >
                        <option value="">Select Role</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">{isRtl ? "المسؤول المباشر" : "Direct Manager"}</label>
                      <select
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                        value={empForm.managerId}
                        onChange={(e) => setEmpForm({ ...empForm, managerId: e.target.value })}
                      >
                        <option value="">Select Manager</option>
                        {employees.map((empOption) => (
                          <option key={empOption.id} value={empOption.id}>
                            {isRtl ? empOption.arabicFullName : empOption.englishFullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contact and address */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("colPhone")}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                      value={empForm.phone}
                      onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("colEmail")}</label>
                    <input
                      type="email"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                      value={empForm.email}
                      onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{isRtl ? "حساب المستخدم المربوط" : "Linked User Account"}</label>
                    <select
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                      value={empForm.userId}
                      onChange={(e) => setEmpForm({ ...empForm, userId: e.target.value })}
                    >
                      <option value="">None</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblAddress")}</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                      value={empForm.address}
                      onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">{t("lblEmergencyContact")}</label>
                    <textarea
                      rows={2}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg text-xs"
                      value={empForm.emergencyContact}
                      onChange={(e) => setEmpForm({ ...empForm, emergencyContact: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setEmployeeModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 2. Create/Edit Department Modal */}
        {deptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">{t("btnCreateDept")}</h3>
                <button onClick={() => setDeptModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSaveDept} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Arabic Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                      value={deptForm.arabicName}
                      onChange={(e) => setDeptForm({ ...deptForm, arabicName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">English Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                      value={deptForm.englishName}
                      onChange={(e) => setDeptForm({ ...deptForm, englishName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">{isRtl ? "القسم الرئيسي" : "Parent Department"}</label>
                    <select
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                      value={deptForm.parentId}
                      onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })}
                    >
                      <option value="">None</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {isRtl ? d.arabicName : d.englishName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">{isRtl ? "مدير القسم" : "Department Manager"}</label>
                    <select
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                      value={deptForm.managerId}
                      onChange={(e) => setDeptForm({ ...deptForm, managerId: e.target.value })}
                    >
                      <option value="">Select Manager</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {isRtl ? emp.arabicFullName : emp.englishFullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Description</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                    value={deptForm.description}
                    onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setDeptModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Create Job Position Modal */}
        {posModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">{t("btnCreatePos")}</h3>
                <button onClick={() => setPosModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSavePos} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">Arabic Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                      value={posForm.arabicName}
                      onChange={(e) => setPosForm({ ...posForm, arabicName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 mb-1">English Name *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                      value={posForm.englishName}
                      onChange={(e) => setPosForm({ ...posForm, englishName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">{t("colDept")} *</label>
                  <select
                    required
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                    value={posForm.departmentId}
                    onChange={(e) => setPosForm({ ...posForm, departmentId: e.target.value })}
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {isRtl ? d.arabicName : d.englishName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">Description</label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                    value={posForm.description}
                    onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {t("btnSave")}
                  </button>
                  <button type="button" onClick={() => setPosModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
                    {t("btnCancel")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. Upload Document Modal */}
        {docModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-slate-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
                <h3 className="text-lg font-bold text-slate-800">{t("btnUploadDoc")}</h3>
                <button onClick={() => setDocModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUploadDoc} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 mb-1">{t("lblDocName")} *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. passport_scan.pdf"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                    value={docForm.fileName}
                    onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">{t("lblDocType")} *</label>
                  <select
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                    value={docForm.fileType}
                    onChange={(e) => setDocForm({ ...docForm, fileType: e.target.value })}
                  >
                    <option value="Passport">{t("typePassport")}</option>
                    <option value="National ID">{t("typeNationalId")}</option>
                    <option value="Employment Contract">{t("typeContract")}</option>
                    <option value="Certificates">{t("typeCertificate")}</option>
                    <option value="Other Documents">{t("typeOther")}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 mb-1">{t("lblDocUrl")}</label>
                  <input
                    type="text"
                    placeholder="Auto generated or specific URL link"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-250 rounded-lg"
                    value={docForm.fileUrl}
                    onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition text-sm shadow-md">
                    {isRtl ? "رفع" : "Upload"}
                  </button>
                  <button type="button" onClick={() => setDocModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl font-bold transition text-sm">
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
