"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Plus,
  FileSpreadsheet,
  X,
  SlidersHorizontal,
} from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  filterOptions?: string[];
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onAddClick?: () => void;
  addLabel?: string;
  bulkActions?: (selectedItems: T[]) => React.ReactNode;
  searchPlaceholder?: string;
  emptyLabel?: string;
}

export default function DataTable<T extends { id: string | number; [key: string]: any }>({
  data,
  columns,
  loading = false,
  onAddClick,
  addLabel = "إضافة جديد",
  bulkActions,
  searchPlaceholder = "بحث في السجلات...",
  emptyLabel = "لا توجد سجلات متاحة حالياً.",
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // 1. Filter logic
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // General Search match across all fields
      const matchesSearch = Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      );

      // Multi-column specific filters match
      const matchesFilters = Object.entries(activeFilters).every(([key, value]) => {
        if (!value) return true;
        return String(item[key]).toLowerCase() === value.toLowerCase();
      });

      return matchesSearch && matchesFilters;
    });
  }, [data, searchQuery, activeFilters]);

  // 2. Sort logic
  const sortedData = useMemo(() => {
    const sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  // 3. Pagination logic
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Selection handlers
  const handleSelectRow = (id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedData.map((item) => item.id)));
    }
  };

  const selectedItems = useMemo(() => {
    return data.filter((item) => selectedIds.has(item.id));
  }, [data, selectedIds]);

  // EXPORT CSV (Excel-compatible)
  const exportCSV = () => {
    const headers = columns.map((c) => c.header).join(",");
    const rows = sortedData.map((item) =>
      columns
        .map((col) => {
          const val = item[col.key];
          return `"${String(val || "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csvContent = "\uFEFF" + [headers, ...rows].join("\n"); // add UTF-8 BOM
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINT
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <html>
        <head>
          <title>Export Print Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; direction: rtl; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          <h2>تقرير مطبوع - ${new Date().toLocaleDateString()}</h2>
          <table>
            <thead>
              <tr>
                ${columns.map((c) => `<th>${c.header}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${sortedData
                .map(
                  (item) => `
                <tr>
                  ${columns.map((col) => `<td>${item[col.key] || ""}</td>`).join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-10 pl-4 py-2 bg-white rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filters Toggle */}
          {columns.some((c) => c.filterOptions) && (
            <button
              onClick={() => setShowFiltersPanel(!showFiltersPanel)}
              className={`flex items-center gap-1.5 px-4 py-2 border rounded-xl text-sm font-medium transition ${
                showFiltersPanel
                  ? "bg-slate-100 border-slate-350 text-slate-900"
                  : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>تصفية</span>
            </button>
          )}

          {/* Print */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-650 hover:bg-slate-50 transition"
            title="طباعة"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-650 hover:bg-slate-50 transition"
            title="تصدير Excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>تصدير Excel</span>
          </button>

          {/* Add New */}
          {onAddClick && (
            <button
              onClick={onAddClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md transition"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>{addLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFiltersPanel && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {columns
            .filter((c) => c.filterOptions)
            .map((col) => (
              <div key={col.key} className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">{col.header}</label>
                <select
                  value={activeFilters[col.key] || ""}
                  onChange={(e) => {
                    setActiveFilters((prev) => ({ ...prev, [col.key]: e.target.value }));
                    setCurrentPage(1);
                  }}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">الكل</option>
                  {col.filterOptions?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          {Object.values(activeFilters).some(Boolean) && (
            <button
              onClick={() => {
                setActiveFilters({});
                setCurrentPage(1);
              }}
              className="col-span-full justify-self-end text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              <span>إعادة تعيين التصفية</span>
            </button>
          )}
        </div>
      )}

      {/* Selected Bulk Actions Bar */}
      {selectedItems.length > 0 && bulkActions && (
        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl animate-slide-in-top">
          <span className="text-xs font-semibold text-blue-800">
            تم تحديد {selectedItems.length} سجل
          </span>
          <div className="flex items-center gap-2 pointer-events-auto">
            {bulkActions(selectedItems)}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 rounded-lg hover:bg-blue-100 text-blue-600 transition"
              title="إلغاء التحديد"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
        <table className="w-full border-collapse text-right text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
              <th className="p-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                  onChange={handleSelectAll}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                />
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`p-4 ${col.sortable !== false ? "cursor-pointer select-none hover:bg-slate-100/50" : ""}`}
                >
                  <div className="flex items-center gap-1.5 justify-start">
                    <span>{col.header}</span>
                    {col.sortable !== false && <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Skeleton Loading Rows
              Array.from({ length: pageSize }).map((_, rIdx) => (
                <tr key={rIdx} className="border-b border-slate-200 animate-pulse">
                  <td className="p-4 text-center">
                    <div className="h-4 w-4 bg-slate-200 rounded mx-auto"></div>
                  </td>
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="p-4">
                      <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length + 1} className="p-12 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400">
                      <SlidersHorizontal className="h-8 w-8" />
                    </div>
                    <p className="text-slate-500 text-sm font-medium">{emptyLabel}</p>
                    {onAddClick && (
                      <button
                        onClick={onAddClick}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow"
                      >
                        {addLabel}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-slate-200 hover:bg-slate-50/80 transition-colors ${
                    selectedIds.has(item.id) ? "bg-blue-50/30" : ""
                  }`}
                >
                  <td className="p-4 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => handleSelectRow(item.id)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
                    />
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="p-4 text-slate-700">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-4">
            <span>
              عرض {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, sortedData.length)} من {sortedData.length} سجل
            </span>
            <div className="flex items-center gap-1.5">
              <span>عرض:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1 self-center">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                    currentPage === pageNum
                      ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-650 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
