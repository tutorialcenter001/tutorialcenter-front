import React, { useState } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";

const PRESET_ICONS = [
  { id: "lucide:tag", label: "Tag" },
  { id: "lucide:book-open", label: "Academics" },
  { id: "lucide:award", label: "Excellence" },
  { id: "lucide:graduation-cap", label: "University" },
  { id: "lucide:sparkles", label: "Tips & Hacks" },
  { id: "lucide:flame", label: "Trending" },
  { id: "lucide:lightbulb", label: "Insights" },
  { id: "lucide:target", label: "Goals" },
  { id: "lucide:compass", label: "Guides" },
  { id: "lucide:bell", label: "News" },
];

export default function BlogCategoryModal({
  isOpen,
  onClose,
  onCategoryCreated, // callback(categoryObj)
  categories = [],
  onCategoriesUpdated, // callback(newList)
  apiBaseUrl,
  authHeaders,
}) {
  const [activeTab, setActiveTab] = useState("create"); // "create" | "manage"
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("lucide:tag");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a category name.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await axios.post(
        `${apiBaseUrl}/api/staffs/blog-categories`,
        {
          name: name.trim(),
          description: description.trim() || null,
          icon: selectedIcon,
          status: "active",
        },
        { headers: authHeaders }
      );

      const newCategory = res.data?.data || res.data;

      // Update parent list
      if (onCategoriesUpdated) {
        onCategoriesUpdated([...categories, newCategory]);
      }

      // Auto-select in editor
      if (onCategoryCreated) {
        onCategoryCreated(newCategory);
      }

      handleClose();
    } catch (err) {
      console.error("Error creating blog category:", err);
      if (err.response?.status === 422) {
        const existingData = err.response?.data?.data;
        const msg = err.response?.data?.message || "A category with this name already exists.";
        
        // If server provided existing category data, offer to select it
        if (existingData) {
          if (onCategoryCreated) {
            onCategoryCreated(existingData);
          }
          handleClose();
          return;
        }
        setError(msg);
      } else {
        setError(err.response?.data?.message || "Failed to create category.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"? Articles in this category will be reassigned to "General".`)) {
      return;
    }

    try {
      setDeletingId(id);
      await axios.delete(`${apiBaseUrl}/api/staffs/blog-categories/${id}`, {
        headers: authHeaders,
      });

      const updated = categories.filter((c) => c.id !== id);
      if (onCategoriesUpdated) {
        onCategoriesUpdated(updated);
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      alert(err.response?.data?.message || "Failed to delete category.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    setSelectedIcon("lucide:tag");
    setError(null);
    setActiveTab("create");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#09314F] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-[#0F2843] text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#C5A97A]/20 flex items-center justify-center text-[#C5A97A] border border-[#C5A97A]/30">
              <Icon icon="lucide:folder-plus" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-tight">Blog Categories Studio</h3>
              <p className="text-xs text-gray-300 font-medium">Create and organize topics for your articles</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <Icon icon="lucide:x" className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/10 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("create")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "create"
                ? "bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
          >
            <Icon icon="lucide:plus-circle" className="w-4 h-4" />
            <span>+ Create Category</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manage")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "manage"
                ? "bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] shadow-md"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10"
            }`}
          >
            <Icon icon="lucide:list" className="w-4 h-4" />
            <span>Manage Existing ({categories.length})</span>
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-xs font-semibold border border-red-200 dark:border-red-800 flex items-center gap-2">
            <Icon icon="lucide:alert-circle" className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tab 1: Create Category Form */}
        {activeTab === "create" && (
          <form onSubmit={handleCreate} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5 uppercase tracking-wider">
                Category Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Scholarship News, WAEC Past Questions, Study Hacks..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#06243A] rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5 uppercase tracking-wider">
                Topic Icon / Badge
              </label>
              <div className="grid grid-cols-5 gap-2 pt-1">
                {PRESET_ICONS.map((preset) => {
                  const isChosen = selectedIcon === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedIcon(preset.id)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-[10px] font-bold transition-all ${
                        isChosen
                          ? "bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] border-[#0F2843] dark:border-[#C5A97A] shadow-md scale-105"
                          : "bg-gray-50 dark:bg-[#06243A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-400"
                      }`}
                    >
                      <Icon icon={preset.id} className="w-4 h-4" />
                      <span className="truncate w-full text-center">{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Briefly describe what this category covers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-[#06243A] rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] resize-none"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0F2843] to-[#1a4a75] dark:from-[#C5A97A] dark:to-[#d8be92] text-white dark:text-[#0F2843] text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-95 transition flex items-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:check-circle-2" className="w-4 h-4" />
                    <span>Save & Select Category</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Manage Categories List */}
        {activeTab === "manage" && (
          <div className="p-6 space-y-4 max-h-[380px] overflow-y-auto">
            {categories.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No categories found in the database.
              </div>
            ) : (
              <div className="space-y-2">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-between gap-3 hover:border-[#C5A97A]/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-[#06243A] flex items-center justify-center text-[#C5A97A] border border-gray-200 dark:border-white/10 flex-shrink-0">
                        <Icon icon={c.icon || "lucide:tag"} className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                            {c.name}
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-white/10 text-[10px] font-black text-gray-600 dark:text-gray-300 flex-shrink-0">
                            {c.blogs_count || 0} posts
                          </span>
                        </div>
                        {c.description && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {c.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          if (onCategoryCreated) {
                            onCategoryCreated(c);
                          }
                          handleClose();
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-[#0F2843] dark:bg-[#C5A97A] text-white dark:text-[#0F2843] text-[10px] font-extrabold hover:opacity-90 transition shadow-sm"
                      >
                        Select
                      </button>

                      {c.slug !== "general" && (
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          onClick={() => handleDelete(c.id, c.name)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition disabled:opacity-50"
                          title="Delete category"
                        >
                          {deletingId === c.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
