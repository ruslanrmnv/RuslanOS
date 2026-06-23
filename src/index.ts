import { createServer } from "node:http";
import { assertConfig } from "./config";
import { initStorage } from "./storage";
import { createBot } from "./bot";

async function main(): Promise<void> {
  assertConfig();

  const port = Number(process.env.PORT ?? 3000);

  createServer((_req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Ruslan OS bot is running");
  }).listen(port, () => {
    console.log(`Health check server listening on port ${port}`);
  });

  initStorage();

  const bot = createBot();

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