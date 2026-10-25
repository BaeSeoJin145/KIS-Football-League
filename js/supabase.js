// ============================================
// KFL Supabase Client & Unified Data Access
// ============================================
// Supports real Supabase backend with automatic fallback
// to local mock database for standalone testing and demo.

let _supabase = null;
let _initPromise = null;

/**
 * Checks whether valid Supabase credentials have been configured
 */
function isSupabaseConfigured() {
  if (typeof KFL_CONFIG === 'undefined') return false;
  const url = KFL_CONFIG.SUPABASE_URL || '';
  const key = KFL_CONFIG.SUPABASE_ANON_KEY || '';

  // Must have a real Supabase URL (not placeholder)
  if (!url || url.includes('YOUR_PROJECT') || url.includes('your-project')) return false;

  // Must have a valid anon key (not placeholder)
  if (!key || key.includes('YOUR_ANON_KEY') || key.includes('your-publishable')) return false;

  // Accept both formats:
  // - Legacy JWT keys: start with 'eyJ' (base64 encoded JSON)
  // - New publishable keys: start with 'sb_publishable_'
  const isLegacyJWT = key.startsWith('eyJ') && key.length >= 100;
  const isPublishableKey = key.startsWith('sb_publishable_') && key.length >= 20;
  if (!isLegacyJWT && !isPublishableKey) {
    console.info('[KFL] Supabase anon key format not recognized. Running in Local Demo Mode.');
    return false;
  }

  return true;
}

/**
 * Initialize Supabase client (singleton)
 */
function initSupabase() {
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve) => {
    if (!isSupabaseConfigured()) {
      console.info('[KFL] Supabase credentials not set or using placeholder. Running in Local Demo Mode.');
      resolve(null);
      return;
    }

    if (window.supabase) {
      _supabase = window.supabase.createClient(
        KFL_CONFIG.SUPABASE_URL,
        KFL_CONFIG.SUPABASE_ANON_KEY
      );
      resolve(_supabase);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
    script.onload = () => {
      try {
        _supabase = window.supabase.createClient(
          KFL_CONFIG.SUPABASE_URL,
          KFL_CONFIG.SUPABASE_ANON_KEY
        );
        resolve(_supabase);
      } catch (e) {
        console.warn('[KFL] Failed to create Supabase client, falling back to Local Mode:', e);
        resolve(null);
      }
    };
    script.onerror = () => {
      console.warn('[KFL] Failed to load Supabase script from CDN, using Local Mode.');
      resolve(null);
    };
    document.head.appendChild(script);
  });

  return _initPromise;
}

/**
 * Get Supabase client if available
 */
function getSupabase() {
  return _supabase;
}


// ── Data Access Functions ──

/**
 * Fetch all seasons
 */
async function fetchSeasons() {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('seasons')
        .select('*')
        .order('year', { ascending: false });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchSeasons error, using mock:', e);
    }
  }
  const store = getLocalStore();
  return [store.season];
}

/**
 * Fetch active season
 */
async function fetchActiveSeason() {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('seasons')
        .select('*')
        .eq('is_active', true)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchActiveSeason error, using mock:', e);
    }
  }
  const store = getLocalStore();
  return store.season;
}

/**
 * Fetch all teams for a season
 */
async function fetchTeams(seasonId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      let query = _supabase.from('teams').select('*').order('name');
      if (seasonId) query = query.eq('season_id', seasonId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchTeams error, using mock:', e);
    }
  }
  const store = getLocalStore();
  return store.teams;
}

/**
 * Fetch a single team by ID
 */
async function fetchTeam(teamId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchTeam error, using mock:', e);
    }
  }
  const store = getLocalStore();
  return store.teams.find(t => t.id === teamId) || null;
}

/**
 * Fetch players, optionally filtered by team
 */
async function fetchPlayers(teamId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      let query = _supabase.from('players').select('*, teams(id, name, short_name, color)').order('number');
      if (teamId) query = query.eq('team_id', teamId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchPlayers error, using mock:', e);
    }
  }
  const store = getLocalStore();
  const teamsMap = Object.fromEntries(store.teams.map(t => [t.id, t]));
  let result = store.players.map(p => ({
    ...p,
    teams: teamsMap[p.team_id] || null
  }));
  if (teamId) {
    result = result.filter(p => p.team_id === teamId);
  }
  return result;
}

/**
 * Fetch a single player by ID
 */
async function fetchPlayer(playerId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('players')
        .select('*, teams(id, name, short_name, color)')
        .eq('id', playerId)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchPlayer error, using mock:', e);
    }
  }
  const store = getLocalStore();
  const player = store.players.find(p => p.id === playerId);
  if (!player) return null;
  const team = store.teams.find(t => t.id === player.team_id);
  return { ...player, teams: team || null };
}

