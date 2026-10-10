export const LEVEL_COUNT = 15;
export const PROGRESS_KEY = "barsik-saga-progress-v1";
export type LevelResult = { stars: number; score: number };
export type Progress = { unlocked: number; results: Record<number, LevelResult> };
export const emptyProgress = (): Progress => ({ unlocked: 1, results: {} });

export const LOCATIONS = [
  "Ак Барс Банк",
  "Центр семьи «Казан»",
  "«Татнефть Арена»",
  "Дворец водных видов спорта",
  "Мост «Миллениум»",
  "Парк Горького",
  "Театр кукол «Экият»",
  "Зоопарк «Река Замбези»",
  "Новый театр Камала",
  "Парк Тысячелетия",
  "Колокольня Богоявленского собора",
  "Казань-1",
  "Площадь Свободы",
  "Дворец земледельцев",
  "Казанский Кремль",
];

// Центры маркеров на карте 1145 × 1374 (kazan-map-15.png).
// География фона не изменяется; координаты соответствуют цифрам на изображении.
export const LEVEL_POINTS = [
  [147, 218],
  [362, 125],
  [490, 88],
  [686, 155],
  [639, 261],
  [872, 482],
  [1049, 723],
  [717, 1034],
  [585, 888],
  [564, 728],
  [282, 677],
  [479, 602],
  [627, 586],
  [483, 424],
  [306, 457],
].map(([x = 0, y = 0]) => ({ x: (x / 1145) * 100, y: (y / 1374) * 100 }));

export function completeLevel(
  progress: Progress,
  n: number,
  score: number,
  stars: number,
): Progress {
  if (!Number.isInteger(n) || n < 1 || n > LEVEL_COUNT || n > progress.unlocked) return progress;
  const previous = progress.results[n];
  return {
    unlocked: Math.min(LEVEL_COUNT, Math.max(progress.unlocked, n + 1)),
    results: {
      ...progress.results,
      [n]: {
        score: Math.max(previous?.score ?? 0, Math.max(0, Math.floor(score))),
        stars: Math.max(previous?.stars ?? 0, Math.min(3, Math.max(1, Math.floor(stars)))),
      },
    },
  };
}

export function parseProgress(raw: string | null): Progress {
  if (!raw) return emptyProgress();
  try {
    const data = JSON.parse(raw);
    const progress = emptyProgress();
    for (let n = 1; n <= LEVEL_COUNT; n++) {
      const result = data?.results?.[n];
      if (
        !result ||
        !Number.isInteger(result.stars) ||
        result.stars < 1 ||
        result.stars > 3 ||
        !Number.isFinite(result.score) ||
        result.score < 0
      )
        break;
      progress.results[n] = { stars: result.stars, score: Math.floor(result.score) };
      progress.unlocked = Math.min(LEVEL_COUNT, n + 1);
    }
    return progress;
  } catch {
    return emptyProgress();
  }
}

export const totalStars = (progress: Progress) =>
  Object.values(progress.results).reduce((sum, r) => sum + r.stars, 0);
