"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, UserCheck, Edit2, Trash2 } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  createdAt: string;
  role: { name: string; description: string | null };
}

export default function EmployeesPage() {
  const { t, i18n } = useTranslation(["hr", "common"]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Edit / Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Add Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleId, setRoleId] = useState("");

  // Edit Form State
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editRoleId, setEditRoleId] = useState("");

  useEffect(() => {
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest("/employees");
      setEmployees(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await apiRequest("/employees/roles");
      setRoles(data);
      if (data.length > 0) {
        setRoleId(data[0].id);
        setEditRoleId(data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !roleId) return;

    try {
      await apiRequest("/employees", {
        method: "POST",
        body: JSON.stringify({ firstName, lastName, phone: phone || undefined, roleId }),
      });

      setModalOpen(false);
      fetchEmployees();
      setFirstName(""); setLastName(""); setPhone("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenEdit = (emp: Employee) => {
    setSelectedEmployee(emp);
    setEditFirstName(emp.firstName);
    setEditLastName(emp.lastName);
    setEditPhone(emp.phone || "");
    setEditRoleId(roles[0]?.id || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      await apiRequest(`/employees/${selectedEmployee.id}`, {
        method: "PUT",
        body: JSON.stringify({
          firstName: editFirstName,
          lastName: editLastName,
          phone: editPhone || undefined,
          roleId: editRoleId,
        }),
      });
      setEditModalOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenDelete = (emp: Employee) => {
    setSelectedEmployee(emp);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedEmployee) return;
    try {
      await apiRequest(`/employees/${selectedEmployee.id}`, { method: "DELETE" });
      setDeleteConfirmOpen(false);
      setSelectedEmployee(null);
      fetchEmployees();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      `${emp.firstName} ${emp.lastName}`.includes(searchTerm) || (emp.phone && emp.phone.includes(searchTerm)),
  );

  const isRtl = i18n.language === "ar";

  const formatDate = (dateStr: string) => {
    const locale = isRtl ? "ar-IQ" : "en-US";
    return new Date(dateStr).toLocaleDateString(locale);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t("employeesTitle")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("employeesSubtitle")}</p>
          </div>
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start">
            <Plus className="h-5 w-5" />
            <span>{t("addEmployee")}</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <input type="text" className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`} placeholder={t("searchPlaceholder")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Search className={`absolute top-2.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
          </div>
        </div>

        {/* Employee Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-6">{t("tableEmployee")}</th>
                  <th className="py-3 px-6">{t("tablePhone")}</th>
                  <th className="py-3 px-6">{t("tableRole")}</th>
                  <th className="py-3 px-6">{t("tableDate")}</th>
                  <th className="py-3 px-6">{t("tableStatus")}</th>
                  <th className={`py-3 px-6 ${isRtl ? "text-left" : "text-right"}`}>{t("common:actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-500" />
                        {emp.firstName} {emp.lastName}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-650">{emp.phone || t("notAvailable")}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                        {emp.role?.name === "SUPER_ADMIN" ? t("superAdmin") : emp.role?.name === "SALES_AGENT" ? t("salesAgent") : emp.role?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">{formatDate(emp.createdAt)}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-bold border border-emerald-100">{t("activeStatusText")}</span>
                    </td>
                    <td className={`py-4 px-6 ${isRtl ? "text-left" : "text-right"}`}>
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-lg border border-slate-200 hover:border-blue-100 transition"
                          title={t("common:edit")}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(emp)}
                          className="p-1.5 bg-slate-50 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 hover:border-rose-100 transition"
                          title={t("common:delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("addEmployee")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("firstName")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("lastName")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("phone")}</label>
                <input type="text" className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "text-right" : "text-left"}`} placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("role")}</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
                  {roles.map((r) => (<option key={r.id} value={r.id}>{r.name} - {r.description}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">{t("submitBtn")}</button>
                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {editModalOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Edit2 className="h-4 w-4 text-blue-600" />{t("common:edit")} — {selectedEmployee.firstName} {selectedEmployee.lastName}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("firstName")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
                </div>
                <div className={isRtl ? "text-right" : "text-left"}>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("lastName")}</label>
                  <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
                </div>
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("phone")}</label>
                <input type="text" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("role")}</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)}>
                  {roles.map((r) => (<option key={r.id} value={r.id}>{r.name} - {r.description}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">{t("common:save")}</button>
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmOpen && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="p-6 space-y-4 text-center">
              <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto"><Trash2 className="h-7 w-7 text-rose-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">{t("deleteConfirmTitle")}</h3>
              <p className="text-slate-500 text-sm">{t("deleteConfirmMsg")} <span className="font-bold text-slate-800">"{selectedEmployee.firstName} {selectedEmployee.lastName}"</span>?</p>
              <div className="flex gap-3 pt-2">
                <button onClick={handleConfirmDelete} className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm transition">{t("common:delete")}</button>
                <button onClick={() => setDeleteConfirmOpen(false)} className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
