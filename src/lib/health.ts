// Type-resolution bridge only — Metro always prefers health.native.ts
// (ios/android) or health.web.ts over this bare file, so its content never
// actually ships; it exists purely so `tsc` (which doesn't do Metro's
// per-platform file resolution) can resolve `@/lib/health` at all.
export * from "./health.web";
