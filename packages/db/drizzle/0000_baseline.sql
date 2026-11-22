CREATE TABLE "health_probe" (
	"id" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"subject" text NOT NULL,
	"bucket" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "rate_limits_subject_bucket_window_start_pk" PRIMARY KEY("subject","bucket","window_start")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"country" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"verified_at" timestamp with time zone,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('user', 'admin'))
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"purpose" text NOT NULL,
	"visibility" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text NOT NULL,
	"impersonator_id" text,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gym_profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"sex" text NOT NULL,
	"age" integer NOT NULL,
	"height_cm" real NOT NULL,
	"weight_kg" real NOT NULL,
	"waist_cm" real NOT NULL,
	"hip_cm" real,
	"sport_level" text NOT NULL,
	"goal" text NOT NULL,
	"sessions_per_week" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gym_profiles_sex_check" CHECK ("gym_profiles"."sex" in ('female', 'male', 'other')),
	CONSTRAINT "gym_profiles_age_check" CHECK ("gym_profiles"."age" between 13 and 120),
	CONSTRAINT "gym_profiles_height_check" CHECK ("gym_profiles"."height_cm" between 80 and 250),
	CONSTRAINT "gym_profiles_weight_check" CHECK ("gym_profiles"."weight_kg" between 20 and 500),
	CONSTRAINT "gym_profiles_waist_check" CHECK ("gym_profiles"."waist_cm" between 40 and 300),
	CONSTRAINT "gym_profiles_hip_check" CHECK ("gym_profiles"."hip_cm" is null or "gym_profiles"."hip_cm" between 40 and 300),
	CONSTRAINT "gym_profiles_level_check" CHECK ("gym_profiles"."sport_level" in ('beginner', 'intermediate', 'advanced')),
	CONSTRAINT "gym_profiles_goal_check" CHECK ("gym_profiles"."goal" in ('muscle_gain', 'fat_loss', 'weight_loss', 'maintenance', 'body_recomposition')),
	CONSTRAINT "gym_profiles_sessions_check" CHECK ("gym_profiles"."sessions_per_week" between 1 and 7)
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"preparation_state" text NOT NULL,
	"calories_per_100g" real NOT NULL,
	"protein_per_100g" real NOT NULL,
	"carbs_per_100g" real NOT NULL,
	"fat_per_100g" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"slot" text NOT NULL,
	"food_id" uuid NOT NULL,
	"weight_g" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gym_profiles" ADD CONSTRAINT "gym_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_entries" ADD CONSTRAINT "meal_entries_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "files_user_id_idx" ON "files" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "files_key_idx" ON "files" USING btree ("key");--> statement-breakpoint
CREATE INDEX "files_pending_idx" ON "files" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "foods_user_id_idx" ON "foods" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meal_entries_user_date_idx" ON "meal_entries" USING btree ("user_id","date");--> statement-breakpoint
INSERT INTO "foods" ("id", "user_id", "name", "preparation_state", "calories_per_100g", "protein_per_100g", "carbs_per_100g", "fat_per_100g") VALUES
  ('00000001-0000-4000-8000-000000000001', NULL, 'Chicken breast', 'cooked', 165, 31, 0, 3.6),
  ('00000001-0000-4000-8000-000000000002', NULL, 'White rice', 'cooked', 130, 2.7, 28, 0.3),
  ('00000001-0000-4000-8000-000000000003', NULL, 'Whole egg', 'raw', 143, 12.6, 0.7, 9.5),
  ('00000001-0000-4000-8000-000000000004', NULL, 'Tuna in water', 'drained', 116, 25.5, 0, 1.0),
  ('00000001-0000-4000-8000-000000000005', NULL, 'Salmon fillet', 'cooked', 208, 20, 0, 13),
  ('00000001-0000-4000-8000-000000000006', NULL, 'Oats', 'raw', 389, 17, 66, 7),
  ('00000001-0000-4000-8000-000000000007', NULL, 'Cottage cheese', 'raw', 98, 11, 3.4, 4.3),
  ('00000001-0000-4000-8000-000000000008', NULL, 'Greek yoghurt', 'raw', 59, 10, 3.6, 0.4),
  ('00000001-0000-4000-8000-000000000009', NULL, 'Sweet potato', 'cooked', 86, 1.6, 20, 0.1),
  ('00000001-0000-4000-8000-000000000010', NULL, 'Broccoli', 'cooked', 35, 2.4, 7.2, 0.4),
  ('00000001-0000-4000-8000-000000000011', NULL, 'Olive oil', 'raw', 884, 0, 0, 100),
  ('00000001-0000-4000-8000-000000000012', NULL, 'Almonds', 'raw', 579, 21, 22, 50),
  ('00000001-0000-4000-8000-000000000013', NULL, 'Banana', 'raw', 89, 1.1, 23, 0.3),
  ('00000001-0000-4000-8000-000000000014', NULL, 'Beef mince (lean)', 'cooked', 215, 26, 0, 12),
  ('00000001-0000-4000-8000-000000000015', NULL, 'Pasta', 'cooked', 158, 5.8, 31, 0.9);
