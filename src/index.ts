import { assertConfig } from "./config";
import { initStorage } from "./storage";
import { createBot } from "./bot";

async function main(): Promise<void> {
  assertConfig();

  // Validate storage before going live. Throws clearly on a corrupt db.json
  // (and saves a corrupt-copy aside) instead of silently losing data.
  initStorage();

  const bot = createBot();

  // Register the command menu shown in Telegram's UI.
  await bot.api.setMyCommands([
    { command: "start", description: "Запустить Ruslan OS" },
    { command: "help", description: "Показать панель команд" },
    { command: "morning", description: "Утренний план" },
    { command: "today", description: "План и статус на сегодня" },
    { command: "evening", description: "Вечерний отчёт" },
    { command: "lead", description: "Добавить лида" },
    { command: "script", description: "Скрипт для outreach" },
    { command: "price", description: "Прайс и оффер" },
    { command: "cancel", description: "Отменить текущий сценарий" },
  ]);

  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());

  await bot.start({
    onStart: (info) => console.log(`@${info.username} is running.`),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
