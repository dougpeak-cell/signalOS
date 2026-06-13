import assert from "node:assert/strict";
import test from "node:test";
import { resolveShellViewMode } from "@/lib/shell/viewMode";

test("defaults watchlist and portfolio shell views to quick on mobile when mode is absent", () => {
  const result = resolveShellViewMode({
    mode: null,
    shouldForceQuickView: false,
    isMobilePhoneView: true,
    isMobilePreview: false,
    canUseDetail: true,
  });

  assert.deepEqual(result, {
    requestedMode: "quick",
    safeMode: "quick",
  });
});

test("keeps explicit detail mode even on mobile when detail access is allowed", () => {
  const result = resolveShellViewMode({
    mode: "detail",
    shouldForceQuickView: false,
    isMobilePhoneView: true,
    isMobilePreview: true,
    canUseDetail: true,
  });

  assert.equal(result.requestedMode, "detail");
  assert.equal(result.safeMode, "detail");
});

test("falls back to quick when detail access is not allowed", () => {
  const result = resolveShellViewMode({
    mode: "detail",
    shouldForceQuickView: false,
    isMobilePhoneView: false,
    isMobilePreview: false,
    canUseDetail: false,
  });

  assert.equal(result.safeMode, "quick");
});