# AMY ENGLISH LAB

영어 시험 사이트 (학생용 + 교사용)

## 페이지

| 주소 | 용도 |
|------|------|
| `/` | 학생 시험 |
| `/teacher` | 교사 성적 확인 |

## 실행

```bash
npm install
npm run dev
```

## 학생 로그인

시험 전에 **아이디 / 비밀번호**로 로그인합니다. 계정은 `src/data/students.js`에서 관리합니다.

예시 (기본 비밀번호 `1234`):

| 아이디 | 이름 |
|--------|------|
| amy01 | Amy |
| amy02 | Kate |
| amy03 | Tom |

## 학생·교사 연동

Firebase 설정 방법: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**

설정 전에는 각 기기 **로컬 저장**만 됩니다.  
Firebase 설정 후에는 학생 제출 → 교사 페이지에 **자동 저장**됩니다.

## 시험 문제 수정

- `src/data/vocaWords.js` — 단어 30개
- `src/data/questions.js` — Writing / Grammar / Reading
