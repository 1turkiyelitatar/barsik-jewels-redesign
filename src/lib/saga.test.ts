import { describe, expect, it } from "vitest";
import {
  completeLevel,
  emptyProgress,
  LEVEL_COUNT,
  LEVEL_POINTS,
  LOCATIONS,
  parseProgress,
  totalStars,
} from "./saga";
import { getLevel, goalsComplete } from "./match3";

describe("saga progression", () => {
  it("starts at level 1 and has exactly 15 levels and 45 possible stars", () => {
    expect(emptyProgress().unlocked).toBe(1);
    expect(LEVEL_COUNT).toBe(15);
    expect(LEVEL_POINTS).toHaveLength(15);
    let progress = emptyProgress();
    for (let n = 1; n <= 15; n++) progress = completeLevel(progress, n, 5000, 3);
    expect(progress.unlocked).toBe(15);
    expect(totalStars(progress)).toBe(45);
  });
  it("unlocks only the next level on a win", () => {
    expect(completeLevel(emptyProgress(), 1, 1200, 2).unlocked).toBe(2);
    expect(completeLevel(emptyProgress(), 2, 1200, 2).unlocked).toBe(1);
  });
  it("retains the best score and stars independently across replays", () => {
    let progress = completeLevel(emptyProgress(), 1, 4000, 3);
    progress = completeLevel(progress, 1, 5000, 1);
    expect(progress.results[1]).toEqual({ score: 5000, stars: 3 });
    expect(parseProgress(JSON.stringify(progress))).toEqual(progress);
  });
  it("recovers from corrupt storage and prevents skipped unlocks", () => {
    expect(parseProgress("not json")).toEqual(emptyProgress());
    expect(parseProgress('{"unlocked":15,"results":{}}')).toEqual(emptyProgress());
  });
  it("uses the requested landmark names", () => {
    expect(LOCATIONS).toHaveLength(15);
    expect(LOCATIONS[0]).toBe("Ак Барс Банк");
    expect(LOCATIONS[4]).toBe("Мост «Миллениум»");
    expect(LOCATIONS[14]).toBe("Казанский Кремль");
  });
  it("varies goals and moves across all 15 levels", () => {
    const levels = Array.from({ length: 15 }, (_, i) => getLevel(i + 1));
    expect(new Set(levels.map((l) => JSON.stringify([l.goals, l.scoreGoal]))).size).toBe(15);
    expect(new Set(levels.map((l) => l.moves)).size).toBeGreaterThan(1);
    expect(new Set(levels.flatMap((l) => l.goals.map((g) => g.t))).size).toBe(5);
  });
  it("requires score goals as well as collected tiles", () => {
    const level = getLevel(15);
    expect(goalsComplete(level, [0, 0], 4999)).toBe(false);
    expect(goalsComplete(level, [0, 0], 5000)).toBe(true);
    expect(goalsComplete(level, [1, 0], 5000)).toBe(false);
  });
});