/**
 * Fetch matches with team details
 */
async function fetchMatches(filters = {}) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      let query = _supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url, color),
          away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url, color)
        `)
        .order('match_date', { ascending: true });

      if (filters.seasonId) query = query.eq('season_id', filters.seasonId);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.teamId) {
        query = query.or(`home_team_id.eq.${filters.teamId},away_team_id.eq.${filters.teamId}`);
      }
      if (filters.dateFrom) query = query.gte('match_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('match_date', filters.dateTo);

      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchMatches error, using mock:', e);
    }
  }

  const store = getLocalStore();
  const teamsMap = Object.fromEntries(store.teams.map(t => [t.id, t]));
  let list = store.matches.map(m => ({
    ...m,
    home_team: teamsMap[m.home_team_id] || { name: 'Home', short_name: 'HOM' },
    away_team: teamsMap[m.away_team_id] || { name: 'Away', short_name: 'AWY' }
  }));

  if (filters.status) {
    list = list.filter(m => m.status === filters.status);
  }
  if (filters.teamId) {
    list = list.filter(m => m.home_team_id === filters.teamId || m.away_team_id === filters.teamId);
  }
  if (filters.round) {
    list = list.filter(m => Number(m.round) === Number(filters.round));
  }
  return list;
}

/**
 * Fetch a single match with full details
 */
async function fetchMatch(matchId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('matches')
        .select(`
          *,
          home_team:teams!matches_home_team_id_fkey(id, name, short_name, logo_url, color),
          away_team:teams!matches_away_team_id_fkey(id, name, short_name, logo_url, color),
          season:seasons(id, name, year)
        `)
        .eq('id', matchId)
        .single();
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchMatch error, using mock:', e);
    }
  }

  const store = getLocalStore();
  const m = store.matches.find(item => item.id === matchId);
  if (!m) return null;
  const teamsMap = Object.fromEntries(store.teams.map(t => [t.id, t]));
  return {
    ...m,
    home_team: teamsMap[m.home_team_id] || { name: 'Home', short_name: 'HOM' },
    away_team: teamsMap[m.away_team_id] || { name: 'Away', short_name: 'AWY' },
    season: store.season
  };
}

/**
 * Fetch match events
 */
async function fetchMatchEvents(matchId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('match_events')
        .select(`
          *,
          player:players!match_events_player_id_fkey(id, name, number, team_id),
          assist_player:players!match_events_assist_player_id_fkey(id, name, number, team_id)
        `)
        .eq('match_id', matchId)
        .order('minute', { ascending: true });
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchMatchEvents error, using mock:', e);
    }
  }

  const store = getLocalStore();
  const playersMap = Object.fromEntries(store.players.map(p => [p.id, p]));
  return store.events
    .filter(ev => ev.match_id === matchId)
    .map(ev => ({
      ...ev,
      player: playersMap[ev.player_id] || null,
      assist_player: playersMap[ev.assist_player_id] || null
    }))
    .sort((a, b) => a.minute - b.minute);
}

/**
 * Fetch match lineups
 */
async function fetchMatchLineups(matchId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('match_lineups')
        .select(`
          *,
          player:players(id, name, number, position)
        `)
        .eq('match_id', matchId)
        .order('is_starter', { ascending: false })
        .order('position');
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchMatchLineups error, using mock:', e);
    }
  }

  const store = getLocalStore();
  const playersMap = Object.fromEntries(store.players.map(p => [p.id, p]));
  return store.lineups
    .filter(l => l.match_id === matchId)
    .map(l => ({
      ...l,
      player: playersMap[l.player_id] || null
    }));
}

/**
 * Fetch match highlights
 */
async function fetchMatchHighlights(matchId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      let query = _supabase.from('match_highlights').select(`
        *,
        match:matches(
          id,
          match_date,
          home_score,
          away_score,
          home_team:teams!matches_home_team_id_fkey(name, short_name),
          away_team:teams!matches_away_team_id_fkey(name, short_name)
        )
      `).order('created_at', { ascending: false });
      
      if (matchId) query = query.eq('match_id', matchId);
      const { data, error } = await query;
      if (!error && data) return data;
    } catch (e) {
      console.warn('Supabase fetchMatchHighlights error, using mock:', e);
    }
  }

  const store = getLocalStore();
  const teamsMap = Object.fromEntries(store.teams.map(t => [t.id, t]));
  let result = store.highlights.map(h => {
    const m = store.matches.find(match => match.id === h.match_id) || {};
    return {
      ...h,
      match: {
        ...m,
        home_team: teamsMap[m.home_team_id] || {},
        away_team: teamsMap[m.away_team_id] || {}
      }
    };
  });
  if (matchId) {
    result = result.filter(h => h.match_id === matchId);
  }
  return result;
}

/**
 * Fetch all match events for stats calculation
 */
async function fetchAllEvents(seasonId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase
        .from('match_events')
        .select(`
          *,
          player:players!match_events_player_id_fkey(id, name, number, team_id, teams(id, name, short_name)),
          assist_player:players!match_events_assist_player_id_fkey(id, name, number, team_id, teams(id, name, short_name)),
          match:matches(id, season_id, status)
        `)
        .order('created_at', { ascending: false });
      if (!error && data) {
        if (seasonId) return data.filter(e => e.match && e.match.season_id === seasonId);
        return data;
      }
    } catch (e) {
      console.warn('Supabase fetchAllEvents error, using mock:', e);
    }
  }

  const store = getLocalStore();
  const playersMap = Object.fromEntries(store.players.map(p => [p.id, p]));
  const teamsMap = Object.fromEntries(store.teams.map(t => [t.id, t]));
  const matchesMap = Object.fromEntries(store.matches.map(m => [m.id, m]));

  return store.events.map(ev => {
    const p = playersMap[ev.player_id] || {};
    return {
      ...ev,
      player: {
        ...p,
        teams: teamsMap[p.team_id] || null
      },
      assist_player: playersMap[ev.assist_player_id] ? {
        ...playersMap[ev.assist_player_id],
        teams: teamsMap[playersMap[ev.assist_player_id].team_id] || null
      } : null,
      match: matchesMap[ev.match_id] || null
    };
  });
}


// ── Admin Auth Functions ──

async function adminSignIn(email, password) {
  if (isSupabaseConfigured() && _supabase) {
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }
  // Local Demo Authentication simulation
  if (email && password) {
    const fakeSession = {
      user: { id: 'demo-admin-id', email },
      access_token: 'demo-token-1234'
    };
    localStorage.setItem('kfl_demo_admin_session', JSON.stringify(fakeSession));
    return { session: fakeSession, user: fakeSession.user };
  }
  throw new Error('이메일과 비밀번호를 입력해주세요.');
}

async function adminSignOut() {
  if (isSupabaseConfigured() && _supabase) {
    const { error } = await _supabase.auth.signOut();
    if (error) throw error;
  }
  localStorage.removeItem('kfl_demo_admin_session');
}

async function getSession() {
  if (isSupabaseConfigured() && _supabase) {
    const { data: { session }, error } = await _supabase.auth.getSession();
    if (error) throw error;
    return session;
  }
  const stored = localStorage.getItem('kfl_demo_admin_session');
  return stored ? JSON.parse(stored) : null;
}

function onAuthStateChange(callback) {
  if (isSupabaseConfigured() && _supabase) {
    return _supabase.auth.onAuthStateChange(callback);
  }
  return { data: { subscription: { unsubscribe: () => {} } } };
}


// ── Admin Write Functions ──

async function upsertMatch(match) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const payload = { ...match, updated_at: new Date().toISOString() };
      const { data, error } = await _supabase.from('matches').upsert(payload).select().single();
      if (!error && data) return data;
      console.warn('Supabase upsertMatch error, using local:', error);
    } catch (e) {
      console.warn('Supabase upsertMatch exception, using local:', e);
    }
  }
  const store = getLocalStore();
  const index = store.matches.findIndex(m => m.id === match.id);
  if (index >= 0) {
    store.matches[index] = { ...store.matches[index], ...match };
  } else {
    match.id = match.id || 'm-' + Date.now();
    store.matches.push(match);
  }
  saveLocalStore(store);

  // Trigger custom window event for local demo sync
  window.dispatchEvent(new CustomEvent('kfl:match_update', { detail: match }));
  return match;
}

async function upsertMatchEvent(event) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase.from('match_events').upsert(event).select().single();
      if (!error && data) return data;
      console.warn('Supabase upsertMatchEvent error, using local:', error);
    } catch (e) {
      console.warn('Supabase upsertMatchEvent exception, using local:', e);
    }
  }
  const store = getLocalStore();
  event.id = event.id || 'ev-' + Date.now();
  store.events.push(event);
  saveLocalStore(store);

  window.dispatchEvent(new CustomEvent('kfl:event_update', { detail: event }));
  return event;
}

async function upsertPlayer(player) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase.from('players').upsert(player).select().single();
      if (!error && data) return data;
      console.warn('Supabase upsertPlayer error, using local:', error);
    } catch (e) {
      console.warn('Supabase upsertPlayer exception, using local:', e);
    }
  }
  const store = getLocalStore();
  const index = store.players.findIndex(p => p.id === player.id);
  if (index >= 0) {
    store.players[index] = { ...store.players[index], ...player };
  } else {
    player.id = player.id || 'p-' + Date.now();
    store.players.push(player);
  }
  saveLocalStore(store);
  return player;
}

async function upsertTeam(team) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase.from('teams').upsert(team).select().single();
      if (!error && data) return data;
      console.warn('Supabase upsertTeam error, using local:', error);
    } catch (e) {
      console.warn('Supabase upsertTeam exception, using local:', e);
    }
  }
  const store = getLocalStore();
  const index = store.teams.findIndex(t => t.id === team.id);
  if (index >= 0) {
    store.teams[index] = { ...store.teams[index], ...team };
  } else {
    team.id = team.id || 't-' + Date.now();
    store.teams.push(team);
  }
  saveLocalStore(store);
  return team;
}

async function upsertHighlight(highlight) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { data, error } = await _supabase.from('match_highlights').upsert(highlight).select().single();
      if (!error && data) return data;
      console.warn('Supabase upsertHighlight error, using local:', error);
    } catch (e) {
      console.warn('Supabase upsertHighlight exception, using local:', e);
    }
  }
  const store = getLocalStore();
  const index = store.highlights.findIndex(h => h.id === highlight.id);
  if (index >= 0) {
    store.highlights[index] = { ...store.highlights[index], ...highlight };
  } else {
    highlight.id = highlight.id || 'h-' + Date.now();
    store.highlights.push(highlight);
  }
  saveLocalStore(store);
  return highlight;
}

async function deleteTeam(teamId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { error } = await _supabase.from('teams').delete().eq('id', teamId);
      if (!error) return;
      console.warn('Supabase deleteTeam error, using local:', error);
    } catch (e) {
      console.warn('Supabase deleteTeam exception, using local:', e);
    }
  }
  const store = getLocalStore();
  store.teams = store.teams.filter(t => t.id !== teamId);
  store.players = store.players.filter(p => p.team_id !== teamId);
  store.matches = store.matches.filter(m => m.home_team_id !== teamId && m.away_team_id !== teamId);
  saveLocalStore(store);
}

async function deleteMatch(matchId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { error } = await _supabase.from('matches').delete().eq('id', matchId);
      if (!error) return;
      console.warn('Supabase deleteMatch error, using local:', error);
    } catch (e) {
      console.warn('Supabase deleteMatch exception, using local:', e);
    }
  }
  const store = getLocalStore();
  store.matches = store.matches.filter(m => m.id !== matchId);
  store.events = store.events.filter(e => e.match_id !== matchId);
  saveLocalStore(store);
}

async function deletePlayer(playerId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { error } = await _supabase.from('players').delete().eq('id', playerId);
      if (!error) return;
      console.warn('Supabase deletePlayer error, using local:', error);
    } catch (e) {
      console.warn('Supabase deletePlayer exception, using local:', e);
    }
  }
  const store = getLocalStore();
  store.players = store.players.filter(p => p.id !== playerId);
  saveLocalStore(store);
}

async function deleteMatchEvent(eventId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { error } = await _supabase.from('match_events').delete().eq('id', eventId);
      if (!error) return;
      console.warn('Supabase deleteMatchEvent error, using local:', error);
    } catch (e) {
      console.warn('Supabase deleteMatchEvent exception, using local:', e);
    }
  }
  const store = getLocalStore();
  store.events = store.events.filter(e => e.id !== eventId);
  saveLocalStore(store);
}

async function deleteHighlight(highlightId) {
  if (isSupabaseConfigured() && _supabase) {
    try {
      const { error } = await _supabase.from('match_highlights').delete().eq('id', highlightId);
      if (!error) return;
      console.warn('Supabase deleteHighlight error, using local:', error);
    } catch (e) {
      console.warn('Supabase deleteHighlight exception, using local:', e);
    }
  }
  const store = getLocalStore();
  store.highlights = store.highlights.filter(h => h.id !== highlightId);
  saveLocalStore(store);
}

async function recalculateMatchScore(matchId) {
  const events = await fetchMatchEvents(matchId);
  const match = await fetchMatch(matchId);
  if (!match) return;

  let homeScore = 0;
  let awayScore = 0;

  events.forEach(event => {
    if (event.type === 'goal') {
      if (event.player && event.player.team_id === match.home_team_id) {
        homeScore++;
      } else if (event.player && event.player.team_id === match.away_team_id) {
        awayScore++;
      }
    } else if (event.type === 'own_goal') {
      if (event.player && event.player.team_id === match.home_team_id) {
        awayScore++;
      } else if (event.player && event.player.team_id === match.away_team_id) {
        homeScore++;
      }
    }
  });

  return upsertMatch({ id: matchId, home_score: homeScore, away_score: awayScore });
}
