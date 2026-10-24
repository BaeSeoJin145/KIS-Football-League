// ============================================
// KFL Home Page Logic - Bento Modern Layout
// Palette: charcoal surfaces with muted green accents
// ============================================

let homeFinishedMatches = [];
let homeScheduledMatches = [];
let currentMatchesTab = 'recent';

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  await loadHomePageData();

  // Setup Realtime subscriptions
  subscribeToMatches((type, payload) => {
    handleRealtimeNotification(type, payload);
    refreshHeroLiveScore(payload.new);
  });

  subscribeToMatchEvents((type, payload) => {
    handleRealtimeNotification(type, payload);
  });

  setupReconnection(() => loadHomePageData());
});

async function loadHomePageData() {
  const heroContainer = document.getElementById('hero-match-container');
  const miniTableBody = document.getElementById('mini-standings-body');
  const topScorersContainer = document.getElementById('top-scorers-container');
  const highlightsContainer = document.getElementById('home-highlights-container');

  try {
    if (heroContainer) showLoading(heroContainer, 1);

    const [season, matches, teams, events, highlights] = await Promise.all([
      fetchActiveSeason(),
      fetchMatches(),
      fetchTeams(),
      fetchAllEvents(),
      fetchMatchHighlights()
    ]);

    const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'halftime');
    homeScheduledMatches = matches.filter(m => m.status === 'scheduled');
    homeFinishedMatches = matches.filter(m => m.status === 'finished').reverse();

    // 1. Bento Tile 1: Featured Hero Match
    if (heroContainer) {
      if (liveMatches.length > 0) {
        heroContainer.innerHTML = renderHeroMatchCard(liveMatches[0], true);
      } else if (homeScheduledMatches.length > 0) {
        heroContainer.innerHTML = renderHeroMatchCard(homeScheduledMatches[0], false);
      } else if (homeFinishedMatches.length > 0) {
        heroContainer.innerHTML = renderHeroMatchCard(homeFinishedMatches[0], false, true);
      } else {
        heroContainer.innerHTML = `
          <div class="card empty-state">
            <h3 class="empty-state-title">등록된 경기가 없습니다</h3>
            <p class="empty-state-text">관리자 페이지에서 경기 일정을 추가해주세요.</p>
          </div>
        `;
      }
    }

    // 2. Bento Tile 2: League 1st Place Glance
    const standings = calculateStandings(matches, teams);
    if (standings.length > 0) {
      const leader = standings[0];
      const leaderNameEl = document.getElementById('bento-leader-name');
      const leaderPtsEl = document.getElementById('bento-leader-pts');
      const leaderRecordEl = document.getElementById('bento-leader-record');

      if (leaderNameEl) leaderNameEl.textContent = leader.team_name;
      if (leaderPtsEl) leaderPtsEl.textContent = leader.points;
      if (leaderRecordEl) leaderRecordEl.textContent = `${leader.won}승 ${leader.drawn}무 ${leader.lost}패 (${leader.goals_for}득점)`;
    }

    // 3. Bento Tile 3: Recent & Upcoming Matches
    renderHomeMatchesList();

    // 4. Bento Tile 4: Mini Standings Table (TOP 4)
    if (miniTableBody) {
      const top4 = standings.slice(0, 4);
      miniTableBody.innerHTML = top4.map((team, idx) => `
        <tr class="table-row-hover" onclick="location.href='standings.html'">
          <td style="font-weight: 800; color: ${idx === 0 ? 'var(--kfl-mint)' : 'inherit'}; text-align: center;">${idx + 1}</td>
          <td><strong style="color: ${idx === 0 ? '#ffffff' : 'var(--text-primary)'};">${team.team_name}</strong></td>
          <td style="text-align: center;">${team.played}</td>
          <td style="text-align: center; color: var(--kfl-base-blue); font-weight: 700;">${team.won}</td>
          <td style="text-align: center; color: var(--text-muted);">${team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}</td>
          <td style="text-align: center;"><strong style="color: var(--kfl-dark-blue);">${team.points}</strong></td>
        </tr>
      `).join('');
    }

    // 5. Bento Tile 5: Top Scorers (Golden Boot)
    if (topScorersContainer) {
      const scorers = calculateTopScorers(events, 3);
      if (scorers.length > 0) {
        topScorersContainer.innerHTML = scorers.map((s, idx) => {
          const rankBadge = idx === 0 ? 'badge-yellow' : idx === 1 ? 'badge-mint' : 'badge-neutral';
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border-subtle);">
              <div style="display: flex; align-items: center; gap: 10px;">
                <span class="badge ${rankBadge}" style="min-width: 24px; text-align: center; font-weight: 800;">${idx + 1}</span>
                <div>
                  <div style="font-weight: 700; font-size: var(--text-sm);">${s.player ? s.player.name : '선수'}</div>
                  <div style="font-size: var(--text-2xs); color: var(--text-muted);">${s.team ? s.team.name : ''} #${s.player ? s.player.number : ''}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-size: var(--text-lg); font-weight: 900; color: var(--kfl-dark-blue);">${s.goals}</span>
                <span style="font-size: var(--text-2xs); color: var(--text-muted);">골</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        showEmptyState(topScorersContainer, { title: '득점 기록 없음' });
      }
    }

    // 6. Bento Tile 6: Video Highlights
    if (highlightsContainer) {
      if (highlights.length > 0) {
        highlightsContainer.innerHTML = highlights.slice(0, 2).map(h => renderHighlightCard(h)).join('');
      } else {
        showEmptyState(highlightsContainer, { title: '등록된 영상 없음' });
      }
    }

  } catch (err) {
    console.error('Error loading home page:', err);
    if (heroContainer) showError(heroContainer, '홈 데이터를 불러오지 못했습니다.');
  }
}

