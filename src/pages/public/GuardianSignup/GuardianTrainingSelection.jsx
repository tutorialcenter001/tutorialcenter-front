import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import signup_img from "../../../assets/images/Student_sign_up.webp";
import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import axios from "axios";

export default function GuardianTrainingSelection() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [toast, setToast] = useState(null);

  // Each student gets their own selectedTraining array + expanded state
  const [students, setStudents] = useState([]);

  const API_BASE_URL =
    process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";

  /* ================= LOAD STUDENTS FROM LOCALSTORAGE ================= */
  useEffect(() => {
    const stored = localStorage.getItem("guardianStudentsBiodata");
    if (stored) {
      const parsed = JSON.parse(stored);
      const studentsWithTraining = parsed.map((student, index) => ({
        ...student,
        selectedTraining: [],
        expanded: index === 0,
        error: false,
      }));
      setStudents(studentsWithTraining);
    } else {
      navigate("/register/guardian/student/registration");
    }
  }, [navigate]);

  /* ================= FETCH COURSES ================= */
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/courses`);
        setCourses(response?.data?.courses || []);
      } catch (error) {
        console.error("Failed to fetch courses", error);
      }
    };

    fetchCourses();
  }, [API_BASE_URL]);

  /* ================= TOGGLE ACCORDION ================= */
  const toggleStudent = (index) => {
    setStudents((prev) =>
      prev.map((s, i) => (i === index ? { ...s, expanded: !s.expanded } : s))
    );
  };

  /* ================= O-LEVEL IDENTIFIER ================= */
  const isOlevelCourse = (cId) => {
    const course = courses.find((c) => Number(c.id) === Number(cId));
    const title = (course?.title || course?.slug || "").toLowerCase();
    return (
      title.includes("waec") ||
      title.includes("neco") ||
      title.includes("gce") ||
      [2, 3, 4].includes(Number(cId))
    );
  };

  /* ================= TOGGLE TRAINING SELECTION (MUTUAL EXCLUSION FOR O-LEVELS) ================= */
  const toggleTraining = (studentIndex, courseId) => {
    setStudents((prev) =>
      prev.map((s, i) => {
        if (i !== studentIndex) return s;
        const already = s.selectedTraining.includes(courseId);

        if (already) {
          return {
            ...s,
            selectedTraining: s.selectedTraining.filter((id) => id !== courseId),
            error: false,
          };
        }

        // If selecting an O-Level exam (WAEC, NECO, GCE), deactivate any other O-Level exam
        if (isOlevelCourse(courseId)) {
          const withoutOtherOlevels = s.selectedTraining.filter(
            (id) => !isOlevelCourse(id)
          );
          return {
            ...s,
            selectedTraining: [...withoutOtherOlevels, courseId],
            error: false,
          };
        }

        // Tertiary exams like JAMB can be toggled independently alongside an O-Level
        return {
          ...s,
          selectedTraining: [...s.selectedTraining, courseId],
          error: false,
        };
      })
    );
  };

  /* ================= CONTINUE ================= */
  const handleContinue = () => {
    // Validate: each student must have at least one training selected
    let hasError = false;
    const updated = students.map((s) => {
      if (s.selectedTraining.length === 0) {
        hasError = true;
        return { ...s, error: true, expanded: true };
      }
      return { ...s, error: false };
    });
    setStudents(updated);

    if (hasError) {
      setToast({
        type: "error",
        message: "Each student must have at least one training selected",
      });
      return;
    }

    setLoading(true);

    // Save training selections to localStorage
    const payload = students.map((s) => ({
      id: s.id, // Preserve ID from backend
      name: s.name,
      email: s.email,
      firstname: s.firstname,
      surname: s.surname,
      gender: s.gender,
      date_of_birth: s.date_of_birth,
      location: s.location,
      address: s.address,
      department: s.department,
      selectedTraining: s.selectedTraining,
    }));

    localStorage.setItem("guardianStudentsTraining", JSON.stringify(payload));

    setToast({ type: "success", message: "Training selections saved!" });

    setTimeout(() => {
      setLoading(false);
      navigate("/register/guardian/subject/selection");
    }, 1500);
  };

  return (
    <div className="w-full min-h-screen md:h-screen flex flex-col md:flex-row bg-[#F4F4F4] font-sans overflow-x-hidden">
      {/* IMAGE SECTION */}
      <div className="w-full h-[250px] md:w-1/2 md:h-full relative order-1 md:order-2">
        <div
          className="w-full h-full bg-cover bg-center"
          style={{ backgroundImage: `url(${signup_img})` }}
        />
        {/* Login Button */}
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

      {/* FORM SECTION */}
      <div className="w-full md:w-1/2 h-full flex flex-col px-6 py-10 lg:px-[100px] lg:py-[60px] order-2 md:order-1 overflow-y-auto">
        <div className="w-full max-w-[500px] mx-auto my-auto flex flex-col">
          {/* Toast */}
          {toast && (
            <div
              className={`fixed top-5 right-5 z-50 px-4 py-3 rounded shadow-lg text-white transition-all duration-300 ${
                toast.type === "success" ? "bg-green-600" : "bg-red-600"
              }`}
            >
              {toast.message}
            </div>
          )}

          {/* HEADER */}
          <div className="relative w-full flex items-center justify-center mb-6 mt-4">
            <button
              onClick={() => navigate("/register/guardian/student/otp-verification")}
              className="absolute left-0 p-3 bg-white hover:bg-gray-50 rounded-2xl shadow-sm transition-all active:scale-90 z-10"
            >
              <ChevronLeftIcon className="h-5 w-5 text-[#09314F] stroke-[2.5]" />
            </button>
            <h1 className="text-2xl md:text-3xl font-bold text-[#09314F]">
              Select Training
            </h1>
          </div>

          <p className="text-gray-500 text-xs md:text-sm mb-6 text-center">
            Select the examinations each student is preparing for. Students may
            select one O&apos;Level exam (WAEC, NECO, or GCE) and/or JAMB.
          </p>

          {/* PER-STUDENT ACCORDION */}
          <div className="space-y-3 mb-6">
            {students.map((student, index) => (
              <div
                key={index}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                  student.error ? "border-red-400" : "border-gray-100"
                }`}
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleStudent(index)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#09314F] uppercase tracking-wide">
                      Student {index + 1}
                    </span>
                    <span className="text-xs text-gray-400">
                      — {student.firstname} {student.surname}
                    </span>
                    {student.selectedTraining.length > 0 && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                        {student.selectedTraining.length} selected
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 text-[#09314F] transition-transform duration-200 ${
                      student.expanded ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Accordion Body — Course Grid */}
                {student.expanded && (
                  <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                    <div className="grid grid-cols-2 gap-3">
                      {courses.map((exam) => {
                        const isSelected = student.selectedTraining.includes(
                          exam.id
                        );

                        return (
                          <button
                            key={exam.id}
                            type="button"
                            onClick={() => toggleTraining(index, exam.id)}
                            className={`h-[50px] rounded-lg font-bold flex items-center justify-between px-4 transition-all duration-300 ${
                              isSelected
                                ? "bg-[#76D287] text-white shadow-md shadow-green-100"
                                : "bg-[#D1D5DB] text-[#4B5563] hover:bg-gray-400"
                            }`}
                          >
                            <span className="text-sm uppercase tracking-wide">
                              {exam.title}
                            </span>
                            {isSelected && <span>✓</span>}
                          </button>
                        );
                      })}
                    </div>

                    {student.error && (
                      <p className="text-red-500 text-xs font-bold mt-3">
                        Select at least one examination for this student
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* CONTINUE BUTTON */}
          <button
            onClick={handleContinue}
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-medium ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-[#09314F] to-[#E83831] hover:opacity-90"
            } text-white transition-colors`}
          >
            {loading ? "Loading..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
