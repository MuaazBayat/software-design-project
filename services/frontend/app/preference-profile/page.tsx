"use client";
import { useUser } from "@clerk/nextjs";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';



interface UserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code: string | null;
  bio: string | null;
  interests: string[] | null;
  age_range: string | null;
  primary_language: string | null;
  favorite_local_fact: string | null;
  selected?: boolean;
  is_real?: boolean;
}

interface ApiUserProfile {
  profile_id?: string;
  user_id: string;
  anonymous_handle: string;
  country_code: string | null;
  bio: string | null;
  interests: string[] | null;
  age_range: string | null;
  primary_language: string | null;
  favorite_local_fact: string | null;
}


const countryCodeToName: Record<string, string> = {
  US: 'United States',
  JP: 'Japan',
  AR: 'Argentina',
  MA: 'Morocco',
  IE: 'Ireland',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
  BR: 'Brazil',
  IN: 'India',
  CN: 'China',
  IT: 'Italy',
  ES: 'Spain',
};

const fakeUsers: UserProfile[] = [
  {
    user_id: 'fake-1',
    anonymous_handle: 'Elara',
    country_code: 'JP',
    bio: 'Lover of traditional arts, matcha, and quiet temples. Seeking a friend to share stories of daily life and culture.',
    interests: ['Art', 'Tea', 'Nature'],
    age_range: '25-34',
    primary_language: 'ja',
    favorite_local_fact: 'Kyoto was the imperial capital of Japan for over 1,000 years.',
    is_real: false
  },
  {
    user_id: 'fake-2',
    anonymous_handle: 'Javier',
    country_code: 'AR',
    bio: "Passionate about tango, football, and asado. Let's exchange tales of bustling city life and vibrant traditions.",
    interests: ['Dancing', 'Food', 'Music'],
    age_range: '30-39',
    primary_language: 'es',
    favorite_local_fact: 'Buenos Aires means "good airs" or "fair winds" in Spanish.',
    is_real: false
  },
  {
    user_id: 'fake-3',
    anonymous_handle: 'Amina',
    country_code: 'MA',
    bio: 'I find joy in the colors of the souk, the aroma of spices, and storytelling. Eager to connect with a kindred spirit.',
    interests: ['Cooking', 'History', 'Photography'],
    age_range: '28-37',
    primary_language: 'ar',
    favorite_local_fact: 'Marrakech is known as the "Red City" due to the color of its buildings.',
    is_real: false
  },
  {
    user_id: 'fake-4',
    anonymous_handle: 'Liam',
    country_code: 'IE',
    bio: "A fan of folk music, rainy days, and ancient myths. Let's share our favorite books and local legends.",
    interests: ['Music', 'Reading', 'Hiking'],
    age_range: '32-41',
    primary_language: 'en',
    favorite_local_fact: 'Dublin was originally founded by Vikings as a trading settlement in the 9th century.',
    is_real: false
  }
];

