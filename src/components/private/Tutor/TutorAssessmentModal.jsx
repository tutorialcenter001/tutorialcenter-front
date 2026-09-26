import React, { useState, useEffect } from "react";
import axios from "axios";
import MathRenderer from "../../common/MathRenderer.jsx";
import {
  XMarkIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  AcademicCapIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  PaperAirplaneIcon
} from "@heroicons/react/24/outline";

export default function TutorAssessmentModal({
  isOpen,
  onClose,
  assessment, // null for create mode, object for edit mode
  onSuccess
}) {
  const isEditMode = !!assessment;

  const [classesList, setClassesList] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Form State
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("MCQs are auto-marked. Essays are graded by your tutor.");
  const [passMark, setPassMark] = useState(50);
  const [dialHours, setDialHours] = useState(0);
  const [dialMinutes, setDialMinutes] = useState(30);
  const [dialSeconds, setDialSeconds] = useState(0);

  // Questions Array
  const [questions, setQuestions] = useState([
    {
      id: "temp-1",
      type: "mcq",
      question: "",
      marks: 2,
      explanation: "",
      options: [
        { option_text: "", is_correct: true },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false }
      ]
    }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";
  const token = localStorage.getItem("staff_token");

  // Load Tutor's assigned classes
  useEffect(() => {
    if (!isOpen) return;

    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/tutor/classes/schedule`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          }
        });

        const data = res.data || {};
        const classesMap = new Map();

        // Extract classes from today_classes, upcoming_sessions, week_schedule
        const allSessions = [
          ...(data.today_classes || []),
          ...(data.upcoming_sessions || []),
          ...(data.past_sessions || []),
          ...(data.week_schedule && typeof data.week_schedule === "object" ? Object.values(data.week_schedule).flat() : [])
        ];

        allSessions.forEach((s) => {
          if (s.class && s.class.id) {
            const subjectName = typeof s.class.subject === "object" ? s.class.subject?.name : s.class.subject;
            classesMap.set(String(s.class.id), {
              id: s.class.id,
              title: s.class.title || `${subjectName || "Masterclass"}`,
              subject_name: subjectName || "Subject"
            });
          }
        });

        // Also check direct classes if available
        if (Array.isArray(data.classes)) {
          data.classes.forEach((c) => {
            if (c.id) {
              const subName = typeof c.subject === "object" ? c.subject?.name : c.subject;
              classesMap.set(String(c.id), {
                id: c.id,
                title: c.title || `${subName || "Masterclass"}`,
                subject_name: subName || "Subject"
              });
            }
          });
        }

        const list = Array.from(classesMap.values());
        setClassesList(list);

        // Pre-select first class if not set
        setClassId((prev) => (!prev && list.length > 0 && !isEditMode ? String(list[0].id) : prev));
      } catch (err) {
        console.warn("Failed to load tutor classes:", err);
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [isOpen, API_BASE_URL, token, isEditMode]);

  // Populate data when editing an existing assessment
  useEffect(() => {
    let isMounted = true;
    if (assessment && isOpen) {
      setClassId(String(assessment.class_id || assessment.class?.id || ""));
      setTitle(assessment.title || "");
      setDescription(assessment.description || "");
      setInstructions(assessment.instructions || "MCQs are auto-marked. Essays are graded by your tutor.");
      setPassMark(assessment.pass_mark || 50);
      const mins = assessment.timer_minutes !== null && assessment.timer_minutes !== undefined ? assessment.timer_minutes : 30;
      setDialHours(Math.floor(mins / 60));
      setDialMinutes(mins % 60);
      setDialSeconds(0);

      // Fetch fresh assessment detail to ensure all questions & options are fully populated
      if (assessment.id) {
        axios
          .get(`${API_BASE_URL}/api/tutor/assessments/${assessment.id}`, {
            headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
          })
          .then((res) => {
            if (!isMounted) return;
            const fresh = res.data?.assessment;
            if (fresh && Array.isArray(fresh.questions) && fresh.questions.length > 0) {
              const mapped = fresh.questions.map((q, idx) => ({
                id: q.id || `q-${idx}`,
                type: q.type || "mcq",
                question: q.question || "",
                marks: q.marks || 1,
                explanation: q.explanation || "",
                options:
                  Array.isArray(q.options) && q.options.length > 0
                    ? q.options.map((opt) => ({
                        id: opt.id,
                        option_text: opt.option_text || "",
                        is_correct: !!opt.is_correct
                      }))
                    : [
                        { option_text: "", is_correct: true },
                        { option_text: "", is_correct: false }
                      ]
              }));
              setQuestions(mapped);
            }
          })
          .catch((err) => {
            console.warn("Could not fetch full assessment:", err);
          });
      }

      if (Array.isArray(assessment.questions) && assessment.questions.length > 0) {
        const mapped = assessment.questions.map((q, idx) => ({
          id: q.id || `q-${idx}`,
          type: q.type || "mcq",
          question: q.question || "",
          marks: q.marks || 1,
          explanation: q.explanation || "",
          options:
            Array.isArray(q.options) && q.options.length > 0
              ? q.options.map((opt) => ({
                  id: opt.id,
                  option_text: opt.option_text || "",
                  is_correct: !!opt.is_correct
                }))
              : [
                  { option_text: "", is_correct: true },
                  { option_text: "", is_correct: false }
                ]
        }));
        setQuestions(mapped);
      }
    } else if (!isEditMode && isOpen) {
      // Reset form for fresh create
      setTitle("");
      setDescription("");
      setInstructions("MCQs are auto-marked. Essays are graded by your tutor.");
      setPassMark(50);
      setDialHours(0);
      setDialMinutes(30);
      setDialSeconds(0);
      setQuestions([
        {
          id: "temp-1",
          type: "mcq",
          question: "",
          marks: 2,
          explanation: "",
          options: [
            { option_text: "", is_correct: true },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false },
            { option_text: "", is_correct: false }
          ]
        }
      ]);
    }

    return () => {
      isMounted = false;
    };
  }, [assessment, isOpen, isEditMode, API_BASE_URL, token]);

  if (!isOpen) return null;

  // --- QUESTION BUILDER HELPERS ---
  const handleAddQuestion = (type = "mcq") => {
    const newQ = {
      id: `new-${Date.now()}`,
      type: type,
      question: "",
      marks: type === "mcq" ? 2 : 5,
      explanation: "",
      options:
        type === "mcq"
          ? [
              { option_text: "", is_correct: true },
              { option_text: "", is_correct: false },
              { option_text: "", is_correct: false },
              { option_text: "", is_correct: false }
            ]
          : []
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (index) => {
    if (questions.length <= 1) {
      setError("An assessment must have at least 1 question.");
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const handleUpdateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const handleAddOption = (qIndex) => {
    const updated = [...questions];
    const opts = updated[qIndex].options || [];
    updated[qIndex].options = [...opts, { option_text: "", is_correct: false }];
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const opts = updated[qIndex].options || [];
    if (opts.length <= 2) {
      setError("An MCQ question must have at least 2 options.");
      return;
    }
    const removedWasCorrect = opts[optIndex].is_correct;
    const filtered = opts.filter((_, i) => i !== optIndex);
    // If the removed option was the correct one, make the first remaining option correct
    if (removedWasCorrect && filtered.length > 0) {
      filtered[0].is_correct = true;
    }
    updated[qIndex].options = filtered;
    setQuestions(updated);
  };

  const handleUpdateOption = (qIndex, optIndex, field, value) => {
    const updated = [...questions];
    const opts = [...(updated[qIndex].options || [])];
    opts[optIndex] = { ...opts[optIndex], [field]: value };
    updated[qIndex].options = opts;
    setQuestions(updated);
  };

  const handleSetCorrectOption = (qIndex, optIndex) => {
    const updated = [...questions];
    const opts = (updated[qIndex].options || []).map((opt, i) => ({
      ...opt,
      is_correct: i === optIndex
    }));
    updated[qIndex].options = opts;
    setQuestions(updated);
  };

  const handleMoveQuestion = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === questions.length - 1)) return;
    const updated = [...questions];
    const target = index + direction;
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setQuestions(updated);
  };

  // Compute total marks
  const totalMarks = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);

  // --- SUBMIT DRAFT / UPDATE / PUBLISH ---
  const handleSubmit = async (e, shouldPublish = false) => {
    if (e && e.preventDefault) e.preventDefault();
    setError(null);

    if (!classId) {
      setError("Please select a Masterclass for this assessment.");
      return;
    }
    if (!title.trim()) {
      setError("Please provide an assessment title.");
      return;
    }
    if (questions.length === 0) {
      setError("Please add at least one question.");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        setError(`Question #${i + 1} has empty question text.`);
        return;
      }
      if (!q.marks || parseFloat(q.marks) <= 0) {
        setError(`Question #${i + 1} must have valid marks greater than 0.`);
        return;
      }
      if (q.type === "mcq") {
        if (!q.options || q.options.length < 2) {
          setError(`Question #${i + 1} (MCQ) must have at least 2 options.`);
          return;
        }
        const hasEmpty = q.options.some((opt) => !opt.option_text.trim());
        if (hasEmpty) {
          setError(`Question #${i + 1} has one or more empty options.`);
          return;
        }
        const correctCount = q.options.filter((opt) => opt.is_correct).length;
        if (correctCount !== 1) {
          setError(`Question #${i + 1} must have exactly one correct option selected.`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const formattedQuestions = questions.map((q, idx) => {
        const item = {
          type: q.type === "theory" ? "essay" : q.type,
          question: q.question.trim(),
          marks: parseFloat(q.marks),
          order: idx,
          explanation: q.explanation ? q.explanation.trim() : null,
        };

        if (q.type === "mcq") {
          item.options = (q.options || []).map((opt) => ({
            option_text: opt.option_text.trim(),
            is_correct: !!opt.is_correct
          }));
        }

        return item;
      });

      const payload = {
        class_id: parseInt(classId),
        title: title.trim(),
        description: description ? description.trim() : null,
        instructions: instructions ? instructions.trim() : null,
        pass_mark: parseFloat(passMark) || 50,
        timer_minutes: (dialHours * 60) + dialMinutes > 0 ? (dialHours * 60) + dialMinutes : null,
        questions: formattedQuestions
      };

      let res;
      if (isEditMode) {
        res = await axios.put(
          `${API_BASE_URL}/api/tutor/assessments/${assessment.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json"
            }
          }
        );
      } else {
        res = await axios.post(`${API_BASE_URL}/api/tutor/assessments`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json"
          }
        });
      }

      const savedAssessment = res.data?.assessment;
      let finalAssessment = savedAssessment;

      if (shouldPublish && savedAssessment?.id) {
        // Immediate publish with default 3-day window
        const now = new Date();
        const due = new Date();
        due.setDate(due.getDate() + 3);
        due.setHours(23, 59, 0, 0);

        const formatToSql = (d) => d.toISOString().slice(0, 19).replace("T", " ");

        const pubRes = await axios.post(
          `${API_BASE_URL}/api/tutor/assessments/${savedAssessment.id}/publish`,
          {
            opens_at: formatToSql(now),
            due_at: formatToSql(due)
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json"
            }
          }
        );
        finalAssessment = pubRes.data?.assessment || savedAssessment;
      }

      if (onSuccess) {
        onSuccess(finalAssessment, shouldPublish);
      }
      onClose();
    } catch (err) {
      console.error("Save assessment error:", err);
      const firstBackendError =
        err.response?.data?.errors &&
        Object.values(err.response.data.errors).flat()[0];

      const msg =
        firstBackendError ||
        err.response?.data?.errors?.class_id?.[0] ||
        err.response?.data?.errors?.questions?.[0] ||
        err.response?.data?.message ||
        "Failed to save assessment. Please review question parameters and try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-4xl bg-white dark:bg-[#09314F] rounded-none sm:rounded-[36px] shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden my-auto flex flex-col">
        
        {/* TOP HEADER */}
        <div className="flex items-center justify-between p-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-white/10 bg-[#0F2843] text-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-[#C5A97A] flex-shrink-0">
              <AcademicCapIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">
                {isEditMode ? "Edit Assessment Draft" : "Create New Assessment"}
              </h2>
              <p className="text-xs text-gray-300 font-medium">
                {isEditMode ? "Modify questions and configurations before publishing" : "Build MCQs and written essay questions for your masterclass"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/10 text-xs font-bold text-[#C5A97A]">
              <SparklesIcon className="w-4 h-4" />
              <span>{questions.length} Questions</span>
              <span className="text-white/40">•</span>
              <span>{totalMarks} Total Marks</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* ERROR CALLOUT */}
        {error && (
          <div className="p-4 mx-6 mt-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 flex items-start gap-3 text-red-700 dark:text-red-300 text-xs flex-shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* SECTION 1: METADATA & CONFIGURATION */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-black text-[#0F2843] dark:text-[#C5A97A] uppercase tracking-wider">
              <DocumentTextIcon className="w-4 h-4" />
              <span>Assessment Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Class Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  Target Masterclass <span className="text-red-500">*</span>
                </label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                  disabled={isEditMode || loadingClasses}
                  className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition disabled:opacity-60"
                >
                  <option value="" disabled>
                    {loadingClasses ? "Loading classes..." : "Select Masterclass"}
                  </option>
                  {classesList.map((cls) => (
                    <option key={cls.id} value={cls.id} className="text-gray-900">
                      {cls.title} ({cls.subject_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Assessment Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  Assessment Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Physics - Work, Energy & Power Review"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition"
                />
              </div>
            </div>

            {/* Description & Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  Description / Topic Overview
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief note on topics tested..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1.5">
                  Instructions for Students
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. MCQs are auto-marked. Essays are graded by your tutor."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition resize-none"
                />
              </div>
            </div>

            {/* Pass Mark & Interactive Due Date Dial */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
              
              {/* Pass Mark */}
              <div className="lg:col-span-4 space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                  Pass Mark Standard (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={passMark}
                    onChange={(e) => setPassMark(e.target.value)}
                    required
                    className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition font-bold"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">
                    %
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Minimum percentage required for a passing grade.
                </p>
              </div>

              {/* Interactive Assessment Time Limit Dial (Hours / Minutes / Seconds) */}
              <div className="lg:col-span-8 p-4 rounded-3xl bg-gray-50/90 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-[#0F2843] dark:text-[#C5A97A] uppercase tracking-wider flex items-center gap-1.5">
                    <ClockIcon className="w-4 h-4" />
                    <span>Assessment Time Limit (Exam Duration)</span>
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">Test Timer</span>
                </div>

                {/* 3-Column Dial Controls */}
                <div className="flex items-center justify-center gap-3 sm:gap-6 py-2">
                  
                  {/* Hours Dial */}
                  <div className="flex flex-col items-center space-y-1">
                    <button
                      type="button"
                      onClick={() => setDialHours((prev) => Math.min(24, prev + 1))}
                      className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition"
                    >
                      <ChevronUpIcon className="w-4 h-4" />
                    </button>
                    <div className="w-16 sm:w-20 h-14 rounded-2xl bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-white/20 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-xl sm:text-2xl font-black text-[#0F2843] dark:text-white tracking-tight">
                        {String(dialHours).padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDialHours((prev) => Math.max(0, prev - 1))}
                      className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition"
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      HOURS
                    </span>
                  </div>

                  <span className="text-2xl font-black text-gray-300 dark:text-white/30 pb-5">:</span>

                  {/* Minutes Dial */}
                  <div className="flex flex-col items-center space-y-1">
                    <button
                      type="button"
                      onClick={() => setDialMinutes((prev) => (prev >= 59 ? 0 : prev + 1))}
                      className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition"
                    >
                      <ChevronUpIcon className="w-4 h-4" />
                    </button>
                    <div className="w-16 sm:w-20 h-14 rounded-2xl bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-white/20 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-xl sm:text-2xl font-black text-[#0F2843] dark:text-white tracking-tight">
                        {String(dialMinutes).padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDialMinutes((prev) => (prev <= 0 ? 59 : prev - 1))}
                      className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition"
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      MINUTES
                    </span>
                  </div>

                  <span className="text-2xl font-black text-gray-300 dark:text-white/30 pb-5">:</span>

                  {/* Seconds Dial */}
                  <div className="flex flex-col items-center space-y-1">
                    <button
                      type="button"
                      onClick={() => setDialSeconds((prev) => (prev >= 59 ? 0 : prev + 1))}
                      className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition"
                    >
                      <ChevronUpIcon className="w-4 h-4" />
                    </button>
                    <div className="w-16 sm:w-20 h-14 rounded-2xl bg-white dark:bg-black/40 border-2 border-gray-200 dark:border-white/20 flex flex-col items-center justify-center shadow-inner">
                      <span className="text-xl sm:text-2xl font-black text-[#0F2843] dark:text-white tracking-tight">
                        {String(dialSeconds).padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDialSeconds((prev) => (prev <= 0 ? 59 : prev - 1))}
                      className="p-1 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition"
                    >
                      <ChevronDownIcon className="w-4 h-4" />
                    </button>
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      SECONDS
                    </span>
                  </div>
                </div>

                {/* Bottom Duration Readout Display */}
                <div className="p-3.5 rounded-2xl bg-[#0F2843] text-white space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#C5A97A] font-bold">Total Time Allowed:</span>
                    <span className="font-black">
                      {dialHours > 0 ? `${dialHours} Hour${dialHours !== 1 ? "s" : ""}, ` : ""}
                      {dialMinutes} Min{dialMinutes !== 1 ? "s" : ""}
                      {dialSeconds > 0 ? `, ${dialSeconds} Sec` : ""}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-300 pt-1 border-t border-white/10">
                    <span className="text-gray-400">Student Timer:</span>
                    <span className="font-medium text-white">
                      {(dialHours * 60 + dialMinutes) > 0
                        ? `Students will have ${(dialHours > 0 ? `${dialHours}h ` : "") + `${dialMinutes}m`} to complete this test once started.`
                        : "No time limit (unlimited duration)."}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-white/10" />

          {/* SECTION 2: DYNAMIC QUESTION BUILDER */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#0F2843] dark:text-white flex items-center gap-2">
                  <QuestionMarkCircleIcon className="w-5 h-5 text-[#C5A97A]" />
                  <span>Questions Studio ({questions.length})</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-300">
                  Build auto-scored Multiple Choice questions or written Essay questions.
                </p>
              </div>

              {/* Add Question Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAddQuestion("mcq")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0F2843]/10 dark:bg-white/10 text-[#0F2843] dark:text-white hover:bg-[#0F2843] hover:text-white dark:hover:bg-[#C5A97A] dark:hover:text-[#0F2843] transition flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add MCQ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddQuestion("essay")}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#C5A97A]/20 text-[#0F2843] dark:text-[#C5A97A] hover:bg-[#C5A97A] hover:text-[#0F2843] transition flex items-center gap-1.5"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Essay</span>
                </button>
              </div>
            </div>

            {/* QUESTIONS LIST */}
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div
                  key={q.id || qIndex}
                  className="relative p-5 rounded-3xl bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 space-y-4 shadow-sm"
                >
                  {/* Top Bar of Question Card */}
                  <div className="flex items-center justify-between gap-2 border-b border-gray-200/60 dark:border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-xl bg-[#0F2843] dark:bg-[#C5A97A] text-white dark:text-[#0F2843] text-xs font-black flex items-center justify-center">
                        {qIndex + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg tracking-wider ${
                            q.type === "mcq"
                              ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                              : "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
                          }`}
                        >
                          {q.type === "mcq" ? "Multiple Choice" : "Written Essay"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Move Up/Down */}
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(qIndex, -1)}
                        disabled={qIndex === 0}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded-lg"
                      >
                        <ChevronUpIcon className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveQuestion(qIndex, 1)}
                        disabled={qIndex === questions.length - 1}
                        className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-30 rounded-lg"
                      >
                        <ChevronDownIcon className="w-4 h-4" />
                      </button>

                      {/* Delete Question */}
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIndex)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ml-1"
                        title="Delete Question"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Question Text & Marks */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="sm:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                        Question Prompt <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder={
                          q.type === "mcq"
                            ? "e.g. A vehicle travels with velocity \\(1.0 \\times 10^1 \\text{ m/s}\\). Find its speed."
                            : "e.g. State Newton's third law of motion and derive \\(F = ma\\)."
                        }
                        value={q.question}
                        onChange={(e) => handleUpdateQuestion(qIndex, "question", e.target.value)}
                        required
                        className="w-full px-4 py-2.5 text-sm bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition"
                      />

                      {/* Live LaTeX Math Preview for Question */}
                      {q.question && (
                        <div className="mt-2 p-2.5 rounded-xl bg-blue-50/60 dark:bg-white/5 border border-blue-100 dark:border-white/10 text-xs text-gray-800 dark:text-gray-200 flex items-start gap-2">
                          <span className="font-bold text-blue-600 dark:text-[#C5A97A] text-[10px] uppercase tracking-wider mt-0.5">
                            Live Math Preview:
                          </span>
                          <div className="flex-1 font-medium">
                            <MathRenderer text={q.question} />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-1">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-200 mb-1">
                        Marks <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={q.marks}
                        onChange={(e) => handleUpdateQuestion(qIndex, "marks", e.target.value)}
                        required
                        className="w-full px-4 py-2.5 text-sm bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition font-black"
                      />
                    </div>
                  </div>

                  {/* MCQ OPTIONS BUILDER */}
                  {q.type === "mcq" && (
                    <div className="space-y-3 pt-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center justify-between">
                        <span>{"Answer Choices (Supports LaTeX e.g. \\(1.0 \\times 10^1 \\text{ m/s}\\)):"}</span>
                        <span className="text-[11px] text-gray-400 font-normal">Min 2 options</span>
                      </label>

                      <div className="space-y-2.5">
                        {q.options.map((opt, optIndex) => (
                          <div
                            key={optIndex}
                            className={`flex flex-col gap-2 p-3 rounded-2xl border transition ${
                              opt.is_correct
                                ? "bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-500/60 ring-2 ring-emerald-500/20 shadow-sm"
                                : "bg-white dark:bg-black/20 border-gray-200 dark:border-white/10"
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                              <div className="flex items-center gap-2 flex-1">
                                {/* Option Letter Tag */}
                                <span
                                  className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center flex-shrink-0 transition ${
                                    opt.is_correct
                                      ? "bg-emerald-600 text-white"
                                      : "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300"
                                  }`}
                                >
                                  {String.fromCharCode(65 + optIndex)}
                                </span>

                                {/* Option Text Input */}
                                <input
                                  type="text"
                                  placeholder={`e.g. \\(1.0 \\times 10^1 \\text{ m/s}\\)`}
                                  value={opt.option_text}
                                  onChange={(e) =>
                                    handleUpdateOption(qIndex, optIndex, "option_text", e.target.value)
                                  }
                                  required
                                  className="flex-1 px-3 py-2 text-sm bg-transparent text-gray-900 dark:text-white outline-none border-b border-transparent focus:border-gray-300"
                                />
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2 pl-10 sm:pl-0 flex-shrink-0">
                                {/* Explicit "Mark as Correct" / "Correct Answer" Button */}
                                {opt.is_correct ? (
                                  <button
                                    type="button"
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-emerald-600 text-white shadow-md shadow-emerald-600/30 flex items-center gap-1.5 flex-shrink-0 cursor-default"
                                  >
                                    <CheckIcon className="w-4 h-4 stroke-[3]" />
                                    <span>✓ Correct Answer</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSetCorrectOption(qIndex, optIndex)}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-400 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 transition flex items-center gap-1.5 flex-shrink-0"
                                    title="Click to set as the single correct option"
                                  >
                                    <span>Mark as Correct</span>
                                  </button>
                                )}

                                {/* Remove Option Button */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOption(qIndex, optIndex)}
                                  disabled={q.options.length <= 2}
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-20 rounded-xl transition flex-shrink-0"
                                  title="Remove choice"
                                >
                                  <XMarkIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Live Option Math Preview */}
                            {opt.option_text && (
                              <div className="pl-10 text-xs text-gray-700 dark:text-gray-300 flex items-center gap-2 pt-1 border-t border-gray-200/40 dark:border-white/5">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                                  Option {String.fromCharCode(65 + optIndex)} Render:
                                </span>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  <MathRenderer text={opt.option_text} />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Add Option Button */}
                      <button
                        type="button"
                        onClick={() => handleAddOption(qIndex)}
                        className="text-xs font-bold text-[#0F2843] dark:text-[#C5A97A] hover:underline flex items-center gap-1 pt-1"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        <span>Add Another Choice</span>
                      </button>
                    </div>
                  )}

                  {/* ESSAY MODEL ANSWER / EXPLANATION */}
                  {q.type === "essay" && (
                    <div className="space-y-1.5 pt-2">
                      <label className="block text-xs font-bold text-gray-600 dark:text-gray-300">
                        Model Answer / Grading Criteria (For Tutor Reference when grading):
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Key points required for full marks (e.g. Must mention energy conservation, 1 mark per valid example)..."
                        value={q.explanation}
                        onChange={(e) => handleUpdateQuestion(qIndex, "explanation", e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-[#0F2843] dark:focus:ring-[#C5A97A] outline-none transition resize-none"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM ACTIONS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-100 dark:border-white/10 flex-shrink-0">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-300">
              {assessment?.status === "published"
                ? "This assessment is published and actively accessible to enrolled students."
                : "You can save as draft or publish immediately to make it live for enrolled students right away."}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-2xl transition"
              >
                Cancel
              </button>

              {assessment?.status === "published" ? (
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, false)}
                  disabled={loading}
                  className="px-8 py-3 text-xs font-black text-white bg-[#0F2843] hover:bg-[#163a5f] dark:bg-[#C5A97A] dark:hover:bg-[#d6bc8f] dark:text-[#0F2843] rounded-2xl shadow-xl shadow-[#0F2843]/20 transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-4 h-4" />
                      <span>Update Published Assessment</span>
                    </>
                  )}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, false)}
                    disabled={loading}
                    className="px-5 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 rounded-2xl transition flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="w-4 h-4 text-amber-500" />
                    <span>Save as Draft</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={loading}
                    className="px-7 py-3 text-xs font-black text-white bg-[#0F2843] hover:bg-[#163a5f] dark:bg-[#C5A97A] dark:hover:bg-[#d6bc8f] dark:text-[#0F2843] rounded-2xl shadow-xl shadow-[#0F2843]/20 transition flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        <span>Publishing to Students...</span>
                      </>
                    ) : (
                      <>
                        <PaperAirplaneIcon className="w-4 h-4" />
                        <span>Save & Publish to Students</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
