/* ========================================
   인증 시스템 - auth.js
   ======================================== */

// 기본 비밀번호 (실제 사용 시 변경 필요)
const DEFAULT_PASSWORD = 'journalist2025';

// 로컬 스토리지 키
const STORAGE_KEYS = {
    PASSWORD: 'archive_password',
    SESSION: 'archive_session',
    SESSION_EXPIRY: 'archive_session_expiry'
};

// 세션 유효 시간 (7일)
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000;

// ========================================
// 초기화
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth();
});

function initializeAuth() {
    // URL에 공유 파라미터가 있는지 확인
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('share');
    
    if (sharedId) {
        // 공유 링크로 접근한 경우 - 로그인 없이 기사 표시
        showSharedArticleView(sharedId);
        return;
    }
    
    // 저장된 비밀번호가 없으면 기본값 설정
    if (!localStorage.getItem(STORAGE_KEYS.PASSWORD)) {
        localStorage.setItem(STORAGE_KEYS.PASSWORD, hashPassword(DEFAULT_PASSWORD));
    }
    
    // 세션 확인
    if (isSessionValid()) {
        showMainApp();
    } else {
        showLoginScreen();
    }
    
    // 이벤트 리스너 설정
    setupAuthListeners();
}

// ========================================
// 공유 기사 뷰
// ========================================
async function showSharedArticleView(articleId) {
    // 로그인 화면 숨김
    document.getElementById('loginScreen').style.display = 'none';
    
    // 메인 앱 표시 (읽기 전용)
    const mainApp = document.getElementById('mainApp');
    mainApp.classList.remove('hidden');
    
    // 헤더 숨김 (네비게이션 불필요)
    document.querySelector('.header').style.display = 'none';
    
    // 뷰 섹션 모두 숨김
    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 공유된 기사 로드 및 표시
    try {
        const response = await fetch(`tables/articles/${articleId}`);
        if (response.ok) {
            const article = await response.json();
            displaySharedArticleFullPage(article);
        } else {
            showSharedError('공유된 기사를 찾을 수 없습니다.');
        }
    } catch (error) {
        console.error('공유 기사 로드 실패:', error);
        showSharedError('기사를 불러올 수 없습니다.');
    }
}

function displaySharedArticleFullPage(article) {
    const container = document.querySelector('.main-content .container');
    container.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
            <div style="background: #fef3c7; padding: var(--spacing-md); border-radius: 8px; margin-bottom: var(--spacing-lg);">
                <p style="color: #92400e; font-size: 0.95rem; margin: 0; text-align: center;">
                    <i class="fas fa-info-circle"></i> 
                    이 기사는 읽기 전용으로 공유되었습니다.
                </p>
            </div>
            
            <article style="background: white; padding: var(--spacing-xl); border-radius: 12px; box-shadow: var(--shadow-md);">
                <h1 style="font-size: 2rem; color: var(--gray-900); margin-bottom: var(--spacing-md); line-height: 1.3;">
                    ${escapeHtml(article.title)}
                </h1>
                
                <div style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-lg); padding-bottom: var(--spacing-md); border-bottom: 2px solid var(--gray-200); flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; color: var(--gray-600);">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(article.publish_date)}</span>
                    </div>
                </div>
                
                <div style="font-size: 1.05rem; color: var(--gray-800); line-height: 1.8; margin-bottom: var(--spacing-lg); white-space: pre-wrap;">
                    ${escapeHtml(article.content)}
                </div>
                
                ${article.subject_tags?.length || article.kpi_tags?.length ? `
                    <div style="padding: var(--spacing-md); background: var(--gray-50); border-radius: 8px;">
                        ${article.subject_tags?.length ? `
                            <div style="margin-bottom: var(--spacing-sm);">
                                <strong style="color: var(--gray-700);">주제 분야:</strong>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                                    ${article.subject_tags.map(tag => `<span class="tag subject">#${tag}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                        ${article.kpi_tags?.length ? `
                            <div>
                                <strong style="color: var(--gray-700);">KPI 유형:</strong>
                                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.5rem;">
                                    ${article.kpi_tags.map(tag => `<span class="tag kpi">#${tag}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
            </article>
            
            <div style="text-align: center; margin-top: var(--spacing-xl);">
                <p style="color: var(--gray-500); font-size: 0.9rem;">
                    기자 아카이브 시스템으로 작성된 기사입니다.
                </p>
            </div>
        </div>
    `;
}

function showSharedError(message) {
    const container = document.querySelector('.main-content .container');
    container.innerHTML = `
        <div style="text-align: center; padding: var(--spacing-xl);">
            <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: var(--warning-color); margin-bottom: var(--spacing-md);"></i>
            <h2 style="color: var(--gray-900); margin-bottom: var(--spacing-sm);">기사를 찾을 수 없습니다</h2>
            <p style="color: var(--gray-600);">${message}</p>
        </div>
    `;
}

// 유틸리티 함수들 (main.js와 중복이지만 독립적으로 작동하도록)
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
}

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ========================================
// 이벤트 리스너
// ========================================
function setupAuthListeners() {
    // 로그인 폼
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // 로그아웃 버튼
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // 설정 버튼
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', openSettings);
    }
    
    // 설정 모달 닫기
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', closeSettings);
    }
    
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    if (cancelSettingsBtn) {
        cancelSettingsBtn.addEventListener('click', closeSettings);
    }
    
    // 설정 폼
    const settingsForm = document.getElementById('settingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handlePasswordChange);
    }
}

// ========================================
// 로그인 처리
// ========================================
function handleLogin(e) {
    e.preventDefault();
    
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value;
    const errorDiv = document.getElementById('loginError');
    
    const storedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);
    const hashedInput = hashPassword(password);
    
    if (hashedInput === storedPassword) {
        // 로그인 성공
        createSession();
        showMainApp();
        passwordInput.value = '';
        errorDiv.textContent = '';
    } else {
        // 로그인 실패
        errorDiv.textContent = '⚠️ 비밀번호가 올바르지 않습니다.';
        passwordInput.value = '';
        passwordInput.focus();
        
        // 3초 후 에러 메시지 제거
        setTimeout(() => {
            errorDiv.textContent = '';
        }, 3000);
    }
}

