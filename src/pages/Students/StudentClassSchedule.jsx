import React, { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import DashboardLayout from "../../components/private/Students/DashboardLayout";
import { useAuth } from "../../context/AuthContext";
import { 
  MagnifyingGlassIcon, 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  ChevronDownIcon, 
  ChevronUpIcon, 
  SignalIcon
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import ClassSessionStatusBadge, {
  isSessionCancelled,
  isSessionProposed,
  isSessionRescheduled,
  hasSessionRecording,
} from "../../components/common/ClassSessionStatusBadge.jsx";

export default function StudentClassSchedule() {
  const { token: authToken } = useAuth();
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const navigate = useNavigate();

  // --- STATE ---
  const [scheduleData, setScheduleData] = useState({
    next_class: null,
    next_classes: [],
    today_classes: [],
    week_schedule: {},
    upcoming_sessions: [],
    older_sessions: [],
    classes: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubscriptionExpired, setIsSubscriptionExpired] = useState(false);
  const [subscriptionExpiredMessage, setSubscriptionExpiredMessage] = useState("");
  
  // State
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Responsive Breakpoints
  const isHighRes = windowWidth >= 1800;
  const isMobile = windowWidth < 1024; // Where the grid stacks

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  
  // Collapse States
  const [isWeeklyOpen, setIsWeeklyOpen] = useState(true);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isOlderOpen, setIsOlderOpen] = useState(false);

  /* =============================
     FETCH STUDENT SCHEDULE
  ============================= */
  const fetchStudentSchedule = useCallback(async () => {
    if (!authToken) {
      console.warn("DEBUG: No student_token found in localStorage!");
      return;
    }
    
    setLoading(true);
    try {
      console.group("DEBUG: Student Class Schedule Fetching");
      setError(null);
      setIsSubscriptionExpired(false);
      const res = await axios.get(`${API_BASE_URL}/api/students/class/schedule`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: "application/json",
        },
      });

      const isExpired = Boolean(res.data?.subscription_expired);
      if (isExpired) {
        setIsSubscriptionExpired(true);
        setSubscriptionExpiredMessage(
          res.data?.message || "Your course subscription has expired. Please renew your training to access live masterclasses."
        );
      }

      const data = res.data?.data || res.data;
      const rawNext = Array.isArray(data.next_classes) && data.next_classes.length > 0
        ? data.next_classes
        : (data.next_class ? [data.next_class] : []);
      const nextClasses = rawNext.filter(s => !isSessionCancelled(s));

      setScheduleData({
        next_class: nextClasses[0] || null,
        next_classes: nextClasses,
        today_classes: (Array.isArray(data.today_classes) ? data.today_classes : []).filter(s => !isSessionCancelled(s)),
        week_schedule: data.week_schedule || {},
        upcoming_sessions: (Array.isArray(data.upcoming_sessions) ? data.upcoming_sessions : []).filter(s => !isSessionCancelled(s)),
        older_sessions: (Array.isArray(data.older_sessions) ? data.older_sessions : []).filter(s => !isSessionCancelled(s)),
        classes: (Array.isArray(data.classes) ? data.classes : []).filter(c => !isSessionCancelled(c))
      });
      console.log("Fetched Data:", data);
      console.groupEnd();
    } catch (err) {
      console.error("DEBUG: Failed to fetch student schedule", err);
      if (err.response?.status === 403 || err.response?.data?.subscription_expired) {
        setIsSubscriptionExpired(true);
        setSubscriptionExpiredMessage(
          err.response?.data?.message || "Your course subscription has expired. Please renew your training to access live masterclasses."
        );
      } else {
        setError(err.response?.data?.message || "Unable to load schedule at the moment.");
      }
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, authToken]);

  useEffect(() => {
    fetchStudentSchedule();
  }, [fetchStudentSchedule]);

  const filteredClasses = useMemo(() => {
    let list = Array.isArray(scheduleData.classes) ? [...scheduleData.classes] : [];
    list = list.filter(c => !isSessionCancelled(c));
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(c => {
        const title = (c.title || "").toLowerCase();
        const subject = (c.subject?.name || "").toLowerCase();
        const tutor = (c.staffs?.[0]?.name || c.staffs?.[0]?.firstname || "").toLowerCase();
        return title.includes(term) || subject.includes(term) || tutor.includes(term);
      });
    }
    return list.sort((a, b) => {
      const dateA = new Date(a.created_at || a.start_date || 0).getTime();
      const dateB = new Date(b.created_at || b.start_date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [scheduleData.classes, searchTerm]);

  const groupedSessions = useMemo(() => {
    // Flatten week_schedule object into an array if it has date keys
    const weeklyArray = Object.values(scheduleData.week_schedule).flat().filter(s => !isSessionCancelled(s));

    const todayDate = new Date().toISOString().substring(0, 10);
    let today = [...scheduleData.today_classes].filter(s => !isSessionCancelled(s));
    let weekly = [...weeklyArray];

    // Upcoming sessions beyond this week
    let upcoming = (scheduleData.upcoming_sessions || []).filter(s => {
      if (!s.session_date) return true;
      if (isSessionCancelled(s)) return false;
      const isPastOrToday = s.session_date <= todayDate;
      const isInWeekly = weekly.some(w => (w.id && w.id === s.id) || (w.session_date === s.session_date && w.starts_at === s.starts_at && w.title === s.title));
      return !isPastOrToday && !isInWeekly;
    });

    let older = [...scheduleData.older_sessions].filter(s => !isSessionCancelled(s));

    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matches = (s) => {
        const title = (s.title || s.class?.title || "").toLowerCase();
        const subject = (s.subject_name || s.subject?.name || "").toLowerCase();
        const tutorName = (s.tutor?.name || s.tutor_name || "").toLowerCase();
        return title.includes(term) || subject.includes(term) || tutorName.includes(term);
      };
      today = today.filter(matches);
      weekly = weekly.filter(matches);
      upcoming = upcoming.filter(matches);
      older = older.filter(matches);
    }

    // Sort sections by date/time (latest to oldest for upcoming/weekly)
    const sortByTime = (a, b) => (a.starts_at || "").localeCompare(b.starts_at || "");
    today.sort(sortByTime);
    weekly.sort((a,b) => (b.session_date || "").localeCompare(a.session_date || "") || (b.starts_at || "").localeCompare(a.starts_at || ""));
    upcoming.sort((a,b) => (b.session_date || "").localeCompare(a.session_date || "") || (b.starts_at || "").localeCompare(a.starts_at || ""));
    older.sort((a,b) => (b.session_date || "").localeCompare(a.session_date || "")); // Newest older first

    return { today, weekly, upcoming, older };
  }, [scheduleData, searchTerm]);

  /* =============================
     HELPERS
  ============================= */
  const getSessionStatus = (session) => {
    const now = new Date();
    const [startH, startM] = session.starts_at.split(':');
    const [endH, endM] = session.ends_at.split(':');
    
    const startTime = new Date();
    startTime.setHours(parseInt(startH), parseInt(startM), 0);
    
    const endTime = new Date();
    endTime.setHours(parseInt(endH), parseInt(endM), 0);

    if (now >= startTime && now <= endTime) return 'live';
    if (now < startTime) return 'upcoming';
    return 'completed';
  };

  const formatSessionDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: "long", month: "short", day: "numeric", year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "N/A";
    const [hour, minute] = time.split(":");
    const date = new Date();
    date.setHours(hour, minute);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const abbreviateTitle = (title) => {
    if (!title || !title.includes(" - ")) return title;
    const parts = title.split(" - ");
    const prefix = parts[0]; // JAMB, WAEC, etc.
    const subject = parts[1];
    
    // Split subject into words
    const words = subject.trim().split(/\s+/);
    
    if (words.length === 1) {
      // Single word -> first three letters
      return `${prefix} - ${words[0].substring(0, 3)}`;
    } else {
      // Multiple words -> acronym (first letter of each)
      const acronym = words.map(w => w[0]).join("");
      return `${prefix} - ${acronym}`;
    }
  };

  /* =============================
     UI COMPONENTS
  ============================= */
  
  const handleJoinClass = (e, sessionObj) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSubscriptionExpired) {
      navigate('/student/payments');
      return;
    }
    if (!sessionObj || !sessionObj.id) return;

    // Always join in the web classroom — no external redirects or option prompts
    if (authToken) {
      axios.post(
        `${API_BASE_URL}/api/students/classes/attendance/join`,
        { class_session_id: sessionObj.id },
        { headers: { Authorization: `Bearer ${authToken}`, Accept: "application/json" } }
      ).catch(() => {});
    }
    navigate(`/zoom/masterclass/class/${sessionObj.id}`);
  };

  // Helper: extract tutor info with fallbacks across session.tutor, session.tutor_name, and session.class.staffs
  const getTutorInfo = useCallback((session) => {
    if (!session) return { name: "Expert Tutor", avatarUrl: null, role: "Tutor", fallbackUrl: "https://ui-avatars.com/api/?name=Tutor&background=09314F&color=fff&bold=true" };

    let name = null;
    let avatarPath = null;
    let role = "Tutor";

    // 1. Direct tutor object on session
    if (session.tutor && typeof session.tutor === "object") {
      name = session.tutor.name || 
        (session.tutor.firstname ? `${session.tutor.firstname} ${session.tutor.surname || ''}`.trim() : null);
      avatarPath = session.tutor.avatar || session.tutor.profile_picture || null;
      role = session.tutor.role || "Tutor";
    }

    // 2. Direct tutor_name string on session
    if ((!name || name === "Tutorial Center Tutor") && session.tutor_name && session.tutor_name !== "Tutorial Center Tutor") {
      name = session.tutor_name;
    }

    // 3. From session.class.staffs
    const staffs = session.class?.staffs;
    if ((!name || name === "Tutorial Center Tutor") && Array.isArray(staffs) && staffs.length > 0) {
      const staff = staffs.find(s => {
        const r = (s.role || '').toLowerCase();
        return r === 'lead' || r === 'tutor';
      }) || staffs[0];

      if (staff) {
        name = staff.name || `${staff.firstname || ''} ${staff.surname || ''}`.trim();
        avatarPath = avatarPath || staff.profile_picture || staff.avatar || null;
        role = staff.role || role;
      }
    }

    const finalName = (name && name !== "Tutorial Center Tutor") ? name : "Expert Tutor";
    let avatarUrl = null;
    if (avatarPath) {
      avatarUrl = avatarPath.startsWith("http") ? avatarPath : `${API_BASE_URL}/storage/${avatarPath}`;
    }

    return {
      name: finalName,
      avatarUrl,
      role: role ? (role.charAt(0).toUpperCase() + role.slice(1)) : "Tutor",
      fallbackUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(finalName)}&background=09314F&color=fff&bold=true`
    };
  }, [API_BASE_URL]);

  const ClassRow = ({ session, isToday }) => {
    const isExpanded = expandedSessionId === session.id;
    const status = isToday ? getSessionStatus(session) : null;
    const tutor = getTutorInfo(session);
    
    return (
      <div 
        onClick={() => {
          if (isHighRes || isMobile) return; // No expansion needed on high-res or mobile stack
          setExpandedSessionId(isExpanded ? null : session.id);
        }}
        className={`relative flex flex-col bg-white dark:bg-[#09314F]/50 dark:backdrop-blur-md rounded-2xl sm:rounded-3xl md:rounded-[40px] border border-gray-100 dark:border-white/10 shadow-sm transition-all cursor-pointer group mb-4 sm:mb-6 select-none overflow-hidden ${
          isHighRes || isMobile
            ? "hover:translate-y-[-1px] hover:shadow-md" 
            : isExpanded 
              ? "ring-2 ring-[#BB9E7F]/20 scale-[1.01] -translate-y-1 py-2 hover:shadow-xl dark:ring-[#BB9E7F]/40" 
              : "hover:translate-y-[-2px] hover:shadow-xl"
        }`}
      >
        {/* FLOATING POP-OUT AVATAR (Visible ONLY at exactly 1024px-1279px / lg) */}
        {!isExpanded && (
          <div className="hidden lg:flex xl:hidden absolute -top-5 -left-5 w-16 h-16 bg-white dark:bg-[#09314F] rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] border border-gray-50 dark:border-[#09314F] items-center justify-center z-[25] transition-all group-hover:scale-110 group-hover:-rotate-3">
             <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#BB9E7F]/30 group-hover:border-[#BB9E7F] transition-all bg-gray-50 flex items-center justify-center">
                <img 
                  src={tutor.avatarUrl || tutor.fallbackUrl}
                  className="w-full h-full object-cover"
                  alt={tutor.name}
                  onError={(e) => { e.target.src = tutor.fallbackUrl; }}
                />
             </div>
          </div>
        )}

        {/* COMPACT VIEW (Normal Row) */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 items-center gap-y-4 sm:gap-y-6 lg:gap-3 xl:gap-4 px-4 sm:px-6 md:px-8 py-4 sm:py-6 transition-all ${(!isHighRes && !isMobile) && isExpanded ? "opacity-30 grayscale blur-[1px]" : ""}`}>
          {/* Title Column */}
          <div className="flex items-center gap-3 sm:gap-4 col-span-1 lg:pl-6 xl:pl-0 min-w-0">
            <div className="relative shrink-0 lg:hidden xl:flex">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-50 border-2 border-[#BB9E7F]/30 group-hover:border-[#BB9E7F] transition-all flex items-center justify-center">
                <img 
                  src={tutor.avatarUrl || tutor.fallbackUrl}
                  className="w-full h-full object-cover"
                  alt={tutor.name}
                  onError={(e) => { e.target.src = tutor.fallbackUrl; }}
                />
              </div>
              {status === 'live' && <span className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-[#22C55E] border-2 border-white rounded-full shadow-sm animate-pulse"></span>}
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`font-black leading-tight uppercase truncate ${
                isSessionCancelled(session)
                  ? "line-through text-rose-700 dark:text-rose-400"
                  : isSessionRescheduled(session)
                  ? "text-amber-700 dark:text-amber-400"
                  : "text-black dark:text-white"
              } ${isHighRes || isMobile ? "text-[15px] sm:text-[16px]" : "text-[14px] sm:text-[15px]"}`}>
                {isHighRes || isMobile
                  ? (session.class?.title || session.title || "Master Class")
                  : abbreviateTitle(session.class?.title || session.title || "Master Class")
                }
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {Boolean(session.is_private || session.class?.is_private) && (
                  <span className="px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs">
                    Private 1-on-1
                  </span>
                )}
                <ClassSessionStatusBadge session={session} size="xs" showScheduled={false} />
                {isToday && status !== 'completed' && !isSessionCancelled(session) && !isSessionRescheduled(session) && (
                  status === 'live' ? (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100 italic">
                      <SignalIcon className="w-3.5 h-3.5 animate-pulse" /> LIVE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100 italic">
                      UPCOMING
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
          
          {/* Instructor Column */}
          <div className="text-left sm:text-center min-w-0">
            <span className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest block mb-0.5 sm:mb-1 opacity-80">Tutor</span>
            <span className="text-[13px] font-black text-black dark:text-white truncate block">
              {tutor.name}
            </span>
          </div>

          {/* Action Column */}
          <div className="text-left lg:text-center min-w-0 flex flex-col items-start lg:items-center">
            <span className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest block mb-0.5 sm:mb-1 opacity-80">Session</span>
            {isSessionCancelled(session) ? (
              <span className="inline-flex items-center px-2.5 py-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 text-[11px] font-black rounded-lg uppercase tracking-wider">
                Cancelled
              </span>
            ) : isSessionRescheduled(session) ? (
              <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-black rounded-lg uppercase tracking-wider">
                Rescheduled
              </span>
            ) : isSubscriptionExpired ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/student/payments');
                }}
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-extrabold rounded-lg transition-all shadow-xs active:scale-95"
                title="Subscription expired. Click to renew."
              >
                <Icon icon="solar:lock-bold" className="w-3.5 h-3.5" />
                <span>Renew</span>
              </button>
            ) : (session.recording_link || hasSessionRecording(session)) ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinClass(e, session);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-extrabold rounded-lg transition-all shadow-xs active:scale-95"
              >
                <Icon icon="lucide:play-circle" className="w-3.5 h-3.5" />
                <span>Watch</span>
              </button>
            ) : (session.class_link || session.id) ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleJoinClass(e, session);
                }}
                className={`inline-flex items-center gap-1 px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all shadow-xs active:scale-95 ${
                  status === 'live'
                    ? "bg-[#22C55E] hover:bg-[#16a34a] text-white animate-pulse"
                    : isSessionProposed(session)
                    ? "bg-[#8C5E24] hover:bg-[#A87431] text-white"
                    : "bg-[#09314F] hover:bg-[#062035] text-white dark:bg-[#BB9E7F] dark:hover:bg-white dark:text-[#09314F]"
                }`}
              >
                <Icon icon="lucide:video" className="w-3.5 h-3.5" />
                <span>{status === 'live' ? "Join Live" : "Join Class"}</span>
              </button>
            ) : (
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 italic">
                Awaiting
              </span>
            )}
          </div>

          {/* Time Column */}
          <div className="text-left sm:text-center min-w-0">
            <span className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest block mb-0.5 sm:mb-1 opacity-80">Time</span>
            <div className="flex items-center sm:justify-center gap-1.5 text-black dark:text-white font-black text-[13px] sm:text-[14px]">
              <ClockIcon className="w-4 h-4 text-[#BB9E7F]" />
              <span>{formatTime(session.starts_at)}</span>
            </div>
          </div>

          {/* Date Column */}
          <div className="text-left sm:text-center min-w-0">
            <span className="text-[11px] font-black text-black dark:text-white uppercase tracking-widest block mb-0.5 sm:mb-1 opacity-80">Date</span>
            <div className="flex items-center sm:justify-center gap-1.5 text-black dark:text-white font-black text-[13px] sm:text-[14px]">
              <CalendarIcon className="w-4 h-4 text-[#BB9E7F]" />
              <span>{new Date(session.session_date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* EXPANDED VIEW (Info Card) */}
        {!isHighRes && !isMobile && isExpanded && (
          <div className="w-full bg-white dark:bg-[#09314F]/80 dark:backdrop-blur-md p-6 sm:p-8 md:p-10 flex flex-col justify-between animate-in fade-in zoom-in-95 duration-300 border-t border-gray-100 dark:border-white/10 mt-2 rounded-b-2xl sm:rounded-b-3xl md:rounded-b-[40px]">
            <div className="flex flex-wrap gap-6 sm:gap-8">
               <div className="flex items-center gap-6 sm:gap-8 flex-1 min-w-[260px]">
                 <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl overflow-hidden bg-gray-50 border-2 border-[#BB9E7F]/30 p-1 shadow-lg flex items-center justify-center">
                    <img 
                      src={tutor.avatarUrl || tutor.fallbackUrl}
                      className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                      alt={tutor.name}
                      onError={(e) => { e.target.src = tutor.fallbackUrl; }}
                    />
                 </div>
                 <div className="flex flex-col min-w-0">
                   <span className="px-3 py-1 bg-[#BB9E7F] text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-2 sm:mb-3 self-start shadow-sm">Full Session Details</span>
                   <h3 className="text-xl sm:text-2xl font-black italic uppercase tracking-tighter text-black dark:text-white leading-none mb-2 truncate">
                     {session.class?.title || session.title || "Master Class Session"}
                   </h3>
                   <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-black dark:text-white font-bold text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-[#BB9E7F]" />
                        <span className="text-black dark:text-white font-extrabold">{tutor.name}</span>
                      </div>
                      <div className="hidden lg:block w-1.5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="w-4 h-4 text-[#BB9E7F]" />
                        <span>{formatTime(session.starts_at)} - {formatTime(session.ends_at)}</span>
                      </div>
                   </div>
                 </div>
               </div>

               <div className="flex flex-col gap-3 flex-1 min-w-[240px]">
                 <div className="w-full">
                    <span className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.2em] mb-1 block opacity-80">Classroom Access</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-extrabold shadow-xs">
                        <Icon icon="lucide:shield-check" className="w-4 h-4 text-emerald-600" />
                        In-App Secure Classroom · Link Masked
                      </span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 text-black dark:text-white font-black text-[12px] uppercase tracking-widest mt-2">
                    <CalendarIcon className="w-4 h-4 text-[#BB9E7F]" />
                    <span>{formatSessionDate(session.session_date)}</span>
                 </div>
               </div>
             </div>

             <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-4">
                <p className="hidden lg:block text-[11px] font-black text-black dark:text-white uppercase tracking-[0.3em] opacity-60">
                  Click anywhere to close full view
                </p>
                <div className="flex items-center gap-4 w-full">
                  {isSessionCancelled(session) ? (
                    <div className="flex-1 px-8 py-4 sm:px-10 sm:py-5 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-black rounded-2xl border border-rose-200 dark:border-rose-900 uppercase tracking-widest text-[11px] text-center">
                      Session Cancelled by Academy
                    </div>
                  ) : isSessionRescheduled(session) ? (
                    <div className="flex-1 px-8 py-4 sm:px-10 sm:py-5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-black rounded-2xl border border-amber-200 dark:border-amber-900 uppercase tracking-widest text-[11px] text-center">
                      Session Rescheduled by Academy
                    </div>
                  ) : isSubscriptionExpired ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/student/payments');
                      }}
                      className="flex-1 px-8 py-4 sm:px-10 sm:py-5 bg-gradient-to-r from-[#E83831] to-red-600 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[11px] text-center flex items-center justify-center gap-2"
                    >
                      <Icon icon="solar:lock-bold" className="w-4 h-4" />
                      Subscription Expired — Renew Training
                    </button>
                  ) : (
                    <button 
                      onClick={(e) => handleJoinClass(e, session)}
                      className={`flex-1 px-8 py-4 sm:px-10 sm:py-5 text-white font-black rounded-2xl transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[11px] text-center ${
                        isSessionProposed(session) ? "bg-[#8C5E24] hover:bg-[#734A1B]" : "bg-[#09314F] hover:bg-black"
                      }`}
                    >
                      Join Now
                    </button>
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); setExpandedSessionId(null); }}
                    className="flex-1 lg:hidden px-6 py-4 sm:px-8 sm:py-5 bg-gray-100 dark:bg-gray-800 text-black dark:text-white font-black rounded-2xl uppercase tracking-widest text-[11px]"
                  >
                    Close
                  </button>
                </div>
             </div>
             
             {/* Bottom tag as requested */}
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-black text-black dark:text-white uppercase tracking-[0.5em] whitespace-nowrap">Click To Close</span>
             </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout 
      pagetitle="Master Class" 
      hideHeader={false}
      hideMobileTitle={false}
      hideMobileBell={false}
      hideRightPanel={true}
    >
      <div className="max-w-[1600px] w-full max-w-full overflow-x-hidden px-3 sm:px-6 xl:px-10 mx-auto min-h-screen">

        {/* ========= Subscription Expired Paywall Banner ========= */}
        {isSubscriptionExpired && (
          <div className="mb-8 p-6 sm:p-8 bg-gradient-to-br from-amber-500/10 via-red-500/10 to-amber-500/5 dark:from-red-950/40 dark:via-[#09314F]/60 dark:to-amber-950/30 border-2 border-amber-500/30 dark:border-red-500/30 rounded-3xl sm:rounded-[36px] shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left relative z-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-[#E83831] text-white flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                  <Icon icon="solar:lock-bold" className="w-8 h-8" />
                </div>
                <div>
                  <span className="px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-widest inline-block mb-2">
                    Course Enrollment Expired
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-black dark:text-white tracking-tight">
                    Live Masterclasses Locked
                  </h2>
                  <p className="text-xs sm:text-sm text-black dark:text-white opacity-85 font-medium mt-1 max-w-xl leading-relaxed">
                    {subscriptionExpiredMessage || "Your active training period has concluded. Upcoming live classes, live tutor interactions, and meeting rooms are paused until you renew your subscription."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate('/student/payments')}
                className="shrink-0 px-8 py-4 bg-gradient-to-r from-[#E83831] to-red-600 hover:from-red-600 hover:to-[#E83831] text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Icon icon="solar:card-recive-bold" className="w-4 h-4" />
                Renew Training Plan
              </button>
            </div>
          </div>
        )}

        {/* ========= Featured Next Class(es) ========= */}
        {scheduleData.next_classes && scheduleData.next_classes.length > 0 && (
          <div className="mb-6 sm:mb-8 md:mb-12">
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-5 md:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-[11px] sm:text-[12px] font-black text-[#E83831] uppercase tracking-[0.25em] sm:tracking-[0.3em] pl-1 sm:pl-2 flex items-center gap-1.5 sm:gap-2">
                  <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#E83831] rounded-full animate-pulse"></span> NEXT UP
                </h2>
                {scheduleData.next_classes.length > 1 && (
                  <span className="px-2.5 sm:px-3 py-0.5 sm:py-1 bg-red-500/10 dark:bg-red-950/50 text-[#E83831] border border-[#E83831]/25 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest shadow-sm">
                    2 Sessions Ahead
                  </span>
                )}
              </div>
              <div className="h-[1px] flex-1 bg-red-100 dark:bg-red-900/30"></div>
            </div>

            {scheduleData.next_classes.length === 1 ? (
              /* Single Class Hero - Compact on Mobile */
              <div className="bg-[#09314F] rounded-2xl sm:rounded-3xl md:rounded-[40px] p-4 sm:p-6 md:p-10 text-white relative overflow-hidden shadow-2xl group transition-all hover:translate-y-[-3px]">
                {/* Background Accents */}
                <div className="absolute top-0 right-0 w-48 sm:w-64 h-48 sm:h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20 blur-2xl sm:blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-36 sm:w-48 h-36 sm:h-48 bg-[#BB9E7F]/10 rounded-full -ml-16 sm:-ml-20 -mb-16 sm:-mb-20 blur-xl sm:blur-2xl"></div>

                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6 md:gap-8">
                  <div className="flex flex-col sm:flex-row items-center gap-3.5 sm:gap-6 md:gap-8 text-center sm:text-left w-full lg:w-auto">
                    {(() => {
                      const tutor = getTutorInfo(scheduleData.next_classes[0]);
                      return (
                        <div className="w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl sm:rounded-3xl overflow-hidden bg-white/10 border border-white/20 p-0.5 sm:p-1 backdrop-blur-md shrink-0">
                          <div className="w-full h-full rounded-xl sm:rounded-2xl overflow-hidden bg-gray-100 flex items-center justify-center">
                            <img 
                              src={tutor.avatarUrl || tutor.fallbackUrl}
                              className="w-full h-full object-cover"
                              alt={tutor.name}
                              onError={(e) => { e.target.src = tutor.fallbackUrl; }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex-1 min-w-0">
                      {isSessionCancelled(scheduleData.next_classes[0]) ? (
                        <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-rose-600 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest mb-1.5 sm:mb-3 inline-block shadow-sm">
                          Cancelled Session
                        </span>
                      ) : isSessionRescheduled(scheduleData.next_classes[0]) ? (
                        <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-amber-600 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest mb-1.5 sm:mb-3 inline-block shadow-sm">
                          Rescheduled Session
                        </span>
                      ) : (
                        <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-[#E83831] text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest mb-1.5 sm:mb-3 inline-block shadow-sm">
                          Recommended Session
                        </span>
                      )}
                      <h3 className={`text-base sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter mb-1.5 sm:mb-3 leading-tight truncate ${
                        isSessionCancelled(scheduleData.next_classes[0]) ? "line-through text-rose-200" : ""
                      }`}>
                        {scheduleData.next_classes[0].title || scheduleData.next_classes[0].class?.title || "Master Class Session"}
                      </h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 sm:gap-4 text-white/70 font-bold text-xs sm:text-sm">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BB9E7F]" />
                          <span className="text-white font-extrabold">{getTutorInfo(scheduleData.next_classes[0]).name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BB9E7F]" />
                          <span>{formatTime(scheduleData.next_classes[0].starts_at)} - {formatTime(scheduleData.next_classes[0].ends_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BB9E7F]" />
                          <span>{formatSessionDate(scheduleData.next_classes[0].session_date)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center lg:items-end gap-3 sm:gap-4 min-w-[160px] sm:min-w-[200px] w-full sm:w-auto">
                    {isSessionCancelled(scheduleData.next_classes[0]) ? (
                      <span className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-4 bg-rose-950/60 border border-rose-500/40 text-rose-200 font-black rounded-xl sm:rounded-2xl uppercase tracking-widest text-xs text-center shadow-md">
                        Session Cancelled
                      </span>
                    ) : isSessionRescheduled(scheduleData.next_classes[0]) ? (
                      <span className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-4 bg-amber-950/60 border border-amber-500/40 text-amber-200 font-black rounded-xl sm:rounded-2xl uppercase tracking-widest text-xs text-center shadow-md">
                        Session Rescheduled
                      </span>
                    ) : (
                      <button 
                        onClick={(e) => handleJoinClass(e, scheduleData.next_classes[0])}
                        className="w-full sm:w-auto px-6 sm:px-10 py-2.5 sm:py-4 md:py-5 bg-[#BB9E7F] text-[#09314F] font-black rounded-xl sm:rounded-2xl hover:bg-white transition-all shadow-xl shadow-black/20 group-hover:px-12 active:scale-95 uppercase tracking-widest text-xs"
                      >
                        Join Session
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Dual Classes Grid - Sooner Class Prioritized First */
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 sm:gap-5 md:gap-6 items-stretch">
                {/* 1. Sooner Class (Priority Card) - Sleek & Smaller on Mobile */}
                <div className="xl:col-span-7 bg-[#09314F] rounded-2xl sm:rounded-3xl md:rounded-[36px] p-4 sm:p-6 md:p-8 text-white relative overflow-hidden shadow-2xl group transition-all hover:translate-y-[-3px] flex flex-col justify-between border-2 border-[#BB9E7F]/30">
                  <div className="absolute top-0 right-0 w-44 sm:w-60 h-44 sm:h-60 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-16 sm:-mr-20 -mt-16 sm:-mt-20 blur-2xl sm:blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 w-32 sm:w-40 h-32 sm:h-40 bg-[#BB9E7F]/15 rounded-full -ml-12 sm:-ml-16 -mb-12 sm:-mb-16 blur-xl sm:blur-2xl"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 sm:gap-3 mb-2.5 sm:mb-4">
                      {isSessionCancelled(scheduleData.next_classes[0]) ? (
                        <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-rose-600 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest inline-flex items-center gap-1.5 shadow-sm">
                          Cancelled
                        </span>
                      ) : isSessionRescheduled(scheduleData.next_classes[0]) ? (
                        <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-amber-600 text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest inline-flex items-center gap-1.5 shadow-sm">
                          Rescheduled
                        </span>
                      ) : (
                        <span className="px-2.5 sm:px-3.5 py-0.5 sm:py-1 bg-[#E83831] text-white rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest inline-flex items-center gap-1.5 shadow-sm">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> Starts Soonest • Priority
                        </span>
                      )}
                      <span className="text-[10px] sm:text-[11px] font-black text-[#BB9E7F] uppercase tracking-wider truncate max-w-[140px] sm:max-w-none text-right">
                        {scheduleData.next_classes[0].subject_name || "General"}
                      </span>
                    </div>

                    <div className="flex items-center sm:items-start gap-3.5 sm:gap-5 mb-3 sm:mb-5 text-left">
                      {(() => {
                        const tutor = getTutorInfo(scheduleData.next_classes[0]);
                        return (
                          <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl sm:rounded-2xl overflow-hidden bg-white/10 border border-white/20 p-0.5 sm:p-1 shrink-0 backdrop-blur-md">
                            <div className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
                              <img 
                                src={tutor.avatarUrl || tutor.fallbackUrl}
                                className="w-full h-full object-cover"
                                alt={tutor.name}
                                onError={(e) => { e.target.src = tutor.fallbackUrl; }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm sm:text-lg md:text-2xl font-black italic uppercase tracking-tighter leading-tight mb-1 sm:mb-2 truncate ${
                          isSessionCancelled(scheduleData.next_classes[0]) ? "line-through text-rose-200" : ""
                        }`}>
                          {scheduleData.next_classes[0].title || scheduleData.next_classes[0].class?.title || "Master Class Session"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-5 gap-y-1 sm:gap-y-2 text-white/70 font-bold text-[11px] sm:text-xs md:text-sm">
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BB9E7F]" />
                            <span className="text-white font-extrabold truncate max-w-[120px] sm:max-w-none">{getTutorInfo(scheduleData.next_classes[0]).name}</span>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BB9E7F]" />
                            <span>{formatTime(scheduleData.next_classes[0].starts_at)} - {formatTime(scheduleData.next_classes[0].ends_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-2.5 sm:pt-4 border-t border-white/10 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5 text-white/70 font-bold text-[10px] sm:text-xs">
                      <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#BB9E7F] shrink-0" />
                      <span className="truncate">{formatSessionDate(scheduleData.next_classes[0].session_date)}</span>
                    </div>
                    {isSessionCancelled(scheduleData.next_classes[0]) ? (
                      <span className="px-4 sm:px-6 py-2 sm:py-2.5 bg-rose-950/60 border border-rose-500/40 text-rose-200 font-black rounded-lg sm:rounded-xl uppercase tracking-wider text-[10px] sm:text-xs text-center shrink-0">
                        Cancelled
                      </span>
                    ) : isSessionRescheduled(scheduleData.next_classes[0]) ? (
                      <span className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-950/60 border border-amber-500/40 text-amber-200 font-black rounded-lg sm:rounded-xl uppercase tracking-wider text-[10px] sm:text-xs text-center shrink-0">
                        Rescheduled
                      </span>
                    ) : (
                      <button 
                        onClick={(e) => handleJoinClass(e, scheduleData.next_classes[0])}
                        className="px-4 sm:px-8 py-2 sm:py-3.5 bg-[#BB9E7F] text-[#09314F] font-black rounded-lg sm:rounded-xl hover:bg-white transition-all shadow-lg active:scale-95 uppercase tracking-wider sm:tracking-widest text-[10px] sm:text-xs text-center shrink-0"
                      >
                        Join Session
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Later Class (Follow Up Next Class) - Explicitly Smaller & Compact */}
                <div className="xl:col-span-5 bg-gradient-to-br from-[#0C3B5E] to-[#09314F] rounded-xl sm:rounded-2xl md:rounded-[28px] p-3 sm:p-4.5 md:p-6 text-white relative overflow-hidden shadow-lg group transition-all hover:translate-y-[-2px] flex flex-col justify-between border border-white/15">
                  <div className="absolute top-0 right-0 w-36 sm:w-48 h-36 sm:h-48 bg-white/5 rounded-full -mr-12 sm:-mr-16 -mt-12 sm:-mt-16 blur-xl sm:blur-2xl"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      {isSessionCancelled(scheduleData.next_classes[1]) ? (
                        <span className="px-2 sm:px-3 py-0.5 bg-rose-600 text-white rounded-full text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                          Cancelled
                        </span>
                      ) : isSessionRescheduled(scheduleData.next_classes[1]) ? (
                        <span className="px-2 sm:px-3 py-0.5 bg-amber-600 text-white rounded-full text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                          Rescheduled
                        </span>
                      ) : (
                        <span className="px-2 sm:px-3 py-0.5 bg-white/15 text-white/90 border border-white/20 rounded-full text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider inline-flex items-center gap-1">
                          <ClockIcon className="w-3 h-3 text-[#BB9E7F]" /> Upcoming Next
                        </span>
                      )}
                      <span className="text-[9.5px] sm:text-[10.5px] font-black text-white/60 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none text-right">
                        {scheduleData.next_classes[1].subject_name || "General"}
                      </span>
                    </div>

                    <div className="flex items-center sm:items-start gap-2.5 sm:gap-4 mb-2.5 sm:mb-4 text-left">
                      {(() => {
                        const tutor = getTutorInfo(scheduleData.next_classes[1]);
                        return (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl overflow-hidden bg-white/10 border border-white/20 p-0.5 shrink-0 backdrop-blur-md">
                            <div className="w-full h-full rounded-md sm:rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                              <img 
                                src={tutor.avatarUrl || tutor.fallbackUrl}
                                className="w-full h-full object-cover"
                                alt={tutor.name}
                                onError={(e) => { e.target.src = tutor.fallbackUrl; }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                      <div className="flex-1 min-w-0">
                        <h3 className={`text-xs sm:text-sm md:text-lg font-black italic uppercase tracking-tighter leading-tight mb-1 truncate ${
                          isSessionCancelled(scheduleData.next_classes[1]) ? "line-through text-rose-200" : ""
                        }`}>
                          {scheduleData.next_classes[1].title || scheduleData.next_classes[1].class?.title || "Master Class Session"}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-white/70 font-bold text-[10px] sm:text-xs">
                          <div className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-[#BB9E7F]" />
                            <span className="text-white font-extrabold truncate max-w-[110px] sm:max-w-none">{getTutorInfo(scheduleData.next_classes[1]).name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-3 h-3 text-[#BB9E7F]" />
                            <span>{formatTime(scheduleData.next_classes[1].starts_at)} - {formatTime(scheduleData.next_classes[1].ends_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="relative z-10 pt-2 sm:pt-3 border-t border-white/10 flex flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-1 text-white/70 font-bold text-[9.5px] sm:text-[11px]">
                      <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#BB9E7F] shrink-0" />
                      <span className="truncate">{formatSessionDate(scheduleData.next_classes[1].session_date)}</span>
                    </div>
                    {isSessionCancelled(scheduleData.next_classes[1]) ? (
                      <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-rose-950/60 border border-rose-500/40 text-rose-200 font-black rounded-lg uppercase tracking-wider text-[9.5px] sm:text-[10.5px] text-center shrink-0">
                        Cancelled
                      </span>
                    ) : isSessionRescheduled(scheduleData.next_classes[1]) ? (
                      <span className="px-3 sm:px-4 py-1.5 sm:py-2 bg-amber-950/60 border border-amber-500/40 text-amber-200 font-black rounded-lg uppercase tracking-wider text-[9.5px] sm:text-[10.5px] text-center shrink-0">
                        Rescheduled
                      </span>
                    ) : (
                      <button 
                        onClick={(e) => handleJoinClass(e, scheduleData.next_classes[1])}
                        className="px-3 sm:px-5 py-1.5 sm:py-2.5 bg-white/10 hover:bg-white text-white hover:text-[#09314F] border border-white/20 font-black rounded-lg transition-all shadow-sm active:scale-95 uppercase tracking-wider text-[9.5px] sm:text-[10.5px] text-center shrink-0"
                      >
                        Join Session
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========= My Master Classes (Enrolled Classes Cards) ========= */}
        {filteredClasses && filteredClasses.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                <div className="w-2.5 h-2.5 bg-[#BB9E7F] rounded-full shrink-0"></div>
                <h2 className="text-[11px] sm:text-[12px] font-black text-[#BB9E7F] uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-1 truncate">
                  MY ENROLLED MASTER CLASSES
                </h2>
                <span className="px-2 sm:px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black bg-blue-50 dark:bg-[#09314F] text-black dark:text-white border border-blue-100 dark:border-blue-900/40 shrink-0">
                  {filteredClasses.length} {filteredClasses.length === 1 ? "Class" : "Classes"}
                </span>
              </div>
              <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700"></div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {filteredClasses.map((cls) => {
                const isPrivate = Boolean(
                  cls.is_private === true || 
                  cls.is_private === 1 || 
                  cls.is_private === "1" || 
                  cls.is_private === "true" || 
                  cls.private_student_id
                );
                const isClassCancelled = cls.status === 'cancelled' || cls.status === 'inactive';
                const isClassRescheduled = cls.status === 'rescheduled';
                const tutorName = cls.staffs?.[0]?.name || 
                  (cls.staffs?.[0]?.firstname ? `${cls.staffs[0].firstname} ${cls.staffs[0].surname || ''}`.trim() : "Faculty Tutor");
                const privEnrollment = cls.private_enrollment || cls.privateEnrollment || null;
                const isFreeGrant = privEnrollment?.payment_method === "free_grant" || privEnrollment?.amount_paid === 0;

                return (
                  <div 
                    key={cls.id}
                    className={`p-4 sm:p-5 md:p-6 rounded-2xl sm:rounded-3xl bg-white dark:bg-[#09314F]/60 border shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5 group ${
                      isPrivate 
                        ? "border-amber-400/60 dark:border-amber-500/40 bg-gradient-to-br from-amber-500/[0.04] to-transparent ring-1 ring-amber-400/20" 
                        : "border-gray-100 dark:border-white/10"
                    }`}
                  >
                    {/* Left: Avatar/Icon + Title + Badges + Instructor */}
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 w-full min-w-0 sm:min-w-0 lg:min-w-[260px] flex-1">
                      <div className="relative shrink-0">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center font-black text-xs sm:text-sm shadow-sm transition-transform group-hover:scale-105 ${
                          isPrivate
                            ? "bg-gradient-to-tr from-amber-600 to-[#0F2843] text-white ring-2 ring-amber-400/40"
                            : "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white"
                        }`}>
                          {isPrivate ? (
                            <Icon icon="mdi:account-school" className="w-5 h-5 sm:w-6 sm:h-6 text-amber-200" />
                          ) : cls.title ? (
                            cls.title.substring(0, 2).toUpperCase()
                          ) : (
                            "MC"
                          )}
                        </div>
                        <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                          isClassCancelled 
                            ? "bg-rose-500" 
                            : isClassRescheduled 
                            ? "bg-amber-500" 
                            : "bg-emerald-500"
                        }`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className={`text-sm sm:text-base md:text-lg font-black truncate ${
                            isClassCancelled ? "line-through text-rose-700 dark:text-rose-400" : "text-black dark:text-white"
                          }`} title={cls.title}>
                            {cls.title}
                          </h3>

                          {isClassCancelled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                              <Icon icon="mdi:cancel" className="w-3 h-3" />
                              <span>Cancelled</span>
                            </span>
                          )}

                          {isClassRescheduled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-xs">
                              <Icon icon="mdi:calendar-sync" className="w-3 h-3" />
                              <span>Rescheduled</span>
                            </span>
                          )}

                          {isPrivate && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                              <Icon icon="mdi:account-lock" className="w-3 h-3" />
                              <span>Private 1-on-1</span>
                            </span>
                          )}

                          {isFreeGrant && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                              <Icon icon="mdi:gift-outline" className="w-3 h-3" />
                              <span>Free Grant</span>
                            </span>
                          )}

                          {cls.subject?.name && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                              {cls.subject.name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-black dark:text-white opacity-80">
                          <UserIcon className="w-4 h-4 text-black dark:text-white shrink-0" />
                          <span className="truncate font-semibold">{tutorName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Weekly Schedule + Quota */}
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 w-full min-w-0 sm:min-w-0 lg:min-w-[280px] flex-1">
                      {/* Weekly schedule */}
                      <div className="flex flex-col min-w-[120px]">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-black dark:text-white opacity-70 mb-1">
                          <ClockIcon className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Weekly Schedule</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cls.schedules && cls.schedules.length > 0 ? (
                            cls.schedules.map((sc, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40">
                                {String(sc.day_of_week || '').slice(0,3).toUpperCase()}: {formatTime(sc.start_time || sc.starts_at)}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-black dark:text-white opacity-60 italic">Self-scheduled</span>
                          )}
                        </div>
                      </div>

                      {/* Quota Progress */}
                      {isPrivate && privEnrollment && (
                        <div className="flex flex-col min-w-[120px]">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
                            Sessions Quota
                          </span>
                          <span className="text-xs font-black text-black dark:text-white">
                            {privEnrollment.sessions_completed || 0} of {privEnrollment.session_quota || 7} Completed
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-white/10 justify-end">
                      {isClassCancelled ? (
                        <span className="px-3.5 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 font-black text-xs uppercase tracking-wider">
                          Cancelled
                        </span>
                      ) : isClassRescheduled ? (
                        <span className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-black text-xs uppercase tracking-wider">
                          Rescheduled
                        </span>
                      ) : (cls.class_link || cls.zoom_join_url) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSubscriptionExpired) {
                              navigate('/student/payments');
                              return;
                            }
                            const link = cls.class_link || cls.zoom_join_url;
                            if (link) window.open(link, "_blank", "noopener,noreferrer");
                          }}
                          className="px-4 py-2.5 rounded-xl bg-[#09314F] hover:bg-black text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                        >
                          <Icon icon="logos:zoom" className="w-4 h-4" />
                          <span>Classroom</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========= Controls Bar ========= */}
        <div className="flex flex-col md:flex-row items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
          <div className="relative w-full flex-1 group">
            <MagnifyingGlassIcon className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 w-5 h-5 sm:w-6 sm:h-6 text-gray-400 group-focus-within:text-[#BB9E7F] transition-colors" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search master classes..." 
              className="w-full pl-14 sm:pl-16 pr-6 sm:pr-8 py-3.5 sm:py-5 bg-white dark:bg-[#09314F]/50 dark:backdrop-blur-md rounded-2xl sm:rounded-[32px] border border-gray-100 dark:border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.03)] focus:ring-4 focus:ring-[#BB9E7F]/10 text-sm sm:text-[15px] font-bold text-black dark:text-white placeholder-gray-400 dark:placeholder-gray-400 transition-all"
            />
          </div>
          <button 
            onClick={() => navigate('/student/recorded-classes')}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-5 bg-white dark:bg-[#09314F]/50 dark:backdrop-blur-md rounded-2xl sm:rounded-[32px] shadow-[0_10px_35px_rgba(0,0,0,0.03)] hover:shadow-md border border-gray-100 dark:border-white/10 text-black dark:text-white hover:text-[#E83831] dark:hover:text-[#E83831] transition-all font-black text-xs tracking-wider sm:tracking-widest uppercase shrink-0"
          >
            <Icon icon="lucide:video" className="w-5 h-5 text-[#BB9E7F]" />
            Recorded Classes
          </button>
        </div>

        {/* ========= Classes List ========= */}
        <div className="space-y-8 sm:space-y-12">
          
          {/* Today Section (Non-collapsable) */}
          <div>
            <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
              <h2 className="text-[11px] sm:text-[12px] font-black text-[#BB9E7F] uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-1 sm:pl-2 whitespace-nowrap">TODAY'S CLASSES</h2>
              {(!isHighRes && !isMobile) && (
                <span className="text-[10px] font-bold text-black dark:text-white opacity-60 uppercase tracking-widest italic hidden md:inline">— Click any session for more details</span>
              )}
              <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700"></div>
            </div>
            
            <div className="flex flex-col">
              {groupedSessions.today.length > 0 ? (
                groupedSessions.today.map(session => (
                  <ClassRow key={session.id} session={session} isToday={true} />
                ))
              ) : (
                <div className="p-8 sm:p-12 text-center bg-gray-50/50 dark:bg-[#09314F]/30 rounded-2xl sm:rounded-[40px] border border-gray-100 dark:border-white/10">
                  <p className="font-bold text-black dark:text-white text-sm">No classes scheduled for today</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Section (Collapsable) */}
          <div>
            <div 
              className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 cursor-pointer group/header"
              onClick={() => setIsWeeklyOpen(!isWeeklyOpen)}
            >
              <h2 className="text-[11px] sm:text-[12px] font-black text-[#BB9E7F] uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-1 sm:pl-2 whitespace-nowrap">THIS WEEK'S SCHEDULE</h2>
              {(!isHighRes && !isMobile) && (
                <span className="text-[10px] font-bold text-black dark:text-white opacity-60 uppercase tracking-widest italic hidden md:inline">— Click any session for more details</span>
              )}
              <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700 group-hover/header:bg-[#BB9E7F]/30 transition-all"></div>
              {isWeeklyOpen ? <ChevronUpIcon className="w-4 h-4 text-black dark:text-white shrink-0" /> : <ChevronDownIcon className="w-4 h-4 text-black dark:text-white shrink-0" />}
            </div>
            
            {isWeeklyOpen && (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                {groupedSessions.weekly.length > 0 ? (
                  groupedSessions.weekly.map(session => (
                    <ClassRow key={session.id} session={session} isToday={false} />
                  ))
                ) : (
                  <div className="p-6 sm:p-10 text-center bg-gray-50/30 dark:bg-[#09314F]/20 rounded-2xl sm:rounded-[30px] border border-dashed border-gray-200 dark:border-white/10">
                    <p className="font-bold text-black dark:text-white text-xs italic">No other sessions scheduled for this week</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Upcoming Section (Next Week & Beyond) */}
          <div>
            <div 
              className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 cursor-pointer group/header"
              onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <h2 className="text-[11px] sm:text-[12px] font-black text-[#BB9E7F] uppercase tracking-[0.15em] sm:tracking-[0.3em] whitespace-normal sm:whitespace-nowrap">
                  UPCOMING SESSIONS (NEXT WEEK & BEYOND)
                </h2>
              </div>
              {(!isHighRes && !isMobile) && (
                <span className="text-[10px] font-bold text-black dark:text-white opacity-60 uppercase tracking-widest italic hidden md:inline">— Click any session for more details</span>
              )}
              <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700 group-hover/header:bg-[#BB9E7F]/30 transition-all"></div>
              {isUpcomingOpen ? <ChevronUpIcon className="w-4 h-4 text-black dark:text-white shrink-0" /> : <ChevronDownIcon className="w-4 h-4 text-black dark:text-white shrink-0" />}
            </div>
            
            {isUpcomingOpen && (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                {groupedSessions.upcoming.length > 0 ? (
                  groupedSessions.upcoming.map(session => (
                    <ClassRow key={session.id} session={session} isToday={false} />
                  ))
                ) : (
                  <div className="p-6 sm:p-10 text-center bg-gray-50/30 dark:bg-[#09314F]/20 rounded-2xl sm:rounded-[30px] border border-dashed border-gray-200 dark:border-white/10">
                    <p className="font-bold text-black dark:text-white text-xs italic">No future sessions scheduled beyond this week</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Older Section (Collapsable) */}
          <div>
            <div 
              className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6 cursor-pointer group/header"
              onClick={() => setIsOlderOpen(!isOlderOpen)}
            >
              <h2 className="text-[11px] sm:text-[12px] font-black text-[#BB9E7F] uppercase tracking-[0.2em] sm:tracking-[0.3em] pl-1 sm:pl-2 whitespace-nowrap">OLDER CLASSES</h2>
              <div className="h-[1px] flex-1 bg-gray-200 dark:bg-gray-700 group-hover/header:bg-[#BB9E7F]/30 transition-all"></div>
              {isOlderOpen ? <ChevronUpIcon className="w-4 h-4 text-black dark:text-white shrink-0" /> : <ChevronDownIcon className="w-4 h-4 text-black dark:text-white shrink-0" />}
            </div>
            
            {isOlderOpen && (
              <div className="flex flex-col animate-in fade-in slide-in-from-top-2 duration-300">
                {groupedSessions.older.length > 0 ? (
                  groupedSessions.older.map(session => (
                    <ClassRow key={session.id} session={session} isToday={false} />
                  ))
                ) : (
                  <div className="p-6 sm:p-10 text-center bg-gray-50/30 dark:bg-[#09314F]/20 rounded-2xl sm:rounded-[30px] border border-dashed border-gray-200 dark:border-white/10">
                    <p className="font-bold text-black dark:text-white text-xs italic">No older sessions found</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Loading State */}
        {loading && (
          <div className="fixed bottom-10 right-10 z-[100] bg-[#09314F] text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-4">
             <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
             <span className="text-sm font-black uppercase tracking-widest italic">Syncing Class Schedule...</span>
          </div>
        )}

        {error && (
          <div className="mt-12 p-10 bg-red-50 rounded-[40px] border-2 border-dashed border-red-100 text-center">
            <h3 className="text-red-600 font-bold mb-2 uppercase tracking-widest text-sm">Data Link Interrupted</h3>
            <p className="text-red-400 text-xs font-bold">{error}</p>
            <button 
              onClick={fetchStudentSchedule}
              className="mt-6 px-10 py-3.5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 transition-all text-xs uppercase tracking-widest active:scale-95 shadow-lg shadow-red-200"
            >
              Force Reconnect
            </button>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
