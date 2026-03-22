-- Conversations: members can view
create policy "Members can view conversations"
  on conversations for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = conversations.id
      and profile_id = auth.uid()
    )
  );

-- Anyone authenticated can create a conversation
create policy "Authenticated users can create conversations"
  on conversations for insert
  with check (auth.uid() is not null);

-- Conversation members: authenticated can insert/select
create policy "Authenticated can view conversation members"
  on conversation_members for select
  using (auth.uid() is not null);

create policy "Authenticated can join conversations"
  on conversation_members for insert
  with check (auth.uid() is not null);
