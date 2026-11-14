import { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/private/Students/DashboardLayout.jsx";
import axios from "axios";
import { Icon } from "@iconify/react";
import EmbeddedVideoModal from "../../components/private/EmbeddedVideoModal.jsx";
import ClassSessionStatusBadge, {
  isSessionCancelled,
  isSessionRescheduled,
  isSessionProposed,
  hasSessionRecording,
  getSessionCardStyles,
  SubjectBadge,
} from "../../components/common/ClassSessionStatusBadge.jsx";

// SVG Icons to avoid import issues
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const BackIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

// Official Tutorial Center African Time Zone (West Africa Time / UTC+1)
const AFRICAN_TIMEZONE = "Africa/Lagos";

// Helper to get African Date in YYYY-MM-DD format strictly tied to Africa/Lagos
const getAfricanDateYMD = (dateInput = new Date()) => {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const trimmed = dateInput.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AFRICAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 (12 AM to 11 PM)

// Color scheme mapping


const getInitials = (str) => {
  if (!str || typeof str !== "string") return "MC";
  return str.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "MC";
};

export default function StudentCalendar() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [subscriptionExpiredMessage, setSubscriptionExpiredMessage] = useState("");

  const handleJoinClass = useCallback((s) => {
    if (!s) return;
    if (isSubscriptionExpired) {
      navigate('/student/payments');
      return;
    }
    if (s.id) {
      if (token) {
        axios.post(
          `${API_BASE_URL}/api/students/classes/attendance/join`,
          { class_session_id: s.id },
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        ).catch(() => {});
      }
      navigate(`/zoom/masterclass/class/${s.id}`);
      return;
    }
    const link = s.class_link || s.recording_link;
    if (link && typeof link === "string" && (link.startsWith("http://") || link.startsWith("https://"))) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  }, [API_BASE_URL, navigate, token, isSubscriptionExpired]);
  const [viewMode, setViewMode] = useState("month"); // "month", "week", "day"
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selectedMobileDate, setSelectedMobileDate] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDateModal, setSelectedDateModal] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  const [watchingVideoUrl, setWatchingVideoUrl] = useState(null);
  const [watchingVideoId, setWatchingVideoId] = useState(null);

  const handleWatchVideo = (url) => {
    if (isSubscriptionExpired) {
      navigate('/student/payments');
      return;
    }
    let videoId = null;
    if (url && (url.includes('youtube.com') || url.includes('youtu.be'))) {
       const match = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i);
       if (match) videoId = match[1];
    }
    setWatchingVideoId(videoId);
    setWatchingVideoUrl(url);
  };

  const isPastSession = useCallback((session) => {
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
      const sessionEndTime = new Date(sDate.getFullYear(), sDate.getMonth(), sDate.getDate(), parseInt(parts[0], 10), parseInt(parts[1], 10));
      if (sessionEndTime < now) return true;
    }
    return false;
  }, []);

  const calendarScrollRef = useRef(null);

  // Helper to flatten tiered schedule API response safely
  const getFlatSessions = (data) => {
    if (!data) return [];

    const normalizeSession = (s, parentClass = null) => {
      if (!s) return null;
      const cls = parentClass || s.class || null;
      const isPriv = Boolean(
        s.is_private === true || 
        s.is_private === 1 || 
        s.is_private === "1" || 
        s.is_private === "true" || 
        s.private_student_id || 
        cls?.is_private === true || 
        cls?.is_private === 1 || 
        cls?.is_private === "1" || 
        cls?.is_private === "true" || 
        cls?.private_student_id
      );
      return {
        ...s,
        is_private: isPriv,
        private_student_id: s.private_student_id || cls?.private_student_id || null,
        private_enrollment: s.private_enrollment || cls?.private_enrollment || cls?.privateEnrollment || null,
        class: cls || s.class,
        session_date: s.session_date ? getAfricanDateYMD(s.session_date) : getAfricanDateYMD(),
      };
    };

    const list = [];
    
    const addSession = (s, parentClass = null) => {
      if (!s) return;
      if (isSessionCancelled(s) || (parentClass && isSessionCancelled(parentClass))) return;
      const normalized = normalizeSession(s, parentClass);
      if (!normalized || isSessionCancelled(normalized)) return;
      const isDuplicate = list.some(item => {
        if (normalized.id && item.id) return item.id === normalized.id;
        return item.title === normalized.title && item.session_date === normalized.session_date && item.starts_at === normalized.starts_at;
      });
      if (!isDuplicate) list.push(normalized);
    };

    if (Array.isArray(data)) {
      data.forEach(item => addSession(item));
      return list;
    }

    // Process classes array (with nested schedules and sessions)
    if (Array.isArray(data.classes)) {
      data.classes.forEach(cls => {
        if (Array.isArray(cls.sessions)) {
          cls.sessions.forEach(sess => addSession(sess, cls));
        }
        if (Array.isArray(cls.schedules)) {
          cls.schedules.forEach(sched => {
            if (Array.isArray(sched.sessions)) {
              sched.sessions.forEach(sess => addSession(sess, cls));
            }
          });
        }
      });
    }

    if (data.next_class) addSession(data.next_class);
    if (Array.isArray(data.next_classes)) data.next_classes.forEach(s => addSession(s));
    if (Array.isArray(data.today_classes)) data.today_classes.forEach(s => addSession(s));
    if (data.week_schedule && typeof data.week_schedule === "object") {
      Object.values(data.week_schedule).forEach(sessionsArray => {
        if (Array.isArray(sessionsArray)) sessionsArray.forEach(s => addSession(s));
      });
    }
    if (Array.isArray(data.upcoming_sessions)) data.upcoming_sessions.forEach(s => addSession(s));
    if (Array.isArray(data.past_sessions)) data.past_sessions.forEach(s => addSession(s));
    if (Array.isArray(data.older_sessions)) data.older_sessions.forEach(s => addSession(s));
    if (Array.isArray(data.history)) data.history.forEach(s => addSession(s));
    if (Array.isArray(data.sessions)) data.sessions.forEach(s => addSession(s));
    
    return list;
  };

  // Fetch sessions
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      setIsSubscriptionExpired(false);
      const res = await axios.get(`${API_BASE_URL}/api/students/class/schedule?all=true`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.data?.subscription_expired) {
        setIsSubscriptionExpired(true);
        setSubscriptionExpiredMessage(
          res.data?.message || "Your course subscription has expired. Masterclasses and recorded sessions are locked."
        );
      }
      console.log("📅 [StudentCalendar] Raw Class Schedule API Response:", res.data);
      const flatList = getFlatSessions(res.data);
      console.log("📅 [StudentCalendar] Flattened Sessions List for Calendar:", flatList);
      setSessions(flatList);
    } catch (error) {
      console.error("Failed to fetch class schedule for calendar:", error);
      if (error.response?.status === 403 || error.response?.data?.subscription_expired) {
        setIsSubscriptionExpired(true);
        setSubscriptionExpiredMessage(
          error.response?.data?.message || "Your course subscription has expired. Masterclasses and recorded sessions are locked."
        );
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Scroll active hour into view for Week/Day views
  useLayoutEffect(() => {
    if (loading || viewMode === "month") return;
    const currentHour = new Date().getHours();
    requestAnimationFrame(() => {
      const container = calendarScrollRef.current;
      const rowElement = document.getElementById(`hour-row-${currentHour}`);
      if (container && rowElement) {
        container.scrollTop = Math.max(0, rowElement.offsetTop - 60);
      }
    });
  }, [loading, viewMode, currentDate]);

  // Date comparison helpers
  const isToday = (d) => {
    const now = new Date();
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  };

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  };

  // Generate Month Grid Days (42 cells, Monday-first)
  const generateMonthDays = useCallback((baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDayRaw = new Date(year, month, 1).getDay();
    const firstDayIndex = (firstDayRaw + 6) % 7; // Monday = 0, ..., Sunday = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Prev Month lead days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      d.setHours(0, 0, 0, 0);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current Month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      d.setHours(0, 0, 0, 0);
      days.push({ date: d, isCurrentMonth: true });
    }

    // Next Month trail days
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      d.setHours(0, 0, 0, 0);
      days.push({ date: d, isCurrentMonth: false });
    }

    return days;
  }, []);

  const monthDays = useMemo(() => generateMonthDays(currentDate), [currentDate, generateMonthDays]);

  // Generate Week Days (7 days, Monday-first)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const dayIndex = (start.getDay() + 6) % 7; // Monday = 0, ..., Sunday = 6
    start.setDate(start.getDate() - dayIndex);
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  // Sessions Filtering
  const getSessionsForDate = useCallback((date) => {
    const targetYMD = getAfricanDateYMD(date);
    return sessions.filter((s) => {
      if (isSessionCancelled(s)) return false;
      return getAfricanDateYMD(s.session_date) === targetYMD;
    });
  }, [sessions]);

  const getSessionsForDateAndHour = useCallback((date, hour) => {
    const targetYMD = getAfricanDateYMD(date);
    return sessions.filter((s) => {
      if (isSessionCancelled(s)) return false;
      if (getAfricanDateYMD(s.session_date) !== targetYMD) return false;
      const startHour = parseInt((s.starts_at || "00:00").split(":")[0], 10);
      return startHour === hour;
    });
  }, [sessions]);

  // Navigation handlers
  const handlePrev = () => {
    if (viewMode === "month") {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() - 1);
        return d;
      });
    } else if (viewMode === "week") {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        return d;
      });
    }
  };

  const handleNext = () => {
    if (viewMode === "month") {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + 1);
        return d;
      });
    } else if (viewMode === "week") {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        return d;
      });
    } else {
      setCurrentDate(prev => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        return d;
      });
    }
  };

  const handleToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setCurrentDate(today);
  };

  // Time formatters
  const formatHour = (h) => {
    const suffix = h >= 12 ? "PM" : "AM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr} ${suffix}`;
  };

  const formatTimeRange = (start, end) => {
    if (!start) return "";
    const format = (t) => {
      const [h, m] = t.split(":");
      const hour = parseInt(h, 10);
      const suffix = hour >= 12 ? "PM" : "AM";
      const hr = hour % 12 === 0 ? 12 : hour % 12;
      return `${hr}:${m} ${suffix}`;
    };
    return `${format(start)}${end ? ` - ${format(end)}` : ""}`;
  };

  const formatFullDate = (d) => {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <DashboardLayout
      pagetitle="Calendar"
      hideHeader={false}
      hideMobileTitle={false}
      hideMobileBell={false}
      hideRightPanel={true}
    >
      <div className="max-w-7xl mx-auto w-full min-h-screen px-4 md:px-0 py-6">

        {/* ====== SUBSCRIPTION EXPIRED BANNER ====== */}
        {isSubscriptionExpired && (
          <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-red-500/10 to-amber-500/5 dark:from-red-950/40 dark:to-amber-950/30 border border-amber-500/30 dark:border-red-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Icon icon="solar:lock-bold" className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                  Course Subscription Expired • Masterclasses Locked
                </p>
                <p className="text-[11px] sm:text-xs text-amber-800/80 dark:text-amber-300/80 font-medium">
                  {subscriptionExpiredMessage || "Live sessions and class recordings on your calendar are currently locked. Renew your training to restore access."}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/student/payments')}
              className="px-5 py-2.5 bg-[#E83831] hover:bg-red-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shrink-0 shadow-md transition-all active:scale-95 flex items-center gap-1.5"
            >
              <Icon icon="solar:card-recive-bold" className="w-4 h-4" />
              Renew Subscription
            </button>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ====== MAIN CALENDAR CONTAINER ====== */}
          <div className="flex-1 w-full bg-white dark:bg-[#09314F]/40 dark:backdrop-blur-md rounded-2xl md:rounded-3xl border border-gray-100 dark:border-[#1a4a75]/30 shadow-sm overflow-hidden flex flex-col min-h-[75vh]">
            
            {/* ====== DESKTOP HEADER & VIEW SWITCHER (lg+) ====== */}
            <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-100 dark:border-[#1a4a75]/30">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-extrabold text-[#09314F] dark:text-white capitalize">
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-black/20 p-1 rounded-xl border border-gray-100 dark:border-[#1a4a75]/30">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-300 transition-all shadow-sm border border-transparent"
                  >
                    <ChevronLeftIcon />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-3 py-1 text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-300 transition-all shadow-sm border border-transparent"
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>

              {/* View Dropdown Selector */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#09314F] border border-gray-200 dark:border-[#1a4a75] rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-[#1a4a75]/50 transition-all"
                >
                  <span className="capitalize">{viewMode}</span>
                  <ChevronDownIcon />
                </button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-36 bg-white dark:bg-[#09314F] border border-gray-200 dark:border-[#1a4a75] rounded-xl shadow-lg z-30 overflow-hidden py-1">
                    {["month", "week", "day"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setViewMode(mode);
                          setDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold capitalize transition-colors ${
                          viewMode === mode 
                            ? "bg-gray-100 dark:bg-[#1a4a75] text-[#09314F] dark:text-white" 
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ====== MOBILE HEADER (lg hidden) ====== */}
            {!selectedMobileDate ? (
              <div className="flex lg:hidden items-center justify-between p-4 border-b border-gray-100 dark:border-[#1a4a75]/30">
                <h2 className="text-base font-extrabold text-[#09314F] dark:text-white capitalize">
                  {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h2>
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-black/20 p-1 rounded-xl border border-gray-100 dark:border-[#1a4a75]/30">
                  <button
                    onClick={handlePrev}
                    className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-300 transition-all"
                  >
                    <ChevronLeftIcon />
                  </button>
                  <button
                    onClick={handleToday}
                    className="px-2 py-1 text-[9px] font-black uppercase text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 rounded-lg transition-all"
                  >
                    Today
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-1.5 hover:bg-white dark:hover:bg-white/10 rounded-lg text-gray-500 dark:text-gray-300 transition-all"
                  >
                    <ChevronRightIcon />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex lg:hidden items-center gap-3 p-4 border-b border-gray-100 dark:border-[#1a4a75]/30 bg-gray-50/50 dark:bg-black/10">
                <button
                  onClick={() => setSelectedMobileDate(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-300 transition-all active:scale-95"
                >
                  <BackIcon />
                </button>
                <div>
                  <h3 className="text-sm font-extrabold text-[#09314F] dark:text-white">
                    {formatFullDate(selectedMobileDate)}
                  </h3>
                  <span className="text-[10px] text-gray-400 dark:text-blue-300 font-bold uppercase tracking-wide">
                    Day Timeline
                  </span>
                </div>
              </div>
            )}

            {/* ====== DESKTOP VIEWS ====== */}
            <div className="hidden lg:flex flex-col flex-1">
              
              {/* DESKTOP MONTH VIEW */}
              {viewMode === "month" && (
                <div className="flex flex-col flex-1">
                  {/* Days Header */}
                  <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#1a4a75]/30 bg-gray-50/50 dark:bg-black/10">
                    {DAYS_OF_WEEK.map((d, i) => (
                      <div key={i} className="py-2.5 text-center text-xs font-extrabold text-gray-500 dark:text-blue-200">
                        {d}
                      </div>
                    ))}
                  </div>
                  {/* Month Grid */}
                  <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-gray-100 dark:divide-[#1a4a75]/20 border-l border-t-0 border-gray-100 dark:border-[#1a4a75]/20 min-h-[500px]">
                    {monthDays.map(({ date, isCurrentMonth }, idx) => {
                      const daySessions = getSessionsForDate(date);
                      const isCurToday = isToday(date);
                      const isFocused = isSameDay(date, currentDate);

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setCurrentDate(date);
                            setSelectedDateModal(date);
                          }}
                          className={`p-2 flex flex-col gap-1 min-h-[90px] transition-all cursor-pointer relative group ${
                            !isCurrentMonth ? "bg-gray-50/30 dark:bg-black/5" : ""
                          } ${isFocused ? "bg-blue-50/20 dark:bg-blue-950/10" : "hover:bg-gray-50/50 dark:hover:bg-white/5"}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span
                              className={`text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full ${
                                isCurToday 
                                  ? "bg-[#C5A97A] text-white font-extrabold" 
                                  : isCurrentMonth
                                    ? "text-gray-700 dark:text-gray-200"
                                    : "text-gray-300 dark:text-gray-600"
                              }`}
                            >
                              {date.getDate()}
                            </span>
                            {daySessions.length > 0 && (
                              <span className="text-[10px] text-gray-400 dark:text-blue-300 font-bold">
                                {daySessions.length} {daySessions.length === 1 ? "class" : "classes"}
                              </span>
                            )}
                          </div>

                          {/* Sessions List */}
                          <div className="flex flex-col gap-1 overflow-y-auto max-h-[80px] pr-0.5">
                            {daySessions.slice(0, 3).map((s, sIdx) => {
                              const cancelled = isSessionCancelled(s);
                              const rescheduled = isSessionRescheduled(s);
                              const proposed = isSessionProposed(s);
                              const hasRec = hasSessionRecording(s);
                              const isPrivate = Boolean(s.is_private || s.class?.is_private);

                              return (
                                <button
                                  key={s.id || sIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!cancelled && !rescheduled) setSelectedSession(s);
                                  }}
                                  disabled={cancelled || rescheduled}
                                  className={`w-full text-left px-2 py-1 text-[10px] font-bold rounded border transition-opacity flex items-center justify-between gap-1 ${
                                    cancelled
                                      ? "bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 line-through opacity-75 cursor-not-allowed select-none"
                                      : rescheduled
                                      ? "bg-orange-50/70 text-orange-800 border-orange-300/80 border-dashed dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50 line-through opacity-75 cursor-not-allowed select-none"
                                      : isPrivate
                                      ? "bg-amber-50 text-amber-950 border-amber-400 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-500/70 shadow-2xs hover:opacity-90 ring-1 ring-amber-400/30"
                                      : proposed
                                      ? "bg-white text-amber-900 border-amber-400 dark:bg-[#09314F] dark:text-[#E5C378] dark:border-[#BFA15F] hover:opacity-85"
                                      : "bg-white text-emerald-900 border-emerald-500/80 dark:bg-[#09314F] dark:text-emerald-300 dark:border-emerald-500/60 hover:opacity-85"
                                  }`}
                                >
                                  <span className="truncate flex-1">{s.class?.title || s.title}</span>
                                  <div className="flex items-center gap-0.5 shrink-0">
                                    {isPrivate && !cancelled && !rescheduled && (
                                      <span className="text-[8px] font-black uppercase text-amber-800 dark:text-amber-200 px-1 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900/60 border border-amber-300/80 dark:border-amber-700">
                                        1:1
                                      </span>
                                    )}
                                    {cancelled && (
                                      <span className="text-[8px] font-black uppercase text-rose-600 dark:text-rose-400 no-underline">
                                        CAN
                                      </span>
                                    )}
                                    {rescheduled && !cancelled && (
                                      <span className="text-[8px] font-black uppercase text-orange-700 dark:text-orange-300 no-underline px-1 py-0.2 rounded bg-orange-100 dark:bg-orange-900/60 border border-orange-300/70">
                                        RESCHED
                                      </span>
                                    )}
                                    {proposed && !cancelled && !rescheduled && (
                                      <span className="text-[8px] font-black uppercase text-amber-700 dark:text-[#E5C378]">
                                        PROP
                                      </span>
                                    )}
                                    {hasRec && (
                                      <Icon icon="lucide:play-circle" className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400 shrink-0" title="Recording uploaded" />
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                            {daySessions.length > 3 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentDate(date);
                                  setViewMode("day");
                                }}
                                className="text-[9px] font-bold text-gray-400 dark:text-blue-400 hover:underline text-left mt-0.5 pl-1"
                              >
                                +{daySessions.length - 3} more
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* DESKTOP WEEK & DAY VIEWS (Hourly Grid) */}
              {(viewMode === "week" || viewMode === "day") && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Grid Headers */}
                  <div className={`grid ${viewMode === "day" ? "grid-cols-[80px_1fr]" : "grid-cols-[80px_repeat(7,1fr)]"} border-b border-gray-100 dark:border-[#1a4a75]/30 bg-gray-50/50 dark:bg-black/10`}>
                    <div className="py-3 text-center text-[10px] font-black uppercase text-gray-400 dark:text-blue-300 border-r border-gray-100 dark:border-[#1a4a75]/30">
                      Time
                    </div>
                    {viewMode === "day" ? (
                      <div className="p-3 text-center transition-all bg-[#09314F]/10 dark:bg-[#09314F]/40">
                        <div className="text-xs font-extrabold text-[#09314F] dark:text-white uppercase">
                          {currentDate.toLocaleDateString("en-US", { weekday: "long" })}
                        </div>
                        <div className="text-lg font-black text-[#09314F] dark:text-white mt-0.5">
                          {currentDate.getDate()} {currentDate.toLocaleDateString("default", { month: "long" })}
                        </div>
                      </div>
                    ) : (
                      weekDays.map((date, idx) => {
                        const curToday = isToday(date);
                        return (
                          <div
                            key={idx}
                            onClick={() => setCurrentDate(date)}
                            className={`p-2.5 text-center border-r border-gray-100 dark:border-[#1a4a75]/30 last:border-0 cursor-pointer hover:bg-gray-100/30 transition-all ${
                              curToday ? "bg-[#09314F]/5 dark:bg-[#09314F]/30" : ""
                            }`}
                          >
                            <div className="text-[10px] font-bold text-gray-400 dark:text-blue-200 uppercase">
                              {date.toLocaleDateString("en-US", { weekday: "short" })}
                            </div>
                            <div className={`text-sm font-extrabold mt-0.5 ${
                              curToday ? "text-[#C5A97A] dark:text-blue-400" : "text-gray-700 dark:text-gray-200"
                            }`}>
                              {date.getDate()}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Hourly Scrollable Area */}
                  <div ref={calendarScrollRef} className="flex-1 overflow-y-auto max-h-[60vh] divide-y divide-gray-100 dark:divide-[#1a4a75]/10">
                    {HOURS.map((hour) => (
                      <div key={hour} id={`hour-row-${hour}`} className={`grid ${viewMode === "day" ? "grid-cols-[80px_1fr]" : "grid-cols-[80px_repeat(7,1fr)]"} min-h-[64px]`}>
                        {/* Hour label */}
                        <div className="p-2 text-[10px] font-bold text-gray-400 dark:text-blue-300 uppercase flex items-start justify-center pt-3 border-r border-gray-100 dark:border-[#1a4a75]/30 bg-gray-50/10 dark:bg-black/5">
                          {formatHour(hour)}
                        </div>

                        {/* Day Cell grids */}
                        {viewMode === "day" ? (
                          <div className="p-1 relative border-r border-gray-100 dark:border-[#1a4a75]/10 bg-white dark:bg-transparent flex flex-col gap-1">
                            {getSessionsForDateAndHour(currentDate, hour).map((s, sIdx) => {
                              const cancelled = isSessionCancelled(s);
                              const rescheduled = isSessionRescheduled(s);
                              const proposed = isSessionProposed(s);
                              const hasRec = hasSessionRecording(s);
                              const isPrivate = Boolean(s.is_private || s.class?.is_private);

                              return (
                                <button
                                  key={s.id || sIdx}
                                  onClick={() => (!cancelled && !rescheduled) && setSelectedSession(s)}
                                  disabled={cancelled || rescheduled}
                                  className={`w-full text-left p-2.5 rounded-xl border shadow-sm transition-all ${
                                    cancelled
                                      ? "bg-rose-50/90 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 opacity-80 cursor-not-allowed select-none line-through"
                                      : rescheduled
                                      ? "bg-orange-50/70 text-orange-800 border-orange-300/80 border-dashed dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50 opacity-80 cursor-not-allowed select-none line-through"
                                      : isPrivate
                                      ? "bg-amber-50/90 text-amber-950 border-amber-400 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-500/70 hover:shadow-md cursor-pointer ring-1 ring-amber-400/30"
                                      : proposed
                                      ? "bg-white text-amber-900 border-amber-400 dark:bg-[#09314F] dark:text-[#E5C378] dark:border-[#BFA15F] hover:shadow-md cursor-pointer"
                                      : "bg-white text-emerald-900 border-emerald-500/80 dark:bg-[#09314F] dark:text-emerald-300 dark:border-emerald-500/60 hover:shadow-md cursor-pointer"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-extrabold truncate ${cancelled || rescheduled ? "line-through opacity-75" : ""}`}>{s.class?.title || s.title}</span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {isPrivate && !cancelled && !rescheduled && (
                                        <span className="text-[9px] font-black uppercase text-white px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 shadow-2xs">
                                          1-on-1
                                        </span>
                                      )}
                                      <ClassSessionStatusBadge session={s} size="xs" showScheduled={false} />
                                    </div>
                                  </div>
                                  {s.starts_at && (
                                    <div className="text-[9px] opacity-80 mt-1 font-semibold flex items-center justify-between">
                                      <span>{formatTimeRange(s.starts_at, s.ends_at)}</span>
                                      {hasRec && (
                                        <span className="flex items-center gap-0.5 text-purple-600 dark:text-purple-400 font-bold">
                                          <Icon icon="lucide:play-circle" className="w-3 h-3" /> Recording
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          weekDays.map((date, idx) => {
                            const curToday = isToday(date);
                            const cellSessions = getSessionsForDateAndHour(date, hour);
                            return (
                              <div
                                key={idx}
                                className={`p-0.5 relative border-r border-gray-100 dark:border-[#1a4a75]/10 last:border-0 flex flex-col gap-1 ${
                                  curToday ? "bg-blue-50/10 dark:bg-white/5" : ""
                                }`}
                              >
                                {cellSessions.map((s, sIdx) => {
                                  const cancelled = isSessionCancelled(s);
                                  const rescheduled = isSessionRescheduled(s);
                                  const proposed = isSessionProposed(s);
                                  const hasRec = hasSessionRecording(s);
                                  const isPrivate = Boolean(s.is_private || s.class?.is_private);

                                  return (
                                    <button
                                      key={s.id || sIdx}
                                      onClick={() => (!cancelled && !rescheduled) && setSelectedSession(s)}
                                      disabled={cancelled || rescheduled}
                                      className={`w-full text-left p-1 text-[9px] font-bold rounded border truncate transition-all flex items-center justify-between gap-1 ${
                                        cancelled
                                          ? "opacity-75 line-through bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 cursor-not-allowed select-none"
                                          : rescheduled
                                          ? "opacity-75 line-through bg-orange-50/70 border-orange-300/80 border-dashed text-orange-800 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800/50 cursor-not-allowed select-none"
                                          : isPrivate
                                          ? "bg-amber-50 border-amber-400 text-amber-950 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-500/70 hover:opacity-90 ring-1 ring-amber-400/30"
                                          : proposed
                                          ? "bg-white border-amber-400 text-amber-900 dark:bg-[#09314F] dark:text-[#E5C378] dark:border-[#BFA15F] hover:opacity-90"
                                          : "bg-white border-emerald-400 text-emerald-900 dark:bg-[#09314F] dark:text-emerald-300 dark:border-emerald-500/60 hover:opacity-90"
                                      }`}
                                    >
                                      <span className="truncate flex-1">{s.class?.title || s.title}</span>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        {isPrivate && !cancelled && !rescheduled && (
                                          <span className="text-[8px] font-black text-amber-800 dark:text-amber-200 px-1 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900/60 border border-amber-300/80 uppercase">
                                            1:1
                                          </span>
                                        )}
                                        {cancelled && <span className="text-[8px] font-black text-rose-600 uppercase">CAN</span>}
                                        {rescheduled && !cancelled && <span className="text-[8px] font-black text-orange-700 dark:text-orange-300 uppercase">RESCHED</span>}
                                        {proposed && !cancelled && !rescheduled && <span className="text-[8px] font-black text-amber-700 dark:text-[#E5C378] uppercase">PROP</span>}
                                        {hasRec && <Icon icon="lucide:play-circle" className="w-2.5 h-2.5 text-purple-600 shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ====== MOBILE VIEWS (lg hidden) ====== */}
            <div className="flex lg:hidden flex-col flex-1">
              
              {/* MOBILE MONTH GRID (Default) */}
              {!selectedMobileDate ? (
                <div className="flex flex-col flex-1">
                  {/* Weekday headers */}
                  <div className="grid grid-cols-7 border-b border-gray-100 dark:border-[#1a4a75]/30 bg-gray-50/50 dark:bg-black/10">
                    {DAYS_OF_WEEK.map((d, i) => (
                      <div key={i} className="py-2 text-center text-[10px] font-bold text-gray-500 dark:text-blue-200">
                        {d[0]}
                      </div>
                    ))}
                  </div>

                  {/* 42-cell Month Grid */}
                  <div className="grid grid-cols-7 grid-rows-6 flex-1 divide-x divide-y divide-gray-100 dark:divide-[#1a4a75]/10 border-l border-t-0 border-gray-100 dark:border-[#1a4a75]/10 min-h-[380px]">
                    {monthDays.map(({ date, isCurrentMonth }, idx) => {
                      const daySessions = getSessionsForDate(date);
                      const curToday = isToday(date);
                      const isFocused = isSameDay(date, currentDate);

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setCurrentDate(date);
                            setSelectedMobileDate(date);
                          }}
                          className={`p-1 flex flex-col justify-between items-center min-h-[65px] transition-all relative ${
                            !isCurrentMonth ? "bg-gray-50/20 dark:bg-black/5" : ""
                          } ${isFocused ? "bg-blue-50/30 dark:bg-blue-950/20" : ""}`}
                        >
                          <span
                            className={`text-xs font-bold h-6 w-6 flex items-center justify-center rounded-full mt-0.5 ${
                              curToday 
                                ? "bg-[#C5A97A] text-white font-extrabold" 
                                : isCurrentMonth
                                  ? "text-gray-700 dark:text-gray-200"
                                  : "text-gray-300 dark:text-gray-650"
                            }`}
                          >
                            {date.getDate()}
                          </span>

                          {/* Event indicator dots */}
                          <div className="flex gap-0.5 justify-center flex-wrap max-w-full pb-1">
                            {daySessions.slice(0, 3).map((s, sIdx) => {
                              const cancelled = isSessionCancelled(s);
                              const proposed = isSessionProposed(s);
                              const dotColor = cancelled ? "bg-rose-500" : proposed ? "bg-amber-500" : "bg-emerald-500";
                              return (
                                <span
                                  key={sIdx}
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`}
                                />
                              );
                            })}
                            {daySessions.length > 3 && (
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                
                /* MOBILE DAY TIMELINE (Drilldown View) */
                <div className="flex-1 flex flex-col bg-white dark:bg-transparent min-h-[400px]">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-16 flex-1">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#09314F] dark:border-white" />
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto max-h-[55vh] p-4 space-y-4">
                      {getSessionsForDate(selectedMobileDate).length > 0 ? (
                        getSessionsForDate(selectedMobileDate).map((s, sIdx) => {
                          const cardStyles = getSessionCardStyles(s);
                          const cancelled = isSessionCancelled(s);
                          const isPrivate = Boolean(
                            s.is_private === true || 
                            s.is_private === 1 || 
                            s.is_private === "1" || 
                            s.is_private === "true" || 
                            s.class?.is_private === true || 
                            s.class?.is_private === 1 || 
                            s.class?.is_private === "1" || 
                            s.class?.is_private === "true" || 
                            s.private_student_id || 
                            s.class?.private_student_id
                          );
                          return (
                            <div
                              key={s.id || sIdx}
                              onClick={() => !cancelled && setSelectedSession(s)}
                              className={`flex flex-col p-4 rounded-2xl border ${cardStyles.cardBg} ${cardStyles.cardBorder} shadow-sm transition-all ${
                                cancelled ? "cursor-not-allowed opacity-80" : "active:scale-[0.98] cursor-pointer"
                              } ${
                                isPrivate && !cancelled
                                  ? "border-amber-400 dark:border-amber-500/70 bg-gradient-to-br from-amber-500/[0.06] to-transparent ring-1 ring-amber-400/20"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                                <SubjectBadge session={s} />
                                <ClassSessionStatusBadge session={s} size="xs" showScheduled={false} />
                              </div>
                              <h4 className={`text-sm font-extrabold leading-snug ${cardStyles.titleClass}`}>
                                {s.class?.title || s.title || "Master Class"}
                              </h4>
                              {s.starts_at && (
                                <p className={`text-xs font-semibold mt-1.5 flex items-center gap-1.5 ${cardStyles.timeText}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cancelled ? "bg-rose-500" : cardStyles.isProposed || isPrivate ? "bg-amber-500" : "bg-emerald-500"}`} />
                                  {formatTimeRange(s.starts_at, s.ends_at)}
                                </p>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                          <p className="text-sm font-bold text-gray-400 dark:text-gray-500">
                            No classes scheduled for this day
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ====== DAY SCHEDULES POPUP GRID MODAL ====== */}
      {selectedDateModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#09314F] border border-gray-100 dark:border-white/10 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl relative flex flex-col max-h-[85vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10 mb-6">
              <div>
                <h2 className="text-lg md:text-xl font-extrabold text-[#09314F] dark:text-white flex items-center gap-2">
                  <Icon icon="lucide:calendar" className="w-5 h-5 text-amber-500" />
                  {selectedDateModal.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </h2>
                <p className="text-xs font-bold text-gray-400 dark:text-blue-300 mt-1">
                  {getSessionsForDate(selectedDateModal).length} {getSessionsForDate(selectedDateModal).length === 1 ? "Class Session" : "Class Sessions"} Scheduled
                </p>
              </div>
              <button
                onClick={() => setSelectedDateModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
              >
                <Icon icon="lucide:x" className="w-5 h-5" />
              </button>
            </div>

            {/* Grid of Cards */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 custom-scrollbar">
              {getSessionsForDate(selectedDateModal).length > 0 ? (
                getSessionsForDate(selectedDateModal).map((s, idx) => {
                  const cardStyles = getSessionCardStyles(s);
                  const past = isPastSession(s);
                  const cancelled = isSessionCancelled(s);
                  const isPrivate = Boolean(
                    s.is_private === true || 
                    s.is_private === 1 || 
                    s.is_private === "1" || 
                    s.is_private === "true" || 
                    s.class?.is_private === true || 
                    s.class?.is_private === 1 || 
                    s.class?.is_private === "1" || 
                    s.class?.is_private === "true" || 
                    s.private_student_id || 
                    s.class?.private_student_id
                  );
                  const privEnrollment = s.private_enrollment || s.class?.private_enrollment || s.class?.privateEnrollment || null;
                  const isFreeGrant = privEnrollment?.payment_method === "free_grant" || privEnrollment?.amount_paid === 0;
                  const tutorName = s.tutor?.name || 
                    s.tutor_name || 
                    s.staff?.name || 
                    s.class?.staffs?.[0]?.name || 
                    (s.class?.staffs?.[0]?.firstname ? `${s.class.staffs[0].firstname} ${s.class.staffs[0].surname || ''}`.trim() : null);
                  const recUrl = s.recording_link || s.recording_url || s.recorded_url || s.video_url;

                  return (
                    <div
                      key={s.id || idx}
                      onClick={() => {
                        if (!cancelled) {
                          setSelectedDateModal(null);
                          setSelectedSession(s);
                        }
                      }}
                      className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm transition-all space-y-4 ${cardStyles.cardBg} ${cardStyles.cardBorder} ${
                        cancelled
                          ? "cursor-not-allowed opacity-85 select-none"
                          : `${cardStyles.cardHover} cursor-pointer`
                      } ${
                        isPrivate && !cancelled
                          ? "border-amber-400 dark:border-amber-500/70 bg-gradient-to-br from-amber-500/[0.06] to-transparent ring-1 ring-amber-400/20"
                          : ""
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <SubjectBadge session={s} />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isFreeGrant && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                <Icon icon="mdi:gift-outline" className="w-3 h-3" />
                                <span>Free Grant</span>
                              </span>
                            )}
                            <ClassSessionStatusBadge session={s} size="xs" showScheduled={true} />
                          </div>
                        </div>
                        
                        <h3 className={`text-base font-extrabold leading-snug ${cardStyles.titleClass}`}>
                          {s.class?.title || s.title || "Master Class"}
                        </h3>

                        {/* Dedicated 1-on-1 info pill */}
                        {isPrivate && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 dark:border-amber-500/20 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                                <Icon icon="mdi:account-school" className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block leading-tight">
                                  Dedicated Coaching
                                </span>
                                {tutorName && (
                                  <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 truncate block">
                                    {tutorName}
                                  </span>
                                )}
                              </div>
                            </div>
                            {privEnrollment && (
                              <span className="shrink-0 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-100 text-[10px] font-black tracking-wider uppercase border border-amber-400/40">
                                {privEnrollment.sessions_completed || 0}/{privEnrollment.session_quota || 7} Done
                              </span>
                            )}
                          </div>
                        )}

                        {s.starts_at && (
                          <div className={`flex items-center gap-1.5 text-xs font-semibold mt-2 ${isPrivate ? "text-amber-700 dark:text-amber-300" : cardStyles.timeText}`}>
                            <Icon icon="lucide:clock" className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatTimeRange(s.starts_at, s.ends_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-black/5 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                        {cancelled ? (
                          <div className={cardStyles.actionButtonClass}>
                            Session Cancelled
                          </div>
                        ) : past ? (
                          recUrl ? (
                            <button
                              onClick={() => handleWatchVideo(recUrl)}
                              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                            >
                              <Icon icon="lucide:play-circle" className="w-4 h-4" />
                              Watch Recorded Class
                            </button>
                          ) : (
                            <a
                              href="/student/recorded-classes"
                              className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                            >
                              <Icon icon="lucide:film" className="w-4 h-4" />
                              Recorded Classes
                            </a>
                          )
                        ) : (
                          (s.class_link || s.id) ? (
                            <button
                              onClick={() => {
                                setSelectedDateModal(null);
                                handleJoinClass(s);
                              }}
                              className={cardStyles.actionButtonClass}
                            >
                              <Icon icon="logos:zoom" className="w-4 h-4" />
                              <span>{isPrivate ? "Join Private Class Now" : "Join Class Now"}</span>
                            </button>
                          ) : (
                            <div className="text-center py-2 text-xs font-bold text-gray-400 dark:text-gray-500 italic">
                              Class Link Pending
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 py-12 text-center text-gray-400 dark:text-gray-500 font-bold text-sm">
                  No classes scheduled for this date.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedDateModal(null)}
                className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-gray-700 dark:text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ====== SESSION DETAIL MODAL (Preserved & Styled) ====== */}
      {selectedSession && (() => {
        const isPrivate = Boolean(
          selectedSession.is_private || 
          selectedSession.class?.is_private ||
          selectedSession.class?.private_student_id
        );
        const tutor = selectedSession.tutor?.name || 
          selectedSession.tutor_name || 
          selectedSession.class?.staffs?.[0]?.name || 
          (selectedSession.class?.staffs?.[0]?.firstname ? `${selectedSession.class.staffs[0].firstname} ${selectedSession.class.staffs[0].surname || ''}`.trim() : null) || 
          "Assigned Tutor";
        const subject = selectedSession.subject_name || selectedSession.subject?.name || selectedSession.class?.subject?.name || "General";
        const privEnrollment = selectedSession.private_enrollment || selectedSession.class?.private_enrollment || selectedSession.class?.privateEnrollment || null;

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
            <div className="relative bg-white dark:bg-[#09314F] rounded-3xl p-6 md:p-8 w-[90%] max-w-md shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 border border-gray-150 dark:border-[#1a4a75]">
              <div className="flex items-center gap-3.5 mb-4">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-sm ${
                  isPrivate
                    ? "bg-gradient-to-tr from-amber-600 to-[#0F2843] ring-2 ring-amber-400/40"
                    : "bg-[#09314F] dark:bg-black/20"
                }`}>
                  {isPrivate ? (
                    <Icon icon="mdi:account-school" className="w-5 h-5 text-amber-200" />
                  ) : (
                    getInitials(selectedSession.class?.title || selectedSession.title)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    {isPrivate && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-2xs">
                        Private 1-on-1
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
                      {subject}
                    </span>
                    <ClassSessionStatusBadge session={selectedSession} size="xs" showScheduled={true} />
                  </div>
                  <h3 className={`text-base font-extrabold text-[#09314F] dark:text-white leading-tight ${
                    isSessionCancelled(selectedSession) ? "line-through text-rose-700 dark:text-rose-400" : ""
                  }`}>
                    {selectedSession.class?.title || selectedSession.title || "Master Class"}
                  </h3>
                </div>
              </div>

              {/* Private 1-on-1 Banner */}
              {isPrivate && (
                <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border border-amber-400/40 dark:border-amber-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Icon icon="mdi:account-lock" className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200 block">
                        Private 1-on-1 Session
                      </span>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                        Dedicated Coaching
                      </span>
                    </div>
                  </div>
                  {privEnrollment && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 dark:text-amber-100 text-[10px] font-black tracking-wider uppercase border border-amber-400/40">
                      {privEnrollment.sessions_completed || 0}/{privEnrollment.session_quota || 7} Done
                    </span>
                  )}
                </div>
              )}

              {isSessionCancelled(selectedSession) && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                  <Icon icon="lucide:ban" className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>This session was cancelled by the academy. Classroom access is disabled.</span>
                </div>
              )}
              {isSessionProposed(selectedSession) && !isSessionCancelled(selectedSession) && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-900/60 flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <Icon icon="lucide:clock" className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>This class is proposed and tentative, but you can still join when it starts.</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-blue-300">Tutor:</span>
                  <span className="text-xs font-extrabold text-[#09314F] dark:text-white flex items-center gap-1.5">
                    <Icon icon="solar:user-bold" className="w-3.5 h-3.5 text-[#BB9E7F]" />
                    <span>{tutor}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-blue-300">Date:</span>
                  <span className="text-xs font-extrabold text-[#09314F] dark:text-white">
                    {selectedSession.session_date ? new Date(selectedSession.session_date).toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }) : "Scheduled Date"}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2">
                  <span className="text-xs font-bold text-gray-400 dark:text-blue-300">Time:</span>
                  <span className="text-xs font-extrabold text-[#09314F] dark:text-white">
                    {formatTimeRange(selectedSession.starts_at, selectedSession.ends_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2 gap-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-blue-300 shrink-0">Class Access:</span>
                  {isSessionCancelled(selectedSession) ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60">
                      <Icon icon="lucide:ban" className="w-3 h-3 text-rose-600" />
                      Session Cancelled
                    </span>
                  ) : selectedSession.class_link || selectedSession.id ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                      <Icon icon="lucide:shield-check" className="w-3 h-3 text-emerald-600" />
                      In-App Classroom Protected
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-500 italic">No link assigned</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-bold text-gray-400 dark:text-blue-300 shrink-0">Video Recording:</span>
                  {selectedSession.recording_link || selectedSession.recording_url ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                      <Icon icon="lucide:video" className="w-3 h-3 text-purple-600" />
                      Available In App
                    </span>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-500 italic">No video uploaded yet</span>
                  )}
                </div>
              </div>

              {/* Action button: Cancelled, Expired, Recorded Class if past, else Join Class */}
              <div className="mt-6 space-y-2.5">
                {isSessionCancelled(selectedSession) ? (
                  <div className="w-full py-3.5 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-extrabold rounded-xl text-center text-xs uppercase tracking-wider border border-rose-200 dark:border-rose-900">
                    Session Cancelled
                  </div>
                ) : isSessionRescheduled(selectedSession) ? (
                  <div className="w-full py-3.5 bg-orange-100/70 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 font-extrabold rounded-xl text-center text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-800">
                    Session Rescheduled to New Date
                  </div>
                ) : isSubscriptionExpired ? (
                  <button
                    onClick={() => {
                      setSelectedSession(null);
                      navigate('/student/payments');
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-[#E83831] to-red-600 text-white font-extrabold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                  >
                    <Icon icon="solar:lock-bold" className="w-4 h-4" />
                    Subscription Expired — Renew to Join
                  </button>
                ) : isPastSession(selectedSession) ? (
                  selectedSession.recording_link || selectedSession.recording_url ? (
                    <button
                      onClick={() => handleWatchVideo(selectedSession.recording_link || selectedSession.recording_url)}
                      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                    >
                      <Icon icon="lucide:play-circle" className="w-4 h-4" />
                      Watch Recorded Class
                    </button>
                  ) : (
                    <a
                      href="/student/recorded-classes"
                      className="w-full py-3.5 bg-purple-700 text-white font-extrabold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                    >
                      <Icon icon="lucide:film" className="w-4 h-4" />
                      Go to Recorded Classes
                    </a>
                  )
                ) : (
                  (selectedSession.class_link || selectedSession.id) && (
                    <button
                      onClick={() => {
                        const sessionToJoin = selectedSession;
                        setSelectedSession(null);
                        handleJoinClass(sessionToJoin);
                      }}
                      className="w-full py-3.5 bg-[#09314F] dark:bg-blue-600 text-white font-extrabold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md"
                    >
                      <Icon icon="logos:zoom" className="w-4 h-4" />
                      Join Class Now
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="mt-3 w-full py-2.5 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition-all text-xs uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
      {/* Optional: Add New Event Modal */}
      {/* <AddNewEventModal isOpen={...} onClose={...} /> */}

      <EmbeddedVideoModal 
        videoUrl={watchingVideoUrl} 
        videoId={watchingVideoId} 
        onClose={() => {
          setWatchingVideoUrl(null);
          setWatchingVideoId(null);
        }} 
      />
    </DashboardLayout>
  );
}
