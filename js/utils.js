// ============================================
// KFL Utility Functions
// ============================================

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getYouTubeEmbedUrl(videoUrl) {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = url.pathname.slice(1);
    } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      videoId = url.searchParams.get('v') || url.pathname.match(/^\/embed\/([^/]+)/)?.[1] || '';
    }

    if (!/^[\w-]{11}$/.test(videoId)) return '';
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return '';
  }
}

/**
 * Format date for display
 */
function formatDate(dateStr, options = {}) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const defaults = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: KFL_CONFIG.DEFAULT_TIMEZONE
  };
  return date.toLocaleDateString(KFL_CONFIG.DEFAULT_LOCALE, { ...defaults, ...options });
}

/**
 * Format short date (10/24)
 */
function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString(KFL_CONFIG.DEFAULT_LOCALE, {
    month: 'numeric',
    day: 'numeric',
    timeZone: KFL_CONFIG.DEFAULT_TIMEZONE
  });
}

/**
 * Format time (15:30)
 */
function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString(KFL_CONFIG.DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KFL_CONFIG.DEFAULT_TIMEZONE
  });
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * Format date and time
 */
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

/**
 * Format relative time (e.g., "2시간 전")
 */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (hours < 24) return `${hours}시간 전`;
  if (days < 7) return `${days}일 전`;
  return formatDate(dateStr);
}

/**
 * Format date for input[type="date"] (YYYY-MM-DD)
 */
function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

/**
 * Format date for input[type="datetime-local"]
 */
