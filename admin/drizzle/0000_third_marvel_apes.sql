CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop" varchar(255) NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"scope" text,
	"expires_at" timestamp,
	"access_token" text NOT NULL,
	"user_id" integer,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "sessions_shop_unique" UNIQUE("shop")
);
