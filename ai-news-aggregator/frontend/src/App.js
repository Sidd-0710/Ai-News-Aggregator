import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Loader, AlertCircle, Globe, Newspaper, ExternalLink, Calendar, Sparkles, X, Volume2, VolumeX } from 'lucide-react';
import axios from 'axios';
import './App.css';

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

  const API_URL = 'http://localhost:5000';

  const fetchNews = async ({ forceRefresh = false } = {}) => {
    setLoading(true);
    setError('');
    setSummaries({});
    setSelectedArticle(null);
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
      alert(`Translation error: ${errorMsg}`);
      console.error('Translation error:', err);
    } finally {
      setLoadingTranslation(prev => ({ ...prev, [index]: false }));
    }
  }, [summaries, loadingTranslation]);

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
      alert('Text-to-speech is not supported in this browser.');
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
      alert('Hindi voice not found on this device. Install a Hindi TTS voice in system settings.');
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
  }, [summaries, selectedLanguage, loadingTranslation, speakingKey, stopSpeech, getVoiceForLang]);

  const getSummary = async (index, description, title) => {
    if (summaries[index]) {
      setSelectedArticle(index);
      if (selectedLanguage === 'hi') {
        ensureHindiSummary(index);
      }
      return;
    }

    if (!description || description.trim().length < 20) {
      alert('Article description too short to summarize');
      return;
    }

    setLoadingSummary(prev => ({ ...prev, [index]: true }));
    try {
      console.log('⏳ Requesting AI summary...');
      const response = await axios.post(`${API_URL}/api/summarize`, {
        text: description,
        includeHindi: selectedLanguage === 'hi',
      }, { timeout: 120000 });

      console.log('✅ Summary received');
      setSummaries(prev => ({
        ...prev,
        [index]: {
          en: response.data.en,
          hi: response.data.hi || '',
          title: title,
        },
      }));
      setSelectedArticle(index);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message;
      alert(`Error: ${errorMsg}`);
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

  const getCategoryBgColor = (category) => {
    const colors = {
      'Tech': 'bg-blue-100 text-blue-800',
      'Security': 'bg-red-100 text-red-800',
      'AI & Tech': 'bg-purple-100 text-purple-800',
      'Business': 'bg-green-100 text-green-800',
      'AI': 'bg-indigo-100 text-indigo-800',
      'General': 'bg-gray-100 text-gray-800',
    };
    return colors[category] || 'bg-blue-100 text-blue-800';
  };

  const getFallbackThumbnail = (article) => {
    const label = (article.category || article.source || 'News').trim().slice(0, 28);
    return `https://placehold.co/600x400/0f172a/e2e8f0?text=${encodeURIComponent(label)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-purple-500/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Newspaper className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white">
                  AI News<span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Hub</span>
                </h1>
                <p className="text-xs text-gray-400">6-Line AI Summaries</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {/* Language Selector */}
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-md px-4 py-2.5 rounded-lg border border-purple-500/30 hover:border-purple-500/60 transition-all">
                <Globe className="w-5 h-5 text-purple-400" />
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="bg-transparent text-white text-sm font-semibold focus:outline-none cursor-pointer"
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="hi">🇮🇳 हिंदी</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => fetchNews({ forceRefresh: true })}
                disabled={loading}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-300 font-semibold">Error</h3>
              <p className="text-red-200 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
              <p className="text-white text-xl font-semibold">Loading News...</p>
              <p className="text-gray-400 text-sm mt-2">Fetching 20+ articles</p>
            </div>
          </div>
        )}

        {/* Articles Grid */}
        {!loading && articles.length > 0 && (
          <>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-white">Latest News</h2>
                <p className="text-gray-400 text-sm mt-1">
                  {articles.length} articles • Click "Get Summary" for 6-line AI summaries
                </p>
              </div>
              {fetchedAt && (
                <div className="text-xs text-gray-400 sm:text-right">
                  Updated at <span className="text-purple-300 font-semibold">{fetchedAt}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
              {articles.map((article, index) => (
                <article
                  key={index}
                  className="group bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 hover:border-purple-400/60 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25 hover:-translate-y-2 flex flex-col h-full"
                >
                  {/* Thumbnail Image */}
                  <div className="h-52 bg-gradient-to-br from-purple-400 to-pink-400 overflow-hidden relative">
                    <img
                      src={article.image || getFallbackThumbnail(article)}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        if (e.currentTarget.dataset.fallbackApplied) return;
                        e.currentTarget.dataset.fallbackApplied = 'true';
                        e.currentTarget.src = getFallbackThumbnail(article);
                      }}
                    />
                    {/* Category Badge on Image */}
                    <div className="absolute top-3 left-3">
                      <span className={`inline-block px-3 py-1 ${getCategoryBgColor(article.category)} text-xs font-bold rounded-full shadow-sm`}>
                        {article.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-6 flex flex-col flex-1">
                    {/* Date */}
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-2">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(article.pubDate)}
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-bold text-white mb-3 line-clamp-2 group-hover:text-purple-200 transition-colors">
                      {article.title}
                    </h2>

                    {/* Description Preview */}
                    <p className="text-sm text-gray-300 line-clamp-2 mb-4 flex-1">
                      {article.description}
                    </p>

                    {/* Source */}
                    <p className="text-xs text-gray-500 mb-4">
                      📰 <span className="text-purple-400">{article.source}</span>
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-auto">
                      {/* Get Summary Button */}
                      <button
                        onClick={() => getSummary(index, article.description, article.title)}
                        disabled={loadingSummary[index]}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-2.5 rounded-lg font-semibold transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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

                      {/* Read More Button */}
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 px-3 rounded-lg font-semibold transition-all text-sm border border-white/20"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">Read</span>
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && articles.length === 0 && !error && (
          <div className="text-center py-16">
            <Newspaper className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg font-medium">No articles found</p>
            <p className="text-gray-500 text-sm mt-2">Click refresh to load news</p>
          </div>
        )}
      </main>

      {/* Summary Modal */}
      {selectedArticle !== null && summaries[selectedArticle] && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gradient-to-br from-slate-900 to-purple-900 rounded-3xl w-full max-w-4xl border border-purple-500/30 shadow-2xl my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-8 flex items-start justify-between rounded-t-3xl">
              <div className="flex-1 pr-4">
                <h2 className="text-3xl font-bold text-white leading-tight">
                  {summaries[selectedArticle].title}
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-all flex-shrink-0 ml-4"
              >
                <X className="w-8 h-8" />
              </button>
            </div>

            {/* Modal Content */}
              <div className="p-8 max-h-96 overflow-y-auto">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                    <Sparkles className="w-6 h-6" />
                    {selectedLanguage === 'en' ? '✨ 6-LINE AI SUMMARY' : '✨ 6-पंक्ति AI सारांश'}
                  </h3>
                  <div className="text-white text-xl leading-relaxed bg-white/5 p-8 rounded-2xl border-2 border-purple-500/50 whitespace-pre-wrap break-words font-medium">
                    {selectedLanguage === 'en' && summaries[selectedArticle].en}
                    {selectedLanguage === 'hi' && loadingTranslation[selectedArticle] && (
                      <span className="inline-flex items-center gap-2 text-purple-200">
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
            <div className="border-t border-white/10 p-8 flex flex-col gap-4 bg-black/20 sm:flex-row">
              <button
                onClick={() => speakSummary(selectedArticle)}
                disabled={selectedLanguage === 'hi' && loadingTranslation[selectedArticle]}
                className="flex-1 bg-white/10 hover:bg-white/20 text-white py-3 rounded-lg font-semibold transition-all text-lg border border-white/20 flex items-center justify-center gap-2 disabled:opacity-50"
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
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-all text-lg"
              >
                Close
              </button>
              <a
                href={articles[selectedArticle]?.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-lg"
              >
                Read Full Article
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/50 backdrop-blur-md mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-gray-400 text-sm">
          <p>🤖 AI News Hub • 6-Line AI Summaries • Powered by Ollama & RSS Feeds</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
