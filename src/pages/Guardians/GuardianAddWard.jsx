import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import axios from "axios";
import { Icon } from "@iconify/react";
import GuardianDashboardLayout from "../../components/private/Guardians/GuardianDashboardLayout";
import Paystack from "../../components/Paystack";
import { location as nigerianLocations } from "../../data/locations";
import { dropdownTheme } from "../../utils/dropdownTheme";

const STEPS = [
  { num: 1, label: "Ward Biodata & OTP", icon: "lucide:user-check" },
  { num: 2, label: "Course Program", icon: "lucide:book-open" },
  { num: 3, label: "Subject Selection", icon: "lucide:layers" },
  { num: 4, label: "Duration & Plan", icon: "lucide:calendar" },
  { num: 5, label: "Payment & Activation", icon: "lucide:credit-card" },
];

const DURATION_PLANS = {
  monthly: { key: "monthly", label: "Monthly (1 Month)", months: 1, tag: "Standard", savings: "" },
  quarterly: { key: "quarterly", label: "Term / Quarterly (3 Months)", months: 3, tag: "Most Popular", savings: "Save 5%" },
  semi_annual: { key: "semi_annual", label: "Semi-Annually (6 Months)", months: 6, tag: "Save 5%", savings: "Save 5%" },
  annual: { key: "annual", label: "Full Session (1 Year)", months: 12, tag: "Best Value", savings: "Save 5%" },
};

const calculatePlanPrice = (basePrice, months = 1) => {
  const total = Number(basePrice || 0) * (months || 1);
  return months === 1 ? total : Math.round(total * 0.95);
};

