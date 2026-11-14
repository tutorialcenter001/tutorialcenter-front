// pages/Admin/MasterClass/MasterClassList.jsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import CreateMasterClassModal from "../../../components/private/staffs/AdminMasterclassModal.jsx";
import MasterClassDetailModal from "../../../components/private/staffs/MasterClassDetailModal.jsx";
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserCircleIcon,
  VideoCameraIcon
} from "@heroicons/react/24/outline";
import { Icon } from "@iconify/react";

// --- HELPERS ---
const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "pm" : "am";
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
};

const calculateEndTime = (timeStr, durationMinutes = 90) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  if (isNaN(h)) return "";
  const totalMins = h * 60 + (m || 0) + Number(durationMinutes || 90);
  const endH = Math.floor(totalMins / 60) % 24;
  const endM = totalMins % 60;
  return formatTime(`${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`);
};

const getStaffName = (cls) => {
  const staff = cls.staffs?.[0];
  if (!staff) return "Unassigned";
  const s = staff.staff || staff;
  if (s.firstname && s.surname) return `${s.firstname} ${s.surname}`;
  return s.name || "Unassigned";
};

// --- STANDALONE CLASS ROW COMPONENT ---
function ClassRow({ cls, copiedLink, onCopyLink, onSelectDetail, onEdit, canEdit = true }) {
  const isLinkCopied = copiedLink === cls.id;
  const startDate = cls.start_date || cls.schedules?.[0]?.start_date;
  const endDate = cls.end_date || cls.schedules?.[0]?.end_date;
  
  const statusStr = String(cls.status || "active").toLowerCase().trim();
  const isCancelled = statusStr === "cancelled" || statusStr === "canceled";
  const isProposed = statusStr === "proposed" || statusStr === "rescheduled";
  const isActive = statusStr === "active";
  
  const isPrivate = Boolean(
    cls.is_private === true || 
    cls.is_private === 1 || 
    cls.is_private === "1" || 
    cls.is_private === "true" || 
    cls.private_student_id
  );
  const privateStudent = cls.private_student || cls.privateStudent || null;
  const privEnrollment = cls.private_enrollment || cls.privateEnrollment || null;
  const isFreeGrant = privEnrollment?.payment_method === "free_grant" || privEnrollment?.amount_paid === 0;

  let link = cls.class_link;
  if (!link && cls.schedules && cls.schedules.length > 0) {
     for (let sched of cls.schedules) {
        if (sched.sessions && sched.sessions.length > 0) {
           const found = sched.sessions.find(s => s.class_link);
           if (found) { link = found.class_link; break; }
        }
     }
  }

  return (
    <div 
      onClick={() => onSelectDetail(cls)}
      className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700/40 last:border-0 hover:bg-gray-50/80 dark:hover:bg-gray-700/30 transition-all rounded-2xl group cursor-pointer ${
        isPrivate 
          ? "border-l-4 border-l-amber-500 bg-amber-500/[0.02]" 
          : ""
      }`}
    >
      {/* Left Side: Avatar + Title + Instructor + Badges */}
      <div className="flex items-start sm:items-center gap-3.5 min-w-[260px] flex-1">
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm transition-transform group-hover:scale-105 ${
            isCancelled
              ? "bg-gradient-to-tr from-rose-600 to-rose-700 text-white"
              : isProposed
              ? "bg-gradient-to-tr from-amber-500 to-amber-600 text-white"
              : isPrivate
              ? "bg-gradient-to-tr from-amber-600 to-[#0F2843] text-white ring-2 ring-amber-400/40"
              : isActive 
              ? "bg-gradient-to-tr from-blue-600 to-indigo-500 text-white" 
              : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
          }`}>
            {isPrivate ? (
              <Icon icon="mdi:account-school" className="w-6 h-6 text-amber-200" />
            ) : cls.title ? (
              cls.title.substring(0, 2).toUpperCase()
            ) : (
              "MC"
            )}
          </div>
          <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
            isCancelled ? "bg-rose-500" : isProposed ? "bg-amber-500" : isActive ? "bg-emerald-500" : "bg-gray-400"
          }`} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className={`text-base font-bold text-gray-900 dark:text-white truncate ${
              isCancelled ? "line-through text-rose-700 dark:text-rose-400" : ""
            }`} title={cls.title}>
              {cls.title}
            </h3>

            {isPrivate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs">
                <Icon icon="mdi:account-lock" className="w-3 h-3" />
                <span>Private 1-on-1</span>
              </span>
            )}

            {privateStudent && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs">
                <Icon icon="mdi:account-outline" className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Student: {privateStudent.firstname} {privateStudent.surname}</span>
              </span>
            )}

            {isFreeGrant && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                <Icon icon="mdi:gift-outline" className="w-3 h-3" />
                <span>Free Grant</span>
              </span>
            )}

            {cls.subject?.name && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                {cls.subject.name}
              </span>
            )}

            {isCancelled && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50">
                Cancelled
              </span>
            )}

            {isProposed && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                Proposed
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <UserCircleIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate font-medium">{getStaffName(cls)}</span>
          </div>
        </div>
      </div>

      {/* Middle Side: Date Range (Start Date -> End Date) & Weekly Schedule */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 lg:gap-6 min-w-[280px] sm:min-w-[320px] flex-1">
        {/* Start Date & End Date Timeline */}
        <div className={`flex flex-col px-3.5 py-2 rounded-xl border flex-1 sm:flex-initial min-w-[190px] ${
          isProposed 
            ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40" 
            : isCancelled
            ? "bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/40"
            : "bg-gray-50 dark:bg-gray-700/40 border-gray-100 dark:border-gray-700/60"
        }`}>
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-blue-500" />
            <span>Duration Timeline</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-gray-800 dark:text-gray-200">
            <span>{formatDate(startDate)}</span>
            <span className="text-gray-400 font-normal">to</span>
            <span>{formatDate(endDate)}</span>
          </div>
        </div>

        {/* Weekly Schedule Days & Times */}
        <div className="flex flex-col justify-center flex-1 sm:flex-initial min-w-[140px]">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-400 mb-1">
            <ClockIcon className="w-3.5 h-3.5 text-emerald-500" />
            <span>Weekly Schedule</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {cls.schedules && cls.schedules.length > 0 ? (
              cls.schedules.map((s, idx) => {
                const startTimeFormatted = formatTime(s.start_time);
                const endTimeFormatted = s.end_time 
                  ? formatTime(s.end_time) 
                  : calculateEndTime(s.start_time, s.duration_minutes || 90);

                return (
                  <span 
                    key={idx} 
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs ${
                      isCancelled 
                        ? "bg-gray-100 dark:bg-gray-700 text-gray-400 line-through" 
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/40"
                    }`}
                    title={`${s.day_of_week} from ${startTimeFormatted} to ${endTimeFormatted}`}
                  >
                    <span className="font-black text-emerald-800 dark:text-emerald-300">
                      {s.day_of_week.substring(0, 3).toUpperCase()}:
                    </span>
                    <span>{startTimeFormatted}</span>
                    {endTimeFormatted && (
                      <span className="text-emerald-600/70 dark:text-emerald-400/70 text-[10px] font-medium">
                        - {endTimeFormatted}
                      </span>
                    )}
                  </span>
                );
              })
            ) : (
              <span className="text-xs text-gray-400 italic">No schedule</span>
            )}
          </div>
        </div>
      </div>

      {/* Right Side: Links & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-gray-100 dark:border-gray-700/40">
        {/* Join Link */}
        {link && !isCancelled ? (
          <div className="flex items-center gap-1.5 bg-blue-50/80 dark:bg-blue-900/30 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800/50 shadow-2xs">
            <VideoCameraIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline"
              title="Open meeting link in new tab"
            >
              Zoom
            </a>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink(link, cls.id);
              }}
              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800/60 rounded-md transition-colors"
              title="Copy class link"
            >
              <Icon 
                icon={isLinkCopied ? "mdi:check" : "mdi:content-copy"} 
                className={`w-3.5 h-3.5 ${isLinkCopied ? "text-emerald-600" : "text-blue-500"}`} 
              />
            </button>
          </div>
        ) : isCancelled ? (
          <span className="text-[11px] font-bold text-rose-500 dark:text-rose-400 px-2 py-1.5 flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900/50">
            <Icon icon="mdi:video-off-outline" className="w-3.5 h-3.5" />
            <span>Closed</span>
          </span>
        ) : (
          <span className="text-xs text-gray-400 italic px-2">No meeting link</span>
        )}

        {/* View Details Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectDetail(cls);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50/80 hover:bg-[#0F2843] hover:text-white dark:bg-blue-950/30 dark:hover:bg-blue-600 text-[#0F2843] dark:text-blue-300 rounded-xl transition-all font-bold text-xs shadow-xs"
          title="View Master Class Details & Conditions"
        >
          <Icon icon="mdi:eye-outline" className="w-4 h-4" />
          <span>View</span>
        </button>

        {/* Edit Button - Restricted to Admins & COOs */}
        {canEdit && onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(cls);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-[#0F2843] hover:text-white dark:bg-gray-700 dark:hover:bg-blue-600 rounded-xl transition-all text-gray-700 dark:text-gray-200 font-bold text-xs shadow-xs"
            title="Edit Master Class"
          >
            <Icon icon="mdi:pencil-outline" className="w-4 h-4" />
            <span>Edit</span>
          </button>
        )}
      </div>
    </div>
  );
}

