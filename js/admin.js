// ============================================
// KFL Admin Portal Logic - Comprehensive Management
// ============================================

let currentAdminSession = null;
let adminMatches = [];
let adminTeams = [];
let adminPlayers = [];
let adminHighlights = [];

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  setupAuthForms();
  setupAdminTabs();
  setupTeamManagement();
  setupFixtureManagement();
  setupEventManagement();
  setupPlayerManagement();
  setupHighlightManagement();

  // Check auth session
  try {
    currentAdminSession = await getSession();
    updateAuthUI(!!currentAdminSession);
    if (currentAdminSession) {
      await loadAdminDashboardData();
    }
  } catch (err) {
    console.warn('Admin session check failed:', err);
    updateAuthUI(false);
  }

  onAuthStateChange((event, session) => {
    currentAdminSession = session;
    updateAuthUI(!!session);
    if (session) {
      loadAdminDashboardData();
    }
  });
});

function setupAuthForms() {
  const loginForm = document.getElementById('admin-login-form');
  const logoutBtn = document.getElementById('admin-logout-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('admin-email').value.trim();
      const password = document.getElementById('admin-password').value.trim();
      const submitBtn = loginForm.querySelector('button[type="submit"]');

      try {
        if (submitBtn) submitBtn.disabled = true;
        const res = await adminSignIn(email, password);
        currentAdminSession = res.session;
        showToast({ title: '로그인 성공', message: '관리자로 접속되었습니다.', type: 'info' });
        updateAuthUI(true);
        await loadAdminDashboardData();
      } catch (err) {
        showToast({ title: '로그인 실패', message: err.message || '인증 실패', type: 'error' });
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await adminSignOut();
        currentAdminSession = null;
        updateAuthUI(false);
        showToast({ title: '로그아웃', message: '로그아웃되었습니다.', type: 'info' });
      } catch (err) {
        console.error('Logout error:', err);
      }
    });
  }
}

function updateAuthUI(isAuthenticated) {
  const loginSection = document.getElementById('admin-login-section');
  const dashboardSection = document.getElementById('admin-dashboard-section');
  const userEmailBadge = document.getElementById('admin-user-email');
  const modeBadge = document.getElementById('admin-mode-badge');

  if (loginSection) loginSection.style.display = isAuthenticated ? 'none' : 'block';
  if (dashboardSection) dashboardSection.style.display = isAuthenticated ? 'block' : 'none';

  if (userEmailBadge && isAuthenticated && currentAdminSession?.user) {
    userEmailBadge.textContent = currentAdminSession.user.email || 'Admin';
  }

  if (modeBadge) {
    if (isSupabaseConfigured()) {
      modeBadge.textContent = 'Supabase 연결';
      modeBadge.className = 'badge badge-primary';
    } else {
      modeBadge.textContent = '데모 모드 · 로컬 저장소';
      modeBadge.className = 'badge badge-neutral';
    }
  }
}

function setupAdminTabs() {
  const tabBtns = document.querySelectorAll('.admin-nav-btn');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-admin-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
    });
  });
}

async function loadAdminDashboardData() {
  try {
    const [matches, teams, players, highlights] = await Promise.all([
      fetchMatches(),
      fetchTeams(),
      fetchPlayers(),
      fetchMatchHighlights()
    ]);

    adminMatches = matches;
    adminTeams = teams;
    adminPlayers = players;
    adminHighlights = highlights;

    renderTeamsTable(teams);
    renderMatchesTable(matches);
    renderPlayersTable(players);
    renderHighlightsTable(highlights);

    populateTeamSelects(teams);
    populateLiveControllerMatches(matches);
    populateEventMatchSelect(matches);
  } catch (err) {
    console.error('Failed to load admin data:', err);
  }
}


// ── 1. Team Management (Add / Edit / Delete) ──

function setupTeamManagement() {
  const form = document.getElementById('admin-team-form');
  const cancelBtn = document.getElementById('team-form-cancel-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('team-edit-id').value;
      const name = document.getElementById('team-name-input').value.trim();
      const short_name = document.getElementById('team-short-input').value.trim().toUpperCase();
      const coach = document.getElementById('team-coach-input').value.trim();
      const description = document.getElementById('team-desc-input').value.trim();

      try {
        const payload = {
          name,
          short_name,
          coach: coach || null,
          description: description || null
        };
        if (id) payload.id = id;

        await upsertTeam(payload);
        showToast({ title: '구단 저장', message: `${name} 구단 정보가 저장되었습니다.`, type: 'info' });
        resetTeamForm();
        await loadAdminDashboardData();
      } catch (err) {
        showToast({ title: '저장 실패', message: err.message, type: 'error' });
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => resetTeamForm());
  }
}

