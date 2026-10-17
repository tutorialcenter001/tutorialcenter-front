import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import StaffDashboardLayout from "../../../components/private/staffs/DashboardLayout.jsx";
import SummaryCards from "../../../components/private/staffs/dashboard/SummaryCards.jsx";
import RevenueChart from "../../../components/private/staffs/dashboard/RevenueChart.jsx";
import MockExamAnalytics from "../../../components/private/staffs/dashboard/MockExamAnalytics.jsx";
import LocationAnalysis from "../../../components/private/staffs/dashboard/LocationAnalysis.jsx";
import LeaderboardWidget from "../../../components/private/staffs/dashboard/LeaderboardWidget.jsx";
import SubjectHierarchy from "../../../components/private/staffs/dashboard/SubjectHierarchy.jsx";
import { useStaffAuth } from "../../../context/StaffAuthContext";
import { Icon } from "@iconify/react";

export default function StaffDashboard() {
  const { staff } = useStaffAuth();

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const API_BASE_URL =
    process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test";

  // ─── Fetch Payments ─────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("staff_token");

      const response = await axios.get(
        `${API_BASE_URL}/api/admin/payments/all`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { all: true, per_page: 500 },
        }
      );

      let paymentData = [];
      if (Array.isArray(response.data)) {
        paymentData = response.data;
      } else if (Array.isArray(response.data?.data)) {
        paymentData = response.data.data;
      } else if (Array.isArray(response.data?.payments)) {
        paymentData = response.data.payments;
      } else if (Array.isArray(response.data?.payments?.data)) {
        paymentData = response.data.payments.data;
      } else if (response.data && typeof response.data === "object") {
        const possibleArray = Object.values(response.data).find((val) =>
          Array.isArray(val)
        );
        if (possibleArray) paymentData = possibleArray;
      }

      setPayments(paymentData);
      setError("");
    } catch (err) {
      console.error("Dashboard payment fetch error:", err);
      setError("Failed to load dashboard data.");
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL]);

  useEffect(() => {
    fetchPayments();
    try {
      localStorage.removeItem("tutor_unreported_sessions");
      sessionStorage.removeItem("just_completed_class_session_id");
    } catch (e) {}
  }, [fetchPayments]);

  // ─── Greeting based on time of day ────────────────────────────────────
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <StaffDashboardLayout pagetitle="Overview" hideHeader={false}>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* ─── Greeting Header ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              {getGreeting()},{" "}
              <span className="text-mainBlue dark:text-blue-400">
                {staff?.firstname || "Admin"}
              </span>{" "}
              👋
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mt-0.5">
              Here's what's happening with your tutorial center today.
            </p>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 
                       text-xs font-bold text-gray-600 dark:text-gray-300
                       hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600
                       transition-all duration-200 shadow-sm self-start"
          >
            <Icon
              icon="heroicons:arrow-path-20-solid"
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ─── Error Banner ──────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <Icon
              icon="heroicons:exclamation-triangle-20-solid"
              className="w-5 h-5 text-mainRed flex-shrink-0"
            />
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              {error}
            </p>
            <button
              onClick={fetchPayments}
              className="ml-auto text-xs font-bold text-mainRed hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* ─── Summary Cards ─────────────────────────────────────────── */}
        <SummaryCards payments={payments} loading={loading} />

        {/* ─── Middle Section: Revenue Chart ──────────────────────────── */}
        <div className="w-full min-w-0">
          <RevenueChart payments={payments} loading={loading} />
        </div>

        {/* ─── Bottom Section: Analytics & Leaderboard ───────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 min-w-0">
            <MockExamAnalytics />
          </div>
          
          <div className="lg:col-span-1 min-w-0">
            <LocationAnalysis />
          </div>

          {/* Leaderboard Widget */}
          <div className="lg:col-span-1 min-w-0">
            <LeaderboardWidget />
          </div>
        </div>

        {/* ─── Academic Subject Hierarchy ─────────────────────────────────── */}
        <div className="w-full">
          <SubjectHierarchy payments={payments} />
        </div>
      </div>
    </StaffDashboardLayout>
  );
}
