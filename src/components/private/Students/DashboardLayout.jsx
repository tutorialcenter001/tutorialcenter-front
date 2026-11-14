import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import Sidebar from "./Sidebar.jsx";
import MobileHeader from "./MobileHeader.jsx";
import MobileBottomNav from "./MobileBottomNav.jsx";
import { BellIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import InactivityModal from "./InactivityModal";
import VerificationModal from "./VerificationModal";
import SubjectChangeNotificationModal from "./SubjectChangeNotificationModal.jsx";
import { useAuth } from "../../../context/AuthContext";
import NotificationsDropdown from "./NotificationsDropdown";

export default function DashboardLayout({ 
  children, 
  pagetitle, 
  hideHeader = false,
  RightPanelComponent: CustomRightPanel,
  hideMobileTitle = false,
  hideMobileBell = false,
  hideHeaderBell = false,
  isExamActive = false,
  hideSidebar = false,
  hideRightPanel = false,
}) {
  const [leftCollapsed, setLeftCollapsed] = useState(() => {
    const saved = localStorage.getItem("student_left_collapsed");
    return saved !== null ? JSON.parse(saved) : false;
  });
  const handleSetLeftCollapsed = (val) => {
    const finalVal = isExamActive ? true : val;
    setLeftCollapsed(finalVal);
    localStorage.setItem("student_left_collapsed", JSON.stringify(finalVal));
  };
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { 
    shouldShowProfileAlert, 
    alertMessage, 
    openVerificationModal,
    student,
    token
  } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const isDashboardRoot = location.pathname === '/student/dashboard' || location.pathname === '/student/dashboard/';

  useEffect(() => {
    if (!isDashboardRoot) {
      sessionStorage.setItem('phoneAlertDismissed', 'true');
    }
  }, [isDashboardRoot]);

  const hasDismissedAlert = sessionStorage.getItem('phoneAlertDismissed') === 'true';

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const [pendingSubjectChange, setPendingSubjectChange] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/api/notifications/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [API_BASE_URL, token]);

  const fetchPendingSubjectChanges = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/api/subject-changes/pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const list = res.data?.pending_changes || [];
      if (list.length > 0) {
        setPendingSubjectChange(list[0]);
      } else {
        setPendingSubjectChange(null);
      }
    } catch (error) {
      console.warn("Failed to check pending subject changes:", error);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    fetchUnreadCount();
    fetchPendingSubjectChanges();
    
    const toggleHandler = () => setIsNotificationsOpen(prev => !prev);
    window.addEventListener('toggleNotifications', toggleHandler);
    window.addEventListener('updateUnreadCount', fetchUnreadCount);
    window.addEventListener('checkPendingSubjectChanges', fetchPendingSubjectChanges);
    
    return () => {
      window.removeEventListener('toggleNotifications', toggleHandler);
      window.removeEventListener('updateUnreadCount', fetchUnreadCount);
      window.removeEventListener('checkPendingSubjectChanges', fetchPendingSubjectChanges);
    };
  }, [fetchUnreadCount, fetchPendingSubjectChanges]);

  return (
    <div className="min-h-screen bg-[#E6E9EC] dark:bg-gray-900 flex flex-col lg:block w-full overflow-x-hidden">
      {/* ===== MOBILE HEADER ===== */}
      <div className="lg:hidden">
        <MobileHeader 
          pagetitle={pagetitle} 
          hideTitle={hideMobileTitle}
          hideBell={hideMobileBell}
        />
      </div>

      {/* ===== DESKTOP SIDEBARS ===== */}
      <div className="hidden lg:block">
        {!hideSidebar && (
          <Sidebar collapsed={isExamActive ? true : leftCollapsed} setCollapsed={handleSetLeftCollapsed} isExamActive={isExamActive} />
        )}
      </div>

      {/* ===== UNIFIED MAIN CONTENT ===== */}
      <main
        className={`
          flex-1 min-w-0
          w-full
          pt-16 pb-20 px-3 sm:px-4
          lg:p-6 lg:pt-2
          transition-all duration-300
          ${hideSidebar 
            ? "lg:ml-0 lg:w-full lg:max-w-full" 
            : (isExamActive || leftCollapsed 
              ? "lg:ml-20 lg:w-[calc(100%-5rem)] lg:max-w-[calc(100%-5rem)]" 
              : "lg:ml-64 lg:w-[calc(100%-16rem)] lg:max-w-[calc(100%-16rem)]"
            )}
        `}
      >
        {/* Desktop Header Row (Hidden on mobile) */}
        <div className="hidden lg:block">
          {!hideHeader && !isExamActive && (
            <div className="flex justify-between items-center mb-10 px-0 mt-2">
              <h1 className="text-[36px] font-black text-[#09314F] dark:text-white tracking-tighter leading-none uppercase">
                {pagetitle || "Overview"}
              </h1>
              <div className="relative z-50">
                {!hideHeaderBell && (
                  <div 
                    className="bg-white dark:bg-[#09314F]/60 p-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-[#09314F] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a4a75] transition-all"
                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                  >
                    <button className="relative flex items-center justify-center pointer-events-none">
                      <BellIcon className="w-7 h-7 text-[#09314F] dark:text-white" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-[#E83831] rounded-full border-2 border-white dark:border-[#09314F] shadow-sm flex items-center justify-center px-1">
                          <span className="text-[10px] font-black text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>
                        </span>
                      )}
                    </button>
                  </div>
                )}
                {!hideHeaderBell && (
                  <NotificationsDropdown 
                    isOpen={isNotificationsOpen} 
                    onClose={() => setIsNotificationsOpen(false)} 
                    onUpdate={fetchUnreadCount}
                    token={token}
                    viewAllLink="/student/notifications"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Alert (Unified) */}
        {shouldShowProfileAlert && isDashboardRoot && !hasDismissedAlert && (
          <div className="mb-6 lg:mb-8 bg-white dark:bg-[#09314F]/40 dark:backdrop-blur-md border border-gray-100 dark:border-[#09314F] p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] flex items-center gap-3 lg:gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-red-50 dark:bg-red-900/20 p-2 lg:p-2.5 rounded-lg lg:rounded-xl">
              <ExclamationTriangleIcon className="w-5 h-5 lg:w-6 lg:h-6 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="text-[12px] lg:text-[14px] font-bold text-[#09314F] dark:text-gray-200">
                <span className="lg:hidden">Please complete your profile! </span>
                <span className="hidden lg:inline">Account Verification Required</span>
              </p>
              <p className="text-[12px] font-medium text-gray-500 dark:text-gray-400">
                <span className="hidden lg:inline">To secure your account and track attendance, please </span>
                <button 
                  onClick={() => openVerificationModal(student?.tel && !student?.tel_verified_at ? 'phone' : 'email')}
                  className="text-yellow-600 dark:text-yellow-500 hover:underline font-bold lg:font-black"
                >
                  {alertMessage}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ONLY ONE INSTANCE OF CHILDREN TO PRESERVE COMPONENT STATE ACROSS VIEWPORT CHANGES */}
        {children}
      </main>

      {/* ===== MOBILE BOTTOM NAV ===== */}
      <div className="lg:hidden">
        <MobileBottomNav />
      </div>
      <InactivityModal />
      <VerificationModal />

      {pendingSubjectChange && (
        <SubjectChangeNotificationModal
          change={pendingSubjectChange}
          onClose={() => setPendingSubjectChange(null)}
          onAcknowledge={() => {
            setPendingSubjectChange(null);
            fetchPendingSubjectChanges();
          }}
          token={token}
          API_BASE_URL={API_BASE_URL}
        />
      )}
    </div>
  );
}
