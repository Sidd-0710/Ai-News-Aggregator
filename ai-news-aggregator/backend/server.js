const express = require('express');
const cors = require('cors');
const axios = require('axios');
const axiosRetry = require('axios-retry');
const fs = require('fs');
const path = require('path');
const Parser = require('rss-parser');

function loadLocalEnv() {
  const envFilePath = path.join(__dirname, '.env');
  if (!fs.existsSync(envFilePath)) return;

  const fileContent = fs.readFileSync(envFilePath, 'utf8');
  for (const line of fileContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    process.env[key] = value;
  }
}

loadLocalEnv();

const app = express();
app.use(cors());
app.use(express.json());

const parser = new Parser();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const SUMMARIZE_MODEL = process.env.SUMMARIZE_MODEL || 'mistral';
const TRANSLATE_MODEL = process.env.TRANSLATE_MODEL || SUMMARIZE_MODEL;
const SUMMARY_INPUT_LIMIT = Number(process.env.SUMMARY_INPUT_LIMIT || 240);
const FEED_FETCH_TIMEOUT_MS = 15000;
const FEED_CONCURRENCY = 4;
const FEED_CACHE_TTL_MS = 60 * 1000;
const FEED_ITEMS_FETCH = 30;
const FEED_ITEMS_LIMIT = 25;
const MAX_ARTICLES = 50;
const FEED_USER_AGENT = 'AI-News-Aggregator/1.0 (+https://localhost)';
const OG_IMAGE_TIMEOUT_MS = 5000;
const OG_IMAGE_CONCURRENCY = 3;
const OG_IMAGE_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedArticlePool = [];
let cachedAt = 0;
const ogImageCache = new Map();

axiosRetry(axios, {
  retries: 2,
  retryDelay: axiosRetry.exponentialDelay,
  shouldResetTimeout: true,
  retryCondition: (error) =>
    axiosRetry.isNetworkOrIdempotentRequestError(error) ||
    error.code === 'ECONNABORTED' ||
    (error.response && error.response.status >= 500),
});

// RSS Feed URLs for latest news (no rate limits!)
const RSS_FEEDS = [
  // Technology - High Quality with Images
  { url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology' },
  { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology' },
  { url: 'https://www.wired.com/feed/rss', category: 'Technology' },
  { url: 'https://www.theguardian.com/technology/rss', category: 'Technology' },
  { url: 'https://feeds.gizmodo.com/gizmodo/full', category: 'Technology' },

  // Science & Space
  { url: 'https://www.nasa.gov/rss/dyn/breaking_news.rss', category: 'Science' },
  { url: 'https://feeds.arstechnica.com/arstechnica/science', category: 'Science' },
  { url: 'https://feeds.smithsonianmag.com/science', category: 'Science' },

  // Business & Startups
  { url: 'https://feeds.bloomberg.com/markets/news.rss', category: 'Business' },
  { url: 'https://feeds.mashable.com/feeds/rss/mashable.xml', category: 'Business' },

  // Health & Medical
  { url: 'https://feeds.bbci.co.uk/news/health_and_science/rss.xml', category: 'Health' },

  // World News
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'World' },
  { url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { url: 'https://www.theguardian.com/world/rss', category: 'World' },

  // Entertainment & Culture
  { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment' },

  // Tech News Alternative
  { url: 'https://feeds.kotaku.com/kotaku/full', category: 'Technology' },
];

// Clean HTML and text content
function cleanContent(text) {
  if (!text) return '';

  try {
    let cleaned = text
      // Remove all HTML tags including content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ') // Remove all tags
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&[a-z]+;/gi, ' ') // Remove any remaining entities
      // Clean up whitespace
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();

    // Limit to first 300 characters for description preview
    if (cleaned.length > 300) {
      cleaned = cleaned.substring(0, 300).trim() + '...';
    }

    return cleaned;
  } catch (e) {
    return text.substring(0, 300);
  }
}

function isLikelyImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /\.(jpe?g|png|gif|webp|avif|bmp|svg)(\?.*)?$/i.test(url);
}

function resolveUrl(candidate, baseLink) {
  if (!candidate || typeof candidate !== 'string') return null;
  try {
    return new URL(candidate, baseLink || 'https://example.com').href;
  } catch {
    return null;
  }
}

function isHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function getMetaContent(html, key) {
  if (!html || typeof html !== 'string') return null;
  const metaTags = html.match(/<meta[^>]+>/gi) || [];
  const target = key.toLowerCase();

  for (const tag of metaTags) {
    const attrs = {};
    tag.replace(/([^\s=]+)\s*=\s*["']([^"']*)["']/g, (_match, name, value) => {
      attrs[name.toLowerCase()] = value;
      return '';
    });

    const prop = (attrs.property || attrs.name || '').toLowerCase();
    if (prop === target && attrs.content) {
      return attrs.content;
    }
  }

  return null;
}

function extractOpenGraphImage(html) {
  return (
    getMetaContent(html, 'og:image:secure_url') ||
    getMetaContent(html, 'og:image') ||
    getMetaContent(html, 'twitter:image:src') ||
    getMetaContent(html, 'twitter:image')
  );
}

function getCachedOgImage(link) {
  const cached = ogImageCache.get(link);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > OG_IMAGE_CACHE_TTL_MS) {
    ogImageCache.delete(link);
    return null;
  }
  return cached.url;
}

