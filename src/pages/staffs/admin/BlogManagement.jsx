import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import axios from "axios";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import { Icon } from "@iconify/react";
import { getBlogImageUrl, normalizeRichMediaHtml } from "../../../utils/imageUrl";
import BlogSlideshow from "../../../components/common/BlogSlideshow.jsx";
import BlogMediaInsertModal from "../../../components/private/staffs/blogs/BlogMediaInsertModal.jsx";
import BlogCategoryModal from "../../../components/private/staffs/blogs/BlogCategoryModal.jsx";

export default function BlogManagement() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "editor" | "preview"
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");

  // Editor Form State
  const [formData, setFormData] = useState({
    title: "",
    category_name: "Academic Tips",
    excerpt: "",
    content: "",
    status: "draft",
    is_featured: false,
    allow_comments: true,
    meta_keywords: "",
  });

  const [tagInput, setTagInput] = useState("");
  const [showAllPreviousTags, setShowAllPreviousTags] = useState(false);
  // Multi-Image Gallery state: [{ id, file?, url, rawPath?, isExisting }]
  const [galleryImages, setGalleryImages] = useState([]);
  // In-Content Media Insert Modal state
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalType, setMediaModalType] = useState("image");
  // Category Creation & Management Modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const quillRef = useRef(null);

  // Extract all unique existing tags across all blog posts
  const allExistingTags = useMemo(() => {
    const tagSet = new Set();
    blogs.forEach((b) => {
      if (b.meta_keywords) {
        b.meta_keywords.split(",").forEach((t) => {
          const clean = t.trim().toLowerCase().replace(/^#+/, "");
          if (clean) tagSet.add(clean);
        });
      }
    });
    return Array.from(tagSet);
  }, [blogs]);

  // Current post's active tags
  const currentTags = useMemo(() => {
    if (!formData.meta_keywords) return [];
    return formData.meta_keywords
      .split(",")
      .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
      .filter(Boolean);
  }, [formData.meta_keywords]);

  // Tag helper handlers - preserves spaces within a single tag phrase
  const handleAddTag = useCallback((rawText) => {
    if (!rawText) return;
    const tokens = rawText
      .split(/[,;\n]|\s{2,}/)
      .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
      .filter(Boolean);

    if (tokens.length === 0) return;

    setFormData((prev) => {
      const existing = prev.meta_keywords
        ? prev.meta_keywords
            .split(",")
            .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
            .filter(Boolean)
        : [];
      const updated = Array.from(new Set([...existing, ...tokens]));
      return { ...prev, meta_keywords: updated.join(", ") };
    });
    setTagInput("");
  }, []);

  const handleRemoveTag = useCallback((tagToRemove) => {
    setFormData((prev) => {
      const existing = prev.meta_keywords
        ? prev.meta_keywords
            .split(",")
            .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
            .filter(Boolean)
        : [];
      const updated = existing.filter((t) => t !== tagToRemove);
      return { ...prev, meta_keywords: updated.join(", ") };
    });
  }, []);

  const handleTogglePreviousTag = (tag) => {
    if (currentTags.includes(tag)) {
      handleRemoveTag(tag);
    } else {
      handleAddTag(tag);
    }
  };

  // Group tag after 2 space clicks or Enter
  const handleTagInputKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag(tagInput.trim());
      }
    } else if (e.key === " " || e.key === "Spacebar") {
      // If tag input already has a trailing space and user presses space again (2 space clicks)
      if (tagInput.endsWith(" ") && tagInput.trim().length > 0) {
        e.preventDefault();
        handleAddTag(tagInput.trim());
      }
    } else if (e.key === "Backspace" && !tagInput && currentTags.length > 0) {
      e.preventDefault();
      handleRemoveTag(currentTags[currentTags.length - 1]);
    }
  };

  const handleTagInputChange = (e) => {
    const val = e.target.value;
    // Catch double-space typed/pasted or comma/newlines
    if (val.includes("  ") || val.includes(",") || val.includes("\n")) {
      handleAddTag(val);
    } else {
      setTagInput(val);
    }
  };

  const handleTagInputBlur = () => {
    if (tagInput.trim()) {
      handleAddTag(tagInput.trim());
    }
  };

  const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    "http://tutorialcenter-back.test" ||
    "http://localhost:8000";

  const token = localStorage.getItem("staff_token");
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    }),
    [token]
  );

  // Show Toast helper
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch blogs & categories
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [blogsRes, catsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/blogs?per_page=100&staff_preview=1`, { headers: authHeaders }),
        axios.get(`${API_BASE_URL}/api/blogs/categories`, { headers: authHeaders }),
      ]);

      if (blogsRes.status === "fulfilled") {
        const raw = blogsRes.value.data;
        const bList = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        console.log("=== [BLOG FETCH] Fetched blogs list from backend ===", bList);
        setBlogs(bList);
      }

      if (catsRes.status === "fulfilled") {
        const rawCats = catsRes.value.data;
        const cList = Array.isArray(rawCats)
          ? rawCats
          : Array.isArray(rawCats?.data)
          ? rawCats.data
          : [];
        console.log("=== [BLOG CATEGORIES FETCH] Fetched categories ===", cList);
        setCategories(cList);
      }
    } catch (err) {
      console.error("Error fetching blog data:", err);
      showToast("Failed to load blog archives.", "error");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, authHeaders]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper to compress / optimize uploaded image to lightweight WebP
  const compressImage = (file) => {
    return new Promise((resolve) => {
      if (!file || file.type === "image/svg+xml" || file.type === "image/gif" || file.size < 350 * 1024) {
        resolve(file);
        return;
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const maxWidth = 1600;
          const maxHeight = 1600;
          let width = img.width;
          let height = img.height;
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const optimized = new File([blob], file.name.replace(/\.[^/.]+$/, ".webp"), {
                  type: "image/webp",
                  lastModified: Date.now(),
                });
                resolve(optimized);
              } else {
                resolve(file);
              }
            },
            "image/webp",
            0.85
          );
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  // Allowed image MIME types and extensions
  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".svg"];

  // Handle Multiple Images Selection
  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = [];
    for (const file of files) {
      const fileExt = "." + (file.name.split(".").pop() || "").toLowerCase();
      const isAllowed = ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(fileExt);

      if (!isAllowed) {
        showToast(`Skipped "${file.name}": Only JPG, PNG, WEBP, and SVG are accepted.`, "error");
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        showToast(`Skipped "${file.name}": Size exceeds 10MB limit.`, "error");
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      e.target.value = "";
      return;
    }

    const compressed = await Promise.all(validFiles.map((f) => compressImage(f)));
    const newItems = compressed.map((file, idx) => ({
      id: `new-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
      isExisting: false,
    }));

    setGalleryImages((prev) => [...prev, ...newItems]);
    showToast(`Added ${newItems.length} image${newItems.length > 1 ? "s" : ""} to slideshow gallery.`);
    e.target.value = "";
  };

  const handleSetCover = (index) => {
    if (index === 0) return;
    setGalleryImages((prev) => {
      const next = [...prev];
      const [chosen] = next.splice(index, 1);
      next.unshift(chosen);
      return next;
    });
    showToast("Primary cover image set.");
  };

  const handleMoveImage = (fromIdx, toIdx) => {
    setGalleryImages((prev) => {
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleRemoveImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  // Open Media Insert Modal
  const handleOpenMediaModal = (type = "image") => {
    setMediaModalType(type);
    setIsMediaModalOpen(true);
  };

  // Insert Multimedia snippet at current Quill cursor position
  const handleInsertMedia = (htmlSnippet) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const range = quill.getSelection(true);
      const index = range ? range.index : quill.getLength();
      quill.clipboard.dangerouslyPasteHTML(index, htmlSnippet);
      quill.setSelection(index + 1);
    } else {
      setFormData((prev) => ({
        ...prev,
        content: (prev.content || "") + htmlSnippet,
      }));
    }
    setIsMediaModalOpen(false);
    showToast("Media element inserted into article content!");
  };

  // Category created or selected from BlogCategoryModal
  const handleCategoryCreated = (newCat) => {
    setFormData((prev) => ({
      ...prev,
      category_name: newCat.name,
    }));
    showToast(`Category "${newCat.name}" selected!`);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      category_name: "Academic Tips",
      excerpt: "",
      content: "",
      status: "draft",
      is_featured: false,
      allow_comments: true,
      meta_keywords: "",
    });
    setTagInput("");
    setGalleryImages([]);
    setEditingBlogId(null);
  };

  // Open Edit Mode
  const handleEdit = (blog) => {
    console.log("=== [BLOG EDIT] Editing blog ===", blog);
    setEditingBlogId(blog.id);
    setFormData({
      title: blog.title || "",
      category_name: blog.category?.name || "General",
      excerpt: blog.excerpt || "",
      content: blog.content || "",
      status: blog.status || "draft",
      is_featured: Boolean(blog.is_featured),
      allow_comments: blog.allow_comments !== undefined ? Boolean(blog.allow_comments) : true,
      meta_keywords: blog.meta_keywords || "",
    });

    // Populate gallery images from blog.images or featured_image
    let rawImages = [];
    if (Array.isArray(blog.images) && blog.images.length > 0) {
      rawImages = blog.images;
    } else if (typeof blog.images === "string") {
      try {
        const parsed = JSON.parse(blog.images);
        if (Array.isArray(parsed) && parsed.length > 0) rawImages = parsed;
      } catch (e) {
        // Fallback
      }
    }

    if (rawImages.length === 0 && blog.featured_image) {
      rawImages = [blog.featured_image];
    }

    const items = rawImages.map((imgPath, idx) => ({
      id: `existing-${idx}-${Date.now()}`,
      url: getBlogImageUrl(imgPath),
      rawPath: imgPath,
      isExisting: true,
    }));

    setGalleryImages(items);
    setActiveTab("editor");
  };

  // Delete Blog
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this blog post?")) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/staffs/blogs/${id}`, { headers: authHeaders });
      showToast("Blog post deleted successfully.");
      setBlogs((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Error deleting blog:", err);
      showToast("Failed to delete blog post.", "error");
    }
  };

  // Save / Publish Blog
  const handleSave = async (targetStatus) => {
    if (!formData.title.trim()) {
      showToast("Please enter a blog post title.", "error");
      return;
    }
    if (!formData.content.trim() || formData.content === "<p><br></p>") {
      showToast("Please write some content for the article.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const postStatus = targetStatus || formData.status;

      const payload = new FormData();
      payload.append("title", formData.title.trim());
      const cleanCat = (formData.category_name || "General").trim();
      payload.append("category_name", cleanCat);
      const matchedCat = categories.find(
        (c) => c.name?.toLowerCase() === cleanCat.toLowerCase()
      );
      if (matchedCat) {
        payload.append("blog_category_id", matchedCat.id);
      }
      payload.append("content", formData.content);
      payload.append("excerpt", formData.excerpt.trim());
      payload.append("status", postStatus);
      payload.append("is_featured", formData.is_featured ? "1" : "0");
      payload.append("allow_comments", formData.allow_comments ? "1" : "0");
      let finalKeywords = (formData.meta_keywords || "").trim();
      if (tagInput.trim()) {
        const extraTokens = tagInput
          .split(/[,;\n]|\s{2,}/)
          .map((t) => t.trim().toLowerCase().replace(/^#+/, ""))
          .filter(Boolean);
        if (extraTokens.length > 0) {
          const existing = finalKeywords
            ? finalKeywords.split(",").map((t) => t.trim().toLowerCase().replace(/^#+/, "")).filter(Boolean)
            : [];
          finalKeywords = Array.from(new Set([...existing, ...extraTokens])).join(", ");
        }
      }

      payload.append("meta_keywords", finalKeywords);

      // Append new gallery image files
      galleryImages
        .filter((item) => !item.isExisting && item.file)
        .forEach((item) => {
          payload.append("images[]", item.file);
        });

      // Append existing retained image paths in order
      const existingPaths = galleryImages
        .filter((item) => item.isExisting)
        .map((item) => item.rawPath || item.url);
      payload.append("existing_images", JSON.stringify(existingPaths));

      // Featured image fallback for single-image consumers
      if (galleryImages.length > 0 && galleryImages[0].file) {
        payload.append("featured_image", galleryImages[0].file);
      } else if (galleryImages.length > 0 && galleryImages[0].rawPath) {
        payload.append("featured_image", galleryImages[0].rawPath);
      }

      if (editingBlogId) {
        await axios.post(`${API_BASE_URL}/api/staffs/blogs/${editingBlogId}`, payload, {
          headers: {
            ...authHeaders,
            "Content-Type": "multipart/form-data",
          },
        });
        showToast("Blog post updated successfully!");
      } else {
        await axios.post(`${API_BASE_URL}/api/staffs/blogs`, payload, {
          headers: {
            ...authHeaders,
            "Content-Type": "multipart/form-data",
          },
        });
        showToast("Blog post created successfully!");
      }

      resetForm();
      setActiveTab("all");
      fetchData();
    } catch (err) {
      console.error("Error saving blog post:", err);
      const errors = err.response?.data?.errors;
      let msg = err.response?.data?.message || "Failed to save blog post.";
      if (errors && typeof errors === "object") {
        const firstKey = Object.keys(errors)[0];
        if (firstKey && Array.isArray(errors[firstKey]) && errors[firstKey][0]) {
          msg = errors[firstKey][0];
        }
      }
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Blogs
  const filteredBlogs = blogs.filter((b) => {
    const matchesSearch =
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      selectedStatusFilter === "all" || b.status === selectedStatusFilter;
    const matchesCategory =
      selectedCategoryFilter === "all" ||
      b.category?.name === selectedCategoryFilter ||
      b.category?.slug === selectedCategoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Quill Allowed Formats Suite
  const quillFormats = [
    "header", "font", "size",
    "bold", "italic", "underline", "strike", "blockquote", "code-block",
    "list", "indent",
    "script",
    "direction", "align",
    "link", "image", "video",
    "color", "background"
  ];

  // Quill Toolbar & Rich Clipboard Paste Config
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, false] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike", "blockquote", "code-block"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ script: "sub" }, { script: "super" }],
      [{ align: [] }],
      ["link", "image", "video"],
      ["clean"],
    ],
    clipboard: {
      matchVisual: false,
    },
  };

  return (
    <StaffDashboardLayout pagetitle="Blogs & Editorial Studio" hideHeader={false}>
      <div className="max-w-[1400px] mx-auto space-y-6 select-none">

        {/* ── Toast Notification ────────────────────────────────────────── */}
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold text-white transition-all transform animate-in slide-in-from-bottom-4 duration-300 ${
              toast.type === "error" ? "bg-red-600" : "bg-emerald-600"
            }`}
          >
            <Icon icon={toast.type === "error" ? "lucide:alert-circle" : "lucide:check-circle-2"} className="w-5 h-5" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── Top Header Navigation ────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#09314F]/40 backdrop-blur-md rounded-3xl p-6 border border-gray-100 dark:border-[#1a4a75] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-black uppercase tracking-wider">
                Publishing Studio
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#09314F] dark:text-white tracking-tight">
              Blog & Vlog Management
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Draft, design, and publish rich articles and video updates to students and public readers.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800/60 p-1.5 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 self-start md:self-auto">
            <button
              onClick={() => {
                setActiveTab("all");
                resetForm();
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "all"
                  ? "bg-white dark:bg-[#09314F] text-[#09314F] dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon icon="lucide:layout-grid" className="w-4 h-4" />
              <span>All Articles ({blogs.length})</span>
            </button>
            <button
              onClick={() => {
                resetForm();
                setActiveTab("editor");
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === "editor" || activeTab === "preview"
                  ? "bg-gradient-to-r from-[#E83831] to-[#FF574D] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              <Icon icon="lucide:pen-tool" className="w-4 h-4" />
              <span>{editingBlogId ? "Edit Article" : "+ Create Post"}</span>
            </button>
          </div>
        </div>

        {/* ── VIEW 1: ALL POSTS DIRECTORY ──────────────────────────────── */}
        {activeTab === "all" && (
          <div className="space-y-6">
            
            {/* Search and Filters Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white dark:bg-[#09314F]/40 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-[#1a4a75]">
              {/* Search Box */}
              <div className="relative">
                <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles by title or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#06243A] rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#C5A97A]"
                />
              </div>

              {/* Status Filter */}
              <div>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#06243A] rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#C5A97A]"
                >
                  <option value="all">All Statuses (Draft & Published)</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-[#06243A] rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-white focus:outline-none focus:border-[#C5A97A]"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name} ({c.blogs_count || 0})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Articles Grid */}
            {loading ? (
              <div className="py-20 text-center text-gray-400 text-sm">Loading articles...</div>
            ) : filteredBlogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBlogs.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#09314F]/40 backdrop-blur-md rounded-3xl border border-gray-100 dark:border-[#1a4a75] shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group"
                  >
                    {/* Featured Image / Slideshow */}
                    <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      {b.images?.length > 0 || b.featured_image ? (
                        <BlogSlideshow
                          images={b.images?.length > 0 ? b.images : [b.featured_image]}
                          alt={b.title}
                          containerClassName="w-full h-full relative overflow-hidden group"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                          <Icon icon="lucide:image" className="w-10 h-10 mb-1 opacity-50" />
                          <span className="text-[10px] uppercase tracking-widest font-bold">No Featured Image</span>
                        </div>
                      )}

                      {/* Status Tag */}
                      <div className="absolute top-3 right-3 z-10">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md ${
                            b.status === "published"
                              ? "bg-emerald-500/90 text-white"
                              : "bg-gray-800/80 text-gray-200"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>

                      {/* Category Tag */}
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className="px-2.5 py-1 rounded-lg bg-[#09314F]/80 backdrop-blur-md text-[#C5A97A] text-[10px] font-black uppercase tracking-wider border border-white/10">
                          {b.category?.name || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="p-5 flex flex-col flex-1">
                      <h3 className="text-base font-black text-[#09314F] dark:text-white line-clamp-2 mb-2 group-hover:text-[#E83831] transition-colors">
                        {b.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 font-medium mb-3 flex-1">
                        {b.excerpt || "No summary excerpt provided."}
                      </p>

                      {/* Meta Keywords / Tags */}
                      {b.meta_keywords && (
                        <div className="flex flex-wrap gap-1 mb-3 h-[18px] overflow-hidden">
                          {b.meta_keywords.split(',').slice(0, 3).map((tag, idx) => {
                            const trimmed = tag.trim();
                            if (!trimmed) return null;
                            return (
                              <span key={idx} className="px-1.5 py-0.5 rounded-md bg-[#09314F]/10 dark:bg-[#09314F]/85 text-[#09314F] dark:text-[#C5A97A] text-[8px] font-black uppercase tracking-wider max-w-[70px] truncate">
                                #{trimmed}
                              </span>
                            );
                          })}
                          {b.meta_keywords.split(',').length > 3 && (
                            <span className="text-[9px] text-gray-400 font-bold self-center">...</span>
                          )}
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold border-t border-gray-100 dark:border-gray-800/60 pt-3 mb-4">
                        <div className="flex items-center gap-1.5">
                          <Icon icon="lucide:eye" className="w-3.5 h-3.5 text-blue-500" />
                          <span>{b.views || 0} Views</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-amber-500" />
                          <span>{b.reading_time || 2} min read</span>
                        </div>
                        <div>
                          {b.published_at ? new Date(b.published_at).toLocaleDateString() : "Draft"}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(b)}
                          className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Icon icon="lucide:edit-3" className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <a
                          href={`/blog/${b.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors text-center"
                        >
                          <Icon icon="lucide:external-link" className="w-3.5 h-3.5" />
                          <span>Live</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id)}
                          className="py-2 px-3 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Icon icon="lucide:trash-2" className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-white dark:bg-[#09314F]/40 backdrop-blur-md rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Icon icon="lucide:file-text" className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-lg font-black text-gray-700 dark:text-gray-300">No Articles Found</h3>
                <p className="text-xs text-gray-400 mt-1 mb-5">Click below to start drafting your first blog or vlog article.</p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setActiveTab("editor");
                  }}
                  className="px-6 py-2.5 bg-[#09314F] dark:bg-[#E83831] text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg"
                >
                  + Write Article Now
                </button>
              </div>
            )}

          </div>
        )}

        {/* ── VIEW 2: WYSIWYG EDITOR STUDIO ────────────────────────────── */}
        {(activeTab === "editor" || activeTab === "preview") && (
          <div className="space-y-6">
            
            {/* Top Toolbar Navigation */}
            <div className="flex items-center justify-between bg-white dark:bg-[#09314F]/40 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-[#1a4a75]">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className="flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#09314F] dark:hover:text-white transition-colors"
              >
                <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                <span>Back to All Articles</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab(activeTab === "preview" ? "editor" : "preview")}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <Icon icon={activeTab === "preview" ? "lucide:edit-3" : "lucide:eye"} className="w-4 h-4" />
                  <span>{activeTab === "preview" ? "Back to Editor" : "Live Reader Preview"}</span>
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave("draft")}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-xl text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSave("published")}
                  className="px-6 py-2 bg-gradient-to-r from-[#E83831] to-[#FF574D] text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icon icon="lucide:send" className="w-4 h-4" />
                      <span>Publish Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* If Preview Tab is active, render simulated reader view */}
            {activeTab === "preview" ? (
              <div className="bg-white dark:bg-[#06243A] rounded-3xl p-6 sm:p-8 md:p-12 border border-gray-100 dark:border-gray-800 shadow-xl max-w-4xl w-full mx-auto space-y-6 overflow-hidden break-words">
                <div className="flex items-center gap-2 text-xs font-bold text-[#E83831]">
                  <span className="uppercase tracking-widest">{formData.category_name || "Category"}</span>
                  <span>•</span>
                  <span className="text-gray-400">Live Article Preview</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#09314F] dark:text-white leading-tight break-words">
                  {formData.title || "Untitled Article"}
                </h1>

                {formData.excerpt && (
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-300 italic border-l-4 border-[#C5A97A] pl-4 break-words">
                    {formData.excerpt}
                  </p>
                )}

                {galleryImages.length > 0 && (
                  <div className="rounded-2xl overflow-hidden h-[240px] sm:h-[360px] w-full">
                    <BlogSlideshow
                      images={galleryImages.map((img) => img.url)}
                      alt="Article Gallery Preview"
                      containerClassName="w-full h-full relative overflow-hidden"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Rendered HTML */}
                <div 
                  className="quill-content blog-article-content prose dark:prose-invert max-w-full text-gray-800 dark:text-gray-200 leading-relaxed text-sm sm:text-base pt-4 break-words overflow-hidden [&_p]:mb-4 [&_img]:rounded-2xl [&_img]:max-w-full [&_img]:h-auto [&_figure]:my-6 [&_figure]:mx-auto [&_figcaption]:text-xs [&_figcaption]:text-center [&_figcaption]:text-gray-400 [&_figcaption]:mt-2 [&_figcaption]:italic [&_audio]:w-full [&_audio]:my-4 [&_video]:w-full [&_video]:rounded-2xl [&_video]:my-4 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-2xl [&_iframe]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-all [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:block"
                  dangerouslySetInnerHTML={{ __html: normalizeRichMediaHtml(formData.content || "<p>No content written yet.</p>") }}
                />

                {/* Tags (Meta Keywords) Preview */}
                {formData.meta_keywords && (
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 mr-1 flex items-center gap-1">
                        <Icon icon="lucide:tags" className="w-3 h-3 text-[#C5A97A]" /> Tags:
                      </span>
                      {currentTags.map((tag, index) => (
                        <span 
                          key={index} 
                          className="px-3 py-1 rounded-full bg-gray-100/80 dark:bg-white/10 backdrop-blur-md border border-gray-200/80 dark:border-white/15 text-[#09314F] dark:text-[#C5A97A] text-[11px] font-bold shadow-sm"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Two-Column Studio Layout */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Main Article Editor (Left 2 cols) */}
                <div className="lg:col-span-2 space-y-5 bg-white dark:bg-[#09314F]/40 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-[#1a4a75] shadow-sm">
                  {/* Article Title */}
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Article Title *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 10 Proven Strategies to Score 300+ in JAMB UTME..."
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3.5 bg-gray-50 dark:bg-[#06243A] rounded-2xl border border-gray-200 dark:border-gray-700 text-sm font-bold text-[#09314F] dark:text-white focus:outline-none focus:border-[#C5A97A]"
                    />
                  </div>

                  {/* Summary / Excerpt */}
                  <div>
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">
                      Short Excerpt (Displayed on Cards & Social Previews)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Brief 1-2 sentence overview of this article..."
                      value={formData.excerpt}
                      onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-[#06243A] rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:border-[#C5A97A] resize-none"
                    />
                  </div>

                  {/* Interactive Tags & Keywords Creator */}
                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Icon icon="lucide:tags" className="w-3.5 h-3.5 text-[#C5A97A]" /> Tags & Keywords
                      </span>
                      <span className="text-[10px] text-gray-400 font-normal">Type and press <span className="font-bold text-[#09314F] dark:text-white">Double Space</span> or <span className="font-bold text-[#09314F] dark:text-white">Enter</span> to group</span>
                    </label>

                    {/* Tag Box with Glass Badges and Inline Typing */}
                    <div className="min-h-[52px] p-2.5 bg-gray-50 dark:bg-[#06243A] rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-2 focus-within:border-[#C5A97A] transition-colors">
                      {currentTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 dark:bg-white/10 backdrop-blur-md border border-gray-200/90 dark:border-white/15 text-[#09314F] dark:text-[#C5A97A] text-xs font-extrabold shadow-sm transition-all animate-in zoom-in-95 duration-200 group"
                        >
                          <span>#{tag}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                          >
                            <Icon icon="lucide:x" className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      <input
                        type="text"
                        placeholder={currentTags.length === 0 ? "Type tag name (press Double Space or Enter)..." : "Add another tag (Double Space or Enter)..."}
                        value={tagInput}
                        onChange={handleTagInputChange}
                        onKeyDown={handleTagInputKeyDown}
                        onBlur={handleTagInputBlur}
                        className="flex-1 min-w-[160px] bg-transparent text-xs font-medium text-gray-800 dark:text-gray-200 focus:outline-none px-2 py-1"
                      />
                    </div>

                    {/* Existing Database Tags Shelf */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Icon icon="lucide:database" className="w-3 h-3 text-[#C5A97A]" /> Existing Database Tags ({allExistingTags.length}):
                        </span>
                        {allExistingTags.length > 10 && (
                          <button
                            type="button"
                            onClick={() => setShowAllPreviousTags(!showAllPreviousTags)}
                            className="text-[10px] font-bold text-[#C5A97A] hover:underline"
                          >
                            {showAllPreviousTags ? "Show Less" : "Show All"}
                          </button>
                        )}
                      </div>

                      {allExistingTags.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-1">
                          {(showAllPreviousTags ? allExistingTags : allExistingTags.slice(0, 12)).map((prevTag, pIdx) => {
                            const isSelected = currentTags.includes(prevTag);
                            return (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => handleTogglePreviousTag(prevTag)}
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 ${
                                  isSelected
                                    ? "bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] shadow-sm scale-[1.02]"
                                    : "bg-gray-200/60 dark:bg-white/5 hover:bg-gray-300/60 dark:hover:bg-white/15 text-gray-600 dark:text-gray-300 border border-transparent dark:border-white/5"
                                }`}
                              >
                                <span>#{prevTag}</span>
                                {isSelected ? (
                                  <Icon icon="lucide:check" className="w-2.5 h-2.5" />
                                ) : (
                                  <Icon icon="lucide:plus" className="w-2.5 h-2.5 opacity-60" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#06243A] border border-dashed border-gray-200 dark:border-gray-700/60 text-xs font-semibold text-gray-400 dark:text-gray-500">
                          None
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rich Text Editor with In-Content Media Action Bar */}
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div>
                        <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest">
                          Article Content (Rich Text & Media) *
                        </label>
                        <span className="text-[10px] text-gray-400 font-normal">
                          Insert media, format headings, blockquotes, code blocks, lists
                        </span>
                      </div>

                      {/* Quick In-Content Media Insert Action Bar */}
                      <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-[#06243A] p-1 rounded-xl border border-gray-200 dark:border-gray-700/80">
                        <span className="text-[10px] font-black text-[#09314F] dark:text-[#C5A97A] px-2 uppercase tracking-wider hidden sm:inline">
                          + Insert Media:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleOpenMediaModal("image")}
                          className="px-2.5 py-1 bg-white dark:bg-white/10 hover:bg-blue-50 dark:hover:bg-white/20 text-[#09314F] dark:text-white rounded-lg text-xs font-bold border border-gray-200 dark:border-white/10 shadow-xs flex items-center gap-1 transition-all active:scale-95"
                          title="Insert image with optional caption at cursor"
                        >
                          <Icon icon="lucide:image" className="w-3.5 h-3.5 text-blue-500" />
                          <span>Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenMediaModal("audio")}
                          className="px-2.5 py-1 bg-white dark:bg-white/10 hover:bg-purple-50 dark:hover:bg-white/20 text-[#09314F] dark:text-white rounded-lg text-xs font-bold border border-gray-200 dark:border-white/10 shadow-xs flex items-center gap-1 transition-all active:scale-95"
                          title="Insert playable audio clip player at cursor"
                        >
                          <Icon icon="lucide:music" className="w-3.5 h-3.5 text-purple-500" />
                          <span>Audio</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenMediaModal("video")}
                          className="px-2.5 py-1 bg-white dark:bg-white/10 hover:bg-red-50 dark:hover:bg-white/20 text-[#09314F] dark:text-white rounded-lg text-xs font-bold border border-gray-200 dark:border-white/10 shadow-xs flex items-center gap-1 transition-all active:scale-95"
                          title="Insert video player or YouTube/Vimeo embed at cursor"
                        >
                          <Icon icon="lucide:video" className="w-3.5 h-3.5 text-red-500" />
                          <span>Video</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#06243A] rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-inner">
                      <ReactQuill
                        ref={quillRef}
                        theme="snow"
                        value={formData.content}
                        onChange={(content) => setFormData({ ...formData, content })}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Write your article here, or paste rich text from Word / Google Docs..."
                        className="h-80 md:h-96 pb-12 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Publishing Options Sidebar (Right 1 col) */}
                <div className="space-y-5">
                  
                  {/* Multi-Image Gallery & Slideshow Manager */}
                  <div className="bg-white dark:bg-[#09314F]/40 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-[#1a4a75] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:images" className="w-4 h-4 text-[#C5A97A]" />
                        <h3 className="text-xs font-black uppercase tracking-wider text-[#09314F] dark:text-white">
                          Post Gallery ({galleryImages.length})
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold text-gray-400">Slideshow / Carousel</span>
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Upload one or multiple images. Readers can slide through them in cards and post headers. The first image is the primary cover.
                    </p>

                    {/* Thumbnail Grid */}
                    {galleryImages.length > 0 && (
                      <div className="grid grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                        {galleryImages.map((img, idx) => (
                          <div
                            key={img.id || idx}
                            className={`relative group rounded-xl overflow-hidden border-2 transition-all ${
                              idx === 0
                                ? "border-[#C5A97A] shadow-md ring-2 ring-[#C5A97A]/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
                            }`}
                          >
                            <img
                              src={img.url}
                              alt={`Gallery ${idx + 1}`}
                              className="w-full h-24 object-cover"
                            />

                            {/* Cover Badge */}
                            {idx === 0 ? (
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#C5A97A] text-[#09314F] text-[9px] font-black uppercase tracking-wider shadow">
                                Cover
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetCover(idx)}
                                title="Set as primary cover image"
                                className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/60 hover:bg-[#C5A97A] text-white hover:text-[#09314F] text-[9px] font-bold opacity-0 group-hover:opacity-100 transition-all shadow"
                              >
                                Set Cover
                              </button>
                            )}

                            {/* Action overlay buttons */}
                            <div className="absolute top-1 right-1 flex items-center gap-1">
                              {/* Move Left */}
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, idx - 1)}
                                  title="Move Left"
                                  className="w-5 h-5 rounded bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
                                >
                                  ←
                                </button>
                              )}
                              {/* Move Right */}
                              {idx < galleryImages.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, idx + 1)}
                                  title="Move Right"
                                  className="w-5 h-5 rounded bg-black/60 hover:bg-black/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
                                >
                                  →
                                </button>
                              )}
                              {/* Remove */}
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                title="Remove Image"
                                className="w-5 h-5 rounded bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow transition-all"
                              >
                                <Icon icon="lucide:x" className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Upload Dropzone */}
                    <div className="relative rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 py-6 px-4 overflow-hidden flex flex-col items-center justify-center text-center hover:border-[#C5A97A] transition-colors group">
                      <div className="space-y-1.5 pointer-events-none">
                        <Icon icon="lucide:upload-cloud" className="w-8 h-8 text-gray-400 mx-auto group-hover:scale-110 transition-transform text-[#09314F] dark:text-[#C5A97A]" />
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
                          {galleryImages.length > 0 ? "+ Add More Images" : "Click or Drag to Upload Images"}
                        </p>
                        <p className="text-[10px] text-gray-400">Multiple selection supported (JPG, PNG, WEBP, SVG)</p>
                      </div>
                      <input
                        type="file"
                        multiple
                        accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                        onChange={handleImageChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Category & Metadata */}
                  <div className="bg-white dark:bg-[#09314F]/40 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-[#1a4a75] shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#09314F] dark:text-white flex items-center gap-2">
                        <Icon icon="lucide:tag" className="w-4 h-4 text-[#C5A97A]" />
                        Category & Topic
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] text-[10px] font-black uppercase tracking-wider shadow-sm hover:opacity-90 active:scale-95 transition-all"
                      >
                        <Icon icon="lucide:folder-plus" className="w-3.5 h-3.5" />
                        <span>+ New Category</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">
                        Select or Type Category *
                      </label>
                      <div className="space-y-2">
                        <select
                          value={categories.some((c) => c.name === formData.category_name) ? formData.category_name : "__custom__"}
                          onChange={(e) => {
                            if (e.target.value === "__create_new__") {
                              setIsCategoryModalOpen(true);
                            } else if (e.target.value !== "__custom__") {
                              setFormData({ ...formData, category_name: e.target.value });
                            }
                          }}
                          className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#06243A] rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-[#09314F] dark:text-white focus:outline-none focus:border-[#C5A97A]"
                        >
                          <option value="">-- Choose from Database Categories --</option>
                          {categories.map((cat) => (
                            <option key={cat.id} value={cat.name}>
                              {cat.name} ({cat.blogs_count || 0} {cat.blogs_count === 1 ? 'post' : 'posts'})
                            </option>
                          ))}
                          <option value="__create_new__" className="text-[#C5A97A] font-black">
                            ✨ + Create New Category in Database...
                          </option>
                          {!categories.some((c) => c.name === formData.category_name) && formData.category_name && (
                            <option value="__custom__">
                              Custom: "{formData.category_name}"
                            </option>
                          )}
                        </select>

                        <input
                          type="text"
                          placeholder="Or type custom category name..."
                          value={formData.category_name}
                          onChange={(e) => setFormData({ ...formData, category_name: e.target.value })}
                          className="w-full px-3.5 py-2 bg-transparent rounded-xl border border-gray-200/60 dark:border-gray-700/60 text-xs font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:border-[#C5A97A]"
                        />
                      </div>
                    </div>

                    {/* Quick Category Chips from Backend DB */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1">
                          <Icon icon="lucide:database" className="w-3 h-3 text-[#C5A97A]" />
                          Database Categories ({categories.length}):
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsCategoryModalOpen(true)}
                          className="text-[10px] font-bold text-[#C5A97A] hover:underline"
                        >
                          Manage
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                        {categories.map((cat) => {
                          const isSelected = formData.category_name?.toLowerCase() === cat.name?.toLowerCase();
                          return (
                            <button
                              type="button"
                              key={cat.id}
                              onClick={() => setFormData({ ...formData, category_name: cat.name })}
                              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold transition-all flex items-center gap-1.5 ${
                                isSelected
                                  ? "bg-[#09314F] text-[#C5A97A] dark:bg-[#C5A97A] dark:text-[#09314F] shadow-sm scale-105 ring-2 ring-[#C5A97A]/30"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent dark:border-white/5"
                              }`}
                            >
                              <Icon icon={cat.icon || "lucide:tag"} className="w-3 h-3 opacity-70" />
                              <span>{cat.name}</span>
                              {cat.blogs_count > 0 && (
                                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                                  isSelected ? "bg-white/20 text-white dark:text-[#09314F]" : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                                }`}>
                                  {cat.blogs_count}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Publishing Status & Toggles */}
                  <div className="bg-white dark:bg-[#09314F]/40 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-[#1a4a75] shadow-sm space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-wider text-[#09314F] dark:text-white flex items-center gap-2">
                      <Icon icon="lucide:settings-2" className="w-4 h-4 text-[#C5A97A]" />
                      Publishing Settings
                    </h3>

                    {/* Status radio */}
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase">Publish Status</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: "draft" })}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                            formData.status === "draft"
                              ? "bg-gray-800 text-white border-gray-800"
                              : "bg-gray-50 dark:bg-[#06243A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          Draft
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, status: "published" })}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                            formData.status === "published"
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-gray-50 dark:bg-[#06243A] text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                          }`}
                        >
                          Published
                        </button>
                      </div>
                    </div>

                    {/* Featured toggle */}
                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Featured Article</p>
                        <p className="text-[10px] text-gray-400">Pin to home & header spotlight</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.is_featured}
                        onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                        className="w-4 h-4 rounded text-[#E83831] focus:ring-[#E83831]"
                      />
                    </label>

                    {/* Comments toggle */}
                    <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-gray-100 dark:border-gray-800">
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Allow Reader Comments</p>
                        <p className="text-[10px] text-gray-400">Enable student & guest discussion</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.allow_comments}
                        onChange={(e) => setFormData({ ...formData, allow_comments: e.target.checked })}
                        className="w-4 h-4 rounded text-[#E83831] focus:ring-[#E83831]"
                      />
                    </label>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

        {/* In-Content Multimedia Insert Modal */}
        <BlogMediaInsertModal
          isOpen={isMediaModalOpen}
          onClose={() => setIsMediaModalOpen(false)}
          onInsert={handleInsertMedia}
          initialType={mediaModalType}
          apiBaseUrl={API_BASE_URL}
          authHeaders={authHeaders}
        />

        {/* Blog Category Creation & Management Studio Modal */}
        <BlogCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoryCreated={handleCategoryCreated}
          categories={categories}
          onCategoriesUpdated={(newList) => setCategories(newList)}
          apiBaseUrl={API_BASE_URL}
          authHeaders={authHeaders}
        />

      </div>
    </StaffDashboardLayout>
  );
}
