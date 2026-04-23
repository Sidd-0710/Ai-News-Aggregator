/**
 * RSS Content Cleaner
 * Strips HTML tags, decodes entities, and normalizes text for AI summarization
 * Production-ready utility for Node.js/Express backend
 */

/**
 * HTML Entity Map - Common HTML entities
 */
const HTML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
  '&bull;': '•',
  '&hellip;': '...',
  '&mdash;': '—',
  '&ndash;': '–',
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': ''',
  '&rsquo;': ''',
};

/**
 * Decode HTML entities including numeric entities
 * @param {string} text - Text with HTML entities
 * @returns {string} Decoded text
 */
function decodeHtmlEntities(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let decoded = text;

  // Decode named entities
  Object.entries(HTML_ENTITIES).forEach(([entity, char]) => {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  });

  // Decode numeric entities: &#123; or &#xAB;
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });

  decoded = decoded.replace(/&#x([A-Fa-f0-9]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });

  return decoded;
}

/**
 * Strip all HTML tags from text
 * Preserves text between tags and handles edge cases
 * @param {string} html - HTML string
 * @returns {string} Text without HTML tags
 */
function stripHtmlTags(html) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let text = html;

  // Remove script and style tags entirely (including content)
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remove CDATA sections
  text = text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');

  // Convert common block-level tags to spaces to avoid word concatenation
  text = text.replace(/<\/(p|div|br|h[1-6]|li|blockquote|article|section)>/gi, ' ');
  text = text.replace(/<(p|div|br|h[1-6]|li|blockquote|article|section)[^>]*>/gi, ' ');

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode entities after removing tags
  text = decodeHtmlEntities(text);

  return text;
}

/**
 * Clean and normalize whitespace
 * @param {string} text - Text with potential whitespace issues
 * @returns {string} Cleaned text
 */
function normalizeWhitespace(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Replace multiple spaces, tabs, newlines with single space
  let cleaned = text.replace(/\s+/g, ' ');

  // Remove leading and trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Main content cleaner function
 * Cleans HTML, decodes entities, and normalizes whitespace
 * @param {string} content - Raw HTML content from RSS feed
 * @returns {string} Clean plain text
 */
function cleanContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Strip HTML tags
  let cleaned = stripHtmlTags(content);

  // Normalize whitespace
  cleaned = normalizeWhitespace(cleaned);

  return cleaned;
}

/**
 * Get clean content with fallback logic
 * Attempts to use description, falls back to content, then summary
 * @param {object} item - RSS item with potential content fields
 * @param {object} options - Configuration options
 * @param {number} options.minLength - Minimum length to consider content valid (default: 10)
 * @returns {string} Clean text content
 */
function getCleanDescription(item, options = {}) {
  const { minLength = 10 } = options;

  if (!item || typeof item !== 'object') {
    return '';
  }

  // Try description first
  let content = item.description || item.summary || item.content || '';

  // If empty or too short, try alternatives
  if (!content || content.length < minLength) {
    // Try content field
    if (item.content && item.content.length >= minLength) {
      content = item.content;
    }
    // Try summary field
    else if (item.summary && item.summary.length >= minLength) {
      content = item.summary;
    }
    // Try full-text if available (some feeds)
    else if (item['content:encoded'] && item['content:encoded'].length >= minLength) {
      content = item['content:encoded'];
    }
  }

  return cleanContent(content);
}

/**
 * Clean multiple RSS items in batch
 * @param {array} items - Array of RSS items
 * @param {object} options - Configuration options
 * @returns {array} Items with cleaned descriptions
 */
function cleanRSSItems(items, options = {}) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item) => ({
    ...item,
    cleanDescription: getCleanDescription(item, options),
  }));
}

/**
 * Truncate text to maximum length while preserving words
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength = 500) {
  if (!text || typeof text !== 'string' || text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength);
  // Find last space to avoid cutting words
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
}

// Export functions for use in Express routes
module.exports = {
  cleanContent,
  getCleanDescription,
  cleanRSSItems,
  stripHtmlTags,
  decodeHtmlEntities,
  normalizeWhitespace,
  truncateText,
};
