import { Keyboard } from "grammy";
import type { Conversation } from "@grammyjs/conversations";
import type { MyContext } from "../types";

/** Build a one-time, resized reply keyboard from rows of button labels. */
export function buildKeyboard(rows: string[][]): Keyboard {
  const kb = new Keyboard();
  rows.forEach((row, i) => {
    if (i > 0) kb.row();
    row.forEach((label) => kb.text(label));
  });
  return kb.resized().oneTime();
}

/**
 * Ask a free-text question and wait for the next text reply.
 * Sends `remove_keyboard` so any reply keyboard left over from a previous
 * choice question is cleared and the user can type freely.
 */
export async function ask(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  question: string
): Promise<string> {
  await ctx.reply(question, { reply_markup: { remove_keyboard: true } });
  const reply = await conversation.waitFor("message:text");
  return reply.message.text.trim();
}

/**
 * Ask a question with a reply keyboard of choices and return the chosen text.
 * Buttons are one-time + resized (the client hides them after a tap); the user
 * can still type a custom answer instead of tapping. The keyboard is cleared
 * automatically by the next free-text prompt (`ask`) or replaced by the next
 * choice/number keyboard.
 */
export async function askChoice(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  question: string,
  choices: string[][]
): Promise<string> {
  await ctx.reply(question, { reply_markup: buildKeyboard(choices) });
  const reply = await conversation.waitFor("message:text");
  return reply.message.text.trim();
}

/** Ask for a number, re-prompting until a valid one is given. */
export async function askNumber(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  question: string,
  opts: { min?: number; max?: number } = {}
): Promise<number> {
  while (true) {
    const raw = await ask(conversation, ctx, question);
    const n = Number(raw.replace(",", "."));
    if (!Number.isNaN(n) && (opts.min === undefined || n >= opts.min) && (opts.max === undefined || n <= opts.max)) {
      return n;
    }
    const range =
      opts.min !== undefined && opts.max !== undefined
        ? ` (${opts.min}–${opts.max})`
        : "";
    await ctx.reply(`Пожалуйста, отправь число${range}.`);
  }
}

/**
 * Ask for a number with a reply keyboard of common values. Manual typing still
 * works — invalid input re-prompts with the same keyboard.
 */
export async function askNumberWithKeyboard(
  conversation: Conversation<MyContext>,
  ctx: MyContext,
  question: string,
  choices: string[][],
  opts: { min?: number; max?: number } = {}
): Promise<number> {
  const range =
    opts.min !== undefined && opts.max !== undefined
      ? ` (${opts.min}–${opts.max})`
      : "";
  let first = true;
  while (true) {
    const prompt = first ? question : `Пожалуйста, отправь число${range}.`;
    first = false;
    await ctx.reply(prompt, { reply_markup: buildKeyboard(choices) });
    const reply = await conversation.waitFor("message:text");
    const n = Number(reply.message.text.trim().replace(",", "."));
    if (!Number.isNaN(n) && (opts.min === undefined || n >= opts.min) && (opts.max === undefined || n <= opts.max)) {
      return n;
    }
  }
}
