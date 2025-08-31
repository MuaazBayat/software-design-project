'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Shuffle, Globe, RotateCw } from 'lucide-react';
import Image from 'next/image';
import wc from 'world-countries';

type DeckType = 'my-country' | 'random' | 'select-country';

interface CountryFacts {
  emoji: string;
  facts: string[];
}
interface FactsData {
  [country: string]: CountryFacts;
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
      >
        <span style={{ fontSize: Math.min(FRAME_W, FRAME_H) * 0.6 }}>{emojiFallback}</span>
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
    >
      {!loaded && <div className="animate-pulse bg-gray-200/70 absolute inset-0 rounded" />}

      <Image
        src={`https://flagcdn.com/w320/${alpha2}.png`}
        alt={`${country} flag`}
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
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('random');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [factsData, setFactsData] = useState<FactsData>({});
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [cardKey, setCardKey] = useState(0);
  const [cardVisible, setCardVisible] = useState(true);

  useEffect(() => {
    const loadFacts = async () => {
      try {
        const response = await fetch('/facts.json', { cache: 'force-cache' });
        if (!response.ok) throw new Error(String(response.status));
        const data: FactsData = await response.json();
        setFactsData(data);
        setAvailableCountries(Object.keys(data).sort());
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
        setAvailableCountries(Object.keys(fallbackData).sort());
      } finally {
        setIsLoading(false);
      }
    };
    loadFacts();
  }, []);

  const getRandomCountry = () => {
    if (availableCountries.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * availableCountries.length);
    return availableCountries[randomIndex];
  };

  const currentCountry = useMemo(() => {
    switch (selectedDeck) {
      case 'my-country':
        return 'South Africa';
      case 'random':
        return selectedCountry || getRandomCountry();
      case 'select-country':
        return selectedCountry;
      default:
        return '';
    }
  }, [selectedDeck, selectedCountry, availableCountries]);

  const currentFacts = useMemo(() => {
    if (!currentCountry || !factsData[currentCountry]) return [];
    return factsData[currentCountry].facts;
  }, [currentCountry, factsData]);

  const currentFact = currentFacts.length
    ? currentFacts[currentFactIndex % currentFacts.length]
    : 'Select a country to see amazing facts!';

  useEffect(() => {
    if (selectedDeck === 'random' && availableCountries.length > 0 && !selectedCountry) {
      setSelectedCountry(getRandomCountry());
    }
  }, [availableCountries, selectedDeck, selectedCountry]);

  const fadeCardOutIn = () => {
    setCardVisible(false);
    setTimeout(() => {
      setCardKey((k) => k + 1);
      setCardVisible(true);
    }, 220);
  };

  const flipCard = () => {
    if (isFlipping) return;
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentFactIndex((prev) => prev + 1);
      setIsFlipping(false);
      fadeCardOutIn();
    }, 220);
  };

  const shuffleDeck = () => {
    if (selectedDeck === 'random') {
      setSelectedCountry(getRandomCountry());
      setCurrentFactIndex(0);
      fadeCardOutIn();
    }
  };

  const handleDeckChange = (deck: DeckType) => {
    setSelectedDeck(deck);
    setCurrentFactIndex(0);
    if (deck === 'random') {
      setSelectedCountry(getRandomCountry());
    } else if (deck === 'select-country' && !selectedCountry) {
      setSelectedCountry(availableCountries[0] || '');
    }
    fadeCardOutIn();
  };

  const renderFlag = (country: string | null | undefined) => {
    const emoji = country && factsData[country]?.emoji ? factsData[country].emoji : '🌍';
    return <FlagFrame country={country} emojiFallback={emoji} />;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl mb-4 animate-spin">🃏</div>
          <p className="text-2xl text-gray-700">Loading the deck...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdf6f0]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Deck Selection */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-center text-[#6b3f2a] tracking-tighter mb-6">
            Explore your country of choice!
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => handleDeckChange('my-country')}
              className={`p-6 transition-all duration-300 ${
                selectedDeck === 'my-country'
                  ? 'border-purple-500 bg-purple-100 scale-105 shadow-xl'
                  : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-lg'
              }`}
            >
              <div className="text-4xl mb-3">🏠</div>
              <h3 className="text-xl font-bold text-gray-800">My Country</h3>
              <p className="text-gray-600 mt-2">Facts about South Africa</p>
            </button>

            <button
              onClick={() => handleDeckChange('random')}
              className={`p-6 transition-all duration-300 ${
                selectedDeck === 'random'
                  ? 'border-blue-500 bg-blue-100 scale-105 shadow-xl'
                  : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-lg'
              }`}
            >
              <div className="text-4xl mb-3">🎲</div>
              <h3 className="text-xl font-bold text-gray-800">Random Country</h3>
              <p className="text-gray-600 mt-2">Surprise me!</p>
            </button>

            <button
              onClick={() => handleDeckChange('select-country')}
              className={`p-6 transition-all duration-300 ${
                selectedDeck === 'select-country'
                  ? 'bg-gradient-to-r from-[#f7dac0] via-[#fcdab4] to-[#fcd3a1] scale-105 shadow-xl'
                  : 'border-gray-300 bg-white hover:border-green-300 hover:shadow-lg'
              }`}
            >
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-xl font-bold text-gray-800">Choose Country</h3>
              <p className="text-gray-600 mt-2">Pick any country</p>
            </button>
          </div>
        </div>

        {/* Country Selector */}
        {selectedDeck === 'select-country' && (
          <div className="text-center mb-8">
            <div className="inline-block relative">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentFactIndex(0);
                  fadeCardOutIn();
                }}
                className="appearance-none bg-white border-gray-300 px-6 py-3 pr-10 text-lg font-medium text-gray-700 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
              >
                <option value="">Select a country...</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Card Stack */}
        {currentCountry && (
          <div className="relative max-w-lg mx-auto">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" />

            <div
              key={cardKey}
              className={`relative bg-white rounded-2xl shadow-2xl border-4 border-gray-200 overflow-hidden transition-all duration-200 ${
                cardVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              {/* Card header */}
              <div className="bg-gradient-to-r from-[#11120c] via-[#433e30] to-[#5a3e2b] text-white p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 className="text-2xl font-bold">{currentCountry}</h2>
                <p className="opacity-75 mt-1">
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
                  >
                    {currentFact}
                  </p>
                </div>
              </div>

              {/* Card actions */}
              <div className="p-6 bg-gray-50 border-t">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={flipCard}
                    disabled={isFlipping || currentFacts.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-lg transition-all duration-200 ${
                      isFlipping
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black rounded-sm text-white hover:scale-105 shadow-lg'
                    }`}
                  >
                    <RotateCw className={`w-5 h-5 ${isFlipping ? 'animate-spin' : ''}`} />
                    {isFlipping ? 'Flipping...' : 'Next Fact'}
                  </button>

                  {selectedDeck === 'random' && (
                    <button
                      onClick={shuffleDeck}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-sm font-bold text-lg hover:bg-gray-600 hover:scale-105 transition-all duration-200 shadow-lg"
                    >
                      <Shuffle className="w-5 h-5" />
                      Shuffle
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Deck info */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md text-gray-600">
                <Globe className="w-4 h-4" />
                <span className="font-medium">{availableCountries.length} countries available</span>
              </div>
            </div>
          </div>
        )}

        {/* No selection state */}
        {!currentCountry && selectedDeck === 'select-country' && (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🎴</div>
            <h3 className="text-2xl font-bold text-gray-600 mb-2">Select a Country</h3>
            <p className="text-gray-500">Choose a country from the dropdown to start exploring facts!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CulturalExplorer;
