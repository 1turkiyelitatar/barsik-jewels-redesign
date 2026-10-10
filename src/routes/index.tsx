import { createFileRoute } from "@tanstack/react-router";
import SagaGame from "@/components/game/SagaGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Карта Казани — Барсик. Большая игра" },
      {
        name: "description",
        content:
          "Пройди 15 match-3 уровней по объёмной карте Казани вместе с Барсиком: от Ак Барс Банка до Кремля. Собирай звёзды и открывай новые локации.",
      },
      { property: "og:title", content: "Барсик. Большая игра" },
      {
        property: "og:description",
        content:
          "Путешествие по яркой карте Казани: 15 уровней, 45 звёзд и головоломки с Барсиком.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SagaGame,
});
