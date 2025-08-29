'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Shuffle, Globe, RotateCw } from 'lucide-react';

type DeckType = 'my-country' | 'random' | 'select-country';

interface CountryFacts {
  emoji: string;
  facts: string[];
}

interface FactsData {
  [country: string]: CountryFacts;
}

const CulturalExplorer = () => {
  const [selectedDeck, setSelectedDeck] = useState<DeckType>('random');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [currentFactIndex, setCurrentFactIndex] = useState(0);
  const [isFlipping, setIsFlipping] = useState(false);
  const [factsData, setFactsData] = useState<FactsData>({});
  const [availableCountries, setAvailableCountries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load facts data
  useEffect(() => {
    const loadFacts = async () => {
      try {
        const response = await fetch('/facts.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: FactsData = await response.json();
        setFactsData(data);
        setAvailableCountries(Object.keys(data).sort());
        console.log(`Loaded ${Object.keys(data).length} countries`);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading facts:', error);
        // Fallback data for development
        const fallbackData: FactsData = {
          'South Africa': {
            emoji: '🇿🇦',
            facts: [
              'South Africa has 11 official languages - more than any other country!',
              'The world\'s largest diamond was found in South Africa in 1905.',
              'South Africa is the only country to voluntarily dismantle its nuclear weapons program.',
              'Cape Town\'s Table Mountain is one of the New7Wonders of Nature.',
              'South Africa has the world\'s deepest gold mine, nearly 4km underground!'
            ]
          },
          'Japan': {
            emoji: '🇯🇵',
            facts: [
              'Japan consists of 6,852 islands, though only 430 are inhabited.',
              'In Japan, slurping your noodles loudly is considered polite!',
              'Japan has more pets than children.',
              'Square watermelons are grown in Japan to save space.',
              'Japan has over 50,000 people aged 100 or older.'
            ]
          }
        };
        setFactsData(fallbackData);
        setAvailableCountries(Object.keys(fallbackData).sort());
        setIsLoading(false);
      }
    };
    loadFacts();
  }, []);

  // Get random country
  const getRandomCountry = () => {
    if (availableCountries.length === 0) return '';
    const randomIndex = Math.floor(Math.random() * availableCountries.length);
    return availableCountries[randomIndex];
  };

  // Get current country based on deck type
  const getCurrentCountry = () => {
    switch (selectedDeck) {
      case 'my-country':
        return 'South Africa'; // Default to South Africa as example
      case 'random':
        return selectedCountry || getRandomCountry();
      case 'select-country':
        return selectedCountry;
      default:
        return '';
    }
  };

  // Get current facts for display
  const getCurrentFacts = () => {
    const country = getCurrentCountry();
    if (!country || !factsData[country]) return [];
    return factsData[country].facts;
  };

  // Get current fact
  const getCurrentFact = () => {
    const facts = getCurrentFacts();
    if (facts.length === 0) return 'Select a country to see amazing facts!';
    return facts[currentFactIndex % facts.length];
  };

  // Get country emoji
  const getCountryEmoji = () => {
    const country = getCurrentCountry();
    if (!country || !factsData[country]) {
      console.log('No country or country data:', country);
      return '🌍';
    }
    
    const emoji = factsData[country].emoji || getCountryFlagEmoji(country);
    console.log(`Emoji for ${country}:`, emoji);
    return emoji;
  };

  // Simple function to get flag emoji (expanded)
  const getCountryFlagEmoji = (country: string) => {
    const flagEmojis: { [key: string]: string } = {
      // Major countries
      'South Africa': '🇿🇦',
      'United States': '🇺🇸',
      'Japan': '🇯🇵',
      'Brazil': '🇧🇷',
      'India': '🇮🇳',
      'France': '🇫🇷',
      'Germany': '🇩🇪',
      'China': '🇨🇳',
      'United Kingdom': '🇬🇧',
      'Australia': '🇦🇺',
      'Canada': '🇨🇦',
      'Russia': '🇷🇺',
      'Italy': '🇮🇹',
      'Spain': '🇪🇸',
      'Mexico': '🇲🇽',
      'Argentina': '🇦🇷',
      'Egypt': '🇪🇬',
      'Nigeria': '🇳🇬',
      'Kenya': '🇰🇪',
      'Morocco': '🇲🇦',
      'Turkey': '🇹🇷',
      'Iran': '🇮🇷',
      'Saudi Arabia': '🇸🇦',
      'Israel': '🇮🇱',
      'Pakistan': '🇵🇰',
      'Bangladesh': '🇧🇩',
      'Thailand': '🇹🇭',
      'Vietnam': '🇻🇳',
      'Indonesia': '🇮🇩',
      'Philippines': '🇵🇭',
      'Malaysia': '🇲🇾',
      'Singapore': '🇸🇬',
      'South Korea': '🇰🇷',
      'North Korea': '🇰🇵',
      'Taiwan': '🇹🇼',
      'Nepal': '🇳🇵',
      'Sri Lanka': '🇱🇰',
      'Afghanistan': '🇦🇫',
      'Ukraine': '🇺🇦',
      'Poland': '🇵🇱',
      'Netherlands': '🇳🇱',
      'Belgium': '🇧🇪',
      'Switzerland': '🇨🇭',
      'Austria': '🇦🇹',
      'Sweden': '🇸🇪',
      'Norway': '🇳🇴',
      'Denmark': '🇩🇰',
      'Finland': '🇫🇮',
      'Greece': '🇬🇷',
      'Portugal': '🇵🇹',
      'Ireland': '🇮🇪',
      'Iceland': '🇮🇸',
      'Chile': '🇨🇱',
      'Peru': '🇵🇪',
      'Colombia': '🇨🇴',
      'Venezuela': '🇻🇪',
      'Ecuador': '🇪🇨',
      'Bolivia': '🇧🇴',
      'Uruguay': '🇺🇾',
      'Paraguay': '🇵🇾',
      'New Zealand': '🇳🇿'
    };
    
    console.log(`Looking up flag for: "${country}"`);
    const flag = flagEmojis[country];
    console.log(`Found flag: ${flag || '🏴 (fallback)'}`);
    return flag || '🏴';
  };

  // Flip to next fact
  const flipCard = () => {
    if (isFlipping) return;
    
    setIsFlipping(true);
    setTimeout(() => {
      setCurrentFactIndex(prev => prev + 1);
      setIsFlipping(false);
    }, 300);
  };

  // Shuffle deck (get new random country for random deck)
  const shuffleDeck = () => {
    if (selectedDeck === 'random') {
      const newRandomCountry = getRandomCountry();
      console.log('Shuffling to:', newRandomCountry);
      setSelectedCountry(newRandomCountry);
      setCurrentFactIndex(0);
    }
  };

  // Handle deck change
  const handleDeckChange = (newDeck: DeckType) => {
    setSelectedDeck(newDeck);
    setCurrentFactIndex(0);
    
    if (newDeck === 'random') {
      const randomCountry = getRandomCountry();
      setSelectedCountry(randomCountry);
      console.log('Selected random country:', randomCountry);
    } else if (newDeck === 'select-country' && !selectedCountry) {
      setSelectedCountry(availableCountries[0] || '');
    }
  };

  // Initialize random country when data loads
  useEffect(() => {
    if (selectedDeck === 'random' && availableCountries.length > 0 && !selectedCountry) {
      const randomCountry = getRandomCountry();
      setSelectedCountry(randomCountry);
      console.log('Initialized random country:', randomCountry);
    }
  }, [availableCountries, selectedDeck, selectedCountry]);

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

  const currentCountry = getCurrentCountry();
  const currentFacts = getCurrentFacts();

  return (
    <div className="min-h-screen  bg-[#fdf6f0]">

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Deck Selection */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-center text-[#6b3f2a] tracking-tighter mb-6">Explore your country of choice!</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* My Country Deck */}
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

            {/* Random Country Deck */}
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

            {/* Select Country Deck */}
            <button
              onClick={() => handleDeckChange('select-country')}
              className={`p-6  transition-all duration-300 ${
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

        {/* Country Selector (for select-country deck) */}
        {selectedDeck === 'select-country' && (
          <div className="text-center mb-8">
            <div className="inline-block relative">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setCurrentFactIndex(0);
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
            {/* Stack effect - background cards */}
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg"></div>
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg"></div>
            
            {/* Main card */}
            <div className={`relative bg-white rounded-2xl shadow-2xl border-4 border-gray-200 overflow-hidden transition-transform duration-300 ${
              isFlipping ? 'scale-95 rotate-3' : 'scale-100'
            }`}>
              {/* Card header */}
              <div className="bg-gradient-to-r from-[#11120c] via-[#433e30] to-[#5a3e2b] text-white p-6 text-center">
                <div className="text-6xl mb-2">{getCountryEmoji()}</div>
                <h2 className="text-2xl font-bold">{currentCountry}</h2>
                <p className="opacity-75 mt-1">Card {currentFactIndex + 1} of {currentFacts.length}</p>
              </div>

              {/* Card body */}
              <div className="p-8">
                <div className="min-h-[140px] flex items-center justify-center">
                  <p className="text-lg text-gray-700 leading-relaxed text-center">
                    {getCurrentFact()}
                  </p>
                </div>
              </div>

              {/* Card actions */}
              <div className="p-6 bg-gray-50 border-t">
                <div className="flex justify-center gap-4">
                  <button
                    onClick={flipCard}
                    disabled={isFlipping || currentFacts.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 font-bold text-lg transition-all duration-300 ${
                      isFlipping
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black rounded-sm text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-lg'
                    }`}
                  >
                    <RotateCw className={`w-5 h-5 ${isFlipping ? 'animate-spin' : ''}`} />
                    {isFlipping ? 'Flipping...' : 'Next Fact'}
                  </button>

                  {selectedDeck === 'random' && (
                    <button
                      onClick={shuffleDeck}
                      className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-sm font-bold text-lg hover:bg-gray-600 hover:scale-105 transition-all duration-300 shadow-lg"
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
                <span className="font-medium">
                  {availableCountries.length} countries available
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No country selected state */}
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