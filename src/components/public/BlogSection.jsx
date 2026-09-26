import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "@iconify/react";
import ScrollReveal from "./ScrollReveal";
import BlogSlideshow from "../common/BlogSlideshow";

export default function BlogSection() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    "http://tutorialcenter-back.test" ||
    "http://localhost:8000";

  useEffect(() => {
    let isMounted = true;
    const fetchLatestBlogs = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/blogs?per_page=3`);
        const data = res.data?.data || res.data || [];
        console.log("=== [HOMEPAGE BLOGS FETCH] ===", data);
        if (isMounted) {
          setBlogs(Array.isArray(data) ? data.slice(0, 3) : []);
        }
      } catch (err) {
        console.error("Error fetching homepage blogs:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLatestBlogs();
    return () => {
      isMounted = false;
    };
  }, [API_BASE_URL]);

  if (!loading && blogs.length === 0) {
    return null; // Gracefully hide if no blogs published yet
  }

  return (
    <section className="py-20 md:py-28 bg-[#F8F9FA] dark:bg-[#041a2e] transition-colors duration-300 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="px-3 py-1 bg-[#E83831]/10 text-[#E83831] font-black text-xs uppercase tracking-widest rounded-full border border-[#E83831]/20 inline-block mb-3">
                Insights & Updates
              </span>
              <h2 className="text-3xl md:text-4xl font-black text-[#09314F] dark:text-white tracking-tight uppercase">
                Latest Academic Insights
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xl font-medium">
                Stay updated with expert study techniques, JAMB/WAEC tips, and educational announcements.
              </p>
            </div>

            <Link
              to="/blog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#09314F] dark:bg-[#E83831] text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all self-start md:self-auto"
            >
              <span>Explore All Articles</span>
              <Icon icon="lucide:arrow-right" className="w-4 h-4" />
            </Link>
          </div>
        </ScrollReveal>

        {/* 3 Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {blogs.map((post, idx) => (
            <ScrollReveal key={post.id || idx}>
              <Link
                to={`/blog/${post.slug}`}
                className="bg-white dark:bg-[#09314F]/40 backdrop-blur-md rounded-3xl overflow-hidden border border-gray-100 dark:border-[#1a4a75] shadow-sm hover:shadow-xl hover:border-[#C5A97A]/40 transition-all flex flex-col h-full group"
              >
                {/* Thumbnail / Slideshow */}
                <div className="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <BlogSlideshow
                    images={post.images?.length > 0 ? post.images : [post.featured_image]}
                    alt={post.title}
                    containerClassName="w-full h-full relative overflow-hidden group"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#09314F]/85 backdrop-blur-md text-[#C5A97A] text-[9px] font-black uppercase tracking-wider">
                      {post.category?.name || "Academic Tip"}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold mb-2">
                    <span>{post.reading_time || 2} min read</span>
                    <span>•</span>
                    <span>{post.published_at ? new Date(post.published_at).toLocaleDateString() : "Recent"}</span>
                  </div>

                  <h3 className="text-base font-black text-[#09314F] dark:text-white line-clamp-2 mb-2 group-hover:text-[#E83831] transition-colors">
                    {post.title}
                  </h3>

                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4 flex-1">
                    {post.excerpt || "Read full article on Tutorial Center blog..."}
                  </p>

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
    </section>
  );
}
