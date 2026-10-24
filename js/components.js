// ============================================
// KFL Shared UI Components
// ============================================
// Renders navigation, footer, toasts, and modals
// shared across all pages.

/**
 * Get current page name from URL
 */
function getCurrentPage() {
  const path = window.location.pathname;
  const file = path.split('/').pop() || 'index.html';
  return file.replace('.html', '');
}

/**
 * Render top navigation
 */
function renderNav() {
  const page = getCurrentPage();
  const navEl = document.getElementById('app-nav');
  if (!navEl) return;

  navEl.innerHTML = `
    <nav class="top-nav" role="navigation" aria-label="메인 내비게이션">
      <div class="container nav-container">
        <a href="index.html" class="nav-brand">
          <span>KFL</span>
        </a>
        
        <div class="nav-links">
          <a href="index.html" class="nav-link ${page === 'index' ? 'active' : ''}" id="nav-home">홈</a>
          <a href="matches.html" class="nav-link ${page === 'matches' || page === 'match-detail' ? 'active' : ''}" id="nav-matches">경기 일정</a>
          <a href="standings.html" class="nav-link ${page === 'standings' ? 'active' : ''}" id="nav-standings">순위</a>
          <a href="players.html" class="nav-link ${page === 'players' ? 'active' : ''}" id="nav-players">선수</a>
          <a href="highlights.html" class="nav-link ${page === 'highlights' ? 'active' : ''}" id="nav-highlights">영상</a>
          <a href="admin.html" class="nav-link ${page === 'admin' ? 'active' : ''}" id="nav-admin">관리자</a>
        </div>

        <div class="nav-actions">
          <a href="admin.html" class="btn btn-sm btn-outline hide-on-desktop" style="font-size: 11px;">관리자</a>
        </div>
      </div>
    </nav>
  `;
}

/**
 * Render bottom navigation (mobile)
 */
function renderBottomNav() {
  const page = getCurrentPage();
  const navEl = document.getElementById('app-bottom-nav');
  if (!navEl) return;

  navEl.innerHTML = `
    <nav class="bottom-nav" role="navigation" aria-label="모바일 내비게이션">
      <div class="bottom-nav-items">
        <a href="index.html" class="bottom-nav-item ${page === 'index' ? 'active' : ''}" id="bnav-home">
          <span class="bottom-nav-label">홈</span>
        </a>
        <a href="matches.html" class="bottom-nav-item ${page === 'matches' || page === 'match-detail' ? 'active' : ''}" id="bnav-matches">
          <span class="bottom-nav-label">경기</span>
        </a>
        <a href="standings.html" class="bottom-nav-item ${page === 'standings' ? 'active' : ''}" id="bnav-standings">
          <span class="bottom-nav-label">순위</span>
        </a>
        <a href="players.html" class="bottom-nav-item ${page === 'players' ? 'active' : ''}" id="bnav-players">
          <span class="bottom-nav-label">선수</span>
        </a>
        <a href="highlights.html" class="bottom-nav-item ${page === 'highlights' ? 'active' : ''}" id="bnav-highlights">
          <span class="bottom-nav-label">영상</span>
        </a>
      </div>
    </nav>
  `;
}

/**
 * Render footer
 */
function renderFooter() {
  const footerEl = document.getElementById('app-footer');
  if (!footerEl) return;

  footerEl.innerHTML = `
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-brand">
            <span class="footer-brand-text">KFL - KIS Football League</span>
          </div>
          <div class="footer-links">
            <a href="index.html" class="footer-link">홈</a>
            <a href="matches.html" class="footer-link">경기</a>
            <a href="standings.html" class="footer-link">순위</a>
            <a href="players.html" class="footer-link">선수</a>
            <a href="admin.html" class="footer-link">관리자</a>
          </div>
          <span class="footer-copy">${new Date().getFullYear()} KIS Football League. All rights reserved.</span>
        </div>
      </div>
    </footer>
  `;
}

/**
 * Initialize shared components
 */
function initComponents() {
  renderNav();
  renderBottomNav();
  renderFooter();
  initToastContainer();
  registerServiceWorker();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('[PWA] Service Worker registered:', reg.scope))
      .catch((err) => console.log('[PWA] Service Worker registration failed:', err));
  }
}


// ── Toast System ──

function initToastContainer() {
  if (document.getElementById('toast-container')) return;
  const container = document.createElement('div');
  container.id = 'toast-container';
  container.className = 'toast-container';
  container.setAttribute('role', 'alert');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
}

/**
 * Show a toast notification
 * @param {Object} options - { title, message, type: 'info'|'goal'|'warning'|'error', duration }
 */
