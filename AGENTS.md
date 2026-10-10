<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Game logic (pure, testable) lives in src/lib/match3.ts; UI in src/components/game — keeps rules separate from rendering.
- Game images are bundled from src/assets as real files (not CDN pointers) so the game works on any hosting.
- SagaGame owns map/game navigation and browser persistence; pure progress rules and proportional map coordinates live in src/lib/saga.ts — keeps victory persistence consistent without reloading the page.
