import type { Conversation } from "@grammyjs/conversations";
import type { MyContext } from "../types";
import { askChoice, buildKeyboard } from "./helpers";
import {
  pricingIntro,
  pricingMenuKeyboard,
  pricingNavKeyboard,
  pricingSections,
  pricingFooter,
  pricingUnknown,
  mainMenuText,
  resolvePricingKey,
  resolveNav,
  type PricingSectionKey,
} from "../data/pricing";

/** Показать главное меню Ruslan OS и убрать price-клавиатуру. */
async function sendMainMenu(ctx: MyContext): Promise<void> {
  await ctx.reply(mainMenuText, {
    parse_mode: "Markdown",
    reply_markup: { remove_keyboard: true },
  });
}

/** Отправить раздел прайса вместе с навигационной клавиатурой. */
async function sendSection(ctx: MyContext, key: PricingSectionKey): Promise<void> {
  await ctx.reply(`${pricingSections[key]}\n\n${pricingFooter}`, {
    parse_mode: "Markdown",
    reply_markup: buildKeyboard(pricingNavKeyboard),
  });
}

/**
 * Интерактивный /price с навигацией.
 *
 * Меню разделов → выбранный раздел → кнопки «Назад к прайсу» / «Главное меню».
 * Поддерживает кнопки и ручной ввод; не оставляет пользователя в тупике.
 */
export async function priceConversation(
  conversation: Conversation<MyContext>,
  ctx: MyContext
): Promise<void> {
  // Внешний цикл — экран меню разделов.
  while (true) {
    const choice = await askChoice(conversation, ctx, pricingIntro, pricingMenuKeyboard);

    const nav = resolveNav(choice);
    if (nav === "menu") {
      await sendMainMenu(ctx);
      return;
    }
    if (nav === "back") {
      // На экране меню «назад» — просто остаёмся в меню.
      continue;
    }

    const key = resolvePricingKey(choice);
    if (!key) {
      // Не поняли — подсказка, затем меню покажется снова (следующая итерация).
      await ctx.reply(pricingUnknown);
      continue;
    }

    // Внутренний цикл — показанный раздел и навигация по нему.
    await sendSection(ctx, key);
    let inSection = true;
    while (inSection) {
      const reply = await conversation.waitFor("message:text");
      const input = reply.message.text.trim();

      const subNav = resolveNav(input);
      if (subNav === "menu") {
        await sendMainMenu(ctx);
        return;
      }
      if (subNav === "back") {
        // Вернуться к меню разделов (внешний цикл).
        inSection = false;
        break;
      }

      const nextKey = resolvePricingKey(input);
      if (nextKey) {
        // Пользователь сразу выбрал другой раздел — покажем его.
        await sendSection(ctx, nextKey);
        continue;
      }

      // Непонятный ввод внутри раздела — подсказка, клавиатуру не теряем.
      await ctx.reply(
        "Не понял. Нажми «⬅️ Назад к прайсу» или «🏠 Главное меню».",
        { reply_markup: buildKeyboard(pricingNavKeyboard) }
      );
    }
  }
}
