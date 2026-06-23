import type { DayPlan, Focus, MorningAnswers } from "../types";

/**
 * Deterministic planner. Always available, no API key needed.
 *
 * It is adaptive on two axes:
 *  - Day capacity / mode (low / light / normal / high) from sleep, energy,
 *    anxiety and available work hours.
 *  - Focus (Clients / Slotly / Content / Stability).
 *
 * Hard rules:
 *  - Stability is never an aggressive day: it caps at "normal" and its tasks
 *    are soft (stabilise first, then a handful of calm messages).
 *  - "Extra outreach" is always OPTIONAL, never required.
 */

type Mode = DayPlan["mode"];

interface FocusPlan {
  required: string[];
  optional: string[];
  minimumPlan: string;
  firstAction: string;
}

/**
 * Decide the day mode. Order matters: low > light > high > normal.
 * Stability never reaches "high" (capped to "normal").
 */
function decideMode(a: MorningAnswers): Mode {
  let mode: Mode;
  if (a.energy <= 4 || a.anxiety >= 8 || a.workHours <= 2) {
    mode = "low";
  } else if (a.energy <= 5 || a.sleep <= 5 || a.workHours <= 4) {
    mode = "light";
  } else if (a.energy >= 8 && a.anxiety <= 5 && a.workHours >= 6) {
    mode = "high";
  } else {
    mode = "normal";
  }

  if (a.focus === "Stability" && mode === "high") {
    mode = "normal";
  }
  return mode;
}

function stabilityPlan(): FocusPlan {
  return {
    required: [
      "Стабилизация 10–20 минут: душ / прогулка / еда / порядок",
      "Отправь 3–5 спокойных outreach-сообщений",
      "Сделай 1 follow-up по самому тёплому лиду",
    ],
    optional: [
      "Ещё 5 сообщений, если стало легче",
      "1 маленькая доработка Slotly",
      "Подготовь 1 скрин / демо для будущего outreach",
    ],
    minimumPlan: "Стабилизироваться 10 минут + отправить 1 сообщение. Этого достаточно.",
    firstAction: "Сначала стабилизируй состояние на 10–20 минут, потом отправь первое сообщение.",
  };
}

function clientsPlan(mode: Mode): FocusPlan {
  // "Extra outreach" stays in optional only.
  const optional = [
    "Доп. outreach: ещё сообщения по новой нише, если есть силы",
    "1 небольшая доработка Slotly",
    "Опубликуй 1 короткий контент с результатом автоматизации",
  ];

  let required: string[];
  let minimumPlan: string;
  if (mode === "low" || mode === "light") {
    required = [
      "Отправь 5 спокойных outreach-сообщений",
      "Сделай 1 follow-up по тёплому лиду",
      "Подготовь 1 короткий оффер",
    ];
    minimumPlan = "Отправь 3 сообщения. Этого достаточно.";
  } else if (mode === "normal") {
    required = [
      "Отправь 10 outreach-сообщений",
      "Сделай 3 follow-up",
      "Отправь 1 оффер или попытайся назначить звонок",
    ];
    minimumPlan = "5 сообщений + 1 follow-up. Больше ничего не обязательно.";
  } else {
    required = [
      "Отправь 15–20 outreach-сообщений",
      "Follow-up по всем открытым диалогам",
      "Отправь 1 оффер или назначь звонок",
    ];
    minimumPlan = "5 сообщений + 1 follow-up. Больше ничего не обязательно.";
  }

  return {
    required,
    optional,
    minimumPlan,
    firstAction: "Отправь первое outreach-сообщение, прежде чем делать что-либо ещё.",
  };
}

function slotlyPlan(): FocusPlan {
  return {
    required: [
      "Сделай 1 конкретный фикс / улучшение Slotly",
      "После фикса отправь 5 outreach-сообщений",
      "Сделай 1 скрин или короткое описание демо",
    ],
    optional: [
      "Доп. outreach: ещё несколько сообщений, если есть силы",
      "1 follow-up по тёплому лиду",
      "Опубликуй 1 короткий контент про обновление",
    ],
    minimumPlan: "1 маленький фикс Slotly + 1 сообщение. Этого достаточно.",
    firstAction: "Сначала сделай 1 фикс в Slotly, потом отправь сообщения.",
  };
}