function resetTeamForm() {
  const form = document.getElementById('admin-team-form');
  if (form) form.reset();
  document.getElementById('team-edit-id').value = '';
  document.getElementById('team-form-title').textContent = '새 구단 (팀) 추가';
  document.getElementById('team-form-submit-btn').textContent = '구단 등록';
  document.getElementById('team-form-cancel-btn').style.display = 'none';
}

function editTeam(teamId) {
  const team = adminTeams.find(t => t.id === teamId);
  if (!team) return;

  document.getElementById('team-edit-id').value = team.id;
  document.getElementById('team-name-input').value = team.name || '';
  document.getElementById('team-short-input').value = team.short_name || '';
  document.getElementById('team-coach-input').value = team.coach || '';
  document.getElementById('team-desc-input').value = team.description || '';

  document.getElementById('team-form-title').textContent = '구단 정보 수정';
  document.getElementById('team-form-submit-btn').textContent = '수정 저장';
  document.getElementById('team-form-cancel-btn').style.display = 'inline-flex';

  // Scroll to form
  document.getElementById('admin-team-form').scrollIntoView({ behavior: 'smooth' });
}

async function removeTeam(teamId) {
  const team = adminTeams.find(t => t.id === teamId);
  const name = team ? team.name : '해당 구단';
  if (!confirm(`정말로 "${name}" 구단을 삭제하시겠습니까?\n(소속 선수 및 관련 일정도 함께 정리됩니다)`)) return;

  try {
    await deleteTeam(teamId);
    showToast({ title: '구단 삭제', message: `${name} 구단이 삭제되었습니다.`, type: 'info' });
    await loadAdminDashboardData();
  } catch (err) {
    showToast({ title: '삭제 실패', message: err.message, type: 'error' });
  }
}

