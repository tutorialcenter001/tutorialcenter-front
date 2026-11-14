import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import CourseAdvisorFeedbackModal from "../../../components/private/staffs/CourseAdvisorFeedbackModal";
import MasterClassDetailModal from "../../../components/private/staffs/MasterClassDetailModal.jsx";
import { isAdminStaff, isAdvisorStaff, canSeeCancelledClasses } from "../../../utils/roleUtils";
import { 
  MagnifyingGlassIcon,
  CalendarIcon,
  LinkIcon,
  VideoCameraIcon,
  ArrowPathIcon,
  ClockIcon,
  UserGroupIcon,
  AcademicCapIcon,
  SparklesIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline";
import { Icon } from "@iconify/react";
import ClassSessionStatusBadge, {
  isSessionCancelled,
  isSessionProposed,
} from "../../../components/common/ClassSessionStatusBadge";

export default function CourseAdvisorMasterClass() {
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
  const [videoLink, setVideoLink] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackSession, setFeedbackSession] = useState(null);
  const [selectedClassOverview, setSelectedClassOverview] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const staffName = localStorage.getItem("staff_name") || "Course Advisor";
  const token = localStorage.getItem("staff_token");

  // --- FETCHING LOGIC ---
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/advisor/classes/schedule`, {
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
      setToast({ type: "error", message: "Failed to load advisor master class schedule." });
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Prevent feedback loop when returning from a masterclass
  const handledFeedbackRef = useRef(new Set());

  // Open the post-class report modal when returning from a masterclass without infinite reloads
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const feedbackParam = searchParams.get("feedback_session");
    const stateSessionId = location.state?.completedSessionId;
    const sessionStoredId = sessionStorage.getItem("just_completed_class_session_id");

    const incomingId = feedbackParam || stateSessionId || sessionStoredId;
    if (!incomingId) return;

    const staffRole = localStorage.getItem("staff_role") || "";
    if (isAdminStaff(staffRole) && !isAdvisorStaff(staffRole)) {
      sessionStorage.removeItem("just_completed_class_session_id");
      return;
    }

    const idStr = String(incomingId);
    if (handledFeedbackRef.current.has(idStr)) return;

    const allSessions = [
      ...(scheduleData.today_classes || []),
      ...Object.values(scheduleData.week_schedule || {}).flat(),
      ...(scheduleData.upcoming_sessions || []),
      ...(scheduleData.sessions || []),
      ...(scheduleData.next_class ? [scheduleData.next_class] : [])
    ];

    const session = allSessions.find(s => String(s.id) === idStr);

    if (session) {
      handledFeedbackRef.current.add(idStr);
      sessionStorage.removeItem("just_completed_class_session_id");

      // Differentiate and extract real tutor name rather than advisor name
      const tutorStaff = session.class?.staffs?.find(st => {
        const r = String(st.pivot?.role || st.role || st.staff?.role || "").toLowerCase();
        return !r.includes("advisor") && !r.includes("assistant");
      });
      const tutorName = tutorStaff 
        ? `${tutorStaff.firstname} ${tutorStaff.surname}`.trim()
        : session.tutor_name || session.class?.tutor_name || "Course Tutor";

      setFeedbackSession({
        id: session.id,
        class_id: session.class_id || session.id,
        class_title: session.class?.title || session.class?.subject?.name || session.title || "Masterclass",
        subject: (typeof session.class?.subject === "object" ? session.class?.subject?.name : session.class?.subject) || "General Subject",
        topic: session.class?.title || session.title || "Lesson Session",
        date: session.session_date ? new Date(session.session_date).toLocaleDateString() : new Date().toLocaleDateString(),
        time: `${session.starts_at || 'TBD'} - ${session.ends_at || 'TBD'}`,
        tutor_name: tutorName,
        present_count: session.attendances?.length ?? 0,
        total_students: session.enrolled_count ?? session.class?.enrolled_count ?? 20,
      });

      setFeedbackModalOpen(true);

      // Clean the query string without triggering React Router navigation loops
      if (location.search.includes("feedback_session") || location.state?.completedSessionId) {
        window.history.replaceState({}, document.title, location.pathname);
      }
    } else if (!loading) {
      // Fallback when schedule has loaded but session was external/custom
      handledFeedbackRef.current.add(idStr);
      sessionStorage.removeItem("just_completed_class_session_id");

      setFeedbackSession({
        id: idStr,
        class_id: idStr,
        class_title: "Master Class",
        subject: "Live Masterclass",
        topic: "Class Lesson",
        date: new Date().toLocaleDateString(),
        time: "Just Concluded",
        tutor_name: "Course Tutor",
        present_count: 0,
        total_students: 20,
      });

      setFeedbackModalOpen(true);

      // Clean the query string without triggering React Router navigation loops
      if (location.search.includes("feedback_session") || location.state?.completedSessionId) {
        window.history.replaceState({}, document.title, location.pathname);
      }
    }
  }, [location.search, location.state, scheduleData, loading, location.pathname]);

  // --- RECORDING MANAGEMENT ---
  const handleSaveVideoLink = async () => {
    if (!selectedSession) return;
    
    let formattedLink = videoLink ? videoLink.trim() : "";
    if (formattedLink && !/^https?:\/\//i.test(formattedLink)) {
      formattedLink = `https://${formattedLink}`;
    }

    setSaveLoading(true);
    const payload = {
      class_schedule_id: selectedSession.id,
      class_id: selectedSession.class_id || selectedSession.id,
      id: selectedSession.id,
      recording_link: formattedLink,
      recording_url: formattedLink,
      video_url: formattedLink
    };
    const headers = { 
      "Authorization": `Bearer ${token}`,
      "Accept": "application/json" 
    };

    try {
      const endpoints = [
        `${API_BASE_URL}/api/staffs/classes/session/recording`,
        `${API_BASE_URL}/api/advisor/classes/session/recording`,
        `${API_BASE_URL}/api/staff/classes/session/recording`,
      ];
      let saved = false;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          await axios.post(endpoint, payload, { headers });
          saved = true;
          break;
        } catch (err) {
          lastError = err;
          if (err?.response?.status && err.response.status !== 404) {
            break;
          }
        }
      }

      if (!saved && lastError) {
        throw lastError;
      }
      
      setToast({ type: "success", message: "Recording link updated successfully!" });
      setSelectedSession(null);
      fetchSessions();
    } catch (error) {
      console.error("Save recording error:", error);
      const backendMsg = error?.response?.data?.message || error?.response?.data?.error || "Failed to update recording link.";
      setToast({ type: "error", message: backendMsg });
    } finally {
      setSaveLoading(false);
    }
  };

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

  // --- DERIVED METRICS FOR ADVISOR ---
  const stats = useMemo(() => {
    const classesCount = scheduleData.classes?.length || 0;
    const upcomingCount = scheduleData.upcoming_sessions?.length || 0;
    
    // Distinct students across cohorts
    const studentIdSet = new Set();
    scheduleData.classes?.forEach(c => {
      if (Array.isArray(c.enrolled_students)) {
        c.enrolled_students.forEach(s => {
          if (s.id) studentIdSet.add(s.id);
        });
      } else if (c.enrolled_count) {
        for (let i = 0; i < c.enrolled_count; i++) studentIdSet.add(`std_${c.id}_${i}`);
      }
    });

    return {
      classesCount,
      upcomingCount,
      studentsCount: studentIdSet.size,
      nextSession: scheduleData.next_class
    };
  }, [scheduleData]);

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
        (Array.isArray(c.staffs) && c.staffs.some(st => `${st.firstname} ${st.surname}`.toLowerCase().includes(q))) ||
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
  const handleOpenLaunchModal = (session) => {
    setSelectedSession(session);
    setVideoLink(session.recording_link || "");
  };

  const handleLaunchWebClass = (session) => {
    if (!session?.id) return;
    navigate(`/classroom/${session.id}`);
  };

  // Join through the in-app Zoom SDK instead of redirecting to the external
  // Zoom web/app link, which asks the advisor to sign in.
  const handleLaunchZoomApp = (session) => {
    if (!session?.id) return;
    navigate(`/classroom/${session.id}`);
  };

  // Resolve a session id for a class so the Room button can launch the in-app
  // classroom. The Zoom signature endpoint falls back to the class-level room,
  // so any session works; prefer the nearest upcoming one, else the latest.
  const getClassSessionId = (cls) => {
    const sessions = (Array.isArray(cls?.schedules) ? cls.schedules : [])
      .flatMap((schedule) => (Array.isArray(schedule?.sessions) ? schedule.sessions : []));

    if (sessions.length === 0) return null;

    const toTime = (session) => {
      const date = session.session_date ? String(session.session_date).slice(0, 10) : "";
      const time = session.starts_at ? String(session.starts_at).slice(0, 8) : "00:00:00";
      const parsed = new Date(`${date}T${time}`).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    };

    const now = Date.now();
    const upcoming = sessions
      .filter((session) => toTime(session) >= now)
      .sort((a, b) => toTime(a) - toTime(b))[0];

    if (upcoming) return upcoming.id;

    const latest = [...sessions].sort((a, b) => toTime(b) - toTime(a))[0];
    return latest?.id ?? null;
  };

  const handleLaunchClassRoom = (cls) => {
    const sessionId = getClassSessionId(cls);
    if (sessionId) {
      navigate(`/classroom/${sessionId}`);
      return;
    }
    // Fallback: no sessions on this class, use the configured room link.
    const link = cls?.zoom_start_url || cls?.zoom_join_url;
    if (link) window.open(link, "_blank", "noopener,noreferrer");
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

      <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto w-full space-y-8 min-h-screen">
        
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 1. ADVISOR EXECUTIVE HERO & METRICS BANNER                         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] bg-gradient-to-br from-[#07243B] via-[#09314F] to-[#0A3D63] text-white p-6 sm:p-8 lg:p-10 shadow-2xl border border-white/10">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#C5A97A]/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-black uppercase tracking-widest text-[#C5A97A]">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>Course Advisor Masterclass Hub</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
                Master Class Supervision • <span className="text-[#C5A97A]">{staffName}</span>
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
                Center-wide cohort supervision, schedule monitoring, student enrollment tracking, and recording link management across all academic programs.
              </p>
            </div>

            <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
              <button
                onClick={fetchSessions}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-95 border border-white/15 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50"
                title="Refresh Schedule"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin text-[#C5A97A]' : ''}`} />
                <span>{loading ? "Refreshing..." : "Refresh"}</span>
              </button>
              <button
                onClick={() => navigate('/staffs/courseadvisor/calendar')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#C5A97A] hover:bg-[#b09262] active:scale-95 text-[#09314F] font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-[#C5A97A]/20"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Advisor Calendar</span>
              </button>
            </div>
          </div>

          {/* KPI STATS ROW */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8 pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] font-black uppercase tracking-wider">Active Classes</span>
                <AcademicCapIcon className="w-4 h-4 text-[#C5A97A]" />
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{stats.classesCount}</span>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-tight">Center Cohorts</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] font-black uppercase tracking-wider">Upcoming</span>
                <ClockIcon className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{stats.upcomingCount}</span>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-tight">Center Sessions</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] font-black uppercase tracking-wider">Enrolled Students</span>
                <UserGroupIcon className="w-4 h-4 text-blue-400" />
              </div>
              <div className="mt-2">
                <span className="text-2xl sm:text-3xl font-black text-white">{stats.studentsCount}</span>
                <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-tight">Active Registrations</span>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-[11px] font-black uppercase tracking-wider">Next Session</span>
                <VideoCameraIcon className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2 truncate">
                <span className="text-sm sm:text-base font-black text-[#C5A97A] truncate block">
                  {stats.nextSession ? (stats.nextSession.class?.title || "Upcoming Session") : "None Pending"}
                </span>
                <span className="text-[10px] text-slate-300 font-bold block truncate">
                  {stats.nextSession ? `${formatDayName(stats.nextSession.session_date)}, ${formatTime(stats.nextSession.starts_at)}` : "All clear"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 2. ADVISOR SPOTLIGHT: NEXT UP LIVE SESSION                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {scheduleData.next_class && (
          <div className="relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:to-transparent border-2 border-amber-500/30 dark:border-amber-500/40 shadow-xl overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    Center Next Up
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-gray-400">
                    {formatDayName(scheduleData.next_class.session_date)}, {formatDate(scheduleData.next_class.session_date)}
                  </span>
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#0F2843] dark:text-white">
                    {scheduleData.next_class.class?.title || "Live Masterclass Session"}
                  </h2>
                  <p className="text-sm font-semibold text-[#C5A97A] mt-0.5">
                    Subject: {scheduleData.next_class.class?.subject?.name || "General"} • {formatTime(scheduleData.next_class.starts_at)} - {formatTime(scheduleData.next_class.ends_at)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-gray-300 pt-1">
                  <span className="flex items-center gap-1 font-bold bg-white dark:bg-gray-800 px-3 py-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <UserGroupIcon className="w-4 h-4 text-blue-500" />
                    {scheduleData.next_class.enrolled_count ?? scheduleData.next_class.class?.enrolled_count ?? 0} Students Enrolled
                  </span>
                  {scheduleData.next_class.class_link && (
                    <span className="flex items-center gap-1 font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 px-3 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      <Icon icon="lucide:video" className="w-4 h-4" />
                      Meeting Configured
                    </span>
                  )}
                </div>
              </div>

              {/* Direct Action Launcher */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleOpenLaunchModal(scheduleData.next_class)}
                  className="px-6 py-3.5 bg-[#09314F] hover:bg-[#0e446d] active:scale-95 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-[#09314F]/20 flex items-center gap-2 transition-all"
                >
                  <Icon icon="lucide:settings-2" className="w-4 h-4 text-[#C5A97A]" />
                  <span>Manage / Join</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* 3. VIEW CONTROLS & SEARCH BAR                                      */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          
          <div className="flex items-center p-1.5 bg-gray-100 dark:bg-gray-800/90 rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto self-start">
            <button
              onClick={() => setActiveTab("classes")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "classes" ? "bg-white dark:bg-gray-700 text-[#09314F] dark:text-white shadow-md" : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <AcademicCapIcon className="w-4 h-4" />
              <span>All Masterclasses ({scheduleData.classes?.length || 0})</span>
            </button>
            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${activeTab === "timeline" ? "bg-white dark:bg-gray-700 text-[#09314F] dark:text-white shadow-md" : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"}`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Sessions Timeline ({flattenedSessions.length})</span>
            </button>
          </div>

          <div className="relative w-full md:w-80">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === "classes" ? "Search classes, subjects, tutors..." : "Search sessions, dates..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#09314F] dark:focus:ring-[#C5A97A] shadow-sm transition-all placeholder:text-gray-400"
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
        {/* 4. TAB 1: ALL MASTERCLASSES (COHORT GRID)                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "classes" && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800/40 rounded-[32px] border border-gray-100 dark:border-gray-700/60">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#09314F] dark:border-[#C5A97A] mx-auto" />
                <p className="mt-4 text-slate-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                  Loading center masterclasses...
                </p>
              </div>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800/40 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-gray-700 p-8">
                <AcademicCapIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-black text-gray-700 dark:text-gray-200">
                  {searchQuery ? "No matching classes found" : "No Masterclasses Configured"}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                  {searchQuery ? "Try adjusting your search terms." : "No active masterclasses found in the system."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredClasses.map((cls) => {
                  const enrolledCount = cls.enrolled_count ?? (Array.isArray(cls.enrolled_students) ? cls.enrolled_students.length : 0);
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
                      className={`group bg-white dark:bg-gray-800 rounded-[30px] p-6 border border-gray-100 dark:border-gray-700/80 shadow-sm hover:shadow-xl hover:border-[#C5A97A]/40 transition-all flex flex-col justify-between ${
                        isClsPassed ? "opacity-65 hover:opacity-100" : "opacity-100"
                      }`}
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-3 py-1 rounded-xl bg-[#09314F]/10 dark:bg-white/10 text-[#09314F] dark:text-[#C5A97A] text-[10px] font-black uppercase tracking-wider">
                              {cls.subject?.name || "Subject"}
                            </span>
                            {isClsDueToday && (
                              <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-emerald-500 text-white flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Due Today
                              </span>
                            )}
                            {isClsUpcoming && !isClassCancelled && (
                              <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
                                Upcoming
                              </span>
                            )}
                            {isClsPassed && !isClassCancelled && (
                              <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                                Passed
                              </span>
                            )}
                            {Boolean(cls.is_private || cls.is_private === 1 || cls.is_private === "1") && (
                              <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                                Private 1-on-1
                              </span>
                            )}
                            {(cls.private_student || cls.privateStudent) && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                {(cls.private_student || cls.privateStudent).firstname} {(cls.private_student || cls.privateStudent).surname}
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
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-gray-400 bg-slate-50 dark:bg-gray-700/60 px-2.5 py-1 rounded-lg">
                            <UserGroupIcon className="w-3.5 h-3.5 text-blue-500" />
                            <span>{enrolledCount} enrolled</span>
                          </span>
                        </div>

                        <div>
                          <h3 className={`text-lg font-black text-[#0F2843] dark:text-white group-hover:text-[#09314F] dark:group-hover:text-[#C5A97A] transition-colors line-clamp-1 ${
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

                        {/* Weekly Timetable */}
                        <div className="space-y-1.5 pt-2">
                          <span className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest block">
                            Weekly Timetable
                          </span>
                          {schedulesList.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">Schedule to be announced</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {schedulesList.map((sched, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-700/60 border border-gray-100 dark:border-gray-600 text-[11px] font-bold text-slate-700 dark:text-gray-300"
                                >
                                  <ClockIcon className="w-3 h-3 text-[#C5A97A]" />
                                  <span>{sched.day_of_week}: {formatTime(sched.start_time)} - {formatTime(sched.end_time)}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Assigned Staffs */}
                        <div className="pt-2 space-y-1.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Assigned Staffs</span>
                          {Array.isArray(cls.staffs) && cls.staffs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {cls.staffs.map((st) => {
                                const rawRole = String(st.pivot?.role || st.role || st.staff?.role || st.staff_role || "").toLowerCase();
                                const isAdvisor = rawRole.includes("advisor") || rawRole.includes("assistant") || rawRole.includes("coordinator");
                                return (
                                  <span
                                    key={st.id}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                                      isAdvisor
                                        ? "bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
                                        : "bg-blue-500/10 dark:bg-blue-500/15 border-blue-500/30 text-blue-900 dark:text-blue-200"
                                    }`}
                                  >
                                    {isAdvisor ? (
                                      <ShieldCheckIcon className="w-3 h-3 text-[#C5A97A] shrink-0" />
                                    ) : (
                                      <AcademicCapIcon className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                    )}
                                    <span>{st.firstname} {st.surname}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider ${
                                        isAdvisor
                                          ? "bg-[#C5A97A]/25 text-amber-800 dark:text-amber-300"
                                          : "bg-blue-600/15 text-blue-700 dark:text-blue-300"
                                      }`}
                                    >
                                      {isAdvisor ? "Advisor" : "Tutor"}
                                    </span>
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No staffs assigned</span>
                          )}
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="pt-6 mt-6 border-t border-gray-100 dark:border-gray-700/80 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedClassOverview(cls)}
                          className="py-2.5 px-3 bg-blue-50/80 hover:bg-[#09314F] hover:text-white dark:bg-blue-950/30 dark:hover:bg-blue-600 text-[#09314F] dark:text-blue-300 font-bold text-xs rounded-xl transition-all text-center flex items-center justify-center gap-1.5 active:scale-95 shadow-xs"
                          title="View Masterclass Details & Conditions"
                        >
                          <Icon icon="mdi:eye-outline" className="w-3.5 h-3.5" />
                          <span>View More</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab("timeline");
                            setSearchQuery(cls.title);
                          }}
                          className="flex-1 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700/60 dark:hover:bg-gray-700 active:scale-95 text-[#09314F] dark:text-white font-black text-xs rounded-xl transition-all text-center flex items-center justify-center gap-1.5"
                        >
                          <CalendarIcon className="w-3.5 h-3.5" />
                          <span>Sessions</span>
                        </button>

                        {(cls.zoom_start_url || cls.zoom_join_url || flattenedSessions.some(s => String(s.class_id || s.class?.id) === String(cls.id)) || getClassSessionId(cls)) ? (
                          <button
                            type="button"
                            onClick={() => handleLaunchClassRoom(cls)}
                            className="px-3.5 py-2.5 bg-[#09314F] hover:bg-[#0e446d] active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                            title="Join Classroom (In-App SDK Wrapper)"
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
        {/* 5. TAB 2: SESSIONS & TIMELINE (WITH RECORDING CONTROLS)            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {activeTab === "timeline" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
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
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${isActive ? "bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] shadow-sm" : "bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700"}`}
                  >
                    {flt.label}
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800/40 rounded-[32px] border border-gray-100 dark:border-gray-700/60">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#09314F] dark:border-[#C5A97A] mx-auto" />
                <p className="mt-4 text-slate-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">
                  Loading sessions timeline...
                </p>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-gray-800/40 rounded-[32px] border-2 border-dashed border-gray-200 dark:border-gray-700 p-8">
                <CalendarIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <h3 className="text-base font-black text-gray-700 dark:text-gray-200">
                  No sessions match this filter
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">
                  Try selecting another timeline tab or clearing your search keywords.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden divide-y divide-gray-100 dark:divide-gray-700/80">
                {filteredSessions.map((session) => {
                  const sessionIsPast = isPast(session);
                  const isDueToday = isTodaySession(session) && !sessionIsPast;
                  const isUpcoming = !sessionIsPast && !isDueToday;
                  const isNext = scheduleData.next_class && String(scheduleData.next_class.id) === String(session.id);
                  const cancelled = isSessionCancelled(session);
                  
                  return (
                    <div
                      key={session.id}
                      className={`p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-gray-50/70 dark:hover:bg-gray-700/40 ${
                        isNext ? "bg-amber-500/5 dark:bg-amber-500/10 border-l-4 border-l-amber-500" : ""
                      } ${sessionIsPast ? "opacity-60 hover:opacity-100 bg-gray-50/30 dark:bg-gray-900/30" : "opacity-100"} ${cancelled ? "opacity-75" : ""}`}
                    >
                      {/* Left Side: Avatar + Details */}
                      <div className="flex items-start sm:items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs shrink-0 shadow-sm ${
                          cancelled ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300" : isNext ? "bg-amber-500 text-white shadow-amber-500/20" : isDueToday ? "bg-emerald-500 text-white shadow-emerald-500/20" : sessionIsPast ? "bg-gray-100 dark:bg-gray-700 text-gray-400" : "bg-[#09314F] text-white"
                        }`}>
                          {getInitials(session.class?.title || session.title)}
                        </div>

                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isNext && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest">
                                Next Up
                              </span>
                            )}
                            {isDueToday && !isNext && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                Due Today
                              </span>
                            )}
                            {isUpcoming && !isNext && (
                              <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-400/30 text-[9px] font-black uppercase tracking-wider">
                                Upcoming
                              </span>
                            )}
                            {sessionIsPast && (
                              <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-black uppercase tracking-wider">
                                Passed
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 text-[10px] font-black uppercase tracking-wider">
                              {session.class?.subject?.name || "Subject"}
                            </span>
                            <ClassSessionStatusBadge session={session} size="xs" showScheduled={false} />
                            <span className="text-[11px] font-bold text-slate-400">
                              {formatDayName(session.session_date)}, {formatDate(session.session_date)}
                            </span>
                          </div>

                          <h4 className={`text-base font-black text-[#0F2843] dark:text-white truncate ${cancelled ? "line-through text-rose-700 dark:text-rose-400" : ""}`}>
                            {session.class?.title || session.title || "Class Session"}
                          </h4>

                          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
                            <span className="flex items-center gap-1 font-bold">
                              <ClockIcon className="w-3.5 h-3.5 text-[#C5A97A]" />
                              {formatTime(session.starts_at)} - {formatTime(session.ends_at)}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1 font-bold">
                              <UserGroupIcon className="w-3.5 h-3.5 text-blue-500" />
                              {session.enrolled_count ?? session.class?.enrolled_count ?? 0} students
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Options & Recording Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0 pt-2 md:pt-0">
                        {cancelled && (
                          <span className="px-3.5 py-2 rounded-xl bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Icon icon="lucide:ban" className="w-3.5 h-3.5 text-rose-500" />
                            <span>Cancelled</span>
                          </span>
                        )}

                        {session.recording_link && (
                          <a
                            href={session.recording_link}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3.5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold text-xs hover:bg-purple-100 transition-all flex items-center gap-1.5 border border-purple-200 dark:border-purple-800"
                            title="Recording Uploaded"
                          >
                            <VideoCameraIcon className="w-4 h-4 text-purple-600" />
                            <span>Watch</span>
                          </a>
                        )}

                        <button
                          onClick={() => handleOpenLaunchModal(session)}
                          className="px-4 py-2.5 rounded-xl bg-[#09314F] hover:bg-[#15466f] text-white font-black text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          <Icon icon="lucide:settings-2" className="w-4 h-4 text-[#C5A97A]" />
                          <span>Manage</span>
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
      {/* 6. ADVISOR SESSION DETAILS & RECORDING MANAGEMENT MODAL            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {selectedSession && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm animate-in fade-in duration-200" 
            onClick={() => setSelectedSession(null)} 
          />
          
          <div className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[36px] p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C5A97A]">Advisor Console</span>
                <h2 className="text-xl sm:text-2xl font-black text-[#0F2843] dark:text-white">Session Overview</h2>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-bold text-gray-500 dark:text-gray-300 text-sm transition-all"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-gray-900/60 rounded-2xl p-4 border border-slate-100 dark:border-gray-700/60 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Class & Subject</span>
                  <ClassSessionStatusBadge session={selectedSession} size="xs" showScheduled={true} />
                </div>
                <h3 className={`text-base font-black text-[#0F2843] dark:text-white ${isSessionCancelled(selectedSession) ? "line-through text-rose-700 dark:text-rose-400" : ""}`}>
                  {selectedSession.class?.title || selectedSession.title}
                </h3>
                <p className="text-xs font-bold text-[#C5A97A]">
                  Subject: {selectedSession.class?.subject?.name || "General Subject"} • {selectedSession.enrolled_count ?? selectedSession.class?.enrolled_count ?? 0} students enrolled
                </p>
              </div>

              {/* Status Alert Banners */}
              {isSessionCancelled(selectedSession) && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <Icon icon="lucide:ban" className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>This class session was cancelled by administration. Live entry is closed.</span>
                </div>
              )}
              {isSessionProposed(selectedSession) && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Icon icon="lucide:clock" className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This session is proposed and pending administrative confirmation.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Session Date</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200 mt-1 block">
                    {formatDayName(selectedSession.session_date)}, {formatDate(selectedSession.session_date)}
                  </span>
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Time Range</span>
                  <span className="font-bold text-slate-700 dark:text-gray-200 mt-1 block">
                    {formatTime(selectedSession.starts_at)} - {formatTime(selectedSession.ends_at)}
                  </span>
                </div>
              </div>

              {/* Classroom Meeting Room - DIRECT OPTIONS DISPLAYED INSTANTLY */}
              <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4" />
                    Live Classroom
                  </span>
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                    {isSessionCancelled(selectedSession) ? "Inactive" : (selectedSession.class_link ? "Configured" : "No link")}
                  </span>
                </div>

                {isSessionCancelled(selectedSession) ? (
                  <div className="py-2.5 px-3 bg-rose-100/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-1.5">
                    <Icon icon="lucide:ban" className="w-4 h-4 text-rose-500" />
                    <span>Live Classroom Closed (Cancelled)</span>
                  </div>
                ) : selectedSession.class_link ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-slate-500 dark:text-gray-400 truncate font-medium">
                      {selectedSession.class_link.replace(/^https?:\/\//, '')}
                    </div>

                    {/* Direct Launch Buttons Displayed Immediately */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button 
                        onClick={() => handleLaunchWebClass(selectedSession)}
                        className="py-2.5 bg-[#09314F] hover:bg-[#15466f] text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Icon icon="lucide:globe" className="w-3.5 h-3.5 text-[#C5A97A]" />
                        <span>Join on Web</span>
                      </button>
                      <button 
                        onClick={() => handleLaunchZoomApp(selectedSession)}
                        className="py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Icon icon="lucide:video" className="w-3.5 h-3.5" />
                        <span>Join via Zoom App</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No live room link has been configured for this session yet.</p>
                )}
              </div>

              {/* Manage Session Recording Link */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-700/40 border border-slate-200 dark:border-gray-600 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-gray-200 flex items-center gap-1.5">
                    <VideoCameraIcon className="w-4 h-4 text-[#C5A97A]" />
                    Session Recording URL
                  </span>
                  {selectedSession.recording_link && (
                    <a
                      href={selectedSession.recording_link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] font-black text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
                    >
                      <Icon icon="lucide:play-circle" className="w-3 h-3" />
                      Preview Recording ↗
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    placeholder="https://zoom.us/rec/... or video URL"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs font-medium text-[#1F2937] dark:text-white focus:ring-2 focus:ring-[#09314F] dark:focus:ring-[#C5A97A] transition-all"
                  />
                  <button
                    onClick={handleSaveVideoLink}
                    disabled={saveLoading}
                    className="px-4 py-2 bg-[#C5A97A] hover:bg-[#b09262] text-[#09314F] font-black text-xs rounded-xl transition-all active:scale-95 shadow-sm disabled:opacity-50 shrink-0"
                  >
                    {saveLoading ? "Saving..." : "Save Link"}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-2">
              <button 
                onClick={() => setSelectedSession(null)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-white font-bold rounded-2xl transition-all active:scale-95 text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Master Class Detail Modal with Condition Management */}
      {selectedClassOverview && (
        <MasterClassDetailModal
          cls={selectedClassOverview}
          onClose={() => setSelectedClassOverview(null)}
          onConditionUpdated={(updatedClass) => {
            setScheduleData((prev) => ({
              ...prev,
              classes: (prev.classes || []).map((c) => (c.id === updatedClass.id ? { ...c, ...updatedClass } : c)),
            }));
            setSelectedClassOverview(updatedClass);
            setToast({
              type: "success",
              message: `Master class condition updated to "${updatedClass.status.toUpperCase()}"!`,
            });
          }}
          canManageCondition={false}
        />
      )}
    </StaffDashboardLayout>

    <CourseAdvisorFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        sessionDetails={feedbackSession}
        onSubmitSuccess={() => {
          setFeedbackModalOpen(false);
          setToast({ type: "success", message: "Course Advisor Post-Class Report submitted successfully!" });
        }}
      />
    </>
  );
}
