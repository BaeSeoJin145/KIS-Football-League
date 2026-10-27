// ============================================
// KFL Configuration
// ============================================
// Replace these values with your actual Supabase project credentials.
// The anon key is safe to expose in frontend code - it only allows
// operations permitted by your RLS policies.

const KFL_CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://muqllvxwvcawoszzymbo.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_kLMhrFxngQu_lyqi10tsfw_bxhI_nU7',

  // App
  APP_NAME: 'KFL',
  APP_FULL_NAME: 'KIS Football League',
  CURRENT_SEASON: '2026',

  // UI
  DEFAULT_LOCALE: 'ko-KR',
  DEFAULT_TIMEZONE: 'Asia/Seoul',
  TOAST_DURATION: 4000,
  
  // Match statuses
  MATCH_STATUS: {
    SCHEDULED: 'scheduled',
    LIVE: 'live',
    HALFTIME: 'halftime',
    FINISHED: 'finished',
    POSTPONED: 'postponed',
    CANCELLED: 'cancelled'
  },

  MATCH_STATUS_LABELS: {
    scheduled: '예정',
    live: '진행 중',
    halftime: '하프타임',
    finished: '종료',
    postponed: '연기',
    cancelled: '취소'
  },

  // Event types
  EVENT_TYPES: {
    GOAL: 'goal',
    OWN_GOAL: 'own_goal',
    ASSIST: 'assist',
    YELLOW_CARD: 'yellow_card',
    RED_CARD: 'red_card',
    SUB_IN: 'substitution_in',
    SUB_OUT: 'substitution_out'
  },

  EVENT_TYPE_LABELS: {
    goal: '득점 (골)',
    own_goal: '자책골',
    assist: '도움',
    yellow_card: '경고',
    red_card: '퇴장',
    substitution_in: '교체 투입',
    substitution_out: '교체 아웃'
  },

  POSITION_LABELS: {
    GK: '골키퍼',
    DF: '수비수',
    MF: '미드필더',
    FW: '공격수'
  },

  // Google Drive Gallery
  GOOGLE_DRIVE_GALLERY: {
    // 고정된 Google Apps Script 배포 URL 및 KFL-Gallery 공유 링크
    WEBAPP_URL: 'https://script.google.com/macros/s/AKfycbyuXGqgHwcSCpLgNPuS8BUZZ9tWRXNVqtCzk22SEL3SY7ohnWBjqGi4kFKznulMP0g3ZA/exec',
    ROOT_FOLDER_URL: 'https://drive.google.com/drive/folders/12IuF-6r1qyvOZSxWcI7E-i_IKZAQTCyY?usp=sharing',
    // 캐시 시간 (분)
    CACHE_EXPIRY_MINUTES: 10
  }
};

// Freeze config to prevent accidental modification
Object.freeze(KFL_CONFIG);
Object.freeze(KFL_CONFIG.MATCH_STATUS);
Object.freeze(KFL_CONFIG.MATCH_STATUS_LABELS);
Object.freeze(KFL_CONFIG.EVENT_TYPES);
Object.freeze(KFL_CONFIG.EVENT_TYPE_LABELS);
Object.freeze(KFL_CONFIG.POSITION_LABELS);
Object.freeze(KFL_CONFIG.GOOGLE_DRIVE_GALLERY);
