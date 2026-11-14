import React from "react";
import { Icon } from "@iconify/react";

/**
 * Helpers to check session status
 */
export const isSessionCancelled = (session) => {
  if (!session) return false;
  if (session.is_cancelled === true) return true;
  const sessionStatus = String(session.status || "").toLowerCase().trim();
  const classStatus = String(session.class?.status || session.class_status || "").toLowerCase().trim();
  return (
    sessionStatus === "cancelled" ||
    sessionStatus === "canceled" ||
    classStatus === "cancelled" ||
    classStatus === "canceled"
  );
};

export const isSessionProposed = (session) => {
  if (!session) return false;
  if (isSessionRescheduled(session)) return false;
  if (session.is_proposed === true) return true;
  const sessionStatus = String(session.status || "").toLowerCase().trim();
  const classStatus = String(session.class?.status || session.class_status || "").toLowerCase().trim();
  return (
    sessionStatus === "proposed" ||
    classStatus === "proposed"
  );
};

export const isSessionRescheduled = (session) => {
  if (!session) return false;
  if (session.is_rescheduled === true) return true;
  const sessionStatus = String(session.status || "").toLowerCase().trim();
  const classStatus = String(session.class?.status || session.class_status || "").toLowerCase().trim();
  return sessionStatus === "rescheduled" || classStatus === "rescheduled";
};

export const hasSessionRecording = (session) => {
  if (!session) return false;
  const status = String(session.status || "").toLowerCase().trim();
  const link = session.recording_link || session.recording_url || session.recorded_url || session.video_url;
  return status === "recorded" || (typeof link === "string" && link.trim().length > 0);
};

export const isSessionLiveNow = (session) => {
  if (!session || !session.session_date) return false;
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  if (session.session_date !== todayStr) return false;

  const now = new Date();
  const currentMins = now.getHours() * 60 + now.getMinutes();

  const [sh, sm] = (session.starts_at || "00:00").split(":").map(Number);
  const [eh, em] = (session.ends_at || "23:59").split(":").map(Number);

  const startMins = sh * 60 + sm;
  const endMins = eh * 60 + em;

  return currentMins >= startMins && currentMins <= endMins;
};

export const isSessionPrivate = (session) => {
  if (!session) return false;
  return Boolean(
    session.is_private === true ||
    session.is_private === 1 ||
    session.is_private === "1" ||
    session.is_private === "true" ||
    session.class?.is_private === true ||
    session.class?.is_private === 1 ||
    session.class?.is_private === "1" ||
    session.class?.is_private === "true" ||
    session.private_student_id ||
    session.class?.private_student_id
  );
};

/**
 * Metadata & Vector Iconography for subjects (e.g. distinguishing Further Maths vs Maths)
 */
export const getSubjectMetadata = (subjectInput) => {
  const raw = (
    typeof subjectInput === "object"
      ? (subjectInput?.name || subjectInput?.title || "")
      : String(subjectInput || "")
  ).trim();

  // Strip prefixes like "GCE - ", "WAEC - ", "JAMB - "
  const cleaned = raw.replace(/^(GCE|WAEC|JAMB|NECO)\s*[-–:]\s*/i, "").trim();
  const lower = cleaned.toLowerCase();

  // Detect Further Mathematics (including typos like "furher")
  if (lower.includes("furher") || lower.includes("further") || lower.includes("f.math") || lower.includes("f-math")) {
    return {
      displayName: "Further Mathematics",
      code: "FMTH",
      icon: "lucide:function-square",
      isAdvanced: true,
    };
  }

  // Mathematics
  if (lower.includes("math") || lower.includes("arithmetic")) {
    return {
      displayName: "Mathematics",
      code: "MTH",
      icon: "lucide:calculator",
      isAdvanced: false,
    };
  }

  // English / Literature
  if (lower.includes("literature")) {
    return {
      displayName: "Literature in English",
      code: "LIT",
      icon: "lucide:book-open-check",
      isAdvanced: false,
    };
  }
  if (lower.includes("english")) {
    return {
      displayName: "English Language",
      code: "ENG",
      icon: "lucide:book-open",
      isAdvanced: false,
    };
  }

  // Physics
  if (lower.includes("physic")) {
    return {
      displayName: "Physics",
      code: "PHY",
      icon: "lucide:atom",
      isAdvanced: false,
    };
  }

  // Chemistry
  if (lower.includes("chem")) {
    return {
      displayName: "Chemistry",
      code: "CHM",
      icon: "lucide:flask-conical",
      isAdvanced: false,
    };
  }

  // Biology
  if (lower.includes("bio")) {
    return {
      displayName: "Biology",
      code: "BIO",
      icon: "lucide:dna",
      isAdvanced: false,
    };
  }

  // Economics
  if (lower.includes("econ")) {
    return {
      displayName: "Economics",
      code: "ECN",
      icon: "lucide:trending-up",
      isAdvanced: false,
    };
  }

  // Government / Civic
  if (lower.includes("gov") || lower.includes("civic")) {
    return {
      displayName: "Government",
      code: "GOV",
      icon: "lucide:landmark",
      isAdvanced: false,
    };
  }

  // Commerce / Accounting
  if (lower.includes("commerc") || lower.includes("account")) {
    return {
      displayName: "Commerce",
      code: "COM",
      icon: "lucide:receipt",
      isAdvanced: false,
    };
  }

  // Geography
  if (lower.includes("geog")) {
    return {
      displayName: "Geography",
      code: "GEO",
      icon: "lucide:globe",
      isAdvanced: false,
    };
  }

  // Agricultural Science
  if (lower.includes("agric")) {
    return {
      displayName: "Agricultural Science",
      code: "AGR",
      icon: "lucide:sprout",
      isAdvanced: false,
    };
  }

  // Computer Science / ICT
  if (lower.includes("comput") || lower.includes("data") || lower.includes("ict")) {
    return {
      displayName: "Computer Science",
      code: "CSC",
      icon: "lucide:cpu",
      isAdvanced: false,
    };
  }

  return {
    displayName: cleaned || "Master Class",
    code: "GEN",
    icon: "lucide:graduation-cap",
    isAdvanced: false,
  };
};

