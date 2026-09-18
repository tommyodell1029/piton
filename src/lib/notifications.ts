// Type-resolution bridge only — Metro always prefers notifications.native.ts
// (ios/android) or notifications.web.ts over this bare file, so its content
// never actually ships; it exists purely so `tsc` (which doesn't do
// Metro's per-platform file resolution) can resolve `@/lib/notifications`.
export * from "./notifications.web";
