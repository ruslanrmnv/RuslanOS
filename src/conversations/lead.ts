import type { Conversation } from "@grammyjs/conversations";
import type { Lead, MyContext } from "../types";
import { ask } from "./helpers";
import { addLead } from "../storage";

export async function leadConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
): Promise<void> {
  await ctx.reply("➕ *Добавить лида.*", { parse_mode: "Markdown" });

  const business = await ask(conversation, ctx, "Название бизнеса?");
  const niche = await ask(conversation, ctx, "Ниша? (салон, барбершоп, сервис…)");
  const contact = await ask(conversation, ctx, "Контакт / платформа? (IG, WhatsApp, телефон…)");
  const status = await ask(conversation, ctx, "Статус? (новый / написал / ответил / звонок / выигран / потерян)");
  const nextAction = await ask(conversation, ctx, "Следующее действие?");
  const priority = await ask(conversation, ctx, "Приоритет? (высокий / средний / низкий)");

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Не удалось определить твой аккаунт, лид не сохранён.");
    return;
  }

  const lead: Lead = {
    id: `${Date.now()}`,
    business,
    niche,
    contact,
    status,
    nextAction,
    priority,
    createdAt: await conversation.external(() => new Date().toISOString()),
  };

  await conversation.external(() => addLead(userId, lead));

  await ctx.reply(
    `✅ Лид сохранён:\n\n*${lead.business}* (${lead.niche})\nКонтакт: ${lead.contact}\nСтатус: ${lead.status}\nСледующее: ${lead.nextAction}\nПриоритет: ${lead.priority}`,
    { parse_mode: "Markdown" }
  );
}
