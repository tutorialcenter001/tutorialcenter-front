import React, { useState, useEffect, useCallback, useMemo } from "react";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import TutorAssessmentModal from "../../../components/private/Tutor/TutorAssessmentModal.jsx";
import TutorPublishModal from "../../../components/private/Tutor/TutorPublishModal.jsx";
import TutorGradingModal from "../../../components/private/Tutor/TutorGradingModal.jsx";
import axios from "axios";
import {
  AcademicCapIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CalendarDaysIcon,
  PencilSquareIcon,
  TrashIcon,
  PaperAirplaneIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

export default function TutorAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'draft', 'published', 'closed'

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedAssessmentForEdit, setSelectedAssessmentForEdit] = useState(null);

  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [selectedAssessmentForPublish, setSelectedAssessmentForPublish] = useState(null);

  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [selectedAssessmentForGrading, setSelectedAssessmentForGrading] = useState(null);

  const [toast, setToast] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const token = localStorage.getItem("staff_token");

  // --- FETCH ASSESSMENTS ---
  const fetchAssessments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/tutor/assessments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });
      const data = res.data?.assessments || [];
      setAssessments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load tutor assessments:", err);
      showToast("Failed to load assessments. Please try refreshing.", "error");
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- DELETE DRAFT ---
  const handleDeleteDraft = async (assessment) => {
    const confirm = window.confirm(`Are you sure you want to delete the draft "${assessment.title}"?`);
    if (!confirm) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/tutor/assessments/${assessment.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json"
        }
      });
      showToast("Draft assessment deleted successfully.");
      fetchAssessments();
    } catch (err) {
      console.error("Delete draft error:", err);
      showToast(err.response?.data?.message || "Failed to delete draft.", "error");
    }
  };

  // --- FILTERED ASSESSMENTS ---
  const filteredAssessments = useMemo(() => {
    return assessments.filter((a) => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (a.title || "").toLowerCase().includes(q);
        const subjectMatch = (a.class?.subject?.name || a.class?.title || "").toLowerCase().includes(q);
        if (!titleMatch && !subjectMatch) return false;
      }
      return true;
    });
  }, [assessments, statusFilter, searchQuery]);

  // Aggregate Stats
  const totalAssessmentsCount = assessments.length;
  const publishedCount = assessments.filter((a) => a.status === "published").length;
  const draftCount = assessments.filter((a) => a.status === "draft").length;
  const pendingGradingTotal = assessments.reduce((sum, a) => {
    const stats = a.stats || {};
    const pending = (stats.submitted_count || 0) - (stats.graded_count || 0);
    return sum + (pending > 0 ? pending : 0);
  }, 0);

  return (
    <StaffDashboardLayout pagetitle="Assessments & Assignments Studio">
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

        {/* ── TOP HERO BANNER & ACTIONS ────────────────────────────────────────── */}
        <div className="relative bg-gradient-to-br from-[#0F2843] via-[#163a5f] to-[#0F2843] rounded-[32px] p-6 sm:p-8 text-white shadow-xl overflow-hidden border border-white/10">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-black text-[#C5A97A] uppercase tracking-wider">
                <AcademicCapIcon className="w-4 h-4" />
                <span>Tutor Assessment Studio</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
                Assessments & Assignments
              </h1>
              <p className="text-xs sm:text-sm text-gray-300 font-medium leading-relaxed">
                Create auto-graded Multiple Choice tests and written Essay questions for your masterclasses, schedule submission windows, and review student performance.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={fetchAssessments}
                className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/10 transition"
                title="Refresh Assessments"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAssessmentForEdit(null);
                  setCreateModalOpen(true);
                }}
                className="px-6 py-3.5 rounded-2xl bg-[#C5A97A] hover:bg-[#d6bc8f] text-[#0F2843] text-xs font-black shadow-lg shadow-[#C5A97A]/20 transition flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5 stroke-[2.5]" />
                <span>Create Assessment</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI METRIC CARDS ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              Total Created
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F2843] dark:text-white">
              {totalAssessmentsCount}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Across your assigned subjects</p>
          </div>

          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Published & Active
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {publishedCount}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Open for student submissions</p>
          </div>

          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>Pending Grading</span>
              {pendingGradingTotal > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {pendingGradingTotal}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Submissions needing review</p>
          </div>

          <div className="bg-white dark:bg-[#09314F] rounded-3xl p-5 border border-gray-100 dark:border-white/10 shadow-sm space-y-1">
            <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">
              Drafts in Progress
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#0F2843] dark:text-[#C5A97A]">
              {draftCount}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Unpublished question sets</p>
          </div>
        </div>

        {/* ── FILTER & SEARCH CONTROLS ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#09314F] rounded-[28px] p-4 sm:p-5 border border-gray-100 dark:border-white/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto custom-scrollbar">
            {[
              { id: "all", label: "All Assessments" },
              { id: "published", label: "Published" },
              { id: "draft", label: "Drafts" },
              { id: "closed", label: "Closed / Past Due" }
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

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search assessment or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition"
            />
          </div>
        </div>

        {/* ── ASSESSMENTS GRID ─────────────────────────────────────────────────── */}
        {loading ? (
          <div className="p-16 text-center text-xs text-gray-400 bg-white dark:bg-[#09314F] rounded-3xl border border-gray-100 dark:border-white/10">
            <div className="w-8 h-8 border-2 border-[#0F2843] dark:border-[#C5A97A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading assessment library...
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
                {searchQuery
                  ? "No assessments match your search query."
                  : "You haven't created any assessments for your masterclasses yet."}
              </p>
            </div>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSelectedAssessmentForEdit(null);
                  setCreateModalOpen(true);
                }}
                className="px-6 py-2.5 rounded-2xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-lg transition inline-flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create First Assessment</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map((item) => {
              const stats = item.stats || {};
              const isDraft = item.status === "draft";
              const isPublished = item.status === "published";
              const subjectName = item.class?.subject?.name || "General Subject";
              const classTitle = item.class?.title || `${subjectName} Masterclass`;

              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-[#09314F] rounded-[32px] p-6 border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6 group"
                >
                  {/* Top Meta */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-[#0F2843]/10 dark:bg-white/10 text-[#0F2843] dark:text-[#C5A97A]">
                        {subjectName}
                      </span>

                      {/* Status Pill */}
                      <span
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
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

                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-white group-hover:text-[#0F2843] dark:group-hover:text-[#C5A97A] transition line-clamp-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium line-clamp-1">
                        {classTitle}
                      </p>
                    </div>

                    {/* Quick Badges: Marks, Timer, Pass Mark */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-gray-600 dark:text-gray-300">
                      <div className="px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1">
                        <SparklesIcon className="w-3.5 h-3.5 text-[#C5A97A]" />
                        <span>{item.total_marks || 0} Marks</span>
                      </div>

                      {item.timer_minutes && (
                        <div className="px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5 text-blue-500" />
                          <span>{item.timer_minutes} Mins</span>
                        </div>
                      )}

                      <div className="px-2.5 py-1 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1">
                        <span>Pass: {item.pass_mark || 50}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Date Windows or Stats Preview */}
                  <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 space-y-2 text-xs">
                    {isDraft ? (
                      <div className="text-gray-500 dark:text-gray-400 text-[11px] font-medium italic">
                        Draft is not yet published to students. Click "Publish Assessment" to open submissions.
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
                              {Math.round(stats.average_percentage)}% (Pass Rate: {Math.round(stats.pass_rate || 0)}%)
                            </span>
                          </div>
                        )}
                        {item.due_at && (
                          <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-200/50 dark:border-white/10 flex items-center gap-1">
                            <CalendarDaysIcon className="w-3.5 h-3.5" />
                            <span>Due: {new Date(item.due_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
                    {isDraft ? (
                      <>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAssessmentForEdit(item);
                              setCreateModalOpen(true);
                            }}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-[#0F2843] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition"
                            title="Edit Draft Questions"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDraft(item)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                            title="Delete Draft"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssessmentForPublish(item);
                            setPublishModalOpen(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-md hover:opacity-95 transition flex items-center gap-1.5"
                        >
                          <PaperAirplaneIcon className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAssessmentForGrading(item);
                            setGradingModalOpen(true);
                          }}
                          className="w-full px-4 py-2.5 rounded-2xl bg-[#0F2843] text-white dark:bg-[#C5A97A] dark:text-[#0F2843] text-xs font-black shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
                        >
                          <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                          <span>Submissions & Grading Desk</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── MODALS ───────────────────────────────────────────────────────────── */}
        
        {/* Create / Edit Modal */}
        <TutorAssessmentModal
          isOpen={createModalOpen}
          onClose={() => {
            setCreateModalOpen(false);
            setSelectedAssessmentForEdit(null);
          }}
          assessment={selectedAssessmentForEdit}
          onSuccess={(saved, published) => {
            showToast(
              published
                ? "Assessment published to students successfully!"
                : selectedAssessmentForEdit
                ? "Assessment draft updated!"
                : "New assessment draft created!"
            );
            fetchAssessments();
          }}
        />

        {/* Publish Modal */}
        <TutorPublishModal
          isOpen={publishModalOpen}
          onClose={() => {
            setPublishModalOpen(false);
            setSelectedAssessmentForPublish(null);
          }}
          assessment={selectedAssessmentForPublish}
          onSuccess={(published) => {
            showToast("Assessment published and students notified!");
            fetchAssessments();
          }}
        />

        {/* Grading Desk Modal */}
        <TutorGradingModal
          isOpen={gradingModalOpen}
          onClose={() => {
            setGradingModalOpen(false);
            setSelectedAssessmentForGrading(null);
          }}
          assessment={selectedAssessmentForGrading}
          onGraded={() => {
            fetchAssessments();
          }}
        />

      </div>
    </StaffDashboardLayout>
  );
}