// --- MAIN MASTERCLASS LIST COMPONENT ---
export default function MasterClassList() {
  // --- STATE ---
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [toast, setToast] = useState(null);
  const [copiedLink, setCopiedLink] = useState(null);
  const [selectedClassDetail, setSelectedClassDetail] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const token = localStorage.getItem("staff_token");

  const storedStaff = JSON.parse(localStorage.getItem("staff_user") || localStorage.getItem("staff_info") || "{}");
  const staffRole = (storedStaff.role || "").toLowerCase();
  const canEditClasses = staffRole === "admin" || staffRole === "superadmin" || staffRole === "coo";

  // --- FETCHING LOGIC ---
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admin/classes/all`, {
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });
      
      const fetchedClasses = response?.data?.classes;
      
      if (Array.isArray(fetchedClasses)) {
        setClasses(fetchedClasses);
      } else {
        setClasses([]);
      }

    } catch (error) {
      console.error("Endpoint failed:", error.response?.status, error.response?.data);
      setClasses([]); 
      setToast({
        type: "error",
        message: "Failed to load classes."
      });
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCopyLink = (link, classId) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(classId);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const handleEditClass = (cls) => {
    setSelectedClassDetail(null);
    setEditingClass(cls);
    setShowCreateModal(true);
  };

  // --- FILTERED CLASSES (Latest to Oldest) ---
  const filteredClasses = useMemo(() => {
    if (!Array.isArray(classes)) return [];
    const list = classes.filter(cls => {
      // Status filter
      if (statusFilter !== "all") {
        const s = String(cls.status || "active").toLowerCase().trim();
        if (statusFilter === "cancelled") {
          if (s !== "cancelled" && s !== "canceled") return false;
        } else if (s !== statusFilter) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = cls.title?.toLowerCase().includes(q);
        const descMatch = cls.description?.toLowerCase().includes(q);
        const subjectMatch = cls.subject?.name?.toLowerCase().includes(q);
        const tutorMatch = getStaffName(cls).toLowerCase().includes(q);
        return titleMatch || descMatch || subjectMatch || tutorMatch;
      }

      return true;
    });

    // Sort latest created / scheduled first (descending)
    return list.sort((a, b) => {
      const dateA = new Date(a.created_at || a.start_date || 0).getTime();
      const dateB = new Date(b.created_at || b.start_date || 0).getTime();
      if (dateB !== dateA) return dateB - dateA;
      return (b.id || 0) - (a.id || 0);
    });
  }, [classes, searchQuery, statusFilter]);

  // --- RENDER ---
  return (
    <StaffDashboardLayout pagetitle="MASTER CLASS">
      {/* Toast */}
      {toast && (
        <div 
          className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-2xl shadow-2xl text-white transition-all duration-500 ${
            toast.type === "success" ? "bg-[#76D287]" : "bg-[#E83831]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-1 bg-white/20 rounded-full">
              <Icon icon={toast.type === "success" ? "mdi:check-circle" : "mdi:close-circle"} className="w-4 h-4" />
            </div>
            <p className="font-bold text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Create / Edit Class Modal */}
      {showCreateModal && (
        <CreateMasterClassModal
          editClass={editingClass}
          onClose={() => {
            setShowCreateModal(false);
            setEditingClass(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setEditingClass(null);
            fetchClasses();
            setToast({
              type: "success",
              message: editingClass ? "Master class updated successfully!" : "Master class created successfully!"
            });
          }}
        />
      )}

      <div className="p-6 max-w-[1600px] xl:px-10 mx-auto w-full">

        {/* ========= Header & Controls Bar ========= */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
              Created Master Classes
            </h1>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
              Manage masterclasses, weekly schedules, start & end dates, and assigned tutors
            </p>
          </div>

          {canEditClasses && (
            <button
              onClick={() => {
                setEditingClass(null);
                setShowCreateModal(true);
              }}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-[#0F2843] dark:bg-blue-600 hover:bg-[#1a3d60] dark:hover:bg-blue-500 text-white font-bold rounded-2xl text-sm shadow-md hover:shadow-lg transition-all active:scale-95 whitespace-nowrap"
            >
              <PlusIcon className="w-5 h-5" />
              <span>Schedule Master Class</span>
            </button>
          )}
        </div>

        {/* ========= Filter & Search Controls ========= */}
        <div className="flex flex-wrap items-center gap-4 mb-6 bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          {/* Search */}
          <div className="relative flex-1 min-w-[260px]">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by class title, subject, instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-800 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-blue-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-900/50 placeholder:text-gray-400"
            />
          </div>

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-700/50 p-1 rounded-xl flex-wrap">
            {["all", "active", "rescheduled", "cancelled", "inactive"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  statusFilter === status
                    ? "bg-white dark:bg-gray-800 text-[#0F2843] dark:text-white shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {status === "all" ? `All (${classes.length})` : status}
              </button>
            ))}
          </div>
        </div>

        {/* ========= Classes List ========= */}
        {loading ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#0F2843] dark:border-blue-500 mx-auto" />
            <p className="mt-4 text-sm font-bold text-gray-500">Loading master classes...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDaysIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">No master classes found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              {searchQuery ? "No classes match your search query." : "Get started by scheduling your first masterclass."}
            </p>
            {canEditClasses && (
              <button
                onClick={() => {
                  setEditingClass(null);
                  setShowCreateModal(true);
                }}
                className="mt-5 px-6 py-3 bg-[#0F2843] dark:bg-blue-600 text-white font-bold text-sm rounded-xl shadow hover:bg-opacity-90"
              >
                Schedule Master Class
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-3">
            <div className="divide-y divide-gray-100 dark:divide-gray-700/40">
              {filteredClasses.map(cls => (
                <ClassRow 
                  key={cls.id} 
                  cls={cls} 
                  copiedLink={copiedLink}
                  onCopyLink={handleCopyLink}
                  onSelectDetail={setSelectedClassDetail}
                  onEdit={canEditClasses ? handleEditClass : null}
                  canEdit={canEditClasses}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Detail Modal with Class Conditions (Reschedule, Cancelled, Active) */}
      {selectedClassDetail && (
        <MasterClassDetailModal
          cls={selectedClassDetail}
          onClose={() => setSelectedClassDetail(null)}
          onEdit={canEditClasses ? (target) => handleEditClass(target) : null}
          onConditionUpdated={canEditClasses ? (updatedClass) => {
            setClasses((prev) => prev.map((c) => (c.id === updatedClass.id ? { ...c, ...updatedClass } : c)));
            setSelectedClassDetail(updatedClass);
          } : null}
          canManageCondition={canEditClasses}
        />
      )}
    </StaffDashboardLayout>
  );
}
