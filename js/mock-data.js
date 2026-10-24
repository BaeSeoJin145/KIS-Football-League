// ============================================
// KFL Mock Data & Local Storage Fallback
// ============================================
// Provides realistic data when Supabase credentials
// are not configured or when running offline.

const KFL_MOCK_DATA = {
  season: {
    id: 's-2026-spring',
    name: 'KFL 2026 스프링 리그',
    year: 2026,
    is_active: true,
    start_date: '2026-03-01',
    end_date: '2026-06-30'
  },

  teams: [
    {
      id: 't-phx',
      name: '불사조 FC',
      short_name: 'PHX',
      color: '#0101C8',
      secondary_color: '#02FCFF',
      coach: '김철수 감독',
      description: '강력한 전방 압박과 조직적인 수비의 명문 구단'
    },
    {
      id: 't-drg',
      name: '블루 드래곤즈',
      short_name: 'DRG',
      color: '#0984E3',
      secondary_color: '#74B9FF',
      coach: '이영표 감독',
      description: '화려한 티키타카 패스 앤 무브 축구를 구사하는 공격 명가'
    },
    {
      id: 't-tig',
      name: '안암 타이거즈',
      short_name: 'TIG',
      color: '#D63031',
      secondary_color: '#FF7675',
      coach: '박지성 감독',
      description: '불굴의 투지와 빠른 스피드로 승부하는 전통의 강호'
    },
    {
      id: 't-shk',
      name: '서해 샤크스',
      short_name: 'SHK',
      color: '#00CEC9',
      secondary_color: '#81ECEC',
      coach: '최진철 감독',
      description: '철통 수비라인과 치명적인 카운터어택 전술'
    },
    {
      id: 't-wlv',
      name: '한라 울브스',
      short_name: 'WLV',
      color: '#6C5CE7',
      secondary_color: '#A29BFE',
      coach: '안정환 감독',
      description: '젊은 선수들의 패기와 스피드가 돋보이는 신흥 강호'
    },
    {
      id: 't-egl',
      name: '선더 이글스',
      short_name: 'EGL',
      color: '#E17055',
      secondary_color: '#FAB1A0',
      coach: '설기현 감독',
      description: '정교한 세트피스와 공중전의 최강자'
    }
  ],

  players: [
    // 불사조 FC
    { id: 'p-1', team_id: 't-phx', name: '손흥민', number: 7, position: 'FW', nationality: '대한민국', bio: '폭발적인 주력과 양발 슈팅 능력을 갖춘 에이스' },
    { id: 'p-2', team_id: 't-phx', name: '이강인', number: 10, position: 'MF', nationality: '대한민국', bio: '환상적인 탈압박과 킬패스를 구사하는 플레이메이커' },
    { id: 'p-3', team_id: 't-phx', name: '김민재', number: 4, position: 'DF', nationality: '대한민국', bio: '압도적인 피지컬과 빠른 커버 능력을 지닌 통곡의 벽' },
    { id: 'p-4', team_id: 't-phx', name: '조현우', number: 1, position: 'GK', nationality: '대한민국', bio: '빛나는 동물적 반사신경으로 골문을 지키는 수문장' },
    { id: 'p-17', team_id: 't-phx', name: '김태환', number: 23, position: 'DF', nationality: '대한민국', bio: '우측면을 지배하는 치타 풀백' },

    // 블루 드래곤즈
    { id: 'p-5', team_id: 't-drg', name: '황희찬', number: 11, position: 'FW', nationality: '대한민국', bio: '황소 같은 돌파력과 저돌적인 득점 본능' },
    { id: 'p-6', team_id: 't-drg', name: '황인범', number: 6, position: 'MF', nationality: '대한민국', bio: '경기의 템포를 조율하는 팀의 엔진' },
    { id: 'p-7', team_id: 't-drg', name: '설영우', number: 22, position: 'DF', nationality: '대한민국', bio: '공수 양면에서 안정적인 활약을 펼치는 풀백' },
    { id: 'p-8', team_id: 't-drg', name: '송범근', number: 1, position: 'GK', nationality: '대한민국', bio: '안정적인 공중볼 처리와 킥력을 갖춘 골키퍼' },

    // 안암 타이거즈
    { id: 'p-9', team_id: 't-tig', name: '조규성', number: 9, position: 'FW', nationality: '대한민국', bio: '타점 높은 헤더와 뛰어난 연계 플레이의 스트라이커' },
    { id: 'p-10', team_id: 't-tig', name: '백승호', number: 8, position: 'MF', nationality: '대한민국', bio: '정교한 킥과 넓은 시야를 지닌 중앙 미드필더' },
    { id: 'p-11', team_id: 't-tig', name: '정승현', number: 15, position: 'DF', nationality: '대한민국', bio: '터프한 대인 마크와 공중볼 장악력' },
    { id: 'p-12', team_id: 't-tig', name: '김승규', number: 21, position: 'GK', nationality: '대한민국', bio: '베테랑의 관록과 안정적인 빌드업' },

    // 서해 샤크스
    { id: 'p-13', team_id: 't-shk', name: '오현규', number: 18, position: 'FW', nationality: '대한민국', bio: '강한 몸싸움과 슈팅 파워를 자랑하는 공격수' },
    { id: 'p-14', team_id: 't-shk', name: '이재성', number: 7, position: 'MF', nationality: '대한민국', bio: '지치지 않는 체력과 영리한 공간 침투' },
    { id: 'p-18', team_id: 't-shk', name: '권경원', number: 20, position: 'DF', nationality: '대한민국', bio: '왼발 센터백의 빌드업과 노련한 수비' },

    // 한라 울브스
    { id: 'p-15', team_id: 't-wlv', name: '정우영', number: 17, position: 'FW', nationality: '대한민국', bio: '스피드와 전방 압박 능력이 뛰어난 윙어' },
    { id: 'p-16', team_id: 't-wlv', name: '홍현석', number: 14, position: 'MF', nationality: '대한민국', bio: '왕성한 활동량과 날카로운 전진 패스' },

    // 선더 이글스
    { id: 'p-19', team_id: 't-egl', name: '배준호', number: 20, position: 'MF', nationality: '대한민국', bio: '화려한 테크닉과 창의적인 플레이' },
    { id: 'p-20', team_id: 't-egl', name: '양현준', number: 19, position: 'FW', nationality: '대한민국', bio: '예측 불가능한 1대1 돌파 드리블러' }
  ],

  matches: [
    // 1R 완료 경기들
    {
      id: 'm-101',
      season_id: 's-2026-spring',
      round: 1,
      home_team_id: 't-phx',
      away_team_id: 't-tig',
      home_score: 3,
      away_score: 1,
      match_date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
      status: 'finished',
      venue: 'KIS 메인 스타디움',
      minute: 90
    },
    {
      id: 'm-102',
      season_id: 's-2026-spring',
      round: 1,
      home_team_id: 't-drg',
      away_team_id: 't-shk',
      home_score: 2,
      away_score: 2,
      match_date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      status: 'finished',
      venue: 'KIS 제2 경기장',
      minute: 90
    },
    {
      id: 'm-103',
      season_id: 's-2026-spring',
      round: 1,
      home_team_id: 't-wlv',
      away_team_id: 't-egl',
      home_score: 0,
      away_score: 1,
      match_date: new Date(Date.now() - 4 * 24 * 3600 * 1000).toISOString(),
      status: 'finished',
      venue: 'KIS 풋살 돔',
      minute: 90
    },

    // 2R 실시간 LIVE 경기!
    {
      id: 'm-201',
      season_id: 's-2026-spring',
      round: 2,
      home_team_id: 't-phx',
      away_team_id: 't-drg',
      home_score: 2,
      away_score: 1,
      match_date: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      status: 'live',
      venue: 'KIS 메인 스타디움',
      minute: 73
    },

    // 2R & 3R 예정 경기들
    {
      id: 'm-202',
      season_id: 's-2026-spring',
      round: 2,
      home_team_id: 't-tig',
      away_team_id: 't-wlv',
      home_score: 0,
      away_score: 0,
      match_date: new Date(Date.now() + 1 * 24 * 3600 * 1000 + 3 * 3600 * 1000).toISOString(),
      status: 'scheduled',
      venue: 'KIS 제2 경기장',
      minute: 0
    },
    {
      id: 'm-203',
      season_id: 's-2026-spring',
      round: 2,
      home_team_id: 't-shk',
      away_team_id: 't-egl',
      home_score: 0,
      away_score: 0,
      match_date: new Date(Date.now() + 2 * 24 * 3600 * 1000 + 4 * 3600 * 1000).toISOString(),
      status: 'scheduled',
      venue: 'KIS 풋살 돔',
      minute: 0
    },
    {
      id: 'm-301',
      season_id: 's-2026-spring',
      round: 3,
      home_team_id: 't-phx',
      away_team_id: 't-shk',
      home_score: 0,
      away_score: 0,
      match_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      status: 'scheduled',
      venue: 'KIS 메인 스타디움',
      minute: 0
    },
    {
      id: 'm-302',
      season_id: 's-2026-spring',
      round: 3,
      home_team_id: 't-drg',
      away_team_id: 't-tig',
      home_score: 0,
      away_score: 0,
      match_date: new Date(Date.now() + 8 * 24 * 3600 * 1000).toISOString(),
      status: 'scheduled',
      venue: 'KIS 제2 경기장',
      minute: 0
    }
  ],

  events: [
    // Finished match m-101
    { id: 'ev-1', match_id: 'm-101', player_id: 'p-1', type: 'goal', minute: 12, notes: '중앙 돌파 후 오른발 슛' },
    { id: 'ev-2', match_id: 'm-101', player_id: 'p-9', type: 'goal', minute: 34, notes: '헤더 만회골' },
    { id: 'ev-3', match_id: 'm-101', player_id: 'p-2', type: 'goal', minute: 55, notes: '프리킥 득점' },
    { id: 'ev-4', match_id: 'm-101', player_id: 'p-1', type: 'goal', minute: 82, notes: '쐐기골' },

    // Live match m-201
    { id: 'ev-11', match_id: 'm-201', player_id: 'p-1', assist_player_id: 'p-2', type: 'goal', minute: 14, notes: '이강인의 칼날 패스를 손흥민이 오른발 감아차기로 골망을 흔듦' },
    { id: 'ev-12', match_id: 'm-201', player_id: 'p-5', assist_player_id: 'p-6', type: 'goal', minute: 38, notes: '황희찬의 저돌적인 돌파 후 골문 구석으로 꽂아넣은 동점골' },
    { id: 'ev-13', match_id: 'm-201', player_id: 'p-7', type: 'yellow_card', minute: 42, notes: '역습 차단 파울로 경고' },
    { id: 'ev-14', match_id: 'm-201', player_id: 'p-2', assist_player_id: 'p-1', type: 'goal', minute: 59, notes: '손흥민의 컷백을 받아 침착하게 왼발로 마무리' }
  ],

  lineups: [
    { id: 'l-1', match_id: 'm-201', player_id: 'p-1', team_id: 't-phx', is_starter: true, position: 'FW', jersey_number: 7 },
    { id: 'l-2', match_id: 'm-201', player_id: 'p-2', team_id: 't-phx', is_starter: true, position: 'MF', jersey_number: 10 },
    { id: 'l-3', match_id: 'm-201', player_id: 'p-3', team_id: 't-phx', is_starter: true, position: 'DF', jersey_number: 4 },
    { id: 'l-4', match_id: 'm-201', player_id: 'p-4', team_id: 't-phx', is_starter: true, position: 'GK', jersey_number: 1 },
    { id: 'l-5', match_id: 'm-201', player_id: 'p-17', team_id: 't-phx', is_starter: false, position: 'DF', jersey_number: 23 },

    { id: 'l-6', match_id: 'm-201', player_id: 'p-5', team_id: 't-drg', is_starter: true, position: 'FW', jersey_number: 11 },
    { id: 'l-7', match_id: 'm-201', player_id: 'p-6', team_id: 't-drg', is_starter: true, position: 'MF', jersey_number: 6 },
    { id: 'l-8', match_id: 'm-201', player_id: 'p-7', team_id: 't-drg', is_starter: true, position: 'DF', jersey_number: 22 },
    { id: 'l-9', match_id: 'm-201', player_id: 'p-8', team_id: 't-drg', is_starter: true, position: 'GK', jersey_number: 1 }
  ],

  highlights: [
    {
      id: 'h-1',
      match_id: 'm-101',
      title: '불사조 FC vs 안암 타이거즈 1R 하이라이트',
      video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      thumbnail_url: null,
      duration_seconds: 184,
      description: '손흥민의 환상적인 멀티골과 불사조 FC의 화끈한 개막전 3-1 승리 명장면!'
    },
    {
      id: 'h-2',
      match_id: 'm-102',
      title: '블루 드래곤즈 vs 서해 샤크스 명승부 하이라이트',
      video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      thumbnail_url: null,
      duration_seconds: 215,
      description: '후반 종료 직전까지 이어진 팽팽한 혈투 끝에 2-2 무승부를 거둔 명경기!'
    },
    {
      id: 'h-3',
      match_id: 'm-103',
      title: '한라 울브스 vs 선더 이글스 결승골 장면',
      video_url: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
      thumbnail_url: null,
      duration_seconds: 142,
      description: '세트피스에서 터진 선더 이글스의 결승 헤더골 클립.'
    }
  ]
};

// Local storage storage key for admin updates in mock mode
const KFL_STORAGE_KEY = 'kfl_local_db_v1';

function getLocalStore() {
  const stored = localStorage.getItem(KFL_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to parse local storage, resetting to default mock data');
    }
  }
  const initial = JSON.parse(JSON.stringify(KFL_MOCK_DATA));
  localStorage.setItem(KFL_STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveLocalStore(data) {
  localStorage.setItem(KFL_STORAGE_KEY, JSON.stringify(data));
}
