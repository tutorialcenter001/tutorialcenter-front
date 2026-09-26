import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "@iconify/react";
import Navbar from "../../components/public/Navbar";
import Footer from "../../components/public/Footer";
import BlogHero from "../../assets/images/Blogs.webp";
import ScrollReveal from "../../components/public/ScrollReveal";
import BlogSlideshow from "../../components/common/BlogSlideshow";

export default function Blog() {
  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

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
        console.log("=== [PUBLIC BLOGS FETCH] Fetched blogs list ===", bList);
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
      console.error("Error fetching public blogs:", err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  // Filter blogs
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

  const featuredPost = filteredBlogs.find((b) => b.is_featured) || filteredBlogs[0];
  const regularPosts = featuredPost
    ? filteredBlogs.filter((b) => b.id !== featuredPost.id)
    : filteredBlogs;

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#031525] text-gray-900 dark:text-gray-100 flex flex-col font-sans">
      <Navbar />

      {/* ── HERO BANNER ────────────────────────────────────────────────── */}
      <section className="relative w-full h-[240px] md:h-[320px] overflow-hidden flex items-center justify-center">
        <img
          src={BlogHero}
          alt="Tutorial Center Blog"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#09314F]/75 backdrop-blur-[2px]" />

        <div className="relative z-10 text-center px-4 max-w-2xl mx-auto">
          <span className="inline-block px-3 py-1 bg-white/10 text-[#C5A97A] rounded-full text-xs font-black uppercase tracking-widest mb-3 border border-white/15">
            Knowledge & Academic Excellence
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight">
            Our Blog & Insights
          </h1>
          <p className="text-xs md:text-sm text-gray-200 mt-2 font-medium">
            Explore expert tutorial strategies, JAMB/WAEC exam prep tips, and institutional updates.
          </p>
        </div>
      </section>

      {/* ── MAIN CONTENT CONTAINER ─────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16 w-full space-y-12">
        
        {/* Search & Category Filter Pills */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-6">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                selectedCategory === "all"
                  ? "bg-[#09314F] text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              }`}
            >
              All Topics
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.name)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  selectedCategory === c.name
                    ? "bg-[#09314F] text-white shadow-md"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Icon icon="lucide:search" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-medium focus:outline-none focus:border-[#C5A97A]"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#E83831] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 text-sm font-bold">Fetching publications...</p>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="py-24 text-center space-y-4 bg-white dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800 p-8 max-w-xl mx-auto">
            <Icon icon="lucide:newspaper" className="w-14 h-14 text-gray-300 dark:text-gray-600 mx-auto" />
            <h3 className="text-xl font-black text-[#09314F] dark:text-white">No Articles Published Yet</h3>
            <p className="text-xs text-gray-400">
              Our academic editors and tutors are preparing new tutorial articles. Check back soon!
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* ── FEATURED SPOTLIGHT ARTICLE ────────────────────────────── */}
            {featuredPost && (
              <ScrollReveal>
                <div className="bg-white dark:bg-gray-800/60 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all grid grid-cols-1 lg:grid-cols-12 group">
                  <div className="lg:col-span-6 relative h-64 sm:h-80 lg:h-auto overflow-hidden bg-gray-100 dark:bg-gray-900 min-h-[260px] sm:min-h-[340px]">
                    <BlogSlideshow
                      images={featuredPost.images?.length > 0 ? featuredPost.images : [featuredPost.featured_image]}
                      alt={featuredPost.title}
                      containerClassName="w-full h-full relative overflow-hidden group"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 rounded-full bg-[#09314F]/90 backdrop-blur-md text-[#C5A97A] text-[10px] font-black uppercase tracking-wider border border-white/10">
                        {featuredPost.category?.name || "Featured"}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-6 p-6 sm:p-8 lg:p-12 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs font-bold text-[#E83831]">
                        <span className="uppercase tracking-widest">Featured Story</span>
                        <span>•</span>
                        <span className="text-gray-400">{featuredPost.reading_time || 3} min read</span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-[#09314F] dark:text-white group-hover:text-[#E83831] transition-colors leading-tight">
                        {featuredPost.title}
                      </h2>

                      <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                        {featuredPost.excerpt || "Click to read full article insights and academic guidance."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs">
                        <div className="w-8 h-8 rounded-full bg-[#09314F] text-white flex items-center justify-center font-bold text-[11px]">
                          {featuredPost.author?.firstname?.[0] || "T"}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">
                            {featuredPost.author ? `${featuredPost.author.firstname} ${featuredPost.author.surname || ''}` : "Tutorial Center"}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {featuredPost.published_at ? new Date(featuredPost.published_at).toLocaleDateString() : "Recent"}
                          </p>
                        </div>
                      </div>

                      <Link
                        to={`/blog/${featuredPost.slug}`}
                        className="px-5 py-2.5 bg-[#09314F] dark:bg-[#E83831] text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                      >
                        <span>Read Article</span>
                        <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            )}

            {/* ── REGULAR ARTICLES GRID ─────────────────────────────────── */}
            {regularPosts.length > 0 && (
              <div className="space-y-6">
                <h3 className="text-xl font-black text-[#09314F] dark:text-white tracking-tight">
                  Latest Publications
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {regularPosts.map((post, idx) => (
                    <ScrollReveal key={post.id || idx}>
                      <Link
                        to={`/blog/${post.slug}`}
                        className="bg-white dark:bg-gray-800/50 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-xl transition-all flex flex-col h-full group"
                      >
                        {/* Slideshow / Image */}
                        <div className="relative h-48 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                          <BlogSlideshow
                            images={post.images?.length > 0 ? post.images : [post.featured_image]}
                            alt={post.title}
                            containerClassName="w-full h-full relative overflow-hidden group"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-3 left-3 z-10">
                            <span className="px-2.5 py-0.5 rounded-md bg-[#09314F]/85 backdrop-blur-md text-[#C5A97A] text-[9px] font-black uppercase tracking-wider">
                              {post.category?.name || "General"}
                            </span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-5 flex flex-col flex-1">
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-2">
                            <span>{post.reading_time || 2} min read</span>
                            <span>•</span>
                            <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : "Recent"}</span>
                          </div>

                          <h4 className="text-base font-black text-[#09314F] dark:text-white line-clamp-2 mb-2 group-hover:text-[#E83831] transition-colors">
                            {post.title}
                          </h4>

                          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3 flex-1">
                            {post.excerpt || "Read full educational article..."}
                          </p>

                          {/* Post Tags */}
                          {post.meta_keywords && (
                            <div className="flex flex-wrap gap-1.5 mb-3 overflow-hidden h-[22px]">
                              {post.meta_keywords.split(',').slice(0, 3).map((tag, idx) => {
                                const trimmed = tag.trim();
                                if (!trimmed) return null;
                                return (
                                  <span key={idx} className="px-2 py-0.5 rounded-full bg-gray-100/90 dark:bg-white/10 backdrop-blur-sm border border-gray-200/60 dark:border-white/10 text-[#09314F] dark:text-[#C5A97A] text-[9px] font-bold tracking-wide truncate max-w-[90px]">
                                    #{trimmed}
                                  </span>
                                );
                              })}
                              {post.meta_keywords.split(',').length > 3 && (
                                <span className="text-[9px] text-gray-400 font-bold self-center">+{post.meta_keywords.split(',').length - 3}</span>
                              )}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-400">
                            <span className="text-[#09314F] dark:text-gray-200">
                              {post.author ? `${post.author.firstname} ${post.author.surname || ''}` : "Tutorial Center"}
                            </span>
                            <span className="text-[#E83831] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              Read <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </ScrollReveal>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
