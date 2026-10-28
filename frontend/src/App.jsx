import { Route, Routes } from "react-router-dom";
import PublicLayout from "./components/PublicLayout";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import CoursesPage from "./pages/CoursesPage";
import EnrollmentPage from "./pages/EnrollmentPage";
import FaqPage from "./pages/FaqPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import VideosPage from "./pages/VideosPage";
import Admin from "./Admin";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Admin />} />
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:id" element={<CourseDetailPage />} />
        <Route path="enroll" element={<EnrollmentPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
