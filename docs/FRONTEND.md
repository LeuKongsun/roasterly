# Frontend Notes

The web app lives in `web/` and uses:

- React
- Vite
- TypeScript
- Tailwind CSS
- lucide-react icons

Tailwind is configured through the official Vite plugin in `web/vite.config.ts`, with `@import "tailwindcss";` in `web/src/styles.css`.

The current UI still has some custom CSS because it was built before Tailwind was added. New frontend work should prefer Tailwind utilities and small reusable React components. Existing custom CSS can be migrated gradually when touching nearby UI.
