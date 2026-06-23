import * as dotenv from "dotenv";

dotenv.config();

/** Parse ALLOWED_TELEGRAM_USER_ID. Empty/invalid -> undefined (allow all in dev). */
function parseAllowedUserId(): number | undefined {
  const raw = (process.env.ALLOWED_TELEGRAM_USER_ID ?? "").trim();
  if (!raw) return undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  allowedUserId: parseAllowedUserId(),
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiKey: process.env.OPENAI_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-opus-4-8",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
};

export function assertConfig(): void {
  if (!config.telegramToken) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is missing. Copy .env.example to .env and fill it in."
    );
  }
}

/** Which AI mode is active. */
export function aiMode(): "anthropic" | "openai" | "fallback" {
  if (config.anthropicKey) return "anthropic";
  if (config.openaiKey) return "openai";
  return "fallback";
}
