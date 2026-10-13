/**
 * Language filter utility for VYNL lyrics.
 * Only English / Latin-script lyrics are allowed.
 * Rejects text if >15% of alphabetical characters belong to non-Latin scripts.
 */

const LATIN_LETTER_REGEX = /^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF]$/;
const UNICODE_LETTER_REGEX = /\p{L}/u;

export function isEnglishLyrics(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  let totalLetters = 0;
  let nonLatinLetters = 0;

  for (const char of text) {
    if (UNICODE_LETTER_REGEX.test(char)) {
      totalLetters++;
      if (!LATIN_LETTER_REGEX.test(char)) {
        nonLatinLetters++;
      }
    }
  }

  if (totalLetters === 0) {
    return false;
  }

  return nonLatinLetters / totalLetters <= 0.15;
}
