import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  text,
  integer,
} from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),

  shop: varchar("shop", { length: 255 })
    .notNull()
    .unique(),

  isOnline: boolean("is_online")
    .notNull()
    .default(false),

  scope: text("scope"),

  expiresAt: timestamp("expires_at"),

  accessToken: text("access_token")
    .notNull(),

  userId: integer("user_id"),

  refreshToken: text("refresh_token"),

  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),

  createdAt: timestamp("created_at")
    .defaultNow(),

  updatedAt: timestamp("updated_at")
    .defaultNow(),
});




// product group table
export const productGroups = pgTable("product_groups", {
  id: serial("id").primaryKey(),

  name: text("name")
    .notNull(),

  image: text("image"),

  status: text("status").notNull().default("active"),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow(),
})



// group product table
export const groupProducts = pgTable(
  "group_products",
  {

    id: serial("id").primaryKey(),

    groupId: integer("group_id")
      .notNull(),

    productId: text("product_id")
      .notNull(),

    productName: text("product_name")
      .notNull(),

    productImage: text("product_image"),

    optionValue: text("option_value").default(""),

    sortOrder: integer("sort_order")
      .default(0),

  }
);