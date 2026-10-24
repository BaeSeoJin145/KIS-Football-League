-- ============================================================
-- KFL (KIS Football League) Database Schema & Initial Migration
-- ============================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- 1. SEASONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 2. TEAMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  short_name VARCHAR(10) NOT NULL,
  logo_url TEXT,
  color VARCHAR(20) DEFAULT '#0101C8',
  secondary_color VARCHAR(20) DEFAULT '#02FCFF',
  coach VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 3. PLAYERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  number INTEGER NOT NULL,
  position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'DF', 'MF', 'FW')),
  avatar_url TEXT,
  bio TEXT,
  nationality VARCHAR(50) DEFAULT '대한민국',
  birthdate DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 4. MATCHES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  round INTEGER DEFAULT 1,
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  match_date TIMESTAMPTZ NOT NULL,
  venue VARCHAR(100) DEFAULT 'KIS 메인 스타디움',
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'halftime', 'finished', 'postponed', 'cancelled')),
  minute INTEGER DEFAULT 0,
  extra_time INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_teams_different CHECK (home_team_id <> away_team_id)
);

-- ------------------------------------------------------------
-- 5. MATCH EVENTS (Goals, Cards, Substitutions)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  assist_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('goal', 'own_goal', 'assist', 'yellow_card', 'red_card', 'substitution_in', 'substitution_out')),
  minute INTEGER NOT NULL,
  extra_minute INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 6. MATCH LINEUPS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_lineups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  is_starter BOOLEAN DEFAULT true,
  position VARCHAR(10) NOT NULL CHECK (position IN ('GK', 'DF', 'MF', 'FW')),
  jersey_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_match_player UNIQUE (match_id, player_id)
);

