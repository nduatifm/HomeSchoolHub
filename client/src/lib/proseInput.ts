export const ENGLISH_PROSE_ATTRIBUTES = {
  lang: "en-US",
  spellCheck: true,
  autoCorrect: "on",
  autoCapitalize: "sentences",
} as const;

export const ENGLISH_RICH_TEXT_ATTRIBUTES = {
  lang: "en-US",
  spellcheck: "true",
  autocorrect: "on",
  autocapitalize: "sentences",
} as const;

interface ProseInputOptions {
  isProseInput?: boolean;
  lang?: string;
  spellCheck?: boolean;
  autoCorrect?: string;
  autoCapitalize?: string;
}

export function resolveProseInputAttributes({
  isProseInput = true,
  lang,
  spellCheck,
  autoCorrect,
  autoCapitalize,
}: ProseInputOptions) {
  if (!isProseInput) {
    return { lang, spellCheck, autoCorrect, autoCapitalize };
  }

  if (spellCheck === false) {
    return {
      lang,
      spellCheck: false,
      autoCorrect: autoCorrect ?? "off",
      autoCapitalize: autoCapitalize ?? "none",
    };
  }

  return {
    lang: lang ?? ENGLISH_PROSE_ATTRIBUTES.lang,
    spellCheck: spellCheck ?? ENGLISH_PROSE_ATTRIBUTES.spellCheck,
    autoCorrect: autoCorrect ?? ENGLISH_PROSE_ATTRIBUTES.autoCorrect,
    autoCapitalize: autoCapitalize ?? ENGLISH_PROSE_ATTRIBUTES.autoCapitalize,
  };
}