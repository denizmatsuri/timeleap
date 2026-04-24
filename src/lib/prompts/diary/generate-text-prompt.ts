type GenerateTextPromptInput = {
  ageRange?: string | null;
  city: string;
  countryName: string;
  displayName?: string | null;
  eraTitle: string;
  eraYear: string;
  gender?: string | null;
  mood: string;
  sceneNote: string;
  sceneTitle: string;
  texture: string;
  wardrobe: string;
};

export function buildGenerateTextPrompt({
  ageRange,
  city,
  countryName,
  displayName,
  eraTitle,
  eraYear,
  gender,
  mood,
  sceneNote,
  sceneTitle,
  texture,
  wardrobe,
}: GenerateTextPromptInput) {
  const profileHints = [displayName, gender, ageRange]
    .filter(Boolean)
    .join(", ");

  return `
다음 조건을 바탕으로 한국어 짧은 여행 일기를 작성해 주세요.

배경 정보
- 국가: ${countryName}
- 도시: ${city}
- 시대: ${eraYear}년 ${eraTitle}
- 장면 제목: ${sceneTitle}
- 장면 디테일: ${sceneNote}
- 분위기: ${mood}
- 의상: ${wardrobe}
- 질감 키워드: ${texture}
${profileHints ? `- 화자 힌트: ${profileHints}` : ""}

작성 규칙
- 1인칭 시점
- 짧은 일기 형식
- 2~4문장
- 한 문장 이상에서 구체적인 감각 묘사를 넣기
- 감정은 하나만 선명하게 드러내기
- 현대 인터넷 말투, 밈, 과한 시적 과장은 금지
- 이미지 한 장과 같은 하루의 한 순간처럼 써야 함
- 시대에 어울리지 않는 현대 물건이나 표현은 쓰지 말 것

출력 형식
- 반드시 JSON만 반환
- key는 "title", "body" 두 개만 사용
- title은 12자 이내의 짧은 제목
- body는 하나의 문자열

예시 형식
{"title":"짧은 제목","body":"짧은 일기 본문"}
`.trim();
}
