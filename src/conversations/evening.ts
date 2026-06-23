import type { Conversation } from "@grammyjs/conversations";
import type { EveningAnswers, EveningReview, MyContext } from "../types";
import { ask, askNumber } from "./helpers";
import { generateReview } from "../ai";
import { saveEveningReview, todayStr } from "../storage";

/** Pull the "first task tomorrow" line out of the generated summary (RU or EN). */
function extractTomorrowFirstAction(summary: string): string {
  const match = summary.match(/(?:Первая задача завтра|First task tomorrow):\s*(.+)/i);
  return match ? match[1].trim() : "";
}

export async function eveningConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
): Promise<void> {
  await ctx.reply("🌙 *Вечерний отчёт.* Быстрые цифры за сегодня.", {
    parse_mode: "Markdown",
  });

  const messages = await askNumber(conversation, ctx, "Отправлено сообщений?", { min: 0 });
  const replies = await askNumber(conversation, ctx, "Ответов?", { min: 0 });
  const calls = await askNumber(conversation, ctx, "Назначено звонков?", { min: 0 });
  const offers = await askNumber(conversation, ctx, "Отправлено офферов?", { min: 0 });
  const deals = await askNumber(conversation, ctx, "Сделок?", { min: 0 });
  const revenue = await askNumber(conversation, ctx, "Выручка? (число, 0 если нет)", { min: 0 });
  const blocker = await ask(conversation, ctx, "Главный блокер сегодня? (напиши 'no', если нет)");
  const lesson = await ask(conversation, ctx, "Один урок за сегодня?");

  const answers: EveningAnswers = {
    messages,
    replies,
    calls,
    offers,
    deals,
    revenue,
    blocker: /^no?$/i.test(blocker) ? "" : blocker,
    lesson,
  };

  await ctx.reply("Анализирую твой день…");
  const summary = await conversation.external(() => generateReview(answers));
  await ctx.reply(summary, { parse_mode: "Markdown" });

  // Persist the report so it survives restarts. Side effects run via
  // conversation.external so they don't re-fire during replay.
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Не удалось определить твой аккаунт — отчёт не сохранён.");
    return;
  }

  const review: EveningReview = await conversation.external(() => {
    const now = new Date();
    return {
      id: `${now.getTime()}`,
      date: todayStr(now),
      messagesSent: answers.messages,
      replies: answers.replies,
      callsBooked: answers.calls,
      offersSent: answers.offers,
      deals: answers.deals,
      revenue: answers.revenue,
      mainBlocker: answers.blocker,
      oneLesson: answers.lesson,
      summary,
      tomorrowFirstAction: extractTomorrowFirstAction(summary),
      createdAt: now.toISOString(),
    };
  });

  await conversation.external(() => saveEveningReview(userId, review));
  await ctx.reply("✅ Вечерний отчёт сохранён. Посмотреть его можно через /today.");
}
