-- Sample badges available at launch. Extend as gamification design evolves.
insert into public.badges (code, title, description) values
  ('first_proof', 'First Proof', 'Submitted your first habit verification.'),
  ('week_streak', 'Week Warrior', 'Held a 7-day streak on any habit.'),
  ('month_streak', 'Iron Will', 'Held a 30-day streak on any habit.'),
  ('social_starter', 'Belay Partner', 'Added your first accountability friend.'),
  ('challenge_winner', 'Summit Club', 'Won a group challenge.')
on conflict (code) do nothing;
