-- Update any existing 'competition' skill levels to 'advanced'
update profiles set skill_level = 'advanced' where skill_level = 'competition';

-- Update programs too
update programs set skill_level = 'advanced' where skill_level = 'competition';
