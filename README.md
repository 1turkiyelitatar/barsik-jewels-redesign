# Barsik's Kazan Jewels

Создай браузерную Match-3 игру «Барсик. Большая игра» (мобильный и десктопный веб-интерфейс, запуск сразу без авторизации).

Все графические ассеты уже прикреплены:
1. Базовые фишки:
- Зелёное изумрудное сердце (file_09k8514axa99maa062p6q9takx)
- Румяный эчпочмак (file_09r2254nkj8cjr128rjdvq9aep)
- Лапка Барсика (file_5643kb818e9efa6ft7je8rh7we)
- Красный татарский тюльпан (file_5z1d8fmv2f9y8svq4wxq6jhra9)
- Синяя пиала с тёмным янтарным чаем (file_2w3dhseza49aeabavatsz6a169)

2. Специальные фишки (бустеры):
- Термокружка с Барсиком (file_1pp7yyqzfk909b3k351zgqcxe9) — создаётся при сборе 4 в ряд, очищает всю строку или столбец.
- Чак-чак бомба (file_2y7g3h8fzq9eeb0abd8myfwq8y) — создаётся при T- или L-комбинации (5 фишек), взрывает область 3x3.
- Бархатная изумрудная тюбетейка (file_3gsemwbq2a9aavt8eenh8nsnks) — создаётся при 5 в ряд, убирает с поля все фишки одного цвета при свопе. (ВАЖНО: строго без радужных цветов и эффектов).

3. Фон и персонажи:
- Фон Казани: file_51fngqsk6s9pdtd6jv2hsg5tpw
- Барсик с кубком для экрана победы: file_0r81mv8qv386kbcrfmrph44kfq

Геймплей и механика:
- Поле 8х8 с плавной анимацией перемещения фишек (drag and drop / touch swipe / клики для обмена).
- Каскадное падение новых фишек сверху при сгорании комбинаций, автоматический подсчёт комбо.
- Верхняя панель (HUD): цели уровня (например, собрать 15 эчпочмаков и 15 сердец), лимит ходов (например, 20 ходов), текущий счёт и прогресс звёзд (1, 2, 3 звезды).
- Сочные микро-анимации, частицы и приятные звуковые эффекты (Web Audio API: клик, свайп, сгорание, взрыв чак-чака, победные фанфары с возможностью отключить звук).
- Экран победы (Victory Modal) с 3 звёздами, заработанными очками, персонажем Барсиком с кубком, кнопкой следующего уровня и кнопкой «Поделиться» (открывает готовую брендовую карточку для шеринга или копирует текст/ссылку).
- Полная адаптивность: идеально оптимизировано под мобильные экраны смартфонов и планшетов.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://kazan-jewels-match.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fc7093dc-558b-48a1-8b98-1e69b78f4bbf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