-- ------------------------------------------------------------
-- 7. MATCH HIGHLIGHTS (Videos & Media)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS match_highlights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------
-- 8. INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_matches_season ON matches(season_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_match_events_match ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_lineups_match ON match_lineups(match_id);

-- ------------------------------------------------------------
-- 9. AUTO-UPDATE updated_at FUNCTION & TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_seasons_updated_at ON seasons;
CREATE TRIGGER trigger_seasons_updated_at BEFORE UPDATE ON seasons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_teams_updated_at ON teams;
CREATE TRIGGER trigger_teams_updated_at BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_players_updated_at ON players;
CREATE TRIGGER trigger_players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_matches_updated_at ON matches;
CREATE TRIGGER trigger_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
-- Enable RLS on all tables
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_lineups ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_highlights ENABLE ROW LEVEL SECURITY;

-- Anonymous (Public) READ policies
CREATE POLICY "Allow public read seasons" ON seasons FOR SELECT USING (true);
CREATE POLICY "Allow public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public read players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Allow public read match_events" ON match_events FOR SELECT USING (true);
CREATE POLICY "Allow public read match_lineups" ON match_lineups FOR SELECT USING (true);
CREATE POLICY "Allow public read match_highlights" ON match_highlights FOR SELECT USING (true);

-- Authenticated (Admin) WRITE policies
CREATE POLICY "Allow authenticated insert seasons" ON seasons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update seasons" ON seasons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete seasons" ON seasons FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert teams" ON teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update teams" ON teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete teams" ON teams FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert players" ON players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update players" ON players FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete players" ON players FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert matches" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update matches" ON matches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete matches" ON matches FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert match_events" ON match_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update match_events" ON match_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete match_events" ON match_events FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert match_lineups" ON match_lineups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update match_lineups" ON match_lineups FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete match_lineups" ON match_lineups FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert match_highlights" ON match_highlights FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update match_highlights" ON match_highlights FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete match_highlights" ON match_highlights FOR DELETE TO authenticated USING (true);

-- Enable Realtime publication for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;

-- ------------------------------------------------------------
-- 11. SEED DATA (KFL 2026 Season Demo)
-- ------------------------------------------------------------
DO $$
DECLARE
  v_season_id UUID;
  v_team_phoenix UUID;
  v_team_dragons UUID;
  v_team_tigers UUID;
  v_team_sharks UUID;
  v_team_wolves UUID;
  v_team_eagles UUID;
  
  v_p1 UUID; v_p2 UUID; v_p3 UUID; v_p4 UUID;
  v_p5 UUID; v_p6 UUID; v_p7 UUID; v_p8 UUID;

  v_m_live UUID;
  v_m_fin1 UUID;
  v_m_fin2 UUID;
  v_m_sch1 UUID;
  v_m_sch2 UUID;
BEGIN
  -- Insert 2026 Season
  INSERT INTO seasons (name, year, is_active, start_date, end_date)
  VALUES ('KFL 2026 스프링 리그', 2026, true, '2026-03-01', '2026-06-30')
  RETURNING id INTO v_season_id;

  -- Insert Teams
  INSERT INTO teams (season_id, name, short_name, color, secondary_color, coach, description)
  VALUES (v_season_id, '불사조 FC', 'PHX', '#0101C8', '#02FCFF', '김철수 감독', '강력한 압박과 조직적인 수비의 명문 구단')
  RETURNING id INTO v_team_phoenix;

  INSERT INTO teams (season_id, name, short_name, color, secondary_color, coach, description)
  VALUES (v_season_id, '블루 드래곤즈', 'DRG', '#0984E3', '#74B9FF', '이영표 감독', '화려한 패스 앤 무브 축구를 구사하는 공격 명가')
  RETURNING id INTO v_team_dragons;

  INSERT INTO teams (season_id, name, short_name, color, secondary_color, coach, description)
  VALUES (v_season_id, '안암 타이거즈', 'TIG', '#D63031', '#FF7675', '박지성 감독', '투지와 스피드로 승부하는 전통의 강호')
  RETURNING id INTO v_team_tigers;

  INSERT INTO teams (season_id, name, short_name, color, secondary_color, coach, description)
  VALUES (v_season_id, '서해 샤크스', 'SHK', '#00CEC9', '#81ECEC', '최진철 감독', '철통 수비와 치명적인 역습 전술')
  RETURNING id INTO v_team_sharks;

  INSERT INTO teams (season_id, name, short_name, color, secondary_color, coach, description)
  VALUES (v_season_id, '한라 울브스', 'WLV', '#6C5CE7', '#A29BFE', '안정환 감독', '젊은 선수들의 패기와 스피드가 돋보이는 팀')
  RETURNING id INTO v_team_wolves;

  INSERT INTO teams (season_id, name, short_name, color, secondary_color, coach, description)
  VALUES (v_season_id, '선더 이글스', 'EGL', '#E17055', '#FAB1A0', '설기현 감독', '정교한 세트피스와 공중전의 최강자')
  RETURNING id INTO v_team_eagles;

  -- Insert Sample Players (Phoenix)
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_phoenix, '손흥민', 7, 'FW', '대한민국') RETURNING id INTO v_p1;
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_phoenix, '이강인', 10, 'MF', '대한민국') RETURNING id INTO v_p2;
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_phoenix, '김민재', 4, 'DF', '대한민국') RETURNING id INTO v_p3;
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_phoenix, '조현우', 1, 'GK', '대한민국') RETURNING id INTO v_p4;

  -- Insert Sample Players (Dragons)
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_dragons, '황희찬', 11, 'FW', '대한민국') RETURNING id INTO v_p5;
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_dragons, '황인범', 6, 'MF', '대한민국') RETURNING id INTO v_p6;
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_dragons, '설영우', 22, 'DF', '대한민국') RETURNING id INTO v_p7;
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_dragons, '송범근', 1, 'GK', '대한민국') RETURNING id INTO v_p8;

  -- Tigers Players
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_tigers, '조규성', 9, 'FW', '대한민국');
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_tigers, '백승호', 8, 'MF', '대한민국');
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_tigers, '정승현', 15, 'DF', '대한민국');
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_tigers, '김승규', 21, 'GK', '대한민국');

  -- Sharks Players
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_sharks, '오현규', 18, 'FW', '대한민국');
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_sharks, '이재성', 7, 'MF', '대한민국');

  -- Wolves Players
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_wolves, '정우영', 17, 'FW', '대한민국');
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_wolves, '홍현석', 14, 'MF', '대한민국');

  -- Eagles Players
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_eagles, '배준호', 20, 'MF', '대한민국');
  INSERT INTO players (team_id, name, number, position, nationality)
  VALUES (v_team_eagles, '양현준', 19, 'FW', '대한민국');

  -- Insert Finished Matches (Round 1)
  INSERT INTO matches (season_id, round, home_team_id, away_team_id, home_score, away_score, match_date, status, venue)
  VALUES (v_season_id, 1, v_team_phoenix, v_team_tigers, 3, 1, NOW() - INTERVAL '5 days', 'finished', 'KIS 메인 스타디움')
  RETURNING id INTO v_m_fin1;

  INSERT INTO matches (season_id, round, home_team_id, away_team_id, home_score, away_score, match_date, status, venue)
  VALUES (v_season_id, 1, v_team_dragons, v_team_sharks, 2, 2, NOW() - INTERVAL '4 days', 'finished', 'KIS 제2 경기장')
  RETURNING id INTO v_m_fin2;

  INSERT INTO matches (season_id, round, home_team_id, away_team_id, home_score, away_score, match_date, status, venue)
  VALUES (v_season_id, 1, v_team_wolves, v_team_eagles, 0, 1, NOW() - INTERVAL '4 days', 'finished', 'KIS 풋살 돔');

  -- Insert Live Match (Round 2)
  INSERT INTO matches (season_id, round, home_team_id, away_team_id, home_score, away_score, match_date, status, minute, venue)
  VALUES (v_season_id, 2, v_team_phoenix, v_team_dragons, 2, 1, NOW() - INTERVAL '35 minutes', 'live', 67, 'KIS 메인 스타디움')
  RETURNING id INTO v_m_live;

  -- Insert Scheduled Matches (Round 2 & 3)
  INSERT INTO matches (season_id, round, home_team_id, away_team_id, match_date, status, venue)
  VALUES (v_season_id, 2, v_team_tigers, v_team_wolves, NOW() + INTERVAL '1 day', 'scheduled', 'KIS 제2 경기장')
  RETURNING id INTO v_m_sch1;

  INSERT INTO matches (season_id, round, home_team_id, away_team_id, match_date, status, venue)
  VALUES (v_season_id, 2, v_team_sharks, v_team_eagles, NOW() + INTERVAL '2 days', 'scheduled', 'KIS 풋살 돔')
  RETURNING id INTO v_m_sch2;

  -- Insert Events for Live Match
  INSERT INTO match_events (match_id, player_id, assist_player_id, type, minute, notes)
  VALUES (v_m_live, v_p1, v_p2, 'goal', 14, '정교한 스루패스를 받아 오른발 감아차기 득점');

  INSERT INTO match_events (match_id, player_id, assist_player_id, type, minute, notes)
  VALUES (v_m_live, v_p5, v_p6, 'goal', 38, '역습 상황에서 강력한 왼발 중거리 슛 골');

  INSERT INTO match_events (match_id, player_id, type, minute, notes)
  VALUES (v_m_live, v_p7, 'yellow_card', 42, '전술적 파울로 인한 경고');

  INSERT INTO match_events (match_id, player_id, assist_player_id, type, minute, notes)
  VALUES (v_m_live, v_p2, v_p1, 'goal', 59, '박스 안 절묘한 드리블 후 왼발 쐐기골');

  -- Insert Lineups for Live Match
  INSERT INTO match_lineups (match_id, player_id, team_id, is_starter, position, jersey_number)
  VALUES 
    (v_m_live, v_p1, v_team_phoenix, true, 'FW', 7),
    (v_m_live, v_p2, v_team_phoenix, true, 'MF', 10),
    (v_m_live, v_p3, v_team_phoenix, true, 'DF', 4),
    (v_m_live, v_p4, v_team_phoenix, true, 'GK', 1),
    (v_m_live, v_p5, v_team_dragons, true, 'FW', 11),
    (v_m_live, v_p6, v_team_dragons, true, 'MF', 6),
    (v_m_live, v_p7, v_team_dragons, true, 'DF', 22),
    (v_m_live, v_p8, v_team_dragons, true, 'GK', 1);

  -- Insert Highlights
  INSERT INTO match_highlights (match_id, title, video_url, duration_seconds, description)
  VALUES (
    v_m_fin1,
    '불사조 FC vs 안암 타이거즈 1R 명경기 하이라이트',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    184,
    '손흥민의 환상적인 멀티골과 불사조 FC의 화끈한 개막전 승리 장면을 감상하세요.'
  );

  INSERT INTO match_highlights (match_id, title, video_url, duration_seconds, description)
  VALUES (
    v_m_fin2,
    '블루 드래곤즈 vs 서해 샤크스 골 모음',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    215,
    '치열했던 난타전 끝에 2-2 무승부를 기록한 경기 주요 장면'
  );

END $$;
