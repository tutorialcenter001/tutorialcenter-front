import React, { useState, useEffect, useCallback, useMemo } from "react";
import StaffDashboardLayout from "../../components/private/staffs/DashboardLayout.jsx";
import axios from "axios";
import { 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClockIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BellIcon,
  SparklesIcon,
  UserGroupIcon,
  AcademicCapIcon
} from "@heroicons/react/24/outline";

// Official Tutorial Center African Time Zone (West Africa Time / UTC+1)
const AFRICAN_TIMEZONE = "Africa/Lagos";

// Helper to get African Date in YYYY-MM-DD format strictly tied to Africa/Lagos
const getAfricanDateYMD = (d = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: AFRICAN_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
};

// Helper to get current African time in minutes from midnight (0..1439)
const getAfricanMinutes = (d = new Date()) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: AFRICAN_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.format(d).split(":");
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
};

// Helper to format timestamps strictly in African local time (WAT)
const formatAfricanTime = (dateInput) => {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  return d.toLocaleTimeString("en-US", {
    timeZone: AFRICAN_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// Subject Color & Accent Token Mapping
const getSubjectTheme = (name = "") => {
  const n = (name || "").toLowerCase();
  if (n.includes("physics")) {
    return {
      bg: "bg-purple-500/10 dark:bg-purple-500/20",
      border: "border-purple-500/30",
      text: "text-purple-600 dark:text-purple-300",
      badge: "bg-purple-600 text-white",
      glow: "shadow-purple-500/15",
      accent: "#A855F7"
    };
  }
  if (n.includes("chemistry")) {
    return {
      bg: "bg-sky-500/10 dark:bg-sky-500/20",
      border: "border-sky-500/30",
      text: "text-sky-600 dark:text-sky-300",
      badge: "bg-sky-600 text-white",
      glow: "shadow-sky-500/15",
      accent: "#0EA5E9"
    };
  }
  if (n.includes("biology")) {
    return {
      bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-300",
      badge: "bg-emerald-600 text-white",
      glow: "shadow-emerald-500/15",
      accent: "#10B981"
    };
  }
  if (n.includes("further")) {
    return {
      bg: "bg-rose-500/10 dark:bg-rose-500/20",
      border: "border-rose-500/30",
      text: "text-rose-600 dark:text-rose-300",
      badge: "bg-rose-600 text-white",
      glow: "shadow-rose-500/15",
      accent: "#F43F5E"
    };
  }
  if (n.includes("math")) {
    return {
      bg: "bg-amber-500/10 dark:bg-amber-500/20",
      border: "border-amber-500/30",
      text: "text-amber-600 dark:text-amber-300",
      badge: "bg-amber-600 text-white",
      glow: "shadow-amber-500/15",
      accent: "#F59E0B"
    };
  }
  if (n.includes("english")) {
    return {
      bg: "bg-teal-500/10 dark:bg-teal-500/20",
      border: "border-teal-500/30",
      text: "text-teal-600 dark:text-teal-300",
      badge: "bg-teal-600 text-white",
      glow: "shadow-teal-500/15",
      accent: "#14B8A6"
    };
  }
  return {
    bg: "bg-[#0F2843]/10 dark:bg-white/10",
    border: "border-[#0F2843]/20 dark:border-white/20",
    text: "text-[#0F2843] dark:text-[#C5A97A]",
    badge: "bg-[#0F2843] dark:bg-[#C5A97A] text-white dark:text-[#09314F]",
    glow: "shadow-[#0F2843]/10",
    accent: "#C5A97A"
  };
};

const extractTutorInfo = (source) => {
  if (!source) return { name: "Assigned Tutor", initials: "AT", email: "" };
  const staffs = source.staffs || source.staff || [];
  const tutorStaff = Array.isArray(staffs)
    ? staffs.find(s => (s.role || s.pivot?.role || "").toLowerCase().includes("tutor") || (s.role || s.pivot?.role || "").toLowerCase().includes("lead")) || staffs[0]
    : staffs;
  
  if (tutorStaff) {
    const s = tutorStaff.staff || tutorStaff;
    const name = s.firstname && s.surname ? `${s.firstname} ${s.surname}` : (s.name || "Assigned Tutor");
    return {
      name,
      initials: (name.split(" ").map(n => n[0]).join("") || "TC").toUpperCase().slice(0, 2),
      email: s.email || "",
      tel: s.tel || "",
      avatar: s.profile_picture || null,
    };
  }
  return { name: "Assigned Tutor", initials: "AT", email: "" };
};

// Robust Unified Extractor
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

    const rawDate = session.session_date || session.date || session.scheduled_date || session.start_date;
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
      title: session.title || source.title || `${subject} Master Class`,
      subject_name: subject,
      subject: source.subject || { name: subject },
      class: {
        ...source,
        subject: source.subject || { name: subject },
        staffs: source.staffs || [],
        enrolled_students: session.enrolled_students || source.enrolled_students || [],
      },
      enrolled_students: session.enrolled_students || source.enrolled_students || [],
      attendances: session.attendances || [],
      tutor,
      tutor_name: tutor.name,
      class_link: link,
      recording_link: recording,
    });
  };

  const processClassItem = (cls) => {
    if (!cls) return;
    if (Array.isArray(cls.schedules)) {
      cls.schedules.forEach(sched => {
        if (Array.isArray(sched.sessions)) {
          sched.sessions.forEach(session => {
            pushSession(session, cls);
          });
        }
      });
    }
    if (Array.isArray(cls.sessions)) {
      cls.sessions.forEach(session => {
        pushSession(session, cls);
      });
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

export default function StaffStudentSchedule() {
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const token = localStorage.getItem("staff_token");
  const staffRole = (localStorage.getItem("staff_role") || "").toLowerCase();
  const isAdvisor = staffRole === "course_advisor" || staffRole === "advisor";

  // --- STATE ---
  const [selectedDate, setSelectedDate] = useState(() => getAfricanDateYMD(new Date()));
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'live', 'scheduled', 'completed'
  const [loading, setLoading] = useState(true);
  const [classesData, setClassesData] = useState([]);
  const [studentsData, setStudentsData] = useState([]);
  const [expandedClassIds, setExpandedClassIds] = useState({});
  const [showLiveNotifications, setShowLiveNotifications] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationMeta, setPaginationMeta] = useState({
    current_page: 1,
    last_page: 1,
    total: 0,
    has_more: false,
    per_page: 50,
  });

  // --- FETCH SCHEDULE & ENROLLED STUDENTS ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      };

      const scheduleUrl = isAdvisor
        ? `${API_BASE_URL}/api/advisor/classes/schedule?page=${currentPage}&per_page=50`
        : `${API_BASE_URL}/api/admin/classes/all?page=${currentPage}&per_page=50`;

      const studentsUrl = isAdvisor
        ? `${API_BASE_URL}/api/advisor/students/all`
        : `${API_BASE_URL}/api/admin/students/all`;

      const [scheduleRes, studentsRes] = await Promise.all([
        axios.get(scheduleUrl, config).catch((e) => {
          console.warn("Failed schedule fetch:", e);
          return { data: {} };
        }),
        axios.get(studentsUrl, config).catch((e) => {
          console.warn("Failed students fetch:", e);
          return { data: [] };
        }),
      ]);

      // Parse students list
      const rawStudents = studentsRes.data?.students || studentsRes.data?.data || studentsRes.data || [];
      const parsedStudents = Array.isArray(rawStudents) ? rawStudents : [];
      setStudentsData(parsedStudents);

      // Parse sessions using unified robust extractor
      const allSessionsList = extractFlatSessions(scheduleRes.data || {});
      setClassesData(allSessionsList);

      // Parse pagination metadata
      if (scheduleRes.data?.pagination) {
        setPaginationMeta(scheduleRes.data.pagination);
      } else if (scheduleRes.data?.total !== undefined) {
        setPaginationMeta({
          current_page: scheduleRes.data.current_page || currentPage,
          last_page: scheduleRes.data.last_page || 1,
          total: scheduleRes.data.total || allSessionsList.length,
          has_more: !!scheduleRes.data.has_more,
          per_page: scheduleRes.data.per_page || 50,
        });
      }

      // Automatically expand first 2 classes by default
      const initialExpanded = {};
      allSessionsList.slice(0, 3).forEach((s) => {
        initialExpanded[s.id] = true;
      });
      setExpandedClassIds(initialExpanded);

      // Extract live notifications
      const logs = [];
      allSessionsList.forEach((ses) => {
        const attends = ses.attendances || [];
        attends.forEach((att) => {
          if (att.joined_at) {
            logs.push({
              id: `${ses.id}-${att.student_id}`,
              student_name: att.student ? `${att.student.firstname} ${att.student.surname}` : "Student",
              class_title: ses.title || "Master Class",
              subject: ses.subject_name || "General",
              status: att.status || "present",
              joined_at: formatAfricanTime(att.joined_at),
            });
          }
        });
      });
      setNotificationLogs(logs.slice(0, 8));

      // Auto check if any class is currently live in Africa
      const africanTodayStr = getAfricanDateYMD(new Date());
      const hasLive = allSessionsList.some((s) => {
        const dStr = s.session_date ? String(s.session_date).split("T")[0].split(" ")[0] : "";
        return dStr === africanTodayStr && s.starts_at && s.ends_at;
      });
      if (hasLive) {
        setShowLiveNotifications(true);
      }

    } catch (error) {
      console.error("❌ Failed to load student schedule data:", error);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token, isAdvisor, currentPage]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- HELPERS ---
  const formatDateStr = (dateStr) => {
    if (!dateStr) return "";
    const cleanStr = String(dateStr).split("T")[0].split(" ")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-GB", { timeZone: AFRICAN_TIMEZONE, day: "2-digit", month: "short", year: "numeric" });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", { timeZone: AFRICAN_TIMEZONE, day: "2-digit", month: "short", year: "numeric" });
  };

  const formatTimeStr = (timeStr) => {
    if (!timeStr) return "TBD";
    const [h, m] = timeStr.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "pm" : "am";
    const h12 = hour % 12 || 12;
    return `${h12}:${m}${ampm}`;
  };

  const getSessionClassState = (session) => {
    if (!session || !session.session_date) return "scheduled";
    const todayStr = getAfricanDateYMD(new Date());
    const sessionDateStr = String(session.session_date).split("T")[0].split(" ")[0];

    if (sessionDateStr < todayStr) return "completed";
    if (sessionDateStr > todayStr) return "scheduled";

    if (session.starts_at && session.ends_at) {
      const [startH, startM] = session.starts_at.split(":").map(Number);
      const [endH, endM] = session.ends_at.split(":").map(Number);

      const startTotalMins = (startH || 0) * 60 + (startM || 0);
      const endTotalMins = (endH || 0) * 60 + (endM || 0);
      const currentAfricanMins = getAfricanMinutes(new Date());

      if (currentAfricanMins >= startTotalMins && currentAfricanMins <= endTotalMins) return "live";
      if (currentAfricanMins > endTotalMins) return "completed";
      return "scheduled";
    }

    return "scheduled";
  };

  // Check if student is enrolled in a specific subject
  const isStudentEnrolled = (student, subjectId, subjectName, classTitle) => {
    if (!student) return false;
    const subIdStr = subjectId ? String(subjectId) : null;
    const subNameLower = (subjectName || "").toLowerCase().trim();
    const classTitleLower = (classTitle || "").toLowerCase().trim();

    const studentInfo = Array.isArray(student.information) ? student.information[0] : (student.information || {});
    
    const allStudentSubjects = [
      ...(Array.isArray(student.enrolled_subjects) ? student.enrolled_subjects : []),
      ...(Array.isArray(student.subject_enrollments) ? student.subject_enrollments : []),
      ...(Array.isArray(student.subjectEnrollments) ? student.subjectEnrollments : []),
      ...(Array.isArray(student.subjects) ? student.subjects : []),
      ...(Array.isArray(studentInfo.enrolled_subjects) ? studentInfo.enrolled_subjects : []),
      ...(Array.isArray(studentInfo.subjects) ? studentInfo.subjects : []),
      ...(Array.isArray(studentInfo.subject_enrollments) ? studentInfo.subject_enrollments : [])
    ];

    const courseEnrollments = [
      ...(Array.isArray(student.course_enrollments) ? student.course_enrollments : []),
      ...(Array.isArray(student.courseEnrollments) ? student.courseEnrollments : []),
      ...(Array.isArray(studentInfo.course_enrollments) ? studentInfo.course_enrollments : []),
      ...(Array.isArray(studentInfo.courses) ? studentInfo.courses : [])
    ];

    courseEnrollments.forEach((ce) => {
      if (ce && Array.isArray(ce.subjects)) {
        allStudentSubjects.push(...ce.subjects);
      }
      if (ce && ce.course && Array.isArray(ce.course.subjects)) {
        allStudentSubjects.push(...ce.course.subjects);
      }
    });

    for (const sub of allStudentSubjects) {
      if (!sub) continue;
      const sId = typeof sub === "object" ? String(sub.subject_id || sub.id || sub.subject?.id || "") : String(sub);
      const sName = typeof sub === "object" ? (sub.title || sub.name || sub.subject?.title || sub.subject?.name || sub.subject_name || "").toLowerCase().trim() : "";

      if (subIdStr && sId && sId === subIdStr) return true;
      if (subNameLower && sName && (sName === subNameLower || subNameLower.includes(sName) || sName.includes(subNameLower))) return true;
      if (classTitleLower && sName && (classTitleLower.includes(sName) || sName.includes(classTitleLower))) return true;
    }

    return false;
  };

  // Get enrolled students for a specific session/class
  const getEnrolledStudentsForClass = useCallback((session) => {
    const backendEnrolled = session.enrolled_students || session.class?.enrolled_students;
    if (Array.isArray(backendEnrolled) && backendEnrolled.length > 0) {
      return backendEnrolled;
    }

    const subjectId = session.class?.subject_id || session.class?.subject?.id;
    const subjectName = typeof session.class?.subject === "object" ? session.class?.subject?.name : session.subject_name;
    const classTitle = session.title || session.class?.title || session.class?.name || "";

    let enrolled = studentsData.filter((st) => isStudentEnrolled(st, subjectId, subjectName, classTitle));

    if (enrolled.length === 0 && session.attendances && session.attendances.length > 0) {
      enrolled = session.attendances
        .map((att) => att.student || studentsData.find((s) => s.id === att.student_id))
        .filter(Boolean);
    }

    return enrolled;
  }, [studentsData]);

  // Build attendance detail for a specific student in a class session
  const getStudentAttendanceInfo = (student, session) => {
    const attendances = session.attendances || [];
    const attRecord = attendances.find((a) => a.student_id === student.id || a.student?.id === student.id);
    const sessionState = getSessionClassState(session);

    if (!attRecord) {
      let defaultStatus = "absent";
      if (sessionState === "scheduled") {
        defaultStatus = "scheduled";
      } else if (sessionState === "live") {
        defaultStatus = "not_joined";
      }

      return {
        status: defaultStatus,
        joined_at: null,
        left_at: null,
        rejoin_count: 0,
        duration_minutes: 0,
        is_clean_exit: false,
      };
    }

    const joinedAt = attRecord.joined_at ? new Date(attRecord.joined_at) : null;
    const leftAt = attRecord.left_at ? new Date(attRecord.left_at) : null;
    let duration = 0;

    if (joinedAt && leftAt) {
      duration = Math.max(1, Math.round((leftAt - joinedAt) / 60000));
    } else if (attRecord.attendance_duration) {
      duration = Number(attRecord.attendance_duration) || 0;
    }

    return {
      status: attRecord.status || "present",
      joined_at: joinedAt ? formatAfricanTime(joinedAt) : null,
      left_at: leftAt ? formatAfricanTime(leftAt) : null,
      rejoin_count: attRecord.rejoin_count || 0,
      duration_minutes: duration,
      is_clean_exit: Boolean(attRecord.left_at),
    };
  };

  const toggleCardExpansion = (id) => {
    setExpandedClassIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // --- FILTERED SESSIONS LIST ---
  const filteredSessions = useMemo(() => {
    return classesData.filter((session) => {
      // 1. Date Filter (Strict YYYY-MM-DD match)
      if (selectedDate && session.session_date) {
        const sessionDate = String(session.session_date).split("T")[0].split(" ")[0];
        if (sessionDate !== selectedDate) return false;
      }

      // 2. Status Filter
      const state = getSessionClassState(session);
      if (statusFilter !== "all" && state !== statusFilter) return false;

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (session.title || session.class?.title || "").toLowerCase().includes(q);
        const subjectName = typeof session.subject === "object" ? session.subject?.name : session.subject_name;
        const subjectMatch = (subjectName || "").toLowerCase().includes(q);
        const tutorMatch = (session.tutor_name || "").toLowerCase().includes(q);

        const enrolled = getEnrolledStudentsForClass(session);
        const studentMatch = enrolled.some((st) => `${st.firstname} ${st.surname} ${st.email}`.toLowerCase().includes(q));

        if (!titleMatch && !subjectMatch && !tutorMatch && !studentMatch) return false;
      }

      return true;
    });
  }, [classesData, selectedDate, statusFilter, searchQuery, getEnrolledStudentsForClass]);

  return (
    <StaffDashboardLayout pagetitle="Student Schedule & Live Attendance">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full min-h-screen space-y-8 pb-24">

        {/* ── HERO HEADER WITH GLASSMORPHISM & GOLD GLOW ───────────── */}
        <div className="relative overflow-hidden rounded-[36px] bg-gradient-to-r from-[#0F2843]/95 via-[#163759]/90 to-[#09314F]/95 backdrop-blur-2xl border border-white/15 p-7 sm:p-9 shadow-2xl shadow-[#0F2843]/20">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-gradient-to-br from-[#BB9E7F]/20 via-[#C5A97A]/10 to-transparent rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#BB9E7F]/15 text-[#BB9E7F] dark:text-[#d4b592] border border-[#BB9E7F]/30 backdrop-blur-md text-[11px] font-black uppercase tracking-widest shadow-sm">
                <SparklesIcon className="w-3.5 h-3.5" />
                <span>{isAdvisor ? "Course Advisor Schedule Hub" : "Admin Master Schedule & Roster"}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                Student Master Class Schedule
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Live attendance monitoring, enrolled student rosters, join timestamps, and session durations across all active masterclasses.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowLiveNotifications(!showLiveNotifications)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 border backdrop-blur-xl transition-all shadow-md active:scale-95 ${
                  showLiveNotifications
                    ? "bg-[#BB9E7F] text-[#0F2843] border-[#BB9E7F] shadow-[#BB9E7F]/25"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                <BellIcon className="w-4 h-4" />
                <span>Live Feed</span>
                {notificationLogs.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                )}
              </button>

              <button
                onClick={fetchData}
                disabled={loading}
                className="p-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-xl rounded-2xl transition-all shadow-md active:scale-95"
                title="Refresh Live Schedule"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin text-[#BB9E7F]" : ""}`} />
              </button>
            </div>
          </div>
        </div>

        {/* ── LIVE ACTIVITY DRAWER ─────────────────────────────────── */}
        {showLiveNotifications && (
          <div className="bg-[#0F2843]/80 backdrop-blur-xl rounded-3xl p-5 border border-[#BB9E7F]/30 shadow-2xl animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h4 className="text-xs font-black uppercase tracking-wider text-[#C5A97A]">Real-Time Attendance Stream</h4>
              </div>
              <span className="text-[10px] text-white/60 font-bold uppercase">{notificationLogs.length} Recent Joins</span>
            </div>

            {notificationLogs.length === 0 ? (
              <p className="text-xs text-white/70 italic py-2">No live join activity recorded yet today.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {notificationLogs.map((log, idx) => (
                  <div
                    key={idx}
                    className="bg-white/10 backdrop-blur-md rounded-2xl p-3 shrink-0 min-w-[260px] border border-white/10 text-xs shadow-md"
                  >
                    <div className="flex items-center justify-between font-black text-white mb-1">
                      <span className="truncate max-w-[170px]">{log.student_name}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                        {log.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/80 truncate">{log.subject} &bull; {log.class_title}</p>
                    <p className="text-[10px] text-[#C5A97A] font-bold mt-1">
                      Joined at {log.joined_at}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DATE NAVIGATOR & GLASSMORPHIC CONTROL BAR ────────────── */}
        <div className="bg-white/80 dark:bg-[#09314F]/70 backdrop-blur-2xl rounded-[30px] p-5 sm:p-6 border border-gray-200/80 dark:border-white/15 shadow-xl shadow-[#0F2843]/5 space-y-5">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            
            {/* Quick Date Pills */}
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 scrollbar-none">
              {[
                { label: "Today", offset: 0 },
                { label: "Tomorrow", offset: 1 },
                { label: "Yesterday", offset: -1 },
              ].map((btn, idx) => {
                const target = new Date();
                target.setDate(target.getDate() + btn.offset);
                const targetStr = getAfricanDateYMD(target);
                const isActive = selectedDate === targetStr;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(targetStr)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap shadow-sm active:scale-95 ${
                      isActive
                        ? "bg-gradient-to-r from-[#BB9E7F] to-[#D4B592] text-[#0F2843] shadow-md shadow-[#BB9E7F]/30 ring-2 ring-[#BB9E7F]/40"
                        : "bg-gray-100/90 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 border border-gray-200/60 dark:border-white/10"
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}

              {/* Specific Date Picker with Glass Capsule */}
              <div className="flex items-center gap-2 bg-gray-100/90 dark:bg-white/10 px-3.5 py-2 rounded-2xl border border-gray-200/80 dark:border-white/15 shrink-0 shadow-inner">
                <CalendarDaysIcon className="w-4 h-4 text-[#BB9E7F]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-gray-800 dark:text-white outline-none cursor-pointer"
                />
              </div>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: "all", label: "All Classes" },
                { id: "live", label: "🟢 Live Now" },
                { id: "scheduled", label: "🕒 Scheduled" },
                { id: "completed", label: "✅ Completed" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap border shadow-sm ${
                    statusFilter === st.id
                      ? "bg-[#0F2843] text-white border-[#0F2843] dark:bg-[#BB9E7F]/20 dark:text-[#BB9E7F] dark:border-[#BB9E7F]/40 font-black shadow-[#BB9E7F]/10"
                      : "bg-gray-50/70 dark:bg-white/5 border-gray-200/60 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by subject (e.g. Physics), topic, tutor, or student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-50/90 dark:bg-black/30 backdrop-blur-md border border-gray-200/80 dark:border-white/15 rounded-2xl text-xs font-bold text-gray-800 dark:text-white placeholder-gray-400 outline-none focus:ring-4 focus:ring-[#BB9E7F]/20 focus:border-[#BB9E7F] transition-all shadow-inner"
            />
          </div>
        </div>

        {/* ── SCHEDULE CARDS CONTAINER ─────────────────────────────── */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 bg-white/40 dark:bg-[#09314F]/40 rounded-[36px] border border-gray-200/40 dark:border-white/10 animate-pulse backdrop-blur-xl"
              />
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white/80 dark:bg-[#09314F]/70 backdrop-blur-2xl rounded-[36px] p-14 border border-gray-200/80 dark:border-white/15 text-center space-y-4 shadow-xl">
            <div className="w-20 h-20 rounded-3xl bg-[#BB9E7F]/15 border border-[#BB9E7F]/30 text-[#BB9E7F] flex items-center justify-center mx-auto text-3xl font-black shadow-lg shadow-[#BB9E7F]/10">
              <CalendarDaysIcon className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-black text-gray-800 dark:text-white">No Scheduled Classes for {formatDateStr(selectedDate)}</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              There are no masterclasses listed for this date. Select another date from the pills or calendar to inspect upcoming and completed schedules.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {filteredSessions.map((session) => {
              const isExpanded = !!expandedClassIds[session.id];
              const state = getSessionClassState(session);
              const subjectName = session.subject_name || "General Studies";
              const classTitle = session.title || `${subjectName} Masterclass`;
              const enrolledStudents = getEnrolledStudentsForClass(session);
              const theme = getSubjectTheme(subjectName);
              
              // Calculate Attendance Breakdown
              let presentCount = 0;
              let lateCount = 0;
              let disconnectedCount = 0;
              let absentCount = 0;

              enrolledStudents.forEach((st) => {
                const info = getStudentAttendanceInfo(st, session);
                if (info.status === "present") presentCount++;
                else if (info.status === "late") lateCount++;
                else if (info.status === "absent") absentCount++;
                if (info.rejoin_count > 0 || (info.joined_at && !info.is_clean_exit && state === "completed")) {
                  disconnectedCount++;
                }
              });

              const tutorName = session.tutor_name || "Assigned Tutor";

              return (
                <div
                  key={session.id}
                  className="bg-white/90 dark:bg-[#0F2843]/80 backdrop-blur-2xl rounded-[36px] border border-gray-200/90 dark:border-white/15 shadow-xl hover:shadow-2xl hover:border-[#BB9E7F]/40 transition-all duration-300 overflow-hidden group"
                >
                  {/* ── CARD HEADER (Schedule Details & Quick Metrics) ── */}
                  <div className="p-6 sm:p-8 border-b border-gray-100 dark:border-white/10 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                      
                      {/* Left: Class Subject & Topic */}
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${theme.bg} ${theme.text} border ${theme.border} shadow-sm`}>
                            {subjectName}
                          </span>
                          
                          {/* Live / Status Indicator */}
                          {state === "live" ? (
                            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 animate-pulse shadow-sm shadow-emerald-500/20">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              Live Now
                            </span>
                          ) : state === "completed" ? (
                            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                              Completed
                            </span>
                          ) : (
                            <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              Upcoming
                            </span>
                          )}

                          <span className="text-xs font-bold text-gray-400 dark:text-gray-400">
                            {formatDateStr(session.session_date)}
                          </span>
                        </div>

                        <h2 className="text-xl sm:text-2xl font-black text-[#0F2843] dark:text-white tracking-tight">
                          {classTitle}
                        </h2>

                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-300 font-medium">
                          <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-black/20 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-white/5">
                            <ClockIcon className="w-4 h-4 text-[#BB9E7F]" />
                            {formatTimeStr(session.starts_at)} - {formatTimeStr(session.ends_at)}
                          </span>
                          <span>&bull;</span>
                          <span className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1.5">
                            <AcademicCapIcon className="w-4 h-4 text-[#BB9E7F]" />
                            Tutor: {tutorName}
                          </span>
                        </div>
                      </div>

                      {/* Right: Quick Attendance Summary Metrics */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="bg-white/50 dark:bg-black/30 backdrop-blur-md border border-gray-200 dark:border-white/15 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                          <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">Enrolled</span>
                          <span className="text-base font-black text-[#0F2843] dark:text-white">{enrolledStudents.length}</span>
                        </div>

                        {state === "scheduled" ? (
                          <div className="bg-blue-500/10 dark:bg-blue-500/20 backdrop-blur-md border border-blue-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm shadow-blue-500/5">
                            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-300 block">Scheduled</span>
                            <span className="text-base font-black text-blue-700 dark:text-blue-300">{enrolledStudents.length}</span>
                          </div>
                        ) : state === "live" ? (
                          <>
                            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm shadow-emerald-500/10">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">Present</span>
                              <span className="text-base font-black text-emerald-700 dark:text-emerald-300">{presentCount}</span>
                            </div>

                            {lateCount > 0 && (
                              <div className="bg-amber-500/10 dark:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Late</span>
                                <span className="text-base font-black text-amber-700 dark:text-amber-300">{lateCount}</span>
                              </div>
                            )}

                            {disconnectedCount > 0 && (
                              <div className="bg-orange-500/10 dark:bg-orange-500/20 backdrop-blur-md border border-orange-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-300 block">Rejoined</span>
                                <span className="text-base font-black text-orange-700 dark:text-orange-300">{disconnectedCount}</span>
                              </div>
                            )}

                            <div className="bg-amber-500/10 dark:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Not Joined</span>
                              <span className="text-base font-black text-amber-700 dark:text-amber-300">
                                {Math.max(0, enrolledStudents.length - presentCount - lateCount)}
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-emerald-500/10 dark:bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">Present</span>
                              <span className="text-base font-black text-emerald-700 dark:text-emerald-300">{presentCount}</span>
                            </div>

                            {lateCount > 0 && (
                              <div className="bg-amber-500/10 dark:bg-amber-500/20 backdrop-blur-md border border-amber-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 block">Late</span>
                                <span className="text-base font-black text-amber-700 dark:text-amber-300">{lateCount}</span>
                              </div>
                            )}

                            {disconnectedCount > 0 && (
                              <div className="bg-orange-500/10 dark:bg-orange-500/20 backdrop-blur-md border border-orange-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm">
                                <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 dark:text-orange-300 block">Rejoined</span>
                                <span className="text-base font-black text-orange-700 dark:text-orange-300">{disconnectedCount}</span>
                              </div>
                            )}

                            <div className="bg-rose-500/10 dark:bg-rose-500/20 backdrop-blur-md border border-rose-500/30 px-4 py-2.5 rounded-2xl text-center shadow-sm shadow-rose-500/10">
                              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-300 block">Absent</span>
                              <span className="text-base font-black text-rose-700 dark:text-rose-300">{absentCount}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expand / Collapse Roster Trigger */}
                    <div className="pt-2 flex items-center justify-between border-t border-gray-100 dark:border-white/10">
                      <span className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <UserGroupIcon className="w-4 h-4 text-[#BB9E7F]" />
                        Attendance Roster for {subjectName} ({enrolledStudents.length} Registered Students)
                      </span>

                      <button
                        onClick={() => toggleCardExpansion(session.id)}
                        className="px-4 py-2 rounded-xl bg-gray-100/90 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-black text-gray-700 dark:text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <span>{isExpanded ? "Hide Student Roster" : "View Registered Students"}</span>
                        {isExpanded ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* ── CARD BODY (Registered Students & Attendance Table) ── */}
                  {isExpanded && (
                    <div className="p-6 bg-slate-50/70 dark:bg-black/30 backdrop-blur-xl space-y-4 animate-in fade-in duration-200">
                      {enrolledStudents.length === 0 ? (
                        <div className="py-10 text-center text-gray-400 text-xs font-bold border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                          No students are registered for this subject ({subjectName}) yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/80 dark:bg-[#09314F]/80 backdrop-blur-xl shadow-lg">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50/80 dark:bg-black/40 backdrop-blur-md text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider text-[10px] border-b border-gray-200/80 dark:border-white/10">
                              <tr>
                                <th className="py-3.5 px-4">Student</th>
                                <th className="py-3.5 px-4">Attendance Status</th>
                                <th className="py-3.5 px-4">Join Time</th>
                                <th className="py-3.5 px-4">Last Seen / Left</th>
                                <th className="py-3.5 px-4">Rejoin / Disconnects</th>
                                <th className="py-3.5 px-4">Stay Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium text-gray-700 dark:text-gray-200">
                              {enrolledStudents.map((student) => {
                                const att = getStudentAttendanceInfo(student, session);
                                const initials = `${student.firstname?.[0] || ""}${student.surname?.[0] || ""}`.toUpperCase() || "ST";

                                return (
                                  <tr
                                    key={student.id}
                                    className="hover:bg-[#BB9E7F]/10 dark:hover:bg-white/5 transition-colors"
                                  >
                                    {/* Student Identity */}
                                    <td className="py-4 px-4">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#0F2843] to-[#1E3A5F] dark:from-[#BB9E7F] dark:to-[#d4b592] text-white dark:text-[#09314F] font-black text-xs flex items-center justify-center shrink-0 shadow-md">
                                          {initials}
                                        </div>
                                        <div className="min-w-0">
                                          <p className="font-bold text-gray-900 dark:text-white truncate">
                                            {student.firstname} {student.surname}
                                          </p>
                                          <p className="text-[10px] text-gray-400 truncate">{student.email}</p>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Attendance Status */}
                                    <td className="py-4 px-4">
                                      {att.status === "present" ? (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30 shadow-sm">
                                          ● Present
                                        </span>
                                      ) : att.status === "late" ? (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm">
                                          ● Late
                                        </span>
                                      ) : att.status === "scheduled" ? (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shadow-sm">
                                          ● Scheduled
                                        </span>
                                      ) : att.status === "not_joined" ? (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 shadow-sm">
                                          ● Not Joined
                                        </span>
                                      ) : (
                                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-sm">
                                          ● Absent
                                        </span>
                                      )}
                                    </td>

                                    {/* Join Time */}
                                    <td className="py-4 px-4 font-bold text-gray-600 dark:text-gray-300">
                                      {att.joined_at || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>

                                    {/* Last Active / Left */}
                                    <td className="py-4 px-4 font-bold text-gray-600 dark:text-gray-300">
                                      {att.left_at || <span className="text-gray-300 dark:text-gray-600">—</span>}
                                    </td>

                                    {/* Rejoin / Drop count */}
                                    <td className="py-4 px-4">
                                      {att.rejoin_count > 0 ? (
                                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30">
                                          ⚠️ Rejoined {att.rejoin_count}x
                                        </span>
                                      ) : att.status !== "absent" && att.status !== "scheduled" ? (
                                        <span className="text-[11px] text-gray-400 font-bold">Stable (0)</span>
                                      ) : (
                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                      )}
                                    </td>

                                    {/* Stay Duration */}
                                    <td className="py-4 px-4">
                                      {att.duration_minutes > 0 ? (
                                        <div className="space-y-1">
                                          <span className="font-black text-[#0F2843] dark:text-[#C5A97A]">
                                            {att.duration_minutes} mins
                                          </span>
                                          <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-emerald-500 rounded-full"
                                              style={{ width: `${Math.min(100, (att.duration_minutes / 90) * 100)}%` }}
                                            />
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-gray-300 dark:text-gray-600">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── PAGINATION CONTROLS (50 + 50 SESSIONS) ───────────────── */}
        {!loading && filteredSessions.length > 0 && paginationMeta.total > 0 && (
          <div className="bg-white/80 dark:bg-[#09314F]/70 backdrop-blur-2xl rounded-[30px] p-5 sm:p-6 border border-gray-200/80 dark:border-white/15 shadow-xl shadow-[#0F2843]/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs font-bold text-gray-500 dark:text-gray-300 flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-[#BB9E7F]" />
              <span>
                Showing{" "}
                <span className="font-black text-[#0F2843] dark:text-[#C5A97A]">
                  {((currentPage - 1) * paginationMeta.per_page) + 1}
                </span>
                {" "}–{" "}
                <span className="font-black text-[#0F2843] dark:text-[#C5A97A]">
                  {Math.min(currentPage * paginationMeta.per_page, paginationMeta.total)}
                </span>
                {" "}of{" "}
                <span className="font-black text-[#0F2843] dark:text-[#C5A97A]">
                  {paginationMeta.total}
                </span>
                {" "}masterclasses (Page {currentPage} of {Math.max(1, paginationMeta.last_page)})
              </span>
            </div>

            {paginationMeta.last_page > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    window.scrollTo({ top: 320, behavior: "smooth" });
                  }}
                  disabled={currentPage <= 1}
                  className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-gray-100/90 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 border-gray-200/60 dark:border-white/10 active:scale-95"
                >
                  &larr; Previous 50
                </button>

                <div className="flex items-center gap-1.5 px-2">
                  {Array.from({ length: paginationMeta.last_page }, (_, i) => i + 1).map((pageNum) => {
                    const isActive = pageNum === currentPage;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => {
                          setCurrentPage(pageNum);
                          window.scrollTo({ top: 320, behavior: "smooth" });
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 ${
                          isActive
                            ? "bg-gradient-to-r from-[#BB9E7F] to-[#D4B592] text-[#0F2843] shadow-md shadow-[#BB9E7F]/30 ring-2 ring-[#BB9E7F]/40"
                            : "bg-gray-100/90 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 border border-gray-200/60 dark:border-white/10"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(paginationMeta.last_page, prev + 1));
                    window.scrollTo({ top: 320, behavior: "smooth" });
                  }}
                  disabled={currentPage >= paginationMeta.last_page}
                  className="px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-[#BB9E7F] to-[#D4B592] text-[#0F2843] font-black shadow-md shadow-[#BB9E7F]/20 active:scale-95 hover:opacity-90"
                >
                  Next 50 &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </StaffDashboardLayout>
  );
}
