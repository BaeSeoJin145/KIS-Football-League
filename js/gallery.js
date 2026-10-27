// ============================================
// KFL Google Drive Gallery Controller
// ============================================
// Google Drive 폴더와 동적으로 매칭하여 팀별 사진 및 썸네일을 표시합니다.
// 신규 팀 폴더가 구글 드라이브에 추가되면 자동으로 탭이 생성되고,
// 팀 선택 시 해당 팀의 구글 드라이브 폴더로 바로 이동할 수 있습니다.

(function() {
  'use strict';

  // 로컬 스토리지 키
  const STORAGE_KEY_CACHE = 'kfl_gdrive_gallery_cache_v2';
  const CACHE_EXPIRY_MS = (KFL_CONFIG?.GOOGLE_DRIVE_GALLERY?.CACHE_EXPIRY_MINUTES || 10) * 60 * 1000;
  const ROOT_FOLDER_URL = KFL_CONFIG?.GOOGLE_DRIVE_GALLERY?.ROOT_FOLDER_URL || 'https://drive.google.com/';

  // 상태 관리
  let galleryData = {
    folders: [
      { id: 'f-12-1', name: '12-1', url: ROOT_FOLDER_URL },
      { id: 'f-12-2', name: '12-2', url: ROOT_FOLDER_URL },
      { id: 'f-12-3', name: '12-3', url: ROOT_FOLDER_URL },
      { id: 'f-12-4', name: '12-4', url: ROOT_FOLDER_URL },
      { id: 'f-12-5', name: '12-5', url: ROOT_FOLDER_URL }
    ],
    photos: [],
    rootFolderUrl: ROOT_FOLDER_URL,
    rootFolderName: 'KFL-Gallery'
  };

  let activeTeam = 'all';
  let searchQuery = '';
  let currentLightboxIndex = -1;
  let filteredPhotos = [];

  // DOM Elements
  const filterContainer = document.getElementById('gallery-team-filters');
  const gridContainer = document.getElementById('gallery-grid-container');
  const countBadge = document.getElementById('gallery-count-badge');
  const searchInput = document.getElementById('gallery-search-input');
  const refreshBtn = document.getElementById('gallery-refresh-btn');
  const openDriveBtn = document.getElementById('gallery-open-drive-btn');
  const driveBtnText = document.getElementById('gallery-drive-btn-text');
  const folderNameLabel = document.getElementById('gallery-folder-name-label');

  // Lightbox Elements
  const lightbox = document.getElementById('gallery-lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxTitle = document.getElementById('lightbox-title');
  const lightboxTeamBadge = document.getElementById('lightbox-team-badge');
  const lightboxDate = document.getElementById('lightbox-date');
  const lightboxTeamFolderLink = document.getElementById('lightbox-team-folder-link');
  const lightboxDriveLink = document.getElementById('lightbox-drive-link');
  const lightboxCloseBtn = document.getElementById('lightbox-close-btn');
  const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
  const lightboxNextBtn = document.getElementById('lightbox-next-btn');

  /**
   * 구글 앱스 스크립트 웹앱 URL 가져오기
   */
  function getApiUrl() {
    return KFL_CONFIG?.GOOGLE_DRIVE_GALLERY?.WEBAPP_URL || '';
  }

  /**
   * 갤러리 초기화
   */
  async function initGallery() {
    if (typeof initComponents === 'function') {
      initComponents();
    }

    setupEventListeners();

    // SWR (Stale-While-Revalidate):
    // 1. 캐시가 있으면 로딩 없이 즉시(0.01초) 화면에 표시
    const cached = getCachedData();
    if (cached) {
      galleryData = cached;
      applyDataToUI();
      // 2. 백그라운드에서 조용히 최신 데이터 확인 및 자동 갱신
      fetchFromGoogleDrive(false);
    } else {
      // 캐시가 없을 때만 스켈레톤 로딩 표시 후 fetch
      showLoading();
      await fetchFromGoogleDrive(false);
    }
  }

  /**
   * 구글 드라이브로부터 최신 데이터 조회 (SWR)
   * @param {boolean} isManualRefresh 사용자가 직접 새로고침 버튼을 누른 경우
   */
  async function fetchFromGoogleDrive(isManualRefresh = false) {
    const apiUrl = getApiUrl();

    if (apiUrl) {
      try {
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('HTTP Status ' + response.status);
        const result = await response.json();

        if (result.status === 'success') {
          // folders 정규화: [{ id, name, url }]
          const normalizedFolders = (result.folders || []).map(f => {
            if (typeof f === 'string') {
              return { id: f, name: f, url: result.rootFolderUrl || ROOT_FOLDER_URL };
            }
            return {
              id: f.id || f.name,
              name: f.name,
              url: f.url || result.rootFolderUrl || '#'
            };
          });

          const newGalleryData = {
            folders: normalizedFolders,
            photos: result.photos || [],
            rootFolderUrl: result.rootFolderUrl || ROOT_FOLDER_URL,
            rootFolderName: result.rootFolderName || 'KFL-Gallery'
          };

          // 변경 사항 검사 (사진 수, 최신 사진 ID, 폴더 수 등)
          const isChanged = hasDataChanged(galleryData, newGalleryData);

          if (isChanged || !getCachedData() || isManualRefresh) {
            galleryData = newGalleryData;
            setCachedData(galleryData);
            applyDataToUI();
          }

          if (isManualRefresh && typeof showToast === 'function') {
            showToast('구글 드라이브 최신 사진을 동기화했습니다.', 'success');
          }
          return;
        } else {
          console.warn('API Response Warning:', result.message);
        }
      } catch (err) {
        console.error('구글 드라이브 API 로드 실패:', err);
        if (isManualRefresh && typeof showToast === 'function') {
          showToast('동기화 실패: 네트워크 또는 URL을 확인하세요.', 'error');
        }
      }
    }

    // API URL이 없거나 최초 로드 시 데이터가 아예 없을 때만 폴백 제공
    if (!galleryData.photos || galleryData.photos.length === 0) {
      loadFallbackData();
      applyDataToUI();
    }
  }

  /**
   * 데이터 변경 여부 검사
   */
  function hasDataChanged(oldData, newData) {
    if (!oldData || !newData) return true;
    if ((oldData.photos || []).length !== (newData.photos || []).length) return true;
    if ((oldData.folders || []).length !== (newData.folders || []).length) return true;
    
    // 최신 사진 ID 비교
    const oldFirstId = oldData.photos?.[0]?.id;
    const newFirstId = newData.photos?.[0]?.id;
    if (oldFirstId !== newFirstId) return true;

    return false;
  }

  /**
   * 기본 플레이스홀더 데이터
   */
  function loadFallbackData() {
    galleryData = {
      folders: [
        { id: 'f-12-1', name: '12-1', url: ROOT_FOLDER_URL },
        { id: 'f-12-2', name: '12-2', url: ROOT_FOLDER_URL },
        { id: 'f-12-3', name: '12-3', url: ROOT_FOLDER_URL },
        { id: 'f-12-4', name: '12-4', url: ROOT_FOLDER_URL },
        { id: 'f-12-5', name: '12-5', url: ROOT_FOLDER_URL }
      ],
      rootFolderUrl: ROOT_FOLDER_URL,
      rootFolderName: 'KFL-Gallery',
      photos: [
        {
          id: 'demo-1',
          name: '12-1 경기 킥오프 장면',
          team: '12-1',
          folderUrl: ROOT_FOLDER_URL,
          thumbnail: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80',
          viewUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1600&q=80',
          driveUrl: '#',
          created: new Date().toISOString()
        },
        {
          id: 'demo-2',
          name: '12-2 슈팅 환호',
          team: '12-2',
          folderUrl: ROOT_FOLDER_URL,
          thumbnail: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80',
          viewUrl: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1600&q=80',
          driveUrl: '#',
          created: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 'demo-3',
          name: '12-3 수비 클리어링',
          team: '12-3',
          folderUrl: ROOT_FOLDER_URL,
          thumbnail: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80',
          viewUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1600&q=80',
          driveUrl: '#',
          created: new Date(Date.now() - 7200000).toISOString()
        },
        {
          id: 'demo-4',
          name: '12-4 골키퍼 선방 장면',
          team: '12-4',
          folderUrl: ROOT_FOLDER_URL,
          thumbnail: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80',
          viewUrl: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80',
          driveUrl: '#',
          created: new Date(Date.now() - 10800000).toISOString()
        },
        {
          id: 'demo-5',
          name: '12-5 단체 사진',
          team: '12-5',
          folderUrl: ROOT_FOLDER_URL,
          thumbnail: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80',
          viewUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1600&q=80',
          driveUrl: '#',
          created: new Date(Date.now() - 14400000).toISOString()
        }
      ]
    };
  }

  /**
   * 데이터를 화면에 바인딩
   */
  function applyDataToUI() {
    if (folderNameLabel) folderNameLabel.textContent = galleryData.rootFolderName || 'KFL-Gallery';
    
    renderTeamFilters();
    updateDriveFolderButton();
    filterAndRenderPhotos();
  }

  /**
   * 팀별 구글 드라이브 폴더 바로가기 링크 업데이트
   * (전체일 때는 KFL-Gallery 상위 폴더, 팀 선택 시 해당 팀 폴더 링크로 변경)
   */
  function updateDriveFolderButton() {
    if (!openDriveBtn) return;

    if (activeTeam === 'all') {
      openDriveBtn.href = galleryData.rootFolderUrl || ROOT_FOLDER_URL;
      if (driveBtnText) driveBtnText.textContent = '구글 드라이브 열기';
    } else {
      const folder = (galleryData.folders || []).find(f => f.name === activeTeam);
      const targetUrl = folder?.url || galleryData.rootFolderUrl || ROOT_FOLDER_URL;
      openDriveBtn.href = targetUrl;
      if (driveBtnText) driveBtnText.textContent = `${activeTeam} 드라이브 폴더 열기`;
    }
  }

  /**
   * 구글 드라이브 폴더명 기반 팀 필터 탭 동적 렌더링
   */
  function renderTeamFilters() {
    if (!filterContainer) return;

    const folders = galleryData.folders || [];

    let html = `<button class="gallery-filter-btn ${activeTeam === 'all' ? 'active' : ''}" data-team="all">전체</button>`;

    folders.forEach(folder => {
      const folderName = folder.name;
      const isActive = activeTeam === folderName ? 'active' : '';
      const teamPhotoCount = (galleryData.photos || []).filter(p => p.team === folderName).length;
      html += `
        <button class="gallery-filter-btn ${isActive}" data-team="${escapeHtml(folderName)}">
          ${escapeHtml(folderName)} ${teamPhotoCount > 0 ? `(${teamPhotoCount})` : ''}
        </button>
      `;
    });

    filterContainer.innerHTML = html;

    filterContainer.querySelectorAll('.gallery-filter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const team = e.currentTarget.getAttribute('data-team');
        setActiveTeam(team);
      });
    });
  }

  /**
   * 활성 팀 변경
   */
  function setActiveTeam(team) {
    activeTeam = team;
    filterContainer.querySelectorAll('.gallery-filter-btn').forEach(btn => {
      if (btn.getAttribute('data-team') === team) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    updateDriveFolderButton();
    filterAndRenderPhotos();
  }

  /**
   * 사진 그리드 필터링 및 렌더링
   */
  function filterAndRenderPhotos() {
    if (!gridContainer) return;

    let list = galleryData.photos || [];

    // 1. 팀 필터
    if (activeTeam !== 'all') {
      list = list.filter(p => p.team === activeTeam);
    }

    // 2. 검색어 필터
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(p => 
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.team && p.team.toLowerCase().includes(query))
      );
    }

    filteredPhotos = list;

    if (countBadge) {
      countBadge.textContent = `총 ${filteredPhotos.length}장의 사진`;
    }

    if (filteredPhotos.length === 0) {
      const folderObj = (galleryData.folders || []).find(f => f.name === activeTeam);
      const targetDriveUrl = (activeTeam !== 'all' && folderObj?.url) ? folderObj.url : (galleryData.rootFolderUrl || ROOT_FOLDER_URL);

      gridContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; background: var(--bg-surface); border: 2px dashed #151515; border-radius: var(--radius-md);">
          <h3 style="font-size: var(--text-base); font-weight: 700; margin-bottom: 6px;">등록된 사진이 없습니다</h3>
          <p style="font-size: var(--text-xs); color: var(--text-muted); margin-bottom: 16px;">
            ${activeTeam !== 'all' ? `구글 드라이브의 <strong>${escapeHtml(activeTeam)}</strong> 폴더에 사진을 업로드하면 자동으로 표시됩니다.` : '구글 드라이브 폴더에 사진을 업로드하면 자동으로 표시됩니다.'}
          </p>
          <a href="${targetDriveUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
            ${activeTeam !== 'all' ? `${escapeHtml(activeTeam)} 폴더 열기` : '구글 드라이브 열기'}
          </a>
        </div>
      `;
      return;
    }

    let cardsHtml = '';
    filteredPhotos.forEach((photo, index) => {
      const formattedDate = formatDate(photo.created);
      cardsHtml += `
        <div class="gallery-card" data-index="${index}">
          <div class="gallery-card-thumb-wrap">
            <span class="gallery-team-badge">${escapeHtml(photo.team || 'KFL')}</span>
            <img class="gallery-card-img" 
                 src="${escapeHtml(photo.thumbnail || photo.viewUrl)}" 
                 alt="${escapeHtml(photo.name)}" 
                 loading="lazy"
                 onerror="this.onerror=null; this.src='assets/kis-watermark.png';">
          </div>
          <div class="gallery-card-info">
            <div class="gallery-card-title" title="${escapeHtml(photo.name)}">${escapeHtml(photo.name)}</div>
            <div class="gallery-card-meta">
              <span>${formattedDate}</span>
              <span style="color: var(--kfl-base-blue); font-weight: 600;">확대 보기</span>
            </div>
          </div>
        </div>
      `;
    });

    gridContainer.innerHTML = cardsHtml;

    gridContainer.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('click', () => {
        const index = parseInt(card.getAttribute('data-index'), 10);
        openLightbox(index);
      });
    });
  }

  /**
   * 라이트박스 열기
   */
  function openLightbox(index) {
    if (index < 0 || index >= filteredPhotos.length) return;
    currentLightboxIndex = index;
    const photo = filteredPhotos[index];

    lightboxImg.src = photo.viewUrl || photo.thumbnail;
    lightboxImg.alt = photo.name;
    lightboxTitle.textContent = photo.name;
    lightboxTeamBadge.textContent = photo.team || 'KFL';
    lightboxDate.textContent = formatDate(photo.created);
    
    // 팀 구글 드라이브 폴더 링크
    const teamFolder = (galleryData.folders || []).find(f => f.name === photo.team);
    const folderUrl = photo.folderUrl || teamFolder?.url || galleryData.rootFolderUrl || ROOT_FOLDER_URL;
    if (lightboxTeamFolderLink) {
      lightboxTeamFolderLink.href = folderUrl;
      lightboxTeamFolderLink.textContent = `${photo.team || '팀'} 폴더 열기`;
    }

    // 사진 원본 링크
    if (lightboxDriveLink) {
      if (photo.driveUrl && photo.driveUrl !== '#') {
        lightboxDriveLink.href = photo.driveUrl;
        lightboxDriveLink.style.display = 'inline-flex';
      } else {
        lightboxDriveLink.style.display = 'none';
      }
    }

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  /**
   * 라이트박스 닫기
   */
  function closeLightbox() {
    lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  /**
   * 이전/다음 사진 이동
   */
  function stepLightbox(delta) {
    if (filteredPhotos.length === 0) return;
    let nextIndex = currentLightboxIndex + delta;
    if (nextIndex < 0) nextIndex = filteredPhotos.length - 1;
    if (nextIndex >= filteredPhotos.length) nextIndex = 0;
    openLightbox(nextIndex);
  }

  /**
   * 이벤트 리스너 등록
   */
  function setupEventListeners() {
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterAndRenderPhotos();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = '<span>동기화 중...</span>';
        await fetchFromGoogleDrive(true);
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<span>새로고침</span>';
      });
    }

    if (lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeLightbox);
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', () => stepLightbox(-1));
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', () => stepLightbox(1));

    if (lightbox) {
      lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('active')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') stepLightbox(-1);
      if (e.key === 'ArrowRight') stepLightbox(1);
    });
  }

  /**
   * 로딩 스켈레톤
   */
  function showLoading() {
    if (!gridContainer) return;
    let skeletonHtml = '';
    for (let i = 0; i < 6; i++) {
      skeletonHtml += `
        <div class="gallery-card" style="pointer-events: none; opacity: 0.6;">
          <div class="gallery-card-thumb-wrap" style="background: #2a2a2a; animation: pulse 1.5s infinite;"></div>
          <div class="gallery-card-info">
            <div style="height: 14px; background: #ddd; border-radius: 4px; margin-bottom: 6px;"></div>
            <div style="height: 10px; width: 60%; background: #eee; border-radius: 4px;"></div>
          </div>
        </div>
      `;
    }
    gridContainer.innerHTML = skeletonHtml;
  }

  /**
   * 캐시 유틸
   */
  function getCachedData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CACHE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp > CACHE_EXPIRY_MS) {
        localStorage.removeItem(STORAGE_KEY_CACHE);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  function setCachedData(data) {
    try {
      localStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify({
        timestamp: Date.now(),
        data: data
      }));
    } catch (e) {
      console.warn('캐시 저장 실패:', e);
    }
  }

  function formatDate(isoString) {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.getMonth() + 1}.${d.getDate()}`;
    } catch {
      return '';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGallery);
  } else {
    initGallery();
  }
})();
