"use client";

import React, { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Server, Database, Cpu, HardDrive, Users, ShoppingCart,
  AlertTriangle, Activity, RefreshCw, Shield, Clock, Zap,
  ArrowUp, ArrowDown, CheckCircle, XCircle, BarChart3
} from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";

interface SystemMetrics {
  server: {
    uptime: number;
    totalRequests: number;
    totalErrors: number;
    errorRate: string;
    avgResponseTime: number;
  };
  database: {
    status: string;
    latencyMs: number;
  };
  counts: {
    users?: number;
    employees?: number;
    products?: number;
    customers?: number;
    suppliers?: number;
    sales?: number;
    purchases?: number;
    todaySales?: number;
    todayRevenue?: number;
    openOrders?: number;
    activeUsers?: number;
    invoices?: number;
  };
  system: {
    memory: {
      used: number;
      total: number;
      rss: number;
      systemFree: number;
      systemTotal: number;
      usagePercent: string;
    };
    cpu: { user: number; system: number };
    platform: string;
    nodeVersion: string;
    pid: number;
    loadAverage: number[];
  };
  alerts: { level: string; message: string; timestamp: string }[];
}

export default function AdminDashboardPage() {
  const { t, i18n } = useTranslation(["dashboard", "common"]);
  const isRtl = i18n.language === "ar";
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await apiRequest("/monitoring/dashboard");
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!metrics) {
    return (
      <DashboardLayout>
        <div className="text-center py-12 text-slate-500">
          <XCircle className="h-12 w-12 mx-auto mb-3 text-red-400" />
          <p>Failed to load system metrics</p>
        </div>
      </DashboardLayout>
    );
  }

  const memPercent = metrics.system?.memory?.usagePercent || "0";
  const isHighMemory = parseFloat(memPercent) > 80;
  const dbHealthy = metrics.database?.status === "healthy";

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isRtl ? "flex-row-reverse" : ""}`}>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              System health and performance monitoring
            </p>
          </div>
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Server Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className={`flex items-center justify-between mb-3`}>
              <div className={`p-2.5 rounded-xl ${dbHealthy ? "bg-emerald-50" : "bg-red-50"}`}>
                <Server className={`h-5 w-5 ${dbHealthy ? "text-emerald-600" : "text-red-500"}`} />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${dbHealthy ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                {dbHealthy ? "HEALTHY" : "DEGRADED"}
              </span>
            </div>
            <p className="text-xs text-slate-500">Server Uptime</p>
            <p className="text-lg font-bold text-slate-800">{formatUptime(metrics.server?.uptime || 0)}</p>
            <p className="text-xs text-slate-400 mt-1">{metrics.system?.platform} / Node {metrics.system?.nodeVersion}</p>
          </div>

          {/* Database Status */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-blue-50">
                <Database className="h-5 w-5 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-slate-500">{metrics.database?.latencyMs || 0}ms</span>
            </div>
            <p className="text-xs text-slate-500">Database Latency</p>
            <p className="text-lg font-bold text-slate-800">{dbHealthy ? "Connected" : "Error"}</p>
            <p className="text-xs text-slate-400 mt-1">PostgreSQL</p>
          </div>

          {/* CPU */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-purple-50">
                <Cpu className="h-5 w-5 text-purple-600" />
              </div>
              <Zap className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-500">CPU Usage</p>
            <p className="text-lg font-bold text-slate-800">
              {metrics.system?.loadAverage?.[0]?.toFixed(2) || "0"}
            </p>
            <p className="text-xs text-slate-400 mt-1">Load average (1m)</p>
          </div>

          {/* RAM */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${isHighMemory ? "bg-red-50" : "bg-amber-50"}`}>
                <HardDrive className={`h-5 w-5 ${isHighMemory ? "text-red-500" : "text-amber-600"}`} />
              </div>
              {isHighMemory && <AlertTriangle className="h-4 w-4 text-red-400" />}
            </div>
            <p className="text-xs text-slate-500">Memory Usage</p>
            <p className="text-lg font-bold text-slate-800">{memPercent}%</p>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${isHighMemory ? "bg-red-500" : parseFloat(memPercent) > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(parseFloat(memPercent), 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Business Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <Users className="h-5 w-5 text-blue-500 mb-2" />
            <p className="text-xs text-slate-500">Active Users</p>
            <p className="text-xl font-bold text-slate-800">{metrics.counts?.activeUsers || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <ShoppingCart className="h-5 w-5 text-emerald-500 mb-2" />
            <p className="text-xs text-slate-500">Today&apos;s Sales</p>
            <p className="text-xl font-bold text-slate-800">{metrics.counts?.todaySales || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <BarChart3 className="h-5 w-5 text-amber-500 mb-2" />
            <p className="text-xs text-slate-500">Today&apos;s Revenue</p>
            <p className="text-xl font-bold text-slate-800">
              {(metrics.counts?.todayRevenue || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <Clock className="h-5 w-5 text-purple-500 mb-2" />
            <p className="text-xs text-slate-500">Open Orders</p>
            <p className="text-xl font-bold text-slate-800">{metrics.counts?.openOrders || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <Activity className="h-5 w-5 text-rose-500 mb-2" />
            <p className="text-xs text-slate-500">Error Rate</p>
            <p className="text-xl font-bold text-slate-800">{metrics.server?.errorRate || "0%"}</p>
          </div>
        </div>

        {/* Performance & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Metrics */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Performance Metrics
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total Requests</span>
                <span className="text-sm font-bold text-slate-800">{metrics.server?.totalRequests?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Total Errors</span>
                <span className="text-sm font-bold text-red-500">{metrics.server?.totalErrors?.toLocaleString() || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Avg Response Time</span>
                <span className="text-sm font-bold text-slate-800">{metrics.server?.avgResponseTime || 0}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Heap Used</span>
                <span className="text-sm font-bold text-slate-800">{metrics.system?.memory?.used || 0} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">RSS Memory</span>
                <span className="text-sm font-bold text-slate-800">{metrics.system?.memory?.rss || 0} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">System Free Memory</span>
                <span className="text-sm font-bold text-slate-800">{metrics.system?.memory?.systemFree || 0} MB</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">Process ID</span>
                <span className="text-sm font-bold text-slate-800">{metrics.system?.pid || "-"}</span>
              </div>
            </div>
          </div>

          {/* System Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-500" />
              System Alerts
            </h3>
            {metrics.alerts && metrics.alerts.length > 0 ? (
              <div className="space-y-2">
                {metrics.alerts.map((alert, i) => (
                  <div key={i} className={`p-3 rounded-xl border text-xs ${
                    alert.level === "warning"
                      ? "bg-amber-50 border-amber-100 text-amber-700"
                      : alert.level === "critical"
                        ? "bg-red-50 border-red-100 text-red-700"
                        : "bg-blue-50 border-blue-100 text-blue-700"
                  }`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{alert.message}</span>
                    </div>
                    <p className="text-[10px] opacity-60 mt-1">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">All systems operational</p>
              </div>
            )}
          </div>
        </div>

        {/* Entity Counts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Database Entity Counts</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Users", value: metrics.counts?.users, color: "blue" },
              { label: "Employees", value: metrics.counts?.employees, color: "indigo" },
              { label: "Products", value: metrics.counts?.products, color: "emerald" },
              { label: "Customers", value: metrics.counts?.customers, color: "cyan" },
              { label: "Suppliers", value: metrics.counts?.suppliers, color: "purple" },
              { label: "Sales", value: metrics.counts?.sales, color: "amber" },
              { label: "Purchases", value: metrics.counts?.purchases, color: "rose" },
              { label: "Invoices", value: metrics.counts?.invoices, color: "orange" },
              { label: "Quotations", value: (metrics.counts as any)?.quotations, color: "teal" },
              { label: "Sales Orders", value: (metrics.counts as any)?.salesOrders, color: "slate" },
            ].map((item) => (
              <div key={item.label} className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-xl font-bold text-slate-800">{item.value || 0}</p>
                <p className="text-xs text-slate-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-4">
          Last updated: {lastRefresh.toLocaleString()} | Auto-refresh: 30s
        </div>
      </div>
    </DashboardLayout>
  );
}
