**전체 흐름**
1. 사용자가 `/time-machine`에서 시대와 국가를 고릅니다.
2. `출발`을 누르면 `requestId`를 붙여 `/time-machine/result`로 이동합니다.
3. 로딩 페이지의 클라이언트 컴포넌트가 `generateDiaryFromSelection()` 같은 Server Action을 호출합니다.
4. 서버가 `generation_jobs`에서 같은 요청이 이미 처리 중이거나 완료됐는지 확인합니다.
5. 새 요청이면 유저 정보와 얼굴 참조 이미지를 읽고, 프롬프트를 조립합니다.
6. 서버가 Gemini로 대표 이미지 1장과 짧은 텍스트를 생성합니다.
7. 서버가 이미지를 Supabase Storage에 업로드하고, `diaries`에 결과를 저장합니다.
8. 서버가 `diaryId`를 반환하면 클라이언트가 `/diary/[id]`로 이동합니다.

즉, 로딩 페이지는 “생성 중 상태 화면”이고, `generation_jobs`에는 요청 상태,
`diaries`에는 **완성된 결과**가 저장됩니다.

**왜 파일을 나누는가**
한 파일에 다 넣으면 나중에 바로 엉킵니다. 역할을 분리해야 합니다.

- `src/lib/prompts/...`
  프롬프트 문장만 관리합니다.
- `src/lib/ai/...`
  Gemini API 호출만 담당합니다.
- `src/actions/...`
  인증 확인, DB 저장, Storage 업로드 같은 서버 mutation을 담당합니다.
- `src/app/time-machine/result/...`
  로딩 UI와 생성 시작 트리거를 담당합니다.
- `src/app/diary/[id]/page.tsx`
  저장된 결과를 보여줍니다.

이렇게 나누면 나중에 “프롬프트만 수정”, “모델만 교체”, “DB 저장 방식만 수정”이 쉬워집니다.

**각 파일에서 실제로 하는 일**
1. `src/lib/prompts/diary/generate-image-prompt.ts`
- 이미지 프롬프트를 만듭니다.
- 입력값: 국가, 시대, 도시, 분위기, 의상, 질감, 시간대 같은 정보
- 출력값: Gemini에 보낼 긴 문자열

2. `src/lib/prompts/diary/generate-text-prompt.ts`
- 짧은 일기 프롬프트를 만듭니다.
- 입력값: 시대/국가 정보 + 이미지에서 표현하려는 장면 요약
- 출력값: 한국어 짧은 일기 생성용 문자열

3. `src/lib/ai/gemini.ts`
- `@google/genai` SDK를 사용해서 실제 Gemini API를 호출합니다.
- 이미지 생성 함수와 텍스트 생성 함수를 둡니다.
- 이미지 응답의 `inlineData`를 꺼내서 `Buffer`로 바꿉니다.
- 여기에는 `server-only`가 들어가야 합니다.

4. `src/actions/time-machine.ts`
- 여기서 전체를 묶습니다.
- `auth` 유저 확인
- `profile_face_images` 조회
- 참조 이미지 2~4장 준비
- 프롬프트 생성
- Gemini 호출
- Storage 업로드
- `diaries` insert
- `diaryId` 반환

5. `src/app/time-machine/result/_components/departure-screen.tsx`
- 지금 있는 로딩 화면입니다.
- 여기서 `useEffect`로 Server Action을 한 번 호출합니다.
- 끝나면 `router.replace("/diary/[id]")`

6. `src/app/diary/[id]/page.tsx`
- DB에서 diary 1건 읽어서 보여줍니다.
- 제목, 본문, 대표사진 signed URL 생성 후 렌더링합니다.

**프롬프트는 어디에 얼마나 자세히 쓰나**
프롬프트는 컴포넌트가 아니라 `src/lib/prompts/` 아래에 씁니다.  
왜냐하면 프롬프트는 UI가 아니라 “도메인 규칙”이기 때문입니다.

이미지 프롬프트에는 보통 이런 내용이 들어갑니다.
- 어느 나라, 어느 시대인지
- 어떤 거리/실내/풍경인지
- 인물은 한 명인지
- 어떤 옷을 입는지
- 어떤 감정과 분위기인지
- 사진 톤이 다큐인지, 에디토리얼인지
- 금지사항: 현대 스마트폰, 현대 간판, 과한 판타지 등

텍스트 프롬프트에는 이런 내용이 들어갑니다.
- 한국어
- 1인칭
- 2~4문장
- 짧은 여행 일기 톤
- 감정 1개 + 감각 묘사 1개
- 이미지 장면과 같은 하루처럼 써라
- 너무 소설처럼 과장하지 말 것

**왜 React에서 직접 Gemini를 호출하면 안 되나**
- API 키가 노출됩니다.
- 이미지 base64가 브라우저로 그대로 오가면 처리도 지저분합니다.
- 인증 체크, DB 저장, Storage 업로드를 결국 서버에서 다시 해야 합니다.

그래서 구조는 무조건:
- 클라이언트: 시작/로딩/이동
- 서버: 생성/저장

**지금 MVP에서의 장점**
- 구조가 단순합니다.
- 같은 `requestId`의 중복 호출을 줄일 수 있습니다.
- 완성된 결과만 DB에 저장하니까 스키마가 단순합니다.

**대신 감수하는 점**
- 현재 `/time-machine/result`가 query string 기반이라 route 복구 UX가 약합니다.
- generation job migration/source 동기화 확인이 필요합니다.
- 나중에 사용량이 늘면 비동기 상태 관리가 필요할 수 있습니다.

**지금 기준 가장 좋은 첫 구현 목표**
- 이미지 1장 생성
- 짧은 일기 1개 생성
- Storage 업로드
- `diaries` 저장
- `/diary/[id]` 렌더링
