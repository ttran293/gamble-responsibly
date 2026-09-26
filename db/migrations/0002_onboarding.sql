-- Stores the choices the account owner makes during first-run onboarding.
alter table user_profiles add column if not exists onboarding_answers jsonb;
