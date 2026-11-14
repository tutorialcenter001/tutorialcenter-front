import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import TutorPostClassReportModal from "../../../components/private/Tutor/TutorPostClassReportModal";
import axios from "axios";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import { isAdminStaff, canSeeCancelledClasses } from "../../../utils/roleUtils";
import { 
  MagnifyingGlassIcon,
  CalendarIcon,
  LinkIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  ClockIcon,
  AcademicCapIcon
} from "@heroicons/react/24/outline";
import { Icon } from "@iconify/react";
import ClassSessionStatusBadge, {
  isSessionCancelled,
  isSessionProposed,
} from "../../../components/common/ClassSessionStatusBadge";

export default function TutorMasterClass() {
  const [scheduleData, setScheduleData] = useState({
    next_class: null,
    today_classes: [],
    week_schedule: {},
    upcoming_sessions: [],
    sessions: [],
    classes: []
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("classes"); // "classes" | "timeline"
  const [timelineFilter, setTimelineFilter] = useState("all"); // "all" | "today" | "week" | "upcoming" | "past"
  const [toast, setToast] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSession, setFeedbackSession] = useState(null);

  const [unreportedSessions, setUnreportedSessions] = useState(() => {
    try {
      if (isAdminStaff()) return [];
      const todayStr = new Date().toISOString().split("T")[0];
      const list = JSON.parse(localStorage.getItem("tutor_unreported_sessions") || "[]");
      return list.filter(s => {
        const sDate = s.session_date ? String(s.session_date).slice(0, 10) : todayStr;
        return sDate <= todayStr;
      }).slice(0, 4);
    } catch (e) {
      return [];
    }
  });

  const refreshUnreported = useCallback(() => {
    try {
      if (isAdminStaff()) {
        setUnreportedSessions([]);
        return;
      }
      const todayStr = new Date().toISOString().split("T")[0];
      const raw = JSON.parse(localStorage.getItem("tutor_unreported_sessions") || "[]");
      const valid = raw.filter(s => {
        const sDate = s.session_date ? String(s.session_date).slice(0, 10) : todayStr;
        return sDate <= todayStr;
      });
      if (valid.length !== raw.length) {
        localStorage.setItem("tutor_unreported_sessions", JSON.stringify(valid));
      }
      setUnreportedSessions(valid.slice(0, 4));
    } catch (e) {
      setUnreportedSessions([]);
    }
  }, []);

  useEffect(() => {
    refreshUnreported();
    window.addEventListener("tutor-unreported-updated", refreshUnreported);
    window.addEventListener("storage", refreshUnreported);
    return () => {
      window.removeEventListener("tutor-unreported-updated", refreshUnreported);
      window.removeEventListener("storage", refreshUnreported);
    };
  }, [refreshUnreported]);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const staffName = localStorage.getItem("staff_name") || "Tutor";
  const token = localStorage.getItem("staff_token");

  // --- FETCHING LOGIC ---
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tutor/classes/schedule`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });
      
      const data = response.data || {};
      
      setScheduleData({
        next_class: data.next_class || null,
        today_classes: Array.isArray(data.today_classes) ? data.today_classes : [],
        week_schedule: data.week_schedule || {},
        upcoming_sessions: Array.isArray(data.upcoming_sessions) ? data.upcoming_sessions : [],
        sessions: Array.isArray(data.sessions) ? data.sessions : (Array.isArray(data.upcoming_sessions) ? data.upcoming_sessions : []),
        classes: Array.isArray(data.classes) ? data.classes : []
      });

    } catch (error) {
      console.error("Fetch error:", error);
      setToast({ type: "error", message: "Failed to load master class schedule." });
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Check for feedback query parameter or state/storage from leaving a masterclass
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const feedbackSessionId =
      searchParams.get("feedback_session") ||
      location.state?.completedSessionId ||
      sessionStorage.getItem("just_completed_class_session_id");

    if (feedbackSessionId) {
      sessionStorage.removeItem("just_completed_class_session_id");

      const staffRole = localStorage.getItem("staff_role") || "";
      if (isAdminStaff(staffRole)) {
        return;
      }

      const allSessions = [
        ...(scheduleData.today_classes || []),
        ...Object.values(scheduleData.week_schedule || {}).flat(),
        ...(scheduleData.upcoming_sessions || []),
        ...(scheduleData.sessions || []),
        ...(scheduleData.next_class ? [scheduleData.next_class] : [])
      ];

      const session = allSessions.find(s => String(s.id) === String(feedbackSessionId));
      if (session) {
        setFeedbackSession({
          id: session.id,
          class_id: session.class_id || session.id,
          class_title: session.class?.title || session.class?.subject?.name || session.title || "Masterclass",
          subject: (typeof session.class?.subject === "object" ? session.class?.subject?.name : session.class?.subject) || "General Subject",
          topic: session.class?.title || session.title || "Lesson Session",
          date: session.session_date ? new Date(session.session_date).toLocaleDateString() : new Date().toLocaleDateString(),
          time: `${session.starts_at || 'TBD'} - ${session.ends_at || 'TBD'}`,
          tutor_name: staffName,
          present_count: session.attendances?.length ?? 0,
          total_students: 20,
        });
      } else {
        setFeedbackSession({
          id: feedbackSessionId,
          class_id: feedbackSessionId,
          class_title: "Master Class",
          subject: "Live Masterclass",
          topic: "Class Lesson",
          date: new Date().toLocaleDateString(),
          time: "Just Concluded",
          tutor_name: staffName,
          present_count: 0,
          total_students: 20,
        });
      }

      setFeedbackModalOpen(true);
      
      if (location.search || location.state?.promptPostClassReport) {
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [location.search, location.state, scheduleData, navigate, location.pathname, staffName]);

  // --- HELPERS ---
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDayName = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short" });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? "pm" : "am";
    const h12 = hour % 12 || 12;
    return `${h12}:${m}${ampm}`;
  };

  const getInitials = (title) => {
    if (!title) return "MC";
    return title.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  };

  const isPast = (session) => {
    if (!session || !session.session_date) return false;
    const now = new Date();
    const sDate = new Date(session.session_date);
    const sessionDay = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (sessionDay < today) return true;
    if (sessionDay > today) return false;

    const timeStr = session.ends_at || session.starts_at;
    if (timeStr) {
      const parts = timeStr.split(":");
      const sessionEnd = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), parseInt(parts[0], 10), parseInt(parts[1], 10));
      if (sessionEnd < now) return true;
    }
    return false;
  };

  const isTodaySession = useCallback((session) => {
    if (!session || !session.session_date) return false;
    const now = new Date();
    const parts = String(session.session_date).split("T")[0].split("-");
    if (parts.length < 3) return false;
    const sYear = parseInt(parts[0], 10);
    const sMonth = parseInt(parts[1], 10) - 1;
    const sDay = parseInt(parts[2], 10);
    return sYear === now.getFullYear() && sMonth === now.getMonth() && sDay === now.getDate();
  }, []);

  const getSessionCategoryRank = useCallback((s) => {
    if (isSessionCancelled(s)) return 4;
    if (isTodaySession(s) && !isPast(s)) return 1; // Due Today (Highest priority)
    if (!isPast(s)) return 2; // Upcoming to come
    return 3; // Passed
  }, [isTodaySession]);

  const getClassRank = useCallback((cls) => {
    const sList = Array.isArray(cls.sessions) ? cls.sessions : [];
    if (!sList.length) return 2;
    if (sList.some(s => isTodaySession(s) && !isPast(s))) return 1; // Has due today
    if (sList.some(s => !isPast(s))) return 2; // Has upcoming
    return 3; // All passed
  }, [isTodaySession]);

  // --- FILTERED DATA (Prioritizing Due Today -> Upcoming -> Passed) ---
  const filteredClasses = useMemo(() => {
    let list = scheduleData.classes || [];
    if (!canSeeCancelledClasses()) {
      list = list.filter(c => !isSessionCancelled(c));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.title?.toLowerCase().includes(q) ||
        c.subject?.name?.toLowerCase().includes(q) ||
        (Array.isArray(c.subject?.courses) && c.subject.courses.some(cr => cr.title?.toLowerCase().includes(q)))
      );
    }
    return [...list].sort((a, b) => {
      const rankA = getClassRank(a);
      const rankB = getClassRank(b);
      if (rankA !== rankB) return rankA - rankB;

      const dateA = new Date(a.created_at || a.start_date || 0).getTime();
      const dateB = new Date(b.created_at || b.start_date || 0).getTime();
      return dateB - dateA;
    });
  }, [scheduleData.classes, searchQuery, getClassRank]);

  const flattenedSessions = useMemo(() => {
    const map = new Map();
    const canSeeCancelled = canSeeCancelledClasses();
    const add = (s) => {
      if (!s || !s.id) return;
      if (!canSeeCancelled && isSessionCancelled(s)) return;
      if (!map.has(s.id)) map.set(s.id, s);
    };

    if (scheduleData.next_class) add(scheduleData.next_class);
    (scheduleData.today_classes || []).forEach(add);
    Object.values(scheduleData.week_schedule || {}).flat().forEach(add);
    (scheduleData.upcoming_sessions || []).forEach(add);
    (scheduleData.sessions || []).forEach(add);

    return Array.from(map.values()).sort((a, b) => {
      const rankA = getSessionCategoryRank(a);
      const rankB = getSessionCategoryRank(b);
      if (rankA !== rankB) return rankA - rankB;

      const dateA = new Date(`${a.session_date}T${a.starts_at || '00:00'}`);
      const dateB = new Date(`${b.session_date}T${b.starts_at || '00:00'}`);

      // If both are Due or Upcoming, chronological nearest first (dateA - dateB)
      if (rankA === 1 || rankA === 2) {
        return dateA - dateB;
      }
      // If both are Passed, most recently passed first (dateB - dateA)
      return dateB - dateA;
    });
  }, [scheduleData, getSessionCategoryRank]);

  const filteredSessions = useMemo(() => {
    let list = flattenedSessions;

    // Timeline tab filters
    if (timelineFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      list = list.filter(s => s.session_date?.startsWith(todayStr));
    } else if (timelineFilter === "week") {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      list = list.filter(s => {
        const d = new Date(s.session_date);
        return d >= startOfWeek && d <= endOfWeek;
      });
    } else if (timelineFilter === "upcoming") {
      list = list.filter(s => !isPast(s));
    } else if (timelineFilter === "past") {
      list = list.filter(s => isPast(s));
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => 
        s.class?.title?.toLowerCase().includes(q) ||
        s.class?.subject?.name?.toLowerCase().includes(q) ||
        s.session_date?.includes(q)
      );
    }

    return list;
  }, [flattenedSessions, timelineFilter, searchQuery]);

  // --- ACTIONS ---
  const getClassSessionId = (cls) => {
    if (!cls) return null;
    if (cls.next_session?.id) return cls.next_session.id;
    if (cls.session?.id) return cls.session.id;

    const match = flattenedSessions.find(s => String(s.class_id || s.class?.id) === String(cls.id));
    if (match?.id) return match.id;

    const sessions = cls.sessions || [];
    if (!sessions.length) return null;
    const now = new Date().getTime();
    const toTime = (s) => new Date(`${(s.session_date || '').split('T')[0]}T${s.starts_at || '00:00:00'}`).getTime();
    const upcoming = sessions
      .map(s => ({ s, diff: toTime(s) - now }))
      .filter(item => item.diff >= -3600000)
      .sort((a, b) => a.diff - b.diff);
    if (upcoming.length) return upcoming[0].s.id;
    const latest = [...sessions].sort((a, b) => toTime(b) - toTime(a))[0];
    return latest?.id ?? null;
  };

  const handleLaunchClassRoom = (cls) => {
    const sessionId = getClassSessionId(cls);
    if (sessionId) {
      navigate(`/classroom/${sessionId}`);
      return;
    }
    if (scheduleData?.next_class && String(scheduleData.next_class.class_id || scheduleData.next_class.class?.id) === String(cls.id)) {
      navigate(`/classroom/${scheduleData.next_class.id}`);
      return;
    }
    setToast({ type: "error", message: "No active session is currently scheduled for this class." });
  };

  const handleOpenLaunchModal = (session) => {
    setSelectedSession(session);
  };

  const handleLaunchWebClass = (session) => {
    if (!session?.id) return;
    navigate(`/classroom/${session.id}`);
  };

  const handleOpenReportModal = (session) => {
    setFeedbackSession({
      id: session.id,
      class_id: session.class_id || session.class?.id,
      class_title: session.class?.title || session.class?.subject?.name || "Masterclass",
      subject: session.class?.subject?.name || "General Subject",
      topic: session.class?.title || "Class Session",
      date: session.session_date ? new Date(session.session_date).toLocaleDateString() : new Date().toLocaleDateString(),
      time: `${session.starts_at || 'TBD'} - ${session.ends_at || 'TBD'}`,
      tutor_name: staffName,
      present_count: session.attendances?.length ?? 0,
      total_students: 20,
    });
    setFeedbackModalOpen(true);
    setSelectedSession(null);
  };

  return (
    <>
      <StaffDashboardLayout pagetitle="Master Class">
        {toast && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 z-[100] px-6 py-3.5 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 transition-all ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600 animate-bounce"}`}>
            <Icon icon={toast.type === "success" ? "lucide:check-circle" : "lucide:alert-circle"} className="w-5 h-5" />
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-3 hover:opacity-75 font-black text-lg">×</button>
          </div>
        )}

        <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-6 min-h-screen">
          
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 1. SUBTLE TOP BAR                                                  */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F2843] dark:text-white tracking-tight">
                  Master Class
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider">
                  Tutor
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1 font-medium">
                Your assigned masterclasses, weekly schedules, and upcoming live sessions.
              </p>
            </div>

            <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
              <button
                onClick={fetchSessions}
                disabled={loading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 font-bold text-xs transition-all disabled:opacity-50 shadow-sm"
                title="Refresh Schedule"
              >
                <ArrowPathIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C5A97A]' : 'text-slate-400'}`} />
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
              </button>

              <button
                onClick={() => navigate('/staffs/tutor/calendar')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 font-bold text-xs transition-all shadow-sm"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-[#C5A97A]" />
                <span>Calendar</span>
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* URGENT: PENDING POST-CLASS REPORTS QUEUE                           */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {unreportedSessions.length > 0 && (
            <div className="bg-blue-500/10 dark:bg-blue-950/30 border border-blue-500/30 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#09314F] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Icon icon="lucide:clipboard-list" className="w-5 h-5 text-[#C5A97A]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-[#09314F] dark:text-blue-200">
                      Post-Class Tutor Feedback Reports Pending ({unreportedSessions.length})
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      You left a class session without submitting a report. Please submit it now to finalize class records.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {unreportedSessions.map((s) => (
                  <div key={s.id} className="bg-white dark:bg-[#09314F] border border-blue-100 dark:border-white/10 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-sm">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#09314F] dark:text-white truncate">
                        {s.class_title || s.class?.title || "Masterclass"}
                      </p>
                      <p className="text-[11px] text-slate-400 font-semibold truncate">
                        {s.subject || "General"} • {s.starts_at || "Concluded"}
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenReportModal(s)}
                      className="px-3.5 py-1.5 bg-[#09314F] hover:bg-[#E83831] text-white text-[11px] font-black rounded-lg transition-colors tracking-wider uppercase flex-shrink-0"
                    >
                      Submit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 2. SUBTLE NEXT UP SPOTLIGHT CARD                                   */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {scheduleData.next_class && (
            <div className="relative rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent border border-amber-500/25 dark:border-amber-500/30 shadow-sm overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black tracking-widest uppercase">
                      Next Up on Your Agenda
                    </span>
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">
                      {formatDayName(scheduleData.next_class.session_date)}, {formatDate(scheduleData.next_class.session_date)}
                    </span>
                  </div>

                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-[#0F2843] dark:text-white">
                      {scheduleData.next_class.class?.title || "Live Masterclass Session"}
                    </h2>
                    <p className="text-xs font-semibold text-[#C5A97A] mt-0.5">
                      Subject: {scheduleData.next_class.class?.subject?.name || "General"} • {formatTime(scheduleData.next_class.starts_at)} - {formatTime(scheduleData.next_class.ends_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs pt-0.5">
                    {scheduleData.next_class.class_link ? (
                      <span className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/60 text-[11px]">
                        <Icon icon="lucide:video" className="w-3.5 h-3.5" />
                        Meeting Room Configured
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400 italic">
                        No meeting link assigned yet
                      </span>
                    )}
                  </div>
                </div>

                {/* Direct Action Launcher */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                  <button
                    onClick={() => handleOpenLaunchModal(scheduleData.next_class)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-[#09314F] hover:bg-[#0e446d] active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Icon icon="lucide:play-circle" className="w-4 h-4 text-[#C5A97A]" />
                    <span>Launch Session</span>
                  </button>

                  <button
                    onClick={() => handleOpenReportModal(scheduleData.next_class)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Icon icon="lucide:clipboard-check" className="w-4 h-4" />
                    <span>Submit Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 3. VIEW CONTROLS & SEARCH BAR                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
            
            {/* Dual Tabs: My Classes vs Sessions Timeline */}
            <div className="flex items-center p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto self-start">
              <button
                onClick={() => setActiveTab("classes")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === "classes" ? "bg-white dark:bg-gray-700 text-[#09314F] dark:text-white shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"}`}
              >
                <AcademicCapIcon className="w-4 h-4" />
                <span>My Masterclasses ({scheduleData.classes?.length || 0})</span>
              </button>
              <button
                onClick={() => setActiveTab("timeline")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all ${activeTab === "timeline" ? "bg-white dark:bg-gray-700 text-[#09314F] dark:text-white shadow-sm" : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"}`}
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Sessions Timeline ({flattenedSessions.length})</span>
              </button>
            </div>

            {/* Instant Search Filter */}
            <div className="relative w-full md:w-80">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={activeTab === "classes" ? "Search classes or subjects..." : "Search by class, subject, date..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#09314F] dark:focus:ring-[#C5A97A] shadow-sm transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-black"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 4. TAB 1: MY MASTERCLASSES (CARD GRID)                              */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "classes" && (
            <div className="space-y-6">
              {loading ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09314F] dark:border-[#C5A97A] mx-auto" />
                  <p className="mt-3 text-slate-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                    Loading your assigned classes...
                  </p>
                </div>
              ) : filteredClasses.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6">
                  <AcademicCapIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <h3 className="text-sm font-black text-gray-700 dark:text-gray-200">
                    {searchQuery ? "No matching classes found" : "No Masterclasses Assigned Yet"}
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                    {searchQuery ? "Try clearing your search filter to see all your assigned cohorts." : "You do not have any active masterclasses assigned to your tutor account."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredClasses.map((cls) => {
                    const courseTitles = Array.isArray(cls.subject?.courses) ? cls.subject.courses.map(c => c.title).join(", ") : null;
                    const schedulesList = Array.isArray(cls.schedules) ? cls.schedules : [];
                    const statusStr = String(cls.status || "active").toLowerCase().trim();
                    const isClassCancelled = statusStr === "cancelled" || statusStr === "canceled";
                    const isClassProposed = statusStr === "proposed" || statusStr === "rescheduled";
                    const clsCategory = getClassRank(cls);
                    const isClsDueToday = clsCategory === 1;
                    const isClsUpcoming = clsCategory === 2;
                    const isClsPassed = clsCategory === 3;
                    
                    return (
                      <div
                        key={cls.id}
                        className={`group bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-[#C5A97A]/40 transition-all flex flex-col justify-between ${
                          isClsPassed ? "opacity-65 hover:opacity-100" : "opacity-100"
                        }`}
                      >
                        <div className="space-y-3">
                          {/* Card Header Badge */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-lg bg-[#09314F]/10 dark:bg-white/10 text-[#09314F] dark:text-[#C5A97A] text-[10px] font-black uppercase tracking-wider">
                                {cls.subject?.name || "Subject Cohort"}
                              </span>
                              {isClsDueToday && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  Due Today
                                </span>
                              )}
                              {isClsUpcoming && !isClassCancelled && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                                  Upcoming
                                </span>
                              )}
                              {isClsPassed && !isClassCancelled && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                  Passed
                                </span>
                              )}
                              {isClassCancelled && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                                  Cancelled
                                </span>
                              )}
                              {isClassProposed && (
                                <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                                  Proposed
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Title */}
                          <div>
                            <h3 className={`text-base font-black text-[#0F2843] dark:text-white group-hover:text-[#09314F] dark:group-hover:text-[#C5A97A] transition-colors line-clamp-1 ${
                              isClassCancelled ? "line-through text-rose-700 dark:text-rose-400" : ""
                            }`}>
                              {cls.title}
                            </h3>
                            {courseTitles && (
                              <p className="text-[11px] font-semibold text-slate-400 dark:text-gray-400 truncate mt-0.5">
                                Program: {courseTitles}
                              </p>
                            )}
                          </div>

                          {/* Timetable / Recurring Schedules */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest block">
                              Weekly Schedule
                            </span>
                            {schedulesList.length === 0 ? (
                              <span className="text-xs text-gray-400 italic">Schedule to be announced</span>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {schedulesList.map((sched, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-600 text-[11px] font-bold text-slate-700 dark:text-gray-300"
                                  >
                                    <ClockIcon className="w-3 h-3 text-[#C5A97A]" />
                                    <span>{sched.day_of_week}: {formatTime(sched.start_time)} - {formatTime(sched.end_time)}</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Co-Staff / Tutors Assigned */}
                          {Array.isArray(cls.staffs) && cls.staffs.length > 1 && (
                            <div className="pt-1 flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Co-Tutors:</span>
                              <div className="flex -space-x-1.5 overflow-hidden">
                                {cls.staffs.map((st) => (
                                  <div
                                    key={st.id}
                                    title={`${st.firstname} ${st.surname} (${st.pivot?.role || 'tutor'})`}
                                    className="w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-700 border border-white dark:border-gray-800 flex items-center justify-center text-[8px] font-black text-slate-600 dark:text-gray-300"
                                  >
                                    {st.firstname?.[0]}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex items-center gap-2.5">
                          <button
                            onClick={() => {
                              setActiveTab("timeline");
                              setSearchQuery(cls.title);
                            }}
                            className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/60 dark:hover:bg-gray-700 active:scale-95 text-[#09314F] dark:text-white font-black text-xs rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
                          >
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>View Sessions</span>
                          </button>

                          {(cls.zoom_start_url || cls.zoom_join_url || getClassSessionId(cls)) ? (
                            <button
                              type="button"
                              onClick={() => handleLaunchClassRoom(cls)}
                              className="px-4 py-2 bg-[#09314F] hover:bg-[#0e446d] active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                              title="Join In-App Classroom"
                            >
                              <VideoCameraIcon className="w-3.5 h-3.5 text-[#C5A97A]" />
                              <span>Room</span>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* 5. TAB 2: TIMELINE & SESSIONS                                      */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
              {/* Timeline Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: "All Sessions" },
                  { id: "today", label: "Today" },
                  { id: "week", label: "This Week" },
                  { id: "upcoming", label: "Upcoming" },
                  { id: "past", label: "Past / Completed" }
                ].map((flt) => {
                  const isActive = timelineFilter === flt.id;
                  return (
                    <button
                      key={flt.id}
                      onClick={() => setTimelineFilter(flt.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${isActive ? "bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] shadow-sm" : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700"}`}
                    >
                      {flt.label}
                    </button>
                  );
                })}
              </div>

              {/* Sessions Table / List */}
              {loading ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-700/60">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09314F] dark:border-[#C5A97A] mx-auto" />
                  <p className="mt-3 text-slate-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                    Loading sessions timeline...
                  </p>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-6">
                  <CalendarIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <h3 className="text-sm font-black text-gray-700 dark:text-gray-200">
                    No sessions match this filter
                  </h3>
                  <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                    Try choosing a different timeline pill or clearing your search keywords.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/80">
                  {filteredSessions.map((session) => {
                    const sessionIsPast = isPast(session);
                    const isDueToday = isTodaySession(session) && !sessionIsPast;
                    const isUpcoming = !sessionIsPast && !isDueToday;
                    const isNext = scheduleData.next_class && String(scheduleData.next_class.id) === String(session.id);
                    const cancelled = isSessionCancelled(session);
                    
                    return (
                      <div
                        key={session.id}
                        className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:bg-gray-50/70 dark:hover:bg-gray-700/40 ${
                          isNext ? "bg-amber-500/5 dark:bg-amber-500/10 border-l-4 border-l-amber-500" : ""
                        } ${sessionIsPast ? "opacity-60 hover:opacity-100 bg-gray-50/30 dark:bg-gray-900/30" : "opacity-100"} ${cancelled ? "opacity-75" : ""}`}
                      >
                        {/* Left Side: Avatar + Details */}
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                            cancelled ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" : isNext ? "bg-amber-500 text-white shadow-amber-500/20" : isDueToday ? "bg-emerald-500 text-white shadow-emerald-500/20" : sessionIsPast ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500" : "bg-[#09314F] text-white"
                          }`}>
                            {getInitials(session.class?.title || session.title)}
                          </div>

                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {isNext && (
                                <span className="px-2 py-0.5 rounded bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest">
                                  Next Up
                                </span>
                              )}
                              {isDueToday && !isNext && (
                                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                  Due Today
                                </span>
                              )}
                              {isUpcoming && !isNext && (
                                <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-400/30 text-[9px] font-black uppercase tracking-wider">
                                  Upcoming
                                </span>
                              )}
                              {sessionIsPast && (
                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-wider">
                                  Passed
                                </span>
                              )}
                              <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider">
                                {session.class?.subject?.name || "Subject"}
                              </span>
                              <ClassSessionStatusBadge session={session} size="xs" showScheduled={false} />
                              <span className="text-[11px] font-bold text-slate-400">
                                {formatDayName(session.session_date)}, {formatDate(session.session_date)}
                              </span>
                            </div>

                            <h4 className={`text-sm font-black text-[#0F2843] dark:text-white truncate ${cancelled ? "line-through text-rose-700 dark:text-rose-400" : ""}`}>
                              {session.class?.title || session.title || "Class Session"}
                            </h4>

                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
                              <span className="flex items-center gap-1 font-bold">
                                <ClockIcon className="w-3 h-3 text-[#C5A97A]" />
                                {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Meeting Link / Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-1 md:pt-0">
                          <button
                            onClick={() => handleOpenLaunchModal(session)}
                            className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-[#09314F] dark:text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5"
                          >
                            <Icon icon="lucide:info" className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>

                          {cancelled ? (
                            <span className="px-3.5 py-2 rounded-xl bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                              <Icon icon="lucide:ban" className="w-3.5 h-3.5 text-rose-500" />
                              <span>Cancelled</span>
                            </span>
                          ) : session.id ? (
                            <button
                              type="button"
                              onClick={() => handleLaunchWebClass(session)}
                              className="px-3.5 py-2 rounded-xl bg-[#09314F] hover:bg-[#0e446d] active:scale-95 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm"
                              title="Join In-App Classroom"
                            >
                              <VideoCameraIcon className="w-3.5 h-3.5 text-[#C5A97A]" />
                              <span>Room</span>
                            </button>
                          ) : null}

                          {session.recording_link && (
                            <a
                              href={session.recording_link}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs transition-all flex items-center gap-1.5 border border-purple-200 dark:border-purple-800"
                              title="Recording Uploaded"
                            >
                              <VideoCameraIcon className="w-3.5 h-3.5 text-purple-600" />
                              <span>Recording</span>
                            </a>
                          )}

                          <button
                            onClick={() => handleOpenReportModal(session)}
                            className="px-3.5 py-2 rounded-xl bg-[#C5A97A] hover:bg-[#b09262] text-[#09314F] font-black text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                            title="Submit Post-Class Tutor Report"
                          >
                            <Icon icon="lucide:clipboard-check" className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 6. CLASS SESSION DETAILS / DIRECT LAUNCH MODAL                     */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {selectedSession && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" 
              onClick={() => setSelectedSession(null)} 
            />
            
            <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 sm:p-7 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-5">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3.5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A97A]">Session Overview</span>
                  <h2 className="text-xl font-black text-[#0F2843] dark:text-white">Class Details</h2>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-bold text-gray-500 dark:text-gray-300 text-xs transition-all"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3.5">
                <div className="bg-slate-50 dark:bg-gray-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-gray-700/60 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Class & Subject</span>
                    <ClassSessionStatusBadge session={selectedSession} size="xs" showScheduled={true} />
                  </div>
                  <h3 className={`text-sm font-black text-[#0F2843] dark:text-white ${isSessionCancelled(selectedSession) ? "line-through text-rose-700 dark:text-rose-400" : ""}`}>
                    {selectedSession.class?.title || selectedSession.title}
                  </h3>
                  <p className="text-xs font-bold text-[#C5A97A]">
                    Subject: {selectedSession.class?.subject?.name || "General Subject"}
                  </p>
                </div>

                {/* Status Alert Banners */}
                {isSessionCancelled(selectedSession) && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                    <Icon icon="lucide:ban" className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>This class session was cancelled by administration. Classroom entry is closed.</span>
                  </div>
                )}
                {isSessionProposed(selectedSession) && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Icon icon="lucide:clock" className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>This session is proposed and pending administrative confirmation.</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Session Date</span>
                    <span className="font-bold text-slate-700 dark:text-gray-200 mt-0.5 block">
                      {formatDayName(selectedSession.session_date)}, {formatDate(selectedSession.session_date)}
                    </span>
                  </div>

                  <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block">Time Range</span>
                    <span className="font-bold text-slate-700 dark:text-gray-200 mt-0.5 block">
                      {formatTime(selectedSession.starts_at)} - {formatTime(selectedSession.ends_at)}
                    </span>
                  </div>
                </div>

                {/* Meeting Room - STRICTLY IN-APP LAUNCH */}
                <div className="p-3.5 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5" />
                      In-App Meeting Room
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {isSessionCancelled(selectedSession) ? "Inactive" : (selectedSession.class_link || selectedSession.id ? "Ready to Join" : "Pending setup")}
                    </span>
                  </div>

                  {isSessionCancelled(selectedSession) ? (
                    <div className="py-2.5 px-3 bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5">
                      <Icon icon="lucide:ban" className="w-4 h-4 text-rose-500" />
                      <span>Live Classroom Closed (Cancelled)</span>
                    </div>
                  ) : selectedSession.id ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        <Icon icon="solar:shield-check-bold" className="w-4 h-4 text-emerald-500" />
                        <span>In-App Secure Classroom · Protected</span>
                      </div>

                      {/* Direct In-App Classroom Launcher */}
                      <div className="pt-0.5">
                        <button 
                          onClick={() => handleLaunchWebClass(selectedSession)}
                          className="w-full py-3 bg-[#09314F] hover:bg-[#15466f] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                        >
                          <VideoCameraIcon className="w-4 h-4 text-[#C5A97A]" />
                          <span>Join In-App Classroom</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">No session ID configured for this class yet.</p>
                  )}
                </div>

                {/* Session Recording Section */}
                {selectedSession.recording_link && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-purple-200 dark:border-purple-900/50">
                    <span className="text-xs font-bold text-purple-800 dark:text-purple-300 flex items-center gap-1.5">
                      <VideoCameraIcon className="w-3.5 h-3.5 text-purple-600" />
                      Recording Uploaded
                    </span>
                    <a
                      href={selectedSession.recording_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-black text-purple-600 dark:text-purple-400 hover:underline"
                    >
                      Watch Now ↗
                    </a>
                  </div>
                )}
              </div>

              {/* Modal Bottom Actions */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => handleOpenReportModal(selectedSession)}
                  className="w-full py-3 bg-[#C5A97A] hover:bg-[#b09262] text-[#09314F] font-black rounded-xl transition-all shadow-sm active:scale-95 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Icon icon="lucide:clipboard-check" className="w-4 h-4" />
                  <span>Submit Post-Class Tutor Report</span>
                </button>

                <button 
                  onClick={() => setSelectedSession(null)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-white font-bold rounded-xl transition-all active:scale-95 text-xs uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </StaffDashboardLayout>

      {/* Post-Class Tutor Report Modal Integration */}
      <TutorPostClassReportModal 
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        sessionDetails={feedbackSession}
        onSkip={() => {
          setToast({ type: "info", message: "Report deferred. This session is waiting in your Pending Post-Class Reports queue above." });
          refreshUnreported();
        }}
        onSubmitSuccess={() => {
          if (feedbackSession?.id) {
            try {
              const stored = JSON.parse(localStorage.getItem("tutor_unreported_sessions") || "[]");
              const updated = stored.filter(s => String(s.id) !== String(feedbackSession.id));
              localStorage.setItem("tutor_unreported_sessions", JSON.stringify(updated));
              setUnreportedSessions(updated);
            } catch (e) {}
          }
          refreshUnreported();
          setToast({ type: "success", message: "Post-Class Tutor Report submitted successfully to management!" });
        }}
      />
    </>
  );
}
