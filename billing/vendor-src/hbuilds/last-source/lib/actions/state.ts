// Client-safe module: no imports, no DB. Client components must import
// ActionState/idle from here, never from helpers.ts, which pulls in the
// MySQL driver via lib/db and would be bundled into the browser.
export type ActionState = { ok: boolean; message: string };
export const idle: ActionState = { ok: false, message: "" };
