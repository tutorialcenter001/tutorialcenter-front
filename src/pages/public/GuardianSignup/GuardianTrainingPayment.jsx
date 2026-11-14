import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import TC_logo from "../../../assets/images/tutorial_logo.webp";
import signup_img from "../../../assets/images/Student_sign_up.webp";
import {
  ChevronLeftIcon,
  ShieldCheckIcon,
  BuildingLibraryIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import Paystack from "../../../components/Paystack";

export default function GuardianTrainingPayment() {
  const navigate = useNavigate();

  const [guardianData, setGuardianData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedDurations, setSelectedDurations] = useState({});
  const [selectedMethod, setSelectedMethod] = useState(null); // 'paystack' | 'bank_transfer'
  const [gateway, setGateway] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [pendingPayment, setPendingPayment] = useState(null);
  const verificationLock = useRef(false);

  // Bank Transfer states
  const [bankTransferData, setBankTransferData] = useState(null);
  const [loadingBankTransfer, setLoadingBankTransfer] = useState(false);
  const [copiedBankField, setCopiedBankField] = useState(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [bankClaim, setBankClaim] = useState({
    paid_from_account_name: "",
    amount_paid: "",
    note: "",
  });

  const API_BASE_URL =
    process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";

  /* ================= INIT ================= */
  useEffect(() => {
    const stored = localStorage.getItem("guardianStudentsDuration");

    if (!stored) {
      navigate("/register/guardian/training/duration");
      return;
    }

    const parsed = JSON.parse(stored);
    setGuardianData(parsed);

    // Aggregate all durations across all students for total calculation
    const allDurations = {};
    parsed.forEach((student, sIndex) => {
      Object.entries(student.selectedDurations || {}).forEach(
        ([courseId, duration]) => {
          allDurations[`${sIndex}_${courseId}`] = duration;
        }
      );
    });
    setSelectedDurations(allDurations);
  }, [navigate]);

  /* ================= FETCH COURSES ================= */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/courses`);
        setCourses(response?.data?.courses || []);
      } catch (error) {
        console.warn("Failed to fetch courses:", error);
      }
    };
    fetchCourses();
  }, [API_BASE_URL]);

  /* ================= TOTAL ================= */
  const totalAmount = useMemo(() => {
    return Object.values(selectedDurations)
      .filter(Boolean)
      .reduce((sum, item) => sum + Number(item.price || 0), 0);
  }, [selectedDurations]);

  /* ================= PER-STUDENT BREAKDOWN ================= */
  const studentBreakdown = useMemo(() => {
    if (!guardianData || !Array.isArray(guardianData)) return [];
    return guardianData.map((student, sIdx) => {
      const studentName =
        `${student.firstname || ""} ${student.surname || ""}`.trim() ||
        `Student ${sIdx + 1}`;
      const courseEntries = Object.entries(student.selectedDurations || {})
        .filter(([_, dur]) => Boolean(dur))
        .map(([cId, dur]) => {
          const course = courses.find((c) => Number(c.id) === Number(cId));
          const courseTitle =
            course?.title ||
            (Number(cId) === 1
              ? "JAMB"
              : Number(cId) === 2
              ? "WAEC"
              : Number(cId) === 3
              ? "NECO"
              : "GCE");
          const billing = dur.duration
            ? dur.duration.charAt(0).toUpperCase() + dur.duration.slice(1)
            : "Monthly";
          return {
            courseId: Number(cId),
            courseTitle,
            billing,
            price: Number(dur.price || 0),
          };
        });
      const subtotal = courseEntries.reduce((sum, c) => sum + c.price, 0);
      return {
        studentId: student.id,
        name: studentName,
        courses: courseEntries,
        subtotal,
      };
    });
  }, [guardianData, courses]);

  /* ================= EMAIL ================= */
  const payerEmail = useMemo(() => {
    const storedEmail = localStorage.getItem("guardianEmail");
    if (storedEmail && storedEmail.includes("@")) return storedEmail.trim();

    try {
      const storedGuardian = JSON.parse(
        localStorage.getItem("guardianStudents") || "{}"
      );
      if (storedGuardian?.email && storedGuardian.email.includes("@"))
        return storedGuardian.email.trim();
    } catch (e) {}

    if (
      guardianData?.length &&
      guardianData[0]?.email &&
      guardianData[0].email.includes("@")
    ) {
      return guardianData[0].email.trim();
    }
    return "guardian@tutorialcenter.com";
  }, [guardianData]);

  /* ================= PAYSTACK METADATA ================= */
  const paystackMetadata = useMemo(() => {
    if (!guardianData || !Array.isArray(guardianData)) return {};

    const storedGuardianStudents = JSON.parse(
      localStorage.getItem("guardianStudents") || "{}"
    );
    const referralCode =
      storedGuardianStudents?.referral_code ||
      localStorage.getItem("global_referral_code");

    const students = guardianData.map((student) => {
      const selectedSubjects = student.selectedSubjects || {};
      const coursesList = Object.entries(student.selectedDurations || {})
        .filter(([_, duration]) => Boolean(duration))
        .map(([courseId, duration]) => ({
          course_id: Number(courseId),
          billing_cycle: duration.duration,
          price: Number(duration.price || 0),
          subjects: selectedSubjects[courseId] || [],
        }));

      return {
        student_id: student.id,
        courses: coursesList,
      };
    });

    return {
      type: "guardian_enrollment",
      guardian_id:
        storedGuardianStudents?.id || storedGuardianStudents?.guardian_id,
      students,
      referral_code: referralCode,
    };
  }, [guardianData]);

  /* ================= CLEANUP STORAGE ================= */
  const cleanupStorage = useCallback(() => {
    localStorage.removeItem("guardianTel");
    localStorage.removeItem("guardianEmail");
    localStorage.removeItem("guardianStudents");
    localStorage.removeItem("guardianStudentsBiodata");
    localStorage.removeItem("guardianStudentsTraining");
    localStorage.removeItem("guardianStudentsSubjects");
    localStorage.removeItem("guardianStudentsDuration");
  }, []);

  /* ================= INITIATE BANK TRANSFER ================= */
  const handleInitBankTransfer = async () => {
    if (!guardianData || !Array.isArray(guardianData) || loadingBankTransfer) return;
    setLoadingBankTransfer(true);
    setPaymentError("");

    try {
      const storedGuardian = JSON.parse(
        localStorage.getItem("guardianStudents") || "{}"
      );
      const payload = {
        guardian_id:
          storedGuardian?.id || storedGuardian?.guardian_id || undefined,
        students: guardianData.map((student) => {
          const selectedSubjects = student.selectedSubjects || {};
          return {
            student_id: student.id,
            courses: Object.entries(student.selectedDurations || {})
              .filter(([_, duration]) => Boolean(duration))
              .map(([courseId, duration]) => ({
                course_id: Number(courseId),
                billing_cycle: duration.duration,
                price: Number(duration.price || 0),
                subjects: selectedSubjects[courseId] || [],
              })),
          };
        }),
      };

      const res = await axios.post(
        `${API_BASE_URL}/api/payments/guardian-bank-transfer`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 45000,
        }
      );

      setBankTransferData(res.data);
      setBankClaim((prev) => ({
        ...prev,
        amount_paid: res.data.total_amount || totalAmount,
      }));
    } catch (err) {
      console.warn("Failed to initiate guardian bank transfer:", err);
      setPaymentError(
        err.response?.data?.message ||
          "Failed to generate bank transfer details. Please retry."
      );
    } finally {
      setLoadingBankTransfer(false);
    }
  };

  /* ================= SUBMIT BANK CLAIM ================= */
  const handleSubmitBankClaim = async (e) => {
    e.preventDefault();
    if (!bankTransferData?.reference || submittingClaim) return;
    setSubmittingClaim(true);
    setPaymentError("");

    try {
      await axios.post(
        `${API_BASE_URL}/api/payments/bank-transfer/${encodeURIComponent(
          bankTransferData.reference
        )}/claim`,
        {
          access_token: bankTransferData.access_token,
          paid_from_account_name: bankClaim.paid_from_account_name,
          amount_paid: Number(bankClaim.amount_paid) || totalAmount,
          note:
            bankClaim.note ||
            `Batch guardian enrollment transfer for ${studentBreakdown.length} ward(s)`,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 45000,
        }
      );

      setClaimSubmitted(true);
      cleanupStorage();
    } catch (err) {
      console.error("Failed to submit bank transfer claim:", err);
      setPaymentError(
        err.response?.data?.message ||
          "Failed to submit bank transfer claim. Please check your details and retry."
      );
    } finally {
      setSubmittingClaim(false);
    }
  };

  /* ================= COPY HELPER ================= */
  const handleCopy = (text, field) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedBankField(field);
      setTimeout(() => setCopiedBankField(null), 2000);
    }
  };

  /* ================= PAYSTACK MODAL ================= */
  const openGateway = (selected) => {
    setGateway(selected);
    setShowModal(true);
  };

  const closeModal = () => {
    if (!processing) {
      setShowModal(false);
      setGateway(null);
    }
  };

  /* ================= PAYSTACK SUCCESS ================= */
  const handlePaystackSuccess = async (response) => {
    if (processing || verificationLock.current) return;

    const reference = response?.reference;
    if (!reference) {
      setPaymentError(
        "No payment reference was returned. Contact support before making another payment."
      );
      setShowModal(false);
      return;
    }

    const payment = { reference, metadata: paystackMetadata };
    setPendingPayment(payment);
    setPaymentError("");
    verificationLock.current = true;
    setProcessing(true);

    try {
      console.log(
        "Verifying guardian payment with backend for reference:",
        reference
      );

      // Timeout extended to 60s to prevent false-alarm aborts on network latency
      const result = await axios.post(
        `${API_BASE_URL}/api/payments/verify-paystack`,
        {
          reference,
          fallback_metadata: payment.metadata,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 60000,
        }
      );

      if (result.status !== 200 || result.data?.success !== true) {
        throw new Error(
          result.data?.message || "Payment has not been confirmed."
        );
      }

      cleanupStorage();
      setPendingPayment(null);
      navigate("/guardian/login");
    } catch (err) {
      console.error(
        "Guardian payment verification error:",
        err.response?.data || err
      );
      setPaymentError(
        `${err.response?.data?.message || err.message || "Unable to verify payment."} ` +
          `If you were charged, do not pay again. Retry verification using the saved reference.`
      );
    } finally {
      verificationLock.current = false;
      setProcessing(false);
      closeModal();
    }
  };

  return (
    <div className="w-full min-h-screen md:h-screen flex flex-col md:flex-row font-sans overflow-x-hidden">
      {/* LEFT COLUMN */}
      <div className="w-full md:w-1/2 bg-[#F4F4F4] px-6 py-10 lg:px-[80px] lg:py-[50px] order-2 md:order-1 overflow-y-auto">
        <div className="relative flex justify-center mb-6">
          <button
            onClick={() => navigate("/register/guardian/training/duration")}
            className="absolute left-0 p-3 bg-white hover:bg-gray-50 rounded-2xl shadow-sm transition-all active:scale-90 z-10"
          >
            <ChevronLeftIcon className="h-5 w-5 text-[#09314F] stroke-[2.5]" />
          </button>
          <img src={TC_logo} alt="Logo" className="h-[70px]" />
        </div>

        <h1 className="text-center text-2xl font-bold text-[#09314F] mb-2">
          Select Payment Method
        </h1>
        <p className="text-center text-xs text-gray-500 mb-6">
          Review your enrolled wards and choose your preferred payment method.
        </p>

        {/* ITEMIZED ENROLLMENT BREAKDOWN */}
        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#09314F]">
              Enrollment Breakdown ({studentBreakdown.length} Student{studentBreakdown.length > 1 ? "s" : ""})
            </span>
            <span className="text-xs font-bold text-gray-400">Itemized fees</span>
          </div>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {studentBreakdown.map((s, idx) => (
              <div
                key={s.studentId || idx}
                className="bg-gray-50/80 rounded-xl p-3 border border-gray-100 space-y-2"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-black text-[#09314F]">
                    {idx + 1}. {s.name}
                  </span>
                  <span className="font-bold text-xs text-gray-700">
                    ₦{s.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1 pl-2 border-l-2 border-[#09314F]/20">
                  {s.courses.map((c) => (
                    <div
                      key={c.courseId}
                      className="flex justify-between items-center text-[11px] text-gray-600"
                    >
                      <span>
                        {c.courseTitle} ({c.billing})
                      </span>
                      <span className="font-mono">₦{c.price.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline font-bold">
            <span className="text-sm font-black text-[#09314F] uppercase tracking-wider">
              Total Payable
            </span>
            <span className="text-2xl font-black text-[#09314F] font-mono">
              ₦{totalAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* ERROR BOX */}
        {paymentError && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800 space-y-2"
          >
            <p>{paymentError}</p>
            {pendingPayment && (
              <button
                type="button"
                onClick={() => handlePaystackSuccess(pendingPayment)}
                disabled={processing}
                className="rounded-xl bg-[#09314F] px-4 py-2 text-white hover:bg-[#07243a] transition-all disabled:opacity-50 text-xs font-black"
              >
                Retry payment verification
              </button>
            )}
          </div>
        )}

        {/* PAYMENT METHOD CHOICES */}
        <div className="space-y-3 mb-6">
          {/* Paystack Option */}
          <button
            type="button"
            onClick={() => {
              setSelectedMethod("paystack");
              openGateway("Paystack");
            }}
            disabled={processing || !!pendingPayment}
            className={`w-full bg-white border-2 rounded-2xl p-4 text-left transition-all shadow-sm hover:border-[#09314F] flex items-center justify-between group disabled:opacity-50 ${
              selectedMethod === "paystack"
                ? "border-[#09314F] bg-blue-50/30"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#09314F] flex items-center justify-center">
                <CreditCardIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="block font-black text-sm text-[#09314F]">
                  Paystack Online
                </span>
                <span className="block text-[11px] text-gray-500">
                  Debit Card, USSD, Apple Pay &amp; Paystack Transfer
                </span>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-[#09314F] font-black text-lg transition-colors">
              →
            </span>
          </button>

          {/* Direct Bank Transfer Option */}
          <button
            type="button"
            onClick={() => {
              if (selectedMethod === "bank_transfer") {
                setSelectedMethod(null);
              } else {
                setSelectedMethod("bank_transfer");
                if (!bankTransferData) {
                  handleInitBankTransfer();
                }
              }
            }}
            disabled={processing || !!pendingPayment}
            className={`w-full bg-white border-2 rounded-2xl p-4 text-left transition-all shadow-sm hover:border-[#09314F] flex items-center justify-between group disabled:opacity-50 ${
              selectedMethod === "bank_transfer"
                ? "border-[#09314F] bg-amber-50/30"
                : "border-gray-200"
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <BuildingLibraryIcon className="w-5 h-5 stroke-[2]" />
              </div>
              <div>
                <span className="block font-black text-sm text-[#09314F]">
                  Direct Bank Transfer
                </span>
                <span className="block text-[11px] text-gray-500">
                  Transfer to Zenith Bank account • Manual Admin Approval
                </span>
              </div>
            </div>
            <span className="text-gray-400 group-hover:text-[#09314F] font-black text-lg transition-colors">
              {selectedMethod === "bank_transfer" ? "↓" : "→"}
            </span>
          </button>
        </div>

        {/* BANK TRANSFER DETAILS & CLAIM FORM */}
        {selectedMethod === "bank_transfer" && (
          <div className="rounded-2xl p-5 bg-amber-50/70 border border-amber-200 space-y-4 mb-6 animate-in fade-in">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-amber-700" />
              <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                Official Tutorial Center Bank Account
              </h4>
            </div>

            {loadingBankTransfer ? (
              <div className="py-6 flex items-center justify-center gap-2 text-xs font-bold text-amber-900">
                <div className="w-4 h-4 border-2 border-amber-800 border-t-transparent rounded-full animate-spin"></div>
                <span>Generating your transfer reference...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-amber-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">
                      Bank Name
                    </p>
                    <p className="font-black text-gray-900 mt-0.5">Zenith Bank</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-100">
                    <p className="text-[10px] uppercase font-bold text-gray-400">
                      Account Name
                    </p>
                    <p className="font-black text-gray-900 mt-0.5">
                      Tutorial Center LTD
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        Account Number
                      </p>
                      <p className="font-mono font-black text-sm text-gray-900 mt-0.5">
                        1312411265
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy("1312411265", "account")}
                      className="flex items-center gap-1 text-xs font-bold text-[#09314F] hover:underline"
                    >
                      {copiedBankField === "account" ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-green-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        Transfer Narration / Ref
                      </p>
                      <p className="font-mono font-black text-sm text-amber-700 mt-0.5">
                        {bankTransferData?.reference || "Generating..."}
                      </p>
                    </div>
                    {bankTransferData?.reference && (
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(bankTransferData.reference, "ref")
                        }
                        className="flex items-center gap-1 text-xs font-bold text-[#09314F] hover:underline"
                      >
                        {copiedBankField === "ref" ? (
                          <>
                            <CheckIcon className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-green-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                  <strong>Important:</strong> Please ensure your bank transfer narration
                  matches the reference above so we can verify and approve access quickly.
                </p>

                {/* CLAIM SUBMITTED OR CLAIM FORM */}
                {claimSubmitted ? (
                  <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-xs space-y-2">
                    <p className="font-black text-emerald-900 flex items-center gap-1.5">
                      <CheckIcon className="w-4 h-4 text-emerald-700" />
                      Payment Claim Submitted Successfully!
                    </p>
                    <p className="text-emerald-800 text-[11px] leading-relaxed">
                      Tutorial Center staff will review your transfer narration and
                      activate courses for your wards. You can now login to your
                      guardian account.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate("/guardian/login")}
                      className="px-4 py-2 bg-emerald-800 text-white font-bold text-xs rounded-xl mt-2 hover:bg-emerald-900 transition-colors"
                    >
                      Proceed to Guardian Login →
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitBankClaim} className="space-y-3 pt-2">
                    <p className="text-xs font-bold text-gray-800">
                      After completing the transfer, enter confirmation details:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Sender Account Name *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Adeola Adeleke"
                          value={bankClaim.paid_from_account_name}
                          onChange={(e) =>
                            setBankClaim((prev) => ({
                              ...prev,
                              paid_from_account_name: e.target.value,
                            }))
                          }
                          required
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#09314F]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                          Amount Paid (₦) *
                        </label>
                        <input
                          type="number"
                          placeholder="Amount Paid (₦)"
                          value={bankClaim.amount_paid}
                          onChange={(e) =>
                            setBankClaim((prev) => ({
                              ...prev,
                              amount_paid: e.target.value,
                            }))
                          }
                          required
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#09314F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                        Optional Narration / Note
                      </label>
                      <input
                        type="text"
                        placeholder="Additional notes about your transfer"
                        value={bankClaim.note}
                        onChange={(e) =>
                          setBankClaim((prev) => ({
                            ...prev,
                            note: e.target.value,
                          }))
                        }
                        className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#09314F]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingClaim || !bankTransferData}
                      className="w-full py-3.5 bg-[#09314F] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 hover:bg-[#07243a] disabled:opacity-50"
                    >
                      {submittingClaim ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Submitting Claim...</span>
                        </>
                      ) : (
                        <>
                          <CheckIcon className="w-4 h-4 stroke-[2.5]" />
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

      {/* RIGHT COLUMN */}
      <div
        className="w-full h-[192px] md:w-1/2 md:h-full bg-cover bg-center relative order-1 md:order-2"
        style={{ backgroundImage: `url(${signup_img})` }}
      >
        <div className="hidden md:block absolute bottom-[60px] left-0">
          <button
            onClick={() => navigate("/login")}
            className="px-8 py-3 bg-white text-[#09314F] font-bold hover:bg-gray-100 transition-all shadow-md"
            style={{ borderRadius: "0px 20px 20px 0px" }}
          >
            Login
          </button>
        </div>
      </div>

      {/* PAYSTACK MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white w-[90%] max-w-md rounded-2xl p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold mb-4 text-[#09314F]">
              {gateway} Online Checkout
            </h2>

            <div className="text-2xl font-bold text-center mb-6 font-mono text-[#09314F]">
              ₦{totalAmount.toLocaleString()}
            </div>

            {gateway === "Paystack" && (
              <Paystack
                amount={totalAmount}
                email={payerEmail}
                reference={`TC-G-${Date.now()}`}
                metadata={paystackMetadata}
                onSuccess={handlePaystackSuccess}
                onClose={closeModal}
              />
            )}

            <button
              onClick={closeModal}
              disabled={processing}
              className="mt-4 w-full text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {processing && (
        <div className="fixed inset-0 bg-[#09314F]/80 backdrop-blur-sm z-[100] flex items-center justify-center transition-all duration-500">
          <div className="bg-white p-10 rounded-[32px] shadow-2xl flex flex-col items-center max-w-[400px] text-center mx-4 animate-in zoom-in-95 duration-300">
            <div className="relative mb-6">
              <div className="w-20 h-20 border-4 border-gray-100 border-t-[#E83831] rounded-full animate-spin"></div>
              <div className="absolute inset-x-0 inset-y-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-[#09314F] rounded-2xl flex items-center justify-center shadow-lg transform rotate-45 animate-pulse">
                  <div className="w-6 h-6 bg-white rounded-full -rotate-45"></div>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-black text-[#09314F] mb-3 uppercase tracking-tighter italic">
              Authenticating Payment
            </h2>
            <p className="text-gray-400 font-bold text-sm leading-relaxed">
              We are confirming your transaction and activating courses for your wards.
              <br />
              <span className="text-[#E83831] animate-pulse">
                Please do not refresh this page.
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
