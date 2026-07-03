import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ko from "./locales/ko.json";
import en from "./locales/en.json";

const savedLanguage = localStorage.getItem("language");
const initialLanguage = savedLanguage === "en" || savedLanguage === "ko" ? savedLanguage : "ko";

i18n.use(initReactI18next).init({
  resources: {
    ko: { translation: ko },
    en: { translation: en },
  },
  lng: initialLanguage,
  fallbackLng: "ko",
  interpolation: {
    escapeValue: false,
  },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("language", lng);
});

export default i18n;
