CREATE TYPE "public"."designer_request_priority" AS ENUM('basse', 'normale', 'haute', 'urgente');--> statement-breakpoint
CREATE TYPE "public"."designer_request_status" AS ENUM('nouveau', 'en_cours', 'resolu');--> statement-breakpoint
CREATE TYPE "public"."designer_request_type" AS ENUM('demande', 'amelioration', 'probleme');--> statement-breakpoint
CREATE TABLE "designer_request_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designer_request_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"user_id" uuid,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "designer_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" "designer_request_type" NOT NULL,
	"priority" "designer_request_priority" DEFAULT 'normale' NOT NULL,
	"status" "designer_request_status" DEFAULT 'nouveau' NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"page_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "designer_request_attachments" ADD CONSTRAINT "designer_request_attachments_request_id_designer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."designer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designer_request_messages" ADD CONSTRAINT "designer_request_messages_request_id_designer_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."designer_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designer_request_messages" ADD CONSTRAINT "designer_request_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "designer_requests" ADD CONSTRAINT "designer_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "designer_requests_created_idx" ON "designer_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "designer_requests_status_idx" ON "designer_requests" USING btree ("status");