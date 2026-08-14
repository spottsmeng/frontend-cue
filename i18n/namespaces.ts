// One entry per `messages/{locale}/{name}.json` file — the single list
// i18n/request.ts (server) and lib/test-utils.tsx (tests) both read from,
// so adding a namespace is a one-line change in one place, not three.
export const MESSAGE_NAMESPACES = [
  "common",
  "nav",
  "livingWip",
  "twin",
  "foresight",
  "documents",
  "ask",
  "vendors",
  "admin",
  "analytics",
] as const;

export type MessageNamespace = (typeof MESSAGE_NAMESPACES)[number];
