// ============================================
// KFL Players Page Logic
// ============================================

let allPlayers = [];
let allTeams = [];
let allEvents = [];
let selectedTeamId = 'all';
let selectedPosition = 'all';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  await loadPlayersData();
  setupFilters();

  setupReconnection(() => loadPlayersData());
});

async function loadPlayersData() {
  const container = document.getElementById('players-grid-container');
  try {
    if (container) showLoading(container, 6);

    const [players, teams, events] = await Promise.all([
      fetchPlayers(),
      fetchTeams(),
      fetchAllEvents()
    ]);

    allPlayers = players;
    allTeams = teams;
    allEvents = events;

    renderTeamPills(teams);
    renderFilteredPlayers();
  } catch (err) {
    console.error('Failed to load players:', err);
    if (container) showError(container, '선수 명단을 불러오는데 실패했습니다.');
  }
}

function renderTeamPills(teams) {
  const container = document.getElementById('team-pills-container');
  if (!container) return;

  let html = `<button class="chip ${selectedTeamId === 'all' ? 'active' : ''}" data-team-id="all">모든 구단 (${allPlayers.length})</button>`;
  teams.forEach(t => {
    const count = allPlayers.filter(p => p.team_id === t.id).length;
    html += `<button class="chip ${selectedTeamId === t.id ? 'active' : ''}" data-team-id="${t.id}">${t.name} (${count})</button>`;
  });
  container.innerHTML = html;

  container.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTeamId = btn.getAttribute('data-team-id');
      renderFilteredPlayers();
    });
  });
}

function setupFilters() {
  // Position chips
  const posChips = document.querySelectorAll('.position-filter-chip');
  posChips.forEach(chip => {
    chip.addEventListener('click', () => {
      posChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedPosition = chip.getAttribute('data-pos');
      renderFilteredPlayers();
    });
  });

  // Search input
  const searchInput = document.getElementById('player-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderFilteredPlayers();
    });
  }
}

function renderFilteredPlayers() {
  const container = document.getElementById('players-grid-container');
  const countBadge = document.getElementById('players-count-badge');
  if (!container) return;

  let filtered = [...allPlayers];

  if (selectedTeamId !== 'all') {
    filtered = filtered.filter(p => p.team_id === selectedTeamId);
  }

  if (selectedPosition !== 'all') {
    filtered = filtered.filter(p => p.position === selectedPosition);
  }

  if (searchQuery) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(searchQuery) ||
      (p.teams && p.teams.name.toLowerCase().includes(searchQuery)) ||
      String(p.number) === searchQuery
    );
  }

  if (countBadge) {
    countBadge.textContent = `${filtered.length} 명`;
  }

  if (filtered.length === 0) {
    showEmptyState(container, {
      title: '일치하는 선수가 없습니다',
      text: '검색어나 필터 조건을 변경해보세요.'
    });
    return;
  }

  container.innerHTML = filtered.map(player => {
    const goals = allEvents.filter(e => e.type === 'goal' && e.player_id === player.id).length;
    const assists = allEvents.filter(e => e.type === 'goal' && e.assist_player_id === player.id).length;
    const cards = allEvents.filter(e => (e.type === 'yellow_card' || e.type === 'red_card') && e.player_id === player.id).length;
    const team = player.teams || {};

    const posColor = {
      GK: '#776b00',
      DF: '#006b6d',
      MF: '#0101c8',
      FW: '#0303a2'
    }[player.position] || 'var(--color-primary)';

    return `
      <div class="card card-interactive" onclick="openPlayerModal('${player.id}')" style="padding: var(--spacing-lg); display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: var(--spacing-md);">
            <span style="font-size: 2.2rem; font-weight: 900; line-height: 1; color: var(--color-primary); opacity: 0.9;">#${player.number}</span>
            <span class="badge" style="background: ${posColor}20; color: ${posColor}; border: 1px solid ${posColor}50; font-weight: 800;">${player.position}</span>
          </div>

          <h3 style="margin: 0; font-size: var(--text-lg); font-weight: 800;">${player.name}</h3>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px; font-size: var(--text-xs); color: var(--text-muted);">
            <span>${team.name || '무소속'}</span>
            <span>· ${player.nationality || '대한민국'}</span>
          </div>
        </div>

        <div style="margin-top: var(--spacing-lg); padding-top: var(--spacing-sm); border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; font-size: var(--text-xs);">
          <span>득점 <strong>${goals}</strong></span>
          <span>도움 <strong>${assists}</strong></span>
          <span>경고·퇴장 <strong>${cards}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

function openPlayerModal(playerId) {
  const player = allPlayers.find(p => p.id === playerId);
  if (!player) return;

  const team = player.teams || {};
  const goals = allEvents.filter(e => e.type === 'goal' && e.player_id === player.id).length;
  const assists = allEvents.filter(e => e.type === 'goal' && e.assist_player_id === player.id).length;
  const yellows = allEvents.filter(e => e.type === 'yellow_card' && e.player_id === player.id).length;
  const reds = allEvents.filter(e => e.type === 'red_card' && e.player_id === player.id).length;

  const content = `
    <div style="text-align: center; margin-bottom: var(--spacing-lg);">
      <div style="font-size: var(--text-3xl); font-weight: 900; color: var(--color-primary); margin-bottom: 4px;">
        #${player.number}
      </div>
      <h2 style="margin: 0; font-size: var(--text-xl); font-weight: 800;">${player.name}</h2>
      <div style="font-size: var(--text-sm); color: var(--text-muted); margin-top: 4px;">
        ${team.name || ''} · ${player.position} (${KFL_CONFIG.POSITION_LABELS[player.position] || ''})
      </div>
    </div>

    ${player.bio ? `
      <div class="card" style="padding: var(--spacing-md); background: var(--bg-surface); margin-bottom: var(--spacing-lg); font-size: var(--text-sm); line-height: 1.6;">
        ${player.bio}
      </div>
    ` : ''}

    <div class="grid grid-4" style="gap: var(--spacing-sm); text-align: center;">
      <div class="card" style="padding: var(--spacing-md);">
        <div style="font-size: var(--text-2xl); font-weight: 900; color: var(--color-primary);">${goals}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted);">골</div>
      </div>
      <div class="card" style="padding: var(--spacing-md);">
        <div style="font-size: var(--text-2xl); font-weight: 900; color: var(--kfl-dark-blue);">${assists}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted);">도움</div>
      </div>
      <div class="card" style="padding: var(--spacing-md);">
        <div style="font-size: var(--text-2xl); font-weight: 900; color: var(--kfl-dark-blue);">${yellows}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted);">경고</div>
      </div>
      <div class="card" style="padding: var(--spacing-md);">
        <div style="font-size: var(--text-2xl); font-weight: 900; color: #e74c3c;">${reds}</div>
        <div style="font-size: var(--text-xs); color: var(--text-muted);">퇴장</div>
      </div>
    </div>
  `;

  showModal({
    title: '선수 상세 정보',
    content,
    id: 'player-profile-modal'
  });
}
