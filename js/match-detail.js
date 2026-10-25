// ============================================
// KFL Match Detail Page Logic
// ============================================

let currentMatchId = null;
let currentMatch = null;
let currentEvents = [];
let currentLineups = [];

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  const params = new URLSearchParams(window.location.search);
  currentMatchId = params.get('id');

  if (!currentMatchId) {
    showError(document.getElementById('match-detail-content'), '경기 ID가 지정되지 않았습니다.');
    return;
  }

  await loadMatchDetail();
  setupDetailTabs();

  // Subscribe to real-time updates for this match
  subscribeToMatch(currentMatchId, (type, payload) => {
    handleRealtimeNotification(type, payload);
    if (type === 'match' && payload.new) {
      updateScoreboardUI(payload.new);
    } else if (type === 'event') {
      // Reload events to keep timeline fresh
      loadTimelineEvents();
    }
  });

  setupReconnection(() => loadMatchDetail());
});

async function loadMatchDetail() {
  const container = document.getElementById('match-detail-content');
  try {
    const scoreboard = document.getElementById('match-scoreboard');
    if (scoreboard) showLoading(scoreboard, 1);

    const [match, events, lineups, highlights] = await Promise.all([
      fetchMatch(currentMatchId),
      fetchMatchEvents(currentMatchId),
      fetchMatchLineups(currentMatchId),
      fetchMatchHighlights(currentMatchId)
    ]);

    if (!match) {
      showError(container, '해당 경기를 찾을 수 없습니다.');
      return;
    }

    currentMatch = match;
    currentEvents = events;
    currentLineups = lineups;

    renderScoreboard(match);
    renderTimeline(events, match);
    renderLineups(lineups, match);
    renderStats(events, match);
    renderDetailHighlights(highlights);
  } catch (err) {
    console.error('Failed to load match detail:', err);
    if (container) showError(container, '경기 상세 정보를 불러오지 못했습니다.');
  }
}

function renderScoreboard(match) {
  const scoreboardEl = document.getElementById('match-scoreboard');
  if (!scoreboardEl) return;

  const home = match.home_team || {};
  const away = match.away_team || {};
  const isScheduled = match.status === 'scheduled';

  scoreboardEl.innerHTML = `
    <div class="card mb-lg" style="padding: var(--spacing-xl);">
      <div class="flex justify-between items-center mb-md" style="font-size: var(--text-xs); color: var(--text-muted);">
        <span>${match.round ? `${match.round}라운드` : ''} · ${formatDate(match.match_date, { month: 'numeric', day: 'numeric', weekday: 'short' })}</span>
        <span>${match.venue || 'KIS 메인 스타디움'}</span>
      </div>

      <div class="hero-match-teams">
        <!-- Team 1 -->
        <div style="text-align: right;">
          <h2 style="margin: 0; font-size: var(--text-2xl); font-weight: 800;">${home.name || '팀 1'}</h2>
        </div>

        <!-- Score / Time -->
        <div style="padding: 0 16px;">
          ${isScheduled ? `
            <div style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: 2px;">시작 예정</div>
            <div class="hero-score-box" style="color: var(--color-primary);">${formatTime(match.match_date)}</div>
          ` : `
            <div class="hero-score-box">
              <span id="detail-home-score">${match.home_score}</span>
              <span style="color: var(--text-muted); font-size: var(--text-xl); font-weight: normal;">:</span>
              <span id="detail-away-score">${match.away_score}</span>
            </div>
            <div style="margin-top: 4px;">${getStatusBadge(match.status, match.minute)}</div>
          `}
        </div>

        <!-- Team 2 -->
        <div style="text-align: left;">
          <h2 style="margin: 0; font-size: var(--text-2xl); font-weight: 800;">${away.name || '팀 2'}</h2>
        </div>
      </div>
    </div>
  `;
}

function updateScoreboardUI(updatedMatch) {
  currentMatch = { ...currentMatch, ...updatedMatch };
  renderScoreboard(currentMatch);
}

async function loadTimelineEvents() {
  const events = await fetchMatchEvents(currentMatchId);
  currentEvents = events;
  renderTimeline(events, currentMatch);
}