function renderTeamsTable(teams) {
  const tbody = document.getElementById('admin-teams-table-body');
  const countBadge = document.getElementById('teams-count-badge');
  if (countBadge) countBadge.textContent = `${teams.length}개 팀`;
  if (!tbody) return;

  if (teams.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">등록된 구단이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = teams.map(t => `
    <tr>
      <td><strong>${t.name}</strong></td>
      <td><span class="badge badge-neutral">${t.short_name}</span></td>
      <td>${t.coach || '-'}</td>
      <td style="color: var(--text-muted); font-size: var(--text-xs);">${t.description || '-'}</td>
      <td style="text-align: center;">
        <button class="btn btn-sm btn-outline" onclick="editTeam('${t.id}')">수정</button>
        <button class="btn btn-sm btn-danger" onclick="removeTeam('${t.id}')">삭제</button>
      </td>
    </tr>
  `).join('');
}


// ── 2. Match Management (Add / Edit / Delete) ──

function setupFixtureManagement() {
  const form = document.getElementById('admin-fixture-form');
  const cancelBtn = document.getElementById('fixture-form-cancel-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('fixture-edit-id').value;
      const home_team_id = document.getElementById('fixture-home-select').value;
      const away_team_id = document.getElementById('fixture-away-select').value;
      const round = parseInt(document.getElementById('fixture-round').value, 10) || 1;
      const match_date = new Date(document.getElementById('fixture-datetime').value).toISOString();
      const venue = document.getElementById('fixture-venue').value.trim() || 'KIS 메인 스타디움';
      const status = document.getElementById('fixture-status').value || 'scheduled';

      if (home_team_id === away_team_id) {
        showToast({ title: '입력 오류', message: '홈팀과 원정팀이 같을 수 없습니다.', type: 'warning' });
        return;
      }

      try {
        const payload = {
          home_team_id,
          away_team_id,
          round,
          match_date,
          venue,
          status,
          season_id: adminMatches[0]?.season_id || 's-2026-spring'
        };
        if (id) payload.id = id;

        await upsertMatch(payload);
        showToast({ title: '경기 저장', message: '경기 일정이 성공적으로 저장되었습니다.', type: 'info' });
        resetFixtureForm();
        await loadAdminDashboardData();
      } catch (err) {
        showToast({ title: '저장 실패', message: err.message, type: 'error' });
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => resetFixtureForm());
  }
}

function resetFixtureForm() {
  const form = document.getElementById('admin-fixture-form');
  if (form) form.reset();
  document.getElementById('fixture-edit-id').value = '';
  document.getElementById('fixture-form-title').textContent = '새 경기 일정 생성';
  document.getElementById('fixture-form-submit-btn').textContent = '경기 일정 생성';
  document.getElementById('fixture-form-cancel-btn').style.display = 'none';
}

function editMatch(matchId) {
  const m = adminMatches.find(item => item.id === matchId);
  if (!m) return;

  document.getElementById('fixture-edit-id').value = m.id;
  document.getElementById('fixture-home-select').value = m.home_team_id;
  document.getElementById('fixture-away-select').value = m.away_team_id;
  document.getElementById('fixture-round').value = m.round || 1;
  document.getElementById('fixture-venue').value = m.venue || 'KIS 메인 스타디움';
  document.getElementById('fixture-status').value = m.status || 'scheduled';

  if (m.match_date) {
    const d = new Date(m.match_date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    document.getElementById('fixture-datetime').value = d.toISOString().slice(0, 16);
  }

  document.getElementById('fixture-form-title').textContent = '경기 일정 수정';
  document.getElementById('fixture-form-submit-btn').textContent = '수정 저장';
  document.getElementById('fixture-form-cancel-btn').style.display = 'inline-flex';

  document.getElementById('admin-fixture-form').scrollIntoView({ behavior: 'smooth' });
}

async function removeMatch(matchId) {
  if (!confirm('이 경기를 삭제하시겠습니까?\n관련된 이벤트 기록도 함께 삭제됩니다.')) return;

  try {
    await deleteMatch(matchId);
    showToast({ title: '경기 삭제', message: '경기가 삭제되었습니다.', type: 'info' });
    await loadAdminDashboardData();
  } catch (err) {
    showToast({ title: '삭제 실패', message: err.message, type: 'error' });
  }
}

function openLiveControllerForMatch(matchId) {
  const liveTabBtn = document.querySelector('[data-admin-tab="adm-tab-live"]');
  if (liveTabBtn) liveTabBtn.click();

  const select = document.getElementById('live-ctrl-match-select');
  if (select) {
    select.value = matchId;
    const match = adminMatches.find(m => m.id === matchId);
    renderLiveControllerPanel(match);
  }
}

function renderMatchesTable(matches) {
  const tbody = document.getElementById('admin-matches-table-body');
  const countBadge = document.getElementById('matches-count-badge');
  if (countBadge) countBadge.textContent = `${matches.length}경기`;
  if (!tbody) return;

  if (matches.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">등록된 경기가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = matches.map(m => `
    <tr>
      <td>${m.round || 1}R</td>
      <td><strong>${m.home_team?.name || '홈팀'} vs ${m.away_team?.name || '원정팀'}</strong></td>
      <td style="text-align: center; font-weight: 700;">${m.home_score} : ${m.away_score}</td>
      <td>${getStatusBadge(m.status, m.minute)}</td>
      <td style="font-size: var(--text-xs); color: var(--text-muted);">${formatDateShort(m.match_date)} ${formatTime(m.match_date)} (${m.venue || ''})</td>
      <td style="text-align: center;">
        <button class="btn btn-sm btn-outline" onclick="openLiveControllerForMatch('${m.id}')">스코어</button>
        <button class="btn btn-sm btn-outline" onclick="editMatch('${m.id}')">수정</button>
        <button class="btn btn-sm btn-danger" onclick="removeMatch('${m.id}')">삭제</button>
      </td>
    </tr>
  `).join('');
}


// ── 3. Live Match Controller ──

function populateLiveControllerMatches(matches) {
  const select = document.getElementById('live-ctrl-match-select');
  if (!select) return;

  const currentVal = select.value;
  select.innerHTML = '<option value="">-- 경기 선택 --</option>' +
    matches.map(m => `
      <option value="${m.id}">[${m.status}] ${m.home_team?.name} vs ${m.away_team?.name} (${formatDateShort(m.match_date)})</option>
    `).join('');

  if (currentVal && matches.some(m => m.id === currentVal)) {
    select.value = currentVal;
  } else {
    // Default to first live match or first scheduled match
    const live = matches.find(m => m.status === 'live' || m.status === 'halftime') || matches[0];
    if (live) {
      select.value = live.id;
      renderLiveControllerPanel(live);
    }
  }

  select.onchange = () => {
    const match = adminMatches.find(m => m.id === select.value);
    renderLiveControllerPanel(match);
  };
}

function renderLiveControllerPanel(match) {
  const panel = document.getElementById('live-ctrl-panel');
  if (!panel) return;

  if (!match) {
    panel.innerHTML = '<div class="empty-state"><p>상단에서 조작할 경기를 선택해주세요.</p></div>';
    return;
  }

  panel.innerHTML = `
    <div class="card" style="padding: var(--spacing-xl);">
      <div class="flex justify-between items-center mb-lg">
        <div>
          <h3 style="margin: 0; font-size: var(--text-lg);">${match.home_team?.name} vs ${match.away_team?.name}</h3>
          <span style="font-size: var(--text-xs); color: var(--text-muted);">${match.round || 1}라운드 · ${match.venue || ''}</span>
        </div>
        ${getStatusBadge(match.status, match.minute)}
      </div>

      <!-- Scoreboard Controls -->
      <div class="grid grid-3 items-center mb-lg" style="text-align: center;">
        <!-- Home -->
        <div>
          <h4 style="margin-bottom: var(--spacing-xs);">${match.home_team?.name}</h4>
          <div style="font-size: 3rem; font-weight: 800; color: var(--text-primary);">${match.home_score}</div>
          <div class="flex gap-xs justify-center mt-sm">
            <button class="btn btn-sm btn-outline" onclick="adjustScore('${match.id}', 'home', -1)">- 1</button>
            <button class="btn btn-sm btn-primary" onclick="adjustScore('${match.id}', 'home', 1)">+ 1 골</button>
          </div>
        </div>

        <!-- Center Divider -->
        <div style="font-size: 2rem; color: var(--text-muted); font-weight: 300;">:</div>

        <!-- Away -->
        <div>
          <h4 style="margin-bottom: var(--spacing-xs);">${match.away_team?.name}</h4>
          <div style="font-size: 3rem; font-weight: 800; color: var(--text-primary);">${match.away_score}</div>
          <div class="flex gap-xs justify-center mt-sm">
            <button class="btn btn-sm btn-outline" onclick="adjustScore('${match.id}', 'away', -1)">- 1</button>
            <button class="btn btn-sm btn-primary" onclick="adjustScore('${match.id}', 'away', 1)">+ 1 골</button>
          </div>
        </div>
      </div>

      <!-- Match Minute & Status Controls -->
      <div class="flex justify-between items-center" style="flex-wrap: wrap; gap: var(--spacing-md); border-top: 1px solid var(--border-color); padding-top: var(--spacing-md);">
        <div class="flex items-center gap-xs">
          <label style="margin: 0;">진행 시간 (분):</label>
          <input type="number" id="ctrl-match-minute" value="${match.minute || 0}" min="0" max="120" style="width: 70px; padding: 4px 8px;">
          <button class="btn btn-sm btn-outline" onclick="updateMatchMinute('${match.id}')">적용</button>
        </div>

        <div class="flex gap-xs" style="flex-wrap: wrap;">
          <button class="btn btn-sm ${match.status === 'scheduled' ? 'btn-primary' : 'btn-outline'}" onclick="setMatchStatus('${match.id}', 'scheduled')">예정</button>
          <button class="btn btn-sm ${match.status === 'live' ? 'btn-primary' : 'btn-outline'}" onclick="setMatchStatus('${match.id}', 'live')">진행 중 (LIVE)</button>
          <button class="btn btn-sm ${match.status === 'halftime' ? 'btn-primary' : 'btn-outline'}" onclick="setMatchStatus('${match.id}', 'halftime')">하프타임</button>
          <button class="btn btn-sm ${match.status === 'finished' ? 'btn-primary' : 'btn-outline'}" onclick="setMatchStatus('${match.id}', 'finished')">경기 종료</button>
        </div>
      </div>
    </div>
  `;
}

window.adjustScore = async function(matchId, team, delta) {
  const match = adminMatches.find(m => m.id === matchId);
  if (!match) return;

  const newHome = team === 'home' ? Math.max(0, match.home_score + delta) : match.home_score;
  const newAway = team === 'away' ? Math.max(0, match.away_score + delta) : match.away_score;

  try {
    await upsertMatch({ id: matchId, home_score: newHome, away_score: newAway });
    match.home_score = newHome;
    match.away_score = newAway;
    renderLiveControllerPanel(match);
    showToast({ title: '스코어 반영', message: `${newHome} : ${newAway}`, type: 'info' });
  } catch (err) {
    showToast({ title: '오류', message: err.message, type: 'error' });
  }
};

window.setMatchStatus = async function(matchId, status) {
  const match = adminMatches.find(m => m.id === matchId);
  if (!match) return;

  try {
    await upsertMatch({ id: matchId, status });
    match.status = status;
    renderLiveControllerPanel(match);
    showToast({ title: '상태 변경', message: `상태: ${KFL_CONFIG.MATCH_STATUS_LABELS[status] || status}`, type: 'info' });
  } catch (err) {
    showToast({ title: '오류', message: err.message, type: 'error' });
  }
};

window.updateMatchMinute = async function(matchId) {
  const input = document.getElementById('ctrl-match-minute');
  if (!input) return;
  const minute = parseInt(input.value, 10) || 0;

  try {
    await upsertMatch({ id: matchId, minute });
    showToast({ title: '시간 반영', message: `${minute}분 설정됨`, type: 'info' });
  } catch (err) {
    showToast({ title: '오류', message: err.message, type: 'error' });
  }
};


// ── 4. Events Logger & Delete ──

function setupEventManagement() {
  const form = document.getElementById('admin-event-form');
  const matchSelect = document.getElementById('event-match-select');

  if (matchSelect) {
    matchSelect.addEventListener('change', async () => {
      await loadEventsForMatch(matchSelect.value);
    });
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const match_id = document.getElementById('event-match-select').value;
      const type = document.getElementById('event-type-select').value;
      const player_id = document.getElementById('event-player-select').value;
      const assist_player_id = document.getElementById('event-assist-select').value || null;
      const minute = parseInt(document.getElementById('event-minute-input').value, 10) || 1;
      const notes = document.getElementById('event-notes-input').value.trim();

      if (!match_id || !player_id) {
        showToast({ title: '입력 오류', message: '경기와 선수를 선택하세요.', type: 'warning' });
        return;
      }

      try {
        await upsertMatchEvent({
          match_id,
          type,
          player_id,
          assist_player_id,
          minute,
          notes: notes || null
        });

        // Auto recalculate match score
        if (type === 'goal' || type === 'own_goal') {
          await recalculateMatchScore(match_id);
        }

        showToast({ title: '이벤트 기록 완료', message: `${minute}' ${KFL_CONFIG.EVENT_TYPE_LABELS[type]} 기록`, type: 'info' });
        form.reset();
        await loadEventsForMatch(match_id);
        await loadAdminDashboardData();
      } catch (err) {
        showToast({ title: '오류', message: err.message, type: 'error' });
      }
    });
  }
}

