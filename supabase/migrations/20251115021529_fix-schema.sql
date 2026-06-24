create table "public"."admin_users" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "email" text not null,
    "role" text not null,
    "display_name" text,
    "invited_by" uuid,
    "invite_accepted_at" timestamp with time zone,
    "last_sign_in_at" timestamp with time zone,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
);


alter table "public"."admin_users" enable row level security;

create table "public"."system_settings" (
    "id" uuid not null default gen_random_uuid(),
    "key" text not null,
    "value" text not null,
    "description" text,
    "updated_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."system_settings" enable row level security;

alter table "public"."orders" add column "seller_payout_amount" numeric(10,2);

alter table "public"."orders" add column "selling_fee_amount" numeric(10,2) default 0;

alter table "public"."orders" add column "selling_fee_percentage" numeric(5,2) default 0;

CREATE UNIQUE INDEX admin_users_email_key ON public.admin_users USING btree (email);

CREATE UNIQUE INDEX admin_users_pkey ON public.admin_users USING btree (id);

CREATE INDEX idx_admin_users_email ON public.admin_users USING btree (email);

CREATE INDEX idx_admin_users_invited_by ON public.admin_users USING btree (invited_by);

CREATE INDEX idx_admin_users_is_active ON public.admin_users USING btree (is_active);

CREATE INDEX idx_admin_users_role ON public.admin_users USING btree (role);

CREATE INDEX idx_admin_users_user_id ON public.admin_users USING btree (user_id);

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (key);

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);

CREATE UNIQUE INDEX system_settings_pkey ON public.system_settings USING btree (id);

alter table "public"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY using index "admin_users_pkey";

alter table "public"."system_settings" add constraint "system_settings_pkey" PRIMARY KEY using index "system_settings_pkey";

alter table "public"."admin_users" add constraint "admin_users_email_key" UNIQUE using index "admin_users_email_key";

alter table "public"."admin_users" add constraint "admin_users_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES admin_users(id) ON DELETE SET NULL not valid;

alter table "public"."admin_users" validate constraint "admin_users_invited_by_fkey";

alter table "public"."admin_users" add constraint "admin_users_role_check" CHECK ((role = ANY (ARRAY['admin'::text, 'super_admin'::text]))) not valid;

alter table "public"."admin_users" validate constraint "admin_users_role_check";

alter table "public"."admin_users" add constraint "admin_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."admin_users" validate constraint "admin_users_user_id_fkey";

