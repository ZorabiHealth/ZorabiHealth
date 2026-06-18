-- Allow paired mobile users to read a patient's medications and reminder logs.
-- Doctors and pharmacy users are still excluded unless they are explicitly paired.

drop policy if exists "Paired mobile can read medications" on medications;
create policy "Paired mobile can read medications"
  on medications for select
  using (
    exists (
      select 1
      from user_pairings
      where is_active = true
        and web_user_id = medications.user_id
        and mobile_user_id = auth.uid()
    )
  );

drop policy if exists "Paired mobile can read medication logs" on medication_logs;
create policy "Paired mobile can read medication logs"
  on medication_logs for select
  using (
    exists (
      select 1
      from medications m
      where m.id = medication_logs.medication_id
        and (
          m.user_id = auth.uid()
          or exists (
            select 1
            from user_pairings
            where is_active = true
              and web_user_id = m.user_id
              and mobile_user_id = auth.uid()
          )
        )
    )
  );
