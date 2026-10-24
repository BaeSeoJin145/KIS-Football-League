// ============================================
// KFL Highlights Page Logic
// ============================================

let allHighlights = [];
let allTeams = [];
let selectedTeamId = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  initComponents();
  await initSupabase();

  await loadHighlightsData();
  setupHighlightsFilter();

  setupReconnection(() => loadHighlightsData());
});

async function loadHighlightsData() {
  const container = document.getElementById('highlights-grid-container');
  try {
    if (container) showLoading(container, 4);

    const [highlights, teams] = await Promise.all([
      fetchMatchHighlights(),
      fetchTeams()
    ]);

    allHighlights = highlights;
    allTeams = teams;

    populateTeamFilter(teams);
    renderFilteredHighlights();
  } catch (err) {
    console.error('Failed to load highlights:', err);
    if (container) showError(container, '하이라이트 영상을 불러오는데 실패했습니다.');
  }
}

function populateTeamFilter(teams) {
  const filterContainer = document.getElementById('highlights-team-filters');
  if (!filterContainer) return;

  let html = `<button class="chip ${selectedTeamId === 'all' ? 'active' : ''}" data-team-id="all">전체 영상</button>`;
  teams.forEach(t => {
    html += `<button class="chip ${selectedTeamId === t.id ? 'active' : ''}" data-team-id="${t.id}">${t.name}</button>`;
  });
  filterContainer.innerHTML = html;

  filterContainer.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      filterContainer.querySelectorAll('.chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedTeamId = btn.getAttribute('data-team-id');
      renderFilteredHighlights();
    });
  });
}

function setupHighlightsFilter() {
  const searchInput = document.getElementById('highlight-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      renderFilteredHighlights();
    });
  }
}

function renderFilteredHighlights() {
  const container = document.getElementById('highlights-grid-container');
  const countBadge = document.getElementById('highlights-count-badge');
  if (!container) return;

  const searchInput = document.getElementById('highlight-search-input');
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  let filtered = [...allHighlights];

  if (selectedTeamId !== 'all') {
    filtered = filtered.filter(h => {
      if (!h.match) return false;
      return h.match.home_team_id === selectedTeamId || h.match.away_team_id === selectedTeamId;
    });
  }

  if (query) {
    filtered = filtered.filter(h => 
      h.title.toLowerCase().includes(query) ||
      (h.description && h.description.toLowerCase().includes(query))
    );
  }

  if (countBadge) {
    countBadge.textContent = `${filtered.length}개 영상`;
  }

  if (filtered.length === 0) {
    showEmptyState(container, {
      title: '영상이 없습니다',
      text: '검색어나 필터 조건을 변경해보세요.'
    });
    return;
  }

  container.innerHTML = filtered.map(h => {
    const match = h.match || {};
    const matchText = match.home_team && match.away_team 
      ? `${match.home_team.name || ''} ${match.home_score ?? 0} : ${match.away_score ?? 0} ${match.away_team.name || ''}` 
      : '';
    const duration = h.duration_seconds ? formatDuration(h.duration_seconds) : '';
    const thumb = h.thumbnail_url || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80';

    return `
      <div class="card card-interactive" onclick="openHighlightModal('${h.video_url}', '${escapeHtml(h.title)}', '${escapeHtml(h.description || '')}')" style="overflow: hidden;">
        <div style="position: relative; width: 100%; aspect-ratio: 16/9; background: #000;">
          <img src="${thumb}" alt="${escapeHtml(h.title)}" style="width: 100%; height: 100%; object-fit: cover; opacity: 0.85;">
          <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;">
            <div style="width: 52px; height: 52px; border-radius: 50%; background: var(--kfl-dark-blue); display: flex; align-items: center; justify-content: center; color: var(--kfl-mint); font-size: 22px;">
              재생
            </div>
          </div>
          ${duration ? `<span style="position: absolute; bottom: 10px; right: 10px; background: rgba(0,0,0,0.8); color: #fff; font-size: var(--text-xs); padding: 3px 8px; border-radius: 4px; font-weight: 700;">${duration}</span>` : ''}
        </div>

        <div class="card-body" style="padding: var(--spacing-lg);">
          ${matchText ? `<span style="font-size: var(--text-xs); color: var(--color-primary); font-weight: 700;">${matchText}</span>` : ''}
          <h3 style="margin: var(--spacing-xs) 0; font-size: var(--text-base); font-weight: 800; line-height: 1.4;">${h.title}</h3>
          ${h.description ? `<p style="margin: 0; font-size: var(--text-xs); color: var(--text-muted); line-height: 1.5;">${h.description}</p>` : ''}
          ${h.match_id ? `<a href="match-detail.html?id=${h.match_id}" class="btn btn-sm btn-outline mt-md" onclick="event.stopPropagation();">경기 기록 보기 →</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openHighlightModal(videoUrl, title, desc) {
  const embedUrl = getYouTubeEmbedUrl(videoUrl);
  showModal({
    title,
    content: `
      <div style="position: relative; width: 100%; aspect-ratio: 16/9; border-radius: var(--radius-md); overflow: hidden; background: #000; margin-bottom: var(--spacing-md);">
        <iframe src="${embedUrl}" title="${title}" style="width: 100%; height: 100%; border: none;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
      ${desc ? `<p style="font-size: var(--text-sm); color: var(--text-muted); line-height: 1.6; margin: 0;">${desc}</p>` : ''}
    `,
    id: 'highlight-player-modal'
  });
}
