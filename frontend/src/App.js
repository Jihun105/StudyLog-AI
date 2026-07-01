import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostCreatePage from "./pages/PostCreatePage";
import PostEditPage from "./pages/PostEditPage";
import QuizPage from "./pages/QuizPage";
import Sidebar from "./components/Sidebar";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function RootRoute() {
  const { user } = useAuth();
  return user ? <HomePage /> : <LandingPage />;
}

// 로그인 후 보이는 레이아웃: 사이드바 + 메인 콘텐츠
function AppLayout({ children }) {
  const { user } = useAuth();
  if (!user) return children;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {children}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* 비로그인 페이지 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 로그인 후 페이지 (사이드바 포함) */}
          <Route path="/" element={<AppLayout><RootRoute /></AppLayout>} />
          <Route path="/posts/:id" element={<AppLayout><PrivateRoute><PostDetailPage /></PrivateRoute></AppLayout>} />
          <Route path="/posts/create" element={<AppLayout><PrivateRoute><PostCreatePage /></PrivateRoute></AppLayout>} />
          <Route path="/posts/:id/edit" element={<AppLayout><PrivateRoute><PostEditPage /></PrivateRoute></AppLayout>} />
          <Route path="/quiz" element={<AppLayout><PrivateRoute><QuizPage /></PrivateRoute></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;