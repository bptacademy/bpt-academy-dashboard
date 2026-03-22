-- Video comments: any authenticated user can read and post
create policy "Authenticated users can view comments"
  on video_comments for select
  using (auth.uid() is not null);

create policy "Authenticated users can post comments"
  on video_comments for insert
  with check (auth.uid() = author_id);

-- Video bookmarks: users manage their own
create policy "Users can view own bookmarks"
  on video_bookmarks for select
  using (auth.uid() = student_id);

create policy "Users can insert own bookmarks"
  on video_bookmarks for insert
  with check (auth.uid() = student_id);

create policy "Users can delete own bookmarks"
  on video_bookmarks for delete
  using (auth.uid() = student_id);
