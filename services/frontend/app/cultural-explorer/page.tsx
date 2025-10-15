'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Shuffle, Globe, RotateCw, Brain, Check, X, Trophy, HelpCircle, Users, Heart, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
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
  overflow: 'hidden' as const,
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
  options: Record<string, string>;
  answer: string;
  hint: string;
  explanation: string;
};

interface QuizResult {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  explanation: string;
}

type QuizState = 'idle' | 'loading' | 'active' | 'complete';

// World Countries utility to resolve alpha2 codes
const resolveAlpha2 = (countryName: string): string | null => {
  const country = wc.find(c => c.name.common.toLowerCase() === countryName.toLowerCase());
  return country?.cca2 || null;
};

// Country name mapping to handle discrepancies between world-countries and facts.json
const mapCountryName = (countryName: string): string => {
  const countryMappings: Record<string, string> = {
    'United States': 'United States of America',
    'United Kingdom': 'United Kingdom',
    'South Korea': 'Korea (South)',
    'North Korea': 'Korea (North)',
    // Add more mappings as needed
  };
  
  return countryMappings[countryName] || countryName;
};

// Flag rendering component
const FRAME_W = 48;
const FRAME_H = 32;

const FlagImage: React.FC<{
  country: string;
  emojiFallback?: string;
}> = ({ country, emojiFallback = '🌍' }) => {
  const [loaded, setLoaded] = useState(false);
  
  // For flag lookup, convert back to the common name for world-countries lookup
  const flagCountryName = country === 'United States of America' ? 'United States' : country;
  const alpha2 = resolveAlpha2(flagCountryName || '')?.toLowerCase();

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
        sizes="(max-width: 768px) 60px, 80px"
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
  const [countryFacts, setCountryFacts] = useState<Record<string, string[]>>({});
  const [countryPenPals, setCountryPenPals] = useState<Record<string, Array<{ anonymous_handle: string; user_id: string }>>>({});
  const [expandedPenPals, setExpandedPenPals] = useState<Record<string, boolean>>({});
  const [factsData, setFactsData] = useState<FactsData>({});
  const [matchedCountries, setMatchedCountries] = useState<string[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchedUsersCount, setMatchedUsersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [carouselIndices, setCarouselIndices] = useState<Record<string, number>>({});

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Fetch matched users and extract their countries
  const fetchMatchedCountries = useCallback(async () => {
    if (!synced || !profile?.user_id) {
      return;
    }

    try {
      setIsLoadingMatches(true);
      const apiClient = new MessagingApiClient();
      const response: SearchUsersResponse = await apiClient.searchUsers({
        anonymous_handle: "", // Empty to act like inbox
        my_user_id: profile.user_id,
        limit: 100 // Get more matches to find countries
      });
      
      setMatchedUsersCount(response.items.length);

      if (response.items.length === 0) {
        setMatchedCountries([]);
        return;
      }

      // Extract unique countries from matched users using country_code
      const countryGroups: Record<string, Array<{ anonymous_handle: string; user_id: string }>> = {};
      const countries: string[] = [];

      response.items.forEach(item => {
        const countryCode = item.user_profile.country_code;
        if (!countryCode) return;
        
        // Convert country code to country name using world-countries data
        const countryData = wc.find(c => c.cca2?.toLowerCase() === countryCode.toLowerCase());
        const commonName = countryData?.name?.common;
        if (!commonName) return;
        
        // Map to the correct name used in facts.json
        const mappedCountryName = mapCountryName(commonName);
        
        // Group pen pals by country
        if (!countryGroups[mappedCountryName]) {
          countryGroups[mappedCountryName] = [];
          countries.push(mappedCountryName);
        }
        
        countryGroups[mappedCountryName].push({
          anonymous_handle: item.user_profile.anonymous_handle,
          user_id: item.user_profile.user_id
        });
      });

      setMatchedCountries(countries.sort());
      setCountryPenPals(countryGroups);
    } catch (error) {
      console.error('Error fetching matched countries:', error);
      setMatchedCountries([]);
      setCountryPenPals({});
      setMatchedUsersCount(0);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [synced, profile?.user_id]);

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
              'It is the only country to voluntarily dismantle its nuclear weapons program.',
              'The world\'s largest diamond, the Cullinan, was found here in 1905.',
              'Cape Town\'s Table Mountain is over 260 million years old.',
              'South Africa has three capital cities: Cape Town, Pretoria, and Bloemfontein.'
            ]
          },
        };
        setFactsData(fallbackData);
      } finally {
        setIsLoading(false);
      }
    };
    loadFacts();
  }, []);

  useEffect(() => {
    if (Object.keys(factsData).length > 0) {
      fetchMatchedCountries();
    }
  }, [factsData, fetchMatchedCountries]);

  const currentCountry = useMemo(() => {
    return selectedCountry || (matchedCountries.length > 0 ? matchedCountries[0] : '');
  }, [selectedCountry, matchedCountries]);

  // Function to get 9 random facts for a specific country
  const generateRandomFactsForCountry = useCallback((country: string) => {
    if (!factsData[country]?.facts) return [];
    
    const facts = factsData[country].facts;
    const shuffled = [...facts].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(9, facts.length));
  }, [factsData]);

  // Function to generate random facts for all matched countries
  const generateAllRandomFacts = useCallback(() => {
    const newCountryFacts: Record<string, string[]> = {};
    const newCarouselIndices: Record<string, number> = {};
    
    matchedCountries.forEach(country => {
      newCountryFacts[country] = generateRandomFactsForCountry(country);
      newCarouselIndices[country] = 0;
    });
    
    setCountryFacts(newCountryFacts);
    setCarouselIndices(newCarouselIndices);
  }, [matchedCountries, generateRandomFactsForCountry]);

  // Generate random facts when matched countries change
  useEffect(() => {
    if (matchedCountries.length > 0 && Object.keys(factsData).length > 0) {
      generateAllRandomFacts();
    }
  }, [matchedCountries, factsData, generateAllRandomFacts]);

  useEffect(() => {
    if (matchedCountries.length > 0 && !selectedCountry) {
      setSelectedCountry(matchedCountries[0]);
    }
  }, [matchedCountries, selectedCountry]);

  const restartQuiz = useCallback(() => {
    setQuizState('idle');
    setQuizData([]);
    setCurrentQuizIndex(0);
    setQuizResults([]);
    setSelectedAnswer(null);
    setShowExplanation(false);
  }, []);

  const refreshFacts = useCallback(() => {
    generateAllRandomFacts();
  }, [generateAllRandomFacts]);

  const switchToNextCountry = useCallback(() => {
    if (matchedCountries.length > 1) {
      // Cancel any active quiz when switching countries
      if (quizState === 'active' || quizState === 'loading') {
        restartQuiz();
      }

      // Get a random country from matched countries that's different from current
      const otherCountries = matchedCountries.filter(c => c !== selectedCountry);
      if (otherCountries.length > 0) {
        const randomIndex = Math.floor(Math.random() * otherCountries.length);
        setSelectedCountry(otherCountries[randomIndex]);
      }
    }
  }, [quizState, restartQuiz, matchedCountries, selectedCountry]);

  // Carousel navigation functions
  const navigateCarousel = useCallback((country: string, direction: 'prev' | 'next') => {
    const currentIndex = carouselIndices[country] || 0;
    const factsLength = countryFacts[country]?.length || 0;
    
    if (factsLength === 0) return;
    
    let newIndex = currentIndex;
    if (direction === 'next') {
      // Move forward by 3, but don't go past the last possible starting position
      newIndex = Math.min(currentIndex + 3, Math.max(0, factsLength - 3));
    } else {
      // Move backward by 3, but don't go below 0
      newIndex = Math.max(currentIndex - 3, 0);
    }
    
    setCarouselIndices(prev => ({
      ...prev,
      [country]: newIndex
    }));
  }, [carouselIndices, countryFacts]);

  const refreshFactsForCountry = useCallback((country: string) => {
    const newFacts = generateRandomFactsForCountry(country);
    setCountryFacts(prev => ({
      ...prev,
      [country]: newFacts
    }));
    setCarouselIndices(prev => ({
      ...prev,
      [country]: 0
    }));
  }, [generateRandomFactsForCountry]);

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
        D: 'Canada in 1999'
      },
      answer: 'B',
      hint: 'This discovery happened over 100 years ago in the same country we\'re learning about.',
      explanation: 'The Cullinan Diamond, the largest gem-quality rough diamond ever found, was discovered in South Africa in 1905. It weighed over 3,100 carats!'
    }
  ];

  const generateQuiz = useCallback((targetCountry?: string) => {
    const quizCountry = targetCountry || currentCountry;
    if (!quizCountry || !countryFacts[quizCountry]?.length) return;

    setQuizState('loading');
    
    // Set the selected country if a target country was provided
    if (targetCountry) {
      setSelectedCountry(targetCountry);
    }
    
    if (quizCountry === 'South Africa') {
      // Use hardcoded quiz for South Africa
      setQuizData(getSouthAfricaQuiz());
      setQuizState('active');
      setCurrentQuizIndex(0);
      return;
    }

    // For other countries, create simple fact-based questions
    const selectedFacts = countryFacts[quizCountry]
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const generatedQuiz: QuizQuestion[] = selectedFacts.map((fact: string, index: number) => ({
      type: 'multiple_choice',
      question: `True or False: ${fact}`,
      options: {
        A: 'True',
        B: 'False',
        C: 'Not sure',
        D: 'Need more info'
      },
      answer: 'A', // All our facts are true
      hint: 'This information comes from our cultural facts database.',
      explanation: `This is true! ${fact}`
    }));

    setQuizData(generatedQuiz);
    setQuizState('active');
    setCurrentQuizIndex(0);
  }, [currentCountry, countryFacts]);

  const submitAnswer = useCallback(() => {
    if (!selectedAnswer || quizData.length === 0) return;

    const currentQuestion = quizData[currentQuizIndex];
    const isCorrect = selectedAnswer === currentQuestion.answer;
    
    const result: QuizResult = {
      question: currentQuestion.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      explanation: currentQuestion.explanation
    };

    setQuizResults(prev => [...prev, result]);
    setShowExplanation(true);
  }, [selectedAnswer, quizData, currentQuizIndex]);

  const nextQuestion = useCallback(() => {
    if (currentQuizIndex < quizData.length - 1) {
      setCurrentQuizIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizState('complete');
    }
  }, [currentQuizIndex, quizData.length]);

  const renderFlag = (country: string) => (
    <FlagImage 
      country={country} 
      emojiFallback={factsData[country]?.emoji || '🌍'} 
    />
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="text-8xl mb-4 animate-spin" aria-hidden="true">🃏</div>
          <p className="text-2xl text-orange-800">Loading the cultural explorer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100">
      <main className="container mx-auto px-4 py-8">
        {/* Skip to main content for screen readers */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-orange-800 text-white px-4 py-2 rounded-md"
        >
          Skip to main content
        </a>

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Globe className="w-8 h-8 text-orange-600 mr-3" />
            <h1 id="deck-selection-heading" className="text-5xl font-bold bg-gradient-to-r from-orange-700 via-amber-700 to-yellow-700 bg-clip-text text-transparent">
              Cultural Explorer
            </h1>
            <Sparkles className="w-8 h-8 text-amber-500 ml-3" />
          </div>
          <p className="text-xl text-orange-700 max-w-2xl mx-auto">
            Discover fascinating facts about countries and test your knowledge with fun quizzes!
          </p>
        </div>

        {/* Quiz Loading State */}
        {quizState === 'loading' && currentCountry && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-loading-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div className="relative bg-white rounded-2xl shadow-2xl border-4 border-orange-200 overflow-hidden">
              {/* Loading header */}
              <div className="bg-gradient-to-r from-orange-200 to-amber-200 text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-loading-heading" className="text-2xl font-bold text-orange-800">{currentCountry} Quiz</h2>
                <p className="opacity-75 mt-1 text-orange-700">Preparing your questions...</p>
              </div>

              {/* Loading animation */}
              <div className="p-8 bg-white flex flex-col items-center justify-center min-h-[200px]">
                <div className="animate-spin w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-orange-600 text-center">
                  Creating personalized quiz questions about {currentCountry}...
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Quiz Active State */}
        {quizState === 'active' && quizData.length > 0 && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div
              className="relative bg-white rounded-2xl shadow-2xl border-4 border-orange-200 overflow-hidden transition-all duration-200 opacity-100 scale-100"
            >
              {/* Quiz header */}
              <div className="bg-gradient-to-r from-orange-200 to-amber-200 text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-heading" className="text-2xl font-bold text-orange-800">{currentCountry} Quiz</h2>
                <p className="opacity-75 mt-1 text-orange-700">
                  Question {currentQuizIndex + 1} of {quizData.length}
                </p>
              </div>

              {/* Quiz content */}
              <div className="p-8 bg-white">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4" id={`quiz-question-${currentQuizIndex}`}>
                    {quizData[currentQuizIndex].question}
                  </h3>
                  
                  <fieldset className="space-y-3" aria-labelledby={`quiz-question-${currentQuizIndex}`}>
                    <legend className="sr-only">Choose your answer from the following options</legend>
                    {Object.entries(quizData[currentQuizIndex].options).map(([key, value], index) => (
                      <label
                        key={key}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 ${
                          selectedAnswer === key
                            ? 'border-amber-500 bg-amber-50'
                            : 'border-orange-200 hover:border-amber-300 hover:bg-amber-25'
                        }`}
                      >
                        <input
                          type="radio"
                          name="quiz-answer"
                          value={key}
                          checked={selectedAnswer === key}
                          onChange={(e) => setSelectedAnswer(e.target.value as 'A' | 'B' | 'C' | 'D')}
                          className="sr-only"
                          aria-describedby={`option-${key}-description`}
                        />
                        <div 
                          className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                            selectedAnswer === key ? 'border-amber-500 bg-amber-500' : 'border-orange-300'
                          }`}
                          aria-hidden="true"
                        >
                          {selectedAnswer === key && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="text-orange-700" id={`option-${key}-description`}>
                          <span className="font-medium">{key}.</span> {value}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </div>

                {showExplanation && (
                  <div 
                    className={`p-4 rounded-lg mb-6 ${
                      quizResults[quizResults.length - 1]?.isCorrect 
                        ? 'bg-green-100 border border-green-300' 
                        : 'bg-red-100 border border-red-300'
                    }`}
                    role="alert"
                    aria-live="polite"
                    aria-labelledby="quiz-result-status"
                  >
                    <div className="flex items-center mb-2">
                      {quizResults[quizResults.length - 1]?.isCorrect ? (
                        <Check className="w-5 h-5 text-green-600 mr-2" aria-hidden="true" />
                      ) : (
                        <X className="w-5 h-5 text-red-600 mr-2" aria-hidden="true" />
                      )}
                      <span 
                        id="quiz-result-status"
                        className={`font-semibold ${
                          quizResults[quizResults.length - 1]?.isCorrect ? 'text-green-800' : 'text-red-800'
                        }`}
                      >
                        {quizResults[quizResults.length - 1]?.isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      quizResults[quizResults.length - 1]?.isCorrect ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {quizData[currentQuizIndex].explanation}
                    </p>
                  </div>
                )}

                {/* Quiz actions */}
                <div className="flex justify-center space-x-4" role="group" aria-label="Quiz actions">
                  {!showExplanation ? (
                    <>
                      <button
                        onClick={submitAnswer}
                        disabled={!selectedAnswer}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                          selectedAnswer
                            ? 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-105'
                            : 'bg-orange-300 text-orange-500 cursor-not-allowed'
                        }`}
                        aria-describedby={!selectedAnswer ? "submit-help-text" : undefined}
                      >
                        Submit Answer
                      </button>
                      {!selectedAnswer && (
                        <div id="submit-help-text" className="sr-only">
                          Please select an answer before submitting
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setSelectedAnswer(null);
                          restartQuiz();
                        }}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        aria-label="Exit quiz and return to cultural facts"
                      >
                        Exit Quiz
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={nextQuestion}
                        className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                        aria-label={currentQuizIndex < quizData.length - 1 ? `Continue to question ${currentQuizIndex + 2} of ${quizData.length}` : 'Complete quiz and view results'}
                      >
                        {currentQuizIndex < quizData.length - 1 ? 'Next Question' : 'Finish Quiz'}
                      </button>
                      <button
                        onClick={restartQuiz}
                        className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                        aria-label="Exit quiz and return to cultural facts"
                      >
                        Exit Quiz
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Quiz Results */}
        {quizState === 'complete' && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-results-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div
              className="relative bg-white rounded-2xl shadow-2xl border-4 border-orange-200 overflow-hidden transition-all duration-200 opacity-100 scale-100"
            >
              {/* Results header */}
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 text-white p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-100" aria-hidden="true" />
                <h2 id="quiz-results-heading" className="text-2xl font-bold">Quiz Complete!</h2>
                <p className="opacity-75 mt-1" aria-live="polite">
                  Score: {quizResults.filter(r => r.isCorrect).length} out of {quizResults.length} correct
                  ({Math.round((quizResults.filter(r => r.isCorrect).length / quizResults.length) * 100)}%)
                </p>
              </div>

              {/* Results content */}
              <div className="p-8 bg-white">
                <div className="space-y-4 mb-6" role="list" aria-label="Quiz question results">
                  {quizResults.map((result, index) => (
                    <div
                      key={index}
                      role="listitem"
                      className={`p-4 rounded-lg border ${
                        result.isCorrect 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-red-300 bg-red-50'
                      }`}
                      aria-labelledby={`result-${index}-status`}
                    >
                      <div className="flex items-center mb-2">
                        {result.isCorrect ? (
                          <Check className="w-5 h-5 text-green-600 mr-2" aria-hidden="true" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 mr-2" aria-hidden="true" />
                        )}
                        <span id={`result-${index}-status`} className="font-medium text-orange-800">
                          Question {index + 1}: {result.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <p className="text-sm text-orange-600 mb-1">{result.question}</p>
                      <div className="text-sm">
                        <p>
                          <span className="font-medium">Your answer:</span> {result.userAnswer}
                        </p>
                        <p>
                          <span className="font-medium">Correct answer:</span> {result.correctAnswer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-center space-x-4" role="group" aria-label="Quiz completion actions">
                  <button
                    onClick={() => {
                      restartQuiz();
                      generateQuiz();
                    }}
                    className="px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                    aria-label="Start a new quiz with different questions"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={restartQuiz}
                    className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    aria-label="Return to cultural facts without retaking quiz"
                  >
                    Back to Facts
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}        {/* Facts Carousel Display */}
        {matchedCountries.length > 0 && quizState === 'idle' && (
          <section className="max-w-6xl mx-auto mb-12" aria-labelledby="facts-carousel-heading">
            {/* Country Carousel Rows */}
            <div className="space-y-12">
              {matchedCountries.map((country) => {
                const facts = countryFacts[country] || [];
                const currentIndex = carouselIndices[country] || 0;
                const currentFact = facts[currentIndex];
                
                return (
                  <article key={country} className="bg-white rounded-2xl shadow-xl border border-orange-200 overflow-hidden" aria-labelledby={`country-${country.replace(/\s+/g, '-').toLowerCase()}-heading`}>
                    {/* Country Header */}
                    <header className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center">
                            {renderFlag(country)}
                          </div>
                          <div>
                            <h3 id={`country-${country.replace(/\s+/g, '-').toLowerCase()}-heading`} className="text-2xl font-bold">{country}</h3>
                            <p className="text-blue-100" aria-live="polite">
                              {facts.length > 0 ? `${facts.length} fascinating facts available` : 'Loading facts...'}
                            </p>
                            {/* Pen Pal Information */}
                            {countryPenPals[country] && countryPenPals[country].length > 0 && (
                              <div className="mt-2">
                                <p className="text-blue-200 text-sm">
                                  <Users className="w-4 h-4 inline mr-1" aria-hidden="true" />
                                  {countryPenPals[country].length} pen pal{countryPenPals[country].length !== 1 ? 's' : ''} from this country:
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1" role="list" aria-label={`Pen pals from ${country}`}>
                                  {(expandedPenPals[country] ? countryPenPals[country] : countryPenPals[country].slice(0, 4)).map((penPal, index) => (
                                    <span
                                      key={penPal.user_id}
                                      role="listitem"
                                      className="inline-block bg-white/20 text-white text-xs px-2 py-1 rounded-full"
                                    >
                                      @{penPal.anonymous_handle}
                                    </span>
                                  ))}
                                  {countryPenPals[country].length > 4 && !expandedPenPals[country] && (
                                    <button
                                      onClick={() => setExpandedPenPals(prev => ({ ...prev, [country]: true }))}
                                      className="inline-block bg-white/30 hover:bg-white/40 text-white text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-600"
                                      aria-label={`Show ${countryPenPals[country].length - 4} more pen pals from ${country}`}
                                    >
                                      +{countryPenPals[country].length - 4} more
                                    </button>
                                  )}
                                  {expandedPenPals[country] && countryPenPals[country].length > 4 && (
                                    <button
                                      onClick={() => setExpandedPenPals(prev => ({ ...prev, [country]: false }))}
                                      className="inline-block bg-white/30 hover:bg-white/40 text-white text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-600"
                                      aria-label={`Show fewer pen pals from ${country}`}
                                    >
                                      show less
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2" role="group" aria-label={`Actions for ${country}`}>
                          <button
                            onClick={() => refreshFactsForCountry(country)}
                            disabled={facts.length === 0}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-600"
                            aria-label={`Refresh facts for ${country}`}
                            title={`Refresh facts for ${country}`}
                          >
                            <RefreshCw className="w-5 h-5" aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => {
                              generateQuiz(country);
                            }}
                            disabled={facts.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-600"
                            aria-label={`Start quiz about ${country}`}
                          >
                            <Brain className="w-4 h-4" aria-hidden="true" />
                            Quiz
                          </button>
                        </div>
                      </div>
                    </header>

                    {/* Facts Carousel */}
                    {facts.length > 0 ? (
                      <div className="p-6">
                        <div className="relative">
                          {/* Three Cards Layout */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {facts.slice(currentIndex, currentIndex + 3).map((fact, index) => {
                              const cardIndex = currentIndex + index;
                              return (
                                <div
                                  key={cardIndex}
                                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[200px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow duration-200"
                                >
                                  <div className="text-center">
                                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm mx-auto mb-3">
                                      {cardIndex + 1}
                                    </div>
                                    <p className="text-gray-800 text-sm leading-relaxed line-clamp-6">
                                      {fact}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            
                            {/* Fill empty slots if less than 3 facts remaining */}
                            {facts.slice(currentIndex, currentIndex + 3).length < 3 &&
                              Array.from({ length: 3 - facts.slice(currentIndex, currentIndex + 3).length }).map((_, index) => (
                                <div
                                  key={`empty-${index}`}
                                  className="bg-orange-100 rounded-xl p-6 min-h-[200px] flex items-center justify-center opacity-50"
                                >
                                  <div className="text-orange-400 text-center">
                                    <div className="w-8 h-8 bg-orange-300 rounded-full flex items-center justify-center text-orange-500 font-bold text-sm mx-auto mb-3">
                                      {currentIndex + facts.slice(currentIndex, currentIndex + 3).length + index + 1}
                                    </div>
                                    <p className="text-sm">No more facts</p>
                                  </div>
                                </div>
                              ))}
                          </div>

                          {/* Navigation Arrows */}
                          {facts.length > 3 && (
                            <>
                              <button
                                onClick={() => navigateCarousel(country, 'prev')}
                                disabled={currentIndex === 0}
                                className={`absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white shadow-lg rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                  currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'
                                }`}
                                aria-label={`Show previous 3 facts for ${country} (currently showing ${currentIndex + 1}-${Math.min(currentIndex + 3, facts.length)} of ${facts.length})`}
                              >
                                <ChevronLeft className="w-6 h-6 text-orange-600" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => navigateCarousel(country, 'next')}
                                disabled={currentIndex + 3 >= facts.length}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white shadow-lg rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                  currentIndex + 3 >= facts.length ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'
                                }`}
                                aria-label={`Show next 3 facts for ${country} (currently showing ${currentIndex + 1}-${Math.min(currentIndex + 3, facts.length)} of ${facts.length})`}
                              >
                                <ChevronRight className="w-6 h-6 text-orange-600" aria-hidden="true" />
                              </button>
                            </>
                          )}
                        </div>

                        {/* Carousel Dots */}
                        {facts.length > 3 && (
                          <nav className="flex justify-center space-x-2 mt-6" role="tablist" aria-label={`${country} facts navigation`}>
                            {Array.from({ length: Math.ceil(facts.length / 3) }).map((_, index) => {
                              const isActive = Math.floor(currentIndex / 3) === index;
                              const startFact = index * 3 + 1;
                              const endFact = Math.min((index + 1) * 3, facts.length);
                              return (
                                <button
                                  key={index}
                                  onClick={() => setCarouselIndices(prev => ({ ...prev, [country]: index * 3 }))}
                                  className={`w-3 h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                                    isActive
                                      ? 'bg-amber-500 scale-125'
                                      : 'bg-orange-300 hover:bg-orange-400'
                                  }`}
                                  role="tab"
                                  aria-selected={isActive}
                                  aria-label={`Go to ${country} facts ${startFact}-${endFact} of ${facts.length}`}
                                />
                              );
                            })}
                          </nav>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-orange-600">Loading fascinating facts about {country}...</p>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>

            {/* Global Actions */}
            <section className="flex justify-center gap-4 mt-8" aria-label="Global actions">
              <button
                onClick={generateAllRandomFacts}
                disabled={matchedCountries.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${
                  matchedCountries.length === 0
                    ? 'bg-orange-300 text-orange-500 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-105 shadow-lg'
                }`}
                aria-label={`Refresh facts for all ${matchedCountries.length} countries`}
                aria-describedby="refresh-help-text"
              >
                <RefreshCw className="w-5 h-5" aria-hidden="true" />
                Refresh All Facts
              </button>
              {matchedCountries.length === 0 && (
                <div id="refresh-help-text" className="sr-only">
                  No countries available to refresh. Connect with pen pals to see their countries.
                </div>
              )}
            </section>

            {/* Summary Info */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md text-orange-600" role="status" aria-live="polite">
                <Heart className="w-4 h-4 text-pink-500" aria-hidden="true" />
                <span className="font-medium">
                  {matchedCountries.length} pen pal countr{matchedCountries.length !== 1 ? 'ies' : 'y'}, {Object.values(countryPenPals).reduce((total, pals) => total + pals.length, 0)} pen pals, {Object.values(countryFacts).reduce((total, facts) => total + facts.length, 0)} facts available
                </span>
              </div>
            </div>
          </section>
        )}

        {/* No matches state */}
        {matchedCountries.length === 0 && !isLoadingMatches && (
          <section className="text-center py-16" aria-labelledby="no-matches-heading" role="region">
            <div className="text-8xl mb-6" aria-hidden="true">💌</div>
            <h3 id="no-matches-heading" className="text-2xl font-bold text-orange-600 mb-2">No Pen Pal Countries Yet</h3>
            <p className="text-orange-500 mb-4" id="no-matches-description">
              {matchedUsersCount === 0 
                ? "Start connecting with pen pals to unlock their countries and explore fascinating cultural facts!" 
                : "Your pen pals haven't shared their countries yet. Facts will appear once they update their profiles."
              }
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-orange-100 text-orange-600 rounded-lg" role="note" aria-describedby="no-matches-description">
              <Heart className="w-5 h-5 mr-2" aria-hidden="true" />
              <span>Match with pen pals to explore their cultures</span>
            </div>
          </section>
        )}

        <div id="main-content" tabIndex={-1}></div>
      </main>
    </div>
  );
};

export default CulturalExplorer;