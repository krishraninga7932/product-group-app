CREATE TABLE "group_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"product_id" text NOT NULL,
	"product_name" text NOT NULL,
	"product_image" text,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "product_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now()
);
