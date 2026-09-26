import React, { Suspense, lazy, useState, useEffect } from 'react';
import "katex/dist/katex.min.css";
import SplashScreen from "./components/public/SplashScreen.jsx";
import PageLoader from "./components/common/PageLoader.jsx";
import StickyButtons from "./components/public/StickyButtons.jsx";
import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useStaffAuth } from "./context/StaffAuthContext.jsx";
import { AchievementProvider } from "./context/AchievementContext.jsx";
import usePageTracking from "./hooks/usePageTracking.js";
import ErrorBoundary from "./components/common/ErrorBoundary.jsx";

// Lazy loaded components
const Home = lazy(() => import("./pages/public/Home.jsx"));
const About = lazy(() => import("./pages/public/About.jsx"));
const Contact = lazy(() => import("./pages/public/Contact.jsx"));
const Career = lazy(() => import("./pages/public/Career.jsx"));
const Blog = lazy(() => import("./pages/public/Blog.jsx"));
const StudentBlog = lazy(() => import("./components/private/Students/StudentBlog.jsx"));
const LoginSelection = lazy(() => import("./pages/public/LoginSelection.jsx"));
const SignUp = lazy(() => import("./pages/public/SignUp.jsx"));
const StudentRegistration = lazy(() => import("./pages/public/StudentSignUp/StudentRegistration.jsx"));
const StudentPhoneVerification = lazy(() => import("./pages/public/StudentSignUp/StudentPhoneVerification.jsx"));
const StudentEmailVerification = lazy(() => import("./pages/public/StudentSignUp/StudentEmailVerification.jsx"));
const StudentBiodata = lazy(() => import("./pages/public/StudentSignUp/StudentBiodata.jsx"));
const StudentTrainingSelection = lazy(() => import("./pages/public/StudentSignUp/StudentTrainingSelection.jsx"));
const StudentSubjectSelection = lazy(() => import("./pages/public/StudentSignUp/StudentSubjectSelection.jsx").then(module => ({ default: module.StudentSubjectSelection })));
const StudentPaymentSuccessScreen = lazy(() => import("./pages/public/StudentSignUp/StudentPaymentSuccessScreen.jsx").then(module => ({ default: module.StudentPaymentSuccessScreen })));
const GuardianLogin = lazy(() => import("./pages/public/GuardianLogin.jsx"));
const GuardianDashboard = lazy(() => import("./pages/Guardians/GuardianDashboard.jsx"));
const GuardianPerformance = lazy(() => import("./pages/Guardians/GuardianPerformance.jsx"));
const GuardianAuditLogs = lazy(() => import("./pages/Guardians/GuardianAuditLogs.jsx"));
const GuardianPayments = lazy(() => import("./pages/Guardians/GuardianPayments.jsx"));
const GuardianAddWard = lazy(() => import("./pages/Guardians/GuardianAddWard.jsx"));
const GuardianRegistration = lazy(() => import("./pages/public/GuardianSignup/GuardianRegistration.jsx").then(module => ({ default: module.GuardianRegistration })));
const GuardianPhoneVerification = lazy(() => import("./pages/public/GuardianSignup/GuardianPhoneVerification.jsx"));
const GuardianEmailVerification = lazy(() => import("./pages/public/GuardianSignup/GuardianEmailVerification.jsx"));
const GuardianAddStudents = lazy(() => import("./pages/public/GuardianSignup/GuardianAddStudents.jsx"));
const AddedStudentOTP = lazy(() => import("./pages/public/GuardianSignup/AddedStudentOTP.jsx"));
const GuardianStudentRegistration = lazy(() => import("./pages/public/GuardianSignup/GuardianStudentRegistration.jsx"));
const GuardianTrainingSelection = lazy(() => import("./pages/public/GuardianSignup/GuardianTrainingSelection.jsx"));
const GuardianSubjectSelection = lazy(() => import("./pages/public/GuardianSignup/GuardianSubjectSelection.jsx"));
const GuardianTrainingDuration = lazy(() => import("./pages/public/GuardianSignup/GuardianTrainingDuration.jsx"));
const GuardianTrainingPayment = lazy(() => import("./pages/public/GuardianSignup/GuardianTrainingPayment.jsx"));
const StudentTrainingDuration = lazy(() => import("./pages/public/StudentSignUp/StudentTrainingDuration.jsx").then(module => ({ default: module.StudentTrainingDuration })));
const StudentTrainingPayment = lazy(() => import("./pages/public/StudentSignUp/StudentTrainingPayment.jsx").then(module => ({ default: module.StudentTrainingPayment })));
const StudentLogin = lazy(() => import("./pages/public/StudentLogin.jsx"));
const StudentDashboard = lazy(() => import("./pages/Students/StudentDashboard.jsx"));
const StudentNotifications = lazy(() => import("./pages/Students/StudentNotifications.jsx"));
const StaffNotification = lazy(() => import("./components/private/staffs/StaffNotification.jsx"));
const StudentPaymentDisplay = lazy(() => import("./pages/Students/StudentPaymentDisplay.jsx"));
const StudentClassSchedule = lazy(() => import("./pages/Students/StudentClassSchedule.jsx"));
const StudentCalendar = lazy(() => import("./pages/Students/StudentCalendar.jsx"));
const ComingSoon = lazy(() => import("./pages/public/ComingSoon.jsx"));
const Unauthorized = lazy(() => import("./pages/public/Unauthorized.jsx"));
const NotFound = lazy(() => import("./pages/public/NotFound.jsx"));
const CampaignDepartmentSelection = lazy(() => import("./pages/public/CampaignSignUp/CampaignDepartmentSelection.jsx"));
const CampaignSubjectSelection = lazy(() => import("./pages/public/CampaignSignUp/CampaignSubjectSelection.jsx").then(module => ({ default: module.CampaignSubjectSelection })));
const CampaignBiodata = lazy(() => import("./pages/public/CampaignSignUp/CampaignBiodata.jsx"));
const CampaignEmailVerification = lazy(() => import("./pages/public/CampaignSignUp/CampaignEmailVerification.jsx"));
const CampaignPayment = lazy(() => import("./pages/public/CampaignSignUp/CampaignPayment.jsx"));
const StaffLogin = lazy(() => import("./pages/public/StaffLogin.jsx"));
const StaffForgotPassword = lazy(() => import("./pages/public/StaffForgotPassword.jsx"));
const StaffDashboard = lazy(() => import("./pages/staffs/admin/StaffDashboard.jsx"));
const StaffRegistration = lazy(() => import("./pages/staffs/admin/StaffRegistration.jsx"));
const StaffManagement = lazy(() => import("./pages/staffs/admin/StaffManagement.jsx"));
const AdminPaymentHistory = lazy(() => import("./pages/staffs/admin/AdminPaymentHistory.jsx"));
const AdminAssessments = lazy(() => import("./pages/staffs/admin/AdminAssessments.jsx"));
const TutorDashboard = lazy(() => import("./pages/staffs/tutor/TutorDashboard.jsx"));
const TutorMasterClass = lazy(() => import("./pages/staffs/tutor/TutorMasterClass.jsx"));
const CourseAdvisorDashboard = lazy(() => import("./pages/staffs/courseadvisor/CourseAdvisorDashboard.jsx"));
const CourseAdvisorStudentManagement = lazy(() => import("./pages/staffs/courseadvisor/CourseAdvisorStudentManagement.jsx"));
const CourseAdvisorGuardianManagement = lazy(() => import("./pages/staffs/courseadvisor/CourseAdvisorGuardianManagement.jsx"));
const CourseAdvisorComingSoon = lazy(() => import("./pages/staffs/courseadvisor/CourseAdvisorComingSoon.jsx"));
const CourseAdvisorMasterClass = lazy(() => import("./pages/staffs/courseadvisor/CourseAdvisorMasterClass.jsx"));
const CourseAdvisorCalendar = lazy(() => import("./pages/staffs/courseadvisor/CourseAdvisorCalendar.jsx"));
const TutorCalendar = lazy(() => import("./pages/staffs/tutor/TutorCalendar.jsx"));
const StaffMasterClassList = lazy(() => import("./pages/staffs/admin/StaffMasterClassList.jsx"));
const StaffStudentSchedule = lazy(() => import("./pages/staffs/StaffStudentSchedule.jsx"));
const CoursesManagement = lazy(() => import("./pages/staffs/admin/CoursesManagement.jsx"));
const StudentPaymentHistory = lazy(() => import("./pages/Students/StudentPaymentDisplay.jsx"));
const StudentMeetWrapper = lazy(() => import("./pages/Students/StudentMeetWrapper.jsx"));
const StaffMeetWrapper = lazy(() => import("./pages/staffs/StaffMeetWrapper.jsx"));
const StaffAppMeetWrapper = lazy(() => import("./pages/staffs/StaffAppMeetWrapper.jsx"));
const ClassRoom = lazy(() => import("./pages/ClassRoom.jsx"));
const StudentSettings = lazy(() => import("./pages/Students/StudentSettings.jsx"));
const RecordedClasses = lazy(() => import("./pages/Students/RecordedClasses.jsx"));
const StudentGames = lazy(() => import("./pages/Students/StudentGames.jsx"));
const StudentExam = lazy(() => import("./pages/Students/StudentExam.jsx"));
const StudentScholarship = lazy(() => import("./pages/Students/StudentScholarship.jsx"));
const StudentLeaderboard = lazy(() => import("./pages/Students/StudentLeaderboard.jsx"));
const StudentFeedback = lazy(() => import("./pages/Students/StudentFeedback.jsx"));
const StaffEmailVerification = lazy(() => import("./pages/public/StaffSignUp/StaffEmailVerification.jsx"));
const StaffFeedback = lazy(() => import("./pages/staffs/StaffFeedback.jsx"));
const StaffLeaderboard = lazy(() => import("./pages/staffs/admin/Leaderboard.jsx"));
const AdminStudentManagement = lazy(() => import("./pages/staffs/admin/AdminStudentManagement.jsx"));
const AdminGuardianManagement = lazy(() => import("./pages/staffs/admin/AdminGuardianManagement.jsx"));
const ExamManagement = lazy(() => import("./pages/staffs/admin/ExamManagement.jsx"));
const ExamQuestion = lazy(() => import("./components/private/staffs/exams/ExamQuestion.jsx"));
const EditExamHeader = lazy(() => import("./components/private/staffs/exams/EditExamHeader.jsx"));
const ExamSubjectList = lazy(() => import("./components/private/staffs/exams/ExamSubjectList.jsx"));
const ExamYearList = lazy(() => import("./components/private/staffs/exams/ExamYearList.jsx"));
const ExamQuestionList = lazy(() => import("./components/private/staffs/exams/ExamQuestionList.jsx"));
const Training = lazy(() => import("./pages/public/Training.jsx"));
const CourseDetails = lazy(() => import("./pages/public/CourseDetails.jsx"));
const CognitiveTest = lazy(() => import("./pages/public/CognitiveTest.jsx"));
const SchoolCognitiveTests = lazy(() => import("./pages/staffs/admin/SchoolCognitiveTests.jsx"));
const AdminCreateStudent = lazy(() => import("./pages/staffs/admin/AdminCreateStudent.jsx"));
const BlogPost = lazy(() => import("./pages/public/BlogPost.jsx"));
const CooDashboard = lazy(() => import("./pages/staffs/coo/CooDashboard.jsx"));
const BlogManagement = lazy(() => import("./pages/staffs/admin/BlogManagement.jsx"));
const AuditLog = lazy(() => import("./pages/staffs/admin/AuditLog.jsx"));
const AdminCalendar = lazy(() => import("./pages/staffs/admin/AdminCalendar.jsx"));
const BadgeDemo = lazy(() => import("./pages/public/BadgeDemo.jsx"));
const StudentAchievements = lazy(() => import("./pages/Students/StudentAchievements.jsx"));
const TutorAssessments = lazy(() => import("./pages/staffs/tutor/TutorAssessments.jsx"));
const StudentAssessments = lazy(() => import("./pages/Students/StudentAssessments.jsx"));
const StudentAssessmentTaker = lazy(() => import("./pages/Students/StudentAssessmentTaker.jsx"));

