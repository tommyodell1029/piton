import { levelForXp, rankForLevel, xpForLevel } from "./gamification";

describe("gamification leveling", () => {
  it("level 1 requires 0 xp and level 2 requires 200 xp", () => {
    expect(xpForLevel(1)).toBe(50);
    expect(xpForLevel(2)).toBe(200);
  });

  it("computes level from xp", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(199)).toBe(1);
    expect(levelForXp(200)).toBe(2);
  });

  it("maps level to rank", () => {
    expect(rankForLevel(1)).toBe("Novice");
    expect(rankForLevel(10)).toBe("Ascender");
    expect(rankForLevel(50)).toBe("Piton Master");
  });
});
