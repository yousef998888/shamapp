alter table "public"."cities" add column "country_ar" character varying not null;

alter table "public"."cities" add column "name_ar" character varying not null;

alter table "public"."pickup_locations" add column "address_ar" character varying not null;

alter table "public"."pickup_locations" add column "name_ar" character varying not null;

alter table "public"."pickup_locations" add column "special_instructions_ar" text;

alter table "public"."user_addresses" add column "address_line_1_ar" character varying(255);

alter table "public"."user_addresses" add column "address_line_2_ar" character varying(255);

alter table "public"."user_addresses" add column "city_ar" character varying(100);

alter table "public"."user_addresses" add column "country_ar" character varying(100);

alter table "public"."user_addresses" add column "title_ar" character varying(100);


