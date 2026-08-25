// Extends vitest's `expect` with jest-dom matchers (toBeInTheDocument, etc.)
// for every test file -- loaded once via vitest.config.ts's setupFiles.
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vitest.config.ts doesn't enable `test.globals`, so React Testing
// Library's usual auto-cleanup-after-each (which detects a global
// `afterEach`) doesn't self-register -- without this, every test file's
// render() output piles up in the same jsdom document, and a later
// test's queries start matching earlier tests' leftover DOM.
afterEach(() => {
  cleanup();
});
