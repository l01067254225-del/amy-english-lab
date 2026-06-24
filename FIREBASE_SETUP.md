# Firebase 연동 설정 (학생 ↔ 교사 사이트)

학생이 제출한 성적이 **교사용 페이지**(`/teacher`)에 자동으로 모이려면 Firebase를 한 번만 설정하면 됩니다.

## 1. Firebase 프로젝트 만들기

1. [https://console.firebase.google.com](https://console.firebase.google.com) 접속
2. **프로젝트 추가** → 이름 예: `amy-test`
3. Google Analytics는 꺼도 됩니다

## 2. 웹 앱 등록

1. 프로젝트 개요 → **웹** 아이콘 `</>` 클릭
2. 앱 닉네임: `amy-test-web`
3. 표시되는 `firebaseConfig` 값을 복사

## 3. .env 파일 만들기

프로젝트 폴더(`Amy-Test`)에 `.env` 파일 생성:

```env
VITE_FIREBASE_API_KEY=여기에_붙여넣기
VITE_FIREBASE_AUTH_DOMAIN=여기에_붙여넣기
VITE_FIREBASE_PROJECT_ID=여기에_붙여넣기
VITE_FIREBASE_STORAGE_BUCKET=여기에_붙여넣기
VITE_FIREBASE_MESSAGING_SENDER_ID=여기에_붙여넣기
VITE_FIREBASE_APP_ID=여기에_붙여넣기

VITE_TEACHER_PIN=1234
```

`VITE_TEACHER_PIN`은 교사 페이지 비밀번호입니다. 원하는 숫자로 바꾸세요.

## 4. Firestore 데이터베이스 만들기

1. Firebase 콘솔 → **Firestore Database** → **데이터베이스 만들기**
2. **테스트 모드**로 시작 (나중에 규칙 강화 가능)
3. 위치: `asia-northeast3 (Seoul)` 권장

## 5. Firestore 규칙 (테스트용)

**규칙** 탭에 아래를 붙여넣고 **게시**:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /results/{document=**} {
      allow read, write: if true;
    }
    match /examResults/{document=**} {
      allow read, write: if true;
    }
    match /users/{userId} {
      allow read, write: if true;
    }
  }
}
```

> `users` 컬렉션: 학생 로그인 아이디(`amy01` 등)를 문서 ID로 사용합니다. 관리자가 레벨을 수정하면 학생 화면에 실시간 반영됩니다.

> 실제 운영 시에는 로그인·권한 규칙을 강화하는 것이 좋습니다.

## 6. 실행

```bash
npm install
npm run dev
```

- 학생: `http://localhost:5173/`
- 교사: `http://localhost:5173/teacher` (비밀번호: `.env`의 `VITE_TEACHER_PIN`)

상단에 **클라우드 연동됨**이 보이면 성공입니다.

## 7. 배포 (Vercel)

Vercel에 배포할 때 **Environment Variables**에 `.env`와 같은 Firebase 값을 모두 등록하세요.

배포 후:

- 학생: `https://내사이트.vercel.app/`
- 교사: `https://내사이트.vercel.app/teacher`