function setCachedOgImage(link, url) {
  ogImageCache.set(link, { url, timestamp: Date.now() });
}

async function fetchOpenGraphImage(link) {
  if (!isHttpUrl(link)) return null;
  const cached = getCachedOgImage(link);
  if (cached) return cached;

  try {
    const response = await axios.get(link, {
      timeout: OG_IMAGE_TIMEOUT_MS,
      responseType: 'text',
      headers: {
        'User-Agent': FEED_USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      },
    });

    const rawImage = extractOpenGraphImage(response.data);
    const resolved = resolveUrl(rawImage, link);
    if (resolved) {
      setCachedOgImage(link, resolved);
      return resolved;
    }
  } catch {
    return null;
  }

  return null;
}

function getFallbackImage({ category, source }) {
  const label = (category || source || 'News').trim().slice(0, 28);
  const encoded = encodeURIComponent(label);
  return `https://placehold.co/600x400/0f172a/e2e8f0?text=${encoded}`;
}

function isTruthy(value) {
  return typeof value === 'string' && ['1', 'true', 'yes'].includes(value.toLowerCase());
}

function shuffleArray(items) {
  return items.sort(() => Math.random() - 0.5);
}

function buildSelectionFromPool(pool, max = MAX_ARTICLES) {
  const shuffled = shuffleArray([...pool]);
  const withImages = shuffled.filter(a => a.image);
  const withoutImages = shuffled.filter(a => !a.image);
  const selected = withImages.concat(withoutImages).slice(0, max);
  return {
    selected,
    withImagesCount: withImages.length,
    withoutImagesCount: withoutImages.length,
  };
}

