"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, Mail, ShieldAlert, Key, Edit, Trash2, CheckCircle, RefreshCw, X, User } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface UserRecord {
  id: string;
  email: string;
  username: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    role: { id: string; name: string };
  } | null;
}

export default function UsersPage() {
  const { t, i18n } = useTranslation(["hr", "common"]);
  const isRtl = i18n.language === "ar";

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Forms
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmployeeId, setEditEmployeeId] = useState("");
  const [editRoleId, setEditRoleId] = useState("");

  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      const data = await apiRequest("/users");
      setUsers(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest("/employees");
      setEmployees(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await apiRequest("/employees/roles");
      setRoles(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) {
      alert(isRtl ? "البريد الإلكتروني واسم المستخدم وكلمة المرور مطلوبة" : "Email, username, and password are required");
      return;
    }

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          username,
          passwordHash: password, // Backend will hash it
          employeeId: employeeId === "none" || !employeeId ? undefined : employeeId,
          roleId: roleId === "none" || !roleId ? undefined : roleId,
        }),
      });

      setCreateModalOpen(false);
      fetchUsers();
      fetchEmployees();

      // Reset
      setEmail("");
      setUsername("");
      setPassword("");
      setEmployeeId("");
      setRoleId("");
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setEditEmail(user.email);
    setEditUsername(user.username || "");
    setEditEmployeeId(user.employee?.id || "");
    setEditRoleId(user.employee?.role?.id || "");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      await apiRequest(`/users/${selectedUser.id}`, {
        method: "PUT",
        body: JSON.stringify({
          email: editEmail,
          username: editUsername,
          employeeId: editEmployeeId === "none" || !editEmployeeId ? undefined : editEmployeeId,
          roleId: editRoleId === "none" || !editRoleId ? undefined : editRoleId,
        }),
      });

      setEditModalOpen(false);
      setSelectedUser(null);
      fetchUsers();
      fetchEmployees();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await apiRequest(`/users/${id}/toggle`, { method: "PUT" });
      fetchUsers();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleOpenReset = (user: UserRecord) => {
    setSelectedUser(user);
    setNewPassword("");
    setResetModalOpen(true);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      await apiRequest(`/users/${selectedUser.id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password: newPassword }),
      });
      alert(isRtl ? "تم إعادة تعيين كلمة المرور بنجاح." : "Password reset successfully.");
      setResetModalOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف حساب هذا المستخدم نهائياً؟" : "Are you sure you want to permanently delete this user account?")) return;
    try {
      await apiRequest(`/users/${id}`, { method: "DELETE" });
      fetchUsers();
    } catch (err: any) {
      alert(`${t("common:generalError")}: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const emailMatch = u.email.toLowerCase().includes(term);
    const usernameMatch = u.username ? u.username.toLowerCase().includes(term) : false;
    const employeeMatch = u.employee ? `${u.employee.firstName} ${u.employee.lastName}`.toLowerCase().includes(term) : false;
    return emailMatch || usernameMatch || employeeMatch;
  });

  const formatDate = (dateStr: string) => {
    const locale = isRtl ? "ar-IQ" : "en-US";
    return new Date(dateStr).toLocaleDateString(locale);
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return isRtl ? "لم يدخل بعد" : "Never logged in";
    const locale = isRtl ? "ar-IQ" : "en-US";
    return new Date(dateStr).toLocaleString(locale);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{isRtl ? "إدارة المستخدمين والأمان" : "User Accounts & Security"}</h1>
            <p className="text-slate-500 text-sm mt-1">{isRtl ? "إنشاء حسابات الموظفين، إدارة الصلاحيات وتعديل كلمات المرور." : "Manage corporate user credentials, update access roles, reset passwords."}</p>
          </div>
          <button
            onClick={() => {
              setEmployeeId(employees.length > 0 ? employees[0].id : "");
              setRoleId(roles.length > 0 ? roles[0].id : "");
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
          >
            <Plus className="h-5 w-5" />
            <span>{isRtl ? "إضافة مستخدم جديد" : "Create User Account"}</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`}
              placeholder={isRtl ? "البحث عن مستخدم..." : "Search user accounts..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className={`absolute top-2.5 h-5 w-5 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
          </div>
        </div>

        {/* Users registry table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
          <div className="overflow-x-auto">
            <table className={`w-full border-collapse ${isRtl ? "text-right" : "text-left"}`}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                  <th className="py-3.5 px-6">{isRtl ? "البريد الإلكتروني" : "Email Address"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "اسم المستخدم" : "Username"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "الموظف المرتبط" : "Linked Employee"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "الدور الوظيفي" : "Role Assigned"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "آخر تسجيل دخول" : "Last Active Login"}</th>
                  <th className="py-3.5 px-6 text-center">{isRtl ? "حالة الحساب" : "Account Status"}</th>
                  <th className={`py-3.5 px-6 ${isRtl ? "text-left" : "text-right"}`}>{isRtl ? "العمليات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-650 font-medium">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-4 px-6 font-semibold text-slate-800">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-slate-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold text-slate-700">{u.username || "—"}</td>
                    <td className="py-4 px-6 text-slate-700">
                      {u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : <span className="text-red-500 font-bold">{isRtl ? "غير مرتبط بموظف" : "Unlinked"}</span>}
                    </td>
                    <td className="py-4 px-6">
                      {u.employee?.role ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded font-bold">
                          {u.employee.role.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono text-[10px] text-slate-500">{formatDateTime(u.lastLogin)}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(u.id)}
                        className={`px-3 py-1 rounded-xl font-bold border transition ${
                          u.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
                        }`}
                      >
                        {u.isActive ? (isRtl ? "نشط" : "Active") : (isRtl ? "معطل" : "Disabled")}
                      </button>
                    </td>
                    <td className={`py-4 px-6 ${isRtl ? "text-left" : "text-right"}`}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg border border-slate-200 transition"
                          title={isRtl ? "تعديل الحساب" : "Edit Account Details"}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenReset(u)}
                          className="p-1.5 hover:bg-slate-100 text-purple-650 rounded-lg border border-slate-200 transition"
                          title={isRtl ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                        >
                          <Key className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 transition"
                          title={isRtl ? "حذف الحساب" : "Delete Account"}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      {isRtl ? "لا توجد حسابات مستخدمين مطابقة للبحث." : "No user accounts matched the search criteria."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 1. Add User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{isRtl ? "إنشاء حساب مستخدم جديد" : "Create New User Account"}</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs font-semibold text-slate-500">
              <div>
                <label className="block mb-1">{isRtl ? "البريد الإلكتروني" : "Email Address"} *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left"
                  placeholder="user@system.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "اسم المستخدم" : "Username"} *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left font-mono"
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "كلمة المرور" : "Password"} *</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "ربط بملف موظف" : "Link to Employee Profile"}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="none">{isRtl ? "غير مرتبط" : "Unlinked"}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "صلاحيات الدور الوظيفي" : "Access Role"}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="none">{isRtl ? "بدون دور" : "No Role"}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-md"
                >
                  {isRtl ? "إنشاء الحساب" : "Create Account"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition"
                >
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Edit className="h-4 w-4 text-blue-600" />{isRtl ? "تعديل حساب المستخدم" : "Edit User Account"}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs font-semibold text-slate-500">
              <div>
                <label className="block mb-1">{isRtl ? "البريد الإلكتروني" : "Email Address"} *</label>
                <input
                  type="email"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "اسم المستخدم" : "Username"} *</label>
                <input
                  type="text"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left font-mono"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "ربط بملف موظف" : "Link to Employee Profile"}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  value={editEmployeeId}
                  onChange={(e) => setEditEmployeeId(e.target.value)}
                >
                  <option value="none">{isRtl ? "غير مرتبط" : "Unlinked"}</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "صلاحيات الدور الوظيفي" : "Access Role"}</label>
                <select
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold"
                  value={editRoleId}
                  onChange={(e) => setEditRoleId(e.target.value)}
                >
                  <option value="none">{isRtl ? "بدون دور" : "No Role"}</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} - {r.description}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow-md"
                >
                  {isRtl ? "حفظ التغييرات" : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-bold transition"
                >
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Reset Password Modal */}
      {resetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 overflow-hidden shadow-2xl animate-fade-in" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Key className="h-4 w-4 text-purple-600" />{isRtl ? "إعادة تعيين كلمة المرور" : "Reset Password"}</h3>
              <button onClick={() => setResetModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4 text-xs font-semibold text-slate-500">
              <p className="text-slate-500">
                {isRtl ? `سيتم تعيين كلمة مرور جديدة للمستخدم: ${selectedUser.email}` : `Reset password for user: ${selectedUser.email}`}
              </p>
              <div>
                <label className="block mb-1">{isRtl ? "كلمة المرور الجديدة" : "New Password"} *</label>
                <input
                  type="password"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition shadow-md"
                >
                  {isRtl ? "تعيين الآن" : "Reset Now"}
                </button>
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-bold transition"
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
