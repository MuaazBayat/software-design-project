'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Shuffle, Globe, RotateCw, Brain, Check, X, Trophy, HelpCircle, Users, Heart, Sparkles, Map as MapIcon } from 'lucide-react';
import Image from 'next/image';
import wc from 'world-countries';
import { useSyncProfile } from '@/lib/context/ProfileContext';
import MessagingApiClient, { SearchUsersResponse } from '@/lib/MessagingApiClient';

// Screen reader only CSS utility
const srOnlyStyles = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: '0'
};

interface CountryFacts {
  emoji: string;
  facts: string[];
}
interface FactsData {
  [country: string]: CountryFacts;
}

interface QuizQuestion {
  type: 'multiple_choice';
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  hint: string;
  explanation: string;
}

interface QuizData {
  exercises: QuizQuestion[];
}

type QuizState = 'idle' | 'loading' | 'active' | 'completed';

interface QuizResult {
  questionIndex: number;
  selectedAnswer: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean;
}

/** ---------- Name → ISO Alpha-2 resolver (robust) ---------- */
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|of|and|republic|kingdom|federation|state|states|democratic|people|islamic|united)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const buildCountryIndex = () => {
  const map = new Map<string, string>();
  for (const c of wc) {
    const code = (c.cca2 || '').toUpperCase();
    if (!code) continue;

    const candidates: string[] = [];
    if (c.name?.common) candidates.push(c.name.common);
    if (c.name?.official) candidates.push(c.name.official);
    if (Array.isArray(c.altSpellings)) candidates.push(...c.altSpellings);

    if (c.name?.common === 'United States') candidates.push('USA', 'US', 'United States of America', 'America');
    if (c.name?.common === 'United Kingdom') candidates.push('UK', 'Great Britain', 'Britain');
    if (c.name?.common === 'Czechia') candidates.push('Czech Republic');
    if (c.name?.common === 'Myanmar') candidates.push('Burma');
    if (c.name?.common === 'Côte d’Ivoire') candidates.push("Cote d'Ivoire", 'Ivory Coast');
    if (c.name?.common === 'South Korea') candidates.push('Korea, Republic of', 'Republic of Korea');
    if (c.name?.common === 'North Korea') candidates.push("Korea, Democratic People's Republic of", 'DPRK');
    if (c.name?.common === 'Russia') candidates.push('Russian Federation');
    if (c.name?.common === 'Taiwan') candidates.push('Taiwan, Province of China');
    if (c.name?.common === 'Vietnam') candidates.push('Viet Nam');

    for (const raw of candidates) {
      const key = norm(raw);
      if (key && !map.has(key)) map.set(key, code);
    }
  }
  return map;
};
const COUNTRY_INDEX = buildCountryIndex();

function resolveAlpha2(countryName: string | null | undefined): string | null {
  if (!countryName) return null;

  let code = COUNTRY_INDEX.get(norm(countryName));
  if (code) return code;

  const parts = countryName.split(',').map((p) => p.trim());
  for (const p of parts) {
    code = COUNTRY_INDEX.get(norm(p));
    if (code) return code;
  }

  const stripped = countryName
    .replace(/\(.*\)/g, '')
    .replace(/Republic of|Kingdom of|Federation of|State of|Province of/gi, '')
    .trim();

  code = COUNTRY_INDEX.get(norm(stripped));
  return code || null;
}
/** ----------------------------------------------------------- */

