import { pgTable, text, serial, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firebaseUid: text("firebase_uid"),
  createdAt: text("created_at").notNull()
});

// Devices table
export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deviceId: text("device_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  location: text("location"),
  status: text("status").notNull(),
  lastSeen: text("last_seen")
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  status: text("status").notNull()
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  system: jsonb("system").notNull(),
  regional: jsonb("regional").notNull(),
  thresholds: jsonb("thresholds").notNull(),
  notifications: jsonb("notifications").notNull()
});

// FCM Tokens table for push notifications
export const fcmTokens = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  deviceInfo: text("device_info"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
  lastUsed: text("last_used")
});

// Water Levels table
export const waterLevels = pgTable("water_levels", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  level: integer("level").notNull(),
  timestamp: text("timestamp").notNull()
});

// Waste Bins table
export const wasteBins = pgTable("waste_bins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  deviceId: integer("device_id").notNull().references(() => devices.id),
  fullness: integer("fullness").notNull(),
  weight: integer("weight").notNull(),
  lastEmptied: text("last_emptied"),
  timestamp: text("timestamp").notNull()
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertDeviceSchema = createInsertSchema(devices).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export const insertWaterLevelSchema = createInsertSchema(waterLevels).omit({ id: true });
export const insertWasteBinSchema = createInsertSchema(wasteBins).omit({ id: true });
export const insertFcmTokenSchema = createInsertSchema(fcmTokens).omit({ id: true });

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertWaterLevel = z.infer<typeof insertWaterLevelSchema>;
export type InsertWasteBin = z.infer<typeof insertWasteBinSchema>;
export type InsertFcmToken = z.infer<typeof insertFcmTokenSchema>;

export type User = typeof users.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type WaterLevel = typeof waterLevels.$inferSelect;
export type WasteBin = typeof wasteBins.$inferSelect;
export type FcmToken = typeof fcmTokens.$inferSelect;
