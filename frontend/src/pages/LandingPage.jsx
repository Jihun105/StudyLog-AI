import { useNavigate } from "react-router-dom";
import { FileText, BrainCircuit, Sparkles, Database, ArrowRight } from "lucide-react";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* 네비게이션 */}
      <nav className="flex items-center justify-between px-12 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">S</div>
          <span className="font-bold text-gray-800 text-lg">StudyBrain AI</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            로그인
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            시작하기
          </button>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <div className="flex flex-col items-center justify-center text-center px-8 py-24">
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
          AI-Powered Learning Assistant
        </div>
        <h1 className="text-5xl font-bold text-gray-800 mb-6 leading-tight max-w-2xl">
          공부한 내용을<br />AI가 기억합니다
        </h1>
        <p className="text-lg text-gray-400 mb-10 max-w-xl leading-relaxed">
          학습 노트를 작성하면 AI가 벡터로 저장하고,<br />
          퀴즈 생성, 요약, 질문 답변으로 학습 효과를 높여드립니다.
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/signup")}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            무료로 시작하기 <ArrowRight size={16} />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="border border-gray-200 text-gray-600 px-8 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm"
          >
            로그인
          </button>
        </div>
      </div>

      {/* 기능 카드 */}
      <div className="grid grid-cols-3 gap-6 px-12 pb-24 max-w-5xl mx-auto">
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
            <FileText size={20} className="text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">스마트 노트</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            리치 텍스트 에디터로 코드 블록, 표, 이미지 등을 포함한 학습 노트를 작성하세요.
          </p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
            <BrainCircuit size={20} className="text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">AI 퀴즈</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            작성한 노트를 기반으로 AI가 퀴즈를 생성해 학습 내용을 복습할 수 있어요.
          </p>
        </div>
        <div className="bg-gray-50 rounded-2xl p-6">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mb-4">
            <Sparkles size={20} className="text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-800 mb-2">RAG 질문 답변</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            내가 쓴 노트를 기반으로 AI가 질문에 답변해 나만의 지식 베이스를 활용하세요.
          </p>
        </div>
      </div>

      {/* 통계 섹션 */}
      <div className="bg-blue-600 py-16">
        <div className="flex justify-center gap-16 text-center text-white">
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Database size={20} className="text-blue-300" />
              <div className="text-4xl font-bold">1.2k+</div>
            </div>
            <div className="text-blue-200 text-sm">Vectors Embedded</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <FileText size={20} className="text-blue-300" />
              <div className="text-4xl font-bold">124</div>
            </div>
            <div className="text-blue-200 text-sm">Notes Summarized</div>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <BrainCircuit size={20} className="text-blue-300" />
              <div className="text-4xl font-bold">42</div>
            </div>
            <div className="text-blue-200 text-sm">Quizzes Taken</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;