function populateEventMatchSelect(matches) {
  const matchSelect = document.getElementById('event-match-select');
  if (!matchSelect) return;

  matchSelect.innerHTML = '<option value="">-- 경기 선택 --</option>' +
    matches.map(m => `<option value="${m.id}">${m.home_team?.name} vs ${m.away_team?.name}</option>`).join('');

  if (matches.length > 0 && !matchSelect.value) {
    matchSelect.value = matches[0].id;
    loadEventsForMatch(matches[0].id);
  }
}

async function loadEventsForMatch(matchId) {
  const playerSelect = document.getElementById('event-player-select');
  const assistSelect = document.getElementById('event-assist-select');
  const tbody = document.getElementById('admin-events-table-body');

  const match = adminMatches.find(m => m.id === matchId);
  if (!match) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">경기를 선택해주세요.</td></tr>';
    return;
  }

  // Populate players participating in this match
  const matchPlayers = adminPlayers.filter(p => p.team_id === match.home_team_id || p.team_id === match.away_team_id);
  const options = '<option value="">-- 선수 선택 --</option>' +
    matchPlayers.map(p => `<option value="${p.id}">${p.name} (#${p.number}, ${p.position}) - ${p.teams?.name || ''}</option>`).join('');

  if (playerSelect) playerSelect.innerHTML = options;
  if (assistSelect) assistSelect.innerHTML = '<option value="">-- 도움 선수 (선택) --</option>' + options;

  // Load existing events
  try {
    const events = await fetchMatchEvents(matchId);
    if (!tbody) return;

    if (events.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">이 경기에 기록된 이벤트가 없습니다.</td></tr>';
      return;
    }

    tbody.innerHTML = events.map(ev => `
      <tr>
        <td><strong>${ev.minute}'</strong></td>
        <td>${KFL_CONFIG.EVENT_TYPE_LABELS[ev.type] || ev.type}</td>
        <td><strong>${ev.player?.name || '선수'}</strong></td>
        <td>${ev.assist_player ? ev.assist_player.name : '-'}</td>
        <td style="font-size: var(--text-xs); color: var(--text-muted);">${ev.notes || '-'}</td>
        <td style="text-align: center;">
          <button class="btn btn-sm btn-danger" onclick="removeMatchEvent('${ev.id}', '${matchId}')">삭제</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Failed to load events:', err);
  }
}

window.removeMatchEvent = async function(eventId, matchId) {
  if (!confirm('이 이벤트를 삭제하시겠습니까?')) return;
  try {
    await deleteMatchEvent(eventId);
    await recalculateMatchScore(matchId);
    showToast({ title: '이벤트 삭제 완료', message: '이벤트가 삭제되고 스코어가 재계산되었습니다.', type: 'info' });
    await loadEventsForMatch(matchId);
    await loadAdminDashboardData();
  } catch (err) {
    showToast({ title: '오류', message: err.message, type: 'error' });
  }
};


// ── 5. Player Management ──

function setupPlayerManagement() {
  const form = document.getElementById('admin-player-form');
  const cancelBtn = document.getElementById('player-form-cancel-btn');

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('player-edit-id').value;
      const name = document.getElementById('player-name-input').value.trim();
      const number = parseInt(document.getElementById('player-number-input').value, 10);
      const position = document.getElementById('player-position-select').value;
      const team_id = document.getElementById('player-team-select').value;
      const bio = document.getElementById('player-bio-input').value.trim();

      try {
        const payload = {
          name,
          number,
          position,
          team_id,
          bio: bio || null,
          nationality: '대한민국'
        };
        if (id) payload.id = id;

        await upsertPlayer(payload);
        showToast({ title: '선수 저장 완료', message: `${name} 선수 정보가 저장되었습니다.`, type: 'info' });
        resetPlayerForm();
        await loadAdminDashboardData();
      } catch (err) {
        showToast({ title: '저장 실패', message: err.message, type: 'error' });
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => resetPlayerForm());
  }
}

function resetPlayerForm() {
  const form = document.getElementById('admin-player-form');
  if (form) form.reset();
  document.getElementById('player-edit-id').value = '';
  document.getElementById('player-form-title').textContent = '새 선수 등록';
  document.getElementById('player-form-submit-btn').textContent = '선수 등록';
  document.getElementById('player-form-cancel-btn').style.display = 'none';
}

function editPlayer(playerId) {
  const p = adminPlayers.find(item => item.id === playerId);
  if (!p) return;

  document.getElementById('player-edit-id').value = p.id;
  document.getElementById('player-name-input').value = p.name || '';
  document.getElementById('player-number-input').value = p.number || 10;
  document.getElementById('player-position-select').value = p.position || 'FW';
  document.getElementById('player-team-select').value = p.team_id || '';
  document.getElementById('player-bio-input').value = p.bio || '';

  document.getElementById('player-form-title').textContent = '선수 정보 수정';
  document.getElementById('player-form-submit-btn').textContent = '수정 저장';
  document.getElementById('player-form-cancel-btn').style.display = 'inline-flex';

  document.getElementById('admin-player-form').scrollIntoView({ behavior: 'smooth' });
}

async function removePlayer(playerId) {
  const p = adminPlayers.find(item => item.id === playerId);
  if (!confirm(`정말로 "${p ? p.name : '해당'}" 선수를 삭제하시겠습니까?`)) return;

  try {
    await deletePlayer(playerId);
    showToast({ title: '선수 삭제 완료', message: '선수가 명단에서 삭제되었습니다.', type: 'info' });
    await loadAdminDashboardData();
  } catch (err) {
    showToast({ title: '오류', message: err.message, type: 'error' });
  }
}

function renderPlayersTable(players) {
  const tbody = document.getElementById('admin-players-table-body');
  const countBadge = document.getElementById('players-count-badge');
  if (countBadge) countBadge.textContent = `${players.length}명`;
  if (!tbody) return;

  if (players.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">등록된 선수가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = players.map(p => `
    <tr>
      <td><strong>#${p.number}</strong></td>
      <td><strong>${p.name}</strong></td>
      <td><span class="badge badge-neutral">${p.position}</span></td>
      <td>${p.teams?.name || '-'}</td>
      <td style="text-align: center;">
        <button class="btn btn-sm btn-outline" onclick="editPlayer('${p.id}')">수정</button>
        <button class="btn btn-sm btn-danger" onclick="removePlayer('${p.id}')">삭제</button>
      </td>
    </tr>
  `).join('');
}


// ── 6. Highlights Management ──

function setupHighlightManagement() {
  const form = document.getElementById('admin-highlight-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const match_id = document.getElementById('highlight-match-select').value || null;
      const title = document.getElementById('highlight-title-input').value.trim();
      const video_url = document.getElementById('highlight-url-input').value.trim();
      const description = document.getElementById('highlight-desc-input').value.trim();

      try {
        await upsertHighlight({
          match_id,
          title,
          video_url,
          description: description || null,
          duration_seconds: 180
        });

        showToast({ title: '영상 등록 완료', message: '하이라이트가 등록되었습니다.', type: 'info' });
        form.reset();
        await loadAdminDashboardData();
      } catch (err) {
        showToast({ title: '저장 실패', message: err.message, type: 'error' });
      }
    });
  }
}

function renderHighlightsTable(highlights) {
  const tbody = document.getElementById('admin-highlights-table-body');
  if (!tbody) return;

  if (highlights.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">등록된 영상이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = highlights.map(h => `
    <tr>
      <td><strong>${h.title}</strong></td>
      <td><a href="${h.video_url}" target="_blank" style="font-size: var(--text-xs); color: var(--color-primary);">${h.video_url}</a></td>
      <td style="text-align: center;">
        <button class="btn btn-sm btn-danger" onclick="removeHighlight('${h.id}')">삭제</button>
      </td>
    </tr>
  `).join('');
}

window.removeHighlight = async function(highlightId) {
  if (!confirm('이 영상을 삭제하시겠습니까?')) return;
  try {
    await deleteHighlight(highlightId);
    showToast({ title: '영상 삭제 완료', message: '영상이 삭제되었습니다.', type: 'info' });
    await loadAdminDashboardData();
  } catch (err) {
    showToast({ title: '오류', message: err.message, type: 'error' });
  }
};


// ── Helper: Populate Team Selects Across Forms ──

function populateTeamSelects(teams) {
  const homeSelect = document.getElementById('fixture-home-select');
  const awaySelect = document.getElementById('fixture-away-select');
  const playerTeamSelect = document.getElementById('player-team-select');
  const highlightMatchSelect = document.getElementById('highlight-match-select');

  const teamOptions = '<option value="">-- 구단 선택 --</option>' +
    teams.map(t => `<option value="${t.id}">${t.name} (${t.short_name})</option>`).join('');

  if (homeSelect) homeSelect.innerHTML = teamOptions;
  if (awaySelect) awaySelect.innerHTML = teamOptions;
  if (playerTeamSelect) playerTeamSelect.innerHTML = teamOptions;

  if (highlightMatchSelect) {
    highlightMatchSelect.innerHTML = '<option value="">-- 관련 경기 (선택) --</option>' +
      adminMatches.map(m => `<option value="${m.id}">${m.home_team?.name} vs ${m.away_team?.name}</option>`).join('');
  }
}

// Expose functions to window for onclick handlers
window.editTeam = editTeam;
window.removeTeam = removeTeam;
window.editMatch = editMatch;
window.removeMatch = removeMatch;
window.editPlayer = editPlayer;
window.removePlayer = removePlayer;
window.openLiveControllerForMatch = openLiveControllerForMatch;