function normalizeTitle(title) {
  return (title || '').trim().toLowerCase();
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (index < items.length) {
      const currentIndex = index;
      index += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function fetchFeedXml(url) {
  const response = await axios.get(url, {
    timeout: FEED_FETCH_TIMEOUT_MS,
    responseType: 'text',
    headers: {
      'User-Agent': FEED_USER_AGENT,
      'Accept': 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    },
  });
  return response.data;
}

async function fetchFeedArticles(feed) {
  const feedName = new URL(feed.url).hostname;
  try {
    console.log(`⏳ Fetching "${feed.category}" from ${feedName}...`);
    const xml = await fetchFeedXml(feed.url);
    const feedData = await parser.parseString(xml);

    if (!feedData.items || feedData.items.length === 0) {
      return { feedName, error: new Error('No items in feed') };
    }

    let items = feedData.items.slice(0, FEED_ITEMS_FETCH);
    items = shuffleArray(items);

    const articles = items.slice(0, FEED_ITEMS_LIMIT).map(item => ({
      title: item.title || 'No title',
      description: cleanContent(item.content || item.contentSnippet || item.summary || 'No description'),
      link: item.link || '#',
      source: feedData.title || feedName || 'RSS Feed',
      category: feed.category,
      pubDate: item.pubDate || new Date().toISOString(),
      image: getImageFromFeedItem(item),
    }));

    const missingIndexes = articles
      .map((article, index) => (!article.image && isHttpUrl(article.link) ? index : -1))
      .filter(index => index >= 0);

    if (missingIndexes.length > 0) {
      await mapWithConcurrency(missingIndexes, OG_IMAGE_CONCURRENCY, async (index) => {
        const ogImage = await fetchOpenGraphImage(articles[index].link);
        if (ogImage) {
          articles[index].image = ogImage;
        }
      });
    }

    articles.forEach(article => {
      if (!article.image) {
        article.image = getFallbackImage({
          category: feed.category,
          source: feedData.title || feedName,
        });
      }
    });

    const withImages = articles.filter(a => a.image).length;
    console.log(`✅ ${feed.category} - ${articles.length} articles (${withImages} with images)`);
    return { feedName, articles };
  } catch (error) {
    return { feedName, error };
  }
}

// Enhanced summarize function - RELIABLE 6 line summaries
async function summarizeText(text, retries = 2) {
  try {
    if (!text || text.trim().length < 20) {
      throw new Error('Text too short to summarize');
    }

    // Reduce text size for faster processing
    const cleanText = text.trim().substring(0, SUMMARY_INPUT_LIMIT);

    const prompt = `Summarize in exactly 6 lines:

${cleanText}

Summary (6 lines):`;

    console.log('📤 Sending to Ollama for summary...');
    const response = await axios.post(OLLAMA_URL, {
      model: SUMMARIZE_MODEL,
      prompt: prompt,
      stream: false,
      temperature: 0.3,
    }, { timeout: 90000 });

    let summary = response.data.response.trim();

    if (summary.length < 20) {
      throw new Error('Summary too short');
    }

    console.log('✅ Summary received');
    return summary;
  } catch (error) {
    console.error(`❌ Summarize error (${retries} retries left):`, error.message);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return summarizeText(text, retries - 1);
    }
    throw error;
  }
}

// Translate to Hindi - RELIABLE
async function translateToHindi(text, retries = 2) {
  try {
    if (!text) return text;

    // Shorten the text for faster translation
    const shortText = text.substring(0, 500);

    const prompt = `हिंदी में अनुवाद करें:
${shortText}

हिंदी:`;

    console.log('📤 Sending to Ollama for translation...');
    const response = await axios.post(OLLAMA_URL, {
      model: TRANSLATE_MODEL,
      prompt: prompt,
      stream: false,
      temperature: 0.2,
    }, { timeout: 90000 });

    let translation = response.data.response.trim();

    if (!translation || translation.length < 10) {
      throw new Error('Translation too short');
    }

    console.log('✅ Hindi translation received');
    return translation;
  } catch (error) {
    console.error(`❌ Translation error (${retries} retries left):`, error.message);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 2000));
      return translateToHindi(text, retries - 1);
    }
    // Return English if translation fails
    console.log('⚠️  Translation failed, returning English');
    return text;
  }
}

