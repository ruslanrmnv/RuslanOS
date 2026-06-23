import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";

/** Focus areas the cockpit cares about. */
export type Focus = "Clients" | "Slotly" | "Content" | "Stability";

/** Answers collected during /morning. */
export interface MorningAnswers {
  sleep: number;
  energy: number;
  anxiety: number;
  workHours: number;
  focus: Focus;
  constraint: string;
}

/** A generated day plan. */
export interface DayPlan {
  date: string; // YYYY-MM-DD
  mode: "low" | "light" | "normal" | "high";
  focus: Focus;
  requiredTasks: string[]; // money/clients first, must-do
  optionalTasks: string[]; // SaaS / content / extra, only if room
  minimumPlan: string;
  firstAction: string;
  note?: string;
}

/** Answers collected during /evening. */
export interface EveningAnswers {
  messages: number;
  replies: number;
  calls: number;
  offers: number;
  deals: number;
  revenue: number;
  blocker: string;
  lesson: string;
}

/** A saved evening review (persisted to disk). */
export interface EveningReview {
  id: string;
  date: string; // YYYY-MM-DD
  messagesSent: number;
  replies: number;
  callsBooked: number;
  offersSent: number;
  deals: number;
  revenue: number;
  mainBlocker: string;
  oneLesson: string;
  summary: string;
  tomorrowFirstAction: string;
  createdAt: string;
}

/** A lead in the lightweight CRM. */
export interface Lead {
  id: string;
  business: string;
  niche: string;
  contact: string;
  status: string;
  nextAction: string;
  priority: string;
  createdAt: string;
}

/** Shape persisted to disk. */
export interface Database {
  plans: Record<string, DayPlan>; // key: `${userId}:${date}`
  leads: Record<string, Lead[]>; // key: userId
  reviews: Record<string, EveningReview[]>; // key: userId
}

/** Per-chat session (currently empty, reserved for v2). */
export interface SessionData {}

export type MyContext = Context &
  SessionFlavor<SessionData> &
  ConversationFlavor;
