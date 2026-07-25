import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader, AlertCircle, Globe, Newspaper, ArrowUpRight, Calendar, Sparkles, X, Volume2, VolumeX, Layers, Eye, Search, Flame, Radio } from 'lucide-react';
import axios from 'axios';
import './App.css';

const WATCH_HISTORY_KEY = 'newsWatchHistory';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'onto', 'are', 'was', 'were',
  'will', 'would', 'could', 'should', 'about', 'after', 'before', 'over', 'under', 'between',
  'more', 'less', 'than', 'has', 'have', 'had', 'but', 'not', 'your', 'you', 'their', 'they',
  'his', 'her', 'our', 'out', 'off', 'new', 'why', 'how', 'what', 'when', 'where', 'which',
  'said', 'says', 'say', 'just', 'also', 'like', 'its', 'it', 'as', 'in', 'on', 'of', 'to',
]);

const normalizeText = (text) => (text || '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokenizeText = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !STOP_WORDS.has(token));
};

const getTitleTokens = (article) => tokenizeText(article?.title);
const getDescTokens = (article) => tokenizeText(article?.description);

const getBigrams = (text) => {
  const normalized = normalizeText(text);
  if (normalized.length < 2) return [];
  const bigrams = [];
  for (let i = 0; i < normalized.length - 1; i += 1) {
    bigrams.push(normalized.slice(i, i + 2));
  }
  return bigrams;
};

const diceCoefficient = (a, b) => {
  const aBigrams = getBigrams(a);
  const bBigrams = getBigrams(b);
  if (!aBigrams.length || !bBigrams.length) return 0;
  const bMap = new Map();
  bBigrams.forEach((gram) => bMap.set(gram, (bMap.get(gram) || 0) + 1));
  let matches = 0;
  aBigrams.forEach((gram) => {
    const count = bMap.get(gram) || 0;
    if (count > 0) {
      matches += 1;
      bMap.set(gram, count - 1);
    }
  });
  return (2 * matches) / (aBigrams.length + bBigrams.length);
};

const jaccardSimilarity = (aTokens, bTokens) => {
  if (!aTokens.length || !bTokens.length) return 0;
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let intersection = 0;
  aSet.forEach(token => {
    if (bSet.has(token)) intersection += 1;
  });
  const union = new Set([...aSet, ...bSet]).size;
  return union ? intersection / union : 0;
};

const countSharedTokens = (aTokens, bTokens) => {
  const aSet = new Set(aTokens);
  const bSet = new Set(bTokens);
  let count = 0;
  aSet.forEach(token => {
    if (bSet.has(token)) count += 1;
  });
  return count;
};

const getArticleKey = (article) => article?.link || article?.title || article?.pubDate || '';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CATEGORY_ORDER = ['Technology', 'Science', 'Business', 'Health', 'India', 'World', 'Entertainment', 'Sports', 'General'];

// One accent dot color per category — used on chips instead of soft pastel fills,
// keeps the card surfaces flat and lets typography carry the hierarchy.
const CATEGORY_DOT_COLORS = {
  Technology: '#2563eb',
  Science: '#0d9488',
  Business: '#16a34a',
  Health: '#db2777',
  India: '#d97706',
  World: '#7c3aed',
  Entertainment: '#e11d48',
  Sports: '#ea580c',
  Tech: '#2563eb',
  Security: '#dc2626',
  'AI & Tech': '#4f46e5',
  AI: '#4f46e5',
  General: '#57534e',
};

const getCategoryDotColor = (category) => CATEGORY_DOT_COLORS[category] || '#57534e';

// Credibility is rendered as a small filled meter rather than a soft badge —
// the bar color itself carries the tier, so labels stay purely informational.
const getCredibilityTone = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return { label: 'Unscored', bar: 'bg-ink/15', text: 'text-ink/40' };
  }
  if (score >= 80) {
    return { label: 'High', bar: 'bg-ink', text: 'text-ink' };
  }
  if (score >= 60) {
    return { label: 'Medium', bar: 'bg-signal', text: 'text-signal' };
  }
  return { label: 'Low', bar: 'bg-red-600', text: 'text-red-600' };
};