/**
 * Universal Unified Status-Driven Card Styles for Calendar Pages:
 * - Active: White / Slate Card with Emerald Green Accents
 * - Proposed: White / Slate Card with Dusty Gold / Yellow Accents
 * - Cancelled: Completely Red Card, Unclickable, Disabled
 */
export const getSessionCardStyles = (session) => {
  if (isSessionCancelled(session)) {
    return {
      status: "cancelled",
      isCancelled: true,
      isRescheduled: false,
      isProposed: false,
      isPrivate: false,
      isActive: false,
      // Card Container: Completely red & unclickable
      cardBg: "bg-rose-50/95 dark:bg-rose-950/40",
      cardBorder: "border-rose-300 dark:border-rose-900/60",
      cardHover: "opacity-80 cursor-not-allowed select-none",
      cardClickable: false,
      // Accents: Red
      accentText: "text-rose-700 dark:text-rose-300",
      accentBorder: "border-rose-300 dark:border-rose-800",
      titleClass: "text-rose-900 dark:text-rose-100 line-through opacity-75",
      timeText: "text-rose-600 dark:text-rose-300/80",
      subjectBadge: "bg-rose-100/90 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800",
      statusBadge: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/60 dark:text-rose-200",
      // Action: Red unclickable disabled pill
      actionButtonClass: "w-full py-2.5 px-4 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-extrabold rounded-xl text-center text-xs uppercase tracking-wider border border-rose-200 dark:border-rose-900 cursor-not-allowed pointer-events-none select-none",
      actionText: "Session Cancelled",
    };
  }

  if (isSessionRescheduled(session)) {
    return {
      status: "rescheduled",
      isCancelled: false,
      isRescheduled: true,
      isProposed: false,
      isPrivate: false,
      isActive: false,
      // Card Container: Unique Faded Orange (Untouchable & Unstartable)
      cardBg: "bg-orange-50/70 dark:bg-orange-950/20",
      cardBorder: "border-orange-300/70 border-dashed dark:border-orange-800/40",
      cardHover: "opacity-75 cursor-not-allowed select-none",
      cardClickable: false,
      accentText: "text-orange-700/80 dark:text-orange-300/80",
      accentBorder: "border-orange-200 dark:border-orange-800/50",
      titleClass: "text-orange-950/80 dark:text-orange-100/80 line-through opacity-80",
      timeText: "text-orange-600/75 dark:text-orange-300/75",
      subjectBadge: "bg-orange-100/70 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/50",
      statusBadge: "bg-orange-100/80 text-orange-800 border-orange-300/80 dark:bg-orange-950/60 dark:text-orange-300",
      actionButtonClass: "w-full py-2.5 px-4 bg-orange-100/60 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-extrabold rounded-xl text-center text-xs uppercase tracking-wider border border-orange-200 dark:border-orange-800/50 cursor-not-allowed pointer-events-none select-none",
      actionText: "Rescheduled to New Date",
    };
  }

  if (isSessionPrivate(session)) {
    const isProposed = isSessionProposed(session);
    return {
      status: isProposed ? "proposed_private" : "private",
      isCancelled: false,
      isProposed: isProposed,
      isPrivate: true,
      isActive: true,
      // Card Container: Amber border with warm tint and golden ring
      cardBg: "bg-white dark:bg-[#09314F] bg-gradient-to-br from-amber-500/[0.06] to-transparent",
      cardBorder: "border-amber-400 dark:border-amber-500/70 ring-1 ring-amber-400/20",
      cardHover: "hover:border-amber-500 hover:shadow-lg dark:hover:border-amber-400 cursor-pointer",
      cardClickable: true,
      // Accents: Amber / Gold
      accentText: "text-amber-600 dark:text-amber-400",
      accentBorder: "border-amber-400/60 dark:border-amber-500/50",
      titleClass: "text-[#09314F] dark:text-white",
      timeText: "text-amber-700 dark:text-amber-300",
      subjectBadge: "bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-[#E5C378] border-amber-300 dark:border-[#BFA15F]/50",
      statusBadge: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-[#E5C378] dark:border-amber-800/70",
      // Action Button: Vibrant Amber Gradient Join button
      actionButtonClass: "w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 uppercase tracking-wider transition-all active:scale-[0.98]",
      actionText: "Join Class Now",
    };
  }

  if (isSessionProposed(session)) {
    return {
      status: "proposed",
      isCancelled: false,
      isProposed: true,
      isPrivate: false,
      isActive: false,
      // Card Container: White with Yellow / Dusty Gold accents
      cardBg: "bg-white dark:bg-[#09314F]",
      cardBorder: "border-amber-400 dark:border-[#BFA15F]",
      cardHover: "hover:border-amber-500 hover:shadow-lg dark:hover:border-[#d4b977] cursor-pointer",
      cardClickable: true,
      // Accents: Yellow / Dusty Gold
      accentText: "text-amber-600 dark:text-[#E5C378]",
      accentBorder: "border-amber-400/60 dark:border-[#BFA15F]/60",
      titleClass: "text-[#09314F] dark:text-white",
      timeText: "text-amber-700 dark:text-amber-300/90",
      subjectBadge: "bg-amber-50/90 dark:bg-amber-950/40 text-amber-800 dark:text-[#E5C378] border-amber-300 dark:border-[#BFA15F]/50",
      statusBadge: "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-[#E5C378] dark:border-amber-800/70",
      // Action Button: Active Join Class button with gold accent
      actionButtonClass: "w-full py-2.5 px-4 bg-[#BFA15F] hover:bg-[#a98e4f] text-[#09314F] font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 uppercase tracking-wider transition-all",
      actionText: "Join Class Now",
    };
  }

  // Active / Scheduled (Default)
  return {
    status: "active",
    isCancelled: false,
    isProposed: false,
    isActive: true,
    // Card Container: White with Green accents
    cardBg: "bg-white dark:bg-[#09314F]",
    cardBorder: "border-emerald-500/80 dark:border-emerald-500/60",
    cardHover: "hover:border-emerald-600 hover:shadow-lg dark:hover:border-emerald-400 cursor-pointer",
    cardClickable: true,
    // Accents: Emerald Green
    accentText: "text-emerald-700 dark:text-emerald-400",
    accentBorder: "border-emerald-400/60 dark:border-emerald-500/50",
    titleClass: "text-[#09314F] dark:text-white",
    timeText: "text-emerald-700 dark:text-emerald-300/90",
    subjectBadge: "bg-emerald-50/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/60",
    statusBadge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60",
    // Action Button: Standard Zoom navy/red join button
    actionButtonClass: "w-full py-2.5 px-4 bg-[#09314F] hover:bg-[#E83831] text-white font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 uppercase tracking-wider transition-all",
    actionText: "Join Class Now",
  };
};

/**
 * Clean Subject Pill with Vector Icon & Advanced tag
 */
export function SubjectBadge({ session, subjectName, className = "" }) {
  const meta = getSubjectMetadata(subjectName || session?.subject || session?.class?.title || session?.title);
  const styles = getSessionCardStyles(session);

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-sm ${styles.subjectBadge} ${className}`}
      title={meta.displayName}
    >
      <Icon icon={meta.icon} className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.displayName}</span>
      {meta.isAdvanced && (
        <span className="text-[9px] font-extrabold opacity-80 border-l border-current pl-1 ml-0.5">
          ADV
        </span>
      )}
    </span>
  );
}

/**
 * Returns dynamic color classes for calendar cells (Red for Cancelled, Yellow for Proposed, Default for Active)
 */
export const getSessionCellStyles = (session, defaultColors = null) => {
  const card = getSessionCardStyles(session);
  return {
    bg: card.cardBg,
    border: card.cardBorder,
    text: card.accentText,
    badge: card.statusBadge,
    isCancelled: card.isCancelled,
    isProposed: card.isProposed,
  };
};

/**
 * Universal Class Session Status Badge
 * Handles: Cancelled, Proposed, Rescheduled, Recording Uploaded, Scheduled, Completed
 */
export default function ClassSessionStatusBadge({
  session,
  status: propStatus,
  hasRecording: propHasRecording,
  size = "md",
  className = "",
  showScheduled = false,
  showPrivate = true,
}) {
  const isCancelled = propStatus ? (propStatus === "cancelled" || propStatus === "canceled") : isSessionCancelled(session);
  const isProposed = propStatus ? (propStatus === "proposed") : isSessionProposed(session);
  const isRescheduled = propStatus ? (propStatus === "rescheduled") : isSessionRescheduled(session);
  const hasRecording = propHasRecording !== undefined ? propHasRecording : hasSessionRecording(session);
  const isPrivate = showPrivate && !isCancelled && isSessionPrivate(session);

  const shouldShowScheduled = showScheduled && !isCancelled && !isProposed && !isRescheduled && !hasRecording;

  if (!isCancelled && !isProposed && !isRescheduled && !hasRecording && !shouldShowScheduled && !isPrivate) {
    return null;
  }

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[9px] gap-1",
    sm: "px-2.5 py-0.5 text-[10px] gap-1",
    md: "px-3 py-1 text-[11px] gap-1.5",
    lg: "px-3.5 py-1.5 text-xs gap-2",
  }[size] || "px-2.5 py-0.5 text-[10px] gap-1";

  const iconSizes = {
    xs: "w-3 h-3",
    sm: "w-3.5 h-3.5",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  }[size] || "w-3.5 h-3.5";

  return (
    <div className={`inline-flex items-center flex-wrap gap-1.5 ${className}`}>
      {isCancelled && (
        <span
          className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 shadow-xs ${sizeClasses}`}
          title="This session has been cancelled"
        >
          <Icon icon="lucide:x-circle" className={`${iconSizes} text-rose-600 dark:text-rose-400 shrink-0`} />
          <span>Cancelled</span>
        </span>
      )}

      {isPrivate && (
        <span
          className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs ${sizeClasses}`}
          title="Private 1-on-1 Session"
        >
          <Icon icon="mdi:account-lock" className={`${iconSizes} text-white shrink-0`} />
          <span>Private 1-on-1</span>
        </span>
      )}

      {isProposed && !isCancelled && (
        <span
          className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60 shadow-xs ${sizeClasses}`}
          title="Session is proposed"
        >
          <Icon icon="lucide:clock" className={`${iconSizes} text-amber-600 dark:text-amber-400 shrink-0`} />
          <span>Proposed</span>
        </span>
      )}

      {isRescheduled && !isCancelled && !isProposed && (
        <span
          className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-orange-100/70 text-orange-800 border border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60 shadow-xs ${sizeClasses}`}
          title="Session has been rescheduled to an updated date/time"
        >
          <Icon icon="lucide:calendar-clock" className={`${iconSizes} text-orange-600 dark:text-orange-400 shrink-0`} />
          <span>Rescheduled</span>
        </span>
      )}

      {hasRecording && (
        <span
          className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60 shadow-xs ${sizeClasses}`}
          title="Session recording has been uploaded and is ready to watch"
        >
          <Icon icon="lucide:video" className={`${iconSizes} text-purple-600 dark:text-purple-400 shrink-0`} />
          <span>Recording Uploaded</span>
        </span>
      )}

      {shouldShowScheduled && (
        <span
          className={`inline-flex items-center font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 shadow-xs ${sizeClasses}`}
        >
          <Icon icon="lucide:calendar-check" className={`${iconSizes} text-emerald-600 dark:text-emerald-400 shrink-0`} />
          <span>Scheduled</span>
        </span>
      )}
    </div>
  );
}
