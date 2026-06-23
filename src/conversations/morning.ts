import type { Conversation } from "@grammyjs/conversations";
import type { Focus, MorningAnswers, MyContext } from "../types";
import { ask, askChoice, askNumberWithKeyboard } from "./helpers";
import { generatePlan } from "../ai";
import { renderPlan } from "../data/planner";
import { savePlan, todayStr } from "../storage";

// Keyboards reused across the check-in.
const SCALE_1_10 = [
  ["1", "2", "3", "4", "5"],
  ["6", "7", "8", "9", "10"],
];
const WORK_HOURS = [
  ["1", "2", "3", "4"],
  ["5", "6", "7", "8"],
  ["10", "12"],
];
const FOCUS_CHOICES = [
  ["Клиенты", "Slotly"],
  ["Контент", "Стабильность"],
];
const CONSTRAINT_CHOICES = [["Нет", "Есть ограничение"]];

/** Map a button label or manual answer to a Focus. */
function parseFocus(raw: string): Focus {
  const v = raw.toLowerCase().trim();
  if (/^(slotly|слотли|slot)/.test(v)) return "Slotly";
  if (/^(content|контент|cont)/.test(v)) return "Content";
  if (/^(stability|стабильность|отдых|восстановление|stab)/.test(v)) return "Stability";
  // clients / client / клиенты / клиент / лиды → Clients (default)
  return "Clients";
}

/** Manual "no constraint" answers. */
function isNoConstraint(raw: string): boolean {
  return /^(no|нет|ничего|нету)$/i.test(raw.trim());
}

export async function morningConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
): Promise<void> {
  await ctx.reply("☀️ *Утренний чек-ин.* Ответь на пару быстрых вопросов.", {
    parse_mode: "Markdown",
  });

  const sleep = await askNumberWithKeyboard(conversation, ctx, "Сон 1–10?", SCALE_1_10, { min: 1, max: 10 });
  const energy = await askNumberWithKeyboard(conversation, ctx, "Энергия 1–10?", SCALE_1_10, { min: 1, max: 10 });
  const anxiety = await askNumberWithKeyboard(conversation, ctx, "Тревога 1–10?", SCALE_1_10, { min: 1, max: 10 });
  const workHours = await askNumberWithKeyboard(
    conversation,
    ctx,
    "Сколько часов можешь работать сегодня?",
    WORK_HOURS,
    { min: 0, max: 24 }
  );
  const focusRaw = await askChoice(conversation, ctx, "Главный фокус сегодня?", FOCUS_CHOICES);

  const constraintRaw = await askChoice(conversation, ctx, "Есть ограничение сегодня?", CONSTRAINT_CHOICES);
  let constraint = "";
  if (/^есть ограничение$/i.test(constraintRaw.trim())) {
    constraint = await ask(conversation, ctx, "Кратко напиши ограничение:");
  } else if (!isNoConstraint(constraintRaw)) {
    // Anything else typed manually is treated as the constraint itself.
    constraint = constraintRaw;
  }

  const answers: MorningAnswers = {
    sleep,
    energy,
    anxiety,
    workHours,
    focus: parseFocus(focusRaw),
    constraint,
  };

  await ctx.reply("Готовлю твой план…", { reply_markup: { remove_keyboard: true } });

  // Side effects (date, AI, storage) must run outside the replay engine.
  const date = await conversation.external(() => todayStr());
  const plan = await conversation.external(() => generatePlan(answers, date));
  const userId = ctx.from?.id;
  if (userId) {
    await conversation.external(() => savePlan(userId, plan));
  }

  await ctx.reply(renderPlan(plan), { parse_mode: "Markdown" });
  await ctx.reply("Команда /today покажет это снова. /evening — когда завершишь день.");
}
