import { createContext, useState, useContext } from "react";

// Context 객체 생성
// 로그인 상태를 앱 전체에서 공유
const AuthContext = createContext(null);

// AuthProvider는 로그인 상태를 관리하고 하위 컴포넌트에 제공하는 컴포넌트
// App.js에서 전체 앱을 감싸면, 앱 어디서든 로그인 상태 쓸 수 있음
export const AuthProvider =({ children }) => {
    // token: JWT 액세스 토큰 (로그인 시 저장, 로그아웃 시 삭제)
    // localStorage에서 초기값을 가져옴. 새로고침해도 로그인 유지
    const [token, setToken] = useState(localStorage.getItem("token") || null);

    // user: 로그인한 유저 정보 (id, username, nickname)
    // localStorage에서 초기값 가져옴
    const [user, setUser] = useState(
        JSON.parse(localStorage.getItem("user")) || null
    );

    // 로그인 함수
    // 토큰과 유저 정보를 state에 저장하고, localStorage에도 저장
    const loginAction = (token, user) => {
        setToken(token);
        setUser(user);
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
    };

    // 로그아웃 함수
    // state와 localStorage에서 토큰과 유저 정보를 모두 삭제
    const logoutAction = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
    };

    return (
    // value에 넣은 것들을 하위 컴포넌트에서 꺼내 쓸 수 있습니다.
    <AuthContext.Provider value={{ token, user, loginAction, logoutAction }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth : 컴포넌트에서 AuthContext를 쉽게 꺼내 쓰기 위한 커스텀 훅
// const { token, user, loginAction, logoutAction } = useAuth()
export const useAuth = () => useContext(AuthContext);