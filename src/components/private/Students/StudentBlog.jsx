import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Icon } from "@iconify/react";
import DashboardLayout from "./DashboardLayout";
import { useAuth } from "../../../context/AuthContext";
import BlogSlideshow from "../../common/BlogSlideshow";
import { normalizeRichMediaHtml } from "../../../utils/imageUrl";

export default function StudentBlog() {
  const { user } = useAuth();

  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Comment Form State
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [toast, setToast] = useState(null);

  const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    "http://tutorialcenter-back.test" ||
    "http://localhost:8000";

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const [blogsRes, catsRes] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/api/blogs?per_page=50`),
        axios.get(`${API_BASE_URL}/api/blogs/categories`),
      ]);

      if (blogsRes.status === "fulfilled") {
        const raw = blogsRes.value.data;
        const bList = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.data)
          ? raw.data
          : [];
        console.log("=== [STUDENT BLOG FETCH] ===", bList);
        setBlogs(bList);
      }

      if (catsRes.status === "fulfilled") {
        const rawCats = catsRes.value.data;
        const cList = Array.isArray(rawCats)
          ? rawCats
          : Array.isArray(rawCats?.data)
          ? rawCats.data
          : [];
        setCategories(cList);
      }
    } catch (err) {
      console.error("Error loading student blog:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Submit comment from inside student dashboard
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedArticle) return;

    try {
      setSubmittingComment(true);
      const token = localStorage.getItem("token") || localStorage.getItem("student_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const payload = {
        comment: commentText.trim(),
        guest_name: user?.firstname ? `${user.firstname} ${user.surname || ''}` : "Enrolled Student",
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/blogs/${selectedArticle.id}/comments`,
        payload,
        { headers }
      );

      setToast("Your comment has been posted successfully!");
      setCommentText("");

      if (res.data?.data) {
        setSelectedArticle((prev) => ({
          ...prev,
          comments: [res.data.data, ...(prev.comments || [])],
        }));
      }
    } catch (err) {
      console.error("Error submitting student comment:", err);
      setToast("Failed to post comment. Please try again.");
    } finally {
      setSubmittingComment(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const filteredBlogs = blogs.filter((b) => {
    const matchesSearch =
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      b.category?.name === selectedCategory ||
      b.category?.slug === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout pagetitle="Academic Insights & Blog" hideRightPanel={true}>
      <div className="space-y-6 select-none mt-4 max-w-6xl mx-auto">
        
        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-xs flex items-center gap-2">
            <Icon icon="lucide:check-circle" className="w-4 h-4" />
            <span>{toast}</span>
          </div>
        )}

        {/* ── IF AN ARTICLE IS SELECTED, SHOW INLINE ARTICLE READER ──── */}
        {selectedArticle ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-10 border border-gray-100 dark:border-gray-700 shadow-sm space-y-8 animate-in fade-in duration-300">
            {/* Back Button */}
            <button
              type="button"
              onClick={() => setSelectedArticle(null)}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all w-fit"
            >
              <Icon icon="lucide:arrow-left" className="w-4 h-4" />
              <span>Back to All Articles</span>
            </button>

            {/* Header metadata */}
            <div className="space-y-3">
              <span className="px-3 py-1 bg-[#09314F]/10 dark:bg-[#C5A97A]/10 text-[#09314F] dark:text-[#C5A97A] font-black uppercase text-[10px] rounded-full">
                {selectedArticle.category?.name || "General"}
              </span>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#09314F] dark:text-white leading-tight">
                {selectedArticle.title}
              </h1>

              <div className="flex items-center gap-4 text-xs text-gray-400 font-medium pt-2 border-t border-gray-100 dark:border-gray-700">
                <span className="flex items-center gap-1">
                  <Icon icon="lucide:user" className="w-3.5 h-3.5 text-[#C5A97A]" />
                  {selectedArticle.author ? `${selectedArticle.author.firstname} ${selectedArticle.author.surname || ''}` : "Tutor"}
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-[#E83831]" />
                  {selectedArticle.reading_time || 2} min read
                </span>
                <span className="flex items-center gap-1">
                  <Icon icon="lucide:eye" className="w-3.5 h-3.5 text-blue-500" />
                  {selectedArticle.views || 0} views
                </span>
              </div>
            </div>

            {/* Featured Image / Slideshow */}
            {(selectedArticle.images?.length > 0 || selectedArticle.featured_image) && (
              <div className="rounded-2xl overflow-hidden h-72 sm:h-96 w-full bg-gray-100 dark:bg-gray-900">
                <BlogSlideshow
                  images={selectedArticle.images?.length > 0 ? selectedArticle.images : [selectedArticle.featured_image]}
                  alt={selectedArticle.title}
                  containerClassName="w-full h-full relative overflow-hidden group"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Excerpt */}
            {selectedArticle.excerpt && (
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border-l-4 border-[#C5A97A] text-sm md:text-base font-medium text-gray-600 dark:text-gray-300 italic">
                {selectedArticle.excerpt}
              </div>
            )}

            {/* Rich Content */}
            <div
              className="prose dark:prose-invert max-w-none text-gray-800 dark:text-gray-200 leading-relaxed text-sm md:text-base space-y-4 [&_img]:rounded-2xl [&_img]:max-w-full [&_figure]:my-6 [&_figure]:mx-auto [&_figcaption]:text-xs [&_figcaption]:text-center [&_figcaption]:text-gray-400 [&_figcaption]:mt-2 [&_figcaption]:italic [&_audio]:w-full [&_audio]:my-4 [&_video]:w-full [&_video]:rounded-2xl [&_video]:my-4 [&_iframe]:w-full [&_iframe]:aspect-video [&_iframe]:rounded-2xl [&_iframe]:my-4 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_code]:break-all"
              dangerouslySetInnerHTML={{ __html: normalizeRichMediaHtml(selectedArticle.content) }}
            />

            {/* Discussion & Comments */}
            {selectedArticle.allow_comments && (
              <div className="pt-8 border-t border-gray-100 dark:border-gray-700 space-y-6">
                <h3 className="text-lg font-black text-[#09314F] dark:text-white flex items-center gap-2">
                  <Icon icon="lucide:message-circle" className="w-5 h-5 text-[#E83831]" />
                  Student Discussion ({selectedArticle.comments?.length || 0})
                </h3>

                {/* Comment box */}
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Add your thoughts or ask a question about this tutorial post..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    required
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:border-[#C5A97A] resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingComment}
                      className="px-6 py-2.5 bg-[#09314F] dark:bg-[#E83831] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-2 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all"
                    >
                      {submittingComment ? "Posting..." : "Post Comment"}
                    </button>
                  </div>
                </form>

                {/* Comments List */}
                {selectedArticle.comments && selectedArticle.comments.length > 0 ? (
                  <div className="space-y-3">
                    {selectedArticle.comments.map((c, idx) => (
                      <div key={c.id || idx} className="p-4 rounded-xl bg-gray-50 dark:bg-gray-900/50 text-xs space-y-1.5 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-[#09314F] dark:text-[#C5A97A]">
                            {c.guest_name || "Enrolled Student"}
                          </span>
                          <span className="text-gray-400 text-[10px]">
                            {c.created_at ? new Date(c.created_at).toLocaleDateString() : "Recent"}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                          {c.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-xs">
                    No comments yet. Be the first student to comment!
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* ── MAIN ARTICLE DIRECTORY GRID ───────────────────────────── */
          <div className="space-y-6">
            
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-[#09314F] via-[#0D3E64] to-[#124B78] rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 bg-white/10 text-[#C5A97A] rounded-full text-[10px] font-black uppercase tracking-wider mb-2 inline-block">
                  Student Knowledge Hub
                </span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                  Academic Tips & Guides
                </h1>
                <p className="text-xs text-gray-300 mt-1 max-w-lg">
                  Read study strategies, exam updates, and motivational guides curated by your tutors.
                </p>
              </div>

              {/* Search input */}
              <div className="relative w-full md:w-64">
                <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-xs font-medium text-white placeholder-gray-300 focus:outline-none focus:bg-white/20"
                />
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedCategory === "all"
                    ? "bg-[#09314F] text-white shadow-md"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                }`}
              >
                All Topics
              </button>
              {categories.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setSelectedCategory(c.name)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedCategory === c.name
                      ? "bg-[#09314F] text-white shadow-md"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Articles Grid */}
            {loading ? (
              <div className="py-20 text-center text-gray-400 text-sm">Loading articles...</div>
            ) : filteredBlogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBlogs.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedArticle(b)}
                    className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl hover:border-[#C5A97A]/40 transition-all flex flex-col cursor-pointer group"
                  >
                    {/* Thumbnail / Slideshow */}
                    <div className="relative h-44 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                      {b.images?.length > 0 || b.featured_image ? (
                        <BlogSlideshow
                          images={b.images?.length > 0 ? b.images : [b.featured_image]}
                          alt={b.title}
                          containerClassName="w-full h-full relative overflow-hidden group"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                          <Icon icon="lucide:newspaper" className="w-10 h-10 opacity-50" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#09314F]/85 backdrop-blur-md text-[#C5A97A] text-[9px] font-black uppercase tracking-wider">
                          {b.category?.name || "General"}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-2">
                        <span>{b.reading_time || 2} min read</span>
                        <span>•</span>
                        <span>{b.views || 0} views</span>
                      </div>

                      <h4 className="text-sm font-black text-[#09314F] dark:text-white line-clamp-2 mb-2 group-hover:text-[#E83831] transition-colors">
                        {b.title}
                      </h4>

                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4 flex-1">
                        {b.excerpt || "Click to read full article..."}
                      </p>

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] font-bold text-gray-400">
                        <span>{b.author ? `${b.author.firstname} ${b.author.surname || ''}` : "Tutor"}</span>
                        <span className="text-[#E83831] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                          Read Now <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Icon icon="lucide:newspaper" className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <h4 className="text-base font-black text-gray-700 dark:text-gray-300">No Articles Yet</h4>
                <p className="text-xs text-gray-400">Check back soon for new student study guides.</p>
              </div>
            )}

          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
