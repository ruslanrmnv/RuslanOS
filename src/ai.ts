import { config, aiMode } from "./config";
import type { DayPlan, EveningAnswers, MorningAnswers } from "./types";
import { buildPlan } from "./data/planner";

/**
 * Thin AI layer. If a key is present it asks the model; otherwise (or on any
 * error) it falls back to deterministic rules so the bot always works.
 */

const PLANNER_RULES = `You are Ruslan OS, a calm AI CEO assistant focused on money & clients.
Rules:
- Main goal: clients and money first.
- Never overload. Quality over quantity.
- If energy <= 4 or anxiety >= 7: LIGHT plan, max 3 tasks total, reassuring tone.
- Medium energy: 3 money/client tasks + 1 Slotly/SaaS task + 1 content task.
- High energy (>=8) and low anxiety: add 1 extra outreach task.
- Every task must fall into one of: (1) brings a client, (2) improves the demo,
  (3) improves Slotly, (4) supports stability.
- Always include a "minimum plan" for a bad day and ONE concrete first action.`;

async function callAnthropic(prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data?.content?.[0]?.text ?? "";
}

async function callOpenAI(prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openaiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function ask(prompt: string): Promise<string> {
  const mode = aiMode();
  if (mode === "anthropic") return callAnthropic(prompt);
  if (mode === "openai") return callOpenAI(prompt);
  throw new Error("no-ai");
}

/**
 * Build a day plan. Uses the deterministic planner for the reliable structure,
 * and (if AI is available) asks the model for one short motivating line.
 */
export async function generatePlan(
  a: MorningAnswers,
  date: string
): Promise<DayPlan> {
  const plan = buildPlan(a, date);
  if (aiMode() === "fallback") return plan;

  try {
    const prompt = `${PLANNER_RULES}

Today's check-in: sleep ${a.sleep}/10, energy ${a.energy}/10, anxiety ${a.anxiety}/10, work hours ${a.workHours}, focus ${a.focus}, constraint: ${a.constraint || "none"}.

Write ONE short encouraging sentence in RUSSIAN (max 20 words) to add to the plan. No emojis, no preamble — just the sentence in Russian.`;
    const line = (await ask(prompt)).trim();
    if (line) plan.note = line.replace(/^["']|["']$/g, "");
  } catch {
    // keep deterministic note
  }
  return plan;
}

/** Evening review summary. Falls back to a rule-based summary on any error. */
export async function generateReview(a: EveningAnswers): Promise<string> {
  if (aiMode() !== "fallback") {
    try {
      const prompt = `You are Ruslan OS, a calm AI CEO assistant focused on money & clients.
Here are today's numbers: messages sent ${a.messages}, replies ${a.replies}, calls booked ${a.calls}, offers sent ${a.offers}, deals ${a.deals}, revenue ${a.revenue}. Main blocker: ${a.blocker || "none"}. Lesson: ${a.lesson || "none"}.

Reply in RUSSIAN, in this exact format, short and direct (keep the Russian labels exactly):
✅ Что сработало: <1 строка>
🔧 Улучшить завтра: <1 строка>
▶️ Первая задача завтра: <1 строка>`;
      const out = (await ask(prompt)).trim();
      if (out) return out;
    } catch {
      // fall through to rule-based
    }
  }
  return ruleReview(a);
}

function ruleReview(a: EveningAnswers): string {
  const worked =
    a.deals > 0
      ? `Ты закрыл ${a.deals} сделок(и) — импульс реальный.`
      : a.calls > 0
        ? `Ты назначил ${a.calls} звонок(ов). Пайплайн движется.`
        : a.replies > 0
          ? `Ты получил ${a.replies} ответ(ов). Люди слушают.`
          : `Ты пришёл и отправил ${a.messages} сообщений(я). Это и есть двигатель.`;

  const improve =
    a.messages < 10
      ? "Завтра отправь больше первых сообщений — объём приносит клиентов."
      : a.replies > 0 && a.offers === 0
        ? "Превращай ответы в офферы — предлагай звонок раньше."
        : a.offers > 0 && a.deals === 0
          ? "Делай follow-up по отправленным офферам быстрее, пока не остыли."
          : "Сохраняй тот же ритм outreach и подтягивай follow-up.";

  const first =
    a.replies > 0
      ? "Ответь во всех открытых переписках и предложи звонок."
      : "Отправь 10 свежих outreach-сообщений, прежде чем браться за остальное.";

  return `✅ Что сработало: ${worked}\n🔧 Улучшить завтра: ${improve}\n▶️ Первая задача завтра: ${first}${
    a.blocker ? `\n\n_Блокер, который нужно убрать: ${a.blocker}_` : ""
  }`;
}