function App() {
  const { isSplashing: isUserSplashing } = useAuth();
  const { isSplashing: isStaffSplashing } = useStaffAuth();
  const [initialLoad, setInitialLoad] = useState(true);

  // Initialize page tracking for Google Analytics / GTM
  usePageTracking();
  
  const showSplash = isUserSplashing || isStaffSplashing || initialLoad;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem("global_referral_code", ref);
    }
  }, []);

  return (
    <>
      <SplashScreen 
        isGlobal={true} 
        isVisible={showSplash} 
        onInitialLoadDone={() => setInitialLoad(false)} 
      />

      <StickyButtons />

      <AchievementProvider>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/cognitive-test" element={<CognitiveTest />} />
            <Route path="/guardian/login" element={<GuardianLogin />} />
            <Route path="/guardian/dashboard" element={<GuardianDashboard />} />
            <Route path="/guardian/performance" element={<GuardianPerformance />} />
            <Route path="/guardian/audit-logs" element={<GuardianAuditLogs />} />
            <Route path="/guardian/payments" element={<GuardianPayments />} />
            <Route path="/guardian/add-ward" element={<GuardianAddWard />} />
            <Route path="/login" element={<LoginSelection />} />
            <Route path="/badge-demo" element={<BadgeDemo />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/career" element={<Career />} />
            <Route path="/training" element={<Training />} />
            <Route path="/program/:slug" element={<CourseDetails />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/register" element={<SignUp />} />
            <Route path="/comingsoon" element={<ComingSoon />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/forgot-password" element={<StaffForgotPassword />} />
            <Route path="/staffs/forgot-password" element={<StaffForgotPassword />} />
            <Route path="/staff/reset-password" element={<StaffForgotPassword />} />
            <Route path="/staffs/reset-password" element={<StaffForgotPassword />} />
            <Route path="/staff-verify-email" element={<StaffEmailVerification />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Guardian Registration Routes */}
            <Route path="/register/guardian" element={<GuardianRegistration />} />
            <Route path="/register/guardian/phone/verify" element={<GuardianPhoneVerification />} />
            <Route path="/register/guardian/email/verify" element={<GuardianEmailVerification />} />
            <Route path="/register/guardian/addstudent" element={<GuardianAddStudents />} />
            <Route path="/register/guardian/student/otp-verification" element={<AddedStudentOTP />} />
            <Route path="/register/guardian/student/registration" element={<GuardianStudentRegistration />} />
            <Route path="/register/guardian/training/selection" element={<GuardianTrainingSelection />} />
            <Route path="/register/guardian/subject/selection" element={<GuardianSubjectSelection />} />
            <Route path="/register/guardian/training/duration" element={<GuardianTrainingDuration />} />
            <Route path="/register/guardian/training/payment" element={<GuardianTrainingPayment />} />

            {/* Campaign Public Registration Routes */}
            <Route path="/campaign/gce/department" element={<CampaignDepartmentSelection />} />
            <Route path="/campaign/gce/subjects" element={<CampaignSubjectSelection />} />
            <Route path="/campaign/gce/biodata" element={<CampaignBiodata />} />
            <Route path="/campaign/gce/email-verify" element={<CampaignEmailVerification />} />
            <Route path="/campaign/gce/payment" element={<CampaignPayment />} />

            {/* Student Public Registration Routes */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/register/student" element={<StudentRegistration />} />
            <Route path="/register/student/biodata" element={<StudentBiodata />} />
            <Route path="/register/student/phone/verify" element={<StudentPhoneVerification />} />
            <Route path="/register/student/email/verify" element={<StudentEmailVerification />} />
            <Route path="/register/student/training/selection" element={<StudentTrainingSelection />} />
            <Route path="/register/student/subject/selection" element={<StudentSubjectSelection />} />
            <Route path="/register/student/training/duration" element={<StudentTrainingDuration />} />
            <Route path="/register/student/training/payment" element={<StudentTrainingPayment />} />
            <Route path="/register/student/training/payment/success" element={<StudentPaymentSuccessScreen />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/classroom/:classSessionId" element={<ClassRoom />} />
              <Route path="/zoom/masterclass/:classSessionId" element={<ClassRoom />} />
              <Route path="/zoom/masterclass/class/:classSessionId" element={<ClassRoom />} />
              {/* Student Routes */}
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/notifications" element={<StudentNotifications />} />
              <Route path="/student/payments" element={<StudentPaymentDisplay />} />
              <Route path="/student/payment-history" element={<StudentPaymentHistory />} />
              <Route path="/student/class-schedule" element={<StudentClassSchedule />} />
              <Route path="/student/calendar" element={<StudentCalendar />} />
              <Route path="/student/meet" element={<StudentMeetWrapper />} />
              <Route path="/student/settings" element={<StudentSettings />} />
              <Route path="/student/feedback" element={<StudentFeedback />} />
              <Route path="/student/recorded-classes" element={<RecordedClasses />} />
              <Route path="/student/games" element={<StudentGames />} />
              <Route path="/student/exams" element={<StudentExam />} />
              <Route path="/student/achievements" element={<StudentAchievements />} />
              <Route path="/student/assessments" element={<StudentAssessments />} />
              <Route path="/student/assessments/:id" element={<StudentAssessmentTaker />} />
              <Route path="/student/scholarship" element={<StudentScholarship />} />
              <Route path="/student/leaderboard" element={<StudentLeaderboard />} />
              <Route path="/student/blog" element={<StudentBlog />} />

              {/* Staff Routes */}
              <Route path="/staffs/dashboard" element={<StaffDashboard />} />
              <Route path="/staffs/assessments" element={<AdminAssessments />} />
              <Route path="/staffs/coo/dashboard" element={<CooDashboard />} />
              <Route path="/staffs/manage-blogs" element={<BlogManagement />} />
              <Route path="/staffs/audit-logs" element={<AuditLog />} />
              <Route path="/staffs/feedback" element={<StaffFeedback />} />
              <Route path="/staffs/leaderboard" element={<StaffLeaderboard />} />
              <Route path="/staffs/notifications" element={<StaffNotification />} />
              <Route path="/staffs/meet" element={<StaffMeetWrapper />} />
              <Route path="/staffs/meet/app" element={<StaffAppMeetWrapper />} />
              <Route path="/staffs/tutor/dashboard" element={<TutorDashboard />} />
              <Route path="/staffs/tutor/master-class" element={<TutorMasterClass />} />
              <Route path="/staffs/tutor/calendar" element={<TutorCalendar />} />
              <Route path="/staffs/tutor/assessments" element={<TutorAssessments />} />
              <Route path="/staffs/course-advisor/dashboard" element={<CourseAdvisorDashboard />} />
              <Route path="/staffs/course-advisor/students" element={<CourseAdvisorStudentManagement />} />
              <Route path="/staffs/course-advisor/guardians" element={<CourseAdvisorGuardianManagement />} />
              <Route path="/staffs/course-advisor/master-class" element={<CourseAdvisorMasterClass />} />
              <Route path="/staffs/course-advisor/student-schedule" element={<StaffStudentSchedule />} />
              <Route path="/staffs/course-advisor/calendar" element={<CourseAdvisorCalendar />} />
              <Route path="/staffs/course-advisor/exams" element={<ExamManagement />} />
              <Route path="/staffs/course-advisor/exams/:bodyId/subjects" element={<ExamSubjectList />} />
              <Route path="/staffs/course-advisor/exams/:bodyId/subjects/:subjectId/years" element={<ExamYearList />} />
              <Route path="/staffs/course-advisor/exams/:bodyId/subjects/:subjectId/years/:yearId/questions" element={<ExamQuestionList />} />
              <Route path="/staffs/course-advisor/settings" element={<CourseAdvisorComingSoon title="Settings" />} />
              <Route path="/staffs/staff-registration" element={<StaffRegistration />} />
              <Route path="/staffs/manage-staffs" element={<StaffManagement />} />
              <Route path="/staffs/manage-students" element={<AdminStudentManagement />} />
              <Route path="/staffs/manage-guardians" element={<AdminGuardianManagement />} />
              <Route path="/staffs/create-student" element={<AdminCreateStudent />} />
              <Route path="/staffs/master-class" element={<StaffMasterClassList />} />
              <Route path="/staffs/student-schedule" element={<StaffStudentSchedule />} />
              <Route path="/staffs/calendar" element={<AdminCalendar />} />
              <Route path="/staffs/recorded-classes" element={<RecordedClasses />} />
              <Route path="/staffs/video-vault" element={<RecordedClasses />} />
              <Route path="/staffs/manage-courses" element={<CoursesManagement />} />
              <Route path="/staffs/manage-exams" element={<ExamManagement />} />
              <Route path="/staffs/school-tests" element={<SchoolCognitiveTests />} />
              <Route path="/staffs/manage-exams/question" element={<ExamQuestion />} />
              <Route path="/staffs/manage-exams/question/:id" element={<ExamQuestion />} />
              <Route path="/staffs/manage-exams/edit/:id" element={<EditExamHeader />} />
              <Route path="/staffs/manage-exams/:bodyId/subjects" element={<ExamSubjectList />} />
              <Route path="/staffs/manage-exams/:bodyId/subjects/:subjectId/years" element={<ExamYearList />} />
              <Route path="/staffs/manage-exams/:bodyId/subjects/:subjectId/years/:yearId/questions" element={<ExamQuestionList />} />
              <Route path="/staffs/payments" element={<AdminPaymentHistory />} />
            </Route>

            {/* Catch-all Not Found Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </AchievementProvider>
    </>
  );
}

export default App;
