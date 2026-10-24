// ============================================
// KFL Matches Page Logic
// ============================================

let allMatches = [];
let allTeams = [];
let activeFilters = {
  round: 'all',
  status: 'all',
  teamId: 'all',
  date: ''
};

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  await loadMatchesData();
  setupFilterHandlers();

  // Realtime subscription
  subscribeToMatches((type, payload) => {
    handleRealtimeNotification(type, payload);
    if (payload.new) {
      updateMatchInList(payload.new);
    }
  });

  setupReconnection(() => loadMatchesData());
});

async function loadMatchesData() {
  const container = document.getElementById('matches-list-container');
  try {
    if (container) showLoading(container, 4);

    const [matches, teams] = await Promise.all([
      fetchMatches(),
      fetchTeams()
    ]);

    allMatches = matches;
    allTeams = teams;

    populateTeamSelect(teams);
    populateRoundButtons(matches);
    renderFilteredMatches();
  } catch (err) {
    console.error('Failed to load matches:', err);
    if (container) showError(container, '경기 일정을 불러오는데 실패했습니다.');
  }
}

function populateTeamSelect(teams) {
  const select = document.getElementById('team-filter-select');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="all">모든 구단</option>' +
    teams.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  if (currentVal) select.value = currentVal;
}

function populateRoundButtons(matches) {
  const roundContainer = document.getElementById('round-filters-container');
  if (!roundContainer) return;

  const rounds = [...new Set(matches.map(m => m.round).filter(Boolean))].sort((a, b) => a - b);
  
  let html = `<button class="chip ${activeFilters.round === 'all' ? 'active' : ''}" data-round="all">전체 라운드</button>`;
  rounds.forEach(r => {
    html += `<button class="chip ${activeFilters.round === String(r) ? 'active' : ''}" data-round="${r}">${r}라운드</button>`;
  });
  roundContainer.innerHTML = html;

  roundContainer.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      roundContainer.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilters.round = btn.getAttribute('data-round');
      renderFilteredMatches();
    });
  });
}

function setupFilterHandlers() {
  // Status tabs
  const statusTabs = document.querySelectorAll('.status-tab');
  statusTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      statusTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilters.status = tab.getAttribute('data-status');
      renderFilteredMatches();
    });
  });

  // Team select
  const teamSelect = document.getElementById('team-filter-select');
  if (teamSelect) {
    teamSelect.addEventListener('change', (e) => {
      activeFilters.teamId = e.target.value;
      renderFilteredMatches();
    });
  }

  // Date input
  const dateInput = document.getElementById('date-filter-input');
  if (dateInput) {
    dateInput.addEventListener('change', (e) => {
      activeFilters.date = e.target.value;
      renderFilteredMatches();
    });
  }

  // Reset button
  const resetBtn = document.getElementById('reset-filters-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      activeFilters = { round: 'all', status: 'all', teamId: 'all', date: '' };
      if (teamSelect) teamSelect.value = 'all';
      if (dateInput) dateInput.value = '';
      const roundContainer = document.getElementById('round-filters-container');
      if (roundContainer) {
        roundContainer.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
        const allBtn = roundContainer.querySelector('[data-round="all"]');
        if (allBtn) allBtn.classList.add('active');
      }
      statusTabs.forEach(t => t.classList.remove('active'));
      const allStatusTab = document.querySelector('.status-tab[data-status="all"]');
      if (allStatusTab) allStatusTab.classList.add('active');
      renderFilteredMatches();
    });
  }
}

function renderFilteredMatches() {
  const container = document.getElementById('matches-list-container');
  const countBadge = document.getElementById('matches-count-badge');
  if (!container) return;

  let filtered = [...allMatches];

  // Filter by Round
  if (activeFilters.round !== 'all') {
    filtered = filtered.filter(m => String(m.round) === activeFilters.round);
  }

  // Filter by Status
  if (activeFilters.status !== 'all') {
    if (activeFilters.status === 'live') {
      filtered = filtered.filter(m => m.status === 'live' || m.status === 'halftime');
    } else {
      filtered = filtered.filter(m => m.status === activeFilters.status);
    }
  }

  // Filter by Team
  if (activeFilters.teamId !== 'all') {
    filtered = filtered.filter(m => m.home_team_id === activeFilters.teamId || m.away_team_id === activeFilters.teamId);
  }

  // Filter by Date
  if (activeFilters.date) {
    filtered = filtered.filter(m => formatDateInput(m.match_date) === activeFilters.date);
  }

  if (countBadge) {
    countBadge.textContent = `${filtered.length} 경기`;
  }

  if (filtered.length === 0) {
    showEmptyState(container, {
      title: '조건에 맞는 경기가 없습니다',
      text: '선택한 필터를 변경해보세요.'
    });
    return;
  }

  // Group matches by date
  const grouped = groupBy(filtered, m => formatDate(m.match_date, { month: 'long', day: 'numeric', weekday: 'short' }));

  let html = '';
  for (const [dateLabel, matches] of Object.entries(grouped)) {
    html += `
      <div class="matches-group" style="margin-bottom: var(--spacing-xl);">
        <div style="display: flex; align-items: center; gap: var(--spacing-sm); margin-bottom: var(--spacing-md);">
          <span style="font-size: var(--text-base); font-weight: 700; color: var(--color-primary);">${dateLabel}</span>
          <span style="font-size: var(--text-xs); color: var(--text-muted); background: var(--bg-surface); padding: 2px 8px; border-radius: var(--radius-full);">${matches.length}경기</span>
        </div>
        <div class="grid grid-2" style="gap: var(--spacing-md);">
          ${matches.map(m => renderMatchCard(m)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

function updateMatchInList(updatedMatch) {
  const idx = allMatches.findIndex(m => m.id === updatedMatch.id);
  if (idx >= 0) {
    allMatches[idx] = { ...allMatches[idx], ...updatedMatch };
    renderFilteredMatches();
  }
}