alter table "public"."system_settings" add constraint "system_settings_key_key" UNIQUE using index "system_settings_key_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.bootstrap_first_admin(p_user_id uuid, p_email text, p_display_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow if no admin exists
  IF public.has_any_admin() THEN
    RAISE EXCEPTION 'An admin already exists';
  END IF;

  INSERT INTO admin_users (
    user_id,
    email,
    role,
    display_name,
    invited_by,
    invite_accepted_at,
    is_active
  ) VALUES (
    p_user_id,
    p_email,
    'super_admin',
    p_display_name,
    NULL,
    NOW(),
    true
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.has_any_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE is_active = true);
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = p_user_id AND is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM admin_users 
    WHERE user_id = p_user_id 
    AND role = 'super_admin' 
    AND is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.link_admin_user(admin_user_id uuid, auth_user_id uuid, admin_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the email matches and user_id is null (pending invitation)
  UPDATE admin_users
  SET 
    user_id = auth_user_id,
    invite_accepted_at = COALESCE(
      (SELECT email_confirmed_at FROM auth.users WHERE id = auth_user_id),
      NOW()
    )
  WHERE 
    id = admin_user_id
    AND email = admin_email
    AND user_id IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_admin_users_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."admin_users" to "anon";

grant insert on table "public"."admin_users" to "anon";

grant references on table "public"."admin_users" to "anon";

grant select on table "public"."admin_users" to "anon";

grant trigger on table "public"."admin_users" to "anon";

grant truncate on table "public"."admin_users" to "anon";

grant update on table "public"."admin_users" to "anon";

grant delete on table "public"."admin_users" to "authenticated";

grant insert on table "public"."admin_users" to "authenticated";

grant references on table "public"."admin_users" to "authenticated";

grant select on table "public"."admin_users" to "authenticated";

grant trigger on table "public"."admin_users" to "authenticated";

grant truncate on table "public"."admin_users" to "authenticated";

grant update on table "public"."admin_users" to "authenticated";

grant delete on table "public"."admin_users" to "service_role";

grant insert on table "public"."admin_users" to "service_role";

grant references on table "public"."admin_users" to "service_role";

grant select on table "public"."admin_users" to "service_role";

grant trigger on table "public"."admin_users" to "service_role";

grant truncate on table "public"."admin_users" to "service_role";

grant update on table "public"."admin_users" to "service_role";

grant delete on table "public"."system_settings" to "anon";

grant insert on table "public"."system_settings" to "anon";

grant references on table "public"."system_settings" to "anon";

grant select on table "public"."system_settings" to "anon";

grant trigger on table "public"."system_settings" to "anon";

grant truncate on table "public"."system_settings" to "anon";

grant update on table "public"."system_settings" to "anon";

grant delete on table "public"."system_settings" to "authenticated";

grant insert on table "public"."system_settings" to "authenticated";

grant references on table "public"."system_settings" to "authenticated";

grant select on table "public"."system_settings" to "authenticated";

grant trigger on table "public"."system_settings" to "authenticated";

grant truncate on table "public"."system_settings" to "authenticated";

grant update on table "public"."system_settings" to "authenticated";

grant delete on table "public"."system_settings" to "service_role";

grant insert on table "public"."system_settings" to "service_role";

grant references on table "public"."system_settings" to "service_role";

grant select on table "public"."system_settings" to "service_role";

grant trigger on table "public"."system_settings" to "service_role";

grant truncate on table "public"."system_settings" to "service_role";

grant update on table "public"."system_settings" to "service_role";

create policy "Allow bootstrap first admin"
on "public"."admin_users"
as permissive
for insert
to authenticated
with check (((has_any_admin() = false) AND (role = 'super_admin'::text) AND (user_id = auth.uid())));


create policy "Allow public to check admin count"
on "public"."admin_users"
as permissive
for select
to public
using (true);


create policy "Allow super admins to insert admin users"
on "public"."admin_users"
as permissive
for insert
to authenticated
with check (is_super_admin(auth.uid()));


create policy "Allow super admins to update admin users"
on "public"."admin_users"
as permissive
for update
to authenticated
using ((is_super_admin(auth.uid()) AND (id <> ( SELECT admin_users_1.id
   FROM admin_users admin_users_1
  WHERE (admin_users_1.user_id = auth.uid())
 LIMIT 1))))
with check ((is_super_admin(auth.uid()) AND (id <> ( SELECT admin_users_1.id
   FROM admin_users admin_users_1
  WHERE (admin_users_1.user_id = auth.uid())
 LIMIT 1)) AND (NOT ((user_id = auth.uid()) AND (((role IS DISTINCT FROM ( SELECT admin_users_1.role
   FROM admin_users admin_users_1
  WHERE (admin_users_1.id = admin_users_1.id))) AND (role <> 'super_admin'::text)) OR (is_active = false))))));


create policy "Allow users to link their admin account"
on "public"."admin_users"
as permissive
for update
to authenticated
using ((user_id IS NULL))
with check ((user_id = auth.uid()));


create policy "Allow users to read own admin profile"
on "public"."admin_users"
as permissive
for select
to authenticated
using ((user_id = auth.uid()));


create policy "Super admins can read all admin users"
on "public"."admin_users"
as permissive
for select
to authenticated
using (is_super_admin(auth.uid()));


create policy "Admins can insert system settings"
on "public"."system_settings"
as permissive
for insert
to public
with check ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.is_active = true)))));


create policy "Admins can update system settings"
on "public"."system_settings"
as permissive
for update
to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.is_active = true)))));


create policy "Admins can view system settings"
on "public"."system_settings"
as permissive
for select
to public
using ((EXISTS ( SELECT 1
   FROM admin_users
  WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.is_active = true)))));


CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION update_admin_users_updated_at();