function contentPlan(): FocusPlan {
  return {
    required: [
      "Сделай 1 короткий пост / тред / сторис про автоматизацию или Slotly",
      "Отправь 5 outreach-сообщений",
      "Сделай 1 follow-up",
    ],
    optional: [
      "Доп. outreach: ещё несколько сообщений, если есть силы",
      "1 небольшая доработка Slotly",
    ],
    minimumPlan: "1 короткий пост + 1 сообщение. Этого достаточно.",
    firstAction: "Сначала опубликуй 1 короткий контент, потом возьмись за outreach.",
  };
}

function focusPlan(focus: Focus, mode: Mode): FocusPlan {
  switch (focus) {
    case "Stability":
      return stabilityPlan();
    case "Slotly":
      return slotlyPlan();
    case "Content":
      return contentPlan();
    case "Clients":
    default:
      return clientsPlan(mode);
  }
}

/** Trim optional tasks so low/light days don't feel overloaded. */
function trimOptional(optional: string[], mode: Mode): string[] {
  if (mode === "low") return optional.slice(0, 1);
  if (mode === "light") return optional.slice(0, 2);
  return optional;
}

export function buildPlan(a: MorningAnswers, date: string): DayPlan {
  const mode = decideMode(a);
  const fp = focusPlan(a.focus, mode);

  let note: string | undefined;
  if (mode === "low") {
    note = "Низкий ресурс. Главное — не сорваться: маленькие шаги тоже двигают клиентов.";
  } else if (mode === "light") {
    note = "Лёгкий день. Береги энергию — объём наберёшь спокойными шагами.";
  } else if (mode === "high") {
    note = "Высокий ресурс — направь его в outreach, а не в суету.";
  }
  if (a.focus === "Stability") {
    note = "День на стабильность. Сначала состояние, потом несколько спокойных сообщений.";
  }
  if (a.constraint) {
    note = `${note ? note + " " : ""}Ограничение учтено: ${a.constraint}. Планируй вокруг него, не борись с ним.`;
  }

  return {
    date,
    mode,
    focus: a.focus,
    requiredTasks: fp.required,
    optionalTasks: trimOptional(fp.optional, mode),
    minimumPlan: fp.minimumPlan,
    firstAction: fp.firstAction,
    note,
  };
}

const MODE_RU: Record<Mode, string> = {
  low: "низкий",
  light: "лёгкий",
  normal: "обычный",
  high: "сильный",
};

const FOCUS_RU: Record<Focus, string> = {
  Clients: "клиенты",
  Slotly: "Slotly",
  Content: "контент",
  Stability: "стабильность",
};

/** Render a DayPlan as a Telegram message (Russian, no internal labels). */
export function renderPlan(plan: DayPlan): string {
  const lines: string[] = [];
  lines.push(`📅 *План на ${plan.date}*`);
  lines.push(`Режим: ${MODE_RU[plan.mode]}`);
  lines.push(`Фокус: ${FOCUS_RU[plan.focus]}`);
  lines.push("");
  lines.push("*✅ Обязательный минимум*");
  plan.requiredTasks.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
  if (plan.optionalTasks.length > 0) {
    lines.push("");
    lines.push("*➕ Если будут силы*");
    plan.optionalTasks.forEach((t) => lines.push(`• ${t}`));
  }
  lines.push("");
  lines.push(`*🛟 Версия для плохого дня*\n${plan.minimumPlan}`);
  lines.push("");
  lines.push(`*▶️ Первое действие*\n${plan.firstAction}`);
  if (plan.note) {
    lines.push("");
    lines.push(`_${plan.note}_`);
  }
  return lines.join("\n");
}
