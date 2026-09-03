import React, { useEffect, useState, useMemo, useCallback } from "react";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import CreateMasterClassModal from "../../../components/private/staffs/AdminMasterclassModal.jsx";
import axios from "axios";
import { 
  CalendarDaysIcon, 
  PlusIcon, 
  MagnifyingGlassIcon, 
  VideoCameraIcon, 
  ClockIcon, 
  UserIcon, 
  AcademicCapIcon, 
  ArrowTopRightOnSquareIcon, 
  ClipboardDocumentIcon, 
  CheckIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  XMarkIcon, 
  PlayCircleIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  SparklesIcon, 
  CheckBadgeIcon,
  SignalIcon,
  EyeIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

// Official Tutorial Center African Time Zone (West Africa Time / UTC+1)
const AFRICAN_TIMEZONE = "Africa/Lagos";

// Helper to get African Date in YYYY-MM-DD format strictly tied to Africa/Lagos
const getAfricanDateYMD = (d = new Date()) => {
  if (!d) return "";
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: AFRICAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
};

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const SUBJECT_COLORS = [
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/50", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800/50", text: "text-indigo-700 dark:text-indigo-300", dot: "bg-indigo-500", badge: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/50", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300" },
  { bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800/50", text: "text-pink-700 dark:text-pink-300", dot: "bg-pink-500", badge: "bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300" },
  { bg: "bg-cyan-50 dark:bg-cyan-950/30", border: "border-cyan-200 dark:border-cyan-800/50", text: "text-cyan-700 dark:text-cyan-300", dot: "bg-cyan-500", badge: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800/50", text: "text-purple-700 dark:text-purple-300", dot: "bg-purple-500", badge: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300" },
];

const getSubjectColor = (subject) => {
  if (!subject) return SUBJECT_COLORS[0];
  let hash = 0;
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SUBJECT_COLORS.length;
  return SUBJECT_COLORS[index];
};

// Helper to extract detailed tutor info without emojis
const extractTutorInfo = (rawItem) => {
  if (Array.isArray(rawItem.staffs) && rawItem.staffs.length > 0) {
    const leadStaff = rawItem.staffs.find(s => s.role === "lead") || rawItem.staffs[0];
    const s = leadStaff.staff || leadStaff;
    const firstName = s.firstname || s.first_name || "";
    const lastName = s.surname || s.last_name || "";
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : s.name || "Assigned Tutor";
    return {
      id: s.id || leadStaff.staff_id,
      name: fullName,
      email: s.email || "tutor@tutorialcenter.africa",
      phone: s.phone || s.phone_number || "Not provided",
      role: leadStaff.role ? `${leadStaff.role.charAt(0).toUpperCase() + leadStaff.role.slice(1)} Tutor` : "Lead Tutor",
      avatar: s.profile_picture || s.avatar || null,
      initials: (firstName ? firstName[0] : (fullName[0] || "T")).toUpperCase() + (lastName ? lastName[0] : "").toUpperCase(),
    };
  }

  if (Array.isArray(rawItem.tutors) && rawItem.tutors.length > 0) {
    const t = rawItem.tutors[0];
    const firstName = t.firstname || t.first_name || "";
    const lastName = t.surname || t.last_name || "";
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : t.name || "Assigned Tutor";
    return {
      id: t.id,
      name: fullName,
      email: t.email || "tutor@tutorialcenter.africa",
      phone: t.phone || t.phone_number || "Not provided",
      role: "Master Class Tutor",
      avatar: t.profile_picture || t.avatar || null,
      initials: (firstName ? firstName[0] : (fullName[0] || "T")).toUpperCase() + (lastName ? lastName[0] : "").toUpperCase(),
    };
  }

  if (rawItem.tutor && typeof rawItem.tutor === "object") {
    const t = rawItem.tutor;
    const firstName = t.firstname || t.first_name || "";
    const lastName = t.surname || t.last_name || "";
    const fullName = (firstName && lastName) ? `${firstName} ${lastName}` : t.name || "Assigned Tutor";
    return {
      id: t.id,
      name: fullName,
      email: t.email || "tutor@tutorialcenter.africa",
      phone: t.phone || t.phone_number || "Not provided",
      role: "Lead Tutor",
      avatar: t.profile_picture || t.avatar || null,
      initials: (firstName ? firstName[0] : (fullName[0] || "T")).toUpperCase() + (lastName ? lastName[0] : "").toUpperCase(),
    };
  }

  if (rawItem.tutor_name && typeof rawItem.tutor_name === "string") {
    return {
      id: rawItem.tutor_id || null,
      name: rawItem.tutor_name,
      email: rawItem.tutor_email || "tutor@tutorialcenter.africa",
      phone: "Not provided",
      role: "Tutor",
      avatar: null,
      initials: rawItem.tutor_name.slice(0, 2).toUpperCase(),
    };
  }

  return {
    id: null,
    name: "Tutorial Center Tutor",
    email: "support@tutorialcenter.africa",
    phone: "Not provided",
    role: "Faculty Tutor",
    avatar: null,
    initials: "TC",
  };
};

// Helper to extract flattened sessions from any backend response format
const extractFlatSessions = (data) => {
  const list = [];
  
  const pushSession = (session, parentClass = null) => {
    if (!session || !session.id) return;
    if (list.some(s => s.id === session.id)) return;

    const source = parentClass || session.class || session;
    const tutor = extractTutorInfo(source);
    const subject = source.subject_name || source.subject?.name || source.course?.name || "General Studies";
    
    let link = session.class_link || source.class_link || source.zoom_join_url || source.zoom_start_url;
    let recording = session.recording_link || source.recording_link;

    const rawDate = session.session_date || session.date || session.scheduled_date || session.start_date || session.created_at;
    const dateStr = rawDate ? String(rawDate).split("T")[0].split(" ")[0] : getAfricanDateYMD();
    
    const startTime = session.starts_at || session.start_time || "10:00";
    const endTime = session.ends_at || session.end_time || "11:30";

    list.push({
      ...session,
      id: session.id,
      class_id: source.id || session.class_id,
      session_date: dateStr,
      starts_at: startTime ? startTime.substring(0, 5) : "10:00",
      ends_at: endTime ? endTime.substring(0, 5) : "11:30",
      topic: session.title || source.title || `${subject} Master Class`,
      subject_name: subject,
      subject: source.subject || session.subject,
      tutor,
      tutor_name: tutor.name,
      class_link: link,
      recording_link: recording,
      class_tier: session.class_tier || source.class_tier || "JAMB / O-Levels",
      description: session.description || source.description || "In-depth master class lecture covering core syllabus topics, past questions, and problem-solving techniques.",
    });
  };

  const processClassItem = (cls) => {
    if (!cls) return;
    let extractedCount = 0;
    if (Array.isArray(cls.schedules)) {
      cls.schedules.forEach(sched => {
        if (Array.isArray(sched.sessions)) {
          sched.sessions.forEach(session => {
            pushSession(session, cls);
            extractedCount++;
          });
        }
      });
    }
    // If no nested sessions were found in schedules, extract class directly
    if (extractedCount === 0) {
      pushSession(cls);
    }
  };

  if (Array.isArray(data)) {
    data.forEach(item => {
      if (item.schedules || item.subject_id) {
        processClassItem(item);
      } else {
        pushSession(item);
      }
    });
  } else if (data && typeof data === 'object') {
    if (Array.isArray(data.classes)) data.classes.forEach(processClassItem);
    if (Array.isArray(data.sessions)) data.sessions.forEach(s => pushSession(s));
    if (Array.isArray(data.today_classes)) data.today_classes.forEach(s => pushSession(s));
    if (Array.isArray(data.upcoming_sessions)) data.upcoming_sessions.forEach(s => pushSession(s));
    if (Array.isArray(data.past_sessions)) data.past_sessions.forEach(s => pushSession(s));
    if (Array.isArray(data.history)) data.history.forEach(s => pushSession(s));
    if (data.next_class) pushSession(data.next_class);
    if (data.week_schedule && typeof data.week_schedule === 'object') {
      Object.values(data.week_schedule).forEach(arr => {
        if (Array.isArray(arr)) arr.forEach(s => pushSession(s));
      });
    }
  }
  return list;
};

export default function AdminCalendar() {
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const token = localStorage.getItem("staff_token");

  // --- STATE ---
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("month"); // 'month', 'week', 'day', 'list'
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedTutor, setSelectedTutor] = useState("all");
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedDateForModal, setSelectedDateForModal] = useState(null); // Date cell popup
  const [modalTab, setModalTab] = useState("overview"); // 'overview', 'tutor', 'recordings'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(null);

  // --- FETCH SCHEDULES ---
  const fetchAllSchedules = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      try {
        res = await axios.get(`${API_BASE_URL}/api/admin/classes/all?all=true`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        });
      } catch (err) {
        res = await axios.get(`${API_BASE_URL}/api/tutor/classes/schedule?all=true`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
        });
      }

      const flatList = extractFlatSessions(res.data?.classes || res.data || {});
      setSessions(flatList);
    } catch (error) {
      console.error("Failed to fetch admin calendar schedules:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchAllSchedules();
  }, [fetchAllSchedules]);

  // Unique subjects and tutors for filter dropdowns
  const availableSubjects = useMemo(() => {
    const set = new Set();
    sessions.forEach(s => {
      if (s.subject_name) set.add(s.subject_name);
    });
    return Array.from(set).sort();
  }, [sessions]);

  const availableTutors = useMemo(() => {
    const set = new Set();
    sessions.forEach(s => {
      if (s.tutor?.name && s.tutor.name !== "Tutorial Center Tutor") set.add(s.tutor.name);
    });
    return Array.from(set).sort();
  }, [sessions]);

  // Filtered sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const matchSearch = !searchQuery || 
        s.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.tutor?.name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchSubject = selectedSubject === "all" || s.subject_name === selectedSubject;
      const matchTutor = selectedTutor === "all" || s.tutor?.name === selectedTutor;

      return matchSearch && matchSubject && matchTutor;
    });
  }, [sessions, searchQuery, selectedSubject, selectedTutor]);

  // Tutor Activity Insights for Selected Session
  const tutorTrackRecord = useMemo(() => {
    if (!selectedSession || !selectedSession.tutor) {
      return { totalClasses: 0, pastClasses: [], recordings: [] };
    }
    const tutorId = selectedSession.tutor.id;
    const tutorName = selectedSession.tutor.name;

    const tutorClasses = sessions.filter(s => {
      if (tutorId && s.tutor?.id) return s.tutor.id === tutorId;
      return s.tutor?.name === tutorName;
    });

    const todayStr = getAfricanDateYMD();
    const pastClasses = tutorClasses.filter(s => {
      if (!s.session_date) return false;
      return s.session_date < todayStr;
    });

    const recordings = tutorClasses.filter(s => s.recording_link || s.recording_url || s.video_url);

    return {
      totalClasses: tutorClasses.length,
      pastClasses,
      recordings,
    };
  }, [selectedSession, sessions]);

  // Check if session is live right now
  const isSessionLiveNow = (session) => {
    if (!session || !session.session_date) return false;
    const todayStr = getAfricanDateYMD();
    if (session.session_date !== todayStr) return false;

    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = (session.starts_at || "00:00").split(":").map(Number);
    const [eh, em] = (session.ends_at || "23:59").split(":").map(Number);

    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;

    return currentMins >= startMins && currentMins <= endMins;
  };

  // Top metric counts
  const liveCount = useMemo(() => sessions.filter(isSessionLiveNow).length, [sessions]);
  const totalRecordings = useMemo(() => sessions.filter(s => s.recording_link || s.recording_url).length, [sessions]);
  const activeTutorsCount = useMemo(() => availableTutors.length, [availableTutors]);

  // Sessions for Selected Date in Day Modal
  const selectedDateSessions = useMemo(() => {
    if (!selectedDateForModal) return [];
    const dateStr = getAfricanDateYMD(selectedDateForModal);
    return filteredSessions.filter(s => s.session_date === dateStr);
  }, [selectedDateForModal, filteredSessions]);

  // --- CALENDAR NAVIGATION HELPERS ---
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === "day") newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === "week") newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === "day") newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  };

  const copyClassLink = (link, id) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Month grid generator
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonthDays - i) });
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
    }
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
    }
    return days;
  }, [currentDate]);

  // Week days generator
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(curr);
      d.setDate(first + i);
      return d;
    });
  }, [currentDate]);

  return (
    <StaffDashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1650px] mx-auto min-h-screen">
        
        {/* TOP HEADER & ACTION BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-[#09314F] to-[#1a4a6e] text-white rounded-2xl shadow-md">
                <CalendarDaysIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#09314F] dark:text-white tracking-tight">
                    Master Class Calendar
                  </h1>
                  <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-primary/10 text-primary border border-primary/20">
                    Admin Oversight
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Track live masterclasses, tutor assignments, student sessions, and recorded video archives.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#09314F] to-[#E83831] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:opacity-95 transition-all text-sm active:scale-95"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Schedule Master Class</span>
            </button>
          </div>
        </div>

        {/* METRICS & QUICK OVERVIEW STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <AcademicCapIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Total Scheduled</p>
              <p className="text-xl font-extrabold text-[#09314F] dark:text-white">{sessions.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <SignalIcon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Live Right Now</p>
              <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{liveCount} Active</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Active Tutors</p>
              <p className="text-xl font-extrabold text-[#09314F] dark:text-white">{activeTutorsCount || "8+"}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <PlayCircleIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400">Video Recordings</p>
              <p className="text-xl font-extrabold text-[#09314F] dark:text-white">{totalRecordings} Vault</p>
            </div>
          </div>
        </div>

        {/* CONTROLS & FILTER BAR */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 mb-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left: Date navigation */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700 shadow-inner">
              <button
                onClick={handlePrev}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200 transition-all active:scale-95"
                title="Previous"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleToday}
                className="px-3.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-200 transition-all active:scale-95"
                title="Next"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-[#09314F] dark:text-white tracking-tight">
              {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
            </h2>
          </div>

          {/* Center: Search & Filters */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
            <div className="relative flex-1 min-w-[160px]">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search classes, topics, tutors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 text-gray-800 dark:text-gray-100"
              />
            </div>

            {/* Subject Filter */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="py-2 px-3 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none font-medium cursor-pointer"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* Tutor Filter */}
            <select
              value={selectedTutor}
              onChange={(e) => setSelectedTutor(e.target.value)}
              className="py-2 px-3 text-xs sm:text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 focus:outline-none font-medium cursor-pointer"
            >
              <option value="all">All Tutors</option>
              {availableTutors.map(tut => (
                <option key={tut} value={tut}>{tut}</option>
              ))}
            </select>
          </div>

          {/* Right: View Mode Toggle */}
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 self-start sm:self-auto shadow-inner">
            {["month", "week", "day", "list"].map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  viewMode === mode
                    ? "bg-white dark:bg-gray-700 text-[#09314F] dark:text-white shadow-md scale-100"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* LOADING SKELETON */}
        {loading && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 flex flex-col items-center justify-center min-h-[480px]">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-[#09314F] dark:text-gray-200">Synchronizing Master Class Schedules...</p>
            <p className="text-xs text-gray-400 mt-1">Fetching live classrooms, assigned tutors, and recorded archives</p>
          </div>
        )}

        {/* --- 1. MONTH VIEW --- */}
        {!loading && viewMode === "month" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 text-center py-3">
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="text-xs font-extrabold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid Cells */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-gray-200 dark:divide-gray-800">
              {monthDays.map((item, idx) => {
                const dateString = getAfricanDateYMD(item.date);
                const daySessions = filteredSessions.filter(s => s.session_date === dateString);
                const isToday = item.date.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDateForModal(item.date)}
                    className={`min-h-[125px] p-2 transition-all cursor-pointer ${
                      item.isCurrentMonth ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-950/40 opacity-40"
                    } hover:bg-blue-50/30 dark:hover:bg-gray-800/50 hover:shadow-inner`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-transform ${
                          isToday 
                            ? "bg-[#E83831] text-white shadow-md scale-110" 
                            : item.isCurrentMonth 
                              ? "text-gray-700 dark:text-gray-200" 
                              : "text-gray-400"
                        }`}
                      >
                        {item.day}
                      </span>
                      {daySessions.length > 0 && (
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary dark:text-blue-300 hover:bg-primary/20">
                          {daySessions.length} {daySessions.length === 1 ? 'class' : 'classes'}
                        </span>
                      )}
                    </div>

                    {/* Session Chips */}
                    <div className="space-y-1.5 overflow-y-auto max-h-[90px] pr-0.5">
                      {daySessions.slice(0, 3).map((session) => {
                        const style = getSubjectColor(session.subject_name);
                        const isLive = isSessionLiveNow(session);

                        return (
                          <div
                            key={session.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSession(session);
                              setModalTab("overview");
                            }}
                            className={`p-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-all hover:scale-[1.02] hover:shadow-sm ${style.bg} ${style.border} ${style.text} relative overflow-hidden`}
                            title={`${session.topic} (${session.starts_at} - ${session.ends_at}) - Tutor: ${session.tutor.name}`}
                          >
                            {isLive && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            )}
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-[10px] opacity-90">{session.starts_at?.slice(0, 5)}</span>
                              <span className="text-[9px] font-extrabold px-1 rounded bg-black/5 dark:bg-white/10 truncate max-w-[65px]">
                                {session.subject_name}
                              </span>
                            </div>
                            <p className="font-bold truncate mt-0.5 leading-tight">{session.topic}</p>
                            <p className="text-[10px] opacity-80 truncate flex items-center gap-1 mt-0.5">
                              <UserIcon className="w-2.5 h-2.5 inline" /> {session.tutor.name}
                            </p>
                          </div>
                        );
                      })}

                      {daySessions.length > 3 && (
                        <div 
                          className="text-[10px] font-bold text-center py-0.5 text-primary dark:text-blue-400 bg-primary/5 rounded-md hover:underline"
                        >
                          +{daySessions.length - 3} more classes
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- 2. WEEK VIEW --- */}
        {!loading && viewMode === "week" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Week Header */}
              <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 py-3 text-center">
                <div className="text-xs font-bold text-gray-400 uppercase">Time</div>
                {weekDays.map((d, i) => {
                  const isToday = d.toDateString() === new Date().toDateString();
                  return (
                    <div 
                      key={i} 
                      onClick={() => setSelectedDateForModal(d)}
                      className="flex flex-col items-center cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 py-1 rounded-xl transition-all"
                    >
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                        {DAYS_OF_WEEK[d.getDay()]}
                      </span>
                      <span className={`text-sm font-extrabold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? "bg-[#E83831] text-white shadow-md" : "text-gray-800 dark:text-gray-200"
                      }`}>
                        {d.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Week Schedule List */}
              <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[620px] overflow-y-auto">
                {HOURS.filter(h => h >= 7 && h <= 21).map((hour) => {
                  const hourStr = `${hour.toString().padStart(2, "0")}:00`;
                  return (
                    <div key={hour} className="grid grid-cols-8 min-h-[65px] divide-x divide-gray-100 dark:divide-gray-800">
                      <div className="text-[11px] font-bold text-gray-400 p-2 text-center bg-gray-50/40 dark:bg-gray-900/40">
                        {hourStr}
                      </div>
                      {weekDays.map((d, di) => {
                        const dateStr = getAfricanDateYMD(d);
                        const cellSessions = filteredSessions.filter(s => {
                          if (s.session_date !== dateStr) return false;
                          const sHour = parseInt(s.starts_at?.split(":")[0] || "0", 10);
                          return sHour === hour;
                        });

                        return (
                          <div 
                            key={di} 
                            onClick={() => setSelectedDateForModal(d)}
                            className="p-1.5 relative min-h-[60px] hover:bg-gray-50/60 dark:hover:bg-gray-800/30 cursor-pointer"
                          >
                            {cellSessions.map(session => {
                              const style = getSubjectColor(session.subject_name);
                              return (
                                <div
                                  key={session.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSession(session);
                                    setModalTab("overview");
                                  }}
                                  className={`p-2 rounded-xl border text-xs cursor-pointer shadow-sm mb-1.5 transition-all hover:scale-[1.02] ${style.bg} ${style.border} ${style.text}`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-extrabold px-1 rounded bg-white/60 dark:bg-black/20 uppercase">
                                      {session.subject_name}
                                    </span>
                                    <span className="text-[10px] font-bold">{session.starts_at}</span>
                                  </div>
                                  <p className="font-bold text-xs truncate mt-1">{session.topic}</p>
                                  <p className="text-[10px] opacity-80 truncate mt-0.5">Tutor: {session.tutor.name}</p>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- 3. DAY VIEW --- */}
        {!loading && viewMode === "day" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-extrabold text-[#09314F] dark:text-white mb-4 pb-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <span>Master Classes for {currentDate.toDateString()}</span>
              <span className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary font-bold">
                {filteredSessions.filter(s => s.session_date === getAfricanDateYMD(currentDate)).length} Scheduled
              </span>
            </h3>

            <div className="space-y-3.5">
              {filteredSessions
                .filter(s => s.session_date === getAfricanDateYMD(currentDate))
                .sort((a, b) => (a.starts_at || "").localeCompare(b.starts_at || ""))
                .map(session => {
                  const style = getSubjectColor(session.subject_name);
                  const isLive = isSessionLiveNow(session);

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        setSelectedSession(session);
                        setModalTab("overview");
                      }}
                      className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-lg hover:border-primary/40 ${style.bg} ${style.border}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 shadow-md border border-gray-100 dark:border-gray-700 flex items-center justify-center text-primary font-extrabold text-lg">
                          {session.tutor.avatar ? (
                            <img src={session.tutor.avatar} alt={session.tutor.name} className="w-full h-full object-cover rounded-2xl" />
                          ) : (
                            session.tutor.initials
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${style.badge}`}>
                              {session.subject_name}
                            </span>
                            {isLive && (
                              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> LIVE NOW
                              </span>
                            )}
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{session.topic}</h4>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 font-semibold text-[#09314F] dark:text-gray-200">
                              <ClockIcon className="w-4 h-4 text-primary" /> {session.starts_at} - {session.ends_at}
                            </span>
                            <span className="flex items-center gap-1 font-medium">
                              <UserIcon className="w-4 h-4 text-gray-400" /> Tutor: <strong className="text-gray-800 dark:text-gray-200">{session.tutor.name}</strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                            setModalTab("tutor");
                          }}
                          className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all"
                        >
                          Tutor Bio & History
                        </button>
                        {session.class_link && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(session.class_link, "_blank");
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-[#09314F] to-[#E83831] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 flex items-center gap-1.5"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Join Class
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {filteredSessions.filter(s => s.session_date === currentDate.toISOString().split("T")[0]).length === 0 && (
                <div className="text-center py-16 text-gray-400 dark:text-gray-500">
                  <CalendarDaysIcon className="w-14 h-14 mx-auto mb-2 opacity-30" />
                  <p className="text-base font-bold text-gray-600 dark:text-gray-300">No Master Classes scheduled for this date.</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Schedule Master Class" above to create a session.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 4. LIST / AGENDA VIEW --- */}
        {!loading && viewMode === "list" && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-[#09314F] dark:text-white">
                  Master Class Schedule & Video Vault
                </h3>
                <p className="text-xs text-gray-400">Total {filteredSessions.length} sessions in academy directory</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredSessions
                .sort((a, b) => (a.session_date || "").localeCompare(b.session_date || ""))
                .map((session) => {
                  const style = getSubjectColor(session.subject_name);
                  const isLive = isSessionLiveNow(session);

                  return (
                    <div
                      key={session.id}
                      onClick={() => {
                        setSelectedSession(session);
                        setModalTab("overview");
                      }}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/70 dark:hover:bg-gray-800/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-2xl min-w-[70px] border border-gray-200 dark:border-gray-700 shadow-sm">
                          <span className="block text-[10px] font-bold text-gray-400 uppercase">
                            {session.session_date ? new Date(session.session_date).toLocaleString("default", { month: "short" }) : "DATE"}
                          </span>
                          <span className="block text-xl font-extrabold text-[#09314F] dark:text-white">
                            {session.session_date ? new Date(session.session_date).getDate() : "--"}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${style.badge}`}>
                              {session.subject_name}
                            </span>
                            {isLive && (
                              <span className="text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> LIVE
                              </span>
                            )}
                            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <ClockIcon className="w-3.5 h-3.5" /> {session.starts_at} - {session.ends_at}
                            </span>
                          </div>
                          
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">{session.topic}</h4>
                          
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex flex-wrap items-center gap-3">
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5 text-gray-400" /> Tutor: <strong className="text-gray-800 dark:text-gray-200">{session.tutor.name}</strong>
                            </span>
                            {session.recording_link && (
                              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">
                                <PlayCircleIcon className="w-4 h-4" /> Recording Available
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSession(session);
                            setModalTab("tutor");
                          }}
                          className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl transition-all"
                        >
                          Tutor Info
                        </button>
                        {session.class_link && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyClassLink(session.class_link, session.id);
                            }}
                            className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs transition-all"
                            title="Copy link"
                          >
                            {copiedLink === session.id ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                          </button>
                        )}
                        {session.class_link && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(session.class_link, "_blank");
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-[#09314F] to-[#E83831] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 flex items-center gap-1.5"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Join
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {filteredSessions.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <CalendarDaysIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p className="text-base font-semibold">No Master Classes match your filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- DAY CLASSES OVERVIEW MODAL (UPON CLICKING ANY DATE CELL) --- */}
        {selectedDateForModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-[#09314F] to-[#1a4a6e] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white/10 rounded-2xl">
                    <CalendarDaysIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider font-bold text-white/70">Day Master Classes</span>
                    <h3 className="text-xl font-bold">{selectedDateForModal.toDateString()}</h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedDateForModal(null)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Day Classes List */}
              <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {selectedDateSessions.length} {selectedDateSessions.length === 1 ? "Class Scheduled" : "Classes Scheduled"}
                  </span>
                  
                  <button
                    onClick={() => {
                      setSelectedDateForModal(null);
                      setShowCreateModal(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-blue-400 hover:underline"
                  >
                    <PlusIcon className="w-4 h-4" /> Add Master Class
                  </button>
                </div>

                {selectedDateSessions.map(session => {
                  const style = getSubjectColor(session.subject_name);
                  const isLive = isSessionLiveNow(session);

                  return (
                    <div
                      key={session.id}
                      className={`p-4 rounded-2xl border transition-all hover:shadow-md ${style.bg} ${style.border}`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${style.badge}`}>
                              {session.subject_name}
                            </span>
                            {isLive && (
                              <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> LIVE NOW
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">{session.topic}</h4>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-4 mt-2">
                            <span className="flex items-center gap-1 font-semibold text-[#09314F] dark:text-gray-200">
                              <ClockIcon className="w-4 h-4 text-primary" /> {session.starts_at} - {session.ends_at}
                            </span>
                            <span className="flex items-center gap-1">
                              <UserIcon className="w-4 h-4 text-gray-400" /> Tutor: <strong className="text-gray-800 dark:text-gray-200">{session.tutor.name}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setSelectedDateForModal(null);
                              setSelectedSession(session);
                              setModalTab("overview");
                            }}
                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-all flex items-center gap-1"
                          >
                            <EyeIcon className="w-4 h-4 text-gray-500" /> Details
                          </button>
                          {session.class_link && (
                            <button
                              onClick={() => window.open(session.class_link, "_blank")}
                              className="px-4 py-2 bg-gradient-to-r from-[#09314F] to-[#E83831] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 flex items-center gap-1.5"
                            >
                              <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Join
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {selectedDateSessions.length === 0 && (
                  <div className="text-center py-12 text-gray-400 dark:text-gray-500">
                    <InformationCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No Master Classes scheduled for this date.</p>
                    <button
                      onClick={() => {
                        setSelectedDateForModal(null);
                        setShowCreateModal(true);
                      }}
                      className="mt-3 px-4 py-2 bg-primary text-white text-xs font-bold rounded-xl shadow-md"
                    >
                      Schedule Master Class
                    </button>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => setSelectedDateForModal(null)}
                  className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- PREMIUM SESSION & TUTOR DETAILS MODAL --- */}
        {selectedSession && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              
              {/* Header Banner */}
              <div className="p-6 bg-gradient-to-r from-[#09314F] via-[#1a4a6e] to-[#E83831] text-white relative">
                <button
                  onClick={() => setSelectedSession(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition-all"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-white/20 text-white">
                    {selectedSession.subject_name}
                  </span>
                  <span className="text-[11px] font-bold text-white/80">
                    Tier: {selectedSession.class_tier}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold">{selectedSession.topic}</h3>
                <div className="text-xs text-white/80 mt-1 flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <CalendarDaysIcon className="w-4 h-4 text-white/80" /> {selectedSession.session_date}
                  </span>
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4 text-white/80" /> {selectedSession.starts_at} - {selectedSession.ends_at}
                  </span>
                </div>
              </div>

              {/* Navigation Tabs inside Modal */}
              <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 px-6">
                <button
                  onClick={() => setModalTab("overview")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    modalTab === "overview"
                      ? "border-primary text-primary dark:text-white dark:border-white"
                      : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  <CalendarDaysIcon className="w-4 h-4" /> Class Overview
                </button>
                <button
                  onClick={() => setModalTab("tutor")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    modalTab === "tutor"
                      ? "border-primary text-primary dark:text-white dark:border-white"
                      : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  <UserIcon className="w-4 h-4" /> Tutor Profile & Track Record
                </button>
                <button
                  onClick={() => setModalTab("recordings")}
                  className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                    modalTab === "recordings"
                      ? "border-primary text-primary dark:text-white dark:border-white"
                      : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                  }`}
                >
                  <PlayCircleIcon className="w-4 h-4" /> Video Recordings ({tutorTrackRecord.recordings.length})
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-sm text-gray-700 dark:text-gray-200 flex-1">
                
                {/* --- TAB 1: OVERVIEW --- */}
                {modalTab === "overview" && (
                  <div className="space-y-4">
                    {/* Tutor Spotlight Card */}
                    <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#09314F] to-[#E83831] text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                          {selectedSession.tutor.initials}
                        </div>
                        <div>
                          <p className="text-xs text-gray-400 font-semibold">Assigned Tutor</p>
                          <h4 className="text-base font-extrabold text-[#09314F] dark:text-white">
                            {selectedSession.tutor.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{selectedSession.tutor.role} • {selectedSession.subject_name}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setModalTab("tutor")}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 shadow-sm"
                      >
                        View History
                      </button>
                    </div>

                    {/* Description */}
                    <div>
                      <span className="text-xs text-gray-400 font-bold block mb-1">Session Description</span>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50/50 dark:bg-gray-800/30 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        {selectedSession.description}
                      </p>
                    </div>

                    {/* Meeting Link Box */}
                    {selectedSession.class_link && (
                      <div>
                        <span className="text-xs text-gray-400 font-bold block mb-1.5">Live Meeting Link</span>
                        <div className="flex items-center gap-2 p-2.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/40">
                          <VideoCameraIcon className="w-5 h-5 text-primary shrink-0" />
                          <input
                            type="text"
                            readOnly
                            value={selectedSession.class_link}
                            className="bg-transparent text-xs w-full text-gray-700 dark:text-gray-300 focus:outline-none font-mono"
                          />
                          <button
                            onClick={() => copyClassLink(selectedSession.class_link, "modal")}
                            className="p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300 transition-all"
                            title="Copy link"
                          >
                            {copiedLink === "modal" ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* --- TAB 2: TUTOR PROFILE & TRACK RECORD --- */}
                {modalTab === "tutor" && (
                  <div className="space-y-5">
                    {/* Tutor Header Card */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#09314F] to-[#E83831] text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
                          {selectedSession.tutor.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-extrabold text-[#09314F] dark:text-white">
                              {selectedSession.tutor.name}
                            </h4>
                            <CheckBadgeIcon className="w-5 h-5 text-blue-500" />
                          </div>
                          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{selectedSession.tutor.role} • {selectedSession.subject_name}</p>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <EnvelopeIcon className="w-3.5 h-3.5" /> {selectedSession.tutor.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <PhoneIcon className="w-3.5 h-3.5" /> {selectedSession.tutor.phone}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-center sm:text-right bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <span className="text-[10px] uppercase font-bold text-gray-400 block">Total Classes</span>
                        <span className="text-xl font-extrabold text-[#09314F] dark:text-white">{tutorTrackRecord.totalClasses}</span>
                      </div>
                    </div>

                    {/* Previous Classes Conducted by this Tutor */}
                    <div>
                      <h5 className="text-xs font-extrabold text-[#09314F] dark:text-white uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                        <SparklesIcon className="w-4 h-4 text-amber-500" />
                        Previous Classes Conducted by {selectedSession.tutor.name}
                      </h5>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {tutorTrackRecord.pastClasses.map(pc => (
                          <div key={pc.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs">
                            <div>
                              <span className="text-[10px] font-bold text-primary dark:text-blue-300">{pc.session_date}</span>
                              <p className="font-bold text-gray-800 dark:text-gray-200">{pc.topic}</p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Completed
                            </span>
                          </div>
                        ))}

                        {tutorTrackRecord.pastClasses.length === 0 && (
                          <div className="text-center py-6 text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold">This is the tutor's first scheduled class on the platform.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* --- TAB 3: RECORDINGS & VIDEO VAULT --- */}
                {modalTab === "recordings" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-extrabold text-[#09314F] dark:text-white uppercase tracking-wider">
                        Recorded Videos Linked to {selectedSession.tutor.name}
                      </h5>
                      <span className="text-xs font-bold text-gray-400">{tutorTrackRecord.recordings.length} Videos</span>
                    </div>

                    <div className="space-y-3">
                      {tutorTrackRecord.recordings.map(rec => (
                        <div
                          key={rec.id}
                          className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-600 text-white rounded-xl shadow-md">
                              <PlayCircleIcon className="w-6 h-6" />
                            </div>
                            <div>
                              <span className="text-[10px] font-extrabold text-purple-600 dark:text-purple-400 uppercase">
                                {rec.subject_name} • {rec.session_date}
                              </span>
                              <h4 className="text-sm font-bold text-gray-900 dark:text-white">{rec.topic}</h4>
                            </div>
                          </div>

                          <button
                            onClick={() => window.open(rec.recording_link || rec.recording_url, "_blank")}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0"
                          >
                            <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Watch Video
                          </button>
                        </div>
                      ))}

                      {tutorTrackRecord.recordings.length === 0 && (
                        <div className="text-center py-10 text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                          <PlayCircleIcon className="w-10 h-10 mx-auto mb-1.5 opacity-30 text-purple-500" />
                          <p className="text-xs font-bold text-gray-600 dark:text-gray-300">No video recordings uploaded for this tutor yet.</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Recordings will automatically attach here once class sessions conclude.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <span className="text-xs text-gray-400 font-medium">
                  Tutor ID: {selectedSession.tutor.id || "Faculty-01"}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors"
                  >
                    Close
                  </button>
                  {selectedSession.class_link && (
                    <button
                      onClick={() => window.open(selectedSession.class_link, "_blank")}
                      className="px-5 py-2.5 bg-gradient-to-r from-[#09314F] to-[#E83831] text-white text-xs font-bold rounded-xl shadow-md hover:opacity-90 flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4" /> Launch / Join Classroom
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* --- SCHEDULE MASTER CLASS MODAL --- */}
        {showCreateModal && (
          <CreateMasterClassModal
            onClose={() => {
              setShowCreateModal(false);
              fetchAllSchedules();
            }}
          />
        )}

      </div>
    </StaffDashboardLayout>
  );
}