const PreferenceProfileSelector = () => { // Remove the props
  const { isLoaded, isSignedIn, user } = useUser();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRealUsers, setShowRealUsers] = useState(true);
  const router = useRouter(); // Use the router for navigation

  const fetchPreferenceProfiles = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8001/preferences/profiles/${user.id}`);
      if (response.ok) {
        const data: ApiUserProfile[] = await response.json();
        setProfiles(data.map((profile) => ({ 
          ...profile, 
          user_id: profile.profile_id || profile.user_id,
          selected: false 
        })));
        setShowRealUsers(true);
      } else {
        throw new Error('Failed to fetch profiles from API');
      }
    } catch (err) {
      console.error('Error fetching preference profiles:', err);
      fetchRealUsers();
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchPreferenceProfiles();
    }
  }, [isLoaded, user, fetchPreferenceProfiles]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">You need to be signed in to access this page.</p>
        </div>
      </div>
    );
  }

  const fetchRealUsers = async () => {
  try {
    setLoading(true);
    
    // Check if supabase client is available
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, anonymous_handle, country_code, bio, interests, age_range, primary_language, favorite_local_fact')
      .eq('account_status', 'active')
      .limit(4);

    if (error) throw error;

    if (data && data.length > 0) {
      setProfiles(data.map(profile => ({ ...profile, selected: false, is_real: true })));
      setShowRealUsers(true);
    } else {
      setProfiles(fakeUsers.map(user => ({ ...user, selected: false })));
      setShowRealUsers(false);
    }
  } catch (err) {
    setError('Failed to load user profiles');
    console.error('Error fetching users:', err);
    setProfiles(fakeUsers.map(user => ({ ...user, selected: false })));
    setShowRealUsers(false);
  } finally {
    setLoading(false);
  }
};

  const toggleSelection = (user_id: string) => {
    setProfiles(prev => prev.map(profile => 
      profile.user_id === user_id 
        ? { ...profile, selected: !profile.selected }
        : { ...profile, selected: false }
    ));
  };

  const handleProfileTypeToggle = () => {
    if (showRealUsers) {
      setProfiles(fakeUsers.map(user => ({ ...user, selected: false })));
    } else {
      fetchPreferenceProfiles();
    }
    setShowRealUsers(!showRealUsers);
  };

 const savePreferenceSelection = async (selectedProfile: UserProfile) => {
    if (!user) {
      console.error('No authenticated user found');
      return false;
    }

    try {
      const payload = {
        clerk_id: user.id,
        selected_profile_id: selectedProfile.user_id,
        preference_type: selectedProfile.is_real ? 'real' : 'fake'
      };
      
      console.log('Sending payload:', payload);

      const response = await fetch('http://localhost:8001/preferences/select', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        
        try {
          JSON.parse(errorText);
        } catch {
          console.error('Could not parse error response as JSON');
        }
        
        throw new Error(`Failed to save preference: ${response.status} ${response.statusText}`);
      }
      
      return true;
    } catch (err) {
      console.error('Error saving preference:', err);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('No authenticated user found');
      return;
    }

    const selectedProfile = profiles.find(profile => profile.selected);
    if (selectedProfile) {
      const success = await savePreferenceSelection(selectedProfile);
      if (success) {
        alert('Preference saved, proceeding with signup');
        router.push('/'); // Navigate to home or another page
      } else {
        alert('Failed to save your preference. Please try again.');
      }
    } else {
      alert('Please select a profile that matches your interests');
    }
  };

  const InterestTag: React.FC<{ interest: string }> = ({ interest }) => (
    <span className="px-3 py-1.5 bg-white/70 text-stone-600 rounded-full text-xs border border-stone-200">
      {interest}
    </span>
  );

  const ProfileCard: React.FC<{ profile: UserProfile }> = ({ profile }) => {
    const countryName = profile.country_code ? countryCodeToName[profile.country_code] || profile.country_code : 'Unknown';
    
    return (
      <div 
        className={`bg-stone-50/80 backdrop-blur-sm rounded-2xl p-6 border transition-all duration-300 cursor-pointer hover:shadow-lg ${
          profile.selected 
            ? 'border-stone-400 shadow-md' 
            : 'border-stone-200 hover:border-stone-300'
        }`}
        onClick={() => toggleSelection(profile.user_id)}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-2xl font-light text-stone-700 mb-1">{profile.anonymous_handle}</h3>
            <p className="text-stone-500 text-sm">{countryName}</p>
            {profile.is_real !== undefined && (
              <span className={`text-xs px-2 py-1 rounded-full ${profile.is_real ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                {profile.is_real ? 'Real User' : 'Example Profile'}
              </span>
            )}
          </div>
          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
            profile.selected 
              ? 'bg-stone-600 border-stone-600' 
              : 'border-stone-300'
          }`}>
            {profile.selected && (
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
        
        <p className="text-stone-600 text-sm leading-relaxed mb-4">
          {profile.bio || 'No bio provided yet.'}
        </p>
        
        {profile.favorite_local_fact && (
          <div className="mb-4">
            <h4 className="text-stone-600 font-medium mb-2">Local Fact</h4>
            <p className="text-stone-500 text-sm italic">&ldquo;{profile.favorite_local_fact}&rdquo;</p>
          </div>
        )}
        
        <div>
          <h4 className="text-stone-600 font-medium mb-3">Interests</h4>
          <div className="flex flex-wrap gap-2">
            {profile.interests && profile.interests.length > 0 ? (
              profile.interests.slice(0, 5).map((interest, index) => (
                <InterestTag key={index} interest={interest} />
              ))
            ) : (
              <p className="text-stone-400 text-sm">No interests specified yet</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-600 mx-auto"></div>
          <p className="mt-4 text-stone-600">Loading profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button 
            onClick={fetchPreferenceProfiles}
            className="px-4 py-2 bg-stone-600 text-white rounded-md"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-amber-50 to-stone-100">
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h2 className="text-4xl font-light text-stone-700 text-center mb-6 tracking-wide">
          Select Your Preference Profile
        </h2>
        
        <p className="text-stone-600 text-center max-w-2xl mx-auto mb-8">
          Choose a profile that matches your interests to help our algorithm find better matches for you.
          You can switch between real community members and example profiles.
        </p>
        
        <div className="flex justify-center mb-8">
          <div className="bg-white/80 rounded-lg p-1 border border-stone-200">
            <button
              className={`px-4 py-2 rounded-md transition-colors ${showRealUsers ? 'bg-stone-600 text-white' : 'text-stone-600'}`}
              onClick={handleProfileTypeToggle}
            >
              Real Community Members
            </button>
            <button
              className={`px-4 py-2 rounded-md transition-colors ${!showRealUsers ? 'bg-stone-600 text-white' : 'text-stone-600'}`}
              onClick={handleProfileTypeToggle}
            >
              Example Profiles
            </button>
          </div>
        </div>
        
        {/* Profile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {profiles.map(profile => (
            <ProfileCard key={profile.user_id} profile={profile} />
          ))}
        </div>
        
        {/* CTA Button */}
        <div className="text-center">
          <button 
            onClick={handleSubmit}
            className="px-8 py-4 bg-white/80 text-stone-700 border border-stone-300 rounded-xl hover:bg-white hover:shadow-lg transition-all duration-300 text-lg font-light"
          >
            Continue with Selected Preferences
          </button>
        </div>
      </main>
    </div>
  );
};

export default PreferenceProfileSelector;