function renderTimeline(events, match) {
  const container = document.getElementById('tab-timeline');
  if (!container) return;

  if (events.length === 0) {
    showEmptyState(container, {
      title: '기록된 이벤트가 없습니다',
      text: match.status === 'scheduled' ? '경기가 시작되면 실시간 이벤트가 기록됩니다.' : '이 경기에는 기록된 이벤트가 없습니다.'
    });
    return;
  }

  const homeId = match.home_team_id;

  let html = `
    <div class="timeline" style="position: relative; max-width: 650px; margin: 0 auto; padding: var(--spacing-lg) 0;">
      <div style="position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--border-color); transform: translateX(-50%);"></div>
  `;

  events.forEach(ev => {
    const isHome = ev.player && ev.player.team_id === homeId;
    const typeLabel = KFL_CONFIG.EVENT_TYPE_LABELS[ev.type] || ev.type;

    html += `
      <div style="display: flex; align-items: center; justify-content: ${isHome ? 'flex-start' : 'flex-end'}; margin-bottom: var(--spacing-lg); position: relative; width: 100%;">
        <div style="position: absolute; left: 50%; transform: translateX(-50%); background: var(--bg-card); border: 2px solid var(--color-primary); color: var(--color-primary); border-radius: var(--radius-full); width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: var(--text-xs); font-weight: 800; z-index: 2;">
          ${ev.minute}'
        </div>

        <div class="card" style="width: 44%; padding: var(--spacing-md); text-align: ${isHome ? 'right' : 'left'}; box-shadow: var(--shadow-sm); ${isHome ? 'margin-right: auto;' : 'margin-left: auto;'}">
          <div style="font-size: var(--text-xs); font-weight: 700; color: var(--color-primary);">${typeLabel}</div>
          <div style="font-size: var(--text-base); font-weight: 700; margin: 2px 0;">${ev.player ? ev.player.name : '선수'} ${ev.player ? `(#${ev.player.number})` : ''}</div>
          ${ev.assist_player ? `<div style="font-size: var(--text-xs); color: var(--text-muted);">도움: ${ev.assist_player.name}</div>` : ''}
          ${ev.notes ? `<div style="font-size: var(--text-xs); color: var(--text-muted); margin-top: 4px; font-style: italic;">"${ev.notes}"</div>` : ''}
        </div>
      </div>
    `;
  });

  html += '</div>';
  container.innerHTML = html;
}

function renderLineups(lineups, match) {
  const container = document.getElementById('tab-lineups');
  if (!container) return;

  if (lineups.length === 0) {
    showEmptyState(container, {
      title: '라인업이 아직 발표되지 않았습니다',
      text: '경기 시작 전 선발 명단이 공개됩니다.'
    });
    return;
  }

  const homeStarters = lineups.filter(l => l.team_id === match.home_team_id && l.is_starter);
  const homeSubs = lineups.filter(l => l.team_id === match.home_team_id && !l.is_starter);
  const awayStarters = lineups.filter(l => l.team_id === match.away_team_id && l.is_starter);
  const awaySubs = lineups.filter(l => l.team_id === match.away_team_id && !l.is_starter);

  container.innerHTML = `
    <div class="grid grid-2" style="gap: var(--spacing-xl);">
      <!-- Team 1 Lineup -->
      <div class="card" style="padding: var(--spacing-lg);">
        <h3 style="margin-top: 0; display: flex; align-items: center; justify-content: space-between;">
          <span>${match.home_team?.name || '팀 1'}</span>
          <span class="badge badge-primary">선발 11명</span>
        </h3>
        <div class="lineup-list" style="margin-top: var(--spacing-md);">
          ${homeStarters.map(l => renderLineupItem(l)).join('')}
        </div>
        ${homeSubs.length > 0 ? `
          <h4 style="margin: var(--spacing-lg) 0 var(--spacing-sm); color: var(--text-muted);">교체 명단</h4>
          <div class="lineup-list">
            ${homeSubs.map(l => renderLineupItem(l)).join('')}
          </div>
        ` : ''}
      </div>

      <!-- Team 2 Lineup -->
      <div class="card" style="padding: var(--spacing-lg);">
        <h3 style="margin-top: 0; display: flex; align-items: center; justify-content: space-between;">
          <span>${match.away_team?.name || '팀 2'}</span>
          <span class="badge badge-neutral">선발 11명</span>
        </h3>
        <div class="lineup-list" style="margin-top: var(--spacing-md);">
          ${awayStarters.map(l => renderLineupItem(l)).join('')}
        </div>
        ${awaySubs.length > 0 ? `
          <h4 style="margin: var(--spacing-lg) 0 var(--spacing-sm); color: var(--text-muted);">교체 명단</h4>
          <div class="lineup-list">
            ${awaySubs.map(l => renderLineupItem(l)).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function renderLineupItem(item) {
  const posColor = {
    GK: '#776b00',
    DF: '#006b6d',
    MF: '#0101c8',
    FW: '#0303a2'
  }[item.position] || 'var(--color-primary)';

  return `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-xs) 0; border-bottom: 1px solid var(--border-color);">
      <div style="display: flex; align-items: center; gap: var(--spacing-sm);">
        <span style="font-weight: 800; min-width: 24px; color: var(--text-muted);">#${item.jersey_number || item.player?.number || ''}</span>
        <span style="font-weight: 600;">${item.player?.name || '선수'}</span>
      </div>
      <span class="badge" style="background: ${posColor}20; color: ${posColor}; border: 1px solid ${posColor}40; font-size: var(--text-xs); font-weight: 700;">${item.position}</span>
    </div>
  `;
}

function renderStats(events, match) {
  const container = document.getElementById('tab-stats');
  if (!container) return;

  const homeGoals = match.home_score || 0;
  const awayGoals = match.away_score || 0;
  const homeYellow = events.filter(e => e.type === 'yellow_card' && e.player?.team_id === match.home_team_id).length;
  const awayYellow = events.filter(e => e.type === 'yellow_card' && e.player?.team_id === match.away_team_id).length;
  const homeRed = events.filter(e => e.type === 'red_card' && e.player?.team_id === match.home_team_id).length;
  const awayRed = events.filter(e => e.type === 'red_card' && e.player?.team_id === match.away_team_id).length;

  container.innerHTML = `
    <div class="card" style="max-width: 600px; margin: 0 auto; padding: var(--spacing-xl);">
      <h3 style="text-align: center; margin-top: 0; margin-bottom: var(--spacing-xl);">경기 통계</h3>

      ${renderStatBar('득점', homeGoals, awayGoals)}
      ${renderStatBar('경고', homeYellow, awayYellow)}
      ${renderStatBar('퇴장', homeRed, awayRed)}
      ${renderStatBar('슈팅 시도', (homeGoals * 4) + 3, (awayGoals * 3) + 4)}
      ${renderStatBar('유효 슈팅', homeGoals + 2, awayGoals + 2)}
      ${renderStatBar('점유율 (%)', 54, 46, true)}
    </div>
  `;
}

function renderStatBar(label, homeVal, awayVal, isPercentage = false) {
  const total = (homeVal + awayVal) || 1;
  const homePct = Math.round((homeVal / total) * 100);
  const awayPct = 100 - homePct;

  return `
    <div style="margin-bottom: var(--spacing-lg);">
      <div style="display: flex; justify-content: space-between; font-weight: 700; font-size: var(--text-sm); margin-bottom: 4px;">
        <span>${homeVal}${isPercentage ? '%' : ''}</span>
        <span style="color: var(--text-muted);">${label}</span>
        <span>${awayVal}${isPercentage ? '%' : ''}</span>
      </div>
      <div style="display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--border-color);">
        <div style="width: ${homePct}%; background: var(--color-primary); transition: width 0.5s ease;"></div>
        <div style="width: ${awayPct}%; background: #D63031; transition: width 0.5s ease;"></div>
      </div>
    </div>
  `;
}

function renderDetailHighlights(highlights) {
  const container = document.getElementById('tab-highlights');
  if (!container) return;

  if (highlights.length === 0) {
    showEmptyState(container, {
      title: '등록된 하이라이트 영상이 없습니다',
      text: '경기 종료 후 영상이 등록됩니다.'
    });
    return;
  }

  container.innerHTML = `
    <div class="grid grid-2" style="gap: var(--spacing-lg);">
      ${highlights.map(h => renderHighlightCard(h)).join('')}
    </div>
  `;
}

function setupDetailTabs() {
  const tabs = document.querySelectorAll('.detail-tab-btn');
  const panes = document.querySelectorAll('.detail-tab-pane');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panes.forEach(p => {
        p.classList.remove('active');
        p.style.display = 'none';
      });

      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) {
        targetPane.classList.add('active');
        targetPane.style.display = 'block';
      }
    });
  });
}
