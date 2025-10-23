'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, Shuffle, Globe, RotateCw, Brain, Check, X, Trophy, HelpCircle, Users, Heart, Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import wc from 'world-countries';
import { useSyncProfile } from '@/lib/context/ProfileContext';

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

// Reverse mapping: facts.json names back to world-countries names for flag lookup
const reverseMapCountryName = (factsJsonName: string): string => {
  const reverseMappings: Record<string, string> = {
    'United States of America': 'United States',
    'South Korea': 'Korea (Republic of)',
    'North Korea': 'Korea (Democratic People\'s Republic of)',
    'Turkey': 'Türkiye',
    'Congo (Congo-Brazzaville)': 'Congo',
    'Democratic Republic of the Congo': 'Congo (Democratic Republic of the)',
    'Czech Republic (Czechia)': 'Czechia',
    'Eswatini (fmr. Swaziland)': 'Eswatini',
    'Myanmar (formerly Burma)': 'Myanmar',
    'Palestine State': 'Palestine, State of',
    'Holy See': 'Vatican City',
  };
  
  return reverseMappings[factsJsonName] || factsJsonName;
};

// World Countries utility to resolve alpha2 codes
const resolveAlpha2 = (countryName: string): string | null => {
  // Try to find by the name directly first
  let country = wc.find(c => c.name.common.toLowerCase() === countryName.toLowerCase());
  
  // If not found, try the reverse mapping
  if (!country) {
    const reversedName = reverseMapCountryName(countryName);
    country = wc.find(c => c.name.common.toLowerCase() === reversedName.toLowerCase());
  }
  
  // If still not found, try alternative name fields
  if (!country) {
    country = wc.find(c => 
      c.name.official?.toLowerCase() === countryName.toLowerCase() ||
      c.altSpellings?.some(alt => alt.toLowerCase() === countryName.toLowerCase())
    );
  }
  
  return country?.cca2 || null;
};

// Country name mapping to handle discrepancies between world-countries and facts.json
const mapCountryName = (countryName: string): string => {
  const countryMappings: Record<string, string> = {
    // Common name variations from world-countries to facts.json
    'United States': 'United States of America',
    'Korea (Republic of)': 'South Korea',
    'Korea (Democratic People\'s Republic of)': 'North Korea',
    'Türkiye': 'Turkey',
    'Bolivia (Plurinational State of)': 'Bolivia',
    'Brunei Darussalam': 'Brunei',
    'Cape Verde': 'Cabo Verde',
    'Congo': 'Congo (Congo-Brazzaville)',
    'Republic of the Congo': 'Congo (Congo-Brazzaville)',
    'Congo (Republic of the)': 'Congo (Congo-Brazzaville)',
    'Congo (Democratic Republic of the)': 'Democratic Republic of the Congo',
    'Czechia': 'Czech Republic (Czechia)',
    'Czech Republic': 'Czech Republic (Czechia)',
    'Eswatini': 'Eswatini (fmr. Swaziland)',
    'Swaziland': 'Eswatini (fmr. Swaziland)',
    'Gambia': 'Gambia',
    'Iran (Islamic Republic of)': 'Iran',
    'Lao People\'s Democratic Republic': 'Laos',
    'Micronesia (Federated States of)': 'Micronesia',
    'Moldova (Republic of)': 'Moldova',
    'Myanmar': 'Myanmar (formerly Burma)',
    'Burma': 'Myanmar (formerly Burma)',
    'Macedonia (the former Yugoslav Republic of)': 'North Macedonia',
    'Palestine, State of': 'Palestine State',
    'State of Palestine': 'Palestine State',
    'Russian Federation': 'Russia',
    'Syrian Arab Republic': 'Syria',
    'Tanzania, United Republic of': 'Tanzania',
    'United Republic of Tanzania': 'Tanzania',
    'Timor-Leste': 'Timor-Leste',
    'East Timor': 'Timor-Leste',
    'United Kingdom of Great Britain and Northern Ireland': 'United Kingdom',
    'Venezuela (Bolivarian Republic of)': 'Venezuela',
    'Viet Nam': 'Vietnam',
    'Vatican City': 'Holy See',
    // Handle "the" articles that world-countries sometimes includes
    'Bahamas (the)': 'Bahamas',
    'Central African Republic (the)': 'Central African Republic',
    'Comoros (the)': 'Comoros',
    'Dominican Republic (the)': 'Dominican Republic',
    'Gambia (the)': 'Gambia',
    'Netherlands (the)': 'Netherlands',
    'Niger (the)': 'Niger',
    'Philippines (the)': 'Philippines',
    'Sudan (the)': 'Sudan',
    'United Arab Emirates (the)': 'United Arab Emirates',
  };
  
  return countryMappings[countryName] || countryName;
};

// Flag rendering component
const FRAME_W = 80;  // Increased from 48
const FRAME_H = 54;  // Increased from 32 (maintains 3:2 aspect ratio)

