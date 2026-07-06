import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getMyProfile, updateMyProfile, changeMyPassword, deleteMyAccount } from "../api/users";
import SidebarLayout, { SidebarSpacer } from "../components/SidebarLayout";
import { User, KeyRound, Trash2, Loader2, Check, Sun, Moon, Languages } from "lucide-react";

function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { token, updateUser, logoutAction } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const deleteConfirmWord = t("settings.deleteConfirmWord");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getMyProfile(token);
        setProfile(data);
        setNickname(data.nickname);
        setEmail(data.email);
      } catch (error) {}
    };
    load();
  }, [token]);

  const handleGoToNotes = (categoryId) => {
    navigate(categoryId === null ? "/notes" : `/notes?category=${categoryId}`);
  };

  const handleLanguageChange = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileMessage("");
    setProfileError("");
    try {
      const data = await updateMyProfile({ nickname, email }, token);
      setProfile(data);
      updateUser({ nickname: data.nickname });
      setProfileMessage(t("settings.saved"));
    } catch (error) {
      setProfileError(error.response?.data?.detail || t("settings.saveFailed"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordMessage("");
    setPasswordError("");
    if (newPassword !== newPasswordConfirm) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    setPasswordSaving(true);
    try {
      await changeMyPassword(
        { current_password: currentPassword, new_password: newPassword },
        token
      );
      setPasswordMessage(t("settings.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (error) {
      setPasswordError(error.response?.data?.detail || t("settings.passwordChangeFailed"));
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== deleteConfirmWord) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteMyAccount(token);
      logoutAction();
      navigate("/");
    } catch (error) {
      setDeleteError(t("settings.deleteAccountFailed"));
      setDeleting(false);
    }
  };

  return (
    <SidebarLayout selectedCategoryId={null} onSelectCategory={handleGoToNotes}>
      <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="sticky top-0 bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-8 py-4 flex items-center z-10">
          <div className="flex items-center gap-2">
            <SidebarSpacer />
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t("settings.title")}</h1>
          </div>
        </div>

        <div className="px-8 py-8 max-w-2xl flex flex-col gap-6">
          {/* 화면 테마 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              {theme === "dark" ? (
                <Moon size={16} className="text-blue-600 dark:text-blue-400" />
              ) : (
                <Sun size={16} className="text-blue-600 dark:text-blue-400" />
              )}
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("settings.themeTitle")}</h2>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {theme === "dark" ? t("settings.themeDarkOn") : t("settings.themeLightOn")}
              </p>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-sm border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {theme === "dark" ? (
                  <>
                    <Sun size={14} /> {t("settings.switchToLight")}
                  </>
                ) : (
                  <>
                    <Moon size={14} /> {t("settings.switchToDark")}
                  </>
                )}
              </button>
            </div>
          </section>

          {/* 언어 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Languages size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("settings.languageTitle")}</h2>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 dark:text-gray-500">{t("settings.languageDesc")}</p>
              <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
                <button
                  onClick={() => handleLanguageChange("ko")}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    i18n.language === "ko"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  한국어
                </button>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`text-sm px-3 py-1.5 rounded-md transition-colors ${
                    i18n.language === "en"
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  English
                </button>
              </div>
            </div>
          </section>

          {/* 프로필 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("settings.profileTitle")}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">{t("settings.username")}</label>
                <input
                  value={profile?.username || ""}
                  disabled
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">{t("settings.nickname")}</label>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 dark:text-gray-500 mb-1 block">{t("settings.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {profileError && <p className="text-xs text-red-500 dark:text-red-400">{profileError}</p>}
              {profileMessage && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check size={12} /> {profileMessage}
                </p>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="self-start text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {profileSaving && <Loader2 size={14} className="animate-spin" />} {t("common.save")}
              </button>
            </div>
          </section>

          {/* 비밀번호 변경 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-blue-600 dark:text-blue-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{t("settings.passwordTitle")}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="password"
                placeholder={t("settings.currentPassword")}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder={t("settings.newPassword")}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder={t("settings.newPasswordConfirm")}
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {passwordError && <p className="text-xs text-red-500 dark:text-red-400">{passwordError}</p>}
              {passwordMessage && (
                <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                  <Check size={12} /> {passwordMessage}
                </p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={passwordSaving || !currentPassword || !newPassword}
                className="self-start text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {passwordSaving && <Loader2 size={14} className="animate-spin" />} {t("settings.change")}
              </button>
            </div>
          </section>

          {/* 계정 삭제 */}
          <section className="bg-white dark:bg-gray-800 rounded-xl border border-red-100 dark:border-red-500/30 p-6">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 size={16} className="text-red-500 dark:text-red-400" />
              <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">{t("settings.deleteAccountTitle")}</h2>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
              {t("settings.deleteAccountDesc")}
            </p>
            <div className="flex items-center gap-2">
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={t("settings.deleteConfirmPlaceholder")}
                className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-400"
              />
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== deleteConfirmWord || deleting}
                className="text-sm bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 disabled:opacity-40 flex items-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />} {t("settings.deleteAccount")}
              </button>
            </div>
            {deleteError && <p className="text-xs text-red-500 dark:text-red-400 mt-2">{deleteError}</p>}
          </section>
        </div>
      </div>
    </SidebarLayout>
  );
}

export default SettingsPage;
