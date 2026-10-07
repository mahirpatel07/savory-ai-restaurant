/**
 * Sanitizes text for Speech Synthesis by removing emojis, markdown symbols, and icons.
 * This ensures the Voice Agent speaks only human-readable text without pronouncing
 * formatting or decorative characters.
 *
 * @param {string} text - The original message text containing emojis/markdown.
 * @returns {string} - Cleaned text suitable for text-to-speech.
 */
export const sanitizeForSpeech = (text) => {
  if (!text) return '';

  return text
    // 1. Remove markdown bold/italic/code markers but preserve the inner text
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`(.*?)`/g, '$1')

    // 2. Remove other markdown structural characters (headers, blockquotes, horizontal rules)
    .replace(/^[#>]+\s+/gm, '')
    .replace(/^[*-]{3,}$/gm, '')

    // 3. Remove list bullets at the start of lines
    .replace(/^[\s]*[-*+•]\s+/gm, '')

    // 4. Remove Emojis and Extended Pictographic symbols (icons)
    // Using Unicode property escapes (requires ES2018+)
    .replace(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu, '')

    // 5. Clean up any leftover markdown-like characters that might be interpreted as punctuation
    .replace(/[#*`>_]/g, ' ')

    // 6. Normalize whitespace: replace multiple newlines/spaces with a single space
    .replace(/\s+/g, ' ')
    .trim();
};
