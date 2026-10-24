// ============================================
// KFL Standings Page Logic
// ============================================

let cachedMatches = [];
let cachedTeams = [];
let cachedEvents = [];
let currentTableType = 'all'; // all, home, away

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  await loadStandingsData();
  setupTableTypeTabs();

  // Realtime updates
  subscribeToMatches((type, payload) => {
    handleRealtimeNotification(type, payload);
    if (payload.new) {
      loadStandingsData();
    }
  });

  setupReconnection(() => loadStandingsData());
});

async function loadStandingsData() {
  const container = document.getElementById('standings-table-body');
  try {
    if (container) showLoading(container, 6);

    const [matches, teams, events] = await Promise.all([
      fetchMatches(),
      fetchTeams(),
      fetchAllEvents()
    ]);

    cachedMatches = matches;
    cachedTeams = teams;
    cachedEvents = events;

    renderStandingsTable();
    renderIndividualLeaders();
  } catch (err) {
    console.error('Failed to load standings:', err);
    if (container) showError(container, '순위표 데이터를 불러오는데 실패했습니다.');
  }
}

function renderStandingsTable() {
  const tbody = document.getElementById('standings-table-body');
  if (!tbody) return;

  const standings = calculateCustomStandings(cachedMatches, cachedTeams, currentTableType);

  if (standings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: var(--spacing-xl);">등록된 팀 또는 경기 기록이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = standings.map((item, idx) => {
    const isFirst = idx === 0;
    const isChampionsZone = idx < 2;
    const rankColor = isFirst ? 'var(--color-primary)' : isChampionsZone ? 'var(--kfl-dark-blue)' : 'var(--text-muted)';

    return `
      <tr class="table-row-hover">
        <td style="font-weight: 800; color: ${rankColor}; font-size: var(--text-base); text-align: center;">${idx + 1}</td>
        <td>
          <div>
            <strong style="font-size: var(--text-sm);">${item.name}</strong>
            ${item.coach ? `<div style="font-size: var(--text-xs); color: var(--text-muted);">${item.coach}</div>` : ''}
          </div>
        </td>
        <td style="text-align: center; font-weight: 600;">${item.played}</td>
        <td style="text-align: center; color: var(--kfl-base-blue); font-weight: 700;">${item.won}</td>
        <td style="text-align: center; color: #776b00; font-weight: 600;">${item.drawn}</td>
        <td style="text-align: center; color: #e74c3c; font-weight: 600;">${item.lost}</td>
        <td style="text-align: center; color: var(--text-muted);">${item.goals_for}</td>
        <td style="text-align: center; color: var(--text-muted);">${item.goals_against}</td>
        <td style="text-align: center; font-weight: 700; color: ${item.goal_diff > 0 ? 'var(--kfl-base-blue)' : item.goal_diff < 0 ? '#e74c3c' : 'inherit'};">
          ${item.goal_diff > 0 ? `+${item.goal_diff}` : item.goal_diff}
        </td>
        <td style="text-align: center;"><strong style="font-size: var(--text-lg); color: var(--color-primary); font-weight: 900;">${item.points}</strong></td>
        <td class="hide-on-mobile" style="text-align: center;">
          ${renderFormGuide(item.form)}
        </td>
      </tr>
    `;
  }).join('');
}

function calculateCustomStandings(matches, teams, type = 'all') {
  const stats = {};
  teams.forEach(t => {
    stats[t.id] = {
      id: t.id,
      name: t.name,
      short_name: t.short_name,
      color: t.color,
      coach: t.coach,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_diff: 0,
      points: 0,
      form: []
    };
  });

  const finishedMatches = matches
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

  finishedMatches.forEach(m => {
    const home = stats[m.home_team_id];
    const away = stats[m.away_team_id];
    if (!home || !away) return;

    const hs = m.home_score;
    const as = m.away_score;

    // Home team processing
    if (type === 'all' || type === 'home') {
      home.played++;
      home.goals_for += hs;
      home.goals_against += as;
      if (hs > as) {
        home.won++;
        home.points += 3;
        home.form.push('W');
      } else if (hs === as) {
        home.drawn++;
        home.points += 1;
        home.form.push('D');
      } else {
        home.lost++;
        home.form.push('L');
      }
    }

    // Away team processing
    if (type === 'all' || type === 'away') {
      away.played++;
      away.goals_for += as;
      away.goals_against += hs;
      if (as > hs) {
        away.won++;
        away.points += 3;
        away.form.push('W');
      } else if (as === hs) {
        away.drawn++;
        away.points += 1;
        away.form.push('D');
      } else {
        away.lost++;
        away.form.push('L');
      }
    }
  });

  // Calculate goal difference and trim form to last 5
  return Object.values(stats)
    .map(s => {
      s.goal_diff = s.goals_for - s.goals_against;
      s.form = s.form.slice(-5);
      return s;
    })
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goal_diff !== a.goal_diff) return b.goal_diff - a.goal_diff;
      return b.goals_for - a.goals_for;
    });
}

function renderIndividualLeaders() {
  const scorersEl = document.getElementById('individual-top-scorers');
  const assistsEl = document.getElementById('individual-top-assists');

  if (scorersEl) {
    const scorers = calculateTopScorers(cachedEvents, 5);
    if (scorers.length > 0) {
      scorersEl.innerHTML = scorers.map((s, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            <span style="font-weight: 800; font-size: var(--text-sm); width: 22px; color: ${idx === 0 ? 'var(--color-primary)' : 'var(--text-muted)'};">${idx + 1}</span>
            <div>
              <div style="font-weight: 700; font-size: var(--text-sm);">${s.player?.name || '선수'}</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">${s.team?.name || ''} #${s.player?.number || ''}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: var(--text-lg); font-weight: 900; color: var(--color-primary);">${s.goals}</span>
            <span style="font-size: var(--text-xs); color: var(--text-muted);">골</span>
          </div>
        </div>
      `).join('');
    } else {
      showEmptyState(scorersEl, { title: '득점 기록 없음' });
    }
  }

  if (assistsEl) {
    const assists = calculateTopAssists(cachedEvents, 5);
    if (assists.length > 0) {
      assistsEl.innerHTML = assists.map((a, idx) => `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--spacing-sm) 0; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; align-items: center; gap: var(--spacing-md);">
            <span style="font-weight: 800; font-size: var(--text-sm); width: 22px; color: ${idx === 0 ? 'var(--color-primary)' : 'var(--text-muted)'};">${idx + 1}</span>
            <div>
              <div style="font-weight: 700; font-size: var(--text-sm);">${a.player?.name || '선수'}</div>
              <div style="font-size: var(--text-xs); color: var(--text-muted);">${a.team?.name || ''} #${a.player?.number || ''}</div>
            </div>
          </div>
          <div style="text-align: right;">
            <span style="font-size: var(--text-lg); font-weight: 900; color: var(--kfl-dark-blue);">${a.assists}</span>
            <span style="font-size: var(--text-xs); color: var(--text-muted);">도움</span>
          </div>
        </div>
      `).join('');
    } else {
      showEmptyState(assistsEl, { title: '도움 기록 없음' });
    }
  }
}

function setupTableTypeTabs() {
  const tabs = document.querySelectorAll('.standings-type-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentTableType = tab.getAttribute('data-type');
      renderStandingsTable();
    });
  });
}
