"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, Mail } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface UserRecord {
  id: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  employee: {
    firstName: string;
    lastName: string;
    role: { name: string };
  } | null;
}

export default function UsersPage() {
  const { t, i18n } = useTranslation(["hr", "common"]);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [email, setEmail] = useState("");
  const [passwordHash, setPasswordHash] = useState("");
  const [employeeId, setEmployeeId] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest("/users");
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest("/employees");
      const filtered = data.filter((emp: any) => !emp.userId);
      setEmployees(filtered);
      if (filtered.length > 0) {
        setEmployeeId(filtered[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !passwordHash) return;

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          passwordHash,
          employeeId: employeeId === "none" || !employeeId ? undefined : employeeId,
        }),
      });

      setModalOpen(false);
      fetchUsers();
      fetchEmployees();

      setEmail("");
      setPasswordHash("");
      setEmployeeId("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiRequest(`/users/${id}/toggle`, {
        method: "PUT",
      });
      fetchUsers();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.includes(searchTerm) ||
      (u.employee && `${u.employee.firstName} ${u.employee.lastName}`.includes(searchTerm)),
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
            <h1 className="text-2xl font-bold text-slate-800">{t("usersTitle")}</h1>
            <p className="text-slate-500 text-sm mt-1">{t("usersSubtitle")}</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
          >
            <Plus className="h-5 w-5" />
            <span>{t("addUser")}</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`}
              placeholder={t("searchPlaceholderUser")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className={`absolute top-2.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
          </div>
        </div>

        {/* Users registry list */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3 px-6">{t("tableEmail")}</th>
                  <th className="py-3 px-6">{t("tableLinkedEmployee")}</th>
                  <th className="py-3 px-6">{t("tableActiveRole")}</th>
                  <th className="py-3 px-6">{t("tableCreatedAt")}</th>
                  <th className={`py-3 px-6 ${isRtl ? "text-left" : "text-right"}`}>{t("tableToggle")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-semibold text-slate-800 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-slate-400" />
                      {u.email}
                    </td>
                    <td className="py-4 px-6 text-slate-700">
                      {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : t("unlinked")}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 bg-slate-100 border text-slate-700 rounded text-xs font-bold">
                        {u.employee?.role?.name || t("noRole")}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className={`py-4 px-6 ${isRtl ? "text-left" : "text-right"}`}>
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100"
                        }`}
                      >
                        {u.isActive ? t("activeToggle") : t("inactiveToggle")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{t("modalTitleUser")}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("emailLabel")}</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-left"
                  placeholder="user@system.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("passwordLabel")}</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-left"
                  placeholder="••••••••"
                  value={passwordHash}
                  onChange={(e) => setPasswordHash(e.target.value)}
                />
              </div>

              <div className={isRtl ? "text-right" : "text-left"}>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("linkEmployeeLabel")}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="none">{t("unlinkedOption")}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md"
                >
                  {t("submitBtnUser")}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition"
                >
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
