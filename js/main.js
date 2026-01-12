/* ========================================
   기자 아카이브 & KPI 대시보드 - 메인 JavaScript
   ======================================== */

// 전역 변수
let allArticles = [];
let filteredArticles = [];
let currentView = 'dashboard';
let currentPage = 1;
let articlesPerPage = 12;
let editingArticleId = null;

// Chart.js 인스턴스
let kpiChart = null;
let subjectChart = null;
let monthlyChart = null;

// ========================================
// 초기화
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // 인증이 완료된 후에만 초기화
    // auth.js에서 showMainApp() 호출 시 loadArticles()가 실행됨
    console.log('기자 아카이브 시스템 대기 중...');
    
    // 이벤트 리스너 설정 (인증 여부와 관계없이 설정)
    setupEventListeners();
    
    // 오늘 날짜를 기본값으로 설정
    document.getElementById('publishDate').valueAsDate = new Date();
});

// 인증 후 호출될 초기화 함수
async function initializeApp() {
    console.log('기자 아카이브 시스템 초기화 중...');
    
    // 데이터 로드
    await loadArticles();
    
    // 대시보드 초기화
    updateDashboard();
    
    // 연도 필터 초기화
    initYearFilter();
    
    console.log('초기화 완료!');
}

// ========================================
// 이벤트 리스너 설정
// ========================================
function setupEventListeners() {
    // 네비게이션 버튼
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    
    // 새 기사 등록 버튼
    document.getElementById('newArticleBtn').addEventListener('click', openArticleModal);
    
    // 모달 닫기 버튼
    document.getElementById('closeModalBtn').addEventListener('click', closeArticleModal);
    document.getElementById('closeDetailModalBtn').addEventListener('click', closeDetailModal);
    document.getElementById('cancelBtn').addEventListener('click', closeArticleModal);
    
    // 모달 배경 클릭 시 닫기
    document.getElementById('articleModal').addEventListener('click', (e) => {
        if (e.target.id === 'articleModal') closeArticleModal();
    });
    document.getElementById('articleDetailModal').addEventListener('click', (e) => {
        if (e.target.id === 'articleDetailModal') closeDetailModal();
    });
    
    // 폼 제출
    document.getElementById('articleForm').addEventListener('submit', handleFormSubmit);
    
    // 필터 및 검색
    document.getElementById('yearFilter').addEventListener('change', updateDashboard);
    document.getElementById('monthFilter').addEventListener('change', updateDashboard);
    document.getElementById('searchInput').addEventListener('input', filterArticles);
    document.getElementById('subjectFilter').addEventListener('change', filterArticles);
    document.getElementById('kpiFilter').addEventListener('change', filterArticles);
    document.getElementById('sortBy').addEventListener('change', filterArticles);
    
    // 기사 상세 모달 액션
    document.getElementById('shareArticleBtn').addEventListener('click', shareCurrentArticle);
    document.getElementById('editArticleBtn').addEventListener('click', editCurrentArticle);
    document.getElementById('deleteArticleBtn').addEventListener('click', deleteCurrentArticle);
    
    // 공유 모달
    document.getElementById('closeShareBtn').addEventListener('click', closeShareModal);
    document.getElementById('copyLinkBtn').addEventListener('click', copyShareLink);
    
    // 데이터 관리
    document.getElementById('dataManageBtn').addEventListener('click', openDataManageModal);
    document.getElementById('closeDataManageBtn').addEventListener('click', closeDataManageModal);
    document.getElementById('smartExportBtn').addEventListener('click', handleSmartExport);
    document.getElementById('smartExportMode').addEventListener('change', updateSmartExportUI);
    document.getElementById('exportAllBtn').addEventListener('click', exportAllData);
    document.getElementById('exportFilteredBtn').addEventListener('click', exportFilteredData);
    document.getElementById('importDataBtn').addEventListener('click', () => document.getElementById('importFileInput').click());
    document.getElementById('importFileInput').addEventListener('change', importData);
    
    // PDF 내보내기
    document.getElementById('exportPdfBtn').addEventListener('click', exportPortfolioPDF);
}

// ========================================
// 뷰 전환
// ========================================
function switchView(view) {
    currentView = view;
    
    // 네비게이션 버튼 활성화 상태 변경
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // 뷰 섹션 표시/숨김
    document.querySelectorAll('.view-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const viewMap = {
        'dashboard': 'dashboardView',
        'articles': 'articlesView',
        'portfolio': 'portfolioView'
    };
    
    document.getElementById(viewMap[view]).classList.add('active');
    
    // 각 뷰별 초기화
    if (view === 'dashboard') {
        updateDashboard();
    } else if (view === 'articles') {
        filterArticles();
    } else if (view === 'portfolio') {
        updatePortfolio();
    }
}