const FlagImage: React.FC<{
  country: string;
  emojiFallback?: string;
}> = ({ country, emojiFallback = '🌍' }) => {
  const [loaded, setLoaded] = useState(false);
  
  // Resolve alpha2 code using our improved lookup function
  const alpha2 = resolveAlpha2(country || '')?.toLowerCase();

  useEffect(() => setLoaded(false), [country]);

  // Debug logging for missing flags
  if (!alpha2 && country) {
    console.warn(`Could not resolve flag for country: "${country}"`);
  }

  if (!alpha2) {
    return (
      <div
        className="grid place-items-center shadow-md"
        style={{
          width: FRAME_W,
          height: FRAME_H,
          borderRadius: 12,
          background: 'linear-gradient(180deg, #fff, #f6f6f6)',
          border: '2px solid rgba(0,0,0,0.12)',
        }}
        role="img"
        aria-label={country ? `${country} flag placeholder` : 'Country flag placeholder'}
      >
        <span style={{ fontSize: Math.min(FRAME_W, FRAME_H) * 0.7 }} aria-hidden="true">{emojiFallback}</span>
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden shadow-md"
      style={{
        width: FRAME_W,
        height: FRAME_H,
        borderRadius: 12,
        background: 'rgba(0,0,0,0.0)',
        border: '2px solid rgba(0,0,0,0.12)',
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
        sizes="(max-width: 768px) 80px, 120px"
        className={`absolute inset-0 transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        style={{
          objectFit: 'cover',       // Better for flags
          objectPosition: 'center' // always centered
        }}
        onLoadingComplete={() => setLoaded(true)}
        priority={true}
        loading="eager"
      />
    </div>
  );
};


const CulturalExplorer = () => {
  const { profile, synced, matches, matchesLoading, fetchMatches } = useSyncProfile();

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
  const [loadingCountries, setLoadingCountries] = useState<Set<string>>(new Set());

  // Quiz state
  const [quizState, setQuizState] = useState<QuizState>('idle');
  const [quizData, setQuizData] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Process matched users and extract their countries
  const processMatches = useCallback(() => {
    if (!synced || !profile?.user_id) {
      return;
    }

    try {
      setIsLoadingMatches(true);
      setMatchedUsersCount(matches.length);

      if (matches.length === 0) {
        setMatchedCountries([]);
        setCountryPenPals({});
        return;
      }

      // Extract unique countries from matched users using country_code
      const countryGroups: Record<string, Array<{ anonymous_handle: string; user_id: string }>> = {};
      const countries: string[] = [];

      matches.forEach(match => {
        const countryCode = match.penpal_profile.country_code;
        if (!countryCode) return;
        
        // Convert country code to country name using world-countries data
        const countryData = wc.find(c => c.cca2?.toLowerCase() === countryCode.toLowerCase());
        const commonName = countryData?.name?.common;
        if (!commonName) return;
        
        // Map to the correct name used in facts.json
        const mappedCountryName = mapCountryName(commonName);
        
        // Debug logging
        if (commonName !== mappedCountryName) {
          console.log(`Country mapping: "${commonName}" -> "${mappedCountryName}"`);
        }
        
        // Group pen pals by country
        if (!countryGroups[mappedCountryName]) {
          countryGroups[mappedCountryName] = [];
          countries.push(mappedCountryName);
        }
        
        countryGroups[mappedCountryName].push({
          anonymous_handle: match.penpal_profile.anonymous_handle,
          user_id: match.penpal_profile.user_id
        });
      });

      setMatchedCountries(countries.sort());
      setCountryPenPals(countryGroups);
    } catch (error) {
      console.error('Error processing matched countries:', error);
      setMatchedCountries([]);
      setCountryPenPals({});
      setMatchedUsersCount(0);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [synced, profile?.user_id, matches]);

  // Fetch matches on component mount
  useEffect(() => {
    if (synced && profile?.user_id && matches.length === 0 && !matchesLoading) {
      fetchMatches();
    }
  }, [synced, profile?.user_id, matches.length, matchesLoading, fetchMatches]);

  // Process matches when they change
  useEffect(() => {
    processMatches();
  }, [processMatches]);

  // Generate interesting facts from REST Countries API data
  const generateInterestingFacts = useCallback((countryData: any): string[] => {
    const facts: string[] = [];
    
    try {
      const name = countryData.name?.common || '';
      
      // Population facts
      if (countryData.population) {
        const pop = countryData.population.toLocaleString();
        facts.push(`${name} has a population of approximately ${pop} people.`);
        
        if (countryData.area) {
          const density = Math.round(countryData.population / countryData.area);
          facts.push(`The population density is about ${density} people per square kilometer.`);
        }
      }
      
      // Capital city
      if (countryData.capital && countryData.capital.length > 0) {
        facts.push(`The capital city of ${name} is ${countryData.capital[0]}.`);
      }
      
      // Languages
      if (countryData.languages && Object.keys(countryData.languages).length > 0) {
        const langs = Object.values(countryData.languages);
        if (langs.length === 1) {
          facts.push(`The official language is ${langs[0]}.`);
        } else if (langs.length === 2) {
          facts.push(`The official languages are ${langs[0]} and ${langs[1]}.`);
        } else {
          facts.push(`${name} has ${langs.length} official languages: ${langs.slice(0, 3).join(', ')}${langs.length > 3 ? ', and more' : ''}.`);
        }
      }
      
      // Currency
      if (countryData.currencies) {
        const currencies = Object.values(countryData.currencies);
        if (currencies.length > 0) {
          const curr: any = currencies[0];
          facts.push(`The currency is the ${curr.name} (${curr.symbol || ''}).`);
        }
      }
      
      // Area
      if (countryData.area) {
        const area = countryData.area.toLocaleString();
        facts.push(`${name} covers an area of ${area} square kilometers.`);
      }
      
      // Borders
      if (countryData.borders && countryData.borders.length > 0) {
        const borderCount = countryData.borders.length;
        if (borderCount === 1) {
          facts.push(`It shares a border with 1 country.`);
        } else {
          facts.push(`It shares borders with ${borderCount} countries.`);
        }
      } else if (countryData.landlocked === false) {
        facts.push(`${name} is an island nation with no land borders.`);
      }
      
      // Region and subregion
      if (countryData.region && countryData.subregion) {
        facts.push(`${name} is located in ${countryData.subregion}, ${countryData.region}.`);
      } else if (countryData.region) {
        facts.push(`It is located in ${countryData.region}.`);
      }
      
      // Timezones
      if (countryData.timezones && countryData.timezones.length > 0) {
        if (countryData.timezones.length === 1) {
          facts.push(`The country operates in a single timezone: ${countryData.timezones[0]}.`);
        } else {
          facts.push(`${name} spans ${countryData.timezones.length} different time zones.`);
        }
      }
      
      // Continents
      if (countryData.continents && countryData.continents.length > 0) {
        if (countryData.continents.length === 1) {
          facts.push(`It is part of the ${countryData.continents[0]} continent.`);
        } else {
          facts.push(`${name} spans across ${countryData.continents.join(' and ')}.`);
        }
      }
      
      // Independence
      if (countryData.independent) {
        facts.push(`${name} is an independent nation.`);
      }
      
      // UN Member
      if (countryData.unMember) {
        facts.push(`It is a member of the United Nations.`);
      }
      
      // Landlocked
      if (countryData.landlocked === true) {
        facts.push(`${name} is a landlocked country with no coastline.`);
      }
      
      // Driving side
      if (countryData.car?.side) {
        const side = countryData.car.side === 'right' ? 'right' : 'left';
        facts.push(`People drive on the ${side} side of the road in ${name}.`);
      }
      
      // Start of week
      if (countryData.startOfWeek) {
        const day = countryData.startOfWeek.charAt(0).toUpperCase() + countryData.startOfWeek.slice(1);
        facts.push(`The week officially starts on ${day}.`);
      }
      
    } catch (error) {
      console.warn('Error generating facts from country data:', error);
    }
    
    return facts;
  }, []);

  // Azure Function configuration - Your deployed serverless app
  const AZURE_FUNCTION_URL = 'https://culturefacts.azurewebsites.net/api/generate-facts';
  const AZURE_FUNCTION_KEY = 'a-B04ykleZ7wtepFrGw8PfQIBffPa5ZpK4xHsgSHGPDMAzFuWSR_sQ==';

  // Get facts from Azure Function (with facts.json as fallback)
  const fetchInterestingFacts = useCallback(async (country: string): Promise<string[]> => {
    // Try Azure Function first with timeout
    try {
      console.log(`🌐 Calling Azure Function for ${country}...`);
      
      // Build URL with function key if available
      const url = AZURE_FUNCTION_KEY 
        ? `${AZURE_FUNCTION_URL}?code=${AZURE_FUNCTION_KEY}`
        : AZURE_FUNCTION_URL;
      
      // Create abort controller for timeout (45 seconds)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          countries: [country],
          factsPerCountry: 15  // Reduced from 50 for faster loading
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.facts?.[country]) {
          const facts = result.data.facts[country];
          console.log(`✅ Loaded ${facts.length} facts for ${country} from Azure Function`);
          return facts;
        }
      }
      
      console.warn(`⚠️ Azure Function returned invalid data for ${country}, status: ${response.status}, falling back to facts.json`);
    } catch (error) {
      console.warn(`⚠️ Azure Function failed for ${country}, falling back to facts.json:`, error);
    }

    // Fallback to facts.json
    try {
      if (!factsData || !factsData[country] || !factsData[country].facts) {
        console.warn(`No facts found for ${country} in facts.json`);
        return [];
      }
      
      const facts = factsData[country].facts;
      console.log(`✅ Loaded ${facts.length} facts for ${country} from facts.json (fallback)`);
      return facts;
      
    } catch (error) {
      console.error(`❌ Failed to fetch facts for ${country}:`, error);
      return [];
    }
  }, [factsData]);

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
      // First fetch matches if we haven't yet, then process countries
      if (matches.length === 0 && !matchesLoading) {
        fetchMatches();
      }
      // processMatches is called automatically when matches change via its own effect
    }
  }, [factsData, matches, matchesLoading, fetchMatches]);

  const currentCountry = useMemo(() => {
    return selectedCountry || (matchedCountries.length > 0 ? matchedCountries[0] : '');
  }, [selectedCountry, matchedCountries]);

  // Helper function to ensure diverse fact categories (different emojis) across slides
  const diversifyFacts = useCallback((facts: string[]): string[] => {
    if (facts.length <= 3) return facts;
    
    // Group facts by their starting emoji (category)
    const factsByCategory: Record<string, string[]> = {};
    facts.forEach(fact => {
      const emoji = fact.match(/^[\p{Emoji}]/u)?.[0] || '❓';
      if (!factsByCategory[emoji]) {
        factsByCategory[emoji] = [];
      }
      factsByCategory[emoji].push(fact);
    });
    
    // Interleave facts from different categories to ensure diversity
    const categories = Object.keys(factsByCategory);
    const diversified: string[] = [];
    let categoryIndex = 0;
    
    // Keep pulling facts from different categories in round-robin fashion
    while (diversified.length < facts.length) {
      const category = categories[categoryIndex % categories.length];
      if (factsByCategory[category] && factsByCategory[category].length > 0) {
        diversified.push(factsByCategory[category].shift()!);
      }
      categoryIndex++;
      
      // Remove empty categories
      if (factsByCategory[category]?.length === 0) {
        delete factsByCategory[category];
        categories.splice(categories.indexOf(category), 1);
      }
    }
    
    return diversified;
  }, []);

  // Function to get interesting facts for a specific country (now from REST Countries API)
  const generateRandomFactsForCountry = useCallback(async (country: string): Promise<string[]> => {
    // Try to fetch from REST Countries API first for interesting, structured facts
    const interestingFacts = await fetchInterestingFacts(country);
    
    if (interestingFacts.length > 0) {
      console.log(`Loaded ${interestingFacts.length} interesting facts for ${country}`);
      // Diversify facts to ensure variety across slides
      return diversifyFacts(interestingFacts);
    }
    
    // Fallback to facts.json if API fails
    if (!factsData[country]?.facts) {
      console.warn(`No facts data available for country: ${country}`);
      return [];
    }
    
    const facts = factsData[country].facts;
    if (facts.length === 0) {
      console.warn(`Empty facts array for country: ${country}`);
      return [];
    }
    
    const shuffled = [...facts].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(12, facts.length));
    return diversifyFacts(selected);
  }, [factsData, fetchInterestingFacts, diversifyFacts]);

  // Function to generate random facts for all matched countries - PROGRESSIVE LOADING
  const generateAllRandomFacts = useCallback(async (append: boolean = false) => {
    // Set all countries as loading
    setLoadingCountries(new Set(matchedCountries));
    
    // Progressive loading: Load each country independently so results appear faster
    matchedCountries.forEach(async (country) => {
      try {
        const facts = await generateRandomFactsForCountry(country);
        
        // Update state immediately as each country loads
        setCountryFacts(prev => {
          if (append) {
            // APPEND new facts to the front of existing facts
            const existingFacts = prev[country] || [];
            const combinedFacts = [...facts, ...existingFacts];
            console.log(`✨ Added ${facts.length} new facts for ${country}. Total: ${combinedFacts.length} facts`);
            return {
              ...prev,
              [country]: combinedFacts
            };
          } else {
            // Initial load - replace existing facts
            return {
              ...prev,
              [country]: facts
            };
          }
        });
        
        setCarouselIndices(prev => ({
          ...prev,
          [country]: 0
        }));
      } catch (error) {
        console.error(`Error loading facts for ${country}:`, error);
        setCountryFacts(prev => ({
          ...prev,
          [country]: []
        }));
      } finally {
        // Remove from loading set
        setLoadingCountries(prev => {
          const newSet = new Set(prev);
          newSet.delete(country);
          return newSet;
        });
      }
    });
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

  const refreshFactsForCountry = useCallback(async (country: string) => {
    // Set loading state
    setLoadingCountries(prev => new Set(prev).add(country));
    
    try {
      const newFacts = await generateRandomFactsForCountry(country);
      
      // APPEND new facts to the front of existing facts (accumulate over time)
      setCountryFacts(prev => {
        const existingFacts = prev[country] || [];
        const combinedFacts = [...newFacts, ...existingFacts];
        
        console.log(`✨ Added ${newFacts.length} new facts for ${country}. Total: ${combinedFacts.length} facts`);
        
        return {
          ...prev,
          [country]: combinedFacts
        };
      });
      
      // Reset carousel to show the NEW facts at the beginning
      setCarouselIndices(prev => ({
        ...prev,
        [country]: 0
      }));
    } catch (error) {
      console.error(`Error refreshing facts for ${country}:`, error);
    } finally {
      // Remove loading state
      setLoadingCountries(prev => {
        const newSet = new Set(prev);
        newSet.delete(country);
        return newSet;
      });
    }
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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <div className="text-8xl mb-4 animate-spin" aria-hidden="true">🃏</div>
          <p className="text-2xl text-orange-800">Loading the cultural explorer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <main className="container mx-auto px-4 py-8">
        {/* Skip to main content for screen readers */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-orange-800 text-white px-4 py-2 rounded-md"
        >
          Skip to main content
        </a>

        {/* Header Section */}
        <div className="text-center mb-12 flex flex-col items-center gap-4">
          <div className="inline-block bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 rounded-3xl px-8 py-6 shadow-lg border-2 border-amber-200">
            <div className="flex items-center justify-center gap-4">
              <Globe className="w-10 h-10 text-orange-600" />
              <h1 id="deck-selection-heading" className="text-5xl font-bold bg-gradient-to-r from-orange-700 via-amber-700 to-yellow-700 bg-clip-text text-transparent">
                Cultural Explorer
              </h1>
              <Sparkles className="w-10 h-10 text-amber-500" />
            </div>
          </div>
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-md border border-amber-200 dark:border-amber-700">
            <p className="text-xl text-amber-800 dark:text-amber-200">
              Discover fascinating facts about countries and test your knowledge with fun quizzes!
            </p>
          </div>
        </div>

        {/* Quiz Loading State */}
        {quizState === 'loading' && currentCountry && (
          <section className="relative max-w-lg mx-auto" aria-labelledby="quiz-loading-heading">
            <div className="absolute inset-0 bg-white rounded-2xl transform rotate-2 shadow-lg" aria-hidden="true" />
            <div className="absolute inset-0 bg-white rounded-2xl transform -rotate-1 shadow-lg" aria-hidden="true" />

            <div className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-2xl border-4 border-amber-300 overflow-hidden">
              {/* Loading header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-100 p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-loading-heading" className="text-2xl font-bold text-white drop-shadow-sm">{currentCountry} Quiz</h2>
                <p className="opacity-90 mt-1 text-white/90">Preparing your questions...</p>
              </div>

              {/* Loading animation */}
              <div className="p-8 bg-gradient-to-br from-amber-50 to-yellow-50 flex flex-col items-center justify-center min-h-[200px]">
                <div className="animate-spin w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full mb-4"></div>
                <p className="text-amber-800 text-center">
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
              className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-2xl border-4 border-amber-300 overflow-hidden transition-all duration-200 opacity-100 scale-100"
            >
              {/* Quiz header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-100 p-6 text-center">
                <div className="mb-2 flex items-center justify-center">
                  {renderFlag(currentCountry)}
                </div>
                <h2 id="quiz-heading" className="text-2xl font-bold text-white drop-shadow-sm">{currentCountry} Quiz</h2>
                <p className="opacity-90 mt-1 text-white/90">
                  Question {currentQuizIndex + 1} of {quizData.length}
                </p>
              </div>

              {/* Quiz content */}
              <div className="p-8 bg-gradient-to-br from-amber-50 to-yellow-50">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-amber-900 mb-4" id={`quiz-question-${currentQuizIndex}`}>
                    {quizData[currentQuizIndex].question}
                  </h3>
                  
                  <fieldset className="space-y-3" aria-labelledby={`quiz-question-${currentQuizIndex}`}>
                    <legend className="sr-only">Choose your answer from the following options</legend>
                    {Object.entries(quizData[currentQuizIndex].options).map(([key, value], index) => (
                      <label
                        key={key}
                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 focus-within:ring-2 focus-within:ring-yellow-400 focus-within:ring-offset-2 ${
                          selectedAnswer === key
                            ? 'border-yellow-400 bg-yellow-50 shadow-sm'
                            : 'border-amber-200 hover:border-yellow-300 hover:bg-yellow-50/30'
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
                            selectedAnswer === key ? 'border-yellow-400 bg-yellow-400' : 'border-amber-300'
                          }`}
                          aria-hidden="true"
                        >
                          {selectedAnswer === key && <div className="w-2 h-2 rounded-full bg-white"></div>}
                        </div>
                        <span className="text-amber-800" id={`option-${key}-description`}>
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
                        ? 'bg-emerald-50 border border-emerald-300' 
                        : 'bg-rose-50 border border-rose-300'
                    }`}
                    role="alert"
                    aria-live="polite"
                    aria-labelledby="quiz-result-status"
                  >
                    <div className="flex items-center mb-2">
                      {quizResults[quizResults.length - 1]?.isCorrect ? (
                        <Check className="w-5 h-5 text-emerald-700 mr-2" aria-hidden="true" />
                      ) : (
                        <X className="w-5 h-5 text-rose-700 mr-2" aria-hidden="true" />
                      )}
                      <span 
                        id="quiz-result-status"
                        className={`font-semibold ${
                          quizResults[quizResults.length - 1]?.isCorrect ? 'text-emerald-900' : 'text-rose-900'
                        }`}
                      >
                        {quizResults[quizResults.length - 1]?.isCorrect ? 'Correct!' : 'Incorrect'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      quizResults[quizResults.length - 1]?.isCorrect ? 'text-emerald-800' : 'text-rose-800'
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
                        className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${
                          selectedAnswer
                            ? 'bg-yellow-400 text-amber-900 hover:bg-yellow-500 hover:scale-105 hover:shadow-lg shadow-md'
                            : 'bg-amber-100 text-amber-300 cursor-not-allowed'
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
                        className="px-6 py-3 bg-yellow-400 text-amber-900 rounded-lg font-semibold hover:bg-yellow-500 hover:scale-105 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 shadow-md"
                        aria-label={currentQuizIndex < quizData.length - 1 ? `Continue to question ${currentQuizIndex + 2} of ${quizData.length}` : 'Complete quiz and view results'}
                      >
                        {currentQuizIndex < quizData.length - 1 ? 'Next Question' : 'Finish Quiz'}
                      </button>
                      <button
                        onClick={restartQuiz}
                        className="px-6 py-3 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 shadow-md"
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
              className="relative bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-2xl border-4 border-amber-300 overflow-hidden transition-all duration-200 opacity-100 scale-100"
            >
              {/* Results header */}
              <div className="bg-gradient-to-r from-amber-500 to-amber-100 p-6 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-yellow-100" aria-hidden="true" />
                <h2 id="quiz-results-heading" className="text-2xl font-bold text-white drop-shadow-sm">Quiz Complete!</h2>
                <p className="opacity-90 mt-1 text-white/90" aria-live="polite">
                  Score: {quizResults.filter(r => r.isCorrect).length} out of {quizResults.length} correct
                  ({Math.round((quizResults.filter(r => r.isCorrect).length / quizResults.length) * 100)}%)
                </p>
              </div>

              {/* Results content */}
              <div className="p-8 bg-gradient-to-br from-amber-50 to-yellow-50">
                <div className="space-y-4 mb-6" role="list" aria-label="Quiz question results">
                  {quizResults.map((result, index) => (
                    <div
                      key={index}
                      role="listitem"
                      className={`p-4 rounded-lg border ${
                        result.isCorrect 
                          ? 'border-emerald-300 bg-emerald-50' 
                          : 'border-rose-300 bg-rose-50'
                      }`}
                      aria-labelledby={`result-${index}-status`}
                    >
                      <div className="flex items-center mb-2">
                        {result.isCorrect ? (
                          <Check className="w-5 h-5 text-emerald-700 mr-2" aria-hidden="true" />
                        ) : (
                          <X className="w-5 h-5 text-rose-700 mr-2" aria-hidden="true" />
                        )}
                        <span id={`result-${index}-status`} className="font-medium text-amber-900">
                          Question {index + 1}: {result.isCorrect ? 'Correct' : 'Incorrect'}
                        </span>
                      </div>
                      <p className="text-sm text-amber-700 mb-1">{result.question}</p>
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
                    className="px-6 py-3 bg-yellow-400 text-amber-900 rounded-lg font-semibold hover:bg-yellow-500 hover:scale-105 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 shadow-md"
                    aria-label="Start a new quiz with different questions"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={restartQuiz}
                    className="px-6 py-3 bg-pink-500 text-white rounded-lg font-semibold hover:bg-pink-600 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 shadow-md"
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
                  <article key={country} className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl shadow-xl border-2 border-amber-200 overflow-hidden" aria-labelledby={`country-${country.replace(/\s+/g, '-').toLowerCase()}-heading`}>
                    {/* Country Header */}
                    <header className="relative bg-gradient-to-r from-amber-600 to-pink-300 text-white p-8 overflow-hidden">
                      {/* Enhanced wood grain texture - Much more visible and realistic */}
                      
                      {/* Fine vertical wood grain lines */}
                      <div className="absolute inset-0 opacity-40" style={{
                        backgroundImage: `
                          repeating-linear-gradient(90deg, 
                            transparent 0px, 
                            rgba(101,67,33,0.15) 0.5px, 
                            transparent 1px, 
                            transparent 4px,
                            rgba(101,67,33,0.25) 4.5px,
                            transparent 5px,
                            transparent 12px,
                            rgba(139,115,85,0.2) 12.5px,
                            transparent 13px,
                            transparent 18px
                          )`
                      }} />
                      
                      {/* Horizontal fiber texture */}
                      <div className="absolute inset-0 opacity-25" style={{
                        backgroundImage: `
                          repeating-linear-gradient(0deg,
                            transparent 0px,
                            rgba(101,67,33,0.08) 0.5px,
                            transparent 1px,
                            transparent 1.5px
                          )`
                      }} />
                      
                      {/* Wood knots and growth rings */}
                      <div className="absolute inset-0 opacity-45" style={{
                        backgroundImage: `
                          radial-gradient(ellipse 150px 80px at 25% 30%, rgba(101,67,33,0.35) 0%, rgba(101,67,33,0.15) 30%, transparent 60%),
                          radial-gradient(ellipse 120px 60px at 75% 65%, rgba(139,115,85,0.3) 0%, rgba(139,115,85,0.12) 35%, transparent 65%),
                          radial-gradient(ellipse 100px 50px at 50% 85%, rgba(101,67,33,0.25) 0%, rgba(101,67,33,0.1) 40%, transparent 70%),
                          radial-gradient(ellipse 80px 40px at 15% 70%, rgba(139,115,85,0.2) 0%, transparent 50%)
                        `,
                        backgroundSize: '100% 100%'
                      }} />
                      
                      {/* Wood plank banding/shading */}
                      <div className="absolute inset-0 opacity-35" style={{
                        backgroundImage: `
                          linear-gradient(90deg, 
                            rgba(101,67,33,0.1) 0%, 
                            rgba(139,115,85,0.25) 15%, 
                            rgba(139,115,85,0.45) 50%, 
                            rgba(139,115,85,0.25) 85%, 
                            rgba(101,67,33,0.1) 100%
                          )
                        `,
                        backgroundSize: '180px 100%',
                        backgroundRepeat: 'repeat-x'
                      }} />
                      
                      {/* Subtle highlights for depth */}
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `
                          linear-gradient(135deg, 
                            rgba(255,255,255,0.1) 0%, 
                            transparent 30%, 
                            transparent 70%, 
                            rgba(0,0,0,0.05) 100%
                          )
                        `
                      }} />
                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center justify-center flex-shrink-0">
                            {renderFlag(country)}
                          </div>
                          <div className="flex-1">
                            <h3 id={`country-${country.replace(/\s+/g, '-').toLowerCase()}-heading`} className="text-3xl font-bold">{country}</h3>
                            <p className="text-amber-100 text-lg" aria-live="polite">
                              {facts.length > 0 ? `${facts.length} fascinating facts available` : 'Loading facts...'}
                            </p>
                            {/* Pen Pal Information */}
                            {countryPenPals[country] && countryPenPals[country].length > 0 && (
                              <div className="mt-2">
                                <p className="text-amber-100 text-sm">
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
                                      className="inline-block bg-white/30 hover:bg-white/40 text-white text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500"
                                      aria-label={`Show ${countryPenPals[country].length - 4} more pen pals from ${country}`}
                                    >
                                      +{countryPenPals[country].length - 4} more
                                    </button>
                                  )}
                                  {expandedPenPals[country] && countryPenPals[country].length > 4 && (
                                    <button
                                      onClick={() => setExpandedPenPals(prev => ({ ...prev, [country]: false }))}
                                      className="inline-block bg-white/30 hover:bg-white/40 text-white text-xs px-2 py-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500"
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
                            disabled={loadingCountries.has(country)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500"
                            aria-label={`Load 15 more facts for ${country}`}
                            title={`Load 15 more facts for ${country}`}
                          >
                            <RefreshCw className={`w-5 h-5 ${loadingCountries.has(country) ? 'animate-spin' : ''}`} aria-hidden="true" />
                          </button>
                          <button
                            onClick={() => {
                              generateQuiz(country);
                            }}
                            disabled={facts.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-amber-500"
                            aria-label={`Start quiz about ${country}`}
                          >
                            <Brain className="w-4 h-4" aria-hidden="true" />
                            Quiz
                          </button>
                        </div>
                      </div>
                    </header>

                    {/* Facts Carousel */}
                    {loadingCountries.has(country) ? (
                      <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p className="text-amber-800">Loading fascinating facts about {country}...</p>
                      </div>
                    ) : countryFacts.hasOwnProperty(country) && facts.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="text-amber-800">
                          <p className="text-lg font-semibold mb-2">No facts available yet</p>
                          <p className="text-sm text-amber-600">We don&apos;t have cultural facts for {country} in our database yet. Check back soon!</p>
                        </div>
                      </div>
                    ) : facts.length > 0 ? (
                      <div className="p-6">
                        <div className="relative px-12">
                          {/* Three Cards Layout */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {facts.slice(currentIndex, currentIndex + 3).map((fact, index) => {
                              const cardIndex = currentIndex + index;
                              return (
                                <div
                                  key={cardIndex}
                                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 min-h-[250px] flex flex-col shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                                >
                                  <div className="flex-1 flex flex-col">
                                    <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold text-base mx-auto mb-4 shadow-md flex-shrink-0">
                                      {cardIndex + 1}
                                    </div>
                                    <p className="text-gray-800 text-base leading-relaxed flex-1">
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
                                  className="bg-amber-50 rounded-xl p-6 min-h-[200px] flex items-center justify-center opacity-50"
                                >
                                  <div className="text-amber-400 text-center">
                                    <div className="w-8 h-8 bg-amber-200 rounded-full flex items-center justify-center text-amber-600 font-bold text-sm mx-auto mb-3">
                                      {currentIndex + facts.slice(currentIndex, currentIndex + 3).length + index + 1}
                                    </div>
                                    <p className="text-sm">No more facts</p>
                                  </div>
                                </div>
                              ))}
                          </div>

                          {/* Navigation Arrows - positioned outside cards */}
                          {facts.length > 3 && (
                            <>
                              <button
                                onClick={() => navigateCarousel(country, 'prev')}
                                disabled={currentIndex === 0}
                                className={`absolute -left-2 top-1/2 -translate-y-1/2 p-3 bg-white shadow-lg rounded-full transition-all duration-200 hover:scale-110 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 z-10 ${
                                  currentIndex === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'
                                }`}
                                aria-label={`Show previous 3 facts for ${country} (currently showing ${currentIndex + 1}-${Math.min(currentIndex + 3, facts.length)} of ${facts.length})`}
                              >
                                <ChevronLeft className="w-6 h-6 text-amber-700" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() => navigateCarousel(country, 'next')}
                                disabled={currentIndex + 3 >= facts.length}
                                className={`absolute -right-2 top-1/2 -translate-y-1/2 p-3 bg-white shadow-lg rounded-full transition-all duration-200 hover:scale-110 hover:bg-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 z-10 ${
                                  currentIndex + 3 >= facts.length ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-xl'
                                }`}
                                aria-label={`Show next 3 facts for ${country} (currently showing ${currentIndex + 1}-${Math.min(currentIndex + 3, facts.length)} of ${facts.length})`}
                              >
                                <ChevronRight className="w-6 h-6 text-amber-700" aria-hidden="true" />
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
                                  className={`w-3 h-3 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${
                                    isActive
                                      ? 'bg-gradient-to-r from-yellow-400 to-pink-400 scale-125 shadow-sm'
                                      : 'bg-amber-200 hover:bg-yellow-300'
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
                    ) : null}
                  </article>
                );
              })}
            </div>

            {/* Global Actions */}
            <section className="flex justify-center gap-4 mt-8" aria-label="Global actions">
              <button
                onClick={() => generateAllRandomFacts(true)}
                disabled={matchedCountries.length === 0}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 ${
                  matchedCountries.length === 0
                    ? 'bg-amber-100 text-amber-300 cursor-not-allowed'
                    : 'bg-gradient-to-r from-yellow-400 to-pink-400 text-white hover:from-yellow-500 hover:to-pink-500 hover:scale-105 hover:shadow-xl shadow-lg'
                }`}
                aria-label={`Generate more facts for all ${matchedCountries.length} countries`}
                aria-describedby="refresh-help-text"
              >
                <RefreshCw className="w-5 h-5" aria-hidden="true" />
                Load More Facts
              </button>
              {matchedCountries.length === 0 && (
                <div id="refresh-help-text" className="sr-only">
                  No countries available to refresh. Connect with pen pals to see their countries.
                </div>
              )}
            </section>

            {/* Summary Info */}
            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-yellow-50 to-pink-50 rounded-full shadow-md border border-pink-200 text-amber-800" role="status" aria-live="polite">
                <Heart className="w-4 h-4 text-pink-500 animate-pulse" aria-hidden="true" />
                <span className="font-medium">
                  {matchedCountries.length} pen pal countr{matchedCountries.length !== 1 ? 'ies' : 'y'}, {Object.values(countryPenPals).reduce((total, pals) => total + pals.length, 0)} pen pals, {Object.values(countryFacts).reduce((total, facts) => total + facts.length, 0)} facts available
                </span>
              </div>
            </div>
          </section>
        )}

        {/* No matches state */}
        {matchedCountries.length === 0 && !isLoadingMatches && !matchesLoading && (
          <section className="text-center py-16" aria-labelledby="no-matches-heading" role="region">
            <div className="text-8xl mb-6" aria-hidden="true">💌</div>
            <h3 id="no-matches-heading" className="text-2xl font-bold text-amber-900 mb-2">No Pen Pal Countries Yet</h3>
            <p className="text-amber-700 mb-4" id="no-matches-description">
              {matchedUsersCount === 0 
                ? "Start connecting with pen pals to unlock their countries and explore fascinating cultural facts!" 
                : "Your pen pals haven't shared their countries yet. Facts will appear once they update their profiles."
              }
            </p>
            <div className="inline-flex items-center px-6 py-3 bg-amber-50 text-amber-700 rounded-lg" role="note" aria-describedby="no-matches-description">
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