"use client";

import React, { useState, useEffect } from 'react';
import { useUser } from "@clerk/nextjs";
import { Heart, X, Settings, Globe, MapPin, Camera, Book, Mountain, Star, Clock, MessageCircle } from 'lucide-react';

interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  bio?: string;
  age_range?: string;
  primary_language?: string;
  secondary_languages?: string[];
  time_zone?: string;
  country_code?: string;
  interests?: string[];
  favorite_local_fact?: string;
  preferred_correspondence_type?: string;
  cultural_completeness_score?: number;
  last_active?: string;
}

interface MatchingPreferences {
  match_type: 'long-term' | 'one-time' | 'either';
  languages: string[];
  age_ranges: string[];
  country_codes: string[];
  interests: string[];
  exclude_previous: boolean;
  max_timezone_difference?: number;
}

interface DailyStats {
  matches_used: number;
  matches_remaining: number;
  total_daily_limit: number;
  reset_time: string;
}

const API_BASE_URL = 'http://localhost:8001';

// Helper functions
const getLocationDisplay = (profile: UserProfile) => {
const countryNames: { [key: string]: string } = {
  'JP': 'Japan', 'US': 'United States', 'FR': 'France', 'DE': 'Germany',
  'GB': 'United Kingdom', 'CA': 'Canada', 'AU': 'Australia', 'ES': 'Spain',
  'IT': 'Italy', 'BR': 'Brazil', 'IN': 'India', 'CN': 'China', 'KR': 'South Korea',
  'MX': 'Mexico', 'RU': 'Russia', 'ZA': 'South Africa', 'EG': 'Egypt', 'AR': 'Argentina',
  'NG': 'Nigeria', 'PK': 'Pakistan', 'BD': 'Bangladesh', 'TR': 'Turkey', 'ID': 'Indonesia',
  'SA': 'Saudi Arabia', 'IR': 'Iran', 'TH': 'Thailand', 'SE': 'Sweden', 'NL': 'Netherlands',
  'PL': 'Poland', 'GR': 'Greece', 'FI': 'Finland', 'IE': 'Ireland', 'NO': 'Norway',
  'CH': 'Switzerland', 'CL': 'Chile', 'CO': 'Colombia', 'DK': 'Denmark', 'HK': 'Hong Kong',
  'HU': 'Hungary', 'IS': 'Iceland', 'IL': 'Israel', 'NZ': 'New Zealand', 'PH': 'Philippines',
  'PT': 'Portugal', 'SG': 'Singapore', 'TW': 'Taiwan', 'AE': 'United Arab Emirates', 'VN': 'Vietnam'
};
  return countryNames[profile.country_code || ''] || profile.country_code || 'Unknown';
};

const getAgeRangeDisplay = (ageRange?: string) => {
  const ageRangeMap: { [key: string]: string } = {
    '13-17': 'Teen',
    '18-24': 'Young Adult',
    '25-34': 'Adult',
    '35-49': 'Middle-aged',
    '50+': 'Senior'
  };
  return ageRange ? ageRangeMap[ageRange] || ageRange : '';
};

const getLanguageDisplay = (langCode: string) => {
  const languages: { [key: string]: string } = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'ja': 'Japanese', 'ko': 'Korean', 'zh': 'Chinese', 'pt': 'Portuguese',
    'it': 'Italian', 'ru': 'Russian', 'ar': 'Arabic', 'hi': 'Hindi'
  };
  return languages[langCode] || langCode.toUpperCase();
};

const getTimeSinceActive = (lastActive?: string) => {
  if (!lastActive) return 'Never';
  const now = new Date();
  const lastActiveDate = new Date(lastActive);
  const diffMs = now.getTime() - lastActiveDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return 'Over a week ago';
};

const InterestTag: React.FC<{ interest: string }> = ({ interest }) => {
  const getIcon = (interest: string) => {
    const lowerInterest = interest.toLowerCase();
    if (lowerInterest.includes('read')) return <Book className="w-3 h-3" />;
    if (lowerInterest.includes('photo')) return <Camera className="w-3 h-3" />;
    if (lowerInterest.includes('hik')) return <Mountain className="w-3 h-3" />;
    return <Star className="w-3 h-3" />;
  };

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full text-xs text-amber-700 border border-amber-200">
      {getIcon(interest)}
      <span className="font-medium">{interest}</span>
    </div>
  );
};