export default function GuardianAddWard() {
  const navigate = useNavigate();
  const location = useLocation();

  // ── Step State ─────────────────────────────────────────────────────────────
  // 1: Biodata & OTP, 2: Course Selection, 3: Subject Selection, 4: Duration, 5: Payment
  const [currentStep, setCurrentStep] = useState(1);

  // ── Module 1: Biodata Form State ───────────────────────────────────────────
  const [formData, setFormData] = useState({
    firstname: "",
    surname: "",
    email: "",
    tel: "",
    gender: "male",
    relationship: "father",
    date_of_birth: "",
    location: "Lagos",
    address: "",
    department: "Science",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [createdWard, setCreatedWard] = useState(null);

  // ── Unverified Wards List for Direct Resume ────────────────────────────────
  const [unverifiedWards, setUnverifiedWards] = useState([]);

  // ── Module 1: OTP Sub-Step State ───────────────────────────────────────────
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [otpCountdown, setOtpCountdown] = useState(60);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpInputRefs = useRef([]);

  // ── Guardian Profile State ─────────────────────────────────────────────────
  const [guardian, setGuardian] = useState(null);

  // ── Module 2: Course Selection State ───────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);

  // ── Module 3: Subject Selection State ──────────────────────────────────────
  const [subjectsByCourse, setSubjectsByCourse] = useState({});
  const [selectedSubjectsByCourse, setSelectedSubjectsByCourse] = useState({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [openDropdownCourseId, setOpenDropdownCourseId] = useState(null);
  const [showSubjectReviewModal, setShowSubjectReviewModal] = useState(false);
  const subjectDropdownRef = useRef(null);

  // ── Module 4: Duration Plan State ──────────────────────────────────────────
  const [selectedDuration, setSelectedDuration] = useState("quarterly");

  // ── Module 5: Payment & Activation State ───────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [gateway, setGateway] = useState(null);
  const [paymentError, setPaymentError] = useState("");
  const [pendingPayment, setPendingPayment] = useState(null);
  const [paystackRef, setPaystackRef] = useState(`TC-G-${Date.now()}`);
  const verificationLock = useRef(false);
  const [stagedEnrollment, setStagedEnrollment] = useState(null);
  const [bankTransferData, setBankTransferData] = useState(null);
  const [loadingBankTransfer, setLoadingBankTransfer] = useState(false);
  const [paystackVerifying, setPaystackVerifying] = useState(false);
  const [bankClaim, setBankClaim] = useState({
    paid_from_account_name: "",
    amount_paid: "",
    note: "",
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState("");
  const [activatingGrant, setActivatingGrant] = useState(false);
  const [grantSuccess, setGrantSuccess] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test";

  // Check for resumeWard and resumeStep passed from dashboard prompt
  useEffect(() => {
    if (location.state?.resumeWard) {
      const ward = location.state.resumeWard;
      const targetStep = location.state.resumeStep || (ward.is_verified ? 2 : 1);
      setCreatedWard(ward);

      if (targetStep === 1 && !ward.is_verified) {
        setIsVerifyingOtp(true);
        setOtpCountdown(60);
        setCurrentStep(1);
        setToast({
          type: "info",
          message: `Resuming verification for ${ward.name || ward.firstname}. A fresh 6-digit OTP code has been dispatched.`,
        });
      } else {
        setIsVerifyingOtp(false);
        setCurrentStep(targetStep);
        setToast({
          type: "success",
          message: `Continuing onboarding for ${ward.name || ward.firstname} at Step ${targetStep}: ${STEPS.find((s) => s.num === targetStep)?.label || "Course Program"}!`,
        });
      }

      setFormData((prev) => ({
        ...prev,
        firstname: ward.firstname || "",
        surname: ward.surname || "",
        email: ward.email || "",
        tel: ward.tel || "",
        department: ward.department || "Science",
        location: ward.location || "Lagos",
        address: ward.address || "",
      }));
    }
  }, [location.state]);

  // Fetch incomplete wards on mount to show resume banner
  useEffect(() => {
    const fetchIncompleteWards = async () => {
      const token = localStorage.getItem("guardian_token");
      if (!token) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/api/guardians/dashboard/wards`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const list = res.data?.data || [];
        const incomplete = list.filter((w) => !w.is_onboarding_complete || !w.is_verified || !w.has_course);
        setUnverifiedWards(incomplete);
      } catch (e) {
        // silent
      }
    };
    fetchIncompleteWards();
  }, [API_BASE_URL]);

  const handleResumeWardDirectly = async (ward) => {
    setToast(null);
    setLoading(true);
    const targetStep = ward.stopped_step || (ward.is_verified ? 2 : 1);

    if (targetStep === 1 && !ward.is_verified) {
      try {
        if (ward.email) {
          await axios.post(`${API_BASE_URL}/api/students/resend-email-verification`, {
            email: ward.email,
          });
        } else if (ward.tel) {
          await axios.post(`${API_BASE_URL}/api/students/resend-phone-otp`, {
            tel: ward.tel,
          });
        }
        setCreatedWard(ward);
        setIsVerifyingOtp(true);
        setOtpCountdown(60);
        setOtp(["", "", "", "", "", ""]);
        setCurrentStep(1);
        setToast({
          type: "success",
          message: `Dispatched fresh 6-digit OTP to ${ward.email || ward.tel}. Please verify below to continue.`,
        });
      } catch (err) {
        console.warn("Failed to resend OTP on resume:", err);
        setCreatedWard(ward);
        setIsVerifyingOtp(true);
        setOtpCountdown(60);
        setCurrentStep(1);
        setToast({
          type: "info",
          message: `Resumed verification for ${ward.name || ward.firstname}. Please enter the OTP sent to ${ward.email || ward.tel}.`,
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Step 2 or higher
    setCreatedWard(ward);
    setIsVerifyingOtp(false);
    setCurrentStep(targetStep);
    setToast({
      type: "success",
      message: `Continuing onboarding for ${ward.name || ward.firstname} at Step ${targetStep}: ${STEPS.find((s) => s.num === targetStep)?.label || "Course Program"}!`,
    });
    setLoading(false);
  };

  // ── Fetch Courses and Guardian Profile on Mount ─────────────────────────────
  useEffect(() => {
    const fetchCoursesAndProfile = async () => {
      const token = localStorage.getItem("guardian_token");
      setLoadingCourses(true);
      try {
        const [coursesRes, profileRes] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/courses`),
          token
            ? axios.get(`${API_BASE_URL}/api/guardians/profile`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.reject("No token"),
        ]);

        if (coursesRes.status === "fulfilled") {
          const list = coursesRes.value.data?.courses || coursesRes.value.data?.data || [];
          setCourses(list);
          if (list.length > 0) {
            setSelectedCourseIds((prev) => (prev.length > 0 ? prev : [list[0].id]));
          }
        }

        if (profileRes.status === "fulfilled") {
          const g = profileRes.value.data?.data || profileRes.value.data?.guardian || profileRes.value.data || {};
          if (g.firstname) setGuardian(g);
        }
      } catch (err) {
        console.warn("Failed to load courses or profile:", err);
      } finally {
        setLoadingCourses(false);
      }
    };

    fetchCoursesAndProfile();
  }, [API_BASE_URL]);

  // ── Close Subject Dropdown when clicking outside ───────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
        setOpenDropdownCourseId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Helper to fetch subjects for one specific course with multi-tier fallback ──
  const fetchSubjectsForOneCourse = async (course, wardDept) => {
    if (!course) return [];
    const dept = wardDept || "Science";
    let list = [];

    // 1. Try course + dept endpoint if department is standard (Science, Arts, Commercial)
    if (dept && dept !== "General") {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/courses/${course.id}/subjects/${dept}`);
        const data = res.data?.subjects || res.data?.data || [];
        if (Array.isArray(data) && data.length > 0) {
          list = data;
        }
      } catch (e) {
        console.warn(`Dept subject fetch failed for course ${course.id}, dept ${dept}`, e);
      }
    }

    // 2. If empty or General track, try general course subjects: /api/courses/{course.id}/subjects
    if (!list || list.length === 0) {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/courses/${course.id}/subjects`);
        const data = res.data?.subjects || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(data) && data.length > 0) {
          list = data;
        }
      } catch (e) {
        console.warn(`Course subjects fetch failed for course ${course.id}`, e);
      }
    }

    // 3. Global fallback: /api/subjects
    if (!list || list.length === 0) {
      try {
        const fallback = await axios.get(`${API_BASE_URL}/api/subjects`);
        const all = fallback.data?.subjects || fallback.data?.data || (Array.isArray(fallback.data) ? fallback.data : []);
        if (Array.isArray(all) && all.length > 0) {
          list = all;
        }
      } catch (e) {
        console.warn("Global subjects fallback failed", e);
      }
    }

    return list;
  };

  // ── Helper to fetch subjects for ALL selected courses & department ──────────
  const fetchSubjectsForActiveCourses = async (activeCourses, wardObj) => {
    const targetWard = wardObj || createdWard;
    if (!activeCourses || activeCourses.length === 0 || !targetWard) return;
    setLoadingSubjects(true);

    try {
      const dept = targetWard.department || formData.department || "Science";
      const newSubjectsByCourse = {};
      const newSelectedSubjects = { ...selectedSubjectsByCourse };

      await Promise.all(
        activeCourses.map(async (course) => {
          const list = await fetchSubjectsForOneCourse(course, dept);
          newSubjectsByCourse[course.id] = list;

          // Auto-select compulsory subjects or first 4/9 if not already selected
          if (!newSelectedSubjects[course.id] || newSelectedSubjects[course.id].length === 0) {
            const compulsory = list.filter((s) => s.is_compulsory).map((s) => s.id);
            const maxLimit = course.title?.toLowerCase().includes("jamb") ? 4 : 9;
            if (compulsory.length > 0) {
              newSelectedSubjects[course.id] = compulsory.slice(0, maxLimit);
            } else if (list.length > 0) {
              newSelectedSubjects[course.id] = list.slice(0, Math.min(4, maxLimit)).map((s) => s.id);
            } else {
              newSelectedSubjects[course.id] = [];
            }
          }
        })
      );

      setSubjectsByCourse(newSubjectsByCourse);
      setSelectedSubjectsByCourse(newSelectedSubjects);
    } catch (err) {
      console.error("Failed to fetch subjects for active courses:", err);
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ── Helper to activate zero-cost free training grant instantly ──────────────
  const handleActivateFreeGrant = async () => {
    if (!createdWard) return;
    setActivatingGrant(true);
    setToast(null);

    const token = localStorage.getItem("guardian_token");
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    try {
      for (const course of active) {
        const subIds = selectedSubjectsByCourse[course.id] || [];
        await axios.post(
          `${API_BASE_URL}/api/guardians/payments/training/add-course`,
          {
            student_id: createdWard.id,
            course_id: course.id,
            amount: 0,
            billing_cycle: selectedDuration,
            subject_ids: subIds,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setGrantSuccess({
        course: active.map((c) => c.title).join(", "),
        message: `Free training grant successfully activated for ${createdWard.firstname}!`,
      });
      setCreatedWard((prev) => ({
        ...prev,
        has_course: true,
        is_onboarding_complete: true,
      }));
      setToast({
        type: "success",
        message: `Free Training Grant Activated! ${createdWard.firstname} now has active access.`,
      });
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to activate free training grant. Please retry.",
      });
    } finally {
      setActivatingGrant(false);
    }
  };

  // ── Toggle Training Selection (Mutual exclusion for O-Levels) ──────────────────
  const toggleTraining = (courseId) => {
    const isOlevel = (cId) => {
      const c = courses.find((item) => Number(item.id) === Number(cId));
      const title = (c?.title || c?.slug || "").toLowerCase();
      return (
        title.includes("waec") ||
        title.includes("neco") ||
        title.includes("gce") ||
        [2, 3, 4].includes(Number(cId))
      );
    };

    setSelectedCourseIds((prev) => {
      let updated;
      if (prev.includes(courseId)) {
        if (prev.length === 1) {
          setToast({
            type: "info",
            message: "At least one examination program must remain selected.",
          });
          return prev;
        }
        updated = prev.filter((id) => id !== courseId);
      } else {
        if (isOlevel(courseId)) {
          const withoutOtherOlevels = prev.filter((id) => !isOlevel(id));
          updated = [...withoutOtherOlevels, courseId];
          setToast({
            type: "info",
            message: "Students can choose one O'Level program (WAEC, NECO, or GCE) alongside JAMB.",
          });
        } else {
          updated = [...prev, courseId];
        }
      }
      return updated;
    });
  };

  // ── Advance from Step 2 to Step 3 (Multi-Course Support) ───────────────────
  const handleProceedToStep3 = async () => {
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    if (active.length === 0) {
      setToast({ type: "error", message: "Please select an examination course program first." });
      return;
    }
    await fetchSubjectsForActiveCourses(active, createdWard);
    setCurrentStep(3);
  };

  // ── Toggle Subject Selection for Course (Multi-Course Support) ─────────────
  const toggleSubjectForCourse = (courseId, subjectId) => {
    const course = courses.find((c) => c.id === courseId);
    const maxLimit = course?.title?.toLowerCase().includes("jamb") ? 4 : 9;
    setSelectedSubjectsByCourse((prev) => {
      const current = prev[courseId] || [];
      if (current.includes(subjectId)) {
        return {
          ...prev,
          [courseId]: current.filter((id) => id !== subjectId),
        };
      }
      if (current.length >= maxLimit) {
        setToast({
          type: "info",
          message: `Maximum of ${maxLimit} subjects allowed for ${course?.title || "this course"}.`,
        });
        return prev;
      }
      return {
        ...prev,
        [courseId]: [...current, subjectId],
      };
    });
  };

  // ── Advance from Step 3: Trigger Review Confirmation Modal ──────────────────
  const handleProceedToStep4 = () => {
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    if (active.length === 0) {
      setToast({ type: "error", message: "No active examination program selected." });
      return;
    }
    for (const course of active) {
      const selected = selectedSubjectsByCourse[course.id] || [];
      if (selected.length === 0) {
        setToast({
          type: "error",
          message: `Please select at least 1 subject for ${course.title}.`,
        });
        return;
      }
    }
    setShowSubjectReviewModal(true);
  };

  const handleConfirmReviewAndProceed = () => {
    setShowSubjectReviewModal(false);
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    const totalPrice = active.reduce((sum, c) => sum + Number(c.price || 0), 0);
    if (totalPrice <= 0) {
      handleActivateFreeGrant();
    } else {
      setCurrentStep(4);
    }
  };

  // ── Ensure Paystack inline script is loaded ───────────────────────────────
  const ensurePaystackLoaded = useCallback(() => {
    return new Promise((resolve) => {
      if (window.PaystackPop) {
        resolve(true);
        return;
      }
      const existingScript = document.getElementById("paystack-inline-js");
      if (existingScript) {
        existingScript.onload = () => resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.id = "paystack-inline-js";
      script.src = "https://js.paystack.co/v1/inline.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  useEffect(() => {
    ensurePaystackLoaded();
  }, [ensurePaystackLoaded]);

  // ── Total Amount Payable Across All Selected Courses & Plan Duration ────────
  const totalPayableAmount = useMemo(() => {
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    const planMonths = DURATION_PLANS[selectedDuration]?.months || 3;
    return active.reduce((sum, c) => {
      const raw = Number(c.price || 0);
      return sum + (raw <= 0 ? 0 : Math.max(100, calculatePlanPrice(raw, planMonths)));
    }, 0);
  }, [courses, selectedCourseIds, selectedDuration]);

  // ── Advance from Step 4 to Step 5 (Stage Enrollment across active courses) ─
  const handleProceedToStep5 = async () => {
    setLoading(true);
    const token = localStorage.getItem("guardian_token");
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    const planMonths = DURATION_PLANS[selectedDuration]?.months || 3;

    try {
      let staged = null;
      for (const course of active) {
        const rawPrice = Number(course.price || 0);
        const finalPrice = rawPrice <= 0 ? 0 : Math.max(100, calculatePlanPrice(rawPrice, planMonths));
        const subIds = selectedSubjectsByCourse[course.id] || [];

        const res = await axios.post(
          `${API_BASE_URL}/api/guardians/payments/training/add-course`,
          {
            student_id: createdWard.id,
            course_id: course.id,
            amount: finalPrice,
            billing_cycle: selectedDuration,
            subject_ids: subIds,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (finalPrice > 0 && res.data?.data) {
          staged = res.data.data;
        }
      }

      const totalRawPrice = active.reduce((sum, c) => sum + Number(c.price || 0), 0);
      if (totalRawPrice <= 0) {
        setGrantSuccess({
          course: active.map((c) => c.title).join(", "),
          message: `Free training grant successfully activated for ${createdWard.firstname}!`,
        });
        setCreatedWard((prev) => ({
          ...prev,
          has_course: true,
          is_onboarding_complete: true,
        }));
        setCurrentStep(5);
        return;
      }

      setStagedEnrollment(staged ? { ...staged, amount: totalPayableAmount } : { amount: totalPayableAmount });
      setCurrentStep(5);
    } catch (err) {
      console.warn("Failed to stage enrollment:", err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to stage course enrollment. Please retry.",
      });
      setCurrentStep(5);
    } finally {
      setLoading(false);
    }
  };

  // ── Payer Email for Payment Gateways ───────────────────────────────────────
  const payerEmail = useMemo(() => {
    if (guardian?.email && guardian.email.includes("@")) return guardian.email.trim();
    const storedEmail = localStorage.getItem("guardianEmail");
    if (storedEmail && storedEmail.includes("@")) return storedEmail.trim();
    if (createdWard?.email && createdWard.email.includes("@")) return createdWard.email.trim();
    return "guardian@tutorialcenter.com";
  }, [guardian, createdWard]);

  // ── Paystack Metadata matching Guardian Signup Flow & Backend Service ───────
  const paystackMetadata = useMemo(() => {
    if (!createdWard) return {};
    const active = courses.filter((c) => selectedCourseIds.includes(c.id));
    const planMonths = DURATION_PLANS[selectedDuration]?.months || 3;
    const coursesMeta = active.map((c) => ({
      course_id: c.id,
      billing_cycle: selectedDuration,
      price: Number(c.price || 0) <= 0 ? 0 : Math.max(100, calculatePlanPrice(Number(c.price || 0), planMonths)),
      subjects: selectedSubjectsByCourse[c.id] || [],
    }));

    return {
      type: "guardian_enrollment",
      guardian_id: guardian?.id,
      students: [
        {
          student_id: createdWard.id,
          courses: coursesMeta,
        },
      ],
      // Fallback for single student handlers
      student_id: createdWard.id,
      courses: coursesMeta,
    };
  }, [createdWard, courses, selectedCourseIds, selectedDuration, selectedSubjectsByCourse, guardian]);

  // ── Open & Close Payment Gateway Modals (Matching Guardian Flow) ────────────
  const openGateway = (selected) => {
    if (!createdWard) return;
    if (totalPayableAmount <= 0) {
      handleActivateFreeGrant();
      return;
    }
    setGateway(selected);
    setPaymentError("");
    setPaystackRef(stagedEnrollment?.reference || `TC-G-${Date.now()}`);
    setShowPayModal(true);
  };

  const closeModal = () => {
    if (!paystackVerifying) {
      setShowPayModal(false);
      setGateway(null);
    }
  };

  // ── Verify Paystack Success Callback ───────────────────────────────────────
  const handlePaystackSuccess = async (response) => {
    if (paystackVerifying || verificationLock.current) return;

    const reference = response?.reference || paystackRef;
    if (!reference) {
      setPaymentError("No payment reference was returned. Contact support before making another payment.");
      setShowPayModal(false);
      return;
    }

    const payment = { reference, metadata: paystackMetadata };
    setPendingPayment(payment);
    setPaymentError("");
    verificationLock.current = true;
    setPaystackVerifying(true);
    setShowPayModal(false);

    const active = courses.filter((c) => selectedCourseIds.includes(c.id));

    try {
      console.log("Verifying guardian payment with backend for reference:", reference);
      const token = localStorage.getItem("guardian_token");
      const result = await axios.post(
        `${API_BASE_URL}/api/payments/verify-paystack`,
        {
          reference,
          fallback_metadata: payment.metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 30000,
        }
      );

      if (result.status === 200 && (result.data?.success === true || result.data?.status === "success")) {
        setGrantSuccess({
          course: active.map((c) => c.title).join(", "),
          message: `Payment confirmed! Training program activated successfully for ${createdWard.firstname}!`,
        });
        setCreatedWard((prev) => ({
          ...prev,
          has_course: true,
          is_onboarding_complete: true,
        }));
        setPendingPayment(null);
        setToast({
          type: "success",
          message: "Payment successfully verified and ward training activated!",
        });
      } else {
        throw new Error(result.data?.message || "Payment has not been confirmed.");
      }
    } catch (err) {
      console.error("Guardian payment verification error:", err.response?.data || err);
      setPaymentError(
        `${err.response?.data?.message || err.message || "Unable to verify payment."} ` +
        `If you were charged, do not pay again. Retry verification using the saved reference.`
      );
      setToast({
        type: "error",
        message: err.response?.data?.message || "Payment verification failed. You can retry with the reference.",
      });
    } finally {
      verificationLock.current = false;
      setPaystackVerifying(false);
      closeModal();
    }
  };

  // ── Initiate Bank Transfer in Step 5 ───────────────────────────────────────
  const handleInitBankTransfer = async () => {
    if (!createdWard || !stagedEnrollment?.enrollment_id) return;
    setLoadingBankTransfer(true);
    try {
      const token = localStorage.getItem("guardian_token");
      const allSelectedSubjects = Object.values(selectedSubjectsByCourse).flat();
      const res = await axios.post(
        `${API_BASE_URL}/api/payments/bank-transfer`,
        {
          student_id: createdWard.id,
          course_enrollment_id: stagedEnrollment.enrollment_id,
          billing_cycle: selectedDuration,
          guardian_id: guardian?.id,
          subjects: allSelectedSubjects,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBankTransferData(res.data);
      setBankClaim((prev) => ({
        ...prev,
        amount_paid: res.data.amount || stagedEnrollment.amount || "",
      }));
    } catch (err) {
      console.warn("Failed to initiate bank transfer:", err);
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to generate bank transfer details. Please retry.",
      });
    } finally {
      setLoadingBankTransfer(false);
    }
  };

  // ── Submit Bank Transfer Claim ─────────────────────────────────────────────
  const handleSubmitBankClaim = async (e) => {
    e.preventDefault();
    if (!bankTransferData?.reference) return;
    setSubmittingClaim(true);
    try {
      const token = localStorage.getItem("guardian_token");
      await axios.post(
        `${API_BASE_URL}/api/payments/bank-transfer/${encodeURIComponent(bankTransferData.reference)}/claim`,
        {
          paid_from_account_name: bankClaim.paid_from_account_name,
          amount_paid: Number(bankClaim.amount_paid) || stagedEnrollment?.amount,
          note: bankClaim.note || `Transfer initiated by guardian ${guardian?.firstname || ''} for ward ${createdWard?.firstname}`,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setClaimSubmitted(true);
      setToast({
        type: "success",
        message: "Bank transfer claim submitted successfully! Tutorial Center staff will confirm and activate your ward's access.",
      });
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to submit bank transfer claim. Please check and retry.",
      });
    } finally {
      setSubmittingClaim(false);
    }
  };

  // ── Copy to Clipboard ──────────────────────────────────────────────────────
  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedBankField(fieldName);
    setTimeout(() => setCopiedBankField(""), 2500);
  };

  // Countdown timer for OTP
  useEffect(() => {
    let timer;
    if (isVerifyingOtp && otpCountdown > 0) {
      timer = setInterval(() => setOtpCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isVerifyingOtp, otpCountdown]);

  // Focus first OTP input when switching to OTP view
  useEffect(() => {
    if (isVerifyingOtp) {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isVerifyingOtp]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const cleanPhone = (phone) => {
    if (!phone) return "";
    return phone.replace(/[\s\-().]/g, "");
  };

  const isValidPhone = (phone) => {
    if (!phone) return false;
    const phoneRegex = /^(\+234|234|0)(70|80|81|90|91|71)\d{8}$/;
    return phoneRegex.test(cleanPhone(phone));
  };

  const isValidEmail = (email) => {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  };

  const validateBiodata = () => {
    const errors = {};

    if (!formData.firstname.trim()) {
      errors.firstname = "Ward's first name is required";
    }

    if (!formData.surname.trim()) {
      errors.surname = "Ward's surname is required";
    }

    const hasEmail = Boolean(formData.email.trim());
    const hasTel = Boolean(formData.tel.trim());

    if (!hasEmail && !hasTel) {
      errors.contact = "Please provide either an email or phone number for the student";
    }

    if (hasEmail && !isValidEmail(formData.email)) {
      errors.email = "Please enter a valid email address";
    }

    if (hasTel && !isValidPhone(formData.tel)) {
      errors.tel = "Invalid phone format (e.g. 08012345678 or +234...)";
    }

    if (!formData.location) {
      errors.location = "State of residence is required";
    }

    if (!formData.password) {
      errors.password = "Password is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = "Confirm password is required";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleBiodataSubmit = async (e) => {
    e.preventDefault();

    if (!validateBiodata()) {
      setToast({
        type: "error",
        message: "Please correct the highlighted errors before submitting.",
      });
      return;
    }

    const token = localStorage.getItem("guardian_token");
    if (!token) {
      navigate("/guardian/login");
      return;
    }

    setLoading(true);
    setToast(null);

    const payload = {
      firstname: formData.firstname.trim(),
      surname: formData.surname.trim(),
      email: formData.email.trim() ? formData.email.trim().toLowerCase() : null,
      tel: formData.tel.trim() ? cleanPhone(formData.tel) : null,
      department: formData.department,
      gender: formData.gender,
      relationship: formData.relationship,
      date_of_birth: formData.date_of_birth || null,
      location: formData.location || null,
      address: formData.address.trim() || null,
      password: formData.password,
    };

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/guardians/wards/create-or-link`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (res.data?.success) {
        const wardData = res.data.data || {
          firstname: payload.firstname,
          surname: payload.surname,
          email: payload.email,
          tel: payload.tel,
          department: payload.department,
          location: payload.location,
          address: payload.address,
          is_verified: false,
        };

        setCreatedWard({
          ...wardData,
          message: res.data.message,
        });

        // Strict Option A: Check if student account is verified
        if (wardData.is_verified) {
          setToast({
            type: "success",
            message: `Existing ward ${formData.firstname} is already verified! Proceeding to Course Selection.`,
          });
          setCurrentStep(2);
        } else {
          // Switch to OTP verification sub-view within Module 1
          setIsVerifyingOtp(true);
          setOtpCountdown(60);
          setOtp(["", "", "", "", "", ""]);
          setToast({
            type: "success",
            message: `Ward account created! A 6-digit verification OTP has been dispatched to ${wardData.email || wardData.tel}.`,
          });
        }
      } else {
        setToast({
          type: "error",
          message: res.data?.message || "Failed to create ward.",
        });
      }
    } catch (err) {
      console.error("Add ward error:", err);
      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        "Unable to create/link ward. Please verify the input details.";
      setToast({
        type: "error",
        message: backendMessage,
      });

      if (err.response?.data?.errors) {
        setFieldErrors(err.response.data.errors);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Handlers ───────────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || "";
    }
    setOtp(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleResendOtp = async () => {
    if (otpCountdown > 0 || !createdWard) return;
    setOtpLoading(true);
    setToast(null);

    try {
      if (createdWard.email) {
        await axios.post(`${API_BASE_URL}/api/students/resend-email-verification`, {
          email: createdWard.email,
        });
        setToast({
          type: "success",
          message: `Verification code resent to ${createdWard.email}`,
        });
      } else if (createdWard.tel) {
        await axios.post(`${API_BASE_URL}/api/students/resend-phone-otp`, {
          tel: createdWard.tel,
        });
        setToast({
          type: "success",
          message: `Verification code resent to ${createdWard.tel}`,
        });
      }
      setOtpCountdown(60);
      setOtp(["", "", "", "", "", ""]);
      otpInputRefs.current[0]?.focus();
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Failed to resend verification code. Please try again.",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    const otpCode = otp.join("");
    if (otpCode.length !== 6) {
      setToast({
        type: "error",
        message: "Please enter all 6 digits of the verification code.",
      });
      return;
    }

    setOtpLoading(true);
    setToast(null);

    try {
      if (createdWard.email) {
        await axios.post(`${API_BASE_URL}/api/students/verify-email`, {
          email: createdWard.email,
          token: otpCode,
        });
      } else if (createdWard.tel) {
        await axios.post(`${API_BASE_URL}/api/students/verify-phone`, {
          tel: createdWard.tel,
          otp: otpCode,
        });
      }

      setCreatedWard((prev) => ({ ...prev, is_verified: true }));
      setIsVerifyingOtp(false);
      setToast({
        type: "success",
        message: `Student account for ${createdWard.firstname} successfully verified! Advancing to Course Selection.`,
      });

      // Advance to Step 2
      setCurrentStep(2);
    } catch (err) {
      setToast({
        type: "error",
        message: err.response?.data?.message || "Invalid or expired verification code. Please check and try again.",
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResetWizard = () => {
    setFormData({
      firstname: "",
      surname: "",
      email: "",
      tel: "",
      gender: "male",
      relationship: "father",
      date_of_birth: "",
      location: "Lagos",
      address: "",
      department: "Science",
      password: "",
      confirmPassword: "",
    });
    setCreatedWard(null);
    setIsVerifyingOtp(false);
    setOtp(["", "", "", "", "", ""]);
    setCurrentStep(1);
    setFieldErrors({});
    setToast(null);
  };

  return (
    <GuardianDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#09314F]/10 dark:bg-white/10 text-[#09314F] dark:text-[#C5A97A] text-[11px] font-black uppercase tracking-wider mb-1.5">
              <Icon icon="lucide:user-plus" className="w-3.5 h-3.5" />
              <span>Ward Onboarding Wizard</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-[#09314F] dark:text-white tracking-tight">
              Add & Enroll New Ward
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Complete student biodata, verify their email with OTP, select academic training, choose subjects, and activate their study plan.
            </p>
          </div>

          <Link
            to="/guardian/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-xl text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors self-start shadow-sm"
          >
            <Icon icon="lucide:arrow-left" className="w-4 h-4" />
            <span>Dashboard Overview</span>
          </Link>
        </div>

        {/* Stepper Progress Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-700/80 shadow-sm">
          <div className="flex items-center justify-between">
            {STEPS.map((step, idx) => {
              const isCompleted =
                currentStep > step.num ||
                (step.num === 1 && createdWard && createdWard.is_verified);
              const isCurrent = currentStep === step.num;
              return (
                <React.Fragment key={step.num}>
                  <button
                    type="button"
                    onClick={() => {
                      if (step.num === 1) {
                        setCurrentStep(1);
                      } else if (createdWard && createdWard.is_verified && step.num <= currentStep) {
                        setCurrentStep(step.num);
                      }
                    }}
                    disabled={!createdWard || !createdWard.is_verified || step.num > currentStep}
                    className="flex items-center gap-2 text-left group disabled:cursor-not-allowed"
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        isCompleted
                          ? "bg-emerald-500 text-white shadow-sm"
                          : isCurrent
                          ? "bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] ring-4 ring-[#09314F]/10 dark:ring-[#C5A97A]/20 shadow-md"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                      }`}
                    >
                      {isCompleted ? (
                        <Icon icon="lucide:check" className="w-4 h-4 stroke-[3]" />
                      ) : (
                        step.num
                      )}
                    </div>
                    <div className="hidden lg:block">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${
                        isCurrent
                          ? "text-[#09314F] dark:text-[#C5A97A]"
                          : isCompleted
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-gray-400"
                      }`}>
                        Step {step.num}
                      </p>
                      <p className={`text-xs font-bold leading-tight ${
                        isCurrent
                          ? "text-gray-900 dark:text-white font-black"
                          : isCompleted
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-400"
                      }`}>
                        {step.label}
                      </p>
                    </div>
                  </button>

                  {idx < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 sm:mx-3 rounded-full transition-all ${
                        currentStep > step.num || (step.num === 1 && createdWard && createdWard.is_verified)
                          ? "bg-emerald-500"
                          : "bg-gray-100 dark:bg-gray-700"
                      }`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Toast Alert */}
        {toast && (
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-3 animate-in fade-in transition-all ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                : "bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shadow-sm"
            }`}
          >
            <Icon
              icon={toast.type === "success" ? "lucide:check-circle-2" : "lucide:alert-circle"}
              className="w-5 h-5 shrink-0"
            />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="p-1 hover:opacity-75 transition-opacity"
            >
              <Icon icon="lucide:x" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 1 (STEP 1): BIODATA OR OTP VERIFICATION                       */}
        {/* ==================================================================== */}
        {currentStep === 1 && (
          <>
            {/* SUB-PHASE 1.2: OTP VERIFICATION VIEW (Option A - No Bypass) */}
            {isVerifyingOtp && createdWard ? (
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-10 border border-blue-100 dark:border-blue-900/40 shadow-xl space-y-6 animate-in fade-in zoom-in-95 text-center max-w-2xl mx-auto">
                
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border-2 border-blue-400 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-md">
                  <Icon icon="lucide:mail-check" className="w-8 h-8" />
                </div>

                <div className="space-y-2">
                  <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                    Security Verification Required
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#09314F] dark:text-white">
                    Verify {createdWard.firstname}&apos;s Student Account
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    A 6-digit verification OTP code was dispatched to{" "}
                    <strong className="text-[#09314F] dark:text-white">{createdWard.email || createdWard.tel}</strong>.
                    <br />
                    Enter the code below to verify your ward and unlock Course Selection.
                  </p>
                </div>

                {/* 6-Digit OTP Box Grid */}
                <form onSubmit={handleVerifyOtp} className="space-y-6 pt-2">
                  <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputRefs.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className="w-11 h-14 sm:w-13 sm:h-16 text-center text-xl sm:text-2xl font-black bg-gray-50 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white focus:outline-none focus:border-[#09314F] dark:focus:border-[#C5A97A] focus:ring-4 focus:ring-[#09314F]/10 dark:focus:ring-[#C5A97A]/20 transition-all shadow-sm"
                      />
                    ))}
                  </div>

                  {/* Resend Timer & Button */}
                  <div className="text-center text-xs">
                    {otpCountdown > 0 ? (
                      <p className="text-gray-400 font-bold flex items-center justify-center gap-1.5">
                        <Icon icon="lucide:clock" className="w-3.5 h-3.5 text-gray-400" />
                        <span>Resend OTP code in <strong className="text-[#09314F] dark:text-white">{otpCountdown}s</strong></span>
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={otpLoading}
                        className="text-[#09314F] dark:text-[#C5A97A] hover:underline font-black inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Icon icon="lucide:refresh-cw" className={`w-3.5 h-3.5 ${otpLoading ? "animate-spin" : ""}`} />
                        <span>Resend 6-Digit Verification Code</span>
                      </button>
                    )}
                  </div>

                  {/* Submit Verification Button */}
                  <div className="space-y-3 pt-2">
                    <button
                      type="submit"
                      disabled={otpLoading || otp.join("").length !== 6}
                      className="w-full py-4 bg-[#09314F] hover:bg-[#0d3f66] dark:bg-[#C5A97A] dark:hover:bg-[#b09262] text-white dark:text-[#09314F] font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {otpLoading ? (
                        <>
                          <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                          <span>Verifying OTP...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:check-circle" className="w-5 h-5" />
                          <span>Verify OTP & Unlock Course Selection</span>
                        </>
                      )}
                    </button>

                    <div className="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-center gap-4">
                      <button
                        type="button"
                        onClick={() => setIsVerifyingOtp(false)}
                        className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      >
                        ← Edit Biodata
                      </button>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <button
                        type="button"
                        onClick={() => navigate("/guardian/dashboard")}
                        className="text-xs font-bold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5"
                      >
                        <Icon icon="lucide:clock" className="w-3.5 h-3.5" />
                        <span>Verify Later (Return to Dashboard)</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              /* SUB-PHASE 1.1: BIODATA FORM */
              <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-8 border border-gray-100 dark:border-gray-700/80 shadow-sm space-y-6 animate-in fade-in">
                
                {/* Pending Unverified Wards Banner */}
                {unverifiedWards.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 shadow-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon icon="lucide:alert-triangle" className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                        Resume Incomplete Ward Verification ({unverifiedWards.length})
                      </h4>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300/90 leading-relaxed">
                      You have existing ward(s) pending 6-digit OTP verification. Click below to continue where you stopped:
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {unverifiedWards.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => handleResumeWardDirectly(w)}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/60 dark:hover:bg-amber-800/80 text-amber-900 dark:text-amber-100 text-xs font-black transition-all shadow-sm active:scale-95"
                        >
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Resume {w.name || w.firstname}</span>
                          <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Header info */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700/60">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#09314F]/10 dark:bg-white/10 text-[#09314F] dark:text-[#C5A97A] flex items-center justify-center font-black">
                      1
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black text-[#09314F] dark:text-white">
                        Module 1: Student Identity & Biodata
                      </h2>
                      <p className="text-xs text-gray-400">
                        Create student credentials and verify their email with OTP before selecting courses.
                      </p>
                    </div>
                  </div>

                  {createdWard && (
                    <button
                      type="button"
                      onClick={() => setIsVerifyingOtp(true)}
                      className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold flex items-center gap-1.5"
                    >
                      <span>Enter Ward OTP</span>
                      <Icon icon="lucide:arrow-right" className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Guidance Info Banner */}
                <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 mt-0.5">
                    <Icon icon="lucide:info" className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <p className="font-black text-[#09314F] dark:text-blue-200">
                      Standard Registration & OTP Verification:
                    </p>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                      <strong>Account Creation:</strong> Providing student details registers their account and automatically sends a 6-digit confirmation OTP to their email.
                      <br />
                      <strong>Mandatory OTP:</strong> In accordance with academy policy, you will be prompted to enter their OTP to confirm the email before advancing to Course Selection.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleBiodataSubmit} className="space-y-6">
                  
                  {/* Row 1: Names */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Ward&apos;s First Name <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Icon icon="lucide:user" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            name="firstname"
                            placeholder="e.g. Samuel"
                            value={formData.firstname}
                            onChange={handleChange}
                            required
                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A] transition-all ${
                              fieldErrors.firstname
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          />
                        </div>
                        {fieldErrors.firstname && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{fieldErrors.firstname}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Ward&apos;s Surname <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Icon icon="lucide:user" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            name="surname"
                            placeholder="e.g. Adeyemi"
                            value={formData.surname}
                            onChange={handleChange}
                            required
                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A] transition-all ${
                              fieldErrors.surname
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          />
                        </div>
                        {fieldErrors.surname && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{fieldErrors.surname}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Contacts */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                            Student Email Address
                          </label>
                          <span className="text-[10px] text-gray-400 font-semibold">Email or Phone required</span>
                        </div>
                        <div className="relative">
                          <Icon icon="lucide:mail" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            name="email"
                            placeholder="samuel@example.com"
                            value={formData.email}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A] transition-all ${
                              fieldErrors.email
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          />
                        </div>
                        {fieldErrors.email && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{fieldErrors.email}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Student Phone Number
                        </label>
                        <div className="relative">
                          <Icon icon="lucide:phone" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            name="tel"
                            placeholder="08012345678"
                            value={formData.tel}
                            onChange={handleChange}
                            className={`w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A] transition-all ${
                              fieldErrors.tel
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          />
                        </div>
                        {fieldErrors.tel && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{fieldErrors.tel}</p>
                        )}
                      </div>
                    </div>
                    {fieldErrors.contact && (
                      <p className="text-[10px] font-bold text-rose-500 mt-1">{fieldErrors.contact}</p>
                    )}
                  </div>

                  {/* Row 3: Demographics (Gender, Relationship, Date of Birth) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Gender */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Gender <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="others">Other</option>
                      </select>
                    </div>

                    {/* Relationship */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Your Relationship to Ward <span className="text-rose-500">*</span>
                      </label>
                      <select
                        name="relationship"
                        value={formData.relationship}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                      >
                        <option value="father">Father</option>
                        <option value="mother">Mother</option>
                        <option value="guardian">Legal Guardian</option>
                        <option value="relative">Relative (Uncle / Aunt / Sibling)</option>
                        <option value="other">Other Sponsor</option>
                      </select>
                    </div>

                    {/* Date of Birth */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        name="date_of_birth"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                      />
                    </div>
                  </div>

                  {/* Row 4: Location & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        State of Residence <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Icon icon="lucide:map-pin" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          name="location"
                          value={formData.location}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                        >
                          {nigerianLocations.map((loc) => (
                            <option key={loc.code} value={loc.state}>
                              {loc.state} State
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Residential Address
                      </label>
                      <div className="relative">
                        <Icon icon="lucide:home" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          name="address"
                          placeholder="e.g. 15 Broad Street, Lagos"
                          value={formData.address}
                          onChange={handleChange}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 5: Academic Department Track */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                        Academic Department Track <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[10px] text-gray-400 font-semibold">Determines syllabus & CBT question bank</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: "Science", icon: "lucide:atom", desc: "Physics, Chem, Bio" },
                        { id: "Commercial", icon: "lucide:briefcase", desc: "Accounting, Commerce" },
                        { id: "Arts", icon: "lucide:book-open", desc: "Lit, Govt, History" },
                        { id: "General", icon: "lucide:layers", desc: "General Studies" },
                      ].map((dept) => {
                        const isSelected = formData.department === dept.id;
                        return (
                          <button
                            type="button"
                            key={dept.id}
                            onClick={() => setFormData((prev) => ({ ...prev, department: dept.id }))}
                            className={`p-3.5 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                              isSelected
                                ? "bg-[#09314F] text-white border-[#09314F] shadow-md dark:bg-[#C5A97A] dark:text-[#09314F] dark:border-[#C5A97A]"
                                : "bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <Icon icon={dept.icon} className="w-4 h-4 opacity-80" />
                              {isSelected && <Icon icon="lucide:check-circle" className="w-3.5 h-3.5 text-emerald-400 dark:text-[#09314F]" />}
                            </div>
                            <div className="mt-2">
                              <p className="text-xs font-black leading-tight">{dept.id}</p>
                              <p className={`text-[9px] mt-0.5 truncate ${isSelected ? "text-white/70 dark:text-[#09314F]/80" : "text-gray-400"}`}>
                                {dept.desc}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Row 6: Passwords */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Student Account Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Icon icon="lucide:lock" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Min. 6 characters"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className={`w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A] transition-all ${
                              fieldErrors.password
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <Icon icon={showPassword ? "lucide:eye-off" : "lucide:eye"} className="w-4 h-4" />
                          </button>
                        </div>
                        {fieldErrors.password && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{fieldErrors.password}</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                          Confirm Password <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Icon icon="lucide:lock" className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            name="confirmPassword"
                            placeholder="Repeat password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className={`w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-gray-900 border rounded-2xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#C5A97A] transition-all ${
                              fieldErrors.confirmPassword
                                ? "border-rose-400 bg-rose-50/20"
                                : "border-gray-200 dark:border-gray-700"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            <Icon icon={showConfirmPassword ? "lucide:eye-off" : "lucide:eye"} className="w-4 h-4" />
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <p className="text-[10px] font-bold text-rose-500 mt-0.5">{fieldErrors.confirmPassword}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-4 bg-[#09314F] hover:bg-[#0d3f66] dark:bg-[#C5A97A] dark:hover:bg-[#b09262] text-white dark:text-[#09314F] font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                          <span>Creating Ward Account & Sending OTP...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:arrow-right" className="w-5 h-5" />
                          <span>Create Ward Profile & Send OTP Verification</span>
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            )}
          </>
        )}

        {/* ==================================================================== */}
        {/* MODULE 2: TRAINING SELECTION (SIGNUP FLOW DESIGN PRINCIPLE)          */}
        {/* ==================================================================== */}
        {currentStep === 2 && createdWard && (
          <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-10 border border-gray-100 dark:border-gray-700/80 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
            
            {/* Header & Subtitle matching Guardian Signup Flow */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
              <div>
                <span className="px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#09314F] dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  Module 2 of 5 • Training Selection
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#09314F] dark:text-white mt-1">
                  Select Training
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5">
                  Select the examinations each student is about to write. You may select more than one examination per student.
                </p>
              </div>

              {/* Ward Mini Pill */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 self-start sm:self-auto">
                <div className="w-8 h-8 rounded-xl bg-[#09314F] text-white flex items-center justify-center font-bold text-xs">
                  <Icon icon="lucide:user" className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                    {createdWard.name || `${createdWard.firstname} ${createdWard.surname}`}
                  </p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Verified • {createdWard.department} Track
                  </p>
                </div>
              </div>
            </div>

            {/* If Grant was already activated */}
            {grantSuccess ? (
              <div className="p-8 rounded-[28px] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Icon icon="lucide:check-circle" className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                    Free Training Program Grant Activated!
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                    {createdWard.firstname} has been successfully granted full active access to <strong>{grantSuccess.course}</strong> at no cost!
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    to="/guardian/dashboard"
                    className="px-6 py-3 bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] font-black text-xs uppercase tracking-wider rounded-xl shadow-md hover:opacity-95"
                  >
                    View Ward Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Add Another Ward
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Per-Student Accordion matching Guardian Signup flow */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/80 overflow-hidden">
                  {/* Accordion Header */}
                  <div className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#09314F] dark:text-white uppercase tracking-wide">
                        Student 1
                      </span>
                      <span className="text-xs text-gray-400">
                        — {createdWard.firstname} {createdWard.surname}
                      </span>
                      {selectedCourseIds.length > 0 && (
                        <span className="text-xs bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
                          {selectedCourseIds.length} selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#09314F] dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 px-2.5 py-0.5 rounded-full uppercase">
                        {createdWard.department} Track
                      </span>
                    </div>
                  </div>

                  {/* Accordion Body — Course Grid (h-[50px] rectangular buttons matching Guardian flow) */}
                  <div className="px-5 pb-6 pt-4">
                    {loadingCourses ? (
                      <div className="py-8 flex flex-col items-center justify-center space-y-2">
                        <Icon icon="lucide:loader-2" className="w-6 h-6 text-[#09314F] animate-spin" />
                        <p className="text-xs text-gray-500 font-bold">Loading examinations...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {courses.map((exam) => {
                          const isSelected = selectedCourseIds.includes(exam.id);
                          const isFree = Number(exam.price || 0) === 0;

                          return (
                            <button
                              key={exam.id}
                              type="button"
                              onClick={() => toggleTraining(exam.id)}
                              className={`h-[50px] rounded-lg font-bold flex items-center justify-between px-4 transition-all duration-300 active:scale-[0.98] ${
                                isSelected
                                  ? "bg-[#76D287] text-white shadow-md shadow-green-100"
                                  : "bg-[#D1D5DB] text-[#4B5563] hover:bg-gray-400 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-650"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm uppercase tracking-wide">
                                  {exam.title}
                                </span>
                                {isFree && (
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${isSelected ? "bg-white/25 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                                    FREE
                                  </span>
                                )}
                              </div>
                              {isSelected && (
                                <span className="text-base font-black">✓</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tuition & Program Summary */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-2 text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    Selected Examination(s): <strong className="text-[#09314F] dark:text-white">{courses.filter((c) => selectedCourseIds.includes(c.id)).map((c) => c.title).join(", ") || "None"}</strong>
                  </span>
                  <span>
                    Tuition Fee: <strong className="font-mono text-[#09314F] dark:text-[#C5A97A]">{courses.filter((c) => selectedCourseIds.includes(c.id)).reduce((acc, c) => acc + Number(c.price || 0), 0) <= 0 ? "Free Grant (₦0)" : `₦${courses.filter((c) => selectedCourseIds.includes(c.id)).reduce((acc, c) => acc + Number(c.price || 0), 0).toLocaleString()}`}</strong>
                  </span>
                </div>

                {/* Bottom Action Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVerifyingOtp(false);
                      setCurrentStep(1);
                    }}
                    className="w-full sm:w-auto px-6 py-4 rounded-[18px] border-2 border-gray-200 dark:border-gray-700 text-[#09314F] dark:text-gray-300 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                    <span>Edit Biodata</span>
                  </button>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    {selectedCourseIds.length > 0 && courses.filter((c) => selectedCourseIds.includes(c.id)).reduce((acc, c) => acc + Number(c.price || 0), 0) <= 0 ? (
                      <button
                        type="button"
                        onClick={handleActivateFreeGrant}
                        disabled={activatingGrant}
                        className="w-full sm:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        {activatingGrant ? (
                          <>
                            <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                            <span>Activating Grant...</span>
                          </>
                        ) : (
                          <>
                            <Icon icon="lucide:sparkles" className="w-4 h-4" />
                            <span>Activate Free Training Grant (₦0)</span>
                          </>
                        )}
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleProceedToStep3}
                      disabled={selectedCourseIds.length === 0 || loadingCourses}
                      className="w-full sm:w-auto py-5 px-10 rounded-[22px] font-bold text-base text-white bg-gradient-to-r from-[#09314F] to-[#E83831] shadow-xl hover:shadow-[#E8383144] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <span>Continue</span>
                      <Icon icon="lucide:arrow-right" className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 3: SUBJECT SELECTION (SIGNUP FLOW DESIGN PRINCIPLE)           */}
        {/* ==================================================================== */}
        {currentStep === 3 && createdWard && selectedCourseIds.length > 0 && (
          <div className="space-y-6 animate-in fade-in zoom-in-95">
            {/* Header & Department Context matching Guardian Signup Flow */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
              <div>
                <span className="px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#09314F] dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                  Module 3 of 5 • Subject Selection
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-[#09314F] dark:text-white mt-1">
                  Subject Selection
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Select subjects for {createdWard.firstname}'s chosen training (
                  {courses
                    .filter((c) => selectedCourseIds.includes(c.id))
                    .map((c) => c.title)
                    .join(", ")}
                  ).
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-bold text-[#09314F] dark:text-gray-200 shadow-sm">
                  Track: <strong className="text-blue-600 dark:text-blue-400">{createdWard.department}</strong>
                </span>
              </div>
            </div>

            {/* Signature Student Card Container with Navy Table Bar */}
            <div className={`bg-white dark:bg-gray-800 rounded-[32px] shadow-[0_10px_30px_rgba(0,0,0,0.03)] border border-gray-100 dark:border-gray-700/80 mb-4 relative ${openDropdownCourseId ? 'z-50' : 'z-10'}`}>
              
              {/* Student Header Bar */}
              <div className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 dark:hover:bg-gray-750/50 transition-colors rounded-[32px]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-[#09314F] text-white flex items-center justify-center font-black text-xs shadow-md shadow-[#09314F22]">
                    1
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-[#888888] dark:text-gray-400 uppercase tracking-widest leading-none mb-1">
                      Student
                    </p>
                    <h3 className="text-sm font-black text-[#09314F] dark:text-white uppercase tracking-wide">
                      {createdWard.firstname} {createdWard.surname}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {courses
                    .filter((c) => selectedCourseIds.includes(c.id))
                    .map((c) => (
                      <span
                        key={c.id}
                        className="text-[10px] font-black text-[#09314F] dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 px-3 py-1 rounded-full uppercase"
                      >
                        {c.title}
                      </span>
                    ))}
                </div>
              </div>

              {/* Signature Navy Table Section */}
              <div className="p-2 sm:p-4 pt-0 animate-fadeIn relative">
                {/* Navy Table Header Bar */}
                <div className="grid grid-cols-3 bg-[#09314F] text-white px-4 md:px-6 py-4 rounded-t-[12px] shadow-sm">
                  <span className="text-[8px] sm:text-[10px] md:text-sm font-black uppercase tracking-wider text-left leading-tight">
                    Exam
                  </span>
                  <span className="text-[8px] sm:text-[10px] md:text-sm font-black uppercase tracking-wider text-center leading-tight">
                    Subjects
                  </span>
                  <span className="text-[8px] sm:text-[10px] md:text-sm font-black uppercase tracking-wider text-right leading-tight">
                    Count
                  </span>
                </div>

                {/* Navy Table Rows for all selected courses */}
                <div className="space-y-0">
                  {courses
                    .filter((c) => selectedCourseIds.includes(c.id))
                    .map((course, idx, arr) => {
                      const selectedIds = selectedSubjectsByCourse[course.id] || [];
                      const subjects = subjectsByCourse[course.id] || [];
                      const limit = course.title?.toLowerCase().includes("jamb") ? 4 : 9;
                      const isOpen = openDropdownCourseId === course.id;
                      const isLast = idx === arr.length - 1;

                      return (
                        <div
                          key={course.id}
                          className={`grid grid-cols-3 items-center px-4 md:px-6 py-5 border-x border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-850 relative ${
                            isLast ? "rounded-b-[12px]" : ""
                          } ${isOpen ? "z-50" : "z-10"}`}
                        >
                          {/* Col 1: Exam Title */}
                          <div className="text-[9px] sm:text-[11px] md:text-sm font-bold text-[#09314F] dark:text-white uppercase tracking-wide truncate leading-tight">
                            {course.title}
                          </div>

                          {/* Col 2: Interactive Subject Selector & Floating Overlay */}
                          <div className="min-w-0 lg:relative flex justify-center">
                            <button
                              id={`toggle-subjects-${course.id}`}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownCourseId(isOpen ? null : course.id);
                              }}
                              className="w-full max-w-[220px] min-w-0 min-h-[44px] flex items-center justify-center transition-all group pointer-events-auto text-[9px] sm:text-[11px] md:text-sm leading-tight focus:outline-none"
                            >
                              <div className={`${dropdownTheme.subjectPreview} dark:bg-gray-700 dark:text-gray-100 text-center truncate flex items-center justify-between gap-1 shadow-inner px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600`}>
                                <span className="truncate font-bold">
                                  {selectedIds.length > 0 ? (
                                    subjects
                                      .filter((s) => selectedIds.includes(s.id))
                                      .map((s) => s.name)
                                      .join(", ")
                                  ) : (
                                    "Select subjects"
                                  )}
                                </span>
                                <Icon
                                  icon="lucide:chevron-down"
                                  className={`w-3.5 h-3.5 text-gray-400 group-hover:text-[#09314F] dark:group-hover:text-white transition-transform duration-200 flex-shrink-0 ${
                                    isOpen ? "rotate-180" : ""
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Floating Overlay Menu using exact dropdownTheme styling */}
                            {isOpen && (
                              <div
                                ref={subjectDropdownRef}
                                className={`${dropdownTheme.overlay.container} !w-auto !left-2 !right-2 sm:!left-auto sm:!right-auto sm:!w-[320px] z-[200] shadow-2xl dark:bg-gray-900 dark:border-gray-700`}
                              >
                                <div className="flex items-center justify-between mb-2 px-2">
                                  <p className={`${dropdownTheme.overlay.header} mb-0 dark:text-gray-400`}>
                                    Choose up to {limit} for {course.title}
                                  </p>
                                  <span className="text-[10px] font-black text-[#09314F] dark:text-gray-300">
                                    {selectedIds.length} / {limit}
                                  </span>
                                </div>

                                {loadingSubjects ? (
                                  <div className="py-6 flex flex-col items-center justify-center space-y-2">
                                    <Icon icon="lucide:loader-2" className="w-5 h-5 text-[#09314F] animate-spin" />
                                    <p className="text-[11px] text-gray-500 font-bold">Loading subjects...</p>
                                  </div>
                                ) : (
                                  <div className="space-y-1 max-h-[240px] overflow-y-auto pr-1">
                                    {subjects.map((sub) => {
                                      const isSelected = selectedIds.includes(sub.id);
                                      const isLimitReached = !isSelected && selectedIds.length >= limit;
                                      return (
                                        <button
                                          key={sub.id}
                                          type="button"
                                          disabled={isLimitReached}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSubjectForCourse(course.id, sub.id);
                                          }}
                                          className={`${dropdownTheme.overlay.item(isSelected, isLimitReached)} dark:text-gray-200`}
                                        >
                                          <div className="flex items-center gap-1.5 truncate">
                                            <span className="truncate">{sub.name}</span>
                                            {sub.is_compulsory && (
                                              <span className="text-[8px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
                                                Req
                                              </span>
                                            )}
                                          </div>
                                          {isSelected && <Icon icon="lucide:check" className="w-3.5 h-3.5 flex-shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Col 3: Counter */}
                          <div className="text-right">
                            <span className="text-[10px] md:text-xs font-black text-[#09314F] dark:text-white">
                              {selectedIds.length}
                            </span>
                            <span className="text-[10px] md:text-xs font-bold text-gray-300 dark:text-gray-600"> / </span>
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 dark:text-gray-400">
                              {limit}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Selected Subject Chips Bar grouped by Course */}
                {courses
                  .filter((c) => selectedCourseIds.includes(c.id))
                  .some((c) => (selectedSubjectsByCourse[c.id] || []).length > 0) && (
                  <div className="mt-4 p-4 rounded-2xl bg-gray-50/70 dark:bg-gray-850/60 border border-gray-100 dark:border-gray-700/60 space-y-3">
                    {courses
                      .filter((c) => selectedCourseIds.includes(c.id))
                      .map((c) => {
                        const selectedIds = selectedSubjectsByCourse[c.id] || [];
                        if (selectedIds.length === 0) return null;
                        const subs = subjectsByCourse[c.id] || [];
                        return (
                          <div key={c.id} className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black text-[#09314F] dark:text-gray-300 uppercase tracking-widest min-w-[70px]">
                              {c.title}:
                            </span>
                            {subs
                              .filter((s) => selectedIds.includes(s.id))
                              .map((sub) => (
                                <span
                                  key={sub.id}
                                  className="text-[10px] font-black text-[#09314F] dark:text-gray-100 uppercase bg-white dark:bg-gray-750 px-2.5 py-1.5 rounded-lg border border-[#09314F15] dark:border-gray-600 shadow-sm inline-flex items-center gap-1.5"
                                >
                                  <span>{sub.name}</span>
                                  {sub.is_compulsory ? (
                                    <span className="text-[8px] bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded font-bold">
                                      REQ
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => toggleSubjectForCourse(c.id, sub.id)}
                                      className="text-gray-400 hover:text-red-500 font-black text-xs leading-none ml-0.5"
                                    >
                                      ×
                                    </button>
                                  )}
                                </span>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Signature Continue Button & Back */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="w-full sm:w-auto px-6 py-4 rounded-[18px] border-2 border-gray-200 dark:border-gray-700 text-[#09314F] dark:text-gray-300 font-bold text-xs uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
              >
                <Icon icon="lucide:arrow-left" className="w-4 h-4" />
                <span>Back to Courses</span>
              </button>

              <button
                type="button"
                onClick={handleProceedToStep4}
                disabled={courses
                  .filter((c) => selectedCourseIds.includes(c.id))
                  .some((c) => (selectedSubjectsByCourse[c.id] || []).length === 0)}
                className="w-full sm:w-auto py-5 px-10 rounded-[22px] font-bold text-base text-white bg-gradient-to-r from-[#09314F] to-[#E83831] shadow-xl hover:shadow-[#E8383144] transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Continue</span>
                <Icon icon="lucide:arrow-right" className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* CONFIRMATION / REVIEW MODAL (MATCHING GUARDIAN SIGNUP FLOW)           */}
        {/* ==================================================================== */}
        {showSubjectReviewModal && createdWard && selectedCourseIds.length > 0 && (
          <div className="fixed inset-0 bg-[#09314F77] backdrop-blur-[2px] flex items-center justify-center z-[150] p-4 sm:p-6 animate-fadeIn">
            <div className="bg-white dark:bg-gray-850 w-full max-w-[560px] md:max-w-[700px] rounded-[24px] shadow-2xl p-6 sm:p-10 max-h-[85vh] overflow-y-auto space-y-6 border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-bold text-[#09314F] dark:text-white">
                Review
              </h2>

              <div className="space-y-4">
                {/* Student Header with User Icon */}
                <div className="flex items-center gap-3 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-[#09314F] text-white flex items-center justify-center flex-shrink-0">
                    <Icon icon="lucide:user" className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold text-[#09314F] dark:text-white uppercase">
                    {createdWard.firstname} {createdWard.surname}
                  </span>
                  <span className="text-xs text-gray-400">
                    — {createdWard.department} Track
                  </span>
                </div>

                {/* Courses and Subjects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  {/* Desktop Header Row */}
                  <div className="hidden md:block col-span-2">
                    <div className="grid grid-cols-2 gap-8 pb-3 border-b-2 border-gray-200 dark:border-gray-700">
                      <div className="text-xs font-bold text-[#09314F] dark:text-gray-300 uppercase tracking-widest">Courses</div>
                      <div className="text-xs font-bold text-[#09314F] dark:text-gray-300 uppercase tracking-widest">Subjects</div>
                    </div>
                  </div>

                  {/* Desktop View - Horizontal */}
                  <div className="hidden md:contents">
                    {courses
                      .filter((c) => selectedCourseIds.includes(c.id))
                      .map((course) => {
                        const selectedSubs = (subjectsByCourse[course.id] || [])
                          .filter((s) => (selectedSubjectsByCourse[course.id] || []).includes(s.id))
                          .map((s) => s.name)
                          .join(", ");

                        return (
                          <React.Fragment key={course.id}>
                            <div className="text-sm font-bold text-[#09314F] dark:text-white uppercase tracking-wide py-3 border-b border-gray-100 dark:border-gray-700">
                              {course.title}
                            </div>
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 py-3 border-b border-gray-100 dark:border-gray-700 leading-relaxed">
                              {selectedSubs || "None"}
                            </div>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  {/* Mobile View - Vertical Card */}
                  <div className="md:hidden col-span-1 space-y-3">
                    {courses
                      .filter((c) => selectedCourseIds.includes(c.id))
                      .map((course) => {
                        const selectedSubs = (subjectsByCourse[course.id] || [])
                          .filter((s) => (selectedSubjectsByCourse[course.id] || []).includes(s.id))
                          .map((s) => s.name)
                          .join(", ");

                        return (
                          <div key={course.id} className="bg-gray-50 dark:bg-gray-800 rounded-[16px] p-4 border border-gray-200 dark:border-gray-700">
                            <div className="text-xs font-bold text-[#09314F] dark:text-white uppercase tracking-widest mb-2">
                              {course.title}
                            </div>
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-300 leading-relaxed">
                              {selectedSubs || "None"}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowSubjectReviewModal(false)}
                  className="flex-1 h-[54px] rounded-[14px] font-bold text-sm text-[#09314F] dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-[#09314F] dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-[0.98]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReviewAndProceed}
                  className="flex-1 h-[54px] rounded-[14px] font-bold text-sm text-white bg-[#09314F] hover:bg-[#09314F]/95 transition-all shadow-lg shadow-[#09314F33] active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {courses
                    .filter((c) => selectedCourseIds.includes(c.id))
                    .reduce((sum, c) => sum + Number(c.price || 0), 0) <= 0 ? (
                    <>
                      <Icon icon="lucide:sparkles" className="w-4 h-4 text-emerald-400" />
                      <span>Confirm & Activate Free Training (₦0)</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 4: DURATION PLAN SELECTION                                   */}
        {/* ==================================================================== */}
        {currentStep === 4 && createdWard && selectedCourseIds.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-10 border border-gray-100 dark:border-gray-700/80 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
              <span className="px-3.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-[10px] font-black uppercase tracking-wider">
                Module 4 of 5 • Access Duration Plan
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#09314F] dark:text-white mt-1">
                Choose Access Duration for {createdWard.firstname}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Multi-month terms include a 5% bundled discount on live classes and CBT access.
              </p>
            </div>

            <div className="space-y-3">
              {Object.values(DURATION_PLANS).map((plan) => {
                const isSelected = selectedDuration === plan.key;
                const totalRawPrice = courses
                  .filter((c) => selectedCourseIds.includes(c.id))
                  .reduce((sum, c) => sum + Number(c.price || 0), 0);
                const calculated = totalRawPrice <= 0 ? 0 : calculatePlanPrice(totalRawPrice, plan.months);

                return (
                  <div
                    key={plan.key}
                    onClick={() => setSelectedDuration(plan.key)}
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-[#09314F] dark:border-[#C5A97A] bg-blue-50/50 dark:bg-[#C5A97A]/10 text-[#09314F] dark:text-white shadow-sm"
                        : "border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-[#09314F] dark:border-[#C5A97A]" : "border-gray-300 dark:border-gray-600"
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#09314F] dark:bg-[#C5A97A]" />}
                      </div>
                      <div>
                        <span className="text-xs font-bold block">{plan.label}</span>
                        {plan.savings && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase">
                            {plan.savings} ({plan.tag})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-mono text-sm font-black">
                        {calculated === 0 ? "FREE" : `₦${calculated.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50"
              >
                ← Back to Subjects
              </button>

              <button
                type="button"
                onClick={handleProceedToStep5}
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#09314F] hover:bg-[#0d3f66] dark:bg-[#C5A97A] dark:hover:bg-[#b09262] text-white dark:text-[#09314F] font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                    <span>Configuring Plan...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Step 5: Payment & Activation</span>
                    <Icon icon="lucide:arrow-right" className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* MODULE 5: PAYMENT & ACTIVATION                                       */}
        {/* ==================================================================== */}
        {currentStep === 5 && createdWard && selectedCourseIds.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-[32px] p-6 sm:p-10 border border-gray-100 dark:border-gray-700/80 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
            
            <div className="pb-4 border-b border-gray-100 dark:border-gray-700">
              <span className="px-3.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                Module 5 of 5 • Payment & Activation
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#09314F] dark:text-white mt-1">
                Final Review & Program Activation
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Verify training summary and select your payment method.
              </p>
            </div>

            {/* If Grant is active */}
            {grantSuccess ? (
              <div className="p-8 rounded-[28px] bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                  <Icon icon="lucide:check-circle" className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
                    Training Program Activated Successfully!
                  </h3>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-300 mt-1 max-w-md mx-auto">
                    {grantSuccess.message}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    to="/guardian/dashboard"
                    className="px-6 py-3 bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                  >
                    Go to Guardian Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleResetWizard}
                    className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl hover:bg-gray-50"
                  >
                    Add Another Ward
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Summary Box */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Student Ward:</span>
                    <strong className="text-gray-900 dark:text-white">{createdWard.name || `${createdWard.firstname} ${createdWard.surname}`}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Course Track:</span>
                    <strong className="text-[#09314F] dark:text-[#C5A97A]">
                      {courses
                        .filter((c) => selectedCourseIds.includes(c.id))
                        .map((c) => c.title)
                        .join(", ")}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Selected Subjects:</span>
                    <strong className="text-gray-900 dark:text-white">
                      {Object.values(selectedSubjectsByCourse).reduce((sum, arr) => sum + arr.length, 0)} Subjects
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration Plan:</span>
                    <strong className="text-gray-900 dark:text-white">{DURATION_PLANS[selectedDuration]?.label}</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700 text-sm">
                    <span className="font-black text-[#09314F] dark:text-white">Amount Payable:</span>
                    <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-base font-black">
                      ₦{Number(totalPayableAmount || stagedEnrollment?.amount || 0).toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* If Amount is zero: free grant button */}
                {Number(totalPayableAmount || stagedEnrollment?.amount || 0) === 0 ? (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleActivateFreeGrant}
                      disabled={activatingGrant}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
                    >
                      {activatingGrant ? (
                        <>
                          <Icon icon="lucide:loader-2" className="w-5 h-5 animate-spin" />
                          <span>Activating Free Training Grant...</span>
                        </>
                      ) : (
                        <>
                          <Icon icon="lucide:sparkles" className="w-5 h-5" />
                          <span>Activate Free Access Instantly (₦0)</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Payment Error / Retry Box */}
                    {paymentError && (
                  <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 p-4 text-xs text-red-800 dark:text-red-300">
                    <p className="font-bold">{paymentError}</p>
                    {pendingPayment && (
                      <button
                        type="button"
                        onClick={() => handlePaystackSuccess(pendingPayment)}
                        disabled={paystackVerifying}
                        className="mt-3 rounded-lg bg-[#09314F] dark:bg-[#C5A97A] px-4 py-2 font-bold text-white dark:text-[#09314F] disabled:opacity-50 text-xs"
                      >
                        Retry payment verification
                      </button>
                    )}
                  </div>
                )}

                {/* Paid options: Paystack or Bank Transfer (Matching Guardian Signup Flow) */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-[#09314F] dark:text-white uppercase tracking-wider">
                    Select Payment Method
                  </h3>

                  {/* Paystack Gateway Option (Matching Guardian Flow: Card with ->) */}
                  <button
                    type="button"
                    onClick={() => openGateway("Paystack")}
                    disabled={paystackVerifying || !!pendingPayment}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#09314F] dark:hover:border-[#C5A97A] rounded-xl px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all shadow-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#09314F] dark:text-blue-300 flex items-center justify-center">
                        <Icon icon="lucide:credit-card" className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block font-black text-sm text-[#09314F] dark:text-white">Paystack</span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400">Debit card, USSD, Apple Pay, Bank Transfer</span>
                      </div>
                    </div>
                    <span className="text-xl font-black text-gray-400 group-hover:text-[#09314F] dark:group-hover:text-[#C5A97A] transition-colors">→</span>
                  </button>

                  {/* Direct Bank Transfer Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMethod(paymentMethod === "bank_transfer" ? null : "bank_transfer");
                      if (!bankTransferData) handleInitBankTransfer();
                    }}
                    disabled={paystackVerifying || !!pendingPayment}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-[#09314F] dark:hover:border-[#C5A97A] rounded-xl px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all shadow-sm group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                        <Icon icon="lucide:building-2" className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <span className="block font-black text-sm text-[#09314F] dark:text-white">Direct Bank Transfer</span>
                        <span className="block text-[11px] text-gray-500 dark:text-gray-400">GTBank • Narration matched</span>
                      </div>
                    </div>
                    <span className="text-xl font-black text-gray-400 group-hover:text-[#09314F] dark:group-hover:text-[#C5A97A] transition-colors">
                      {paymentMethod === "bank_transfer" ? "↓" : "→"}
                    </span>
                  </button>

                  {/* Bank Transfer Details Box */}
                  {paymentMethod === "bank_transfer" && (
                    <div className="rounded-2xl p-5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 space-y-4 animate-in fade-in">
                      <div className="flex items-center gap-2">
                        <Icon icon="lucide:shield-check" className="w-5 h-5 text-amber-600" />
                        <h4 className="text-xs font-black text-amber-950 dark:text-amber-200 uppercase tracking-wider">
                          Official Tutorial Center Bank Details
                        </h4>
                      </div>

                      {loadingBankTransfer ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-xs font-bold text-amber-800">
                          <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                          <span>Generating unique transfer reference...</span>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-amber-100 dark:border-amber-900/40">
                              <p className="text-[10px] uppercase font-bold text-gray-400">Bank Name</p>
                              <p className="font-black text-gray-900 dark:text-white mt-0.5">Zenith Bank</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-amber-100 dark:border-amber-900/40">
                              <p className="text-[10px] uppercase font-bold text-gray-400">Account Name</p>
                              <p className="font-black text-gray-900 dark:text-white mt-0.5">Tutorial Center LTD</p>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Account Number</p>
                                <p className="font-mono font-black text-sm text-gray-900 dark:text-white mt-0.5">1312411265</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopy("1312411265", "account")}
                                className="text-xs font-bold text-[#09314F] dark:text-[#C5A97A] hover:underline"
                              >
                                {copiedBankField === "account" ? "Copied ✓" : "Copy"}
                              </button>
                            </div>
                            <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-amber-100 dark:border-amber-900/40 flex items-center justify-between">
                              <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400">Transfer Narration / Reference</p>
                                <p className="font-mono font-black text-sm text-amber-700 dark:text-amber-400 mt-0.5">
                                  {bankTransferData?.reference || "TCA_REF_GEN"}
                                </p>
                              </div>
                              {bankTransferData?.reference && (
                                <button
                                  type="button"
                                  onClick={() => handleCopy(bankTransferData.reference, "ref")}
                                  className="text-xs font-bold text-[#09314F] dark:text-[#C5A97A] hover:underline"
                                >
                                  {copiedBankField === "ref" ? "Copied ✓" : "Copy"}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Claim Form */}
                          {claimSubmitted ? (
                            <div className="p-4 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300 text-xs space-y-2">
                              <p className="font-black text-emerald-900 dark:text-emerald-200">
                                ✓ Payment Claim Submitted Successfully!
                              </p>
                              <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
                                Tutorial Center staff will review your transfer narration and activate {createdWard.firstname}'s plan immediately.
                              </p>
                              <Link
                                to="/guardian/dashboard"
                                className="inline-block px-4 py-2 bg-emerald-700 text-white font-bold text-xs rounded-lg mt-1"
                              >
                                Return to Dashboard
                              </Link>
                            </div>
                          ) : (
                            <form onSubmit={handleSubmitBankClaim} className="space-y-3 pt-2">
                              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                                After making the transfer, confirm details below:
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input
                                  type="text"
                                  placeholder="Sender's Account Name (e.g. John Doe)"
                                  value={bankClaim.paid_from_account_name}
                                  onChange={(e) => setBankClaim((prev) => ({ ...prev, paid_from_account_name: e.target.value }))}
                                  required
                                  className="px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                                />
                                <input
                                  type="number"
                                  placeholder="Amount Paid (₦)"
                                  value={bankClaim.amount_paid}
                                  onChange={(e) => setBankClaim((prev) => ({ ...prev, amount_paid: e.target.value }))}
                                  required
                                  className="px-3.5 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#C5A97A]"
                                />
                              </div>
                              <button
                                type="submit"
                                disabled={submittingClaim || !bankTransferData}
                                className="w-full py-3 bg-[#09314F] dark:bg-[#C5A97A] text-white dark:text-[#09314F] font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                              >
                                {submittingClaim ? (
                                  <>
                                    <Icon icon="lucide:loader-2" className="w-4 h-4 animate-spin" />
                                    <span>Submitting Claim...</span>
                                  </>
                                ) : (
                                  <>
                                    <Icon icon="lucide:check" className="w-4 h-4" />
                                    <span>I Have Transferred • Submit Payment Claim</span>
                                  </>
                                )}
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

              {/* MODAL - MATCHING GUARDIAN SIGNUP FLOW */}
              {showPayModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white dark:bg-[#09314F] w-[90%] max-w-md rounded-2xl p-6 relative shadow-2xl border border-gray-100 dark:border-white/10 animate-in fade-in zoom-in-95">
                    <h2 className="text-xl font-bold mb-4 text-[#09314F] dark:text-white text-center">
                      {gateway} Payment
                    </h2>

                    <div className="text-3xl font-black text-center mb-6 text-[#09314F] dark:text-white font-mono">
                      ₦{Number(totalPayableAmount || stagedEnrollment?.amount || 0).toLocaleString()}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-300 text-center mb-6">
                      Online activation for <strong className="text-gray-900 dark:text-white">{createdWard?.name || createdWard?.firstname}</strong> ({payerEmail})
                    </p>

                    {gateway === "Paystack" && (
                      <Paystack
                        amount={totalPayableAmount || stagedEnrollment?.amount || 0}
                        email={payerEmail}
                        reference={paystackRef}
                        metadata={paystackMetadata}
                        onSuccess={handlePaystackSuccess}
                        onClose={closeModal}
                      />
                    )}

                    <button
                      onClick={closeModal}
                      disabled={paystackVerifying}
                      className="mt-4 w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors text-center block"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50"
                >
                  ← Back to Duration
                </button>
              </div>
            </>
          )}

          </div>
        )}

        {/* Paystack Verification Overlay */}
        {paystackVerifying && (
          <div className="fixed inset-0 bg-[#09314F]/80 backdrop-blur-sm z-[100] flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm text-center mx-4 space-y-4 animate-in zoom-in-95">
              <div className="w-16 h-16 border-4 border-gray-100 dark:border-gray-700 border-t-[#E83831] rounded-full animate-spin" />
              <h3 className="text-lg font-black text-[#09314F] dark:text-white uppercase tracking-tight">
                Activating Training Program
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Confirming transaction with Paystack and initializing your ward's course enrollments...
              </p>
            </div>
          </div>
        )}

      </div>
    </GuardianDashboardLayout>
  );
}
