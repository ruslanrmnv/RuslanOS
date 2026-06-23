import { Bot, session } from "grammy";
import { conversations, createConversation } from "@grammyjs/conversations";
import type { MyContext, SessionData } from "./types";
import { config, aiMode } from "./config";
import { morningConversation } from "./conversations/morning";
import { eveningConversation } from "./conversations/evening";
import { leadConversation } from "./conversations/lead";
import { priceConversation } from "./conversations/price";
import { renderPlan } from "./data/planner";
import { getPlan, getEveningReviews, todayStr } from "./storage";
import { outreachScript } from "./data/scripts";

const START_TEXT = `👋 *Ruslan OS v1 — твой AI-ассистент CEO.*

Помогаю держать фокус на деньгах, клиентах, Slotly и стабильности — прямо с телефона.

Быстрая панель команд:
• ☀️ /morning — утренний план
• 📅 /today — план и статус на сегодня
• 🌙 /evening — вечерний отчёт
• ➕ /lead — добавить лида
• 📨 /script — скрипт для outreach
• 💵 /price — прайс и оффер

Напиши /help, чтобы увидеть все команды.
Начни день с /morning.`;

const HELP_TEXT = `📋 *Панель команд Ruslan OS*

/morning — создать утренний план
/today — посмотреть план, задачи и сохранённые данные на сегодня
/evening — сохранить вечерний отчёт
/lead — добавить нового лида
/script — получить короткий скрипт для сообщения бизнесу
/price — посмотреть текущие пакеты и цены
/cancel — отменить текущий сценарий

Начни с /morning утром и закончи день через /evening.`;

export function createBot(): Bot<MyContext> {
  const bot = new Bot<MyContext>(config.telegramToken);

  // Access control. If ALLOWED_TELEGRAM_USER_ID is set, only that user may use
  // the bot; everyone else gets "Access denied." If it's empty, allow all (dev).
  bot.use(async (ctx, next) => {
    if (config.allowedUserId !== undefined && ctx.from?.id !== config.allowedUserId) {
      if (ctx.from) await ctx.reply("Доступ запрещён.");
      return;
    }
    await next();
  });

  bot.use(session<SessionData, MyContext>({ initial: () => ({}) }));
  bot.use(conversations());

  // Global escape hatches. These MUST be registered BEFORE the conversation
  // middlewares below, otherwise an active conversation swallows /start and
  // /cancel as an answer and the user stays stuck mid-flow. ctx.conversation
  // is already available here (installed by conversations() above).
  bot.command("start", async (ctx) => {
    await ctx.conversation.exit();
    await ctx.reply(START_TEXT, {
      parse_mode: "Markdown",
      reply_markup: { remove_keyboard: true },
    });
  });
  bot.command("cancel", async (ctx) => {
    await ctx.conversation.exit();
    await ctx.reply("Отменено. Текущий сценарий остановлен.", {
      reply_markup: { remove_keyboard: true },
    });
    await ctx.reply(HELP_TEXT, { parse_mode: "Markdown" });
  });

  bot.use(createConversation(morningConversation, "morningConversation"));
  bot.use(createConversation(eveningConversation, "eveningConversation"));
  bot.use(createConversation(leadConversation, "leadConversation"));
  bot.use(createConversation(priceConversation, "priceConversation"));

  bot.command("help", (ctx) => ctx.reply(HELP_TEXT, { parse_mode: "Markdown" }));

  bot.command("morning", (ctx) => ctx.conversation.enter("morningConversation"));
  bot.command("evening", (ctx) => ctx.conversation.enter("eveningConversation"));
  bot.command("lead", (ctx) => ctx.conversation.enter("leadConversation"));

  bot.command("script", (ctx) => ctx.reply(outreachScript, { parse_mode: "Markdown" }));
  bot.command("price", (ctx) => ctx.conversation.enter("priceConversation"));

  bot.command("today", (ctx) => {
    const userId = ctx.from?.id;
    const date = todayStr();
    const plan = userId ? getPlan(userId, date) : undefined;
    const review = userId
      ? getEveningReviews(userId).find((r) => r.date === date)
      : undefined;

    const parts: string[] = [];
    if (plan) {
      parts.push(renderPlan(plan));
    } else {
      parts.push(`📅 *Сегодня: ${date}*\n\nПлана пока нет. Запусти /morning, чтобы создать его.`);
    }
    if (review) {
      parts.push(
        `🌙 *Вечерний отчёт сохранён:*\n` +
          `Сообщений: ${review.messagesSent} · Ответов: ${review.replies} · Звонков: ${review.callsBooked}\n` +
          `Офферов: ${review.offersSent} · Сделок: ${review.deals} · Выручка: ${review.revenue}`
      );
    }
    return ctx.reply(parts.join("\n\n"), { parse_mode: "Markdown" });
  });

  bot.catch((err) => {
    console.error("Bot error:", err.error);
  });

  // Helpful message for non-command text outside a conversation.
  bot.on("message:text", (ctx) =>
    ctx.reply("Используй команду: /morning, /evening, /lead, /script, /price, /today. Или /help для списка.")
  );

  console.log(`Ruslan OS bot ready. AI mode: ${aiMode()}`);
  return bot;
}
