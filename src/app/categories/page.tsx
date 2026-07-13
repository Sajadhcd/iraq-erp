"use client";

import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { FolderTree, Plus, Edit2, Trash2, Tag } from "lucide-react";
import { apiRequest } from "@/services/api";
import { useTranslation } from "react-i18next";
import { showToast } from "@/components/ui/toast";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  children: CategoryItem[];
}

export default function CategoriesPage() {
  const { t, i18n } = useTranslation(["products", "common"]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Add form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState("none");

  // Edit / Delete state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryItem | null>(null);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editParentId, setEditParentId] = useState("none");

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await apiRequest("/inventory/categories");
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) return;

    try {
      await apiRequest("/inventory/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          slug,
          description: description || undefined,
          parentId: parentId === "none" ? undefined : parentId,
        }),
      });

      fetchCategories();
      setName(""); setSlug(""); setDescription(""); setParentId("none");
    } catch (err: any) {
      showToast(`${t("common:generalError")}: ${err.message}`, "error");
    }
  };

  const handleOpenEdit = (c: CategoryItem) => {
    setSelectedCategory(c);
    setEditName(c.name);
    setEditSlug(c.slug);
    setEditDescription(c.description || "");
    setEditParentId(c.parentId || "none");
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;

    try {
      await apiRequest(`/inventory/categories/${selectedCategory.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          slug: editSlug,
          description: editDescription || undefined,
          parentId: editParentId === "none" ? undefined : editParentId,
        }),
      });
      setEditModalOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (err: any) {
      showToast(`${t("common:generalError")}: ${err.message}`, "error");
    }
  };

  const handleOpenDelete = (c: CategoryItem) => {
    setSelectedCategory(c);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;
    try {
      await apiRequest(`/inventory/categories/${selectedCategory.id}`, { method: "DELETE" });
      setDeleteConfirmOpen(false);
      setSelectedCategory(null);
      fetchCategories();
    } catch (err: any) {
      showToast(`${t("common:generalError")}: ${err.message}`, "error");
    }
  };

  const isRtl = i18n.language === "ar";

  return (
    <DashboardLayout>
      <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
        {/* Header */}
        <div className={isRtl ? "text-right" : "text-left"}>
          <h1 className="text-2xl font-bold text-slate-800">{t("categoriesTitle")}</h1>
          <p className="text-slate-500 text-sm mt-1">{t("categoriesSubtitle")}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left / Main Column: Categories List Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800">{t("currentCategories")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className={`w-full border-collapse text-sm ${isRtl ? "text-right" : "text-left"}`}>
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold">
                    <th className="py-3 px-5">{t("categoryName")}</th>
                    <th className="py-3 px-5">{t("slug")}</th>
                    <th className="py-3 px-5">{t("parentCategory")}</th>
                    <th className={`py-3 px-5 ${isRtl ? "text-left" : "text-right"}`}>{t("common:actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(categories) ? categories : []).map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition">
                      <td className="py-4 px-5">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">{c.description || t("noDescription")}</span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-500 font-mono text-xs">{c.slug}</td>
                      <td className="py-4 px-5">
                        {c.parentId ? (
                          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[11px] font-bold">{t("subCategory")}</span>
                        ) : (
                          <span className="text-slate-400 text-xs">{t("mainCategory")}</span>
                        )}
                      </td>
                      <td className={`py-4 px-5 ${isRtl ? "text-left" : "text-right"}`}>
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 bg-slate-50 hover:bg-blue-50 text-blue-600 rounded-lg border border-slate-200 hover:border-blue-100 transition"
                            title={t("common:edit")}
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(c)}
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

          {/* Right Column: Create Category Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Tag className="h-4 w-4 text-blue-500" />
              {t("addCategory")}
            </h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("categoryName")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" placeholder={t("placeholderCategoryName")} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("slug")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm text-left font-mono" placeholder={t("placeholderSlug")} value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("parentCategory")}</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm" value={parentId} onChange={(e) => setParentId(e.target.value)}>
                  <option value="none">{t("noParent")}</option>
                  {(Array.isArray(categories) ? categories : []).filter(c => !c.parentId).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("description")}</label>
                <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm h-24" placeholder={t("placeholderDescription")} value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md shadow-blue-500/10 flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                <span>{t("saveCategory")}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editModalOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 overflow-hidden shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex justify-between items-center">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2"><Edit2 className="h-4 w-4 text-blue-600" />{t("common:edit")} — {selectedCategory.name}</h3>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">×</button>
            </div>
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("categoryName")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("slug")}</label>
                <input type="text" required className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("parentCategory")}</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" value={editParentId} onChange={(e) => setEditParentId(e.target.value)}>
                  <option value="none">{t("noParent")}</option>
                  {(Array.isArray(categories) ? categories : []).filter(c => !c.parentId && c.id !== selectedCategory?.id).map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">{t("description")}</label>
                <textarea className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm h-20" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2 border-t border-slate-100">
                <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition shadow-md">{t("common:save")}</button>
                <button type="button" onClick={() => setEditModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold text-sm transition">{t("common:cancel")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-slate-200 shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
            <div className="p-6 space-y-4 text-center">
              <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto"><Trash2 className="h-7 w-7 text-rose-600" /></div>
              <h3 className="font-bold text-slate-800 text-lg">{t("deleteConfirmTitle")}</h3>
              <p className="text-slate-500 text-sm">{t("deleteConfirmMsg")} <span className="font-bold text-slate-800">"{selectedCategory.name}"</span>?</p>
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