// FilterModal component
interface FilterModalProps {
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
  matchingPreferences: any; // Assuming type definition
  setMatchingPreferences: (prefs: any) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({
  showFilters,
  setShowFilters,
  matchingPreferences,
  setMatchingPreferences
}) => {
  return (
    <div className={`fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 transition-opacity ${showFilters ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 transform transition-transform max-h-[80vh] overflow-y-auto ${showFilters ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-semibold text-stone-800">Find Your Perfect Match</h3>
          <button onClick={() => setShowFilters(false)} className="p-2 hover:bg-stone-100 rounded-full">
            <X className="w-6 h-6 text-stone-600" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">Correspondence Type</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'long-term', label: '📧 Long term', desc: 'Thoughtful letters' },
                { value: 'one-time', label: '💬 One time', desc: 'Quick messages' },
                { value: 'either', label: '✨ Either', desc: 'I\'m flexible' }
              ].map(type => (
                <button
                  key={type.value}
                  className={`p-3 rounded-xl text-center transition-all border-2 ${
                    matchingPreferences.match_type === type.value
                      ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white border-yellow-400 shadow-lg'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                  }`}
                  onClick={() => setMatchingPreferences({ ...matchingPreferences, match_type: type.value as 'long-term' | 'one-time' | 'either' })}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs opacity-75">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">Age Range</label>
            <div className="flex flex-wrap gap-2">
              {['18-25', '26-35', '36-45', '46+'].map(range => (
                <button
                  key={range}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    matchingPreferences.age_ranges.includes(range)
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                  onClick={() => {
                    const newRanges = matchingPreferences.age_ranges.includes(range)
                      ? matchingPreferences.age_ranges.filter((r: string) => r !== range)
                      : [...matchingPreferences.age_ranges, range];
                    setMatchingPreferences({ ...matchingPreferences, age_ranges: newRanges });
                  }}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-3">Languages</label>
            <div className="flex flex-wrap gap-2">
              {[
                { code: 'en', name: '🇺🇸 English' },
                { code: 'es', name: '🇪🇸 Spanish' },
                { code: 'fr', name: '🇫🇷 French' },
                { code: 'de', name: '🇩🇪 German' },
                { code: 'ja', name: '🇯🇵 Japanese' },
                { code: 'ko', name: '🇰🇷 Korean' },
                { code: 'zh', name: '🇨🇳 Chinese' }
              ].map(lang => (
                <button
                  key={lang.code}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all ${
                    matchingPreferences.languages.includes(lang.code)
                      ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                  onClick={() => {
                    const newLangs = matchingPreferences.languages.includes(lang.code)
                      ? matchingPreferences.languages.filter((l: string) => l !== lang.code)
                      : [...matchingPreferences.languages, lang.code];
                    setMatchingPreferences({ ...matchingPreferences, languages: newLangs });
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-3 p-4 bg-stone-50 rounded-xl">
              <input
                type="checkbox"
                checked={matchingPreferences.exclude_previous}
                onChange={(e) => setMatchingPreferences({ ...matchingPreferences, exclude_previous: e.target.checked })}
                className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
              />
              <div>
                <span className="text-sm font-medium text-stone-700">Exclude previous matches</span>
                <p className="text-xs text-stone-500">Don't show people I've already connected with</p>
              </div>
            </label>
          </div>

          <button
            onClick={() => setShowFilters(false)}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            Apply Filters ✨
          </button>
        </div>
      </div>
    </div>
  );
};

const MatchScreen: React.FC = () => {
  const [currentProfile, setCurrentProfile] = useState<any | null>(null);
  const [suggestedProfile, setSuggestedProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dailyStats, setDailyStats] = useState<any | null>(null);
  const [matchingPreferences, setMatchingPreferences] = useState<any>({
    match_type: 'either',
    languages: [],
    age_ranges: [],
    country_codes: [],
    interests: [],
    exclude_previous: true,
    max_timezone_difference: 6
  });

  const { isLoaded, isSignedIn, user } = useUser();

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/user/profile/${user.id}`);
      if (response.ok) {
        const data = await response.json();
        setCurrentProfile(data.profile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchDailyStats = async () => {
    if (!user) return;
    try {
      const response = await fetch(`${API_BASE_URL}/user/stats/${user.id}`);
      if (response.ok) {
        const stats = await response.json();
        setDailyStats(stats);
      }
    } catch (error) {
      console.error('Error fetching daily stats:', error);
    }
  };

  const fetchSuggestions = async () => {
    if (!user) return;
    try {
      const params = new URLSearchParams();
      params.append('limit', '1');
      if (matchingPreferences.languages.length > 0) {
        params.append('languages', matchingPreferences.languages.join(','));
      }
      if (matchingPreferences.age_ranges.length > 0) {
        params.append('age_ranges', matchingPreferences.age_ranges.join(','));
      }
      if (matchingPreferences.interests.length > 0) {
        params.append('interests', matchingPreferences.interests.join(','));
      }
      if (matchingPreferences.match_type !== 'either') {
        params.append('match_type', matchingPreferences.match_type);
      }

      const response = await fetch(`${API_BASE_URL}/profiles/suggestions/${user.id}?${params.toString()}`);
      if (response.ok) {
        const suggestions = await response.json();
        if (suggestions && suggestions.length > 0) {
          setSuggestedProfile(suggestions[0]);
        } else {
          setSuggestedProfile(null);
        }
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchDailyStats();
      fetchSuggestions();
    }
  }, [user, matchingPreferences]);

  const handleLike = async () => {
    if (!user || !currentProfile || !suggestedProfile) return;
    if (dailyStats && dailyStats.matches_remaining <= 0) {
      alert('Daily match limit exceeded. Try again tomorrow!');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/matches/find`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerk_id: user.id,
          accept: true,
          suggested_user_id: suggestedProfile.user_id,
          preferences: matchingPreferences
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Could not create match';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status}`;
        }
        console.error('Match creation failed:', errorMessage);
        alert(errorMessage);
        return;
      }

      const matchData = await response.json();
      console.log('Match created:', matchData);
      alert(`Match created with ${matchData.penpal_profile.anonymous_handle}! 🎉`);
      await fetchDailyStats();
      await fetchSuggestions();
    } catch (error) {
      console.error('Error creating match:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        alert('Connection error. Please check if the server is running and try again.');
      } else {
        alert('Error creating match. Please try again.');
      }
    }
    setActionLoading(false);
  };

  const handlePass = async () => {
    if (!user || !currentProfile || !suggestedProfile) return;
    setActionLoading(true);
    try {
      const passResponse = await fetch(`${API_BASE_URL}/profiles/pass`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clerk_id: user.id,
          passed_user_id: suggestedProfile.user_id
        }),
      });

      if (!passResponse.ok) {
        console.error('Failed to record pass');
      }

      await fetchSuggestions();
    } catch (error) {
      console.error('Error passing on suggestion:', error);
    }
    setActionLoading(false);
  };

  // Helper function to get location display
  const getLocationDisplay = (profile: any) => {
    // This is a placeholder, you'll need to define your getLocationDisplay function
    return profile.country_code;
  };

  // Loading and error states
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Globe className="w-12 h-12 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Please Sign In</h2>
          <p className="text-stone-600">You need to be signed in to use the matching feature.</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-amber-500 mx-auto mb-4"></div>
          <p className="text-stone-600 font-medium">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {/* User Stats Card */}
        <div className="mb-8">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold text-stone-800 mb-1">
                  Hi, {currentProfile.anonymous_handle} 👋
                </h2>
                <p className="text-stone-600">Find your next conversation partner</p>
              </div>
              <button
                onClick={() => setShowFilters(true)}
                className="p-3 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full text-white shadow-lg hover:shadow-xl transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {dailyStats && (
              <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <Heart className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-700">Daily Matches</p>
                    <p className="text-xs text-stone-500">
                      {dailyStats.matches_remaining} of {dailyStats.total_daily_limit} remaining
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{dailyStats.matches_remaining}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Profile Card with Loading Overlay */}
        <div className="relative">
          {actionLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl z-10 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-3"></div>
                <p className="text-stone-600 font-medium">Processing your choice...</p>
              </div>
            </div>
          )}

          {suggestedProfile ? (
            <div className="relative bg-white rounded-3xl shadow-2xl overflow-hidden mb-8 border border-white/20">
              {/* Profile Header with Country Flag */}
              <div className="relative h-48 bg-gradient-to-br from-yellow-400 via-amber-500 to-rose-500 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative text-center text-white">
                  <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl mb-3 mx-auto">
                    {/* Country Flags */}
                    {suggestedProfile.country_code === 'US' && '🇺🇸'} {suggestedProfile.country_code === 'JP' && '🇯🇵'} {suggestedProfile.country_code === 'AR' && '🇦🇷'} {suggestedProfile.country_code === 'MA' && '🇲🇦'}
                    {suggestedProfile.country_code === 'IE' && '🇮🇪'} {suggestedProfile.country_code === 'GB' && '🇬🇧'} {suggestedProfile.country_code === 'CA' && '🇨🇦'} {suggestedProfile.country_code === 'AU' && '🇦🇺'}
                    {suggestedProfile.country_code === 'DE' && '🇩🇪'} {suggestedProfile.country_code === 'FR' && '🇫🇷'} {suggestedProfile.country_code === 'BR' && '🇧🇷'} {suggestedProfile.country_code === 'IN' && '🇮🇳'}
                    {suggestedProfile.country_code === 'CN' && '🇨🇳'} {suggestedProfile.country_code === 'IT' && '🇮🇹'} {suggestedProfile.country_code === 'ES' && '🇪🇸'}
                    {suggestedProfile.country_code === 'SE' && '🇸🇪'} {suggestedProfile.country_code === 'NL' && '🇳🇱'} {suggestedProfile.country_code === 'PL' && '🇵🇱'} {suggestedProfile.country_code === 'GR' && '🇬🇷'}
                    {suggestedProfile.country_code === 'FI' && '🇫🇮'} {suggestedProfile.country_code === 'NO' && '🇳🇴'} {suggestedProfile.country_code === 'CH' && '🇨🇭'} {suggestedProfile.country_code === 'CL' && '🇨🇱'}
                    {suggestedProfile.country_code === 'CO' && '🇨🇴'} {suggestedProfile.country_code === 'DK' && '🇩🇰'} {suggestedProfile.country_code === 'HK' && '🇭🇰'} {suggestedProfile.country_code === 'HU' && '🇭🇺'}
                    {suggestedProfile.country_code === 'IS' && '🇮🇸'} {suggestedProfile.country_code === 'IL' && '🇮🇱'} {suggestedProfile.country_code === 'NZ' && '🇳🇿'} {suggestedProfile.country_code === 'PH' && '🇵🇭'}
                    {suggestedProfile.country_code === 'PT' && '🇵🇹'} {suggestedProfile.country_code === 'SG' && '🇸🇬'} {suggestedProfile.country_code === 'TW' && '🇹🇼'} {suggestedProfile.country_code === 'AE' && '🇦🇪'}
                    {suggestedProfile.country_code === 'VN' && '🇻🇳'} {suggestedProfile.country_code === 'KR' && '🇰🇷'} {suggestedProfile.country_code === 'MX' && '🇲🇽'} {suggestedProfile.country_code === 'RU' && '🇷🇺'}
                    {suggestedProfile.country_code === 'ZA' && '🇿🇦'} {suggestedProfile.country_code === 'EG' && '🇪🇬'} {suggestedProfile.country_code === 'NG' && '🇳🇬'} {suggestedProfile.country_code === 'PK' && '🇵🇰'}
                    {suggestedProfile.country_code === 'BD' && '🇧🇩'} {suggestedProfile.country_code === 'TR' && '🇹🇷'} {suggestedProfile.country_code === 'ID' && '🇮🇩'} {suggestedProfile.country_code === 'SA' && '🇸🇦'}
                    {suggestedProfile.country_code === 'IR' && '🇮🇷'} {suggestedProfile.country_code === 'TH' && '🇹🇭'}
                    {!['JP', 'FR', 'US', 'DE', 'ES', 'GB', 'CA', 'AU', 'IT', 'BR', 'IN', 'CN', 'KR', 'MX', 'RU', 'ZA', 'EG', 'AR', 'NG', 'PK', 'BD', 'TR', 'ID', 'SA', 'IR', 'TH', 'SE', 'NL', 'PL', 'GR', 'FI', 'IE', 'NO', 'CH', 'CL', 'CO', 'DK', 'HK', 'HU', 'IS', 'IL', 'NZ', 'PH', 'PT', 'SG', 'TW', 'AE', 'VN', 'MA'].includes(suggestedProfile.country_code || '') && '🌍'}
                  </div>
                  <div className="bg-black/20 backdrop-blur-sm rounded-full px-4 py-1 text-sm font-medium">
                    {getLocationDisplay(suggestedProfile)}
                  </div>
                </div>

                {/* Activity Status */}
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Clock className="w-4 h-4 text-white" />
                  <span className="text-white text-xs font-medium">
                    {getTimeSinceActive(suggestedProfile.last_active)}
                  </span>
                </div>
              </div>

              {/* Profile Info */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-stone-800 mb-2">{suggestedProfile.anonymous_handle}</h3>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-1 text-stone-500 text-sm">
                        <MapPin className="w-4 h-4" />
                        {getLocationDisplay(suggestedProfile)}
                      </div>
                      {suggestedProfile.age_range && (
                        <div className="bg-stone-100 px-3 py-1 rounded-full text-stone-600 text-sm font-medium">
                          {getAgeRangeDisplay(suggestedProfile.age_range)}
                        </div>
                      )}
                    </div>
                  </div>

                  {suggestedProfile.cultural_completeness_score && (
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center text-white font-bold text-sm mb-1">
                        {Math.round(suggestedProfile.cultural_completeness_score * 100)}%
                      </div>
                      <p className="text-xs text-stone-500 font-medium">Complete</p>
                    </div>
                  )}
                </div>

                {suggestedProfile.bio && (
                  <div className="mb-6">
                    <p className="text-stone-600 leading-relaxed italic text-center bg-stone-50 p-4 rounded-xl border border-stone-100">
                      "{suggestedProfile.bio}"
                    </p>
                  </div>
                )}

                {suggestedProfile.favorite_local_fact && (
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl mb-6 border border-amber-200">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Star className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-800 mb-1">Local Fact</p>
                        <p className="text-amber-700 text-sm leading-relaxed">{suggestedProfile.favorite_local_fact}</p>
                      </div>
                    </div>
                  </div>
                )}

                {(suggestedProfile.interests || []).length > 0 && (
                  <div className="mb-6">
                    <p className="text-sm font-semibold text-stone-700 mb-3">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {(suggestedProfile.interests || []).map((interest: string, index: number) => (
                        <InterestTag key={index} interest={interest} />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-stone-500" />
                    <div>
                      <p className="text-sm font-semibold text-stone-700">Languages</p>
                      <p className="text-xs text-stone-500">
                        {getLanguageDisplay(suggestedProfile.primary_language || 'en')}
                        {suggestedProfile.secondary_languages && suggestedProfile.secondary_languages.length > 0 &&
                          `, ${suggestedProfile.secondary_languages.map((lang: string) => getLanguageDisplay(lang)).join(', ')}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-stone-400" />
                    <span className="text-xs text-stone-500 capitalize">
                      {suggestedProfile.preferred_correspondence_type || 'either'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/20 shadow-lg">
              <div className="w-24 h-24 bg-gradient-to-r from-stone-200 to-stone-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-12 h-12 text-stone-500" />
              </div>
              <h3 className="text-xl font-semibold text-stone-700 mb-2">No more suggestions</h3>
              <p className="text-stone-500">Try adjusting your filters or check back later!</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-6 mb-8">
          <button
            onClick={handlePass}
            disabled={actionLoading || !suggestedProfile || (dailyStats && dailyStats.matches_remaining <= 0)}
            className="w-16 h-16 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-stone-200 hover:border-stone-300 hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-6 h-6 text-stone-500" />
          </button>

          <button
            onClick={handleLike}
            disabled={actionLoading || !suggestedProfile || (dailyStats && dailyStats.matches_remaining <= 0)}
            className="w-20 h-20 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 rounded-full shadow-xl flex items-center justify-center hover:shadow-2xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </button>
        </div>

        {/* Status Messages */}
        {dailyStats && dailyStats.matches_remaining <= 0 && (
          <div className="text-center bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
            <div className="w-16 h-16 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-amber-800 mb-2">Daily limit reached!</h3>
            <p className="text-amber-700 text-sm">
              You've used all your daily matches. Come back tomorrow to meet more amazing people!
              <br />
              <span className="text-xs opacity-75">Resets at midnight</span>
            </p>
          </div>
        )}
      </div>

      <FilterModal
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        matchingPreferences={matchingPreferences}
        setMatchingPreferences={setMatchingPreferences}
      />
    </div>
  );
};

export default MatchScreen;