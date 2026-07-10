// 백엔드가 HTTPException(detail="문자열")을 던지면 error.response.data.detail이 문자열이지만,
// FastAPI/Pydantic이 요청 자체를 검증하다 실패하면(422) 자동으로 만들어주는 detail은
// {type, loc, msg, input, ctx} 객체의 배열임 - 이걸 그대로 문자열 자리에 렌더링하면
// "Objects are not valid as a React child" 에러가 남. 항상 화면에 바로 쓸 수 있는
// 문자열로 정규화해서 반환하는 헬퍼
export function getErrorMessage(error, fallback) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string" && detail) return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => (typeof item === "string" ? item : item?.msg))
      .filter(Boolean)
      .join(" / ") || fallback;
  }

  return fallback;
}
