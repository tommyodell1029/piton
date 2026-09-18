// Type-resolution bridge only — Metro always prefers revenuecat.native.ts
// (ios/android) or revenuecat.web.ts over this bare file, so its content
// never actually ships; it exists purely so `tsc` (which doesn't do
// Metro's per-platform file resolution) can resolve `@/lib/revenuecat`.
export * from "./revenuecat.web";
