export type SafetyFlag = "none" | "crisis" | "betting_advice" | "safety_fallback";

export const crisisReply = "I'm sorry you're dealing with this. If you might hurt yourself or are in immediate danger, call or text 988 in the US now, or call local emergency services. For gambling support, call or text 1-800-MY-RESET. You deserve support from a person right now.";
export const bettingReply = "I can't help with bets, odds, staking, winning strategies, or getting around a block. If the urge is strong, step away from the betting app for 10 minutes and try the pause action you chose. You can call or text 1-800-MY-RESET for gambling support.";
export const fallbackReply = "I can't safely guide this conversation right now. Please take a pause and reach out to someone you trust. In the US, call or text 988 for a mental health crisis, or 1-800-MY-RESET for gambling support. If you're in immediate danger, call local emergency services.";

const crisis = /\b(?:suicid(?:e|al)|kill (?:myself|me)|end my life|hurt myself|self[- ]harm|not want to (?:live|be alive|be here)|don't want to (?:live|be alive|be here)|cant go on|can't go on|overdose|about to jump|no reason to live)\b/i;
const betting = /\b(?:how (?:do|can|should) i (?:win|bet|wager|stake|make (?:money|a profit))|winning (?:bet|strategy|system)|best (?:bet|odds|sportsbook|casino|stake)|which (?:team|bet|bookmaker) (?:should|will)|pick (?:a|the) winner|win (?:it|my money|the losses) back|chase (?:my|the|those) losses|bankroll (?:management|strategy|size)|betting (?:tips|strategy|system)|bypass (?:my|a|the) (?:block|self.exclusion)|disable (?:my|the) (?:block|pause|self.exclusion)|get around (?:my|the|a) (?:block|limit|self.exclusion))\b/i;

export function classifyClearRequest(content: string): SafetyFlag {
  if (crisis.test(content)) return "crisis";
  if (betting.test(content)) return "betting_advice";
  return "none";
}

export function unsafeReply(content: string): boolean {
  const withoutWarnings = content.replace(/\b(?:don't|do not|never|avoid|try not to)\s+(?:place (?:a|the|your) bet|bet (?:on|more|\$)|increase (?:your|the) stake|chase (?:the|your) losses|disable (?:your|the) (?:block|pause))\b/gi, "");
  return /\b(?:guaranteed (?:win|profit)|place (?:a|the|your) bet|bet (?:on|more|\$)|increase (?:your|the) stake|chase (?:the|your) losses|disable (?:your|the) (?:block|pause)|you (?:will|can) definitely win|you don't need (?:help|a therapist))\b/i.test(withoutWarnings);
}
