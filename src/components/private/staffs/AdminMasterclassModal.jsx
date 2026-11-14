import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import axios from "axios";
import {
  BookOpenIcon,
  CalendarIcon,
  ClockIcon,
  // ChevronDownIcon,
  // GlobeAltIcon,
  UserGroupIcon,
  LinkIcon,
  UserCircleIcon,
  ChatBubbleBottomCenterTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { Icon } from "@iconify/react";

const O_LEVELS_COURSE = {
  id: "o-levels",
  title: "O-LEVELS",
  name: "O-LEVELS",
  subtitle: "WAEC, NECO & GCE",
  is_o_levels: true,
};

export default function CreateMasterClassModal({ onClose, onSuccess, editClass = null }) {
  /* =============================
     CONSTANTS
  ============================= */

  const API_BASE_URL =
    process.env.REACT_APP_API_URL || "http://tutorialcenter-back.test" || "http://localhost:8000";

  const token = localStorage.getItem("staff_token");

  const weekDays = [
    { label: "Su", value: "sunday" },
    { label: "Mo", value: "monday" },
    { label: "Tu", value: "tuesday" },
    { label: "We", value: "wednesday" },
    { label: "Th", value: "thursday" },
    { label: "Fr", value: "friday" },
    { label: "Sa", value: "saturday" },
  ];

  /* =============================
     STATE
  ============================= */

  const [loading, setLoading] = useState(false);

  const [courses, setCourses] = useState([O_LEVELS_COURSE]);
  const [subjects, setSubjects] = useState([]);

  const [tutors, setTutors] = useState([]);
  const [assistants, setAssistants] = useState([]);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [courseSearch, setCourseSearch] = useState("");
  const [subjectSearch, setSubjectSearch] = useState("");
  const [courseFocused, setCourseFocused] = useState(false);
  const [subjectFocused, setSubjectFocused] = useState(false);
  const [tutorSearch, setTutorSearch] = useState("");
  const [assistantSearch, setAssistantSearch] = useState("");

  const [selectedTutors, setSelectedTutors] = useState([]);
  const [selectedAssistants, setSelectedAssistants] = useState([]);
  const startDateRef = useRef(null);
  const endDateRef = useRef(null);
  const dateContainerRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);

  const [formData, setFormData] = useState({
    course_id: "",
    subject_id: "",
    title: "",
    start_date: "",
    end_date: "",
    tutor_ids: [],
    assistant_ids: [],
    link: "",
    status: "active",
    description: "",
  });

    // --- PRIVATE CLASS STATE ---
  const [isPrivate, setIsPrivate] = useState(Boolean(editClass?.is_private));
  const [studentsList, setStudentsList] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(editClass?.private_student || null);
  const [studentSearch, setStudentSearch] = useState(
    editClass?.private_student
      ? `${editClass.private_student.firstname || ""} ${editClass.private_student.surname || ""}`.trim()
      : ""
  );
  const [studentFocused, setStudentFocused] = useState(false);
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const fetchStudents = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/students/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data?.students || res.data?.data || [];
      setStudentsList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch students for private class:", err);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    if (isPrivate && studentsList.length === 0) {
      fetchStudents();
    }
  }, [isPrivate, studentsList.length, fetchStudents]);

  const [daySchedules, setDaySchedules] = useState([
    { day: "monday", start_time: "17:00", end_time: "19:00" },
  ]);

  /* =============================
     API CALLS
  ============================= */

  const fetchCourses = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/courses`);
      console.log("Fetched Courses Response:", res.data);
      const fetched = res.data?.courses || res.data?.data || [];
      const nonOlevels = fetched.filter(
        (c) => c.id !== "o-levels" && (c.title || "").toUpperCase() !== "O-LEVELS"
      );
      setCourses([O_LEVELS_COURSE, ...nonOlevels]);
    } catch (error) {
      console.error("Failed to fetch courses", error);
      setCourses([O_LEVELS_COURSE]);
    }
  }, [API_BASE_URL]);

  const fetchSubjects = useCallback(async (courseId) => {
    try {
      if (courseId === "o-levels") {
        const targetIds = [2, 3, 4];
        const promises = targetIds.map((cid) =>
          axios
            .get(`${API_BASE_URL}/api/courses/${cid}/subjects`)
            .then((res) => res.data?.subjects || res.data?.data || [])
            .catch(() => [])
        );
        const responses = await Promise.all(promises);
        const combined = responses.flat();

        const uniqueMap = new Map();
        combined.forEach((sub) => {
          if (!sub || !sub.name) return;
          const norm = sub.name.trim().toLowerCase();
          if (!uniqueMap.has(norm)) {
            uniqueMap.set(norm, {
              ...sub,
              id: sub.id,
              name: sub.name.trim(),
              all_subject_ids: [sub.id],
            });
          } else {
            const existing = uniqueMap.get(norm);
            if (!existing.all_subject_ids.includes(sub.id)) {
              existing.all_subject_ids.push(sub.id);
            }
          }
        });

        const deduplicated = Array.from(uniqueMap.values());
        setSubjects(deduplicated);
        return;
      }

      const res = await axios.get(
        `${API_BASE_URL}/api/courses/${courseId}/subjects`,
      );
      console.log(`Fetched Subjects Response for course ${courseId}:`, res.data);
      const fetched = res.data?.subjects || res.data?.data || [];
      setSubjects(fetched);
      console.log(
        `Fetched ${fetched.length} subjects for course ID ${courseId}`,
      );
    } catch (error) {
      console.error("Failed to fetch subjects", error);
      setSubjects([]);
    }
  }, [API_BASE_URL]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/staffs/all?active_only=1&exclude_suspended=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const fetched = res.data?.staffs || res.data?.data || [];
      const isStaffActive = (s) => {
        if (!s) return false;
        if (s.deleted_at) return false;
        if (s.is_suspended === true || s.is_suspended === 1 || s.is_suspended === "1") return false;
        const status = String(s.status || s.account_status || s.staff?.status || "active").toLowerCase().trim();
        if (status === "suspended" || status === "inactive" || status === "disabled" || status === "banned") return false;
        return true;
      };

      setTutors(fetched.filter((s) => s.role === "tutor" && isStaffActive(s)));
      setAssistants(fetched.filter((s) => s.role === "advisor" && isStaffActive(s)));
    } catch (error) {
      console.error("Failed to fetch staff", error);
    }
  }, [API_BASE_URL, token]);

  /* =============================
     EFFECTS
  ============================= */

  useEffect(() => {
    fetchCourses();
    fetchStaff();

    const handleClickOutside = (event) => {
      if (dateContainerRef.current && !dateContainerRef.current.contains(event.target)) {
        startDateRef.current?.blur();
        endDateRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [fetchCourses, fetchStaff]);

  useEffect(() => {
    if (formData.course_id) {
      fetchSubjects(formData.course_id);
    } else {
      setSubjects([]);
    }
  }, [formData.course_id, fetchSubjects]);

  // Sync title whenever course or subject changes (only for new classes)
  useEffect(() => {
    if (!editClass && selectedCourse && selectedSubject) {
      const coursePrefix = selectedCourse.is_o_levels ? "O-Levels" : (selectedCourse.title || selectedCourse.name);
      const generatedTitle = `${coursePrefix} - ${selectedSubject.name}`;
      setFormData((prev) => ({
        ...prev,
        title: generatedTitle,
      }));
    }
  }, [editClass, selectedCourse, selectedSubject]);

  const extractStaffNumericId = (s) => {
    if (!s) return null;
    if (typeof s === "number") return s;
    if (typeof s === "string" && !isNaN(Number(s))) return Number(s);
    if (s.id && !isNaN(Number(s.id))) return Number(s.id);
    if (s.staff && s.staff.id && !isNaN(Number(s.staff.id))) return Number(s.staff.id);
    if (s.pivot && s.pivot.staff_id && !isNaN(Number(s.pivot.staff_id))) return Number(s.pivot.staff_id);
    return null;
  };

  // Pre-fill existing data when editing a Master Class
  useEffect(() => {
    if (editClass) {
      const startD = editClass.start_date 
        ? editClass.start_date.substring(0, 10) 
        : (editClass.schedules?.[0]?.start_date ? editClass.schedules[0].start_date.substring(0, 10) : "");
      const endD = editClass.end_date 
        ? editClass.end_date.substring(0, 10) 
        : (editClass.schedules?.[0]?.end_date ? editClass.schedules[0].end_date.substring(0, 10) : "");
      
      const subjectObj = editClass.subject;

      // 1. Resolve Course: from title prefix (e.g. "O-Levels - ..."), subject.courses, or editClass.course
      let courseObj = null;
      const lowerTitle = (editClass.title || "").toLowerCase().trim();
      if (lowerTitle.startsWith("o-levels") || lowerTitle.startsWith("o-level")) {
        courseObj = O_LEVELS_COURSE;
      } else {
        courseObj = subjectObj?.courses?.[0] || editClass.course || null;
        if (!courseObj && courses.length > 0) {
          if (editClass.course_id) {
            courseObj = courses.find(c => c.id === editClass.course_id);
          }
          if (!courseObj && editClass.title && editClass.title.includes(" - ")) {
            const prefix = editClass.title.split(" - ")[0].trim().toLowerCase();
            courseObj = courses.find(c => 
              (c.title || "").toLowerCase() === prefix || 
              (c.name || "").toLowerCase() === prefix
            );
          }
        }
      }

      const resolvedCourseId = courseObj?.id || editClass.course_id || "";
      if (courseObj) {
        setSelectedCourse(courseObj);
        setCourseSearch(courseObj.title || courseObj.name || "");
      } else if (editClass.title && editClass.title.includes(" - ")) {
        setCourseSearch(editClass.title.split(" - ")[0].trim());
      }

      // 2. Resolve Subject
      const resolvedSubjectId = editClass.subject_id || subjectObj?.id || "";
      if (subjectObj) {
        setSelectedSubject(subjectObj);
        setSubjectSearch(subjectObj.name || "");
      }

      // 3. Resolve Tutors & Assistants (extract real numeric IDs)
      const isAssistant = (s) => {
        const role = (s.pivot?.role || s.role || "").toLowerCase();
        return role === "assistant" || role === "advisor";
      };

      const tutorsRaw = (editClass.staffs || []).filter(s => !isAssistant(s));
      const assistantsRaw = (editClass.staffs || []).filter(s => isAssistant(s));

      const tutorNumericIds = tutorsRaw.map(extractStaffNumericId).filter(Boolean);
      const assistantNumericIds = assistantsRaw.map(extractStaffNumericId).filter(Boolean);

      const tutorsList = tutorsRaw.map(s => {
        const id = extractStaffNumericId(s);
        const firstname = s.firstname || s.staff?.firstname || "";
        const surname = s.surname || s.staff?.surname || "";
        const name = (firstname && surname) ? `${firstname} ${surname}` : (s.name || s.staff?.name || "Assigned Tutor");
        return { ...s, id, name, firstname, surname };
      });

      const assistantsList = assistantsRaw.map(s => {
        const id = extractStaffNumericId(s);
        const firstname = s.firstname || s.staff?.firstname || "";
        const surname = s.surname || s.staff?.surname || "";
        const name = (firstname && surname) ? `${firstname} ${surname}` : (s.name || s.staff?.name || "Assigned Advisor");
        return { ...s, id, name, firstname, surname };
      });

      setSelectedTutors(tutorsList);
      setSelectedAssistants(assistantsList);

      setFormData({
        course_id: resolvedCourseId,
        subject_id: resolvedSubjectId,
        title: editClass.title || "",
        start_date: startD,
        end_date: endD,
        tutor_ids: tutorNumericIds,
        assistant_ids: assistantNumericIds,
        link: editClass.class_link || editClass.zoom_join_url || "",
        status: editClass.status === "rescheduled" ? "proposed" : (editClass.status || "active"),
        description: editClass.description || "",
      });

      if (resolvedCourseId) {
        fetchSubjects(resolvedCourseId);
      }

      if (editClass.schedules && editClass.schedules.length > 0) {
        setDaySchedules(editClass.schedules.map(s => ({
          day: s.day_of_week,
          start_time: s.start_time ? s.start_time.substring(0, 5) : "17:00",
          end_time: s.end_time ? s.end_time.substring(0, 5) : "19:00"
        })));
      }

      const isPriv = Boolean(editClass.is_private);
      setIsPrivate(isPriv);
      const privStudent = editClass.private_student || editClass.privateStudent || null;
      if (privStudent) {
        setSelectedStudent(privStudent);
        setStudentSearch(`${privStudent.firstname || ""} ${privStudent.surname || ""}`.trim());
      } else {
        setSelectedStudent(null);
        setStudentSearch("");
      }

      if (isPriv) {
        const privEnroll = editClass.private_enrollment || editClass.privateEnrollment || null;
        const pMethod = privEnroll?.payment_method || (Number(privEnroll?.amount_paid) === 0 ? "free_grant" : "bank_transfer");
        setPaymentMethod(pMethod);
        if (pMethod === "free_grant" || Number(privEnroll?.amount_paid) === 0) {
          setAmountPaid("Free");
        } else if (privEnroll?.amount_paid) {
          setAmountPaid(String(privEnroll.amount_paid));
        }
      }
    }
  }, [editClass, courses, fetchSubjects]);

  /* =============================
     INPUT HANDLERS
  ============================= */

  const handleCourseSearchChange = (e) => {
    const value = e.target.value;
    setCourseSearch(value);
    
    // If they modify the search, clear current selection
    if (selectedCourse) {
      setSelectedCourse(null);
      setSubjects([]);
      setFormData((prev) => ({
        ...prev,
        course_id: "",
        subject_id: "",
      }));
      setSubjectSearch("");
      setSelectedSubject(null);
    }
  };

  const handleSubjectSearchChange = (e) => {
    const value = e.target.value;
    setSubjectSearch(value);
    
    if (selectedSubject) {
      setSelectedSubject(null);
      setFormData((prev) => ({
        ...prev,
        subject_id: "",
      }));
    }
  };

  const handleStaffChange = (e, field) => {
    const value = e.target.value;

    if (field === "tutor_ids") setTutorSearch(value);
    else setAssistantSearch(value);

    const staffList = field === "tutor_ids" ? tutors : assistants;

    const staff = staffList.find(
      (s) => `${s.firstname} ${s.surname}` === value || s.name === value,
    );

    if (staff) {
      const idsKey = field;
      const selectedKey =
        field === "tutor_ids" ? selectedTutors : selectedAssistants;
      const setSelected =
        field === "tutor_ids" ? setSelectedTutors : setSelectedAssistants;

      // Avoid duplicates
      if (!formData[idsKey].includes(staff.id)) {
        setFormData((prev) => ({
          ...prev,
          [idsKey]: [...prev[idsKey], staff.id],
        }));
        setSelected([...selectedKey, staff]);
      }

      // Clear search after selection
      if (field === "tutor_ids") setTutorSearch("");
      else setAssistantSearch("");
    }
  };

  const removeStaff = (id, field) => {
    const idsKey = field;
    const setSelected =
      field === "tutor_ids" ? setSelectedTutors : setSelectedAssistants;

    setFormData((prev) => ({
      ...prev,
      [idsKey]: prev[idsKey].filter((staffId) => staffId !== id),
    }));

    setSelected((prev) => prev.filter((staff) => staff.id !== id));
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  /* =============================
     SCHEDULE HANDLERS
  ============================= */

  const toggleDay = (dayValue) => {
    const existingIndex = daySchedules.findIndex((s) => s.day === dayValue);

    if (existingIndex !== -1) {
      setDaySchedules(daySchedules.filter((s) => s.day !== dayValue));
    } else {
      setDaySchedules([
        ...daySchedules,
        {
          day: dayValue,
          start_time: "17:00",
          end_time: "19:00",
        },
      ]);
    }

    if (errors.days) {
      setErrors({ ...errors, days: null });
    }
  };

  const handleTimeChange = (day, field, value) => {
    setDaySchedules((prev) =>
      prev.map((s) => (s.day === day ? { ...s, [field]: value } : s)),
    );
  };

  /* =============================
     HELPERS
  ============================= */

  const calculateDuration = (start, end) => {
    if (!start || !end) return 60;

    const [startH, startM] = start.split(":").map(Number);
    const [endH, endM] = end.split(":").map(Number);

    let diff = endH * 60 + endM - (startH * 60 + startM);

    return diff > 0 ? diff : 60;
  };

  /* =============================
     FORM VALIDATION
  ============================= */

  const validateForm = () => {
    const newErrors = {};

    console.log("=== VALIDATION DEBUG ===");
    console.log("formData.course_id:", formData.course_id, "selectedCourse:", selectedCourse);
    console.log("formData.subject_id:", formData.subject_id, "selectedSubject:", selectedSubject);
    console.log("formData.title:", formData.title);
    console.log("formData.start_date:", formData.start_date);
    console.log("formData.end_date:", formData.end_date);
    console.log("formData.link:", formData.link);
    console.log("formData.tutor_ids:", formData.tutor_ids, "selectedTutors:", selectedTutors);
    console.log("daySchedules:", daySchedules);
    console.log("=====================");

    if (!formData.course_id && !editClass) newErrors.course_id = "Course is required";

    if (!formData.subject_id && !editClass?.subject_id && !editClass?.subject?.id) newErrors.subject_id = "Subject is required";

    if (!formData.title?.trim() && !editClass?.title) newErrors.title = "Title is required";

    if (!formData.start_date) newErrors.start_date = "Start date required";

    if (!formData.end_date) newErrors.end_date = "End date required";

    if (formData.link && !/^https?:\/\/.+/.test(formData.link)) {
      newErrors.link = "Please enter a valid URL (e.g., https://...)";
    }

    const hasTutors = (formData.tutor_ids && formData.tutor_ids.length > 0) || 
                      (selectedTutors && selectedTutors.length > 0) || 
                      (editClass?.staffs && editClass.staffs.length > 0);

    if (!hasTutors)
      newErrors.tutor_ids = "At least one tutor is required";

    if (isPrivate) {
      if (!selectedStudent) newErrors.student_id = "Please select a student for this private class";
      if (paymentMethod !== "free_grant") {
        if (!amountPaid || isNaN(amountPaid) || Number(amountPaid) < 0) {
          newErrors.amount_paid = "Please enter a valid amount paid";
        }
      }
    }
    if (daySchedules.length === 0) newErrors.days = "Select schedule days";

    console.log("Validation check - newErrors:", newErrors);
    setErrors(newErrors);

    return newErrors;
  };

  /* =============================
     SUBMIT
  ============================= */
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submit clicked, formData:", formData);
    console.log("daySchedules:", daySchedules);

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      console.log("Validation failed, errors:", validationErrors);
      const errorMessages = Object.entries(validationErrors)
        .map(([field, message]) => `${field}: ${message}`)
        .join("\n");
      console.error("Form validation errors:\n", errorMessages);
      
      const scrollContainer = document.querySelector(".flex-1.overflow-y-auto");
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
      return;
    }

    console.log("Validation passed, proceeding with submission");
    setLoading(true);
    setApiError(null);

    try {
      /* =============================
       BUILD STAFF ARRAY
    ============================= */

      let validTutors = (formData.tutor_ids || []).map(Number).filter(id => id && !isNaN(id));
      let validAssistants = (formData.assistant_ids || []).map(Number).filter(id => id && !isNaN(id));

      // If editing and tutors weren't modified, keep existing tutors from selectedTutors or editClass
      if (validTutors.length === 0 && selectedTutors.length > 0) {
        validTutors = selectedTutors.map(extractStaffNumericId).filter(Boolean);
      } else if (validTutors.length === 0 && editClass?.staffs) {
        validTutors = (editClass.staffs || [])
          .filter(s => (s.pivot?.role || s.role || "").toLowerCase() !== "assistant" && (s.pivot?.role || s.role || "").toLowerCase() !== "advisor")
          .map(extractStaffNumericId)
          .filter(Boolean);
      }

      if (validAssistants.length === 0 && selectedAssistants.length > 0) {
        validAssistants = selectedAssistants.map(extractStaffNumericId).filter(Boolean);
      } else if (validAssistants.length === 0 && editClass?.staffs) {
        validAssistants = (editClass.staffs || [])
          .filter(s => (s.pivot?.role || s.role || "").toLowerCase() === "assistant" || (s.pivot?.role || s.role || "").toLowerCase() === "advisor")
          .map(extractStaffNumericId)
          .filter(Boolean);
      }

      const staffs = [
        ...validTutors.map((id) => ({
          staff_id: Number(id),
          role: "lead",
        })),
        ...validAssistants.map((id) => ({
          staff_id: Number(id),
          role: "assistant",
        })),
      ];

      if (!editClass && staffs.length === 0) {
        setApiError("Please assign at least one staff member.");
        setLoading(false);
        return;
      }

      /* =============================
       BUILD SCHEDULE ARRAY
    ============================= */

      const schedules = daySchedules
        .filter((s) => s.day && s.start_time && s.end_time)
        .map((s) => ({
          day_of_week: s.day.toLowerCase().trim(),
          start_time: s.start_time.length > 5 ? s.start_time.substring(0, 5) : s.start_time,
          duration_minutes: Number(calculateDuration(s.start_time, s.end_time)),
        }));

      if (schedules.length === 0) {
        setApiError("Please add at least one schedule.");
        setLoading(false);
        return;
      }

      /* =============================
       BUILD FINAL PAYLOAD
    ============================= */
      const isOLevels = selectedCourse?.is_o_levels || formData.course_id === "o-levels";
      const subId = formData.subject_id 
        ? Number(formData.subject_id) 
        : (editClass?.subject_id || editClass?.subject?.id ? Number(editClass.subject_id || editClass.subject.id) : null);

      const allSubIds = selectedSubject?.all_subject_ids || (subId ? [subId] : []);

      const payload = {
        subject_id: subId,
        all_subject_ids: allSubIds,
        is_o_levels: isOLevels,
        title: formData.title?.trim() || editClass?.title || (isOLevels ? "O-Levels - Master Class" : "Master Class"),
        description: formData.description?.trim() || null,
        status: formData.status || "active",
        class_link: formData.link?.trim() ? formData.link.trim() : null,
        start_date: formData.start_date ? formData.start_date.substring(0, 10) : null,
        end_date: formData.end_date ? formData.end_date.substring(0, 10) : null,
        schedules,
      };

      if (isPrivate) {
        payload.is_private = true;
        payload.private_student_id = selectedStudent?.id || null;
        payload.amount_paid = paymentMethod === "free_grant" ? 0 : (amountPaid ? Number(amountPaid) : 0);
        payload.payment_method = paymentMethod || "bank_transfer";
        payload.notes = paymentMethod === "free_grant" ? "Free Grant / Scholarship enrollment" : null;
      } else {
        payload.is_private = false;
        payload.private_student_id = null;
      }

      if (staffs.length > 0) {
        payload.staffs = staffs;
      }

      /* =============================
       API REQUEST
    ============================= */

      let res;
      if (editClass) {
        res = await axios.put(
          `${API_BASE_URL}/api/admin/classes/update/${editClass.id}`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } else {
        res = await axios.post(
          `${API_BASE_URL}/api/admin/classes/create`,
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (res.status === 201 || res.status === 200) {
        console.log("Masterclass saved successfully:", res.data);
        onSuccess(res.data);
      }
    } catch (error) {
      console.log("FULL ERROR RESPONSE:", error.response);

      if (error.response?.data?.errors) {
        console.log("VALIDATION ERRORS:", error.response.data.errors);

        const formatted = {};
        const errorList = [];

        Object.entries(error.response.data.errors).forEach(([k, v]) => {
          const errorKey = k === 'class_link' ? 'link' : k;
          formatted[errorKey] = v[0];
          errorList.push(`${errorKey}: ${v[0]}`);
        });

        setErrors(formatted);
        setApiError(errorList.join(" | ") || error.response.data.message || "Validation failed");
      } else {
        setApiError(error.response?.data?.message || "Server error");
      }
    } finally {
      setLoading(false);
    }
  };
  /* =============================
     UI
  ============================= */

  const isProposed = formData.status === "proposed" || formData.status === "rescheduled";
  const isCancelled = formData.status === "cancelled" || formData.status === "canceled";

  // Standard blue form factor tokens preserved across all conditions
  const cardBg = "bg-gray-50 dark:bg-blue-600/10 border-gray-200 dark:border-blue-500/30 text-black dark:text-white";
  const inputBg = "bg-white dark:bg-blue-600/20 border-gray-200 dark:border-blue-500/30 text-black dark:text-white focus:ring-blue-500";
  const labelColor = "text-black dark:text-white";
  const sublabelColor = "text-black dark:text-white";
  const iconColor = "text-gray-400";

  return ReactDOM.createPortal(
   <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-hidden">
  {/* Backdrop */}
  <div 
    className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
    onClick={onClose}
  />
  
  {/* Modal Container: Matches cancelled container format with sleek border and gradient header in dusty gold */}
  <div className={`relative w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-all duration-300 bg-white dark:bg-gray-900 ${
    isProposed
      ? "border-2 border-[#C5A97A] dark:border-[#C5A97A] shadow-[0_0_35px_rgba(197,169,122,0.25)]"
      : isCancelled
      ? "border-2 border-rose-400 dark:border-rose-900 shadow-2xl"
      : "border border-gray-200 dark:border-gray-800"
  }`}>
    
    {/* Header - Styled like cancelled container with dusty gold gradient */}
    <div className={`flex-shrink-0 px-8 py-5 flex items-center justify-between border-b transition-all duration-300 ${
      isProposed
        ? "bg-gradient-to-r from-[#826435] via-[#5a4421] to-[#1e1e1e] text-white border-b border-[#C5A97A]/50"
        : isCancelled
        ? "bg-gradient-to-r from-rose-900 via-rose-800 to-[#1e1e1e] text-white border-rose-700/60"
        : "bg-[#09314F] text-white border-gray-200 dark:border-gray-800"
    }`}>
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {editClass ? "Edit Master Class" : "Schedule Master Class"}
          </h2>
          {isProposed && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C5A97A]/30 text-[#fff5e1] border border-[#C5A97A]/70">
              PROPOSED
            </span>
          )}
          {isCancelled && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/25 text-rose-200 border border-rose-400/50">
              CANCELLED
            </span>
          )}
        </div>
        <p className="text-xs mt-0.5 text-white/80">
          {isProposed
            ? "This masterclass is PROPOSED and liable to change. Students can still view and attend."
            : isCancelled
            ? "This masterclass is CANCELLED. All upcoming classroom sessions are paused."
            : "Finalized masterclass cohort and weekly live timetable schedule."}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-2 hover:bg-white/10 rounded-full transition-all text-white/80 hover:text-white"
        title="Close"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>

    {/* Global API Error Banner */}
    {apiError && (
      <div className="flex-shrink-0 mx-8 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl text-sm">
        {apiError}
      </div>
    )}

    {/* Scrollable Form Content */}
    <div className="flex-1 overflow-y-auto px-8 py-6">
      <form
        id="masterClassForm"
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* CLASS CONDITION TOGGLE (Active | Proposed | Cancelled) */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isProposed
            ? "bg-amber-50/80 dark:bg-[#C5A97A]/15 border-amber-300 dark:border-[#C5A97A]/50"
            : isCancelled
            ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-900/60"
            : "bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50"
        }`}>
          <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
            <label className={`text-xs font-black uppercase tracking-wider ${
              isProposed ? "text-[#C5A97A] dark:text-[#f3e5ce]" : isCancelled ? "text-rose-700 dark:text-rose-300" : "text-[#09314F] dark:text-blue-200"
            }`}>
              Class Status Condition
            </label>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
              isProposed
                ? "bg-[#C5A97A]/25 text-amber-900 dark:text-[#fff0d4] border border-[#C5A97A]/60"
                : isCancelled
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
            }`}>
              {isProposed ? "Proposed (Liable to change)" : isCancelled ? "Cancelled (Closed)" : "Active (Finalized)"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, status: "active" }))}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                !isProposed && !isCancelled
                  ? "bg-[#09314F] text-white shadow-md ring-2 ring-blue-400"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${!isProposed && !isCancelled ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
              <span>Active</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, status: "proposed" }))}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                isProposed
                  ? "bg-[#C5A97A] hover:bg-[#b89a68] text-[#081d30] font-black shadow-md shadow-[#C5A97A]/30 ring-2 ring-[#f3e5ce]"
                  : "bg-white dark:bg-gray-800 text-amber-700 dark:text-[#C5A97A] border border-amber-300 dark:border-amber-700/60 hover:bg-amber-50"
              }`}
            >
              <Icon icon="lucide:clock" className={`w-3.5 h-3.5 ${isProposed ? "text-[#081d30]" : "text-[#C5A97A]"}`} />
              <span>Proposed</span>
            </button>

            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, status: "cancelled" }))}
              className={`py-2.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                isCancelled
                  ? "bg-rose-600 text-white shadow-md ring-2 ring-rose-400"
                  : "bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50"
              }`}
            >
              <Icon icon="lucide:ban" className="w-3.5 h-3.5 text-rose-400" />
              <span>Cancelled</span>
            </button>
          </div>
        </div>

        {/* PERIOD Section */}
        <div>
          <label className={`block text-xs font-semibold uppercase tracking-wide mb-3 ${labelColor}`}>
            PERIOD
          </label>
          
          {/* Session Duration */}
          <div className={`rounded-2xl p-5 border ${cardBg} ${
            errors.start_date || errors.end_date 
              ? "border-red-300" 
              : ""
          }`}>
            <div className="flex items-center justify-between mb-4">
              <span className={`text-sm font-medium ${sublabelColor}`}>
                Session Duration
              </span>
            </div>
            <div ref={dateContainerRef} className="flex items-center gap-4">
              <div className="flex-1 relative">
                <span className={`block text-xs mb-1 ${labelColor}`}>Start</span>
                <div className="relative">
                  <input
                    ref={startDateRef}
                    type="date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    onClick={() => {
                      if (startDateRef.current?.showPicker) {
                        startDateRef.current.showPicker();
                      } else {
                        startDateRef.current?.focus();
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden ${inputBg}`}
                  />
                  <CalendarIcon 
                    className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconColor}`}
                  />
                </div>
              </div>
              <span className="text-gray-400 mt-6">-</span>
              <div className="flex-1 relative">
                <span className={`block text-xs mb-1 ${labelColor}`}>End</span>
                <div className="relative">
                  <input
                    ref={endDateRef}
                    type="date"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    onClick={() => {
                      if (endDateRef.current?.showPicker) {
                        endDateRef.current.showPicker();
                      } else {
                        endDateRef.current?.focus();
                      }
                    }}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden ${inputBg}`}
                  />
                  <CalendarIcon 
                    className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${iconColor}`}
                  />
                </div>
              </div>
            </div>
          </div>
          {(errors.start_date || errors.end_date) && (
            <p className="text-red-500 text-xs mt-2">{errors.start_date || errors.end_date}</p>
          )}
        </div>

        {/* PRIVATE CLASS (1-ON-1) TOGGLE & CONFIGURATION */}
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-2xl ${isPrivate ? "bg-amber-500 text-white shadow-md shadow-amber-500/30" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}`}>
                <Icon icon={isPrivate ? "mdi:account-star" : "mdi:account-group"} className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-black dark:text-white">
                    {isPrivate ? "Private 1-on-1 Master Class" : "Standard Group Master Class"}
                  </h4>
                  {isPrivate && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white">
                      Exclusive 1-on-1
                    </span>
                  )}
                </div>
                <p className="text-xs text-black dark:text-white opacity-70 mt-0.5">
                  {isPrivate
                    ? "4 bespoke sessions with status-driven validity & zero student data leakage"
                    : "Open cohort masterclass with recurring weekly schedule"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isPrivate ? "bg-amber-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                isPrivate ? "translate-x-5" : "translate-x-0"
              }`} />
            </button>
          </div>

          {isPrivate && (
            <div className="mt-4 pt-4 border-t border-amber-200/60 dark:border-amber-700/40 space-y-4 animate-in fade-in duration-300">
              {/* Student Picker */}
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2">
                  Select Private Student *
                </label>
                <div className="relative">
                  <div className="flex items-center gap-3 rounded-2xl px-5 py-3.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700">
                    <UserCircleIcon className="w-5 h-5 text-amber-500" />
                    <input
                      type="text"
                      placeholder="Search registered student by name or email..."
                      value={studentSearch}
                      onChange={(e) => {
                        setStudentSearch(e.target.value);
                        setSelectedStudent(null);
                      }}
                      onFocus={() => setStudentFocused(true)}
                      onBlur={() => setTimeout(() => setStudentFocused(false), 250)}
                      className="flex-1 bg-transparent text-sm font-semibold outline-none text-black dark:text-white placeholder:text-gray-400"
                    />
                    {selectedStudent && (
                      <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-black rounded-full uppercase">
                        ID: #{selectedStudent.id}
                      </span>
                    )}
                  </div>

                  {studentFocused && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl z-[150] max-h-48 overflow-y-auto">
                      {studentsList
                        .filter((st) => {
                          const q = studentSearch.toLowerCase();
                          const name = `${st.firstname || ""} ${st.surname || ""}`.toLowerCase();
                          const email = (st.email || "").toLowerCase();
                          return name.includes(q) || email.includes(q);
                        })
                        .map((st) => (
                          <button
                            key={st.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setSelectedStudent(st);
                              setStudentSearch(`${st.firstname || ""} ${st.surname || ""}`.trim());
                              setStudentFocused(false);
                              if (errors.student_id) setErrors((prev) => ({ ...prev, student_id: null }));
                            }}
                            className="w-full text-left px-5 py-3 hover:bg-amber-50 dark:hover:bg-gray-700 border-b last:border-0 border-gray-100 dark:border-gray-700/40 flex items-center justify-between text-sm"
                          >
                            <div>
                              <span className="font-bold text-black dark:text-white">
                                {st.firstname} {st.surname}
                              </span>
                              <span className="text-xs text-gray-400 block">{st.email}</span>
                            </div>
                            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Select</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>
                {errors.student_id && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.student_id}</p>}
              </div>

              {/* Amount Paid & Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2">
                    Amount Paid (₦) *
                  </label>
                  {paymentMethod === "free_grant" ? (
                    <div className="w-full px-5 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-2xl flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-extrabold text-sm">
                      <div className="flex items-center gap-2">
                        <Icon icon="mdi:gift-outline" className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        <span>FREE (₦0.00)</span>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Free Grant
                      </span>
                    </div>
                  ) : (
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 50000"
                      value={amountPaid}
                      onChange={(e) => {
                        setAmountPaid(e.target.value);
                        if (errors.amount_paid) setErrors((prev) => ({ ...prev, amount_paid: null }));
                      }}
                      className="w-full px-5 py-3.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-2xl text-sm font-bold text-black dark:text-white outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                  {errors.amount_paid && <p className="text-xs text-rose-500 mt-1 font-semibold">{errors.amount_paid}</p>}
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaymentMethod(val);
                      if (val === "free_grant") {
                        setAmountPaid("Free");
                        if (errors.amount_paid) setErrors((prev) => ({ ...prev, amount_paid: null }));
                      } else if (amountPaid === "Free") {
                        setAmountPaid("");
                      }
                    }}
                    className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-amber-300 dark:border-amber-700 rounded-2xl text-sm font-bold text-black dark:text-white outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="bank_transfer">Direct Bank Transfer</option>
                    <option value="card">Card Payment</option>
                    <option value="pos">POS Terminal</option>
                    <option value="manual">Manual / Cash</option>
                    <option value="free_grant">Free Grant (100% Scholarship / Waived)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 font-medium">
                <Icon icon="mdi:calendar-sync" className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  Sessions are scheduled between the Start Date & End Date below. You can easily adjust or move individual class dates anytime using the <strong>Reschedule</strong> feature.
                </span>
              </div>

              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-300/40 text-[11px] font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Icon icon="mdi:shield-check" className="w-4 h-4 text-amber-500 shrink-0" />
                <span>An official payment record (TC-PRIV-...) will be auto-generated in the ledger for this private enrollment.</span>
              </div>
            </div>
          )}
        </div>

        {/* Course Selection */}
        <div className="space-y-3">
          <label className={`text-[11px] font-black uppercase tracking-widest px-1 ${labelColor}`}>Course Selection</label>
          <div className="relative">
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border transition-all ${cardBg} ${
              errors.course_id ? "border-red-300" : ""
            } ${selectedCourse ? "bg-green-50/10 border-green-500/30" : ""}`}>
              <BookOpenIcon className={`w-5 h-5 ${iconColor}`} />
              <input
                type="text"
                placeholder="Search and select course (e.g. O-LEVELS, JAMB, WAEC)..."
                value={courseSearch}
                onChange={handleCourseSearchChange}
                onFocus={() => setCourseFocused(true)}
                onBlur={() => setTimeout(() => setCourseFocused(false), 200)}
                autoComplete="off"
                className="flex-1 bg-transparent font-medium outline-none text-black dark:text-white placeholder:text-gray-400"
              />
              {selectedCourse && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCourse(null);
                    setCourseSearch("");
                    setFormData((prev) => ({
                      ...prev,
                      course_id: "",
                      subject_id: "",
                    }));
                    setSubjectSearch("");
                    setSelectedSubject(null);
                    setSubjects([]);
                  }}
                  className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider transition-colors flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-red-500/10 hover:text-red-500"
                  title="Click to clear and change course"
                >
                  <span>{selectedCourse.title || selectedCourse.name}</span>
                  <span className="text-sm font-bold leading-none">×</span>
                </button>
              )}
            </div>

            {/* Custom Course Dropdown */}
            {!selectedCourse && (courseFocused || courseSearch.trim()) && (
              <div className="absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl z-[120] max-h-[220px] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                {(() => {
                  const q = courseSearch.trim().toLowerCase();
                  const cleanQ = q.replace(/[^a-z0-9]/g, "");
                  const filtered = q
                    ? courses.filter(c => {
                        const t = (c.title || c.name || "").toLowerCase();
                        const sub = (c.subtitle || "").toLowerCase();
                        if (c.is_o_levels) {
                          if (
                            cleanQ.includes("o") ||
                            cleanQ.includes("level") ||
                            cleanQ.includes("olevel") ||
                            q.includes("waec") ||
                            q.includes("neco") ||
                            q.includes("gce")
                          ) {
                            return true;
                          }
                        }
                        return t.includes(q) || sub.includes(q);
                      })
                    : courses;
                  return filtered.length > 0 ? (
                    filtered.map(course => (
                      <button
                        key={course.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedCourse(course);
                          setCourseSearch(course.title || course.name || "");
                          setFormData((prev) => ({
                            ...prev,
                            course_id: course.id,
                            subject_id: "",
                          }));
                          setSubjectSearch("");
                          setSelectedSubject(null);
                        }}
                        className="w-full text-left px-6 py-3.5 font-medium text-sm transition-colors border-b last:border-0 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 text-[#0F2843] dark:text-white border-gray-50 dark:border-gray-700/30"
                      >
                        <div>
                          <div className="font-bold flex items-center gap-2">
                            <span>{course.title || course.name}</span>
                            {course.is_o_levels && (
                              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                                WAEC • NECO • GCE
                              </span>
                            )}
                          </div>
                          {course.is_o_levels ? (
                            <div className="text-xs font-medium mt-0.5 text-blue-600 dark:text-blue-400">
                              Creates Master Class for WAEC, NECO & GCE students
                            </div>
                          ) : course.subtitle ? (
                            <div className="text-xs text-gray-400 font-normal mt-0.5">
                              {course.subtitle}
                            </div>
                          ) : null}
                        </div>
                        {course.is_o_levels && (
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                            Combined
                          </span>
                        )}
                      </button>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-xs font-bold text-gray-400 text-center uppercase tracking-wider">
                      No matching courses found
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          {selectedCourse?.is_o_levels && (
            <p className="text-xs font-semibold px-1 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              All students registered for WAEC, NECO & GCE will automatically see this Master Class.
            </p>
          )}
          {errors.course_id && <p className="text-red-500 text-xs mt-2">{errors.course_id}</p>}
        </div>

        {/* Subject Selection */}
        <div className="space-y-3">
          <label className={`text-[11px] font-black uppercase tracking-widest px-1 ${labelColor}`}>Subject Selection</label>
          <div className="relative">
            <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border transition-all ${cardBg} ${
              errors.subject_id ? "border-red-300" : ""
            } ${!formData.course_id ? "opacity-50 cursor-not-allowed" : ""} ${selectedSubject ? "bg-green-50/10 border-green-500/30" : ""}`}>
              <BookOpenIcon className={`w-5 h-5 ${iconColor}`} />
              <input
                type="text"
                placeholder={formData.course_id ? (formData.course_id === "o-levels" ? "Search and select O-Level subject (e.g. Mathematics)..." : "Search and select subject (e.g. Mathematics)...") : "Please select a course first"}
                value={subjectSearch}
                onChange={handleSubjectSearchChange}
                onFocus={() => setSubjectFocused(true)}
                onBlur={() => setTimeout(() => setSubjectFocused(false), 200)}
                disabled={!formData.course_id}
                autoComplete="off"
                className="flex-1 bg-transparent font-medium outline-none disabled:cursor-not-allowed text-black dark:text-white placeholder:text-gray-400"
              />
              {selectedSubject && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSubject(null);
                    setSubjectSearch("");
                    setFormData((prev) => ({
                      ...prev,
                      subject_id: "",
                    }));
                  }}
                  className="text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider transition-colors flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-500/10 hover:bg-red-500/10 hover:text-red-500"
                  title="Click to clear and change subject"
                >
                  <span>{selectedSubject.name}</span>
                  <span className="text-sm font-bold leading-none">×</span>
                </button>
              )}
            </div>

            {/* Custom Subject Dropdown */}
            {formData.course_id && !selectedSubject && (subjectFocused || subjectSearch.trim()) && (
              <div className="absolute top-full left-0 right-0 mt-2 border rounded-2xl shadow-2xl z-[120] max-h-[200px] overflow-y-auto custom-scrollbar bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700">
                {(() => {
                  const filtered = subjectSearch.trim()
                    ? subjects.filter(s => (s.name || "").toLowerCase().includes(subjectSearch.toLowerCase()))
                    : subjects;
                  return filtered.length > 0 ? (
                    filtered.map(subject => (
                      <button
                        key={subject.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedSubject(subject);
                          setSubjectSearch(subject.name || "");
                          const autoTitle = `${selectedCourse?.title || selectedCourse?.name} - ${subject.name}`;
                          setFormData((prev) => ({
                            ...prev,
                            subject_id: subject.id,
                            title: autoTitle,
                          }));
                        }}
                        className="w-full text-left px-6 py-4 font-medium text-sm transition-colors border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 text-[#0F2843] dark:text-white border-gray-50 dark:border-gray-700/30"
                      >
                        {subject.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-6 py-4 text-xs font-bold text-gray-400 text-center uppercase tracking-wider">
                      No matching subjects found
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          {errors.subject_id && <p className="text-red-500 text-xs mt-2">{errors.subject_id}</p>}
        </div>

        {/* Generated Class Title */}
        <div className={`rounded-2xl p-5 border ${cardBg}`}>
          <span className={`block text-xs mb-2 ${labelColor}`}>Generated Class Title</span>
          <p className="text-base font-semibold text-black dark:text-white">
            {selectedSubject 
              ? `${selectedCourse?.title || selectedCourse?.name} - ${selectedSubject.name}` 
              : "JAMB - Geography"
            }
          </p>
        </div>

        {/* Weekly Schedule */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClockIcon className={`w-5 h-5 ${iconColor}`} />
              <span className={`text-sm font-medium ${labelColor}`}>West Africa Standard Time</span>
            </div>
          </div>
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => {
              const isActive = daySchedules.some((s) => s.day === day.value);
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => toggleDay(day.value)}
                  className={`py-3 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? "bg-blue-400 text-white font-bold shadow-sm"
                      : "bg-gray-100 dark:bg-blue-600/20 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-blue-600/30 border-none"
                  }`}
                >
                  {day.label}
                </button>
              );
            })}
          </div>

          {/* Time Slots Table */}
          {daySchedules.length > 0 && (
            <div className={`rounded-2xl p-4 border ${cardBg}`}>
              <div className={`grid grid-cols-3 gap-4 mb-3 text-xs font-medium ${labelColor}`}>
                <span>Day</span>
                <span className="text-center">Start</span>
                <span className="text-center">End</span>
              </div>
              {daySchedules.map((schedule) => (
                <div 
                  key={schedule.day}
                  className="grid grid-cols-3 gap-4 items-center py-2"
                >
                  <span className="text-sm font-medium capitalize text-black dark:text-white">
                    {schedule.day}
                  </span>
                  <input
                    type="time"
                    value={schedule.start_time}
                    onChange={(e) => handleTimeChange(schedule.day, "start_time", e.target.value)}
                    className={`px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 ${inputBg}`}
                  />
                  <input
                    type="time"
                    value={schedule.end_time}
                    onChange={(e) => handleTimeChange(schedule.day, "end_time", e.target.value)}
                    className={`px-3 py-2 border rounded-lg text-sm text-center focus:outline-none focus:ring-2 ${inputBg}`}
                  />
                </div>
              ))}
            </div>
          )}
          {errors.days && <p className="text-red-500 text-xs mt-2">{errors.days}</p>}
        </div>

        {/* Tutors */}
        <div>
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${cardBg} ${
            errors.tutor_ids ? "border-red-300" : ""
          }`}>
            <UserGroupIcon className={`w-5 h-5 ${iconColor}`} />
            <input
              list="tutor-list"
              value={tutorSearch}
              onChange={(e) => handleStaffChange(e, "tutor_ids")}
              placeholder="Search and select tutors"
              className="flex-1 bg-transparent text-sm italic outline-none text-black dark:text-white placeholder:text-gray-400"
            />
            <datalist id="tutor-list">
              {tutors.map((s) => (
                <option key={s.id} value={s.name || `${s.firstname} ${s.surname}`} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedTutors.map((s) => (
              <div 
                key={s.id} 
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-[#0a1d3a] text-white"
              >
                {s.name || `${s.firstname} ${s.surname}`}
                <button type="button" onClick={() => removeStaff(s.id, "tutor_ids")}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          {errors.tutor_ids && <p className="text-red-500 text-xs mt-2">{errors.tutor_ids}</p>}
        </div>

        {/* Assistants */}
        <div>
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${cardBg}`}>
            <UserGroupIcon className={`w-5 h-5 ${iconColor}`} />
            <input
              list="assistant-list"
              value={assistantSearch}
              onChange={(e) => handleStaffChange(e, "assistant_ids")}
              placeholder="Search and select assistants (optional)"
              className="flex-1 bg-transparent text-sm italic outline-none text-black dark:text-white placeholder:text-gray-400"
            />
            <datalist id="assistant-list">
              {assistants.map((s) => (
                <option key={s.id} value={s.name || `${s.firstname} ${s.surname}`} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {selectedAssistants.map((s) => (
              <div 
                key={s.id} 
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-full bg-gray-200 dark:bg-gray-700 text-black dark:text-white"
              >
                {s.name || `${s.firstname} ${s.surname}`}
                <button type="button" onClick={() => removeStaff(s.id, "assistant_ids")}>
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Meeting Link */}
        <div>
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${cardBg} ${
            errors.link ? "border-red-300" : ""
          }`}>
            <LinkIcon className={`w-5 h-5 ${iconColor}`} />
            <input
              type="url"
              name="link"
              value={formData.link}
              onChange={handleChange}
              placeholder="https://meet.google.com/ans-baxj-eyc"
              className="flex-1 bg-transparent text-sm outline-none text-black dark:text-white placeholder:text-gray-400"
            />
          </div>
          {errors.link && <p className="text-red-500 text-xs mt-2">{errors.link}</p>}
        </div>

        {/* Class Condition / Status */}
        <div>
          <label className={`block text-[11px] font-black uppercase tracking-wider mb-1.5 ${labelColor}`}>
            Class Condition & Status
          </label>
          <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 border ${cardBg}`}>
            <UserCircleIcon className={`w-5 h-5 ${iconColor}`} />
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="flex-1 bg-transparent text-sm font-bold outline-none cursor-pointer border-none focus:ring-0 text-black dark:text-white"
            >
              <option value="active" className="text-black dark:bg-[#0a1d3a] dark:text-white">Active (Finalized Schedule)</option>
              <option value="proposed" className="text-black dark:bg-[#0a1d3a] dark:text-white">Proposed (Liable to Change / Tentative)</option>
              <option value="cancelled" className="text-black dark:bg-[#0a1d3a] dark:text-white">Cancelled (Suspended / Closed)</option>
              <option value="inactive" className="text-black dark:bg-[#0a1d3a] dark:text-white">Inactive (Archived)</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 border ${cardBg}`}>
            <ChatBubbleBottomCenterTextIcon className={`w-5 h-5 mt-1 ${iconColor}`} />
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Description (optional)"
              rows="3"
              className="flex-1 bg-transparent text-sm italic outline-none resize-none text-black dark:text-white placeholder:text-gray-400"
            />
          </div>
        </div>
      </form>
    </div>

    {/* Footer - Fixed */}
    <div className="flex-shrink-0 px-8 py-6 flex items-center gap-4 border-t transition-all duration-300 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
      <button
        type="button"
        onClick={onClose}
        disabled={loading}
        className="flex-1 py-3 bg-red-500 text-white font-semibold rounded-xl transition-all hover:bg-red-600 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className={`flex-1 py-3 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 ${
          isProposed
            ? "bg-[#C5A97A] hover:bg-[#b89a68] text-[#081d30] font-black shadow-lg shadow-[#C5A97A]/30 ring-2 ring-[#f3e5ce]"
            : isCancelled
            ? "bg-rose-600 hover:bg-rose-700 text-white font-bold"
            : "bg-[#0a1d3a] hover:bg-[#081627] text-white"
        } ${loading ? "opacity-70 cursor-not-allowed" : "active:scale-95"}`}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </>
        ) : editClass ? (
          isProposed ? "Save Changes (Proposed Class)" : isCancelled ? "Save Changes (Cancelled)" : "Save Changes"
        ) : (
          isProposed ? "Save as Proposed Class" : "Save Class"
        )}
      </button>
    </div>
  </div>
</div>,
  document.body
  );
}