export type RiskScoreInput = {
  what: string;
  who_name: string | null;
  due_date: string | null;
  priority: "high" | "medium" | "low" | string;
  verbatim_quote: string | null;
};

const VAGUE_TERMS = [
  "follow up",
  "check",
  "handle",
  "look into",
  "circle back",
  "sort out",
  "take care",
  "work on",
];

export function scoreActionItemRisk(item: RiskScoreInput, now = new Date()) {
  let score = 20;
  const reasons: string[] = [];

  if (!item.who_name) {
    score += 20;
    reasons.push("owner is unclear");
  }

  if (!item.due_date) {
    score += 20;
    reasons.push("deadline is missing");
  } else {
    const due = new Date(item.due_date);
    const hoursUntilDue = (due.getTime() - now.getTime()) / 3_600_000;
    if (Number.isNaN(due.getTime())) {
      score += 15;
      reasons.push("deadline could not be parsed");
    } else if (hoursUntilDue < 0) {
      score += 25;
      reasons.push("deadline has passed");
    } else if (hoursUntilDue <= 48) {
      score += 10;
      reasons.push("deadline is within 48 hours");
    }
  }

  if (item.priority === "high") {
    score += 10;
    reasons.push("high priority");
  } else if (item.priority === "low") {
    score -= 5;
  }

  const lower = item.what.toLowerCase();
  if (VAGUE_TERMS.some((term) => lower.includes(term))) {
    score += 10;
    reasons.push("deliverable wording is vague");
  }

  if (!item.verbatim_quote) {
    score += 5;
    reasons.push("source quote is missing");
  }

  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: clamped,
    reason: reasons.length > 0 ? reasons.join("; ") : "clear owner, deadline, and deliverable",
  };
}
