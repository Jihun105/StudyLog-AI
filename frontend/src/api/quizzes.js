import axios from "axios";

const BASE_URL = process.env.REACT_APP_API_URL ?? "http://localhost:8000";

const authHeader = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
});

// 퀴즈 생성 (categoryId: null=전체, 0=미분류, 그 외=해당 카테고리+하위 전체)
// quizType: "multiple_choice" | "ox" | "blank"
export const generateQuiz = async (categoryId, quizType, token) => {
  const response = await axios.post(
    `${BASE_URL}/api/quizzes/generate`,
    { category_id: categoryId, quiz_type: quizType },
    authHeader(token)
  );
  return response.data.quizzes;
};

// 퀴즈 답안 제출 (채점)
export const submitQuizAttempt = async (quizId, userAnswer, token) => {
  const response = await axios.post(
    `${BASE_URL}/api/quizzes/${quizId}/attempt`,
    { user_answer: userAnswer },
    authHeader(token)
  );
  return response.data;
};