// Extract clean image from RSS feed item - ENHANCED
function getImageFromFeedItem(item) {
  let imageUrl = null;

  // Try media:content (most reliable)
  if (item.media && item.media.content && Array.isArray(item.media.content)) {
    imageUrl = item.media.content[0]?.url;
    if (imageUrl) return imageUrl;
  }
  if (item.media && item.media.content && !Array.isArray(item.media.content)) {
    imageUrl = item.media.content.url;
    if (imageUrl) return imageUrl;
  }
  if (item['media:content']) {
    const mediaContent = item['media:content'];
    const mediaItem = Array.isArray(mediaContent) ? mediaContent[0] : mediaContent;
    if (mediaItem?.url) return mediaItem.url;
  }

  // Try media:thumbnail
  if (item['media:thumbnail']) {
    const thumb = Array.isArray(item['media:thumbnail'])
      ? item['media:thumbnail'][0]?.url
      : item['media:thumbnail']?.url;
    if (thumb) return thumb;
  }

  // Try image property
  if (item.image) {
    imageUrl = typeof item.image === 'string' ? item.image : (item.image.url || item.image.href);
    if (imageUrl) return imageUrl;
  }

  // Try itunes:image
  if (item['itunes:image']) {
    imageUrl = item['itunes:image']?.href || item['itunes:image']?.url;
    if (imageUrl) return imageUrl;
  }

  // Try enclosure with image type
  if (item.enclosure) {
    const enclosureUrl = item.enclosure.url;
    if (enclosureUrl && (item.enclosure.type?.includes('image') || isLikelyImageUrl(enclosureUrl))) {
      return enclosureUrl;
    }
  }
  if (Array.isArray(item.enclosures)) {
    const enclosure = item.enclosures.find(e => e?.url && (e?.type?.includes('image') || isLikelyImageUrl(e.url)));
    if (enclosure) return enclosure.url;
  }

  // Try to extract from content/description HTML
  const content = item.content || item['content:encoded'] || item.contentSnippet || item.summary || '';

  // Extract src from <img> tags
  const imgMatch = content.match(/<img[^>]+(?:src|data-src|data-original)=['"]([^'"]+)['"]/i);
  if (imgMatch && imgMatch[1]) {
    imageUrl = resolveUrl(imgMatch[1], item.link);
    if (imageUrl) return imageUrl;
  }

  // Try to extract from <figure> or <picture> tags
  const figureMatch = content.match(/<(figure|picture)[^>]*>[\s\S]*?(?:src|data-src)=['"]([^'"]+)['"]/i);
  if (figureMatch && figureMatch[2]) {
    imageUrl = resolveUrl(figureMatch[2], item.link);
    if (imageUrl) return imageUrl;
  }

  // Try srcset
  const srcsetMatch = content.match(/srcset=['"]([^'"]+)['"]/i);
  if (srcsetMatch && srcsetMatch[1]) {
    const firstUrl = srcsetMatch[1].split(',')[0]?.trim().split(' ')[0];
    imageUrl = resolveUrl(firstUrl, item.link);
    if (imageUrl) return imageUrl;
  }

  return null;
}

// Fetch all news from RSS Feeds
async function fetchAllNews() {
  const allArticles = [];
  const failedFeeds = [];
  const successFeeds = [];
  console.log('\n📰 FETCHING FRESH NEWS FROM RSS FEEDS...');

  const results = await mapWithConcurrency(RSS_FEEDS, FEED_CONCURRENCY, fetchFeedArticles);
  results.forEach((result, index) => {
    const feed = RSS_FEEDS[index];
    const feedName = result.feedName || new URL(feed.url).hostname;
    if (result.error) {
      failedFeeds.push({ feed: feedName, reason: result.error.message });
      console.error(`❌ Error fetching ${feed.category} from ${feedName}:`);
      console.error(`   URL: ${feed.url}`);
      console.error(`   Error: ${result.error.message}`);
      return;
    }
    allArticles.push(...result.articles);
    successFeeds.push(feedName);
  });

  console.log(`\n📊 Total articles fetched: ${allArticles.length}`);
  console.log(`✅ Working feeds: ${successFeeds.length}/${RSS_FEEDS.length}`);
  if (failedFeeds.length > 0) {
    console.log(`❌ Failed feeds (${failedFeeds.length}):`);
    failedFeeds.forEach(f => console.log(`   - ${f.feed}: ${f.reason}`));
  }

  // Remove duplicates by normalized title (within this fetch only)
  const uniqueArticles = [];
  const seen = new Set();
  for (const article of allArticles) {
    const key = normalizeTitle(article.title);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    uniqueArticles.push(article);
  }

  // Sort by newest first
  uniqueArticles.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));

  cachedArticlePool = uniqueArticles;
  cachedAt = Date.now();

  const { selected, withImagesCount, withoutImagesCount } = buildSelectionFromPool(uniqueArticles);

  console.log(`📊 Total unique articles: ${uniqueArticles.length}`);
  console.log(`📸 Articles WITH images: ${withImagesCount}`);
  console.log(`📄 Articles WITHOUT images: ${withoutImagesCount}`);
  console.log(`🎯 Final articles returned: ${selected.length}`);
  console.log('✨ News fetch complete!\n');

  return selected;
}