const CredibilityMeter = ({ score, size = 'sm' }) => {
  const tone = getCredibilityTone(score);
  const pct = typeof score === 'number' && !Number.isNaN(score) ? Math.max(4, score) : 0;
  const width = size === 'lg' ? 'w-16' : 'w-9';
  return (
    <span className="inline-flex items-center gap-1.5" title={`Credibility ${typeof score === 'number' ? score : '—'}/100 (${tone.label})`}>
      <span className={`h-2 ${width} border border-ink/50 bg-paper overflow-hidden`}>
        <span className={`block h-full ${tone.bar}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`font-mono text-[10px] font-medium ${tone.text}`}>
        {typeof score === 'number' ? score : '—'}
      </span>
    </span>
  );
};

function App() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [summaries, setSummaries] = useState({});
  const [loadingSummary, setLoadingSummary] = useState({});
  const [loadingTranslation, setLoadingTranslation] = useState({});
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [fetchedAt, setFetchedAt] = useState('');
  const [speakingKey, setSpeakingKey] = useState(null);
  const [ttsVoices, setTtsVoices] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [compareTarget, setCompareTarget] = useState(null);
  const [watchCounts, setWatchCounts] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    if (typeof window !== 'undefined') {
      window.clearTimeout(showToast.timer);
      showToast.timer = window.setTimeout(() => setToast(null), 5000);
    }
  }, []);

  const fetchNews = async ({ forceRefresh = false } = {}) => {
    setLoading(true);
    setError('');
    setSummaries({});
    setSelectedArticle(null);
    setCompareTarget(null);
    try {
      const response = await axios.get(`${API_URL}/api/news`, {
        params: {
          fresh: forceRefresh ? '1' : undefined,
          t: forceRefresh ? Date.now() : undefined,
        },
      });
      setArticles(response.data.articles);
      setFetchedAt(response.data.fetchedAt || '');
      console.log('✅ Fresh news loaded:', response.data.articles.length, 'articles');
    } catch (err) {
      setError('Failed to fetch news. Make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(WATCH_HISTORY_KEY);
      if (stored) {
        setWatchCounts(JSON.parse(stored));
      }
    } catch {
      // Corrupt history shouldn't break the app — start fresh
      window.localStorage.removeItem(WATCH_HISTORY_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(watchCounts));
  }, [watchCounts]);

  const incrementWatchCount = useCallback((article) => {
    const key = getArticleKey(article);
    if (!key) return;
    setWatchCounts(prev => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }));
  }, []);

  const getWatchCount = useCallback((article) => {
    const key = getArticleKey(article);
    return key ? (watchCounts[key] || 0) : 0;
  }, [watchCounts]);

  const normalizedQuery = useMemo(() => normalizeText(searchQuery), [searchQuery]);

  const ensureHindiSummary = useCallback(async (index) => {
    const summary = summaries[index];
    if (!summary || summary.hi || loadingTranslation[index]) {
      return;
    }

    setLoadingTranslation(prev => ({ ...prev, [index]: true }));
    try {
      console.log('⏳ Requesting Hindi translation...');
      const response = await axios.post(`${API_URL}/api/translate`, {
        text: summary.en,
      }, { timeout: 60000 });

      setSummaries(prev => ({
        ...prev,
        [index]: {
          ...prev[index],
          hi: response.data.hi,
        },
      }));
      console.log('✅ Hindi translation received');
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      showToast(`Translation error: ${errorMsg}`);
      console.error('Translation error:', err);
    } finally {
      setLoadingTranslation(prev => ({ ...prev, [index]: false }));
    }
  }, [summaries, loadingTranslation, showToast]);

  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeakingKey(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      return undefined;
    }

    const loadVoices = () => {
      setTtsVoices(window.speechSynthesis.getVoices());
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const getVoiceForLang = useCallback((langPrefix) => {
    if (!ttsVoices.length) return null;
    const normalized = langPrefix.toLowerCase();
    const byLang = ttsVoices.filter(voice => voice.lang?.toLowerCase().startsWith(normalized));
    return byLang.find(voice => voice.localService) || byLang[0] || null;
  }, [ttsVoices]);

  const speakSummary = useCallback((index) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      showToast('Text-to-speech is not supported in this browser.');
      return;
    }

    const summary = summaries[index];
    if (!summary) return;

    if (selectedLanguage === 'hi' && loadingTranslation[index]) {
      return;
    }

    const text = selectedLanguage === 'en' ? summary.en : summary.hi;
    if (!text) return;

    const key = `${index}-${selectedLanguage}`;
    if (speakingKey === key) {
      stopSpeech();
      return;
    }

    const preferredVoice = selectedLanguage === 'hi'
      ? getVoiceForLang('hi')
      : getVoiceForLang('en');

    if (selectedLanguage === 'hi' && !preferredVoice) {
      showToast('Hindi voice not found on this device. Install a Hindi TTS voice in system settings.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = preferredVoice?.lang || (selectedLanguage === 'hi' ? 'hi-IN' : 'en-US');
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    utterance.rate = 1;
    utterance.onend = () => setSpeakingKey(null);
    utterance.onerror = () => setSpeakingKey(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingKey(key);
  }, [summaries, selectedLanguage, loadingTranslation, speakingKey, stopSpeech, getVoiceForLang, showToast]);

  const getSummary = async (index, article) => {
    if (!article) return;
    incrementWatchCount(article);

    if (summaries[index]) {
      setSelectedArticle(index);
      if (selectedLanguage === 'hi') {
        ensureHindiSummary(index);
      }
      return;
    }

    if (!article.description || article.description.trim().length < 20) {
      showToast('Article description too short to summarize');
      return;
    }

    setLoadingSummary(prev => ({ ...prev, [index]: true }));
    try {
      console.log('⏳ Requesting AI summary...');
      const response = await axios.post(`${API_URL}/api/summarize`, {
        text: article.description,
        includeHindi: selectedLanguage === 'hi',
      }, { timeout: 120000 });

      console.log('✅ Summary received');
      setSummaries(prev => ({
        ...prev,
        [index]: {
          en: response.data.en,
          hi: response.data.hi || '',
          title: article.title,
        },
      }));
      setSelectedArticle(index);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      showToast(`Summary error: ${errorMsg}`);
      console.error('Summary error:', err);
    } finally {
      setLoadingSummary(prev => ({ ...prev, [index]: false }));
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (selectedLanguage === 'hi' && selectedArticle !== null) {
      ensureHindiSummary(selectedArticle);
    }
  }, [selectedLanguage, selectedArticle, ensureHindiSummary]);

  useEffect(() => {
    stopSpeech();
  }, [selectedArticle, selectedLanguage, stopSpeech]);

  const categories = useMemo(() => {
    const unique = new Set(articles.map(article => article.category).filter(Boolean));
    if (!unique.size) return ['Trending', 'All'];
    const ordered = CATEGORY_ORDER.filter(category => unique.has(category));
    const remaining = Array.from(unique).filter(category => !ordered.includes(category)).sort();
    return ['Trending', 'All', ...ordered, ...remaining];
  }, [articles]);

  const trendingArticles = useMemo(() => (
    articles
      .map((article, index) => ({ article, index, count: getWatchCount(article) }))
      .filter(({ count }) => count > 0)
      .sort((a, b) => b.count - a.count)
  ), [articles, getWatchCount]);

  const recentArticles = useMemo(() => (
    articles
      .map((article, index) => ({ article, index }))
      .sort((a, b) => {
        const aTime = a.article.pubDate ? new Date(a.article.pubDate).getTime() : 0;
        const bTime = b.article.pubDate ? new Date(b.article.pubDate).getTime() : 0;
        return bTime - aTime;
      })
  ), [articles]);

  const hasTrendingHistory = trendingArticles.length > 0;

  const visibleArticles = useMemo(() => {
    const baseList = selectedCategory === 'Trending'
      ? (hasTrendingHistory
        ? trendingArticles.map(({ article, index }) => ({ article, index }))
        : recentArticles.slice(0, 12))
      : articles
        .map((article, index) => ({ article, index }))
        .filter(({ article }) =>
          selectedCategory === 'All' || article.category === selectedCategory
        );

    if (!normalizedQuery) {
      return baseList;
    }

    return baseList.filter(({ article }) => {
      const haystack = normalizeText(
        `${article.title || ''} ${article.description || ''} ${article.source || ''} ${article.category || ''}`
      );
      return haystack.includes(normalizedQuery);
    });
  }, [articles, selectedCategory, trendingArticles, recentArticles, hasTrendingHistory, normalizedQuery]);

  const compareResults = useMemo(() => {
    if (compareTarget === null || !articles[compareTarget]) return [];
    const targetArticle = articles[compareTarget];
    const targetTitleTokens = getTitleTokens(targetArticle);
    const targetDescTokens = getDescTokens(targetArticle);
    if (!targetTitleTokens.length) return [];
    const targetTitle = targetArticle.title || '';
    const targetDate = targetArticle.pubDate ? new Date(targetArticle.pubDate) : null;

    return articles
      .map((article, index) => {
        if (index === compareTarget) return null;
        if (article.source === targetArticle.source) return null;
        if (article.link && article.link === targetArticle.link) return null;

        const titleTokens = getTitleTokens(article);
        const descTokens = getDescTokens(article);
        if (!titleTokens.length) return null;

        const sharedTitleCount = countSharedTokens(targetTitleTokens, titleTokens);
        if (sharedTitleCount < 2) return null;

        const titleDice = diceCoefficient(targetTitle, article.title);
        const titleJaccard = jaccardSimilarity(targetTitleTokens, titleTokens);
        const descJaccard = jaccardSimilarity(targetDescTokens, descTokens);
        const isSameCategory = article.category === targetArticle.category;
        const categoryBoost = isSameCategory ? 0.05 : 0;

        let timeBoost = 0;
        if (targetDate && article.pubDate) {
          const articleDate = new Date(article.pubDate);
          const diffDays = Math.abs(articleDate - targetDate) / (1000 * 60 * 60 * 24);
          if (!Number.isNaN(diffDays) && diffDays <= 7) {
            timeBoost = 0.05;
          }
        }

        const score = (titleDice * 0.6) + (titleJaccard * 0.3) + (descJaccard * 0.1) + categoryBoost + timeBoost;
        if (score < 0.35) return null;
        if (titleDice < 0.3 && titleJaccard < 0.3) return null;

        return { article, index, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [articles, compareTarget]);

  useEffect(() => {
    if (selectedCategory !== 'All' && selectedCategory !== 'Trending' && !categories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [categories, selectedCategory]);

  const handleOpenCompare = (index) => {
    stopSpeech();
    setSelectedArticle(null);
    setCompareTarget(index);
  };

  const handleCloseCompare = () => {
    setCompareTarget(null);
  };

  const handleCloseModal = () => {
    stopSpeech();
    setSelectedArticle(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getFallbackThumbnail = (article) => {
    const label = (article.category || article.source || 'News').trim().slice(0, 28);
    return `https://placehold.co/600x400/141311/f7f2e7?text=${encodeURIComponent(label)}`;
  };

  const selectedCredibility = selectedArticle !== null ? articles[selectedArticle]?.credibilityScore : undefined;
  const selectedCredibilityTone = getCredibilityTone(selectedCredibility);

  return (
    <div className="min-h-screen bg-paper text-ink font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-ink text-paper border-b-4 border-ink">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-signal border-2 border-paper">
                <Newspaper className="w-5 h-5 text-paper" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight leading-none">
                  Signal<span className="text-signal">.</span>
                </h1>
                <p className="text-[10px] font-mono uppercase tracking-widest text-paper/50 mt-0.5">
                  AI-summarized news, not noise
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {fetchedAt && (
                <div className="hidden md:flex items-center gap-1.5 font-mono text-[11px] text-paper/60 uppercase tracking-wide">
                  <Radio className="w-3.5 h-3.5 text-signal animate-pulse" />
                  Synced {fetchedAt}
                </div>
              )}

              {/* Language Selector */}
              <div className="flex items-center gap-2 bg-ink border-2 border-paper/30 hover:border-paper px-3 py-2 transition-colors">
                <Globe className="w-4 h-4 text-paper/70" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-paper text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="en" className="text-ink">EN English</option>
                  <option value="hi" className="text-ink">HI हिंदी</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchNews({ forceRefresh: true })}
                disabled={loading}
                className="hard-press flex items-center gap-2 bg-signal hover:bg-paper hover:text-ink text-paper px-4 py-2 font-bold text-sm uppercase tracking-wide border-2 border-signal transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-hard-sm"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tagline strip */}
      <div className="dot-grid border-b-2 border-ink/10 bg-paper-dim">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="font-display text-2xl sm:text-3xl leading-snug max-w-3xl">
            Local AI reads the wire so you don&apos;t have to.
            <span className="text-signal"> Six-line summaries</span>, credibility scores, and cross-source comparisons.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-paper border-2 border-signal shadow-hard-sm flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-signal flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-ink font-bold uppercase text-sm tracking-wide">Error</h3>
              <p className="text-ink/70 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-14 h-14 text-signal animate-spin mx-auto mb-4" />
              <p className="text-ink text-xl font-display font-semibold">Tuning into the feed...</p>
              <p className="text-ink/50 text-sm mt-2 font-mono">fetching articles across 8 categories</p>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && articles.length > 0 && (
          <>
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search news, sources, or topics..."
                  className="w-full border-2 border-ink bg-paper py-3 pl-11 pr-16 text-sm text-ink placeholder:text-ink/40 focus:outline-none focus:shadow-hard-sm transition-shadow"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold uppercase text-ink/50 hover:text-signal"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="font-mono text-xs text-ink/50 sm:text-right whitespace-nowrap">
                {visibleArticles.length} result{visibleArticles.length === 1 ? '' : 's'}
              </div>
            </div>

            <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`hard-press whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wide border-2 transition-colors ${
                    selectedCategory === category
                      ? 'bg-signal text-paper border-signal shadow-hard-sm'
                      : 'bg-paper text-ink border-ink hover:bg-ink hover:text-paper'
                  }`}
                >
                  {category === 'Trending' && <Flame className="w-3.5 h-3.5" />}
                  {category}
                </button>
              ))}
            </div>

            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b-2 border-ink pb-4">
              <div>
                <h2 className="text-3xl font-display font-bold text-ink">
                  {selectedCategory === 'All' || selectedCategory === 'Trending'
                    ? 'The Feed'
                    : selectedCategory}
                  {selectedCategory === 'Trending' && !hasTrendingHistory && (
                    <span className="text-ink/40 text-lg font-sans font-normal"> — no history yet</span>
                  )}
                </h2>
                <p className="text-ink/50 text-sm mt-1 font-mono">
                  {selectedCategory === 'Trending' && !hasTrendingHistory
                    ? 'showing latest instead — open a summary or read an article to build history'
                    : 'tap "Get Summary" for a 6-line AI read'}
                </p>
              </div>
            </div>

            {visibleArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleArticles.map(({ article, index }) => {
                  const watchCount = getWatchCount(article);
                  const dotColor = getCategoryDotColor(article.category);
                  return (
                    <article
                      key={article.link || index}
                      className="group bg-white border-[3px] border-ink overflow-hidden flex flex-col h-full transition-all duration-150 shadow-hard hover:shadow-hard-lg hover:-translate-x-1 hover:-translate-y-1"
                    >
                    {/* Thumbnail Image */}
                    <div className="h-48 bg-ink overflow-hidden relative border-b-[3px] border-ink">
                      <img
                        src={article.image || getFallbackThumbnail(article)}
                        alt={article.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          if (e.currentTarget.dataset.fallbackApplied) return;
                          e.currentTarget.dataset.fallbackApplied = 'true';
                          e.currentTarget.src = getFallbackThumbnail(article);
                        }}
                      />
                      {/* Category Badge on Image */}
                      <div className="absolute top-3 left-3">
                        <span className="inline-flex items-center gap-1.5 border-2 border-ink bg-paper px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ink">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: dotColor }} />
                          {article.category}
                        </span>
                      </div>
                      {watchCount >= 3 && (
                        <div className="absolute top-3 right-3">
                          <span className="inline-flex items-center gap-1 border-2 border-ink bg-signal px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-paper">
                            <Flame className="w-3 h-3" />
                            Hot
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex flex-col flex-1">
                    {/* Date */}
                    <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wide text-ink/50 mb-2.5">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(article.pubDate)}
                      </div>
                      <div className="flex items-center gap-3">
                        {watchCount > 0 && (
                          <div className="flex items-center gap-1 text-ink/60">
                            <Eye className="w-3.5 h-3.5" />
                            {watchCount}
                          </div>
                        )}
                        {typeof article.credibilityScore === 'number' && (
                          <CredibilityMeter score={article.credibilityScore} />
                        )}
                      </div>
                    </div>

                      {/* Title */}
                      <h2 className="text-lg font-display font-bold text-ink mb-2.5 line-clamp-2 group-hover:text-signal transition-colors leading-snug">
                        {article.title}
                      </h2>

                      {/* Description Preview */}
                      <p className="text-sm text-ink/70 line-clamp-2 mb-4 flex-1">
                        {article.description}
                      </p>

                      {/* Source */}
                      <p className="text-[11px] font-mono uppercase tracking-wide text-ink/50 mb-4">
                        {article.source}
                      </p>

                      {/* Buttons */}
                      <div className="flex gap-2 mt-auto">
                        {/* Get Summary Button */}
                        <button
                          onClick={() => getSummary(index, article)}
                          disabled={loadingSummary[index]}
                          className="hard-press flex-1 inline-flex items-center justify-center gap-2 bg-ink hover:bg-signal text-paper py-2.5 font-bold uppercase tracking-wide transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed border-2 border-ink"
                        >
                          {loadingSummary[index] ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              <span className="hidden sm:inline">Summarizing...</span>
                            </>
                          ) : summaries[index] ? (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span className="hidden sm:inline">View Summary</span>
                              <span className="sm:hidden">View</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              <span className="hidden sm:inline">Get Summary</span>
                              <span className="sm:hidden">Summary</span>
                            </>
                          )}
                        </button>

                        {/* Compare Sources Button */}
                        <button
                          onClick={() => handleOpenCompare(index)}
                          className="hard-press flex items-center justify-center gap-2 bg-paper hover:bg-ink hover:text-paper text-ink py-2.5 px-3 font-bold transition-colors text-xs border-2 border-ink"
                          title="Compare sources"
                        >
                          <Layers className="w-4 h-4" />
                        </button>

                        {/* Read More Button */}
                        <a
                          href={article.link}
                          onClick={() => incrementWatchCount(article)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hard-press flex items-center justify-center gap-2 bg-paper hover:bg-ink hover:text-paper text-ink py-2.5 px-3 font-bold transition-colors text-xs border-2 border-ink"
                          title="Read full article"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-ink/20">
                <Newspaper className="w-14 h-14 text-ink/20 mx-auto mb-4" />
                <p className="text-ink/70 text-lg font-display font-semibold">
                  {normalizedQuery
                    ? `No results for "${searchQuery}"`
                    : selectedCategory === 'Trending'
                      ? 'No trending articles yet'
                      : `No articles found in ${selectedCategory}`}
                </p>
                <p className="text-ink/40 text-sm mt-2 font-mono">
                  {normalizedQuery
                    ? 'try a different keyword or clear the search'
                    : selectedCategory === 'Trending'
                      ? 'open summaries or click read to build watch history'
                      : 'try another category or refresh'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && !error && (
          <div className="text-center py-16 border-2 border-dashed border-ink/20">
            <Newspaper className="w-14 h-14 text-ink/20 mx-auto mb-4" />
            <p className="text-ink/70 text-lg font-display font-semibold">No articles found</p>
            <p className="text-ink/40 text-sm mt-2 font-mono">click refresh to load news</p>
          </div>
        )}
      </main>

      {/* Compare Sources Modal */}
      {compareTarget !== null && articles[compareTarget] && (
        <div className="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-paper w-full max-w-4xl border-[3px] border-ink shadow-hard-lg my-auto">
            {/* Modal Header */}
            <div className="bg-ink text-paper p-8 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="text-3xl font-display font-bold leading-tight">
                  Compare Coverage
                </h2>
                <p className="text-paper/60 text-xs font-mono uppercase tracking-wide mt-2">
                  Similar reporting from other outlets
                </p>
              </div>
              <button
                onClick={handleCloseCompare}
                className="hard-press text-paper hover:bg-signal border-2 border-paper/30 hover:border-signal p-2 transition-colors flex-shrink-0 ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 max-h-[32rem] overflow-y-auto">
              <div className="bg-white border-2 border-ink p-6 mb-6">
                <p className="text-[11px] font-mono uppercase tracking-wide text-signal font-bold mb-2">Selected Article</p>
                <h3 className="text-xl font-display font-semibold text-ink mb-2">
                  {articles[compareTarget].title}
                </h3>
                <p className="text-sm font-mono text-ink/50">
                  {articles[compareTarget].source} • {articles[compareTarget].category}
                </p>
              </div>

              {compareResults.length > 0 ? (
                <div className="space-y-4">
                  {compareResults.map(({ article }) => (
                    <div
                      key={`${article.link || article.title}-${article.pubDate || ''}`}
                      className="bg-white border-2 border-ink/20 hover:border-ink transition-colors p-5 flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-mono uppercase tracking-wide text-ink/50">
                            {article.source} • {article.category}
                          </p>
                          <h4 className="text-lg font-display font-semibold text-ink mt-1">
                            {article.title}
                          </h4>
                        </div>
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-bold uppercase tracking-wide text-ink hover:text-signal flex-shrink-0"
                        >
                          Read
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-sm text-ink/70 line-clamp-2">
                        {article.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-ink/20">
                  <Newspaper className="w-12 h-12 text-ink/20 mx-auto mb-4" />
                  <p className="text-ink/70 text-lg font-display font-semibold">No similar sources found yet</p>
                  <p className="text-ink/40 text-sm mt-2 font-mono">try refreshing for more articles</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-ink p-6 flex flex-col gap-4 bg-paper-dim sm:flex-row">
              <button
                onClick={handleCloseCompare}
                className="hard-press flex-1 bg-paper border-2 border-ink hover:bg-ink hover:text-paper text-ink py-3 font-bold uppercase tracking-wide transition-colors"
              >
                Close
              </button>
              <a
                href={articles[compareTarget]?.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hard-press flex-1 bg-signal border-2 border-signal hover:bg-ink hover:border-ink text-paper py-3 font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                Read Full Article
                <ArrowUpRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Summary Modal */}
      {selectedArticle !== null && summaries[selectedArticle] && (
        <div className="fixed inset-0 bg-ink/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-paper w-full max-w-4xl border-[3px] border-ink shadow-hard-lg my-auto">
            {/* Modal Header */}
            <div className="bg-ink text-paper p-8 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="text-3xl font-display font-bold leading-tight">
                  {summaries[selectedArticle].title}
                </h2>
                {typeof selectedCredibility === 'number' && (
                  <div className="mt-4 inline-flex items-center gap-2 bg-paper/10 border border-paper/30 px-3 py-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wide text-paper/70">Credibility</span>
                    <span className="h-2 w-16 border border-paper/40 bg-ink overflow-hidden">
                      <span
                        className={`block h-full ${selectedCredibilityTone.label === 'Low' ? 'bg-red-500' : 'bg-signal'}`}
                        style={{ width: `${Math.max(4, selectedCredibility)}%` }}
                      />
                    </span>
                    <span className="text-[11px] font-mono font-bold text-paper">
                      {selectedCredibility}/100 · {selectedCredibilityTone.label}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="hard-press text-paper hover:bg-signal border-2 border-paper/30 hover:border-signal p-2 transition-colors flex-shrink-0 ml-4"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
              <div className="p-8 max-h-96 overflow-y-auto">
                <div className="mb-2">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-signal mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    {selectedLanguage === 'en' ? '6-Line AI Summary' : '6-पंक्ति AI सारांश'}
                  </h3>
                  <div className="text-ink text-xl leading-relaxed bg-white p-8 border-l-[6px] border-signal border-y-2 border-r-2 border-ink/10 whitespace-pre-wrap break-words font-display">
                    {selectedLanguage === 'en' && summaries[selectedArticle].en}
                    {selectedLanguage === 'hi' && loadingTranslation[selectedArticle] && (
                      <span className="inline-flex items-center gap-2 text-ink/60 font-sans text-base">
                        <Loader className="w-5 h-5 animate-spin" />
                        Translating to Hindi...
                      </span>
                    )}
                    {selectedLanguage === 'hi' && !loadingTranslation[selectedArticle] && (
                      summaries[selectedArticle].hi || 'Hindi summary not available yet.'
                    )}
                  </div>
                </div>
              </div>

            {/* Modal Footer */}
            <div className="border-t-2 border-ink p-6 flex flex-col gap-4 bg-paper-dim sm:flex-row">
              <button
                onClick={() => speakSummary(selectedArticle)}
                disabled={selectedLanguage === 'hi' && loadingTranslation[selectedArticle]}
                className="hard-press flex-1 bg-paper border-2 border-ink hover:bg-ink hover:text-paper text-ink py-3 font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {speakingKey === `${selectedArticle}-${selectedLanguage}` ? (
                  <>
                    <VolumeX className="w-5 h-5" />
                    Stop
                  </>
                ) : (
                  <>
                    <Volume2 className="w-5 h-5" />
                    Speak Summary
                  </>
                )}
              </button>
              <button
                onClick={handleCloseModal}
                className="hard-press flex-1 bg-paper border-2 border-ink hover:bg-ink hover:text-paper text-ink py-3 font-bold uppercase tracking-wide transition-colors"
              >
                Close
              </button>
              <a
                href={articles[selectedArticle]?.link}
                target="_blank"
                rel="noopener noreferrer"
                className="hard-press flex-1 bg-signal border-2 border-signal hover:bg-ink hover:border-ink text-paper py-3 font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
              >
                Read Full Article
                <ArrowUpRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] max-w-md w-[calc(100%-2rem)]">
          <div className="flex items-start gap-3 border-2 border-signal bg-ink px-5 py-4 shadow-hard">
            <AlertCircle className="w-5 h-5 text-signal flex-shrink-0 mt-0.5" />
            <p className="text-sm text-paper flex-1">{toast}</p>
            <button
              onClick={() => setToast(null)}
              className="text-paper/50 hover:text-signal flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t-4 border-ink bg-ink text-paper/60 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center font-mono text-xs uppercase tracking-widest">
          <p>Signal — Six-line AI summaries · Powered by Ollama &amp; RSS</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
