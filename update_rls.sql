ALTER POLICY "Users can view own subjects" ON public.user_subjects USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own subjects" ON public.user_subjects WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own subjects" ON public.user_subjects USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own subjects" ON public.user_subjects USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own schedule blocks" ON public.schedule_blocks USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own schedule blocks" ON public.schedule_blocks WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own schedule blocks" ON public.schedule_blocks USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own schedule blocks" ON public.schedule_blocks USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own topics" ON public.topics USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own topics" ON public.topics WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own topics" ON public.topics USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own topics" ON public.topics USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own notes" ON public.class_notes USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own notes" ON public.class_notes WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own notes" ON public.class_notes USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own notes" ON public.class_notes USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own gym sessions" ON public.gym_sessions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own gym sessions" ON public.gym_sessions WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own gym sessions" ON public.gym_sessions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own gym sessions" ON public.gym_sessions USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own strength history" ON public.strength_history USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own strength history" ON public.strength_history WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own strength history" ON public.strength_history USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own strength history" ON public.strength_history USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own habits" ON public.habits USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own habits" ON public.habits WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own habits" ON public.habits USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own habits" ON public.habits USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own habit logs" ON public.habit_logs USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own habit logs" ON public.habit_logs WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own habit logs" ON public.habit_logs USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own habit logs" ON public.habit_logs USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own daily logs" ON public.daily_logs USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own daily logs" ON public.daily_logs WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own daily logs" ON public.daily_logs USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own daily logs" ON public.daily_logs USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can view own ai suggestions" ON public.ai_suggestions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can insert own ai suggestions" ON public.ai_suggestions WITH CHECK ((select auth.uid()) = user_id);
ALTER POLICY "Users can update own ai suggestions" ON public.ai_suggestions USING ((select auth.uid()) = user_id);
ALTER POLICY "Users can delete own ai suggestions" ON public.ai_suggestions USING ((select auth.uid()) = user_id);