// API: Get news WITHOUT summaries
app.get('/api/news', async (req, res) => {
  try {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n🔄 API REQUEST at ${timestamp}`);
    const forceFresh = isTruthy(req.query.fresh) || isTruthy(req.query.force);
    if (!forceFresh && cachedArticlePool.length > 0 && (Date.now() - cachedAt) < FEED_CACHE_TTL_MS) {
      const { selected } = buildSelectionFromPool(cachedArticlePool);
      return res.json({
        success: true,
        count: selected.length,
        articles: selected,
        fetchedAt: new Date(cachedAt).toLocaleTimeString(),
      });
    }

    let articles = await fetchAllNews();

    // If no articles from API, use mock data
    if (articles.length === 0) {
      console.log('⚠️  No articles from API, using mock data...');
      try {
        const mockData = JSON.parse(fs.readFileSync(path.join(__dirname, 'mock-news.json'), 'utf8'));
        articles = mockData.articles;
        console.log(`📦 Loaded ${articles.length} mock articles`);
      } catch (mockError) {
        console.error('Failed to load mock data:', mockError.message);
        return res.json({
          success: true,
          count: 0,
          articles: [],
        });
      }
    }

    res.json({
      success: true,
      count: articles.length,
      articles: articles,
      fetchedAt: timestamp,
    });
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// API: Summarize specific article - 6 line summary with Hindi translation
app.post('/api/summarize', async (req, res) => {
  try {
    let { text, includeHindi } = req.body;

    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    console.log('\n🔄 SUMMARIZATION REQUEST');
    console.log('📝 Original text length:', text.length);

    // Clean HTML from text
    text = cleanContent(text);
    console.log('✨ Cleaned text length:', text.length);

    if (text.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Text too short to summarize' });
    }

    console.log('🤖 STEP 1: Generating English summary...');
    const summary = await summarizeText(text);
    console.log('✅ English summary done');

    const shouldTranslate = includeHindi === undefined ? true : isTruthy(String(includeHindi));
    if (shouldTranslate) {
      console.log('🌐 STEP 2: Translating to Hindi...');
      const hindiSummary = await translateToHindi(summary);
      console.log('✅ Hindi translation done');
      return res.json({
        success: true,
        en: summary,
        hi: hindiSummary,
      });
    }

    res.json({
      success: true,
      en: summary,
    });
  } catch (error) {
    console.error('❌ SUMMARIZATION FAILED');
    console.error('Error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to summarize article. Make sure Ollama is running.',
    });
  }
});

// API: Translate text to Hindi (no summarization)
app.post('/api/translate', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, error: 'Text is required' });
    }

    console.log('\n🔄 TRANSLATION REQUEST');
    const hindiSummary = await translateToHindi(String(text));

    res.json({
      success: true,
      hi: hindiSummary,
    });
  } catch (error) {
    console.error('❌ TRANSLATION FAILED');
    console.error('Error:', error.message);

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to translate text. Make sure Ollama is running.',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running', ollama: 'http://localhost:11434' });
});

app.get('/', (req, res) => {
  res.json({ message: 'AI News Aggregator API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`🤖 Ollama at http://localhost:11434`);
  console.log(`📰 Configured to fetch up to ${MAX_ARTICLES} news articles`);
  console.log(`⚡ Feed fetch concurrency: ${FEED_CONCURRENCY} (cache TTL ${FEED_CACHE_TTL_MS / 1000}s)`);
  console.log(`✨ Summaries: 6-line format with Hindi translation`);
});
