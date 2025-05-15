const locales = new Map([
  [
    "cs",
    {
      singleQuotes: ["‚", "‘"],
      doubleQuotes: ["„", "“"]
    }
  ],

  [
    "en",
    {
      singleQuotes: ["‘", "’"],
      doubleQuotes: ["“", "”"]
    }
  ],

  [
    "nl",
    {
      singleQuotes: ["‘", "’"],
      doubleQuotes: ["“", "”"]
    }
  ],

  [
    "fr",
    {
      singleQuotes: ["‹", "›"],
      doubleQuotes: ["«", "»"]
    }
  ],

  [
    "da",
    {
      singleQuotes: ["›", "‹"],
      doubleQuotes: ["»", "«"]
    }
  ],

  [
    "de",
    {
      singleQuotes: ["‚", "‘"],
      doubleQuotes: ["„", "“"]
    }
  ],

  [
    "pl",
    {
      singleQuotes: ["‚", "’"],
      doubleQuotes: ["„", "”"]
    }
  ],

  [
    "hr",
    {
      singleQuotes: ["‚", "’"],
      doubleQuotes: ["„", "”"]
    }
  ],

  [
    "fi",
    {
      singleQuotes: ["’", "’"],
      doubleQuotes: ["”", "”"]
    }
  ]
]);

function definePatterns({ singleQuotes, doubleQuotes }) {
  return [
    [/(?<![.\u{2026}])\.{3,4}(?![.\u{2026}])/gmu, "…"], // ellipsis  ...
    [/(?<=[\d ]|^)-(?=[\d ]|$)/g, "–"], // en dash 123-123
    [/(?<=[^!*+,/:;<=>@\\_|-])--(?=[^!*+,/:;<=>@\\_|-])/g, "–"], // en dash alphanum--alphanum
    [/,-/g, ",–"], // en dash ,-
    [/(?<!\d)(\d{1,2}\.) (\d{1,2}\.) (\d\d)/g, "$1\u{A0}$2\u{A0}$3"], // date 23. 1. 1978
    [/(?<!\d)(\d{1,2}\.) (\d{1,2}\.)/g, "$1\u{A0}$2"], // date 23. 1.
    [/ --- /g, "\u{A0}— "], // em dash ---
    [/ ([\u{2013}\u{2014}])/gu, "\u{A0}$1"], // &nbsp; behind dash (dash stays at line end)
    [/ <-{1,2}> /g, " ↔ "], // left right arrow <-->
    [/-+> /g, "→ "], // right arrow -->
    [/ <-+/g, " ← "], // left arrow <--
    [/=+> /g, "⇒ "], // right arrow ==>
    [/\+-/g, "±"], // +-
    [/(\d+) x (?=\d)/g, "$1\u{A0}\u{D7}\u{A0}"], // dimension sign 123 x 123...
    [/(\d+)x(?=\d)/g, "$1×"], // dimension sign 123x123...
    [/(?<=\d)x(?= |,|.|$)/gm, "×"], // dimension sign 123x
    [/(\S ?)\(TM\)/gi, "$1™"], // trademark (TM)
    [/(\S ?)\(R\)/gi, "$1®"], // registered (R)
    [/\(C\)( ?\S)/gi, "©$1"], // copyright (C)
    [/\(EUR\)/g, "€"], // Euro (EUR)
    [/(\d) (?=\d{3})/g, "$1\u{A0}"], // (phone) number 1 123 123 123...

    // CONTENT_MARKUP mark: \x17-\x1F, CONTENT_REPLACED mark: \x16, CONTENT_TEXTUAL mark: \x17
    [/(?<=[^\s\x17])\s+([\x17-\x1F]+)(?=\s)/gu, "$1"], // remove intermarkup space phase 1
    [/(?<=\s)([\x17-\x1F]+)\s+/gu, "$1"], // remove intermarkup space phase 2

    [/(?<=.{50})\s+(?=[\x17-\x1F]*\S{1,6}[\x17-\x1F]*$)/gsu, "\u{A0}"], // space before last short word

    // nbsp space between number (optionally followed by dot) and word, symbol, punctation, currency symbol
    [
      /(?<=^| |\.|,|-|\+|\x16|\(|\d\xA0)([\x17-\x1F]*\d+\.?[\x17-\x1F]*)\s+(?=[\x17-\x1F]*[%\p{Letter}\p{Punctuation}\p{Currency_Symbol}])/gmv,
      "$1\u{A0}"
    ],
    // space between preposition and word
    [
      /(?<=^|[^0-9\p{Letter}])([\x17-\x1F]*[ksvzouiKSVZOUIA][\x17-\x1F]*)\s+(?=[\x17-\x1F]*[0-9\p{Letter}])/gmsv,
      "$1\u{A0}"
    ],

    // double ""
    [
      /(?<!"|\w)"(?![ "])([^"]+)(?<![ "])"(?!["\p{Letter}])/gv,
      `${doubleQuotes[0]}$1${doubleQuotes[1]}`
    ],
    // single ''
    [
      /(?<!'|\w)'(?![ '])([^']+)(?<![ '])'(?!['\p{Letter}])/gv,
      `${singleQuotes[0]}$1${singleQuotes[1]}`
    ]
  ];
}

/**
 * Apply typographic substitutions to given text input.
 * @param {string} input
 * @param {Object} options
 * @param {string} options.locale Locale determines what quotation marks will be applied. Default `en`
 */
export function processTypo(input, { locale } = { locale: "en" }) {
  const patterns = definePatterns(locales.get(locale ?? "en"));
  return patterns.reduce((i, [p, r]) => i.replaceAll(p, r), input);
}

/** @typedef {import("marked").MarkedExtension} MarkedExtension **/

/**
 * Marked rendering extension to apply
 * @param {String} locale
 * @returns {MarkedExtension}
 */
export function texyTypography(locale) {
  return {
    renderer: {
      text(token) {
        if (token.tokens) {
          return this.parser.parseInline(token.tokens);
        }
        return processTypo(token.text, { locale });
      }
    }
  };
}
