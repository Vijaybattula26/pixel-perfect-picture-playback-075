<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules
- All analyzer state (resume text, job description, status, results, upload state) lives in `AnalyzerProvider` (`src/hooks/use-analyzer.tsx`); components read it via `useAnalyzer()` — single source of truth.
- Resume file parsers (pdfjs-dist, mammoth, tesseract.js) are dynamically imported inside `src/lib/parsers.ts` — they need browser globals and must never load during SSR.
- Keyword Match Score lives in pure, deterministic modules (`atsScorer.ts`, `skillsDictionary.ts`, `resumeSections.ts`, `resumeTips.ts`) with the formula documented at the top of `atsScorer.ts` — scoring runs in the browser, so it must stay side-effect free.
- AI optimization is a TanStack `createServerFn` (`src/lib/optimize.functions.ts`) calling Lovable AI via `@lovable.dev/ai-gateway` in `optimize.server.ts` (dynamically imported), not a Supabase Edge Function or a provider key — this stack has no Cloud backend; it returns typed `{ ok:false, code }` errors so the UI can fall back to No-AI mode.
- The optimize request contract (limits, response shape) lives in client-safe `src/lib/optimize-schema.ts`, shared by client pre-checks and the server.
- Input gating and file validation rules live in `src/lib/validation.ts` with tests beside them — keep rule changes covered there.
