-- First, remove any existing duplicate games
delete from public.games g
using public.games g2
where g.game_date = g2.game_date
  and g.home_team_id = g2.home_team_id
  and g.away_team_id = g2.away_team_id
  and g.id > g2.id;

-- Add unique constraint to prevent duplicate games
alter table public.games
add constraint games_unique_matchup_time
unique (game_date, home_team_id, away_team_id);