function showToast({ title, message, type = 'info', duration = KFL_CONFIG.TOAST_DURATION }) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = createElement('div', `toast toast--${type}`);
  toast.innerHTML = `
    <div class="toast-body">
      <div class="toast-title">${title}</div>
      ${message ? `<div class="toast-message">${message}</div>` : ''}
    </div>
    <button class="toast-close" aria-label="닫기">✕</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => removeToast(toast));

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }

  return toast;
}

function removeToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.classList.add('toast-leaving');
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}


// ── Modal System ──

/**
 * Show a modal
 * @param {Object} options - { title, content (HTML string), footer (HTML string), onClose }
 */
function showModal({ title, content, footer = '', onClose, id = 'app-modal' }) {
  // Remove existing modal with same ID
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const overlay = createElement('div', 'modal-overlay');
  overlay.id = id;
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">${title}</h3>
        <button class="modal-close" aria-label="닫기">✕</button>
      </div>
      <div class="modal-body">${content}</div>
      ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add('no-scroll');

  // Animate in
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Close handlers
  const closeBtn = overlay.querySelector('.modal-close');
  closeBtn.addEventListener('click', () => closeModal(id, onClose));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(id, onClose);
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      closeModal(id, onClose);
      document.removeEventListener('keydown', escHandler);
    }
  });

  return overlay;
}

function closeModal(id = 'app-modal', onClose) {
  const overlay = document.getElementById(id);
  if (!overlay) return;
  
  overlay.classList.remove('active');
  document.body.classList.remove('no-scroll');
  
  overlay.addEventListener('transitionend', () => {
    overlay.remove();
    if (onClose) onClose();
  }, { once: true });
}


// ── Loading States ──

/**
 * Show loading skeleton in a container
 */
function showLoading(container, count = 3) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return;
  
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="card skeleton-card" style="animation-delay: ${i * 100}ms">
        <div class="card-body">
          <div class="skeleton skeleton-text" style="width: 60%"></div>
          <div class="skeleton skeleton-text" style="width: 80%"></div>
          <div class="skeleton skeleton-text-sm" style="width: 40%"></div>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
}

/**
 * Show centered loading spinner
 */
function showSpinner(container) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return;
  
  container.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <span>데이터를 불러오는 중...</span>
    </div>
  `;
}

/**
 * Show empty state
 */
function showEmptyState(container, { title = '데이터 없음', text = '' } = {}) {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <h3 class="empty-state-title">${title}</h3>
      ${text ? `<p class="empty-state-text">${text}</p>` : ''}
    </div>
  `;
}

/**
 * Show error state
 */
function showError(container, message = '데이터를 불러오는데 실패했습니다.') {
  if (typeof container === 'string') {
    container = document.querySelector(container);
  }
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <h3 class="empty-state-title">오류 발생</h3>
      <p class="empty-state-text">${message}</p>
      <button class="btn btn-sm btn-outline mt-md" onclick="location.reload()">다시 시도</button>
    </div>
  `;
}


// ── Match Card Renderer ──

/**
 * Render a match card
 */
function renderMatchCard(match, options = {}) {
  const { link = true } = options;
  const status = match.status || 'scheduled';
  const isScheduled = status === 'scheduled';
  const isLive = status === 'live' || status === 'halftime';
  
  const homeTeam = match.home_team || {};
  const awayTeam = match.away_team || {};
  
  const wrapper = link ? 'a' : 'div';
  const href = link ? `href="match-detail.html?id=${match.id}"` : '';
  
  let scoreHTML;
  if (isScheduled) {
    scoreHTML = `
      <div class="match-score match-score--scheduled">
        <span>${formatTime(match.match_date) || 'vs'}</span>
      </div>
    `;
  } else {
    scoreHTML = `
      <div class="match-score">
        <span id="score-home-${match.id}">${match.home_score}</span>
        <span style="color: var(--text-muted); font-size: var(--text-sm); font-weight: normal;">:</span>
        <span id="score-away-${match.id}">${match.away_score}</span>
      </div>
    `;
  }

  return `
    <${wrapper} ${href} class="card card-interactive match-card" data-match-id="${match.id}" id="match-card-${match.id}">
      <div class="match-card-header">
        <span>${match.round ? `${match.round}라운드` : ''} · ${formatDate(match.match_date, { month: 'numeric', day: 'numeric', weekday: 'short' })}</span>
        <span>${match.venue || 'KIS 메인 스타디움'}</span>
      </div>
      <div class="match-card-body">
        <div class="match-team home">
          <span>${homeTeam.name || '홈팀'}</span>
        </div>
        ${scoreHTML}
        <div class="match-team away">
          <span>${awayTeam.name || '원정팀'}</span>
        </div>
      </div>
      <div class="match-card-footer">
        ${getStatusBadge(status, match.minute)}
        <span style="color: var(--color-primary); font-size: var(--text-xs);">상세 보기 →</span>
      </div>
    </${wrapper}>
  `;
}

/**
 * Render form guide (W/D/L indicators)
 */
function renderFormGuide(form) {
  if (!form || form.length === 0) return '';
  return `
    <div class="standings-form">
      ${form.map(r => `<span class="standings-form-item form-${r.toLowerCase()}">${r}</span>`).join('')}
    </div>
  `;
}