/**
 * Render Bento Hero Match Card
 */
function renderHeroMatchCard(match, isLive = false, isFinished = false) {
  const home = match.home_team || {};
  const away = match.away_team || {};
  const isScheduled = match.status === 'scheduled';

  return `
    <div class="hero-match-banner" style="height: 100%; display: flex; flex-direction: column; justify-content: space-between;">
      <div class="hero-match-header">
        <div class="flex items-center gap-xs">
          ${getStatusBadge(match.status, match.minute)}
          <span style="font-size: var(--text-2xs); color: rgba(255, 255, 255, 0.78); font-weight: 600;">
            ${match.round ? `${match.round}라운드` : ''} · ${match.venue || 'KIS 메인 스타디움'}
          </span>
        </div>
        <a href="match-detail.html?id=${match.id}" class="btn btn-sm btn-outline">경기 센터 →</a>
      </div>

      <div class="hero-match-teams">
        <!-- Home Team -->
        <div style="text-align: right;">
          <div class="hero-team-name">${home.name || '홈팀'}</div>
        </div>

        <!-- Score or Kick-off -->
        <div style="padding: 0 16px;">
          ${isScheduled ? `
            <div style="font-size: var(--text-2xs); color: rgba(255, 255, 255, 0.72); margin-bottom: 2px;">KICK OFF</div>
            <div class="hero-score-box">${formatTime(match.match_date)}</div>
            <div style="font-size: var(--text-2xs); color: rgba(255, 255, 255, 0.72); margin-top: 2px;">${formatDate(match.match_date, { month: 'numeric', day: 'numeric', weekday: 'short' })}</div>
          ` : `
            <div class="hero-score-box">
              <span id="hero-home-score">${match.home_score}</span>
              <span style="color: var(--kfl-mint); font-size: var(--text-2xl); font-weight: 300;">:</span>
              <span id="hero-away-score">${match.away_score}</span>
            </div>
            <div style="margin-top: 4px;">${getStatusBadge(match.status, match.minute)}</div>
          `}
        </div>

        <!-- Away Team -->
        <div style="text-align: left;">
          <div class="hero-team-name">${away.name || '원정팀'}</div>
        </div>
      </div>

      <div style="margin-top: 20px; font-size: var(--text-2xs); color: var(--text-muted); display: flex; justify-content: space-between; align-items: center;">
        <span>실시간 스코어보드 자동 갱신</span>
        <span style="color: var(--kfl-dark-blue); background: var(--brand-mint-soft); padding: 2px 6px;">● LIVE SYNC</span>
      </div>
    </div>
  `;
}

function refreshHeroLiveScore(match) {
  if (!match) return;
  const homeEl = document.getElementById('hero-home-score');
  const awayEl = document.getElementById('hero-away-score');
  if (homeEl) homeEl.textContent = match.home_score;
  if (awayEl) awayEl.textContent = match.away_score;
}

function switchHomeMatchesTab(tab) {
  currentMatchesTab = tab;
  const btnRecent = document.getElementById('bento-tab-recent');
  const btnUpcoming = document.getElementById('bento-tab-upcoming');

  if (btnRecent && btnUpcoming) {
    if (tab === 'recent') {
      btnRecent.classList.add('active');
      btnUpcoming.classList.remove('active');
    } else {
      btnRecent.classList.remove('active');
      btnUpcoming.classList.add('active');
    }
  }

  renderHomeMatchesList();
}

function renderHomeMatchesList() {
  const container = document.getElementById('home-matches-display');
  if (!container) return;

  const list = currentMatchesTab === 'recent' ? homeFinishedMatches : homeScheduledMatches;

  if (list.length === 0) {
    showEmptyState(container, {
      title: currentMatchesTab === 'recent' ? '최근 경기 결과가 없습니다' : '예정된 경기가 없습니다'
    });
    return;
  }

  container.innerHTML = list.slice(0, 3).map(m => renderMatchCard(m)).join('');
}

// Expose tab switcher
window.switchHomeMatchesTab = switchHomeMatchesTab;