function formatDateTimeInput(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Check if date is today
 */
function isToday(dateStr) {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function groupBy(items, getKey) {
  const groups = new Map();
  items.forEach(item => {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return Object.fromEntries(groups);
}

/**
 * Group matches by date
 */
function groupMatchesByDate(matches) {
  const groups = {};
  matches.forEach(match => {
    const dateKey = formatDateInput(match.match_date);
    if (!groups[dateKey]) {
      groups[dateKey] = {
        date: dateKey,
        label: formatDate(match.match_date, { weekday: 'short' }),
        matches: []
      };
    }
    groups[dateKey].matches.push(match);
  });
  return Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get match status badge HTML
 */
function getStatusBadge(status, minute) {
  const labels = KFL_CONFIG.MATCH_STATUS_LABELS;
  const label = labels[status] || status;
  
  let text = label;
  if (status === 'live' && minute) {
    text = `${minute}'`;
  }
  
  return `<span class="badge badge-${status}">${text}</span>`;
}

/**
 * Get team initial for logo placeholder
 */
function getTeamInitial(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

/**
 * Get team logo HTML (Disabled for clean text-only design)
 */
function getTeamLogoHTML(team, size = '') {
  return '';
}

/**
 * Calculate standings from matches
 */
function calculateStandings(matches, teams) {
  const standings = {};
  
  // Initialize all teams
  teams.forEach(team => {
    standings[team.id] = {
      team_id: team.id,
      team_name: team.name,
      team_short: team.short_name || team.name,
      team_logo: team.logo_url,
      team_color: team.color,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goals_for: 0,
      goals_against: 0,
      goal_difference: 0,
      points: 0,
      form: [] // last 5 results: W, D, L
    };
  });
  
  // Process finished matches
  const finishedMatches = matches
    .filter(m => m.status === 'finished')
    .sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  
  finishedMatches.forEach(match => {
    const home = standings[match.home_team_id];
    const away = standings[match.away_team_id];
    
    if (!home || !away) return;
    
    home.played++;
    away.played++;
    home.goals_for += match.home_score;
    home.goals_against += match.away_score;
    away.goals_for += match.away_score;
    away.goals_against += match.home_score;
    
    if (match.home_score > match.away_score) {
      home.won++;
      away.lost++;
      home.points += 3;
      home.form.push('W');
      away.form.push('L');
    } else if (match.home_score < match.away_score) {
      away.won++;
      home.lost++;
      away.points += 3;
      home.form.push('L');
      away.form.push('W');
    } else {
      home.drawn++;
      away.drawn++;
      home.points += 1;
      away.points += 1;
      home.form.push('D');
      away.form.push('D');
    }
  });
  
  // Calculate goal difference and trim form to last 5
  Object.values(standings).forEach(team => {
    team.goal_difference = team.goals_for - team.goals_against;
    team.form = team.form.slice(-5);
  });
  
  // Sort: points → goal difference → goals for → name
  return Object.values(standings).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goal_difference !== a.goal_difference) return b.goal_difference - a.goal_difference;
    if (b.goals_for !== a.goals_for) return b.goals_for - a.goals_for;
    return a.team_name.localeCompare(b.team_name);
  });
}

function calculateTopScorers(events, limit = 5) {
  const scorers = new Map();

  events.forEach(event => {
    if (event.type !== 'goal' || !event.player_id) return;

    const scorer = scorers.get(event.player_id) || {
      player: event.player || null,
      team: event.player?.teams || null,
      goals: 0
    };
    scorer.goals++;
    scorers.set(event.player_id, scorer);
  });

  return [...scorers.values()]
    .sort((a, b) => b.goals - a.goals || (a.player?.name || '').localeCompare(b.player?.name || ''))
    .slice(0, limit);
}

function calculateTopAssists(events, limit = 5) {
  const assistLeaders = new Map();

  events.forEach(event => {
    if (event.type !== 'goal' || !event.assist_player_id) return;

    const assister = assistLeaders.get(event.assist_player_id) || {
      player: event.assist_player || null,
      team: event.assist_player?.teams || null,
      assists: 0
    };
    assister.assists++;
    assistLeaders.set(event.assist_player_id, assister);
  });

  return [...assistLeaders.values()]
    .sort((a, b) => b.assists - a.assists || (a.player?.name || '').localeCompare(b.player?.name || ''))
    .slice(0, limit);
}

/**
 * Calculate player stats from events
 */
function calculatePlayerStats(events, players) {
  const stats = {};
  
  // Initialize all players
  players.forEach(player => {
    stats[player.id] = {
      player_id: player.id,
      player_name: player.name,
      player_number: player.number,
      player_position: player.position,
      team_id: player.team_id,
      team_name: player.teams ? player.teams.name : '',
      team_short: player.teams ? (player.teams.short_name || player.teams.name) : '',
      goals: 0,
      own_goals: 0,
      assists: 0,
      yellow_cards: 0,
      red_cards: 0,
      appearances: 0
    };
  });
  
  // Count events (only from finished matches)
  events.forEach(event => {
    if (!event.player || !stats[event.player.id]) return;
    if (event.match && event.match.status !== 'finished') return;
    
    const stat = stats[event.player.id];
    switch (event.type) {
      case 'goal': stat.goals++; break;
      case 'own_goal': stat.own_goals++; break;
      case 'assist': stat.assists++; break;
      case 'yellow_card': stat.yellow_cards++; break;
      case 'red_card': stat.red_cards++; break;
    }
  });
  
  return Object.values(stats);
}

/**
 * Get top scorers from player stats
 */
function getTopScorers(playerStats, limit = 10) {
  return playerStats
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, limit);
}

/**
 * Get top assisters from player stats
 */
function getTopAssisters(playerStats, limit = 10) {
  return playerStats
    .filter(p => p.assists > 0)
    .sort((a, b) => b.assists - a.assists || b.goals - a.goals)
    .slice(0, limit);
}

/**
 * Safe query selector
 */
function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

/**
 * Create element with classes and attributes
 */
function createElement(tag, className = '', attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'textContent') el.textContent = val;
    else if (key === 'innerHTML') el.innerHTML = val;
    else el.setAttribute(key, val);
  });
  return el;
}

/**
 * Get URL query parameter
 */
function getParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

/**
 * Set URL query parameters
 */
function setParams(params) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, val]) => {
    if (val === null || val === undefined || val === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, val);
    }
  });
  window.history.replaceState({}, '', url);
}

/**
 * Debounce function
 */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Extract YouTube video ID from URL
 */
function getYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Get YouTube thumbnail URL
 */
function getYouTubeThumbnail(url) {
  const id = getYouTubeId(url);
  if (!id) return null;
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Get YouTube embed URL
 */
function getYouTubeEmbed(url) {
  const id = getYouTubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}

/**
 * Format goal difference with sign
 */
function formatGD(gd) {
  if (gd > 0) return `+${gd}`;
  return `${gd}`;
}
