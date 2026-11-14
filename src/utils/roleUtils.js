export const READ_ONLY_ROLES = [
  "coo",
  "preview",
  "operations",
  "csa",
  "customer support",
  "customer_support",
  "customer-support"
];

/**
 * Checks if a given staff role (or the currently stored staff role) is read-only.
 * Read-only roles have executive inspection rights across admin pages but cannot mutate data.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const isReadOnlyStaff = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  return READ_ONLY_ROLES.includes(targetRole);
};

/**
 * Checks if a given staff role is specifically CSA / Customer Support.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const isCsa = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  return ["csa", "customer support", "customer_support", "customer-support"].includes(targetRole);
};

/**
 * Checks if a given staff role (or the currently stored staff role) can access the Video Vault.
 * Allowed roles: admin, superadmin, coo, csa, advisor (academic / course advisor), moderator.
 * Tutors are strictly forbidden.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const canAccessVideoVault = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  if (!targetRole) return false;
  if (targetRole === "tutor") return false;

  const allowedRoles = [
    "admin",
    "super_admin",
    "superadmin",
    "coo",
    "csa",
    "customer support",
    "customer_support",
    "customer-support",
    "advisor",
    "academic_advisor",
    "academic advisor",
    "course_advisor",
    "course advisor",
    "moderator",
  ];
  return allowedRoles.includes(targetRole);
};

export const ADMIN_STAFF_ROLES = [
  "admin",
  "super_admin",
  "superadmin",
  "coo",
  "moderator",
  "csa",
  "customer support",
  "customer_support",
  "customer-support",
  "operations",
  "preview"
];

export const ADVISOR_ROLES = [
  "advisor",
  "academic_advisor",
  "academic advisor",
  "course_advisor",
  "course advisor"
];

/**
 * Checks if a given staff role (or the currently stored staff role) is an admin/management role.
 * Admins, COOs, moderators, and support observe classes and should NEVER be prompted
 * to fill out post-class tutor reports, student feedback, or advisor reports.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const isAdminStaff = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  if (!targetRole) return false;
  return ADMIN_STAFF_ROLES.includes(targetRole);
};

/**
 * Checks if a given staff role is a course or academic advisor.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const isAdvisorStaff = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  return ADVISOR_ROLES.includes(targetRole);
};

/**
 * Checks if a given staff role is specifically a tutor.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const isTutorStaff = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  return targetRole === "tutor";
};

/**
 * Checks if a staff role is authorized to edit exam years and paper types.
 * Strictly restricted to admin and moderator roles.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const canEditExamYear = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  if (!targetRole) return false;
  return ["admin", "super_admin", "superadmin", "moderator"].includes(targetRole);
};

/**
 * Checks if a staff role is authorized to see cancelled classes and sessions.
 * Strictly restricted to Super Admin, Admin, COO, and Moderator roles.
 *
 * @param {string} [role] - Optional role string. If omitted, reads from localStorage.
 * @returns {boolean}
 */
export const canSeeCancelledClasses = (role) => {
  const targetRole = (role !== undefined && role !== null ? role : localStorage.getItem("staff_role") || "")
    .toLowerCase()
    .trim();
  if (!targetRole) return false;
  return ["admin", "super_admin", "superadmin", "coo", "moderator"].includes(targetRole);
};


