import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolveProseInputAttributes } from "../../client/src/lib/proseInput";

const read = (path: string) => readFile(path, "utf8");

test("shared prose controls apply English spell-check defaults", () => {
  assert.deepEqual(resolveProseInputAttributes({}), {
    lang: "en-US",
    spellCheck: true,
    autoCorrect: "on",
    autoCapitalize: "sentences",
  });
});

test("spell-check opt-out also disables correction and capitalization", () => {
  assert.deepEqual(resolveProseInputAttributes({ spellCheck: false }), {
    lang: undefined,
    spellCheck: false,
    autoCorrect: "off",
    autoCapitalize: "none",
  });
});

test("explicit overrides are preserved", () => {
  assert.deepEqual(resolveProseInputAttributes({
    spellCheck: false,
    lang: "fr",
    autoCorrect: "on",
    autoCapitalize: "words",
  }), {
    lang: "fr",
    spellCheck: false,
    autoCorrect: "on",
    autoCapitalize: "words",
  });

  assert.deepEqual(resolveProseInputAttributes({
    isProseInput: false,
    spellCheck: false,
  }), {
    lang: undefined,
    spellCheck: false,
    autoCorrect: undefined,
    autoCapitalize: undefined,
  });
});

test("custom prose controls and the Tiptap editor use centralized attributes", async () => {
  const sources = await Promise.all([
    read("client/src/components/MessageThread.tsx"),
    read("client/src/components/FormBuilder.tsx"),
    read("client/src/pages/classroom/NewAssignmentPage.tsx"),
    read("client/src/pages/classroom/EditAssignmentPage.tsx"),
    read("client/src/pages/classroom/FeedTab.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /\{\.\.\.ENGLISH_PROSE_ATTRIBUTES\}/);
  }

  const materialPage = await read("client/src/pages/ClassroomMaterialPage.tsx");
  assert.match(materialPage, /\.\.\.ENGLISH_RICH_TEXT_ATTRIBUTES/);
  assert.match(materialPage, /\{\.\.\.ENGLISH_PROSE_ATTRIBUTES\}/);
});

test("non-prose controls retain explicit spell-check opt-outs", async () => {
  const sources = await Promise.all([
    read("client/src/pages/Login.tsx"),
    read("client/src/pages/AdminUsers.tsx"),
    read("client/src/components/ModernCombobox.tsx"),
    read("client/src/pages/MessagesPage.tsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /spellCheck=\{false\}/);
  }

  assert.match(sources[0], /Email or username/);
});