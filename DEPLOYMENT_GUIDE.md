# 🚀 GitHub Pages 배포 가이드

횽's 아카이브를 GitHub Pages에 배포하는 방법입니다.

## 📋 준비물

- GitHub 계정 (없으면 [github.com](https://github.com)에서 무료 가입)
- 이 프로젝트 파일들

## 🎯 배포 단계 (5분 완료!)

### 1단계: GitHub 저장소 만들기

1. [GitHub](https://github.com)에 로그인
2. 우측 상단 **"+"** 버튼 → **"New repository"** 클릭
3. 저장소 설정:
   - **Repository name**: `my-article-archive` (원하는 이름)
   - **Public** 선택 (GitHub Pages는 Public 필요)
   - **"Add a README file"** 체크 해제
4. **"Create repository"** 클릭

### 2단계: 파일 업로드

#### 방법 A: 웹에서 직접 업로드 (쉬움!)

1. 생성된 저장소 페이지에서 **"uploading an existing file"** 클릭
2. 다음 파일들을 드래그 앤 드롭:
   ```
   index.html
   README.md
   css/style.css
   js/auth.js
   js/main.js
   ```
3. **폴더 구조 유지 필수!**
   - `css` 폴더 만들고 → `style.css` 업로드
   - `js` 폴더 만들고 → `auth.js`, `main.js` 업로드
4. **"Commit changes"** 클릭

#### 방법 B: Git 명령어 사용 (고급)

```bash
git clone https://github.com/your-username/my-article-archive.git
cd my-article-archive
# 파일들을 복사
git add .
git commit -m "Initial commit: 횽's 아카이브"
git push
```

### 3단계: GitHub Pages 활성화

1. 저장소 페이지에서 **"Settings"** 탭 클릭
2. 좌측 메뉴에서 **"Pages"** 클릭
3. **Source** 설정:
   - Branch: **"main"** (또는 "master") 선택
   - Folder: **"/ (root)"** 선택
4. **"Save"** 클릭
5. 1-2분 기다리면 배포 완료!

### 4단계: 접속 URL 확인

배포 완료 후 Pages 설정 페이지 상단에 URL이 표시됩니다:
```
https://your-username.github.io/my-article-archive/
```

이게 바로 **어디서나 접속 가능한 횽's 아카이브 주소**입니다! 🎉

## 🔐 보안 확인

배포 후 바로:
1. 해당 URL로 접속
2. 로그인 화면 확인 ✅
3. 초기 비밀번호로 로그인: `journalist2025`
4. 우측 상단 **"설정"** → 비밀번호 변경
5. 강력한 비밀번호로 변경 (최소 8자 이상)

## 📱 모바일에서 접속

1. 휴대폰 브라우저에서 URL 입력
2. 로그인 화면 → 비밀번호 입력
3. **홈 화면에 추가**:
   - iOS: 공유 버튼 → "홈 화면에 추가"
   - Android: 메뉴 → "홈 화면에 추가"
4. 앱처럼 사용 가능! 📱

## 🔄 업데이트 방법

나중에 기능 추가/수정 시:
1. 저장소 페이지에서 파일 클릭
2. 연필 아이콘(편집) 클릭
3. 수정 후 **"Commit changes"**
4. 자동으로 재배포됨 (1-2분 소요)

## ⚠️ 주의사항

### ✅ 안전함:
- URL은 공개되지만
- **로그인 화면만 보임**
- 비밀번호 없이는 절대 못 들어감
- 모든 기사 데이터 보호됨

### ⚠️ 주의:
- 초기 비밀번호 `journalist2025` **반드시 변경**
- URL을 함부로 공유하지 마세요
- 정기적으로 데이터 백업 (CSV 내보내기)

## 🆘 문제 해결

### 페이지가 안 보여요
- 1-2분 기다려주세요 (배포 시간)
- Settings → Pages에서 배포 상태 확인
- URL 끝에 `/index.html` 붙여보세요

### 404 에러가 나요
- 파일 구조 확인:
  ```
  my-article-archive/
  ├── index.html
  ├── README.md
  ├── css/
  │   └── style.css
  └── js/
      ├── auth.js
      └── main.js
  ```
- 폴더 구조가 정확해야 합니다!

### CSS/JS가 안 먹혀요
- index.html에서 경로가 올바른지 확인
- 현재 경로: `css/style.css`, `js/auth.js`, `js/main.js`

## 📞 추가 도움

GitHub Pages 공식 문서:
https://docs.github.com/pages

---

## 🎉 완료!

배포가 완료되면:
- ✅ PC에서 접속 가능
- ✅ 휴대폰에서 접속 가능
- ✅ 어디서나 기사 관리
- ✅ 비밀번호로 안전하게 보호

**배포 후 URL을 카카오톡으로 자신에게 보내두세요!**

횽's 아카이브를 즐기세요! 🚀📱