// ========================================
// 로그아웃 처리
// ========================================
function handleLogout() {
    if (confirm('로그아웃하시겠습니까?')) {
        clearSession();
        showLoginScreen();
        
        // 차트 인스턴스 정리
        if (window.kpiChart) window.kpiChart.destroy();
        if (window.subjectChart) window.subjectChart.destroy();
        if (window.monthlyChart) window.monthlyChart.destroy();
    }
}

// ========================================
// 비밀번호 변경
// ========================================
function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    const storedPassword = localStorage.getItem(STORAGE_KEYS.PASSWORD);
    const hashedCurrent = hashPassword(currentPassword);
    
    // 현재 비밀번호 확인
    if (hashedCurrent !== storedPassword) {
        showToast('현재 비밀번호가 올바르지 않습니다.', 'error');
        return;
    }
    
    // 새 비밀번호 검증
    if (newPassword.length < 6) {
        showToast('새 비밀번호는 최소 6자 이상이어야 합니다.', 'warning');
        return;
    }
    
    // 비밀번호 확인
    if (newPassword !== confirmPassword) {
        showToast('새 비밀번호가 일치하지 않습니다.', 'warning');
        return;
    }
    
    // 비밀번호 변경
    localStorage.setItem(STORAGE_KEYS.PASSWORD, hashPassword(newPassword));
    
    showToast('비밀번호가 성공적으로 변경되었습니다.', 'success');
    closeSettings();
    
    // 폼 초기화
    document.getElementById('settingsForm').reset();
}

// ========================================
// 세션 관리
// ========================================
function createSession() {
    const sessionId = generateSessionId();
    const expiry = Date.now() + SESSION_DURATION;
    
    localStorage.setItem(STORAGE_KEYS.SESSION, sessionId);
    localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
}

function clearSession() {
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    localStorage.removeItem(STORAGE_KEYS.SESSION_EXPIRY);
}

function isSessionValid() {
    const session = localStorage.getItem(STORAGE_KEYS.SESSION);
    const expiry = localStorage.getItem(STORAGE_KEYS.SESSION_EXPIRY);
    
    if (!session || !expiry) {
        return false;
    }
    
    const expiryTime = parseInt(expiry);
    if (Date.now() > expiryTime) {
        clearSession();
        return false;
    }
    
    return true;
}

function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ========================================
// 화면 전환
// ========================================
function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('mainApp').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').classList.remove('hidden');
    
    // main.js의 초기화 함수 호출
    if (typeof initializeApp === 'function') {
        initializeApp();
    } else if (typeof loadArticles === 'function') {
        // 이전 버전 호환성
        loadArticles().then(() => {
            updateDashboard();
        });
    }
}

// ========================================
// 설정 모달
// ========================================
function openSettings() {
    document.getElementById('settingsModal').classList.add('active');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('active');
    document.getElementById('settingsForm').reset();
}

// ========================================
// 비밀번호 해싱 (간단한 해시)
// ========================================
function hashPassword(password) {
    // 실제 환경에서는 더 강력한 해싱 알고리즘 사용 권장
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// ========================================
// 세션 자동 갱신
// ========================================
setInterval(() => {
    if (isSessionValid()) {
        // 세션이 유효하면 만료 시간 갱신
        const expiry = Date.now() + SESSION_DURATION;
        localStorage.setItem(STORAGE_KEYS.SESSION_EXPIRY, expiry.toString());
    } else {
        // 세션이 만료되면 로그아웃
        if (!document.getElementById('mainApp').classList.contains('hidden')) {
            alert('세션이 만료되었습니다. 다시 로그인해주세요.');
            handleLogout();
        }
    }
}, 60000); // 1분마다 체크

// ========================================
// 보안 강화: 개발자 도구 감지
// ========================================
(function() {
    const devtoolsOpen = () => {
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || 
            window.outerHeight - window.innerHeight > threshold) {
            console.warn('⚠️ 개발자 도구가 감지되었습니다. 보안을 위해 민감한 정보는 노출하지 마세요.');
        }
    };
    
    window.addEventListener('resize', devtoolsOpen);
})();

console.log('🔒 인증 시스템 초기화 완료');