// ========================================
// 데이터 로드
// ========================================
async function loadArticles() {
    showLoading();
    try {
        const response = await fetch('tables/articles?limit=1000&sort=publish_date');
        const data = await response.json();
        
        allArticles = data.data || [];
        filteredArticles = [...allArticles];
        
        console.log(`${allArticles.length}개의 기사를 불러왔습니다.`);
    } catch (error) {
        console.error('기사 로드 실패:', error);
        showToast('기사를 불러오는데 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================
// 대시보드 업데이트
// ========================================
function updateDashboard() {
    const yearFilter = document.getElementById('yearFilter').value;
    const monthFilter = document.getElementById('monthFilter').value;
    
    // 필터링된 기사 가져오기
    let filtered = [...allArticles];
    
    if (yearFilter !== 'all') {
        filtered = filtered.filter(article => {
            const year = new Date(article.publish_date).getFullYear();
            return year === parseInt(yearFilter);
        });
    }
    
    if (monthFilter !== 'all') {
        filtered = filtered.filter(article => {
            const month = new Date(article.publish_date).getMonth() + 1;
            return month === parseInt(monthFilter);
        });
    }
    
    // KPI 카드 업데이트
    updateKPICards(filtered);
    
    // 차트 업데이트
    updateCharts(filtered);
    
    // 최근 기사 목록 업데이트
    updateRecentArticles();
}

// ========================================
// KPI 카드 업데이트
// ========================================
function updateKPICards(articles) {
    const total = articles.length;
    const frontPage = articles.filter(a => a.kpi_tags?.includes('1면')).length;
    const sectionTop = articles.filter(a => a.kpi_tags?.includes('면톱')).length;
    const special = articles.filter(a => a.kpi_tags?.includes('기획')).length;
    
    document.getElementById('totalArticles').textContent = total;
    document.getElementById('frontPageArticles').textContent = frontPage;
    document.getElementById('sectionTopArticles').textContent = sectionTop;
    document.getElementById('specialArticles').textContent = special;
}

// ========================================
// 차트 업데이트
// ========================================
function updateCharts(articles) {
    // KPI 유형별 통계
    const kpiData = {
        '1면': articles.filter(a => a.kpi_tags?.includes('1면')).length,
        '앞면': articles.filter(a => a.kpi_tags?.includes('앞면')).length,
        '면톱': articles.filter(a => a.kpi_tags?.includes('면톱')).length,
        '게시판톱': articles.filter(a => a.kpi_tags?.includes('게시판톱')).length,
        '기획': articles.filter(a => a.kpi_tags?.includes('기획')).length,
        '일반': articles.filter(a => a.kpi_tags?.includes('일반')).length
    };
    
    updateKPIChart(kpiData);
    
    // 주제 분야별 분포
    const subjectData = {};
    const subjects = ['조선', '항공', '해운', '방산', '정유', '석유화학', '재계', '반도체', '자동차', '통상정책', '노사관계'];
    subjects.forEach(subject => {
        subjectData[subject] = articles.filter(a => a.subject_tags?.includes(subject)).length;
    });
    
    updateSubjectChart(subjectData);
    
    // 월별 기사 작성 추이
    updateMonthlyChart(articles);
}

// ========================================
// KPI 차트 업데이트
// ========================================
function updateKPIChart(data) {
    const ctx = document.getElementById('kpiChart').getContext('2d');
    
    if (kpiChart) {
        kpiChart.destroy();
    }
    
    kpiChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: '기사 수',
                data: Object.values(data),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(240, 147, 251, 0.8)',
                    'rgba(245, 87, 108, 0.8)',
                    'rgba(79, 172, 254, 0.8)',
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    'rgb(102, 126, 234)',
                    'rgb(118, 75, 162)',
                    'rgb(240, 147, 251)',
                    'rgb(245, 87, 108)',
                    'rgb(79, 172, 254)',
                    'rgb(16, 185, 129)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ========================================
// 주제 차트 업데이트
// ========================================
function updateSubjectChart(data) {
    const ctx = document.getElementById('subjectChart').getContext('2d');
    
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    const colors = [
        'rgba(255, 99, 132, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(75, 192, 192, 0.8)',
        'rgba(153, 102, 255, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(199, 199, 199, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(168, 85, 247, 0.8)'
    ];
    
    subjectChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(data),
            datasets: [{
                data: Object.values(data),
                backgroundColor: colors,
                borderColor: colors.map(c => c.replace('0.8', '1')),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// ========================================
// 월별 차트 업데이트
// ========================================
function updateMonthlyChart(articles) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    
    if (monthlyChart) {
        monthlyChart.destroy();
    }
    
    // 월별 데이터 집계
    const monthlyData = {};
    articles.forEach(article => {
        const date = new Date(article.publish_date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
    });
    
    // 정렬
    const sortedKeys = Object.keys(monthlyData).sort();
    const labels = sortedKeys.map(key => {
        const [year, month] = key.split('-');
        return `${year}년 ${month}월`;
    });
    const values = sortedKeys.map(key => monthlyData[key]);
    
    monthlyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '기사 수',
                data: values,
                borderColor: 'rgb(102, 126, 234)',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: 'rgb(102, 126, 234)',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// ========================================
// 최근 기사 목록 업데이트
// ========================================
function updateRecentArticles() {
    const container = document.getElementById('recentArticlesList');
    const recentArticles = [...allArticles]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);
    
    if (recentArticles.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">등록된 기사가 없습니다.</p>';
        return;
    }
    
    container.innerHTML = recentArticles.map(article => `
        <div class="article-card" onclick="showArticleDetail('${article.id}')">
            <div class="article-header">
                <h4 class="article-title">${escapeHtml(article.title)}</h4>
                <p class="article-date">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(article.publish_date)}
                </p>
            </div>
            <div class="article-tags">
                ${article.subject_tags?.map(tag => `<span class="tag subject">#${tag}</span>`).join('') || ''}
                ${article.kpi_tags?.map(tag => `<span class="tag kpi">#${tag}</span>`).join('') || ''}
            </div>
        </div>
    `).join('');
}

// ========================================
// 기사 필터링 및 표시
// ========================================
function filterArticles() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const subjectFilter = document.getElementById('subjectFilter').value;
    const kpiFilter = document.getElementById('kpiFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    filteredArticles = allArticles.filter(article => {
        // 검색어 필터
        const matchesSearch = !searchText || 
            article.title.toLowerCase().includes(searchText) ||
            article.content.toLowerCase().includes(searchText) ||
            article.keywords?.some(k => k.toLowerCase().includes(searchText));
        
        // 주제 필터
        const matchesSubject = subjectFilter === 'all' || 
            article.subject_tags?.includes(subjectFilter);
        
        // KPI 필터
        const matchesKPI = kpiFilter === 'all' || 
            article.kpi_tags?.includes(kpiFilter);
        
        return matchesSearch && matchesSubject && matchesKPI;
    });
    
    // 정렬
    filteredArticles.sort((a, b) => {
        switch (sortBy) {
            case 'date_desc':
                return new Date(b.publish_date) - new Date(a.publish_date);
            case 'date_asc':
                return new Date(a.publish_date) - new Date(b.publish_date);
            case 'title':
                return a.title.localeCompare(b.title, 'ko');
            default:
                return 0;
        }
    });
    
    currentPage = 1;
    displayArticles();
}

// ========================================
// 기사 표시
// ========================================
function displayArticles() {
    const container = document.getElementById('articlesListContainer');
    const startIndex = (currentPage - 1) * articlesPerPage;
    const endIndex = startIndex + articlesPerPage;
    const pageArticles = filteredArticles.slice(startIndex, endIndex);
    
    if (pageArticles.length === 0) {
        container.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 3rem; grid-column: 1/-1;">검색 결과가 없습니다.</p>';
    } else {
        container.innerHTML = pageArticles.map(article => {
            const preview = article.content.substring(0, 150) + '...';
            return `
                <div class="article-card" onclick="showArticleDetail('${article.id}')">
                    <div class="article-header">
                        <h3 class="article-title">${escapeHtml(article.title)}</h3>
                        <p class="article-date">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(article.publish_date)}
                        </p>
                    </div>
                    <p class="article-preview">${escapeHtml(preview)}</p>
                    <div class="article-tags">
                        ${article.subject_tags?.map(tag => `<span class="tag subject">#${tag}</span>`).join('') || ''}
                        ${article.kpi_tags?.map(tag => `<span class="tag kpi">#${tag}</span>`).join('') || ''}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    updatePagination();
}

// ========================================
// 페이지네이션 업데이트
// ========================================
function updatePagination() {
    const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = `
        <button onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    
    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        html += `
            <button onclick="changePage(${i})" ${i === currentPage ? 'class="active"' : ''}>
                ${i}
            </button>
        `;
    }
    
    html += `
        <button onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredArticles.length / articlesPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    displayArticles();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========================================
// 기사 상세 보기
// ========================================
function showArticleDetail(articleId) {
    const article = allArticles.find(a => a.id === articleId);
    if (!article) return;
    
    editingArticleId = articleId;
    
    const content = document.getElementById('articleDetailContent');
    content.innerHTML = `
        <h2 class="detail-title">${escapeHtml(article.title)}</h2>
        <div class="detail-meta">
            <div class="detail-meta-item">
                <i class="fas fa-calendar"></i>
                <span>${formatDate(article.publish_date)}</span>
            </div>
            <div class="detail-meta-item">
                <i class="fas fa-clock"></i>
                <span>등록일: ${formatDateTime(article.created_at)}</span>
            </div>
        </div>
        <div class="detail-content">${escapeHtml(article.content)}</div>
        <div class="detail-tags">
            ${article.subject_tags?.length ? `
                <div class="detail-tag-row">
                    <strong>주제 분야:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${article.subject_tags.map(tag => `<span class="tag subject">#${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${article.kpi_tags?.length ? `
                <div class="detail-tag-row">
                    <strong>KPI 유형:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${article.kpi_tags.map(tag => `<span class="tag kpi">#${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${article.keywords?.length ? `
                <div class="detail-tag-row">
                    <strong>키워드:</strong>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${article.keywords.map(tag => `<span class="tag" style="background: #e0e7ff; color: #4338ca;">#${tag}</span>`).join('')}
                    </div>
                </div>
            ` : ''}
            ${article.notes ? `
                <div class="detail-tag-row" style="flex-direction: column; align-items: flex-start;">
                    <strong>메모:</strong>
                    <p style="color: #64748b; margin-top: 0.5rem;">${escapeHtml(article.notes)}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    // 버튼 표시 (로그인 상태에서만)
    document.getElementById('shareArticleBtn').style.display = 'flex';
    document.getElementById('editArticleBtn').style.display = 'flex';
    document.getElementById('deleteArticleBtn').style.display = 'flex';
    
    document.getElementById('articleDetailModal').classList.add('active');
}

function closeDetailModal() {
    document.getElementById('articleDetailModal').classList.remove('active');
    editingArticleId = null;
}

// ========================================
// 기사 공유
// ========================================
function shareCurrentArticle() {
    if (!editingArticleId) return;
    
    // 공유 URL 생성 (쿼리 파라미터 방식)
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?share=${editingArticleId}`;
    
    // 공유 링크 모달 표시
    document.getElementById('shareLinkInput').value = shareUrl;
    document.getElementById('shareModal').classList.add('active');
}

function closeShareModal() {
    document.getElementById('shareModal').classList.remove('active');
}

function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    input.select();
    input.setSelectionRange(0, 99999); // 모바일 대응
    
    try {
        document.execCommand('copy');
        showToast('링크가 클립보드에 복사되었습니다!', 'success');
    } catch (err) {
        // Fallback: Clipboard API 사용
        navigator.clipboard.writeText(input.value).then(() => {
            showToast('링크가 클립보드에 복사되었습니다!', 'success');
        }).catch(() => {
            showToast('링크 복사에 실패했습니다. 수동으로 복사해주세요.', 'warning');
        });
    }
}

// ========================================
// URL 파라미터로 공유된 기사 표시
// ========================================
async function checkSharedArticle() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('share');
    
    if (sharedId) {
        // 로그인하지 않은 상태에서도 공유된 기사 보기 가능
        try {
            const response = await fetch(`tables/articles/${sharedId}`);
            if (response.ok) {
                const article = await response.json();
                displaySharedArticle(article);
            } else {
                showToast('공유된 기사를 찾을 수 없습니다.', 'error');
            }
        } catch (error) {
            console.error('공유 기사 로드 실패:', error);
            showToast('기사를 불러올 수 없습니다.', 'error');
        }
    }
}

function displaySharedArticle(article) {
    // 읽기 전용 모달로 표시
    const content = `
        <div style="padding: var(--spacing-md);">
            <div style="background: #fef3c7; padding: var(--spacing-sm); border-radius: 8px; margin-bottom: var(--spacing-md);">
                <p style="color: #92400e; font-size: 0.9rem; margin: 0;">
                    <i class="fas fa-info-circle"></i> 
                    이 기사는 읽기 전용으로 공유되었습니다.
                </p>
            </div>
            <h2 class="detail-title">${escapeHtml(article.title)}</h2>
            <div class="detail-meta">
                <div class="detail-meta-item">
                    <i class="fas fa-calendar"></i>
                    <span>${formatDate(article.publish_date)}</span>
                </div>
            </div>
            <div class="detail-content">${escapeHtml(article.content)}</div>
            <div class="detail-tags">
                ${article.subject_tags?.length ? `
                    <div class="detail-tag-row">
                        <strong>주제 분야:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${article.subject_tags.map(tag => `<span class="tag subject">#${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
                ${article.kpi_tags?.length ? `
                    <div class="detail-tag-row">
                        <strong>KPI 유형:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                            ${article.kpi_tags.map(tag => `<span class="tag kpi">#${tag}</span>`).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('articleDetailContent').innerHTML = content;
    document.getElementById('articleDetailModal').classList.add('active');
    
    // 수정/삭제 버튼 숨김
    document.getElementById('editArticleBtn').style.display = 'none';
    document.getElementById('deleteArticleBtn').style.display = 'none';
    document.getElementById('shareArticleBtn').style.display = 'none';
}


// ========================================
// 기사 폼 모달
// ========================================
function openArticleModal() {
    editingArticleId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-plus-circle"></i> 새 기사 등록';
    document.getElementById('articleForm').reset();
    document.getElementById('publishDate').valueAsDate = new Date();
    document.getElementById('articleModal').classList.add('active');
}

function closeArticleModal() {
    document.getElementById('articleModal').classList.remove('active');
    editingArticleId = null;
}

// ========================================
// 기사 수정
// ========================================
function editCurrentArticle() {
    const article = allArticles.find(a => a.id === editingArticleId);
    if (!article) return;
    
    // editingArticleId 임시 저장 (closeDetailModal이 null로 만들기 전에)
    const articleIdToEdit = editingArticleId;
    
    // 폼에 데이터 채우기
    document.getElementById('articleTitle').value = article.title;
    document.getElementById('articleContent').value = article.content;
    document.getElementById('publishDate').value = article.publish_date.split('T')[0];
    document.getElementById('keywords').value = article.keywords?.join(', ') || '';
    document.getElementById('notes').value = article.notes || '';
    
    // 태그 체크
    document.querySelectorAll('input[name="subjectTag"]').forEach(input => {
        input.checked = article.subject_tags?.includes(input.value) || false;
    });
    document.querySelectorAll('input[name="kpiTag"]').forEach(input => {
        input.checked = article.kpi_tags?.includes(input.value) || false;
    });
    
    // 모달 제목 변경
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> 기사 수정';
    
    // 상세 모달 닫고 편집 모달 열기
    closeDetailModal();
    
    // editingArticleId 복원 (수정 모드 유지)
    editingArticleId = articleIdToEdit;
    
    document.getElementById('articleModal').classList.add('active');
}

// ========================================
// 기사 삭제
// ========================================
async function deleteCurrentArticle() {
    if (!editingArticleId) return;
    
    if (!confirm('이 기사를 정말 삭제하시겠습니까?')) return;
    
    showLoading();
    try {
        await fetch(`tables/articles/${editingArticleId}`, {
            method: 'DELETE'
        });
        
        showToast('기사가 삭제되었습니다.', 'success');
        closeDetailModal();
        await loadArticles();
        updateDashboard();
        filterArticles();
    } catch (error) {
        console.error('삭제 실패:', error);
        showToast('기사 삭제에 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================
// 폼 제출 처리
// ========================================
async function handleFormSubmit(e) {
    e.preventDefault();
    
    // 폼 데이터 수집
    const title = document.getElementById('articleTitle').value.trim();
    const content = document.getElementById('articleContent').value.trim();
    const publishDate = document.getElementById('publishDate').value;
    const keywords = document.getElementById('keywords').value
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
    const notes = document.getElementById('notes').value.trim();
    
    const subjectTags = Array.from(document.querySelectorAll('input[name="subjectTag"]:checked'))
        .map(input => input.value);
    const kpiTags = Array.from(document.querySelectorAll('input[name="kpiTag"]:checked'))
        .map(input => input.value);
    
    // 유효성 검사
    if (!title || !content || !publishDate) {
        showToast('필수 항목을 모두 입력해주세요.', 'warning');
        return;
    }
    
    if (subjectTags.length === 0) {
        showToast('주제 분야 태그를 최소 1개 선택해주세요.', 'warning');
        return;
    }
    
    if (kpiTags.length === 0) {
        showToast('KPI 유형 태그를 최소 1개 선택해주세요.', 'warning');
        return;
    }
    
    const articleData = {
        title,
        content,
        publish_date: new Date(publishDate).toISOString(),
        subject_tags: subjectTags,
        kpi_tags: kpiTags,
        keywords,
        notes
    };
    
    showLoading();
    try {
        if (editingArticleId) {
            // 수정
            await fetch(`tables/articles/${editingArticleId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articleData)
            });
            showToast('기사가 수정되었습니다.', 'success');
        } else {
            // 신규 등록
            await fetch('tables/articles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(articleData)
            });
            showToast('기사가 등록되었습니다.', 'success');
        }
        
        closeArticleModal();
        await loadArticles();
        updateDashboard();
        filterArticles();
    } catch (error) {
        console.error('저장 실패:', error);
        showToast('기사 저장에 실패했습니다.', 'error');
    } finally {
        hideLoading();
        // 폼 제출 후 editingArticleId는 closeArticleModal에서 초기화됨
    }
}

// ========================================
// 포트폴리오 업데이트
// ========================================
function updatePortfolio() {
    // 통계 업데이트
    const stats = {
        '전체 기사': allArticles.length,
        '1면 기사': allArticles.filter(a => a.kpi_tags?.includes('1면')).length,
        '앞면 기사': allArticles.filter(a => a.kpi_tags?.includes('앞면')).length,
        '면톱 기사': allArticles.filter(a => a.kpi_tags?.includes('면톱')).length,
        '게시판톱': allArticles.filter(a => a.kpi_tags?.includes('게시판톱')).length,
        '기획 기사': allArticles.filter(a => a.kpi_tags?.includes('기획')).length,
        '일반 기사': allArticles.filter(a => a.kpi_tags?.includes('일반')).length
    };
    
    const statsContainer = document.getElementById('portfolioStats');
    statsContainer.innerHTML = Object.entries(stats).map(([key, value]) => `
        <div class="stat-item">
            <h3>${key}</h3>
            <p>${value}</p>
        </div>
    `).join('');
    
    // 주요 기사 (1면, 기획 기사 우선)
    const highlights = allArticles
        .filter(a => a.kpi_tags?.includes('1면') || a.kpi_tags?.includes('기획'))
        .sort((a, b) => new Date(b.publish_date) - new Date(a.publish_date))
        .slice(0, 10);
    
    const highlightsContainer = document.getElementById('portfolioHighlights');
    if (highlights.length === 0) {
        highlightsContainer.innerHTML = '<p style="color: #94a3b8; text-align: center; padding: 2rem;">주요 기사가 없습니다.</p>';
    } else {
        highlightsContainer.innerHTML = highlights.map(article => `
            <div class="highlight-article">
                <h3>${escapeHtml(article.title)}</h3>
                <p class="date">${formatDate(article.publish_date)}</p>
                <div class="article-tags" style="margin-bottom: 0.5rem;">
                    ${article.subject_tags?.map(tag => `<span class="tag subject">#${tag}</span>`).join('') || ''}
                    ${article.kpi_tags?.map(tag => `<span class="tag kpi">#${tag}</span>`).join('') || ''}
                </div>
                <p class="content">${escapeHtml(article.content.substring(0, 200))}...</p>
            </div>
        `).join('');
    }
}

// ========================================
// PDF 내보내기
// ========================================
async function exportPortfolioPDF() {
    showLoading();
    
    try {
        const { jsPDF } = window.jspdf;
        const portfolioElement = document.getElementById('portfolioContent');
        
        // html2canvas로 포트폴리오를 이미지로 변환
        const canvas = await html2canvas(portfolioElement, {
            scale: 2,
            useCORS: true,
            logging: false
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 0;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
        
        const fileName = `포트폴리오_${new Date().toISOString().split('T')[0]}.pdf`;
        pdf.save(fileName);
        
        showToast('PDF가 다운로드되었습니다.', 'success');
    } catch (error) {
        console.error('PDF 내보내기 실패:', error);
        showToast('PDF 내보내기에 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================
// 연도 필터 초기화
// ========================================
function initYearFilter() {
    const yearFilter = document.getElementById('yearFilter');
    const years = [...new Set(allArticles.map(a => new Date(a.publish_date).getFullYear()))];
    years.sort((a, b) => b - a);
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        yearFilter.appendChild(option);
    });
}

// ========================================
// 유틸리티 함수
// ========================================
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}년 ${month}월 ${day}일`;
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
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

function showLoading() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// 데이터 관리
// ========================================
function openDataManageModal() {
    // 오늘 날짜를 종료 날짜 기본값으로 설정
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('exportEndDate').value = today;
    
    // 스마트 내보내기 연도 필터 초기화
    initSmartExportYearFilter();
    
    document.getElementById('dataManageModal').classList.add('active');
}

function closeDataManageModal() {
    document.getElementById('dataManageModal').classList.remove('active');
}

// ========================================
// 스마트 내보내기 UI 업데이트
// ========================================
function updateSmartExportUI() {
    const mode = document.getElementById('smartExportMode').value;
    const monthSelector = document.getElementById('monthSelector');
    const quarterSelector = document.getElementById('quarterSelector');
    const periodSelector = document.getElementById('periodSelector');
    
    // CSV 전체 모드는 선택 UI 숨김
    if (mode === 'csv-full' || mode === 'lightweight') {
        periodSelector.style.display = 'none';
    } else {
        periodSelector.style.display = 'block';
        
        if (mode === 'quarterly' || mode === 'quarterly-lightweight') {
            monthSelector.style.display = 'none';
            quarterSelector.style.display = 'grid';
        } else {
            monthSelector.style.display = 'grid';
            quarterSelector.style.display = 'none';
        }
    }
}

function initSmartExportYearFilter() {
    const yearSelect = document.getElementById('smartExportYear');
    const years = [...new Set(allArticles.map(a => new Date(a.publish_date).getFullYear()))];
    years.sort((a, b) => b - a);
    
    // 기존 옵션 제거 (첫 번째 '전체 연도' 제외)
    while (yearSelect.options.length > 1) {
        yearSelect.remove(1);
    }
    
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}년`;
        yearSelect.appendChild(option);
    });
}

// ========================================
// 스마트 내보내기 메인 함수
// ========================================
async function handleSmartExport() {
    const mode = document.getElementById('smartExportMode').value;
    const selectedYear = document.getElementById('smartExportYear').value;
    
    if (allArticles.length === 0) {
        showToast('내보낼 기사가 없습니다.', 'warning');
        return;
    }
    
    showLoading();
    
    try {
        if (mode === 'csv-full') {
            await exportCSVFull(selectedYear);
        } else if (mode === 'csv-monthly') {
            await exportCSVByMonth(selectedYear);
        } else if (mode === 'monthly' || mode === 'monthly-lightweight') {
            await exportByMonth(mode === 'monthly-lightweight', selectedYear);
        } else if (mode === 'quarterly' || mode === 'quarterly-lightweight') {
            await exportByQuarter(mode === 'quarterly-lightweight', selectedYear);
        } else if (mode === 'lightweight') {
            await exportLightweight(selectedYear);
        }
        
        showToast('스마트 내보내기가 완료되었습니다!', 'success');
    } catch (error) {
        console.error('스마트 내보내기 실패:', error);
        showToast('내보내기에 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================
// 월별 분할 내보내기
// ========================================
async function exportByMonth(isLightweight, selectedYear) {
    const selectedMonths = Array.from(document.querySelectorAll('input[name="exportMonth"]:checked'))
        .map(input => parseInt(input.value));
    
    if (selectedMonths.length === 0) {
        showToast('최소 1개 월을 선택해주세요.', 'warning');
        return;
    }
    
    let totalExported = 0;
    
    for (const month of selectedMonths) {
        let monthArticles = allArticles.filter(a => {
            const date = new Date(a.publish_date);
            const articleMonth = date.getMonth() + 1;
            const articleYear = date.getFullYear();
            
            if (selectedYear === 'all') {
                return articleMonth === month;
            } else {
                return articleMonth === month && articleYear === parseInt(selectedYear);
            }
        });
        
        if (monthArticles.length === 0) continue;
        
        const yearLabel = selectedYear === 'all' ? '전체' : selectedYear;
        const fileName = `articles_${yearLabel}_${String(month).padStart(2, '0')}월${isLightweight ? '_경량' : ''}.json`;
        
        const exportData = {
            exportDate: new Date().toISOString(),
            mode: isLightweight ? 'lightweight' : 'full',
            period: `${yearLabel}년 ${month}월`,
            totalArticles: monthArticles.length,
            articles: isLightweight ? monthArticles.map(lightweightArticle) : monthArticles
        };
        
        downloadJSON(exportData, fileName);
        totalExported += monthArticles.length;
        
        // 파일 다운로드 사이에 약간의 지연 (브라우저 처리 시간 확보)
        await sleep(100);
    }
    
    showToast(`${selectedMonths.length}개 파일, 총 ${totalExported}개 기사를 내보냈습니다.`, 'success');
}

// ========================================
// 분기별 분할 내보내기
// ========================================
async function exportByQuarter(isLightweight, selectedYear) {
    const selectedQuarters = Array.from(document.querySelectorAll('input[name="exportQuarter"]:checked'))
        .map(input => input.value);
    
    if (selectedQuarters.length === 0) {
        showToast('최소 1개 분기를 선택해주세요.', 'warning');
        return;
    }
    
    const quarterMonths = {
        'Q1': [1, 2, 3],
        'Q2': [4, 5, 6],
        'Q3': [7, 8, 9],
        'Q4': [10, 11, 12]
    };
    
    let totalExported = 0;
    
    for (const quarter of selectedQuarters) {
        const months = quarterMonths[quarter];
        
        let quarterArticles = allArticles.filter(a => {
            const date = new Date(a.publish_date);
            const articleMonth = date.getMonth() + 1;
            const articleYear = date.getFullYear();
            
            if (selectedYear === 'all') {
                return months.includes(articleMonth);
            } else {
                return months.includes(articleMonth) && articleYear === parseInt(selectedYear);
            }
        });
        
        if (quarterArticles.length === 0) continue;
        
        const yearLabel = selectedYear === 'all' ? '전체' : selectedYear;
        const fileName = `articles_${yearLabel}_${quarter}${isLightweight ? '_경량' : ''}.json`;
        
        const exportData = {
            exportDate: new Date().toISOString(),
            mode: isLightweight ? 'lightweight' : 'full',
            period: `${yearLabel}년 ${quarter}`,
            totalArticles: quarterArticles.length,
            articles: isLightweight ? quarterArticles.map(lightweightArticle) : quarterArticles
        };
        
        downloadJSON(exportData, fileName);
        totalExported += quarterArticles.length;
        
        await sleep(100);
    }
    
    showToast(`${selectedQuarters.length}개 파일, 총 ${totalExported}개 기사를 내보냈습니다.`, 'success');
}

// ========================================
// 경량 모드 내보내기 (본문 제외)
// ========================================
async function exportLightweight(selectedYear) {
    let articles = allArticles;
    
    if (selectedYear !== 'all') {
        articles = articles.filter(a => {
            const articleYear = new Date(a.publish_date).getFullYear();
            return articleYear === parseInt(selectedYear);
        });
    }
    
    if (articles.length === 0) {
        showToast('선택한 기간에 기사가 없습니다.', 'warning');
        return;
    }
    
    const yearLabel = selectedYear === 'all' ? '전체' : selectedYear;
    const fileName = `articles_${yearLabel}_경량.json`;
    
    const exportData = {
        exportDate: new Date().toISOString(),
        mode: 'lightweight',
        period: `${yearLabel}년`,
        totalArticles: articles.length,
        articles: articles.map(lightweightArticle)
    };
    
    downloadJSON(exportData, fileName);
}

// ========================================
// 경량 기사 변환 (본문 제외)
// ========================================
function lightweightArticle(article) {
    return {
        id: article.id,
        title: article.title,
        publish_date: article.publish_date,
        subject_tags: article.subject_tags || [],
        kpi_tags: article.kpi_tags || [],
        keywords: article.keywords || [],
        notes: article.notes || '',
        // content는 제외 - 파일 크기 대폭 감소
        contentPreview: article.content ? article.content.substring(0, 200) + '...' : ''
    };
}

// ========================================
// JSON 다운로드 헬퍼 함수
// ========================================
function downloadJSON(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// CSV 전체 내보내기
// ========================================
async function exportCSVFull(selectedYear) {
    let articles = allArticles;
    
    if (selectedYear !== 'all') {
        articles = articles.filter(a => {
            const articleYear = new Date(a.publish_date).getFullYear();
            return articleYear === parseInt(selectedYear);
        });
    }
    
    if (articles.length === 0) {
        showToast('선택한 기간에 기사가 없습니다.', 'warning');
        return;
    }
    
    const yearLabel = selectedYear === 'all' ? '전체' : selectedYear;
    const fileName = `articles_${yearLabel}.csv`;
    
    const csvContent = convertToCSV(articles);
    downloadCSV(csvContent, fileName);
    
    showToast(`${articles.length}개의 기사를 CSV로 내보냈습니다.`, 'success');
}

// ========================================
// CSV 월별 분할 내보내기
// ========================================
async function exportCSVByMonth(selectedYear) {
    const selectedMonths = Array.from(document.querySelectorAll('input[name="exportMonth"]:checked'))
        .map(input => parseInt(input.value));
    
    if (selectedMonths.length === 0) {
        showToast('최소 1개 월을 선택해주세요.', 'warning');
        return;
    }
    
    let totalExported = 0;
    
    for (const month of selectedMonths) {
        let monthArticles = allArticles.filter(a => {
            const date = new Date(a.publish_date);
            const articleMonth = date.getMonth() + 1;
            const articleYear = date.getFullYear();
            
            if (selectedYear === 'all') {
                return articleMonth === month;
            } else {
                return articleMonth === month && articleYear === parseInt(selectedYear);
            }
        });
        
        if (monthArticles.length === 0) continue;
        
        const yearLabel = selectedYear === 'all' ? '전체' : selectedYear;
        const fileName = `articles_${yearLabel}_${String(month).padStart(2, '0')}월.csv`;
        
        const csvContent = convertToCSV(monthArticles);
        downloadCSV(csvContent, fileName);
        totalExported += monthArticles.length;
        
        await sleep(100);
    }
    
    showToast(`${selectedMonths.length}개 파일, 총 ${totalExported}개 기사를 CSV로 내보냈습니다.`, 'success');
}

// ========================================
// CSV 변환 함수
// ========================================
function convertToCSV(articles) {
    // CSV 헤더
    const headers = [
        'ID',
        '제목',
        '게재날짜',
        '작성날짜',
        '주제분야',
        'KPI유형',
        '키워드',
        '메모',
        '본문'
    ];
    
    // CSV 행 생성
    const rows = articles.map(article => {
        return [
            article.id || '',
            escapeCSV(article.title || ''),
            formatDateSimple(article.publish_date),
            formatDateSimple(article.created_at),
            (article.subject_tags || []).join('; '),
            (article.kpi_tags || []).join('; '),
            (article.keywords || []).join('; '),
            escapeCSV(article.notes || ''),
            escapeCSV(article.content || '')
        ];
    });
    
    // CSV 문자열 생성
    const csvRows = [headers, ...rows];
    return csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

// ========================================
// CSV 다운로드 함수
// ========================================
function downloadCSV(content, filename) {
    // UTF-8 BOM 추가 (Excel에서 한글 깨짐 방지)
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ========================================
// CSV 이스케이프 함수
// ========================================
function escapeCSV(str) {
    if (!str) return '';
    // 큰따옴표를 두 개로 변환 (CSV 표준)
    return str.replace(/"/g, '""');
}

function formatDateSimple(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}



// ========================================
// 전체 데이터 내보내기
// ========================================
async function exportAllData() {
    if (allArticles.length === 0) {
        showToast('내보낼 기사가 없습니다.', 'warning');
        return;
    }
    
    showLoading();
    try {
        const exportData = {
            exportDate: new Date().toISOString(),
            totalArticles: allArticles.length,
            articles: allArticles
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `articles_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`${allArticles.length}개의 기사를 내보냈습니다.`, 'success');
    } catch (error) {
        console.error('내보내기 실패:', error);
        showToast('데이터 내보내기에 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================
// 필터링 내보내기
// ========================================
async function exportFilteredData() {
    const subjectFilter = document.getElementById('exportSubjectFilter').value;
    const kpiFilter = document.getElementById('exportKpiFilter').value;
    const startDate = document.getElementById('exportStartDate').value;
    const endDate = document.getElementById('exportEndDate').value;
    
    // 필터링
    let filtered = [...allArticles];
    
    if (subjectFilter !== 'all') {
        filtered = filtered.filter(a => a.subject_tags?.includes(subjectFilter));
    }
    
    if (kpiFilter !== 'all') {
        filtered = filtered.filter(a => a.kpi_tags?.includes(kpiFilter));
    }
    
    if (startDate) {
        filtered = filtered.filter(a => new Date(a.publish_date) >= new Date(startDate));
    }
    
    if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        filtered = filtered.filter(a => new Date(a.publish_date) <= endDateTime);
    }
    
    if (filtered.length === 0) {
        showToast('필터 조건에 맞는 기사가 없습니다.', 'warning');
        return;
    }
    
    showLoading();
    try {
        const exportData = {
            exportDate: new Date().toISOString(),
            filters: {
                subject: subjectFilter !== 'all' ? subjectFilter : '전체',
                kpi: kpiFilter !== 'all' ? kpiFilter : '전체',
                startDate: startDate || '제한없음',
                endDate: endDate || '제한없음'
            },
            totalArticles: filtered.length,
            articles: filtered
        };
        
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `articles_filtered_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast(`${filtered.length}개의 기사를 내보냈습니다.`, 'success');
    } catch (error) {
        console.error('내보내기 실패:', error);
        showToast('데이터 내보내기에 실패했습니다.', 'error');
    } finally {
        hideLoading();
    }
}

// ========================================
// 데이터 가져오기 (복원)
// ========================================
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.name.endsWith('.json')) {
        showToast('JSON 파일만 업로드 가능합니다.', 'warning');
        return;
    }
    
    showLoading();
    try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.articles || !Array.isArray(importData.articles)) {
            showToast('올바른 형식의 파일이 아닙니다.', 'error');
            return;
        }
        
        const articlesToImport = importData.articles;
        let successCount = 0;
        let skipCount = 0;
        
        // 기존 ID 목록 생성
        const existingIds = new Set(allArticles.map(a => a.id));
        
        for (const article of articlesToImport) {
            // ID가 이미 존재하면 건너뛰기
            if (existingIds.has(article.id)) {
                skipCount++;
                continue;
            }
            
            try {
                // 필요한 필드만 추출 (시스템 필드 제외)
                const articleData = {
                    title: article.title,
                    content: article.content,
                    publish_date: article.publish_date,
                    subject_tags: article.subject_tags || [],
                    kpi_tags: article.kpi_tags || [],
                    keywords: article.keywords || [],
                    notes: article.notes || ''
                };
                
                await fetch('tables/articles', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(articleData)
                });
                
                successCount++;
            } catch (error) {
                console.error('기사 가져오기 실패:', error);
            }
        }
        
        // 데이터 새로고침
        await loadArticles();
        updateDashboard();
        filterArticles();
        
        let message = `${successCount}개의 기사를 가져왔습니다.`;
        if (skipCount > 0) {
            message += ` (${skipCount}개 중복 건너뜀)`;
        }
        
        showToast(message, 'success');
        closeDataManageModal();
        
    } catch (error) {
        console.error('가져오기 실패:', error);
        showToast('데이터 가져오기에 실패했습니다. 파일 형식을 확인해주세요.', 'error');
    } finally {
        hideLoading();
        // 파일 입력 초기화
        event.target.value = '';
    }
}

