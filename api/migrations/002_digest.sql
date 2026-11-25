-- Step 1b (docs/accounts.md): the weekly digest as a second topic, and the drafts of what is sent to it.
-- One statement per ";" at a line end: the runner splits there.

alter table subscription drop constraint subscription_topic_check;

alter table subscription add constraint subscription_topic_check check (topic in ('pursue','digest'));

create table broadcast_draft (
  id                  bigint generated always as identity primary key,
  topic               text not null check (topic in ('digest')),
  subject             text not null,
  content             text not null,
  status              text not null check (status in ('draft','scheduled','sent')),
  version             integer not null default 1,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  scheduled_at        timestamptz,
  sent_at             timestamptz,
  resend_broadcast_id text unique
);
