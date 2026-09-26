import { useState, useEffect } from "react";
import {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  CreditCardIcon,
  TrophyIcon,
  DocumentTextIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { NavLink, useLocation } from "react-router-dom";
import { useTheme } from "../../../context/ThemeContext";
import logo from "../../../assets/images/tutorial_logo.webp";
import collapselogo from "../../../assets/images/TC 1.webp";
import { useStaffAuth } from "../../../context/StaffAuthContext";
import { isCsa, isReadOnlyStaff } from "../../../utils/roleUtils";


const adminNavSections = [
  {
    title: null,
    items: [{ label: "Overview", icon: HomeIcon, destination: "/staffs/dashboard" }],
  },
  {
    id: "management",
    title: "Management",
    icon: UserGroupIcon,
    items: [
      { label: "Manage Staffs", icon: UsersIcon, destination: "/staffs/manage-staffs" },
      { label: "Manage Students", icon: UserGroupIcon, destination: "/staffs/manage-students" },
      { label: "Manage Guardian", icon: ShieldCheckIcon, destination: "/staffs/manage-guardians" },
      { label: "Manage Courses", icon: BookOpenIcon, destination: "/staffs/manage-courses" },
    ],
  },
  {
    id: "class",
    title: "Class",
    icon: AcademicCapIcon,
    items: [
      { label: "Master Class", icon: AcademicCapIcon, destination: "/staffs/master-class" },
      { label: "Student Schedule", icon: CalendarDaysIcon, destination: "/staffs/student-schedule" },
      { label: "Calendar", icon: CalendarDaysIcon, destination: "/staffs/calendar" },
      { label: "Video Vault", icon: PlayCircleIcon, destination: "/staffs/recorded-classes" },
    ],
  },
  {
    id: "exam",
    title: "Exam",
    icon: ClipboardDocumentCheckIcon,
    items: [
      { label: "Exams", icon: ClipboardDocumentCheckIcon, destination: "/staffs/manage-exams" },
      { label: "Assessments", icon: ClipboardDocumentListIcon, destination: "/staffs/assessments" },
      { label: "School Tests", icon: ClipboardDocumentListIcon, destination: "/staffs/school-tests" },
      { label: "Student Leaderboard", icon: TrophyIcon, destination: "/staffs/leaderboard" },
    ],
  },
  {
    id: "finance_governance",
    title: "Finance & Governance",
    icon: CreditCardIcon,
    items: [
      { label: "Payments", icon: CreditCardIcon, destination: "/staffs/payments" },
      { label: "Blogs", icon: DocumentTextIcon, destination: "/staffs/manage-blogs" },
      { label: "Audit Log", icon: ChartBarIcon, destination: "/staffs/audit-logs" },
      { label: "Feedback", icon: ChartBarIcon, destination: "/staffs/feedback" },
      { label: "Settings", icon: Cog6ToothIcon },
    ],
  },
];

const cooNavSections = [
  {
    title: null,
    items: [{ label: "Overview", icon: HomeIcon, destination: "/staffs/coo/dashboard" }],
  },
  {
    id: "management",
    title: "Management",
    icon: UserGroupIcon,
    items: [
      { label: "Manage Staffs", icon: UsersIcon, destination: "/staffs/manage-staffs" },
      { label: "Manage Students", icon: UserGroupIcon, destination: "/staffs/manage-students" },
      { label: "Manage Guardian", icon: ShieldCheckIcon, destination: "/staffs/manage-guardians" },
      { label: "Manage Courses", icon: BookOpenIcon, destination: "/staffs/manage-courses" },
    ],
  },
  {
    id: "class",
    title: "Class",
    icon: AcademicCapIcon,
    items: [
      { label: "Master Class", icon: AcademicCapIcon, destination: "/staffs/master-class" },
      { label: "Student Schedule", icon: CalendarDaysIcon, destination: "/staffs/student-schedule" },
      { label: "Calendar", icon: CalendarDaysIcon, destination: "/staffs/calendar" },
      { label: "Video Vault", icon: PlayCircleIcon, destination: "/staffs/recorded-classes" },
    ],
  },
  {
    id: "exam",
    title: "Exam",
    icon: ClipboardDocumentCheckIcon,
    items: [
      { label: "Exams", icon: ClipboardDocumentCheckIcon, destination: "/staffs/manage-exams" },
      { label: "Assessments", icon: ClipboardDocumentListIcon, destination: "/staffs/assessments" },
      { label: "School Tests", icon: ClipboardDocumentListIcon, destination: "/staffs/school-tests" },
      { label: "Student Leaderboard", icon: TrophyIcon, destination: "/staffs/leaderboard" },
    ],
  },
  {
    id: "finance_governance",
    title: "Finance & Governance",
    icon: CreditCardIcon,
    items: [
      { label: "Payments", icon: CreditCardIcon, destination: "/staffs/payments" },
      { label: "Blogs", icon: DocumentTextIcon, destination: "/staffs/manage-blogs" },
      { label: "Audit Log", icon: ChartBarIcon, destination: "/staffs/audit-logs" },
      { label: "Feedback", icon: ChartBarIcon, destination: "/staffs/feedback" },
      { label: "Settings", icon: Cog6ToothIcon },
    ],
  },
];

const csaNavSections = [
  {
    title: null,
    items: [{ label: "Overview", icon: HomeIcon, destination: "/staffs/coo/dashboard" }],
  },
  {
    id: "management",
    title: "Management",
    icon: UserGroupIcon,
    items: [
      { label: "Manage Staffs", icon: UsersIcon, destination: "/staffs/manage-staffs" },
      { label: "Manage Students", icon: UserGroupIcon, destination: "/staffs/manage-students" },
      { label: "Manage Guardian", icon: ShieldCheckIcon, destination: "/staffs/manage-guardians" },
      { label: "Manage Courses", icon: BookOpenIcon, destination: "/staffs/manage-courses" },
    ],
  },
  {
    id: "class",
    title: "Class",
    icon: AcademicCapIcon,
    items: [
      { label: "Master Class", icon: AcademicCapIcon, destination: "/staffs/master-class" },
      { label: "Student Schedule", icon: CalendarDaysIcon, destination: "/staffs/student-schedule" },
      { label: "Calendar", icon: CalendarDaysIcon, destination: "/staffs/calendar" },
      { label: "Video Vault", icon: PlayCircleIcon, destination: "/staffs/recorded-classes" },
    ],
  },
  {
    id: "exam",
    title: "Exam & Questions",
    icon: ClipboardDocumentCheckIcon,
    items: [
      { label: "Past Questions", icon: ClipboardDocumentCheckIcon, destination: "/staffs/manage-exams" },
      { label: "Assessments", icon: ClipboardDocumentListIcon, destination: "/staffs/assessments" },
      { label: "School Tests", icon: ClipboardDocumentListIcon, destination: "/staffs/school-tests" },
      { label: "Student Leaderboard", icon: TrophyIcon, destination: "/staffs/leaderboard" },
    ],
  },
  {
    id: "finance_governance",
    title: "Finance & Governance",
    icon: CreditCardIcon,
    items: [
      { label: "Payments", icon: CreditCardIcon, destination: "/staffs/payments" },
      { label: "Blogs", icon: DocumentTextIcon, destination: "/staffs/manage-blogs" },
      { label: "Audit Log", icon: ChartBarIcon, destination: "/staffs/audit-logs" },
      { label: "Feedback", icon: ChartBarIcon, destination: "/staffs/feedback" },
      { label: "Settings", icon: Cog6ToothIcon },
    ],
  },
];


const tutorNavSections = [
  {
    title: null,
    items: [{ label: "Overview", icon: HomeIcon, destination: "/staffs/tutor/dashboard" }],
  },
  {
    id: "class",
    title: "Class",
    icon: AcademicCapIcon,
    items: [
      { label: "Master Class", icon: AcademicCapIcon, destination: "/staffs/tutor/master-class" },
      { label: "Calendar", icon: CalendarDaysIcon, destination: "/staffs/tutor/calendar" },
      { label: "Video Vault", icon: PlayCircleIcon, destination: "/staffs/recorded-classes" },
    ],
  },
  {
    id: "exam",
    title: "Exam & Performance",
    icon: ClipboardDocumentCheckIcon,
    items: [
      { label: "Student Leaderboard", icon: TrophyIcon, destination: "/staffs/leaderboard" },
      { label: "Assessment", icon: ClipboardDocumentListIcon, destination: "/staffs/tutor/assessments" },
      { label: "Exams", icon: ClipboardDocumentCheckIcon },
      { label: "Settings", icon: Cog6ToothIcon },
    ],
  },
];

const courseAdvisorNavSections = [
  {
    title: null,
    items: [{ label: "Overview", icon: HomeIcon, destination: "/staffs/course-advisor/dashboard" }],
  },
  {
    id: "management",
    title: "Management",
    icon: UserGroupIcon,
    items: [
      { label: "Manage Students", icon: UserGroupIcon, destination: "/staffs/course-advisor/students" },
      { label: "Manage Guardian", icon: ShieldCheckIcon, destination: "/staffs/course-advisor/guardians" },
    ],
  },
  {
    id: "class",
    title: "Class",
    icon: AcademicCapIcon,
    items: [
      { label: "Master Class", icon: AcademicCapIcon, destination: "/staffs/course-advisor/master-class" },
      { label: "Student Schedule", icon: CalendarDaysIcon, destination: "/staffs/course-advisor/student-schedule" },
      { label: "Calendar", icon: CalendarDaysIcon, destination: "/staffs/course-advisor/calendar" },
      { label: "Video Vault", icon: PlayCircleIcon, destination: "/staffs/recorded-classes" },
    ],
  },
  {
    id: "exam",
    title: "Exam",
    icon: ClipboardDocumentCheckIcon,
    items: [
      { label: "Student Leaderboard", icon: TrophyIcon, destination: "/staffs/leaderboard" },
      { label: "Exams", icon: ClipboardDocumentCheckIcon, destination: "/staffs/course-advisor/exams" },
      { label: "Settings", icon: Cog6ToothIcon },
    ],
  },
];

const moderatorNavSections = [
  {
    title: null,
    items: [
      { label: "Exams", icon: ClipboardDocumentCheckIcon, destination: "/staffs/manage-exams" },
      { label: "Payments", icon: CreditCardIcon, destination: "/staffs/payments" },
    ],
  },
];

export default function StaffSidebar({ collapsed, setCollapsed, isOpen, onClose }) {
  const { theme, setTheme } = useTheme();
  const { logout } = useStaffAuth();
  const location = useLocation();

  const [staffInfo, setStaffInfo] = useState(null);
  const [staffRole, setStaffRole] = useState("Staff");
  const [openGroups, setOpenGroups] = useState({
    management: true,
    class: true,
    exam: true,
    finance_governance: true,
  });

  const toggleGroup = (groupId) => {
    if (!groupId) return;
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: prev[groupId] !== undefined ? !prev[groupId] : false,
    }));
  };

  useEffect(() => {
    const updateProfileData = () => {
      const storedStaff = localStorage.getItem("staff_info");
      const storedRole = localStorage.getItem("staff_role");
      let parsedStaff = null;

      if (storedStaff) {
        try {
          parsedStaff = JSON.parse(storedStaff);
          setStaffInfo(parsedStaff);
        } catch (e) {
          console.error("Error parsing staff_info", e);
        }
      }

      const formatRoleDisplay = (r) => {
        if (!r) return "Staff";
        const trimmed = String(r).trim();
        if (isCsa(trimmed)) return "CSA";
        if (trimmed.toLowerCase() === "coo") return "COO";
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      };

      if (storedRole) {
        try {
          const parsed = JSON.parse(storedRole);
          setStaffRole(formatRoleDisplay(parsed));
        } catch {
          setStaffRole(formatRoleDisplay(storedRole));
        }
      } else if (parsedStaff && parsedStaff.role) {
        setStaffRole(formatRoleDisplay(parsedStaff.role));
      }

    };

    updateProfileData();
    window.addEventListener("storage", updateProfileData);
    window.addEventListener("staffProfileUpdated", updateProfileData);

    return () => {
      window.removeEventListener("storage", updateProfileData);
      window.removeEventListener("staffProfileUpdated", updateProfileData);
    };
  }, []);

  const fullName =
    staffInfo?.firstname && staffInfo?.surname
      ? `${staffInfo.firstname} ${staffInfo.surname}`
      : "Staff Member";

  const staffLoaded = staffInfo?.firstname && staffInfo?.surname;

  const profilePic = (staffInfo?.profile_picture && staffInfo?.profile_picture !== "default-avatar.png")
    ? (process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000") + "/storage/" + staffInfo.profile_picture
    : null;

  const handleLogout = () => {
    logout();
  };

  const getNavSections = () => {
    const roleLower = staffRole.toLowerCase();
    if (isCsa(roleLower)) return csaNavSections;
    if (isReadOnlyStaff(roleLower)) return cooNavSections;
    if (roleLower === "tutor") return tutorNavSections;
    if (roleLower === "moderator") return moderatorNavSections;
    if (roleLower === "course advisor" || roleLower === "advisor") return courseAdvisorNavSections;
    return adminNavSections;
  };


  const navSections = getNavSections();

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed top-0 lg:top-2 left-0 lg:left-2 z-[60] lg:z-50 
          bottom-16 lg:bottom-auto
          h-[calc(100vh-4rem)] h-[calc(100dvh-4rem)] lg:h-[calc(100vh-22px)]
          bg-white dark:bg-gray-900
          transition-all duration-300
          ${collapsed ? "w-20" : "w-64"}
          ${isOpen ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"}
          lg:rounded-xl lg:shadow-2xl flex flex-col overflow-hidden
        `}
      >
        {/* Logo */}
        <div className="relative flex items-center justify-center p-3 lg:p-6 mt-1 mb-1 overflow-visible flex-shrink-0">
          <img
            src={collapsed ? collapselogo : logo}
            alt="TC Logo"
            className={`transition-all duration-300 object-contain ${collapsed ? "w-14 h-14" : "w-36 md:w-48 lg:w-56 h-auto"
              }`}
          />

          {/* Collapse Button (Desktop Only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1.5 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 z-50 transition-transform active:scale-95"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRightIcon className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeftIcon className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Profile Card */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 flex flex-col overflow-y-auto px-1 md:px-2">
            <div
              className={`flex items-center gap-3 p-3 bg-[#09314F]/5 dark:bg-white/5 rounded-xl transition-all duration-300 ${collapsed ? "justify-center" : "mx-1"
                }`}
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#09314F] to-[#1a4a75] text-white flex items-center justify-center font-bold text-sm shadow-sm overflow-hidden border border-white/20">
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt={fullName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = "none";
                      }}
                    />
                  ) : (
                    <span>
                      {staffInfo?.firstname ? staffInfo.firstname.charAt(0) : "S"}
                    </span>
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"></span>
              </div>

              {!collapsed && (
                <div className="min-w-0">
                  {staffLoaded ? (
                    <>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h6 className="text-[#BB9E7F] text-xs uppercase font-bold">Welcome {staffRole}</h6>
                      </div>
                      <h3 className="font-bold dark:text-gray-50 text-sm truncate">
                        {fullName}
                      </h3>
                    </>
                  ) : (
                    <>
                      <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse mb-1" />
                      <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Menu */}
            <nav className="px-0.5 md:px-1 lg:px-2 space-y-1.5 mt-2 md:mt-3 flex flex-col flex-1 overflow-y-auto overflow-x-hidden select-none pb-4">
              {navSections.map((section, sIdx) => {
                const isSectionOpen = section.id ? openGroups[section.id] !== false : true;
                const isChildActive = section.items?.some(
                  (item) => item.destination && location.pathname.startsWith(item.destination)
                );
                const SectionIcon = section.icon;

                return (
                  <div key={section.id || sIdx} className="space-y-1">
                    {/* Section Header Button (Expanded mode) */}
                    {section.title && !collapsed && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(section.id)}
                        className={`
                          w-full flex items-center justify-between px-3 py-2 md:py-2.5 mt-2.5 rounded-xl
                          text-xs font-bold uppercase tracking-wider transition-all duration-200 select-none
                          active:scale-[0.99]
                          ${
                            isSectionOpen
                              ? "bg-[#BB9E7F] text-white shadow-sm hover:bg-[#aa8d6f]"
                              : isChildActive
                              ? "bg-[#BB9E7F]/25 dark:bg-[#BB9E7F]/30 text-[#6B4B1C] dark:text-[#F3E7D7] border border-[#BB9E7F]/50 shadow-xs"
                              : "bg-[#BB9E7F]/15 dark:bg-[#BB9E7F]/20 text-[#765524] dark:text-[#F3E7D7] border border-[#BB9E7F]/30 hover:bg-[#BB9E7F]/25"
                          }
                        `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {SectionIcon && (
                            <SectionIcon
                              className={`w-4 h-4 shrink-0 ${isSectionOpen ? "text-white" : "text-[#BB9E7F]"}`}
                            />
                          )}
                          <span className="truncate">{section.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              isSectionOpen
                                ? "bg-white/20 text-white"
                                : "bg-[#BB9E7F]/20 text-[#765524] dark:text-[#F3E7D7]"
                            }`}
                          >
                            {section.items.length}
                          </span>
                          <ChevronDownIcon
                            className={`w-3.5 h-3.5 transition-transform duration-200 ${
                              isSectionOpen ? "rotate-0 text-white" : "-rotate-90 text-[#BB9E7F]"
                            }`}
                          />
                        </div>
                      </button>
                    )}

                    {/* Divider in collapsed mode */}
                    {section.title && collapsed && (
                      <div className="my-2 border-t border-gray-100 dark:border-gray-800" />
                    )}

                    {/* Section Items - Nested in Grouped Tray Background */}
                    {(!section.title || collapsed || isSectionOpen) && (
                      <div
                        className={
                          section.title && !collapsed
                            ? "p-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1 transition-all"
                            : "space-y-1"
                        }
                      >
                        {section.items.map(({ label, icon: Icon, destination }) => {
                          if (!destination) {
                            return (
                              <div
                                key={label}
                                className={`w-full flex items-center rounded-lg text-xs md:text-sm font-medium text-gray-400 dark:text-gray-700 cursor-not-allowed ${
                                  collapsed ? "justify-center py-2.5" : "gap-3 px-2.5 py-1.5 md:py-2"
                                }`}
                              >
                                <Icon className="w-5 h-5 flex-shrink-0" />
                                {!collapsed && <span>{label}</span>}
                              </div>
                            );
                          }

                          return (
                            <NavLink
                              key={label}
                              to={destination}
                              className={({ isActive }) => `
                                w-full flex items-center rounded-lg
                                text-xs md:text-sm font-medium transition duration-200
                                ${collapsed ? "justify-center py-2.5" : "gap-3 px-2.5 py-1.5 md:py-2"}
                                ${
                                  isActive
                                    ? "bg-[#09314F] text-white shadow-md font-semibold"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-gray-800/80 hover:text-[#09314F] dark:hover:text-white"
                                }
                              `}
                            >
                              <Icon className="w-5 h-5 flex-shrink-0" />
                              {!collapsed && <span className="truncate">{label}</span>}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Mobile Footer */}
            <div className="p-2 md:p-3 lg:p-4 pt-2 md:pt-3 lg:pt-4 pb-3 md:pb-4 space-y-3 md:space-y-4 lg:space-y-5 mt-auto lg:hidden border-t border-gray-100 dark:border-gray-800">
              {/* Theme Toggle (Mobile) */}
              <div className={`flex items-center gap-1 ${collapsed ? "justify-center" : "justify-between px-2"}`}>
                {!collapsed && <span className="text-xs text-gray-500">Light</span>}
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${theme === "dark" ? "bg-blue-900" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-300 flex items-center justify-center ${theme === "dark" ? "right-1 bg-gray-800" : "left-1 bg-white"}`}>
                    {theme === "light" ? <SunIcon className="w-3 h-3 text-yellow-500" /> : <MoonIcon className="w-3 h-3 text-blue-300" />}
                  </span>
                </button>
                {!collapsed && <span className="text-xs text-gray-500">Dark</span>}
              </div>
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-red-500 hover:text-red-600">
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                {!collapsed && <span className="text-sm font-medium">Logout</span>}
              </button>
            </div>

            {/* Desktop Footer */}
            <div className="hidden lg:block p-3 pt-3 space-y-3 mt-auto border-t border-gray-100 dark:border-gray-800">
              <div className={`flex items-center gap-1 ${collapsed ? "justify-center" : "justify-between px-2"}`}>
                {!collapsed && <span className="text-xs text-gray-500">Light</span>}
                <button
                  onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 ${theme === "dark" ? "bg-blue-900" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full shadow transition-all duration-300 flex items-center justify-center ${theme === "dark" ? "right-1 bg-gray-800" : "left-1 bg-white"}`}>
                    {theme === "light" ? <SunIcon className="w-3 h-3 text-yellow-500" /> : <MoonIcon className="w-3 h-3 text-blue-300" />}
                  </span>
                </button>
                {!collapsed && <span className="text-xs text-gray-500">Dark</span>}
              </div>
              <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-red-500 hover:text-red-600">
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                {!collapsed && <span className="text-sm font-medium">Logout</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
