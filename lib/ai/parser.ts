import { Recommendation } from "../types";
import { generateId, getToday } from "../utils";

interface AiSuggestionRaw {
  type: string;
  priority: string;
  message: string;
  action?: string;
}

export function parseAiResponse(response: string): Recommendation[] {
  try {
    let cleaned = response.trim();

    // Strip markdown code fences if present
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(cleaned);

    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [parsed];

    return suggestions
      .filter((s: AiSuggestionRaw) => s.message && s.type && s.priority)
      .map((s: AiSuggestionRaw) => ({
        id: generateId(),
        type: validateType(s.type),
        priority: validatePriority(s.priority),
        message: s.message,
        action: s.action || undefined,
        date: getToday(),
        dismissed: false,
      }));
  } catch {
    // If JSON parsing fails, try to extract suggestions from free text
    return parseFreeText(response);
  }
}

function validateType(type: string): Recommendation["type"] {
  const valid: Recommendation["type"][] = [
    "schedule", "study", "gym", "habit", "revision", "warning",
  ];
  return valid.includes(type as Recommendation["type"])
    ? (type as Recommendation["type"])
    : "study";
}

function validatePriority(priority: string): Recommendation["priority"] {
  const valid: Recommendation["priority"][] = ["high", "medium", "low"];
  return valid.includes(priority as Recommendation["priority"])
    ? (priority as Recommendation["priority"])
    : "medium";
}

function parseFreeText(text: string): Recommendation[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 10);
  const recs: Recommendation[] = [];

  for (const line of lines.slice(0, 8)) {
    const cleaned = line.replace(/^[-*\d.]+\s*/, "").trim();
    if (cleaned.length < 10) continue;

    const lower = cleaned.toLowerCase();
    const type: Recommendation["type"] = lower.includes("schedule") || lower.includes("move") || lower.includes("today")
      ? "schedule"
      : lower.includes("gym") || lower.includes("workout") || lower.includes("upper") || lower.includes("lower")
      ? "gym"
      : lower.includes("habit") || lower.includes("consistency") || lower.includes("streak")
      ? "habit"
      : lower.includes("revision") || lower.includes("revise")
      ? "revision"
      : "study";

    const priority: Recommendation["priority"] = lower.includes("urgent") || lower.includes("immediately") || lower.includes("critical")
      ? "high"
      : lower.includes("consider") || lower.includes("should")
      ? "medium"
      : "low";

    recs.push({
      id: generateId(),
      type,
      priority,
      message: cleaned,
      date: getToday(),
      dismissed: false,
    });
  }

  return recs;
}
