# KB클린 정기청소 현장관리 웹앱 v0.1

## 실행 방법

```bash
npm install
npm run dev
```

## Vercel 배포 방법

1. 이 폴더를 GitHub 저장소에 업로드합니다.
2. Vercel 접속 후 `Add New Project`를 누릅니다.
3. GitHub 저장소를 선택합니다.
4. Framework Preset은 `Vite`로 자동 인식됩니다.
5. Deploy를 누르면 배포 주소가 생성됩니다.

## 현장별 QR 링크 예시

- 리투의원: `https://배포주소.vercel.app/?site=reto_clinic`
- HEISA 크로스핏: `https://배포주소.vercel.app/?site=heisa_crossfit`

배포 주소가 생기면 이 링크를 QR 코드로 만들어 현장에 부착하면 됩니다.

## Make Webhook 연결

`src/App.jsx` 상단의 아래 부분에 Make Webhook URL을 넣으세요.

```js
const MAKE_WEBHOOK_URL = "";
```

예시:

```js
const MAKE_WEBHOOK_URL = "https://hook.eu2.make.com/xxxxxxx";
```

## 현재 구현된 기능

- 현장별 QR 코드 생성
- 모바일 출근/퇴근 등록
- 작업자명 입력
- 현재 위치 기록
- 필수 사진 촬영/업로드
- 특이사항 입력
- 관리자 확인 화면
- Make/Notion 전송용 JSON 생성
- Webhook URL 입력 시 Make로 데이터 전송
