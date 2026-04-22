-- Enable Row Level Security for Crevo application tables.
--
-- Crevo's product API currently accesses Supabase from the backend with the
-- service-role key. The browser should not read or write these tables directly
-- through PostgREST, so this migration locks public direct access down while
-- preserving backend/service-role access.

DO $$
DECLARE
  table_name text;
  app_tables text[] := ARRAY[
    'assets',
    'chat_conversation_members',
    'chat_conversations',
    'chat_message_edits',
    'chat_message_tags',
    'chat_messages',
    'clients',
    'comments',
    'companies',
    'company_invite',
    'invite_otps',
    'note_tags',
    'notes',
    'notifications',
    'project_team_members',
    'projects',
    'subtasks',
    'task_tags',
    'task_team_member_assignees',
    'tasks',
    'team_members',
    'user_settings',
    'users'
  ];
BEGIN
  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

      -- Keep direct Supabase API access closed for browser roles by default.
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);

      -- Backend code uses the service role. This role bypasses RLS, but the
      -- explicit grant keeps privileges clear for direct SQL/PostgREST access.
      EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', table_name);
    END IF;
  END LOOP;
END $$;
