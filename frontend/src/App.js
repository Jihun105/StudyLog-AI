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
import Navbar from "./components/Navbar";

// 로그인 여부에 따라 접근을 제한하는 컴포넌트
// 비로그인 시 로그인 페이지로 리다이렉트
function PrivateRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

// "/" 경로: 로그인 여부에 따라 다른 페이지 표시
function RootRoute() {
  const { user } = useAuth();
  return user ? <HomePage /> : <LandingPage />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          {/* 루트: 로그인 여부에 따라 HomePage 또는 LandingPage */}
          <Route path="/" element={<RootRoute />} />

          {/* 비로그인도 접근 가능 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* 로그인해야만 접근 가능 */}
          <Route path="/posts/:id" element={<PrivateRoute><PostDetailPage /></PrivateRoute>} />
          <Route path="/posts/create" element={<PrivateRoute><PostCreatePage /></PrivateRoute>} />
          <Route path="/posts/:id/edit" element={<PrivateRoute><PostEditPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;