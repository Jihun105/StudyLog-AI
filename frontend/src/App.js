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
import ContactPage from "./pages/ContactPage";
import MaintenancePage from "./pages/MaintenancePage";
import Sidebar from "./components/Sidebar";
import SessionExpiredBanner from "./components/SessionExpiredBanner";
import PresenceConnector from "./components/PresenceConnector";
import { useMaintenanceStatus } from "./hooks/useMaintenanceStatus";

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

// 점검모드가 켜져 있으면 관리자를 제외한 모두에게 점검 페이지를 보여줌. "/login"만 예외로
// 통과시켜서 관리자가 로그인 자체는 할 수 있게 함(로그인해야 is_admin 여부를 알 수 있으므로).
// 백엔드가 완전히 죽어도 useMaintenanceStatus가 같은 방식으로 감지하므로 이 게이트가
// nginx의 정적 프론트엔드 서빙과 함께 "사용자는 항상 정상적인 점검 페이지를 본다"를 보장함
function MaintenanceGate({ children }) {
  const maintenanceOn = useMaintenanceStatus();
  const { user } = useAuth();
  const location = useLocation();

  if (maintenanceOn && !user?.is_admin && location.pathname !== "/login") {
    return <MaintenancePage />;
  }
  return children;
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
        <MaintenanceGate>
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
            <Route path="/contact" element={<AppLayout><PrivateRoute><ContactPage /></PrivateRoute></AppLayout>} />
            <Route path="/admin-dashboard" element={<AppLayout><PrivateRoute><AdminRoute><AdminDashboard /></AdminRoute></PrivateRoute></AppLayout>} />
          </Routes>
        </MaintenanceGate>
      </BrowserRouter>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;