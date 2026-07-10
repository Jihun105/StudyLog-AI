import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, Mail } from "lucide-react";
import { submitContact } from "../api/contacts";

// FAQ 아코디언 항목 - 답변이 길어질 수 있어서 접었다 펼치는 형태로
export function FaqItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 dark:border-gray-800 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-sm font-medium text-gray-800 dark:text-gray-100"
      >
        {question}
        <ChevronDown size={16} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}

// 문의 폼 - 로그인 여부와 무관하게 누구나 제출 가능(비로그인 랜딩 페이지, 로그인 후 사이드바의
// "문의하기" 페이지 양쪽에서 재사용됨). 이메일 알림 대신 관리자 대시보드의 "문의함"에서
// 확인하는 방식이라, 제출 성공 시엔 그냥 잘 접수됐다는 안내만 보여주면 됨
export function ContactForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    try {
      await submitContact(form);
      setForm({ name: "", email: "", message: "" });
      setStatus("success");
    } catch (err) {
      setStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md mx-auto">
      <input
        value={form.name}
        onChange={handleChange("name")}
        placeholder={t("landing.contactNamePlaceholder")}
        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <input
        type="email"
        value={form.email}
        onChange={handleChange("email")}
        placeholder={t("landing.contactEmailPlaceholder")}
        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <textarea
        value={form.message}
        onChange={handleChange("message")}
        placeholder={t("landing.contactMessagePlaceholder")}
        rows={4}
        className="border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-60"
      >
        <Mail size={15} />
        {status === "submitting" ? t("landing.contactSubmitting") : t("landing.contactSubmit")}
      </button>
      {status === "success" && (
        <p className="text-sm text-emerald-500 text-center">{t("landing.contactSuccess")}</p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-500 text-center">{t("landing.contactError")}</p>
      )}
    </form>
  );
}

// FAQ + 문의 폼 묶음 - 비로그인 랜딩 페이지(LandingPage)와 로그인 후 사이드바의 "문의하기"
// 페이지(ContactPage) 양쪽에서 그대로 재사용. 배경/여백 등 페이지별 바깥 레이아웃은
// 각 페이지가 직접 감싸고, 이 컴포넌트는 내용만 담당
function ContactSection() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-16">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-10">
          {t("landing.faqTitle")}
        </h2>
        <div>
          <FaqItem question={t("landing.faqQ1")} answer={t("landing.faqA1")} />
          <FaqItem question={t("landing.faqQ2")} answer={t("landing.faqA2")} />
          <FaqItem question={t("landing.faqQ3")} answer={t("landing.faqA3")} />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 text-center mb-2">
          {t("landing.contactTitle")}
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center mb-10">
          {t("landing.contactDesc")}
        </p>
        <ContactForm />
      </div>
    </div>
  );
}

export default ContactSection;
