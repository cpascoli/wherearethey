-- Accounts, step 1 (docs/accounts.md, section 6). One statement per ";" at a line end: the runner splits there.
-- The first four tables are Better Auth's (1.7.27, email OTP plugin), as its generator printed them, plus two checks.

create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" boolean not null, "image" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null,
  constraint user_no_profile check ("name" = '' and "image" is null));

create table "session" ("id" text not null primary key, "expiresAt" timestamptz not null, "token" text not null unique, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade,
  constraint session_no_device check ("ipAddress" is null and "userAgent" is null));

create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" timestamptz, "refreshTokenExpiresAt" timestamptz, "scope" text, "password" text, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz not null);

create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" timestamptz not null, "createdAt" timestamptz default CURRENT_TIMESTAMP not null, "updatedAt" timestamptz default CURRENT_TIMESTAMP not null);

create index "session_userId_idx" on "session" ("userId");

create index "account_userId_idx" on "account" ("userId");

create index "verification_identifier_idx" on "verification" ("identifier");

create table subscription (
  user_id         text not null references "user"(id) on delete cascade,
  topic           text not null check (topic in ('pursue')),
  status          text not null check (status in ('on','off')),
  changed_at      timestamptz not null default now(),
  changed_by      text not null check (changed_by in ('member','email_link','owner')),
  primary key (user_id, topic)
);

create table consent_event (
  id              bigint generated always as identity primary key,
  user_id         text not null references "user"(id) on delete cascade,
  topic           text not null,
  granted         boolean not null,
  wording_version text not null,
  placement       text not null check (placement in ('pursue','file','latest','home','account','email','owner')),
  at              timestamptz not null default now()
);

create index consent_event_user_idx on consent_event (user_id);

create table mail_contact (
  user_id           text primary key references "user"(id) on delete cascade,
  resend_contact_id text unique,
  synced_at         timestamptz,
  suppressed_at     timestamptz,
  suppressed_reason text check (suppressed_reason in ('bounce','complaint','manual'))
);

create table contact_deletion (
  resend_contact_id text primary key,
  requested_at      timestamptz not null default now()
);

create table limit_counter (
  key             text not null,
  window_start    timestamptz not null,
  n               integer not null,
  primary key (key, window_start)
);

create table webhook_event (
  id              text primary key,
  received_at     timestamptz not null default now()
);
