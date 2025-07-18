interface LevelInfo {
  level: number;
  xpRequired: number;
  xpForNextLevel: number;
  totalXpForNextLevel: number;
}

// XP required for each level (can be adjusted based on your progression curve)
const XP_REQUIREMENTS = [
  0, // Level 1
  100, // Level 2
  300, // Level 3
  600, // Level 4
  1000, // Level 5
  1500, // Level 6
  2100, // Level 7
  2800, // Level 8
  3600, // Level 9
  4500, // Level 10
  5500, // Level 11
  6600, // Level 12
  7800, // Level 13
  9100, // Level 14
  10500, // Level 15
  12000, // Level 16
  13600, // Level 17
  15300, // Level 18
  17100, // Level 19
  19000, // Level 20
  21500, // Level 21 (+2500)
  24200, // Level 22 (+2700)
  27100, // Level 23 (+2900)
  30200, // Level 24 (+3100)
  33500, // Level 25 (+3300)
  37000, // Level 26 (+3500)
  40700, // Level 27 (+3700)
  44600, // Level 28 (+3900)
  48700, // Level 29 (+4100)
  53000, // Level 30 (+4300)
  57500, // Level 31 (+4500)
  62200, // Level 32 (+4700)
  67100, // Level 33 (+4900)
  72200, // Level 34 (+5100)
  77500, // Level 35 (+5300)
  83000, // Level 36 (+5500)
  88700, // Level 37 (+5700)
  94600, // Level 38 (+5900)
  100700, // Level 39 (+6100)
  107000, // Level 40 (+6300)
];

export const MAX_LEVEL = XP_REQUIREMENTS.length;

export function getLevelInfo(currentXp: number): LevelInfo {
  // Find the current level
  let level = 1;
  while (level < MAX_LEVEL && currentXp >= XP_REQUIREMENTS[level]) {
    level++;
  }

  // Calculate XP required for next level
  const xpRequired = XP_REQUIREMENTS[level - 1];
  const xpForNextLevel =
    level < MAX_LEVEL ? XP_REQUIREMENTS[level] - XP_REQUIREMENTS[level - 1] : 0;
  const totalXpForNextLevel =
    level < MAX_LEVEL ? XP_REQUIREMENTS[level] : XP_REQUIREMENTS[MAX_LEVEL - 1];

  return {
    level,
    xpRequired,
    xpForNextLevel,
    totalXpForNextLevel,
  };
}

export function getXpProgress(currentXp: number): number {
  const { level, xpRequired, xpForNextLevel } = getLevelInfo(currentXp);

  if (level >= MAX_LEVEL) return 100;

  const currentLevelXp = currentXp - xpRequired;
  return (currentLevelXp / xpForNextLevel) * 100;
}

export function getXpForNextLevel(currentXp: number): number {
  const { level, xpForNextLevel } = getLevelInfo(currentXp);
  return level < MAX_LEVEL ? xpForNextLevel : 0;
}

// Calculate daily transaction target based on user level
export function getDailyTransactionTarget(level: number): number {
  // Goal per level = level × 10 transactions daily
  return level * 10;
}

// Get daily transaction target for a user based on their XP/level
export function getDailyTransactionTargetForUser(currentXp: number): number {
  const { level } = getLevelInfo(currentXp);
  return getDailyTransactionTarget(level);
}

export function getTotalXpForNextLevel(currentXp: number): number {
  const { totalXpForNextLevel } = getLevelInfo(currentXp);
  return totalXpForNextLevel;
}