/** Skeleton */
const Skeleton = ({ className = '' }: { className?: string }) => (
  <div
    className={`relative overflow-hidden bg-gray-200/70 ${className}`}
    style={{ borderRadius: 8 }}
  >
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    <style jsx global>{`
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

/** Fixed-frame flag:
 * - Frame: 3:2 (adjust FRAME_W/FRAME_H to taste)
 * - Default: objectFit 'cover' to fill frame and center
 * - Nepal (NP): objectFit 'contain' + scale up a touch so it reads nicely
 */
const FRAME_W = 90; // px
const FRAME_H = 60;  // px


const FlagFrame: React.FC<{
  country: string | null | undefined;
  emojiFallback?: string;
}> = ({ country, emojiFallback = '🌍' }) => {
  const [loaded, setLoaded] = useState(false);
  const alpha2 = resolveAlpha2(country || '')?.toLowerCase();

  useEffect(() => setLoaded(false), [country]);

  if (!alpha2) {
    return (
      <div
        className="grid place-items-center"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          borderRadius: 2,
          background: 'linear-gradient(180deg, #fff, #f6f6f6)',
          border: '1px solid rgba(0,0,0,0.08)',
        }}
        role="img"
        aria-label={country ? `${country} flag placeholder` : 'Country flag placeholder'}
      >
        <span style={{ fontSize: Math.min(FRAME_W, FRAME_H) * 0.6 }} aria-hidden="true">{emojiFallback}</span>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: FRAME_W,
        height: FRAME_H,
        borderRadius: 8,
        background: 'rgba(0,0,0,0.0)',
        border: '1px solid rgba(0,0,0,0.08)',
      }}
      role="img"
      aria-label={`Flag of ${country}`}
    >
      {!loaded && (
        <div 
          className="animate-pulse bg-gray-200/70 absolute inset-0 rounded" 
          aria-label="Loading flag image"
        />
      )}

      <Image
        src={`https://flagcdn.com/w320/${alpha2}.png`}
        alt={`Flag of ${country}`}
        fill
        className={`absolute inset-0 transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          objectFit: 'fill',       // force stretch
          objectPosition: 'center' // always centered
        }}
        onLoadingComplete={() => setLoaded(true)}
        priority={false}
      />
    </div>
  );
};


const CulturalExplorer = () => {
  const { profile, synced } = useSyncProfile();

  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [factsData, setFactsData] = useState<FactsData>({});
  const [matchedCountries, setMatchedCountries] = useState<string[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchedUsersCount, setMatchedUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch matched users and extract their countries
  const fetchMatchedCountries = useCallback(async () => {
    if (!synced || !profile?.user_id) {
      return;
    }

    try {
      setIsLoadingMatches(true);
      const apiClient = new MessagingApiClient();
      const response: SearchUsersResponse = await apiClient.searchUsers({
        anonymous_handle: "",
        my_user_id: profile.user_id,
        limit: 100,
        offset: 0,
      });

      // Extract unique country codes from matched users
      const countryCodeSet = new Set<string>();
      response.items.forEach(item => {
        if (item.user_profile.country_code) {
          countryCodeSet.add(item.user_profile.country_code);
        }
      });

      // Convert country codes to country names
      const countryNames: string[] = [];
      countryCodeSet.forEach(code => {
        const countryData = wc.find(c => c.cca2?.toLowerCase() === code.toLowerCase());
        const countryName = countryData?.name?.common;
        if (countryName && factsData[countryName]) {
          countryNames.push(countryName);
        }
      });

      setMatchedCountries(countryNames.sort());
      setMatchedUsersCount(response.items.length);
    } catch (error) {
      console.error('Error fetching matched countries:', error);
      setMatchedCountries([]);
      setMatchedUsersCount(0);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [synced, profile?.user_id, factsData]);

  const [cardKey, setCardKey] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    const loadFacts = async () => {
      try {
        const response = await fetch('/facts.json', { cache: 'force-cache' });
        if (!response.ok) throw new Error(String(response.status));
        const data: FactsData = await response.json();
        setFactsData(data);
      } catch {
        const fallbackData: FactsData = {
          'South Africa': {
            emoji: '🇿🇦',
            facts: [
              'South Africa has 11 official languages - more than any other country!',
              "The world's largest diamond was found in South Africa in 1905.",
              'South Africa is the only country to voluntarily dismantle its nuclear weapons program.',
              "Cape Town's Table Mountain is one of the New7Wonders of Nature.",
              "South Africa has the world's deepest gold mine, nearly 4km underground!",
            ],
          },
          Japan: {
            emoji: '🇯🇵',
            facts: [
              'Japan consists of 6,852 islands, though only 430 are inhabited.',
              'In Japan, slurping your noodles loudly is considered polite!',
              'Japan has more pets than children.',
              'Square watermelons are grown in Japan to save space.',
              'Japan has over 50,000 people aged 100 or older.',
            ],
          },
        };
        setFactsData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };
    loadFacts();
  }, []);

  // Fetch matched countries when facts data is available
  useEffect(() => {
    if (Object.keys(factsData).length > 0) {
      fetchMatchedCountries();
    }
  }, [factsData, fetchMatchedCountries]);

  const currentCountry = useMemo(() => {
    return selectedCountry || (matchedCountries.length > 0 ? matchedCountries[0] : '');
  }, [selectedCountry, matchedCountries]);

  const currentFacts = useMemo(() => {
    if (!currentCountry || !factsData[currentCountry]) return [];
    return factsData[currentCountry].facts;
  }, [currentCountry, factsData]);

  const currentFact = currentFacts.length
    ? currentFacts[currentFactIndex % currentFacts.length]
    : 'Select a country to see amazing facts!';

  useEffect(() => {
    if (matchedCountries.length > 0 && !selectedCountry) {
      setSelectedCountry(matchedCountries[0]);
    }
  }, [matchedCountries, selectedCountry]);

  const fadeCardOutIn = useCallback(() => {
    setCardVisible(false);
    setTimeout(() => {
      setCardKey((k) => k + 1);
      setCardVisible(true);
    }, 220);
  }, []);

  const restartQuiz = useCallback(() => {
    setQuizState('idle');
    setQuizData([]);
    setCurrentQuizIndex(0);
    setQuizResults([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
  }, []);

  const flipCard = useCallback(() => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentFactIndex((prev) => prev + 1);
      setIsFlipping(false);
      fadeCardOutIn();
    }, 220);
  }, [isFlipping, fadeCardOutIn]);

  const shuffleDeck = useCallback(() => {
    if (matchedCountries.length > 1) {
      // Cancel any active quiz when shuffling
      if (quizState === 'active' || quizState === 'loading') {
        restartQuiz();
      }

      // Get a random country from matched countries that's different from current
      const otherCountries = matchedCountries.filter(c => c !== selectedCountry);
      if (otherCountries.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherCountries.length);
        setSelectedCountry(otherCountries[randomIndex]);
        setCurrentFactIndex(0);
        fadeCardOutIn();
      }
    }
  }, [quizState, fadeCardOutIn, restartQuiz, matchedCountries, selectedCountry]);

  // Hardcoded South Africa quiz
  const getSouthAfricaQuiz = (): QuizQuestion[] => [
    {
      type: 'multiple_choice',
      question: 'How many official languages does South Africa have?',
      options: {
        A: '9 languages',
        B: '11 languages', 
        C: '13 languages',
        D: '7 languages'
      },
      answer: 'B',
      hint: 'It&apos;s more than any other country in the world!',
      explanation: 'South Africa has 11 official languages, making it the country with the most official languages in the world. These include English, Afrikaans, Zulu, Xhosa, and seven others.'
    },
    {
      type: 'multiple_choice',
      question: 'What makes South Africa unique regarding nuclear weapons?',
      options: {
        A: 'It was the first country to develop nuclear weapons',
        B: 'It currently has the most nuclear weapons',
        C: 'It&apos;s the only country to voluntarily dismantle its nuclear weapons program',
        D: 'It has never had nuclear weapons'
      },
      answer: 'C',
      hint: 'Think about what makes this country special in terms of nuclear disarmament.',
      explanation: 'South Africa is the only country in the world to voluntarily dismantle its nuclear weapons program, doing so in the early 1990s as part of its transition to democracy.'
    },
    {
      type: 'multiple_choice',
      question: 'Where was the world\'s largest diamond found?',
      options: {
        A: 'Russia in 1920',
        B: 'South Africa in 1905',
        C: 'Australia in 1890',
        D: 'Canada in 1912'
      },
      answer: 'B',
      hint: 'This massive diamond was discovered over 100 years ago.',
      explanation: 'The world\'s largest diamond, the Cullinan Diamond weighing 3,106 carats, was found in South Africa in 1905. It was later cut into several smaller diamonds, some of which are part of the British Crown Jewels.'
    },
    {
      type: 'multiple_choice',
      question: 'What is special about South Africa\'s gold mines?',
      options: {
        A: 'They produce the purest gold in the world',
        B: 'They are the oldest mines in the world',
        C: 'They include the world\'s deepest gold mine',
        D: 'They are completely automated'
      },
      answer: 'C',
      hint: 'These mines go extremely deep underground.',
      explanation: 'South Africa has the world\'s deepest gold mine, extending nearly 4 kilometers (about 2.5 miles) underground. The extreme depth creates challenging working conditions due to heat and pressure.'
    },
    {
      type: 'multiple_choice',
      question: 'Which natural wonder is located in Cape Town?',
      options: {
        A: 'Victoria Falls',
        B: 'Table Mountain',
        C: 'Drakensberg Mountains', 
        D: 'Blyde River Canyon'
      },
      answer: 'B',
      hint: 'This landmark is one of the New7Wonders of Nature.',
      explanation: 'Table Mountain in Cape Town is one of the New7Wonders of Nature. Its distinctive flat-topped shape and dramatic cliffs make it one of the most recognizable landmarks in the world.'
    }
  ];

  const generateApiQuiz = useCallback(async () => {
    try {
      const factsText = currentFacts.join(' ');
      
      const response = await fetch('https://sdp-orpin-iota.vercel.app/api/quiz-engine', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'x-api-key': 'my_a22_12_1tchy_450ee210-7f72-4b96-9323-23542b0b4349',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: {
            topic: currentCountry,
            skill_level: 'Beginner',
            number_of_questions: 3,
            additional_instructions: 'Create interesting questions based on the cultural and geographical facts provided.',
            information_from_sources: factsText
          }
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.data && result.data.exercises) {
        setQuizData(result.data.exercises);
        setQuizState('active');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Quiz generation failed:', error);
      setQuizState('idle');
      // You could show an error message here
    }
  }, [currentFacts, currentCountry]);

  // Quiz functions
  const generateQuiz = useCallback(async () => {
    if (!currentCountry || !currentFacts.length) return;
    
    setQuizState('loading');
    setQuizData([]);
    setCurrentQuizIndex(0);
    setQuizResults([]);
    setSelectedAnswer(null);
    setShowExplanation(false);

    // Simulate loading for better UX
    setTimeout(() => {
      if (currentCountry === 'South Africa') {
        // Use hardcoded quiz for South Africa
        const southAfricaQuiz = getSouthAfricaQuiz();
        // Randomly select 3 questions
        const selectedQuestions = southAfricaQuiz.sort(() => 0.5 - Math.random()).slice(0, 3);
        setQuizData(selectedQuestions);
        setQuizState('active');
      } else {
        // Use API for other countries
        generateApiQuiz();
      }
    }, 1500); // 1.5 second loading simulation
  }, [currentCountry, currentFacts.length, generateApiQuiz]);

  const selectAnswer = (answer: 'A' | 'B' | 'C' | 'D') => {
    if (selectedAnswer || showExplanation) return;
    
    setSelectedAnswer(answer);
    const currentQuestion = quizData[currentQuizIndex];
    const isCorrect = answer === currentQuestion.answer;
    
    setQuizResults(prev => [...prev, {
      questionIndex: currentQuizIndex,
      selectedAnswer: answer,
      isCorrect
    }]);
    
    setTimeout(() => setShowExplanation(true), 500);
  };

  const nextQuestion = () => {
    if (currentQuizIndex < quizData.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      fadeCardOutIn();
    } else {
      setQuizState('completed');
      fadeCardOutIn();
    }
  };

  const renderFlag = (country: string | null | undefined) => {
    const emoji = country && factsData[country]?.emoji ? factsData[country].emoji : '🌍';
    return <FlagFrame country={country} emojiFallback={emoji} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="text-8xl mb-4 animate-spin" aria-hidden="true">🃏</div>
          <p className="text-2xl text-black">Loading the deck...</p>
          <span className="sr-only">Loading cultural facts and quiz data</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Live region for announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="announcements">
        {quizState === 'loading' && 'Quiz is being generated'}
        {quizState === 'active' && `Quiz active: Question ${currentQuizIndex + 1} of ${quizData.length}`}
        {quizState === 'completed' && `Quiz completed. You got ${quizResults.filter(r => r.isCorrect).length} out of ${quizResults.length} correct.`}
        {isFlipping && 'Loading next fact'}
      </div>

      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Skip to content link for keyboard navigation */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded z-50"
        >
          Skip to main content
        </a>

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Globe className="w-8 h-8 text-blue-500 mr-3" />
            <h1 id="deck-selection-heading" className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Cultural Explorer
            </h1>
            <Sparkles className="w-8 h-8 text-pink-500 ml-3" />
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Discover fascinating facts about countries and test your knowledge with fun quizzes!
          </p>
        </div>

        {/* Exploration Mode */}
        <section aria-labelledby="exploration-modes" className="mb-16">
          <h2 id="exploration-modes" className="text-3xl font-bold text-center text-gray-800 mb-8">
            Explore Your Pen Pals&apos; Countries
          </h2>
          
          {/* Main Mode - Matched Countries */}
          <div className="max-w-4xl mx-auto">
            <div className={`w-full p-8 transition-all duration-500 relative group rounded-2xl border-3 ${
              'border-purple-500 bg-gradient-to-r from-purple-100 via-pink-50 to-indigo-100 shadow-2xl'
            }`}>
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="relative mr-6">
                    <Heart className="w-12 h-12 text-pink-500" />
                    <Users className="w-6 h-6 text-purple-500 absolute -top-1 -right-1" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      Your Pen Pals&apos; Countries
                    </h3>
                    <p className="text-gray-600">
                      {isLoadingMatches 
                        ? 'Loading your matches...'
                        : matchedCountries.length > 0 
                          ? `Explore ${matchedCountries.length} countries from your ${matchedUsersCount} pen pal${matchedUsersCount !== 1 ? 's' : ''}`
                          : matchedUsersCount === 0
                            ? 'Start matching with pen pals to unlock their countries!'
                            : 'No country data available for your matches'
                      }
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {matchedCountries.slice(0, 3).map((country, index) => (
                    <div
                      key={country}
                      className={`flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-md transform ${
                        index === 1 ? 'scale-110 z-10' : index === 2 ? 'scale-105' : ''
                      }`}
                    >
                      <span className="text-xl" aria-hidden="true">
                        {factsData[country]?.emoji || '🌍'}
                      </span>
                    </div>
                  ))}
                  {matchedCountries.length > 3 && (
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-white text-sm font-bold shadow-md">
                      +{matchedCountries.length - 3}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-4 bg-white/50 rounded-lg">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <MapIcon className="w-4 h-4 mr-1" />
                    {matchedCountries.length} Countries
                  </span>
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    {matchedUsersCount} Pen Pals
                  </span>
                  <span className="flex items-center">
                    <Brain className="w-4 h-4 mr-1" />
                    Quizzes Available
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Country Selector - Matched Countries */}
        {matchedCountries.length > 1 && (
          <section className="text-center mb-8" aria-labelledby="matched-countries-selector-heading">
            <h2 id="matched-countries-selector-heading" className="text-xl font-semibold text-gray-800 mb-4">
              Choose from your pen pals&apos; countries
            </h2>
            <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
              {matchedCountries.map((country) => (
                <button
                  key={country}
                  onClick={() => {
                    if (quizState === 'active' || quizState === 'loading') {
                      restartQuiz();
                    }
                    setSelectedCountry(country);
                    setCurrentFactIndex(0);
                    fadeCardOutIn();
                  }}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 ${
                    selectedCountry === country
                      ? 'bg-purple-500 text-white shadow-lg scale-105'
                      : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {factsData[country]?.emoji || '🌍'}
                  </span>
                  <span className="font-medium">{country}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Quiz Loading State */}
        {quizState === 'loading' && currentCountry && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-loading-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div className="relative bg-white rounded-2xl shadow-2xl border-4 border-gray-200 overflow-hidden">
              {/* Loading header */}
              <div className="bg-gradient-to-r from-violet-200 to-pink-200 text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-loading-heading" className="text-2xl font-bold">{currentCountry} Quiz</h2>
                <p className="opacity-75 mt-1">Generating your personalized quiz...</p>
              </div>

              {/* Loading body */}
              <div className="p-8" role="status" aria-live="polite">
                <div className="min-h-[140px] flex flex-col items-center justify-center">
                  <div className="text-6xl mb-4 animate-bounce" aria-hidden="true">🧠</div>
                  <p className="text-lg text-gray-700 text-center mb-4">
                    Creating quiz questions based on the facts you&apos;ve learned...
                  </p>
                  <div className="flex space-x-1" aria-hidden="true">
                    <div className="w-2 h-2 bg-[#6b3f2a] rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-[#6b3f2a] rounded-full animate-pulse delay-75"></div>
                    <div className="w-2 h-2 bg-[#6b3f2a] rounded-full animate-pulse delay-150"></div>
                  </div>
                  <span className="sr-only">Quiz is being generated, please wait</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quiz Active State */}
        {quizState === 'active' && quizData.length > 0 && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-question-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div
              key={`quiz-${cardKey}`}
              className={`relative bg-white rounded-2xl shadow-2xl border-4 border-[#f7dac0] overflow-hidden transition-all duration-200 ${
                cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              {/* Quiz header */}
              <div className="bg-gradient-to-r from-violet-200 to-pink-200 text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-question-heading" className="text-2xl font-bold">{currentCountry} Quiz</h2>
                <p className="opacity-75 mt-1" aria-live="polite">
                  Question {currentQuizIndex + 1} of {quizData.length}
                </p>
              </div>

              {/* Quiz body */}
              <div className="p-8">
                <div className="mb-6">
                  <p className="text-lg text-gray-700 leading-relaxed text-center font-medium" id="question-text">
                    {quizData[currentQuizIndex]?.question}
                  </p>
                </div>

                <fieldset className="space-y-3" aria-labelledby="question-text">
                  <legend className="sr-only">Multiple choice answers</legend>
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const isSelected = selectedAnswer === option;
                    const isCorrect = option === quizData[currentQuizIndex]?.answer;
                    const showResult = showExplanation;
                    
                    let buttonClass = 'w-full p-4 text-left border-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/50 ';
                    let ariaLabel = `Option ${option}: ${quizData[currentQuizIndex]?.options[option as keyof typeof quizData[0]['options']]}`;
                    
                    if (!showResult) {
                      buttonClass += isSelected 
                        ? 'border-[#6b3f2a] bg-[#f7dac0] text-[#6b3f2a]' 
                        : 'border-gray-300 hover:border-[#6b3f2a] hover:bg-[#fdf6f0]';
                    } else {
                      if (isCorrect) {
                        buttonClass += 'border-green-500 bg-green-100 text-green-800';
                        ariaLabel += isSelected ? ' - Your answer, correct!' : ' - Correct answer';
                      } else if (isSelected && !isCorrect) {
                        buttonClass += 'border-red-500 bg-red-100 text-red-800';
                        ariaLabel += ' - Your answer, incorrect';
                      } else {
                        buttonClass += 'border-gray-300 bg-gray-50 text-gray-600';
                      }
                    }

                    return (
                      <button
                        key={option}
                        onClick={() => selectAnswer(option as 'A' | 'B' | 'C' | 'D')}
                        disabled={showExplanation}
                        className={buttonClass}
                        aria-label={ariaLabel}
                        aria-pressed={isSelected}
                      >
                        <div className="flex items-center justify-between">
                          <span>
                            <strong>{option}.</strong> {quizData[currentQuizIndex]?.options[option as keyof typeof quizData[0]['options']]}
                          </span>
                          {showResult && isCorrect && (
                            <Check className="w-5 h-5 text-green-600" aria-hidden="true" />
                          )}
                          {showResult && isSelected && !isCorrect && (
                            <X className="w-5 h-5 text-red-600" aria-hidden="true" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </fieldset>

                {showExplanation && (
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg" role="region" aria-labelledby="explanation-heading">
                    <h3 id="explanation-heading" className="sr-only">Explanation</h3>
                    <p className="text-sm text-blue-800">
                      <strong>Explanation:</strong> {quizData[currentQuizIndex]?.explanation}
                    </p>
                  </div>
                )}
              </div>

              {/* Quiz actions */}
              <div className="p-6 bg-gray-50 border-t">
                <div className="flex justify-center gap-4">
                  {showExplanation && (
                    <button
                      onClick={nextQuestion}
                      className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-sm font-bold text-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-500/50 transition-all duration-200 shadow-lg"
                    >
                      {currentQuizIndex < quizData.length - 1 ? 'Next Question' : 'Finish Quiz'}
                    </button>
                  )}
                  <button
                    onClick={restartQuiz}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-sm font-bold text-lg hover:bg-gray-600 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition-all duration-200 shadow-lg"
                  >
                    Back to Facts
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quiz Completed State */}
        {quizState === 'completed' && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-results-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div
              key={`results-${cardKey}`}
              className={`relative bg-white rounded-2xl shadow-2xl border-4 border-[#f7dac0] overflow-hidden transition-all duration-200 ${
                cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              {/* Results header */}
              <div className="bg-gradient-to-r from-violet-200 to-pink-200 text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-results-heading" className="text-2xl font-bold">Quiz Complete!</h2>
                <p className="opacity-75 mt-1">Here&apos;s how you did</p>
              </div>

              {/* Results body */}
              <div className="p-8">
                <div className="text-center mb-6" role="region" aria-live="polite" aria-labelledby="final-score">
                  <div className="text-6xl mb-4" aria-hidden="true">
                    <Trophy className="w-16 h-16 mx-auto text-[#6b3f2a]" />
                  </div>
                  <div id="final-score" data-testid="final-score" className="text-3xl font-bold text-gray-800 mb-2">
                    {quizResults.filter(r => r.isCorrect).length} out of {quizResults.length} correct
                  </div>
                  <p className="text-lg text-gray-600">
                    {quizResults.filter(r => r.isCorrect).length === quizResults.length
                      ? 'Perfect score! You really know your facts!'
                      : quizResults.filter(r => r.isCorrect).length >= quizResults.length / 2
                      ? 'Great job! You learned a lot about ' + currentCountry + '!'
                      : 'Good try! Why not read more facts and try again?'}
                  </p>
                </div>

                <div className="space-y-3" role="list" aria-label="Question results">
                  {quizResults.map((result, index) => (
                    <div
                      key={index}
                      role="listitem"
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        result.isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                      aria-label={`Question ${index + 1}: ${result.isCorrect ? 'Correct' : 'Incorrect'}`}
                    >
                      <span className="font-medium">Question {index + 1}</span>
                      {result.isCorrect ? (
                        <Check className="w-5 h-5" aria-label="Correct" />
                      ) : (
                        <X className="w-5 h-5" aria-label="Incorrect" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Results actions */}
              <div className="p-6 bg-gray-50 border-t">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={generateQuiz}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-sm font-bold text-lg hover:scale-105 focus:outline-none focus:ring-4 focus:ring-pink-500/50 transition-all duration-200 shadow-lg"
                  >
                    <Brain className="w-5 h-5" aria-hidden="true" />
                    Try Again
                  </button>
                  <button
                    onClick={restartQuiz}
                    className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-sm font-bold text-lg hover:bg-gray-600 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition-all duration-200 shadow-lg"
                  >
                    Back to Facts
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Card Stack */}
        {currentCountry && quizState === 'idle' && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="facts-card-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div
              key={cardKey}
              className={`relative bg-white rounded-2xl shadow-2xl border-4 border-gray-200 overflow-hidden transition-all duration-200 ${
                cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              {/* Card header */}
              <div className="bg-gradient-to-r from-teal-400 to-yellow-200 text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="facts-card-heading" className="text-2xl font-bold">{currentCountry}</h2>
                <p className="opacity-75 mt-1" aria-live="polite">
                  Card {currentFactIndex + 1} of {currentFacts.length}
                </p>
              </div>

              {/* Card body */}
              <div className="p-8">
                <div className="min-h-[140px] flex items-center justify-center">
                  <p
                    className={`text-lg text-gray-700 leading-relaxed text-center transition-opacity duration-200 ${
                      isFlipping ? 'opacity-0' : 'opacity-100'
                    }`}
                    aria-live="polite"
                    role="region"
                    aria-label="Cultural fact"
                  >
                    {currentFact}
                  </p>
                </div>
              </div>

              {/* Card actions */}
              <div className="p-6 bg-gray-50 border-t">
                {/* Primary Action - Quiz */}
                <div className="flex justify-center mb-4">
                  <button
                    onClick={generateQuiz}
                    disabled={!currentFacts.length}
                    className={`flex items-center gap-3 px-8 py-4 font-bold text-xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-pink-500/50 rounded-xl ${
                      !currentFacts.length
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white hover:scale-110 hover:shadow-2xl shadow-lg transform hover:rotate-1'
                    }`}
                    aria-describedby="take-quiz-desc"
                  >
                    <Brain className="w-6 h-6" aria-hidden="true" />
                    🧠 Test Your Knowledge!
                  </button>
                  <div id="take-quiz-desc" className="sr-only">
                    Test your knowledge about {currentCountry} with an interactive quiz
                  </div>
                </div>

                {/* Secondary Actions */}
                <div className="flex justify-center gap-3 flex-wrap" role="group" aria-label="Card actions">
                  <button
                    onClick={flipCard}
                    disabled={isFlipping || currentFacts.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-lg transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-teal-500/50 ${
                      isFlipping
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-teal-400 to-yellow-200 rounded-sm text-white hover:scale-105 shadow-lg'
                    }`}
                    aria-describedby={isFlipping ? undefined : "next-fact-desc"}
                  >
                    <RotateCw className={`w-5 h-5 ${isFlipping ? 'animate-spin' : ''}`} aria-hidden="true" />
                    {isFlipping ? 'Flipping...' : 'Next Fact'}
                  </button>
                  {!isFlipping && (
                    <div id="next-fact-desc" className="sr-only">
                      Show the next cultural fact about {currentCountry}
                    </div>
                  )}

                  {matchedCountries.length > 1 && (
                    <button
                      onClick={shuffleDeck}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-sm font-bold text-lg hover:bg-gray-600 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500/50 transition-all duration-200 shadow-lg"
                      aria-describedby="shuffle-desc"
                    >
                      <Shuffle className="w-5 h-5" aria-hidden="true" />
                      Next Country
                    </button>
                  )}
                  {matchedCountries.length > 1 && (
                    <div id="shuffle-desc" className="sr-only">
                      Explore another country from your pen pals
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Deck info */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md text-gray-600" role="status">
                <Heart className="w-4 h-4 text-pink-500" aria-hidden="true" />
                <span className="font-medium">
                  {matchedCountries.length} pen pal countr{matchedCountries.length !== 1 ? 'ies' : 'y'} available
                </span>
              </div>
            </div>
          </section>
        )}

        {/* No matches state */}
        {matchedCountries.length === 0 && !isLoadingMatches && (
          <section className="text-center py-16" aria-labelledby="no-matches-heading">
            <div className="text-8xl mb-6" aria-hidden="true">💌</div>
            <h3 id="no-matches-heading" className="text-2xl font-bold text-gray-600 mb-2">No Pen Pal Countries Yet</h3>
            <p className="text-gray-500 mb-4">
              {matchedUsersCount === 0 
                ? "Start connecting with pen pals to unlock their countries!" 
                : "Your pen pals haven't shared their countries yet."
              }
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-600 rounded-lg">
              <Heart className="w-5 h-5 mr-2" />
              Match with pen pals to explore their cultures
            </div>
          </section>
        )}

        <div id="main-content"></div>
      </main>
    </div>
  );
};

export default CulturalExplorer;
