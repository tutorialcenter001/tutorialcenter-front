import { useEffect, useLayoutEffect, useState, useMemo, useCallback, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import DashboardLayout from "../../components/private/Students/DashboardLayout.jsx";
import axios from "axios";
import { Icon } from "@iconify/react";
import { useNavigate } from "react-router-dom";
import EmbeddedVideoModal from "../../components/private/EmbeddedVideoModal.jsx";

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
const getAfricanDateYMD = (dateInput) => {
  if (!dateInput) return "";
  if (typeof dateInput === "string") {
    const rawDatePart = dateInput.split("T")[0].split(" ")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDatePart)) {
      return rawDatePart;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AFRICAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const HOURS = Array.from({ length: 24 }, (_, i) => i); // 0 to 23 (12 AM to 11 PM)

// Color scheme mapping
const COLORS = [
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800/50", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/50", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500" },
  { bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800/50", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800/50", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800/50", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500" },
];

const getClassColor = (title) => {
  if (!title) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

export default function StudentCalendar() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";

  const handleJoinClass = useCallback((s) => {
    if (!s) return;
    const link = s.class_link || s.recording_link;
    if (!link && !s.id) return;

    const isZoom = link ? (link.includes("zoom.us") || link.includes("zoom")) : true;
    if (isZoom && s.id) {
      navigate(`/classroom/${s.id}`);
    } else if (link) {
      window.open(link, '_blank');
      navigate('/student/meet', {
        state: {
          class_link: link,
          class_schedule_id: s.id,
          alreadyOpened: true
        }
      });
    }
  }, [navigate]);

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
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
    const list = [];
    if (Array.isArray(data)) return data; // if it's already a flat array
    
    const addSession = (s) => {
      if (!s) return;
      const isDuplicate = list.some(item => {
        if (s.id && item.id) return item.id === s.id;
        return item.title === s.title && item.session_date === s.session_date && item.starts_at === s.starts_at;
      });
      if (!isDuplicate) list.push(s);
    };

    if (data.next_class) addSession(data.next_class);
    if (Array.isArray(data.today_classes)) data.today_classes.forEach(addSession);
    if (data.week_schedule) {
      Object.values(data.week_schedule).forEach(sessionsArray => {
        if (Array.isArray(sessionsArray)) sessionsArray.forEach(addSession);
      });
    }
    if (Array.isArray(data.upcoming_sessions)) data.upcoming_sessions.forEach(addSession);
    if (Array.isArray(data.past_sessions)) data.past_sessions.forEach(addSession);
    if (Array.isArray(data.older_sessions)) data.older_sessions.forEach(addSession);
    if (Array.isArray(data.history)) data.history.forEach(addSession);
    if (Array.isArray(data.sessions)) data.sessions.forEach(addSession);
    
    return list;
  };

  // Fetch sessions
  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/students/class/schedule?all=true`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      console.log("📅 [StudentCalendar] Raw Class Schedule API Response:", res.data);
      const data = res.data?.data || res.data?.sessions || res.data?.schedule || res.data || [];
      console.log("📅 [StudentCalendar] Extracted Calendar Data Structure:", data);
      const flatList = getFlatSessions(data);
      console.log("📅 [StudentCalendar] Flattened Sessions List for Calendar:", flatList);
      setSessions(flatList);
    } catch (error) {
      console.error("Failed to fetch class schedule for calendar:", error);
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

  // Generate Month Grid Days (42 cells)
  const generateMonthDays = useCallback((baseDate) => {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
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

  // Generate Week Days (7 days)
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
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
      return getAfricanDateYMD(s.session_date) === targetYMD;
    });
  }, [sessions]);

  const getSessionsForDateAndHour = useCallback((date, hour) => {
    const targetYMD = getAfricanDateYMD(date);
    return sessions.filter((s) => {
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
                              const colors = getClassColor(s.class?.title || s.title);
                              return (
                                <button
                                  key={s.id || sIdx}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSession(s);
                                  }}
                                  className={`w-full text-left px-2 py-1 text-[10px] font-bold rounded border ${colors.bg} ${colors.border} ${colors.text} truncate hover:opacity-85 transition-opacity active:scale-[0.98]`}
                                >
                                  {s.class?.title || s.title}
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
                              {DAYS_OF_WEEK[date.getDay()]}
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
                              const colors = getClassColor(s.class?.title || s.title);
                              return (
                                <button
                                  key={s.id || sIdx}
                                  onClick={() => setSelectedSession(s)}
                                  className={`w-full text-left p-2.5 rounded-xl border ${colors.bg} ${colors.border} ${colors.text} shadow-sm transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer`}
                                >
                                  <div className="text-xs font-extrabold">{s.class?.title || s.title}</div>
                                  {s.starts_at && (
                                    <div className="text-[9px] opacity-80 mt-1 font-semibold">
                                      {formatTimeRange(s.starts_at, s.ends_at)}
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
                                  const colors = getClassColor(s.class?.title || s.title);
                                  return (
                                    <button
                                      key={s.id || sIdx}
                                      onClick={() => setSelectedSession(s)}
                                      className={`w-full text-left p-1 text-[9px] font-bold rounded border ${colors.bg} ${colors.border} ${colors.text} truncate hover:opacity-90 active:scale-[0.98] transition-all`}
                                    >
                                      {s.class?.title || s.title}
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
                              const colors = getClassColor(s.class?.title || s.title);
                              return (
                                <span
                                  key={sIdx}
                                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot}`}
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
                          const colors = getClassColor(s.class?.title || s.title);
                          return (
                            <div
                              key={s.id || sIdx}
                              onClick={() => setSelectedSession(s)}
                              className={`flex flex-col p-4 rounded-2xl border ${colors.bg} ${colors.border} ${colors.text} shadow-sm transition-all active:scale-[0.98] cursor-pointer`}
                            >
                              <h4 className="text-sm font-extrabold leading-snug">
                                {s.class?.title || s.title || "Master Class"}
                              </h4>
                              {s.starts_at && (
                                <p className="text-xs font-semibold opacity-95 mt-1.5 flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
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
                  const colors = getClassColor(s.class?.title || s.title);
                  const past = isPastSession(s);
                  const recUrl = s.recording_link || s.recording_url || s.recorded_url || s.video_url;

                  return (
                    <div
                      key={s.id || idx}
                      className={`p-5 rounded-2xl border ${colors.bg} ${colors.border} flex flex-col justify-between shadow-sm hover:shadow-md transition-all space-y-4`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${colors.text} bg-white/60 dark:bg-black/30 backdrop-blur-sm`}>
                            {s.subject || s.class?.title || "Class"}
                          </span>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            past ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          }`}>
                            {past ? "Ended" : "Scheduled"}
                          </span>
                        </div>
                        
                        <h3 className={`text-base font-extrabold leading-snug ${colors.text}`}>
                          {s.class?.title || s.title || "Master Class"}
                        </h3>

                        {s.starts_at && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold mt-2 opacity-90">
                            <Icon icon="lucide:clock" className="w-3.5 h-3.5 shrink-0" />
                            <span>{formatTimeRange(s.starts_at, s.ends_at)}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="pt-3 border-t border-black/5 dark:border-white/10">
                        {past ? (
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
                          s.class_link ? (
                            <button
                              onClick={() => {
                                setSelectedDateModal(null);
                                handleJoinClass(s);
                              }}
                              className="w-full py-2.5 px-4 bg-[#09314F] hover:bg-[#E83831] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                            >
                              <Icon icon="logos:zoom" className="w-4 h-4" />
                              Join Class Now
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
      {selectedSession && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedSession(null)} />
          <div className="relative bg-white dark:bg-[#09314F] rounded-3xl p-6 md:p-8 w-[90%] max-w-md shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200 border border-gray-150 dark:border-[#1a4a75]">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="w-11 h-11 rounded-full bg-[#09314F] dark:bg-black/20 flex items-center justify-center text-white font-extrabold text-sm shrink-0">
                {(selectedSession.class?.title || selectedSession.title || "MC").split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <h3 className="text-base font-extrabold text-[#09314F] dark:text-white leading-tight">
                {selectedSession.class?.title || selectedSession.title || "Master Class"}
              </h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2">
                <span className="text-xs font-bold text-gray-400 dark:text-blue-300">Date:</span>
                <span className="text-xs font-extrabold text-[#09314F] dark:text-white">
                  {new Date(selectedSession.session_date).toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2">
                <span className="text-xs font-bold text-gray-400 dark:text-blue-300">Time:</span>
                <span className="text-xs font-extrabold text-[#09314F] dark:text-white">
                  {formatTimeRange(selectedSession.starts_at, selectedSession.ends_at)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 dark:border-white/5 pb-2 gap-4">
                <span className="text-xs font-bold text-gray-400 dark:text-blue-300 shrink-0">Class Link:</span>
                {selectedSession.class_link ? (
                  <a
                    href={selectedSession.class_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 underline decoration-dotted underline-offset-4 hover:opacity-85 truncate"
                  >
                    {selectedSession.class_link}
                  </a>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-500 italic">No link yet</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-bold text-gray-400 dark:text-blue-300 shrink-0">Video Link:</span>
                {selectedSession.recording_link ? (
                  <a
                    href={selectedSession.recording_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 underline decoration-dotted underline-offset-4 hover:opacity-85 truncate"
                  >
                    {selectedSession.recording_link}
                  </a>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-gray-500 italic">No video uploaded yet</span>
                )}
              </div>
            </div>

            {/* Action button: Recorded Class if past, else Join Class */}
            <div className="mt-6">
              {isPastSession(selectedSession) ? (
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
                selectedSession.class_link && (
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
      )}
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
