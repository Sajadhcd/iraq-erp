"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Search, Plus, Mail, ShieldAlert, Key, Edit, Trash2, CheckCircle, RefreshCw, X, User, Shield, CheckSquare, Square, Eye, ShieldCheck, Lock, Activity, Users } from "lucide-react";
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

interface RoleRecord {
  id: string;
  name: string;
  description: string | null;
  permissions: { permission: { id: string; action: string } }[];
}

interface PermissionRecord {
  id: string;
  action: string;
  description: string | null;
}

interface AuditLogRecord {
  id: string;
  action: string;
  entityName: string;
  entityId: string | null;
  createdAt: string;
  user: {
    email: string;
    employee: { firstName: string; lastName: string } | null;
  } | null;
}

export default function UsersPage() {
  const { t, i18n } = useTranslation(["hr", "common"]);
  const isRtl = i18n.language === "ar";

  const [activeTab, setActiveTab] = useState<"users" | "roles" | "matrix" | "audit" | "security">("users");

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);

  // Analytics/Sessions
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [failedLogins, setFailedLogins] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleRecord | null>(null);

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

  // Roles Form
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [rolePermIds, setRolePermIds] = useState<string[]>([]);

  // User Overrides state
  const [userOverrides, setUserOverrides] = useState<any[]>([]);

  // Matrix edit state
  const [matrixState, setMatrixState] = useState<Record<string, Record<string, boolean>>>({});
  const [matrixSaving, setMatrixSaving] = useState(false);

  // Password Policy State (Mocked local settings)
  const [minPasswordLength, setMinPasswordLength] = useState(8);
  const [requireNumbers, setRequireNumbers] = useState(true);
  const [requireSymbols, setRequireSymbols] = useState(true);

  useEffect(() => {
    fetchUsers();
    fetchEmployees();
    fetchRoles();
    fetchPermissions();
    fetchAuditLogs();
    fetchSessionMetrics();
  }, []);

  // Update Matrix Local State when Roles/Permissions change
  useEffect(() => {
    const newState: Record<string, Record<string, boolean>> = {};
    roles.forEach((r) => {
      newState[r.id] = {};
      permissions.forEach((p) => {
        newState[r.id][p.id] = false;
      });
      r.permissions.forEach((rp) => {
        if (rp.permission) {
          newState[r.id][rp.permission.id] = true;
        }
      });
    });
    setMatrixState(newState);
  }, [roles, permissions]);

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
      const data = await apiRequest("/users/roles");
      setRoles(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPermissions = async () => {
    try {
      const data = await apiRequest("/users/permissions");
      setPermissions(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const data = await apiRequest("/users/audit-logs");
      setAuditLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessionMetrics = async () => {
    try {
      const data = await apiRequest("/users/session-metrics");
      setActiveSessions(data.activeSessions || []);
      setFailedLogins(data.failedLogins || []);
    } catch (e) {
      console.error(e);
    }
  };

  // User Actions
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !username || !password) return;

    try {
      await apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({
          email,
          username,
          passwordHash: password,
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

  // User Overrides Logic
  const handleOpenOverrides = async (user: UserRecord) => {
    setSelectedUser(user);
    try {
      const data = await apiRequest(`/users/${user.id}/permissions`);
      setUserOverrides(data || []);
      setOverrideModalOpen(true);
    } catch (e: any) {
      alert(`Error fetching user permissions: ${e.message}`);
    }
  };

  const handleToggleOverride = (permId: string, currentStatus: string) => {
    let nextStatus = "INHERIT";
    if (currentStatus === "INHERIT") nextStatus = "ALLOW";
    else if (currentStatus === "ALLOW") nextStatus = "DENY";
    else nextStatus = "INHERIT";

    setUserOverrides(prev => prev.map(o => o.id === permId ? { ...o, overrideStatus: nextStatus } : o));
  };

  const handleSaveOverrides = async () => {
    if (!selectedUser) return;
    try {
      await apiRequest(`/users/${selectedUser.id}/permissions`, {
        method: "PUT",
        body: JSON.stringify({
          overrides: userOverrides.map(o => ({
            permissionId: o.id,
            status: o.overrideStatus
          }))
        })
      });
      alert(isRtl ? "تم حفظ استثناءات الصلاحيات للمستخدم بنجاح." : "User permission overrides saved successfully.");
      setOverrideModalOpen(false);
      setSelectedUser(null);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Roles Logic
  const handleOpenRoleModal = (role?: RoleRecord) => {
    if (role) {
      setSelectedRole(role);
      setRoleName(role.name);
      setRoleDesc(role.description || "");
      setRolePermIds(role.permissions.map(rp => rp.permission?.id).filter(Boolean));
    } else {
      setSelectedRole(null);
      setRoleName("");
      setRoleDesc("");
      setRolePermIds([]);
    }
    setRoleModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName) return;

    try {
      if (selectedRole) {
        // Edit
        await apiRequest(`/users/roles/${selectedRole.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: roleName,
            description: roleDesc,
            permissionIds: rolePermIds
          })
        });
      } else {
        // Create
        await apiRequest("/users/roles", {
          method: "POST",
          body: JSON.stringify({
            name: roleName,
            description: roleDesc,
            permissionIds: rolePermIds
          })
        });
      }
      setRoleModalOpen(false);
      fetchRoles();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm(isRtl ? "هل أنت متأكد من حذف هذا الدور؟" : "Are you sure you want to delete this role?")) return;
    try {
      await apiRequest(`/users/roles/${id}`, { method: "DELETE" });
      fetchRoles();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
  };

  // Matrix Logic
  const handleToggleMatrixCheckbox = (roleId: string, permId: string) => {
    setMatrixState(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permId]: !prev[roleId]?.[permId]
      }
    }));
  };

  const handleSaveMatrix = async () => {
    setMatrixSaving(true);
    try {
      const matrixPayload: any[] = [];
      roles.forEach((r) => {
        permissions.forEach((p) => {
          const granted = !!matrixState[r.id]?.[p.id];
          matrixPayload.push({
            roleId: r.id,
            permissionId: p.id,
            granted
          });
        });
      });

      await apiRequest("/users/matrix", {
        method: "PUT",
        body: JSON.stringify({ matrix: matrixPayload })
      });

      alert(isRtl ? "تم حفظ مصفوفة الصلاحيات بالكامل." : "Role-Permission matrix saved successfully.");
      fetchRoles();
    } catch (e: any) {
      alert(`Error saving matrix: ${e.message}`);
    } finally {
      setMatrixSaving(false);
    }
  };

  // Filtering users list
  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    const emailMatch = u.email.toLowerCase().includes(term);
    const usernameMatch = u.username ? u.username.toLowerCase().includes(term) : false;
    const employeeMatch = u.employee ? `${u.employee.firstName} ${u.employee.lastName}`.toLowerCase().includes(term) : false;
    return emailMatch || usernameMatch || employeeMatch;
  });

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return isRtl ? "لم يسجل دخول" : "Never";
    return new Date(dateStr).toLocaleString(isRtl ? "ar-IQ" : "en-US");
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        
        {/* Header Title */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRtl ? "text-right" : "text-left"}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-blue-600" />
              <span>{isRtl ? "مركز الأمان وصلاحيات النظام" : "System Security & RBAC Center"}</span>
            </h1>
            <p className="text-slate-500 text-sm mt-1">{isRtl ? "إدارة المستخدمين، الأدوار الوظيفية، مصفوفة الصلاحيات الإجمالية، وسجلات الأمان." : "Manage corporate accounts, define custom access roles, override permissions, view audit trails."}</p>
          </div>
          {activeTab === "users" && (
            <button
              onClick={() => {
                setEmployeeId(employees.length > 0 ? employees[0].id : "");
                setRoleId(roles.length > 0 ? roles[0].id : "");
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
            >
              <Plus className="h-5 w-5" />
              <span>{isRtl ? "إنشاء حساب مستخدم" : "Create User"}</span>
            </button>
          )}
          {activeTab === "roles" && (
            <button
              onClick={() => handleOpenRoleModal()}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-md shadow-blue-500/20 self-start"
            >
              <Plus className="h-5 w-5" />
              <span>{isRtl ? "إنشاء دور وظيفي مخصص" : "Create Custom Role"}</span>
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto gap-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === "users" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Users className="h-4 w-4" />
            {isRtl ? "المستخدمين" : "Users Registry"}
          </button>
          <button
            onClick={() => setActiveTab("roles")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === "roles" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Shield className="h-4 w-4" />
            {isRtl ? "الأدوار والصلاحيات" : "Access Roles"}
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === "matrix" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <CheckSquare className="h-4 w-4" />
            {isRtl ? "مصفوفة الصلاحيات" : "Permissions Matrix"}
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === "audit" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Activity className="h-4 w-4" />
            {isRtl ? "سجل الرقابة والتدقيق" : "System Audit Logs"}
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`py-3 px-4 border-b-2 transition flex items-center gap-2 ${activeTab === "security" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <Lock className="h-4 w-4" />
            {isRtl ? "الأمان وجلسات الدخول" : "Sessions & Policies"}
          </button>
        </div>

        {/* Tab 1: Users Grid */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  className={`w-full py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-xs ${isRtl ? "pr-11 pl-4 text-right" : "pl-11 pr-4 text-left"}`}
                  placeholder={isRtl ? "البحث في حسابات المستخدمين..." : "Search user accounts..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className={`absolute top-2.5 h-4 w-4 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} />
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
              <div className="overflow-x-auto">
                <table className={`w-full border-collapse ${isRtl ? "text-right" : "text-left"}`}>
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                      <th className="py-3.5 px-6">{isRtl ? "البريد الإلكتروني" : "Email Address"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "اسم المستخدم" : "Username"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "الموظف المرتبط" : "Linked Employee"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "الدور الوظيفي" : "Role"}</th>
                      <th className="py-3.5 px-6">{isRtl ? "آخر تسجيل دخول" : "Last Login"}</th>
                      <th className="py-3.5 px-6 text-center">{isRtl ? "الحالة" : "Status"}</th>
                      <th className={`py-3.5 px-6 ${isRtl ? "text-left" : "text-right"}`}>{isRtl ? "العمليات" : "Actions"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-4 px-6 font-semibold text-slate-800">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {u.email}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono font-semibold">{u.username || "—"}</td>
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
                              onClick={() => handleOpenOverrides(u)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-250 rounded font-bold transition flex items-center gap-1"
                              title={isRtl ? "استثناء الصلاحيات" : "Override Permissions"}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>{isRtl ? "استثناءات" : "Overrides"}</span>
                            </button>
                            <button
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 hover:bg-slate-100 text-blue-600 rounded-lg border border-slate-200 transition"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenReset(u)}
                              className="p-1.5 hover:bg-slate-100 text-purple-600 rounded-lg border border-slate-200 transition"
                            >
                              <Key className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-200 transition"
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
          </div>
        )}

        {/* Tab 2: Roles */}
        {activeTab === "roles" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((role) => (
              <div key={role.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs font-black">
                      {role.name}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleOpenRoleModal(role)}
                        className="p-1 hover:bg-slate-50 text-slate-500 rounded border transition"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      {role.name !== "SUPER_ADMIN" && (
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 hover:bg-rose-50 text-rose-500 rounded border border-rose-100 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 text-xs font-semibold leading-relaxed">{role.description || (isRtl ? "لا يوجد وصف لهذا الدور." : "No description provided.")}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <span>{isRtl ? "الصلاحيات المربوطة:" : "Permissions mapped:"}</span>
                  <span className="text-slate-700 font-black">{role.permissions.length}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3: Permissions Matrix */}
        {activeTab === "matrix" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-slate-700">{isRtl ? "ربط الصلاحيات بالأدوار وظيفياً" : "Full Roles-Permissions Association Matrix"}</span>
              <button
                onClick={handleSaveMatrix}
                disabled={matrixSaving}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition shadow disabled:opacity-50"
              >
                {matrixSaving ? (isRtl ? "جاري الحفظ..." : "Saving...") : (isRtl ? "حفظ التغييرات" : "Save Matrix Settings")}
              </button>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className={`w-full border-collapse ${isRtl ? "text-right" : "text-left"}`}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 font-bold sticky top-0 z-10">
                    <th className="py-3 px-6 bg-slate-100 min-w-[200px]">{isRtl ? "الصلاحية" : "System Permission"}</th>
                    {roles.map((r) => (
                      <th key={r.id} className="py-3 px-4 text-center min-w-[120px]">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-650">
                  {permissions.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-6 font-semibold">
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-800 font-bold">{p.action}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{p.description}</span>
                        </div>
                      </td>
                      {roles.map((r) => {
                        const checked = !!matrixState[r.id]?.[p.id];
                        const isDisabled = r.name === "SUPER_ADMIN";
                        return (
                          <td key={r.id} className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              disabled={isDisabled}
                              onClick={() => handleToggleMatrixCheckbox(r.id, p.id)}
                              className={`p-1.5 rounded-lg border transition ${
                                checked
                                  ? "bg-blue-50 border-blue-300 text-blue-600 hover:bg-blue-100"
                                  : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                              } ${isDisabled ? "opacity-50 cursor-not-allowed bg-blue-50 border-blue-200 text-blue-400" : ""}`}
                            >
                              {checked ? (
                                <CheckSquare className="h-4 w-4" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === "audit" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-[11px]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <span className="font-bold text-slate-700">{isRtl ? "سجلات الرقابة والتدقيق الأمني" : "Real-time Corporate Activity Logs"}</span>
              <button
                onClick={fetchAuditLogs}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-650 transition flex items-center gap-1 font-bold"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isRtl ? "تحديث" : "Refresh"}</span>
              </button>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className={`w-full border-collapse ${isRtl ? "text-right" : "text-left"}`}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100 text-slate-500 font-bold sticky top-0 z-10">
                    <th className="py-3 px-6">{isRtl ? "الوقت والتاريخ" : "Time & Date"}</th>
                    <th className="py-3 px-6">{isRtl ? "المستخدم" : "User / Subject"}</th>
                    <th className="py-3 px-6">{isRtl ? "الإجراء" : "Action executed"}</th>
                    <th className="py-3 px-6">{isRtl ? "الجدول / الكيان" : "Entity type"}</th>
                    <th className="py-3 px-6">{isRtl ? "معرف السجل" : "Entity ID"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-6 text-slate-500 font-mono text-[10px]">{new Date(log.createdAt).toLocaleString(isRtl ? "ar-IQ" : "en-US")}</td>
                      <td className="py-3 px-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">
                            {log.user?.employee ? `${log.user.employee.firstName} ${log.user.employee.lastName}` : (isRtl ? "مدير النظام" : "System Administrator")}
                          </span>
                          <span className="text-[9px] text-slate-400">{log.user?.email || "system@admin.com"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action.includes("CREATE") || log.action.includes("CREATED")
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : log.action.includes("DELETE") || log.action.includes("DELETED")
                            ? "bg-rose-50 text-rose-700 border border-rose-100"
                            : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-6 font-semibold text-slate-650">{log.entityName}</td>
                      <td className="py-3 px-6 font-mono text-[10px] text-slate-400">{log.entityId || "—"}</td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                        {isRtl ? "لا توجد سجلات تدقيق متوفرة." : "No audit records found."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Security Policy & Sessions */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Password Policy */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
              <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-600" />
                <span>{isRtl ? "سياسات حماية كلمات المرور" : "System Password Policies"}</span>
              </h3>
              <div className="space-y-4 text-xs font-semibold text-slate-650">
                <div>
                  <label className="block mb-1.5">{isRtl ? "الحد الأدنى لطول كلمة المرور (رموز)" : "Minimum Password Length"}</label>
                  <input
                    type="number"
                    min={6}
                    max={20}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-left font-bold"
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(Number(e.target.value))}
                  />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span>{isRtl ? "اشتراط احتواء أرقام (0-9)" : "Require numeric values"}</span>
                  <button
                    onClick={() => setRequireNumbers(!requireNumbers)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition ${
                      requireNumbers
                        ? "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                        : "bg-slate-50 text-slate-450 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {requireNumbers ? (isRtl ? "مفعل" : "Enabled") : (isRtl ? "معطل" : "Disabled")}
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span>{isRtl ? "اشتراط رموز خاصة (!@#$)" : "Require special characters"}</span>
                  <button
                    onClick={() => setRequireSymbols(!requireSymbols)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition ${
                      requireSymbols
                        ? "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                        : "bg-slate-50 text-slate-450 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {requireSymbols ? (isRtl ? "مفعل" : "Enabled") : (isRtl ? "معطل" : "Disabled")}
                  </button>
                </div>
                <button
                  onClick={() => alert(isRtl ? "تم حفظ سياسات كلمات المرور بنجاح." : "Password policies updated successfully.")}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs transition shadow"
                >
                  {isRtl ? "حفظ سياسة كلمة المرور" : "Save Password Policy"}
                </button>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-emerald-600" />
                  <span>{isRtl ? "جلسات الدخول النشطة حالياً" : "Active Security Sessions"}</span>
                </h3>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50">
                        <th className="py-2 px-3">{isRtl ? "البريد الإلكتروني" : "User Email"}</th>
                        <th className="py-2 px-3">{isRtl ? "عنوان IP" : "IP Address"}</th>
                        <th className="py-2 px-3">{isRtl ? "المتصفح / النظام" : "Device / Agent"}</th>
                        <th className="py-2 px-3">{isRtl ? "تاريخ النشاط" : "Last Active"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                      {activeSessions.map((sess) => (
                        <tr key={sess.id}>
                          <td className="py-3 px-3 text-slate-800">{sess.email}</td>
                          <td className="py-3 px-3 font-mono">{sess.ip}</td>
                          <td className="py-3 px-3 text-slate-500">{sess.device}</td>
                          <td className="py-3 px-3 font-mono text-[10px]">{formatDateTime(sess.lastActive)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-rose-700 mb-4 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4" />
                  <span>{isRtl ? "محاولات تسجيل الدخول الفاشلة" : "Failed Login Attempts Logging"}</span>
                </h3>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left border-collapse text-slate-650">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold bg-slate-50">
                        <th className="py-2 px-3">{isRtl ? "البريد المدخل" : "Attempt Email"}</th>
                        <th className="py-2 px-3">{isRtl ? "عنوان IP" : "IP Address"}</th>
                        <th className="py-2 px-3">{isRtl ? "توقيت المحاولة" : "Time"}</th>
                        <th className="py-2 px-3">{isRtl ? "السبب" : "Reason"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {failedLogins.map((fl) => (
                        <tr key={fl.id}>
                          <td className="py-3 px-3 font-bold text-rose-600">{fl.email}</td>
                          <td className="py-3 px-3 font-mono">{fl.ip}</td>
                          <td className="py-3 px-3 font-mono text-[10px]">{formatDateTime(fl.attemptTime)}</td>
                          <td className="py-3 px-3 text-slate-450">{fl.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Override Permissions Modal */}
      {overrideModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-xs" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-amber-50 px-6 py-4 border-b border-amber-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
                <span>{isRtl ? `استثناءات صلاحيات المستخدم: ${selectedUser.email}` : `Override Permissions for user: ${selectedUser.email}`}</span>
              </h3>
              <button onClick={() => setOverrideModalOpen(false)} className="text-slate-450 hover:text-slate-650 text-xl font-bold">×</button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-500 font-semibold">
                {isRtl
                  ? "تسمح الاستثناءات بمنح أو حجب صلاحية معينة بشكل مباشر للمستخدم متجاوزة الصلاحيات الموروثة من دوره الوظيفي الافتراضي."
                  : "Overrides allow explicit granting (ALLOW) or denying (DENY) of specific actions directly for this user, bypassing their role's defaults."}
              </p>

              <div className="max-h-[350px] overflow-y-auto border border-slate-100 rounded-lg">
                <table className={`w-full text-left border-collapse ${isRtl ? "text-right" : "text-left"}`}>
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-450 font-bold sticky top-0">
                      <th className="py-2.5 px-4">{isRtl ? "رمز الصلاحية" : "Action Permission"}</th>
                      <th className="py-2.5 px-4">{isRtl ? "موروثة من الدور" : "Inherited from Role"}</th>
                      <th className="py-2.5 px-4 text-center">{isRtl ? "حالة الاستثناء" : "Override Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-semibold text-slate-650">
                    {userOverrides.map((ov) => (
                      <tr key={ov.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-2.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-mono text-slate-800 font-bold">{ov.action}</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">{ov.description}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          {ov.inherited ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded text-[9px] font-bold">
                              {isRtl ? "نعم (نشط)" : "Yes (Granted)"}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-50 text-slate-400 border border-slate-200 rounded text-[9px]">
                              {isRtl ? "لا" : "No"}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            onClick={() => handleToggleOverride(ov.id, ov.overrideStatus)}
                            className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition ${
                              ov.overrideStatus === "ALLOW"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : ov.overrideStatus === "DENY"
                                ? "bg-rose-50 text-rose-700 border-rose-250"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}
                          >
                            {ov.overrideStatus === "ALLOW"
                              ? (isRtl ? "سماح خاص" : "Explicit Grant")
                              : ov.overrideStatus === "DENY"
                              ? (isRtl ? "حجب خاص" : "Explicit Deny")
                              : (isRtl ? "موروث" : "Inherit Defaults")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 text-sm">
                <button
                  onClick={handleSaveOverrides}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow"
                >
                  {isRtl ? "حفظ الاستثناءات" : "Save Overrides"}
                </button>
                <button
                  onClick={() => setOverrideModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-bold transition"
                >
                  {t("common:cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Add/Edit Modal */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-xs" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">
                {selectedRole ? (isRtl ? `تعديل الدور: ${selectedRole.name}` : `Edit Role: ${selectedRole.name}`) : (isRtl ? "إنشاء دور وظيفي مخصص جديد" : "Create New Custom Role")}
              </h3>
              <button onClick={() => setRoleModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleSaveRole} className="p-6 space-y-4 font-semibold text-slate-500">
              <div>
                <label className="block mb-1">{isRtl ? "اسم الدور (أحرف إنجليزية كبيرة)" : "Role Name (Uppercase English)"} *</label>
                <input
                  type="text"
                  required
                  disabled={!!selectedRole}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                  placeholder="CUSTOM_SALES"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "الوصف" : "Description"}</label>
                <textarea
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder={isRtl ? "مثال: مبيعات تجزئة" : "Example: Retail sales agent details"}
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                />
              </div>

              <div>
                <label className="block mb-1">{isRtl ? "تخصيص الصلاحيات الافتراضية" : "Select Default Permissions Mapping"}</label>
                <div className="max-h-[180px] overflow-y-auto border border-slate-100 rounded-lg p-2 space-y-1.5 bg-slate-50">
                  {permissions.map((p) => {
                    const active = rolePermIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (active) {
                            setRolePermIds(prev => prev.filter(id => id !== p.id));
                          } else {
                            setRolePermIds(prev => [...prev, p.id]);
                          }
                        }}
                        className="flex items-center gap-2 p-1.5 hover:bg-white rounded cursor-pointer transition"
                      >
                        {active ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                        <div className="flex flex-col">
                          <span className="font-mono text-slate-800 font-bold">{p.action}</span>
                          <span className="text-[9px] text-slate-400">{p.description}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 text-sm">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow"
                >
                  {isRtl ? "حفظ الدور" : "Save Role"}
                </button>
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg font-bold transition"
                >
                  {t("common:cancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-xs font-semibold text-slate-500" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800">{isRtl ? "إنشاء حساب مستخدم جديد" : "Create New User Account"}</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
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
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow"
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

      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-xs font-semibold text-slate-500" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Edit className="h-4 w-4 text-blue-600" />{isRtl ? "تعديل حساب المستخدم" : "Edit User Account"}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
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
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition shadow"
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

      {/* Reset Password Modal */}
      {resetModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 overflow-hidden shadow-2xl animate-fade-in text-xs font-semibold text-slate-500" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Key className="h-4 w-4 text-purple-600" />{isRtl ? "إعادة تعيين كلمة المرور" : "Reset Password"}</h3>
              <button onClick={() => setResetModalOpen(false)} className="text-slate-450 hover:text-slate-650 text-xl font-bold">×</button>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="p-6 space-y-4">
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
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition shadow"
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
