-- Make skill_level nullable since Semi-Pro and Pro don't have sub-levels
alter table programs alter column skill_level drop not null;
