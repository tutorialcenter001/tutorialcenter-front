import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "../../../context/AuthContext";
import { 
  XMarkIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  CheckCircleIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

export default function VerificationModal() {
  const { 
    isVerificationModalOpen, 
    verificationType, 
    closeVerificationModal, 
    student, 
    updateStudent 
  } = useAuth();

  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  const [otp, setOtp] = useState({
    num1: "", num2: "", num3: "", num4: "", num5: "", num6: ""
  });

  const inputRefs = {
    num1: useRef(null), num2: useRef(null), num3: useRef(null),
    num4: useRef(null), num5: useRef(null), num6: useRef(null)
  };

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";

  const sendVerificationCode = async () => {
    setSendingCode(true);
    setError(null);
    try {
      const endpoint = verificationType === "email" 
        ? "/api/students/resend-email-verification"
        : "/api/students/resend-phone-otp";
      
      const payload = verificationType === "email" 
        ? { email: student?.email }
        : { tel: student?.tel };

      await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      setResendCooldown(60);
    } catch (err) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || "Failed to send verification code.";
      setError(errMsg);
    } finally {
      setSendingCode(false);
    }
  };

  // Focus first input and automatically send OTP on open
  useEffect(() => {
    if (isVerificationModalOpen && !success) {
      setTimeout(() => inputRefs.num1.current?.focus(), 100);
      setOtp({ num1: "", num2: "", num3: "", num4: "", num5: "", num6: "" });
      setError(null);
      setSuccess(false);

      // Auto-trigger OTP send when opening modal if not on cooldown
      if (student && (verificationType === "phone" ? student.tel : student.email)) {
        if (resendCooldown === 0) {
          sendVerificationCode();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVerificationModalOpen, verificationType]);

  // Handle Cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  const handleChange = (e, name) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length > 1) return;

    setOtp(prev => ({ ...prev, [name]: value }));

    if (value && name !== "num6") {
      const nextField = `num${parseInt(name.replace("num", "")) + 1}`;
      inputRefs[nextField].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pastedData) return;

    const digits = pastedData.slice(0, 6).split("");
    const newOtp = { ...otp };
    
    digits.forEach((digit, index) => {
      newOtp[`num${index + 1}`] = digit;
    });

    setOtp(newOtp);

    // Focus last filled/next input
    const nextIndex = Math.min(digits.length, 6);
    if (nextIndex > 0) {
      inputRefs[`num${nextIndex}`].current?.focus();
    }
  };

  const handleKeyDown = (e, name) => {
    if (e.key === "Backspace" && !otp[name] && name !== "num1") {
      const prevField = `num${parseInt(name.replace("num", "")) - 1}`;
      inputRefs[prevField].current?.focus();
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0 || sendingCode) return;
    sendVerificationCode();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullOtp = Object.values(otp).join("");
    if (fullOtp.length < 6) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = verificationType === "email"
        ? "/api/students/verify-email"
        : "/api/students/verify-phone";
      
      const payload = verificationType === "email"
        ? { email: student.email, token: fullOtp }
        : { tel: student.tel, otp: fullOtp };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      
      if (response.status === 200) {
        setSuccess(true);
        // Manually update the verification status in the global state
        const updateField = verificationType === "email" ? "email_verified_at" : "tel_verified_at";
        updateStudent({ [updateField]: new Date().toISOString() });
        
        setTimeout(() => {
          closeVerificationModal();
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  if (!isVerificationModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeVerificationModal}
      />

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-[#09314F] w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden border border-white/20 dark:border-[#BB9E7F]/20 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-0 flex justify-between items-start">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            {verificationType === "email" ? (
              <EnvelopeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            ) : (
              <PhoneIcon className="w-6 h-6 text-[#BB9E7F]" />
            )}
          </div>
          <button 
            onClick={closeVerificationModal}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="p-8 text-center">
          {success ? (
            <div className="py-6 animate-in fade-in slide-in-from-bottom-4">
              <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-[#09314F] dark:text-white uppercase">Verified!</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold mt-2">
                Your {verificationType} has been successfully verified.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-black text-[#09314F] dark:text-white uppercase tracking-tighter mb-2">
                Verify your {verificationType}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-8">
                {sendingCode ? (
                  <span className="text-blue-500 animate-pulse font-bold">Sending verification code to...</span>
                ) : (
                  <>We've sent a 6-digit code to</>
                )} <br/>
                <span className="text-[#09314F] dark:text-blue-300">
                  {verificationType === "email" ? student?.email : student?.tel}
                </span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex justify-between gap-2 max-w-[320px] mx-auto">
                  {["num1", "num2", "num3", "num4", "num5", "num6"].map((name) => (
                    <input
                      key={name}
                      ref={inputRefs[name]}
                      type="text"
                      maxLength="1"
                      value={otp[name]}
                      onChange={(e) => handleChange(e, name)}
                      onKeyDown={(e) => handleKeyDown(e, name)}
                      onPaste={handlePaste}
                      className="w-full h-12 md:h-14 text-xl font-black text-center rounded-xl border-2 transition-all outline-none bg-gray-50 dark:bg-[#09314F]/50 border-transparent focus:border-[#BB9E7F] dark:text-white"
                      placeholder="-"
                    />
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2 justify-center text-red-500 text-xs font-bold animate-pulse">
                    <ExclamationCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    type="submit"
                    disabled={loading || sendingCode || Object.values(otp).join("").length < 6}
                    className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all active:scale-[0.98] ${
                      loading || sendingCode || Object.values(otp).join("").length < 6
                        ? "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
                        : "bg-gradient-to-r from-[#09314F] to-[#BB9E7F] hover:shadow-[#BB9E7F44]"
                    }`}
                  >
                    {loading ? "Verifying..." : "Confirm Verification"}
                  </button>

                  <div className="text-xs font-bold text-gray-400">
                    Didn't get the code?{" "}
                    {resendCooldown > 0 ? (
                      <span className="text-[#BB9E7F] font-black">{resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResend}
                        className="text-[#09314F] dark:text-blue-400 hover:underline disabled:opacity-50"
                        disabled={loading || sendingCode}
                      >
                        {sendingCode ? "Sending..." : "Resend Code"}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
