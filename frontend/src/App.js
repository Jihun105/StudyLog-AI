import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import PostDetailPage from "./pages/PostDetailPage";
import PostCreatePage from "./pages/PostCreatePage";
import PostEditPage from "./pages/PostEditPage";
import QuizPage from "./pages/QuizPage";
import DocumentsPage from "./pages/DocumentsPage";
import TodoPage from "./pages/TodoPage";
import AllFoldersPage from "./pages/AllFoldersPage";
import SettingsPage from "./pages/SettingsPage";
import AdminDashboard from "./pages/AdminDashboard";
import Sidebar from "./components/Sidebar";
import SessionExpiredBanner from "./components/SessionExpiredBanner";
import PresenceConnector from "./components/PresenceConnector";

function PrivateRoute({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  // 로그인 화면에 "원래 어디로 가려 했는지"를 같이 넘겨서, 로그인 성공 후 그 자리로
  // 돌아갈 수 있게 함(글쓰기 중 세션 만료 -> 재로그인 시 작성하던 페이지로 복귀)
  return user ? children : <Navigate to="/login" state={{ from: location }} replace />;
}

// 로그인은 했지만 관리자가 아닌 사용자가 주소창에 직접 /admin-dashboard를 쳐서
// 들어오는 경우를 막기 위한 가드. PrivateRoute와 중첩해서 사용.
function AdminRoute({ children }) {
  const { user } = useAuth();
  return user?.is_admin ? children : <Navigate to="/" replace />;
}

function RootRoute() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LandingPage />;
}

// 로그인 후 보이는 레이아웃: 사이드바 + 메인 콘텐츠
function AppLayout({ children }) {
  const { user } = useAuth();
  if (!user) return children;

  return (
    // 세로는 각 페이지 내부 스크롤 영역이 처리하니 숨기고, 가로는 창이 너무 좁아져도
    // 내용이 잘려서 사라지지 않고 스크롤로 볼 수 있도록 auto로 둠
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-x-auto overflow-y-hidden">
      {children}
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <SessionExpiredBanner />
        <PresenceConnector />
        <Routes>
          {/* 비로그인 페이지 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 로그인 후 페이지 (사이드바 포함) */}
          <Route path="/" element={<AppLayout><RootRoute /></AppLayout>} />
          <Route path="/notes" element={<AppLayout><PrivateRoute><HomePage /></PrivateRoute></AppLayout>} />
          <Route path="/folders" element={<AppLayout><PrivateRoute><AllFoldersPage /></PrivateRoute></AppLayout>} />
          <Route path="/posts/:id" element={<AppLayout><PrivateRoute><PostDetailPage /></PrivateRoute></AppLayout>} />
          <Route path="/posts/create" element={<AppLayout><PrivateRoute><PostCreatePage /></PrivateRoute></AppLayout>} />
          <Route path="/posts/:id/edit" element={<AppLayout><PrivateRoute><PostEditPage /></PrivateRoute></AppLayout>} />
          <Route path="/quiz" element={<AppLayout><PrivateRoute><QuizPage /></PrivateRoute></AppLayout>} />
          <Route path="/documents" element={<AppLayout><PrivateRoute><DocumentsPage /></PrivateRoute></AppLayout>} />
          <Route path="/todos" element={<AppLayout><PrivateRoute><TodoPage /></PrivateRoute></AppLayout>} />
          <Route path="/settings" element={<AppLayout><PrivateRoute><SettingsPage /></PrivateRoute></AppLayout>} />
          <Route path="/admin-dashboard" element={<AppLayout><PrivateRoute><AdminRoute><AdminDashboard /></AdminRoute></PrivateRoute></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;