import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import MathRenderer from "../../../components/common/MathRenderer.jsx";
import {
  AcademicCapIcon,
  ClockIcon,
  CalendarDaysIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  DocumentMagnifyingGlassIcon,
  TrashIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  BookOpenIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";

export default function AdminAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [toast, setToast] = useState(null);

  // Preview Questions Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewAssessment, setPreviewAssessment] = useState(null);

  // Submissions Modal
  const [submissionsModalOpen, setSubmissionsModalOpen] = useState(false);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [currentAssessmentForSubs, setCurrentAssessmentForSubs] = useState(null);
  const [submissionsList, setSubmissionsList] = useState([]);
  const [selectedSubmissionDetail, setSelectedSubmissionDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Publish Modal
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);
  const [assessmentToPublish, setAssessmentToPublish] = useState(null);
  const [publishOpensAt, setPublishOpensAt] = useState("");
  const [publishDueAt, setPublishDueAt] = useState("");

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const token = localStorage.getItem("staff_token");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all assessments for admin
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/assessments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });
      const data = res.data?.assessments || [];
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load admin assessments:", err);
      showToast("Failed to load assessments list.", "error");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  // Distinct subjects list for filter dropdown
  const uniqueSubjects = useMemo(() => {
    const subs = new Set();
    assessments.forEach((a) => {
      const subName = a.class?.subject?.name || a.subject?.name;
      if (subName) subs.add(subName);
    });
    return Array.from(subs).sort();
  }, [assessments]);

  // Filtered assessments
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      
      const subName = a.class?.subject?.name || a.subject?.name || "";
      if (subjectFilter !== "all" && subName !== subjectFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (a.title || "").toLowerCase().includes(q);
        const subMatch = subName.toLowerCase().includes(q);
        const classMatch = (a.class?.title || "").toLowerCase().includes(q);
        const tutorMatch = (a.creator?.name || a.creator?.email || "").toLowerCase().includes(q);
        if (!titleMatch && !subMatch && !classMatch && !tutorMatch) return false;
      }
      return true;
    });
  }, [assessments, statusFilter, subjectFilter, searchQuery]);

  // Aggregate Metrics
  const totalAssessments = assessments.length;
  const publishedAssessments = assessments.filter((a) => a.status === "published").length;
  const draftAssessments = assessments.filter((a) => a.status === "draft").length;
  const totalSubmissionsCount = assessments.reduce((acc, a) => acc + (a.stats?.submitted_count || 0), 0);

  // Open Preview Modal
  const handleOpenPreview = async (item) => {
    setPreviewLoading(true);
    setPreviewAssessment(item);
    setPreviewModalOpen(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/assessments/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      setPreviewAssessment(res.data?.assessment || item);
    } catch (err) {
      console.error("Failed to load assessment preview:", err);
      showToast("Failed to load questions preview.", "error");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Open Submissions Modal
  const handleOpenSubmissions = async (item) => {
    setCurrentAssessmentForSubs(item);
    setSelectedSubmissionDetail(null);
    setSubmissionsLoading(true);
    setSubmissionsModalOpen(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/assessments/${item.id}/submissions`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      setSubmissionsList(res.data?.submissions || []);
    } catch (err) {
      console.error("Failed to load submissions:", err);
      showToast("Failed to load submissions list.", "error");
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Inspect Single Submission Detail
  const handleInspectSubmission = async (submissionId) => {
    setDetailLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/assessments/${currentAssessmentForSubs.id}/submissions/${submissionId}`,
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        }
      );
      setSelectedSubmissionDetail(res.data?.submission);
    } catch (err) {
      console.error("Failed to load submission details:", err);
      showToast("Failed to load submission answer breakdown.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  // Open Publish Modal
  const handleOpenPublish = (item) => {
    setAssessmentToPublish(item);
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setPublishOpensAt(now.toISOString().slice(0, 16));

    const due = new Date();
    due.setDate(due.getDate() + 3);
    due.setHours(23, 59, 0, 0);
    due.setMinutes(due.getMinutes() - due.getTimezoneOffset());
    setPublishDueAt(due.toISOString().slice(0, 16));

    setPublishModalOpen(true);
  };

  // Confirm Publish
  const handleConfirmPublish = async (e) => {
    e.preventDefault();
    if (!publishDueAt) {
      showToast("Please choose a due date for submissions.", "error");
      return;
    }
    setPublishLoading(true);
    try {
      const formatToSql = (isoStr) => {
        if (!isoStr) return null;
        const d = new Date(isoStr);
        return d.toISOString().slice(0, 19).replace("T", " ");
      };

      await axios.post(
        `${API_BASE_URL}/api/admin/assessments/${assessmentToPublish.id}/publish`,
        {
          opens_at: formatToSql(publishOpensAt),
          due_at: formatToSql(publishDueAt)
        },
        {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        }
      );
      showToast("Assessment published successfully! Students can now take it.");
      setPublishModalOpen(false);
      setAssessmentToPublish(null);
      fetchAssessments();
    } catch (err) {
      console.error("Admin publish error:", err);
      showToast(err.response?.data?.message || "Failed to publish assessment.", "error");
    } finally {
      setPublishLoading(false);
    }
  };

  // Delete Assessment
  const handleDeleteAssessment = async (item) => {
    if (!window.confirm(`Are you sure you want to delete assessment "${item.title}"? This cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE_URL}/api/admin/assessments/${item.id}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
      });
      showToast("Assessment deleted successfully.");
      fetchAssessments();
    } catch (err) {
      console.error("Delete error:", err);
      showToast(err.response?.data?.message || "Failed to delete assessment.", "error");
    }
  };

  return (
    <StaffDashboardLayout pagetitle="Assessments Management & Oversight">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full min-h-screen space-y-8 pb-24">
        
        {/* TOAST ALERT */}
        {toast && (
          <div
            className={`fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold transition-all transform duration-300 animate-slide-in ${
              toast.type === "error"
                ? "bg-red-600 text-white shadow-red-500/30"
                : "bg-emerald-600 text-white shadow-emerald-500/30"
            }`}
          >
            <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* ── TOP HERO BANNER ────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#0F2843] via-[#163a5f] to-[#0F2843] rounded-[32px] p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-white/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-black text-[#C5A97A] uppercase tracking-wider">
                <AcademicCapIcon className="w-4 h-4" />
                <span>Administration & Quality Control</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Assessments & Assignments Oversight
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                Supervise all tutor-created assessments across courses and masterclasses, inspect question accuracy and mark allocations, and review student submission results.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={fetchAssessments}
                className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 text-xs font-bold transition flex items-center gap-2"
                title="Refresh Assessments"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                <span>Refresh Data</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI METRICS CARDS ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              Total Assessments
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F2843] dark:text-white">
              {totalAssessments}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Across all courses</p>
          </div>

          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              Published & Active
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {publishedAssessments}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Open for students</p>
          </div>

          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              Drafts in Progress
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400">
              {draftAssessments}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Pending tutor publication</p>
          </div>

          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              Student Submissions
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F2843] dark:text-[#C5A97A]">
              {totalSubmissionsCount}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Completed tests</p>
          </div>
        </div>

        {/* ── FILTER & SEARCH CONTROLS ─────────────────────────────────── */}
        <div className="bg-white dark:bg-[#09314F] rounded-[28px] p-4 sm:p-5 border border-gray-100 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto custom-scrollbar">
            {[
              { id: "all", label: "All" },
              { id: "published", label: "Published" },
              { id: "draft", label: "Drafts" },
              { id: "closed", label: "Closed" }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition flex-shrink-0 ${
                  statusFilter === tab.id
                    ? "bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] shadow-md"
                    : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Subject Dropdown */}
            {uniqueSubjects.length > 0 && (
              <div className="relative w-full sm:w-48">
                <FunnelIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white outline-none"
                >
                  <option value="all">All Subjects</option>
                  {uniqueSubjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title, tutor, subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition"
              />
            </div>
          </div>
        </div>

        {/* ── ASSESSMENTS LIST ─────────────────────────────────────────── */}
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 bg-white dark:bg-[#09314F] rounded-3xl border border-gray-100 dark:border-white/10">
            <div className="w-8 h-8 border-2 border-[#0F2843] dark:border-[#C5A97A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading assessments database...
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-[#09314F] rounded-[32px] border border-gray-100 dark:border-white/10 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-[#0F2843]/10 dark:bg-white/10 text-[#0F2843] dark:text-[#C5A97A] flex items-center justify-center mx-auto">
              <AcademicCapIcon className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-gray-900 dark:text-white">
                No Assessments Found
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all" || subjectFilter !== "all"
                  ? "No assessments match the selected search and filter criteria."
                  : "No assessments have been created in the system yet."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((item) => {
              const stats = item.stats || {};
              const isDraft = item.status === "draft";
              const isPublished = item.status === "published";
              const subjectName = item.class?.subject?.name || item.subject?.name || "General";
              const classTitle = item.class?.title || `${subjectName} Masterclass`;
              const tutorName = item.creator?.name || "Staff Tutor";
              const tutorEmail = item.creator?.email;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#09314F] rounded-2xl sm:rounded-[32px] p-4 sm:p-6 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 sm:space-y-6 group overflow-hidden max-w-full"
                >
                  {/* Top Meta */}
                  <div className="space-y-3 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-[#0F2843]/10 dark:bg-white/10 text-[#0F2843] dark:text-[#C5A97A] truncate max-w-[65%]">
                        {subjectName}
                      </span>

                      {/* Status Pill */}
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg shrink-0 ${
                          isPublished
                            ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                            : isDraft
                            ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800"
                            : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-black text-gray-900 dark:text-white group-hover:text-[#0F2843] dark:group-hover:text-[#C5A97A] transition truncate">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium truncate">
                        {classTitle}
                      </p>
                    </div>

                    {/* Tutor Creator Information */}
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-xs min-w-0 overflow-hidden">
                      <UserCircleIcon className="w-4 h-4 text-[#C5A97A] shrink-0" />
                      <div className="truncate min-w-0">
                        <span className="font-bold text-gray-800 dark:text-white">{tutorName}</span>
                        {tutorEmail && (
                          <span className="text-[10px] text-gray-400 ml-1 font-medium truncate">
                            ({tutorEmail})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Badges: Total Marks, Timer, Pass Mark */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] sm:text-[11px] font-bold text-gray-600 dark:text-gray-300">
                      <div className="px-2 py-0.5 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5 text-[#C5A97A] shrink-0" />
                        <span>{item.total_marks || 0} Marks</span>
                      </div>

                      {item.timer_minutes && (
                        <div className="px-2 py-0.5 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <span>{item.timer_minutes} Mins</span>
                        </div>
                      )}

                      <div className="px-2 py-0.5 rounded-lg sm:rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1">
                        <span>Pass: {item.pass_mark || 50}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Statistics Box */}
                  <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 space-y-1.5 text-xs min-w-0">
                    {isDraft ? (
                      <div className="flex items-start gap-1.5 text-amber-700 dark:text-amber-300 text-[11px] font-medium">
                        <ExclamationTriangleIcon className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Draft: Hidden from students until published.</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Submissions:</span>
                          <span className="font-bold text-[#0F2843] dark:text-white">
                            {stats.submitted_count || 0} / {stats.total_students || 0} Enrolled
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                          <span className="font-medium">Graded:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {stats.graded_count || 0} Completed
                          </span>
                        </div>
                        {stats.average_percentage !== null && stats.average_percentage !== undefined && (
                          <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                            <span className="font-medium">Avg Score:</span>
                            <span className="font-bold text-[#0F2843] dark:text-[#C5A97A]">
                              {Math.round(stats.average_percentage)}% (Pass: {Math.round(stats.pass_rate || 0)}%)
                            </span>
                          </div>
                        )}
                        {item.due_at && (
                          <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-200/50 dark:border-white/10 flex items-center gap-1 truncate">
                            <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Due: {new Date(item.due_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions Footer - Ultra-scalable & Responsive */}
                  <div className="pt-2 border-t border-gray-100 dark:border-white/10 grid grid-cols-1 min-[300px]:grid-cols-2 gap-2 w-full max-w-full">
                    <button
                      type="button"
                      onClick={() => handleOpenPreview(item)}
                      className="w-full px-2.5 py-2 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 text-xs font-bold transition flex items-center justify-center gap-1.5 min-w-0"
                      title="Inspect Questions"
                    >
                      <EyeIcon className="w-4 h-4 text-[#C5A97A] shrink-0" />
                      <span className="truncate">Preview</span>
                    </button>

                    {isDraft ? (
                      <div className="flex items-center gap-1.5 w-full min-w-0">
                        <button
                          type="button"
                          onClick={() => handleOpenPublish(item)}
                          className="flex-1 px-2.5 py-2 rounded-xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-md hover:opacity-95 transition flex items-center justify-center gap-1 min-w-0"
                          title="Publish for students"
                        >
                          <PaperAirplaneIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Publish</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssessment(item)}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition shrink-0"
                          title="Delete Draft"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenSubmissions(item)}
                        className="w-full px-2.5 py-2 rounded-xl bg-[#C5A97A] text-[#0F2843] dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-md hover:opacity-95 transition flex items-center justify-center gap-1.5 min-w-0"
                        title={`Submissions (${stats.submitted_count || 0})`}
                      >
                        <DocumentMagnifyingGlassIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">Submissions ({stats.submitted_count || 0})</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MODAL 1: QUESTIONS PREVIEW MODAL ───────────────────────── */}
        {previewModalOpen && previewAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="relative w-full max-w-3xl bg-white dark:bg-[#09314F] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-[#0F2843] text-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#C5A97A]">
                    <EyeIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">{previewAssessment.title}</h2>
                    <p className="text-xs text-gray-300 font-medium">
                      {previewAssessment.class?.subject?.name || "Subject"} • {previewAssessment.questions?.length || 0} Questions • {previewAssessment.total_marks || 0} Marks
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Questions Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                {previewLoading ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <div className="w-7 h-7 border-2 border-[#0F2843] dark:border-[#C5A97A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading questions payload...
                  </div>
                ) : !previewAssessment.questions || previewAssessment.questions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-gray-400">
                    No questions recorded for this assessment.
                  </div>
                ) : (
                  previewAssessment.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-[11px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                            {q.type === "mcq" ? "Multiple Choice" : q.type === "essay" ? "Written Essay" : q.type}
                          </span>
                        </div>
                        <span className="text-xs font-black text-[#0F2843] dark:text-[#C5A97A]">
                          {q.marks} {parseFloat(q.marks) === 1 ? "Mark" : "Marks"}
                        </span>
                      </div>

                      {/* Question Text with Math rendering */}
                      <div className="text-sm font-bold text-gray-900 dark:text-white leading-relaxed">
                        <MathRenderer text={q.question} />
                      </div>

                      {/* Options for MCQ */}
                      {q.type === "mcq" && q.options && (
                        <div className="space-y-2 pt-2">
                          {q.options.map((opt, oIdx) => (
                            <div
                              key={opt.id || oIdx}
                              className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                                opt.is_correct
                                  ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 font-bold text-emerald-800 dark:text-emerald-200"
                                  : "bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  opt.is_correct
                                    ? "bg-emerald-600 text-white"
                                    : "bg-gray-100 dark:bg-white/10 text-gray-500"
                                }`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <MathRenderer text={opt.option_text} />
                              </div>
                              {opt.is_correct && (
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase">
                                  <CheckIcon className="w-4 h-4 stroke-[3]" />
                                  <span>Correct Answer</span>
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Explanation if present */}
                      {q.explanation && (
                        <div className="p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 text-xs space-y-1">
                          <span className="font-black text-blue-700 dark:text-blue-300 uppercase text-[10px]">
                            Model Explanation:
                          </span>
                          <div className="text-gray-700 dark:text-gray-300 font-medium">
                            <MathRenderer text={q.explanation} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="px-6 py-2.5 rounded-2xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-bold shadow-md"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 2: SUBMISSIONS & ANSWERS DESK ─────────────────────── */}
        {submissionsModalOpen && currentAssessmentForSubs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="relative w-full max-w-4xl bg-white dark:bg-[#09314F] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto max-h-[92vh] flex flex-col">
              
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-[#0F2843] text-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#C5A97A]">
                    <DocumentMagnifyingGlassIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Student Submissions</h2>
                    <p className="text-xs text-gray-300 font-medium truncate max-w-md">
                      {currentAssessmentForSubs.title} ({submissionsList.length} Total Submissions)
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionsModalOpen(false);
                    setSelectedSubmissionDetail(null);
                  }}
                  className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Submissions Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                
                {/* If inspecting an individual submission */}
                {selectedSubmissionDetail ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
                      <div>
                        <span className="text-[10px] font-black text-gray-400 uppercase">Student</span>
                        <h4 className="text-sm font-black text-gray-900 dark:text-white">
                          {selectedSubmissionDetail.student?.first_name} {selectedSubmissionDetail.student?.last_name}
                        </h4>
                        <p className="text-xs text-gray-400 font-medium">
                          {selectedSubmissionDetail.student?.email}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Score Awarded</span>
                          <div className="text-base font-black text-[#0F2843] dark:text-[#C5A97A]">
                            {selectedSubmissionDetail.total_score || selectedSubmissionDetail.score || 0} / {currentAssessmentForSubs.total_marks || 0}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedSubmissionDetail(null)}
                          className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-white/10 text-gray-800 dark:text-white text-xs font-bold hover:bg-gray-300 transition"
                        >
                          Back to Submissions
                        </button>
                      </div>
                    </div>

                    {/* Answers Breakdown */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                        Detailed Answers & Scoring
                      </h4>

                      {(!selectedSubmissionDetail.answers || selectedSubmissionDetail.answers.length === 0) ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                          No specific answer records found for this submission.
                        </div>
                      ) : (
                        selectedSubmissionDetail.answers.map((ans, aIdx) => (
                          <div
                            key={ans.id || aIdx}
                            className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/10 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                Question #{aIdx + 1}:
                              </span>
                              <span className="text-xs font-black text-[#0F2843] dark:text-[#C5A97A]">
                                Awarded: {ans.marks_awarded !== null ? `${ans.marks_awarded} Marks` : "Pending Grading"}
                              </span>
                            </div>

                            {ans.question && (
                              <div className="text-xs font-bold text-gray-900 dark:text-white">
                                <MathRenderer text={ans.question.question} />
                              </div>
                            )}

                            {/* MCQ Choice */}
                            {ans.option && (
                              <div className="text-xs p-2.5 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-500">Student Choice:</span>
                                  <MathRenderer text={ans.option.option_text} />
                                </div>
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                  ans.option.is_correct ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {ans.option.is_correct ? "Correct" : "Incorrect"}
                                </span>
                              </div>
                            )}

                            {/* Essay Response */}
                            {ans.answer_text && (
                              <div className="text-xs p-2.5 rounded-xl bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 space-y-1">
                                <span className="font-bold text-gray-500 text-[10px] uppercase">Written Response:</span>
                                <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ans.answer_text}</p>
                              </div>
                            )}

                            {/* Tutor Feedback */}
                            {ans.feedback && (
                              <div className="text-xs p-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200">
                                <span className="font-black text-[10px] uppercase">Tutor Feedback: </span>
                                <span>{ans.feedback}</span>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {submissionsLoading ? (
                      <div className="py-12 text-center text-xs text-gray-400">
                        <div className="w-7 h-7 border-2 border-[#0F2843] dark:border-[#C5A97A] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading student submissions...
                      </div>
                    ) : submissionsList.length === 0 ? (
                      <div className="py-12 text-center space-y-2">
                        <BookOpenIcon className="w-10 h-10 text-gray-300 mx-auto" />
                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                          No Submissions Yet
                        </h4>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                          Students enrolled in this masterclass have not submitted answers for this assessment yet.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-gray-100 dark:border-white/10 text-gray-400 uppercase text-[10px] tracking-wider">
                              <th className="py-3 px-3">Student</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3">Score</th>
                              <th className="py-3 px-3">Date Submitted</th>
                              <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {submissionsList.map((sub) => {
                              const sName = `${sub.student?.first_name || ""} ${sub.student?.last_name || ""}`.trim() || "Student";
                              const isGraded = sub.status === "graded";
                              const score = sub.total_score || sub.score || 0;
                              const pct = currentAssessmentForSubs.total_marks > 0
                                ? Math.round((score / currentAssessmentForSubs.total_marks) * 100)
                                : 0;
                              const isPassed = pct >= (currentAssessmentForSubs.pass_mark || 50);

                              return (
                                <tr key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition">
                                  <td className="py-3 px-3 font-bold text-gray-900 dark:text-white">
                                    <div>{sName}</div>
                                    <div className="text-[10px] text-gray-400 font-normal">{sub.student?.email}</div>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span
                                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                                        isGraded
                                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                          : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                      }`}
                                    >
                                      {sub.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="font-bold text-[#0F2843] dark:text-white">
                                      {score} / {currentAssessmentForSubs.total_marks}
                                    </span>
                                    <span className={`ml-2 text-[10px] font-bold ${isPassed ? "text-emerald-600" : "text-red-500"}`}>
                                      ({pct}%)
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-gray-500 dark:text-gray-400">
                                    {sub.submitted_at || sub.created_at
                                      ? new Date(sub.submitted_at || sub.created_at).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })
                                      : "—"}
                                  </td>
                                  <td className="py-3 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleInspectSubmission(sub.id)}
                                      disabled={detailLoading}
                                      className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white text-xs font-bold transition inline-flex items-center gap-1"
                                    >
                                      <span>Inspect Answers</span>
                                      <ChevronRightIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setSubmissionsModalOpen(false);
                    setSelectedSubmissionDetail(null);
                  }}
                  className="px-6 py-2.5 rounded-2xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-bold shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL 3: ADMIN PUBLISH MODAL ───────────────────────────── */}
        {publishModalOpen && assessmentToPublish && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="relative w-full max-w-lg bg-white dark:bg-[#09314F] rounded-[32px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto flex flex-col">
              
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-white/10 bg-[#0F2843] text-white flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#C5A97A]">
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Publish Assessment</h2>
                    <p className="text-xs text-gray-300 font-medium truncate max-w-xs">
                      {assessmentToPublish.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPublishModalOpen(false)}
                  className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmPublish} className="p-6 space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                      Opening Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={publishOpensAt}
                      onChange={(e) => setPublishOpensAt(e.target.value)}
                      className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Students will be able to take the assessment starting from this time.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                      Deadline / Due Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={publishDueAt}
                      onChange={(e) => setPublishDueAt(e.target.value)}
                      required
                      className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white outline-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      Submissions will close automatically once this date passes.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setPublishModalOpen(false)}
                    disabled={publishLoading}
                    className="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishLoading}
                    className="px-6 py-2.5 rounded-2xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-lg hover:opacity-95 transition flex items-center gap-2"
                  >
                    {publishLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span>Publish to Students</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </StaffDashboardLayout>
  );
}
