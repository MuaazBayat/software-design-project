"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useConversationUser } from "@/lib/context/ConversationUserContext";
import { useSyncProfile } from "@/lib/context/ProfileContext";
import MessagingApiClient from "@/lib/MessagingApiClient";
import { ExtendedUserProfile, ProfilesApiClient } from "@/lib/profilesApiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Clock, MessageCircle, Heart, Globe } from "lucide-react";

export default function ProfilePage() {
  const { currentConversationUser } = useConversationUser();
  const { profile: myProfile } = useSyncProfile();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationThreadId, setConversationThreadId] = useState<string | null>(null);
  const router = useRouter();
  const mainContentRef = useRef<HTMLElement>(null);

  // Set page title for accessibility and manage focus
  useEffect(() => {
    const userName = currentConversationUser?.anonymous_handle || 'Unknown User';
    document.title = `${userName}'s Profile - GlobeTalk`;
    
    // Focus main content when profile loads
    if (profile && mainContentRef.current) {
      mainContentRef.current.focus();
    }
  }, [currentConversationUser, profile]);

  useEffect(() => {
    if (!currentConversationUser) {
      router.push("/inbox");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        
        // Create profiles client with auth token
        const profilesClient = new ProfilesApiClient(
          process.env.NEXT_PUBLIC_CORE_URL || "http://localhost:8000",
          getToken
        );
        
        // Use the profiles client to fetch the profile directly
        const profileData = await profilesClient.getProfileByUserId(currentConversationUser.user_id);
        setProfile(profileData);
        
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchConversationThreadId = async () => {
      if (!myProfile?.user_id) return;
      
      try {
        const apiClient = new MessagingApiClient();
        const searchResponse = await apiClient.searchUsers({
          my_user_id: myProfile.user_id,
          anonymous_handle: "",
          limit: 100
        });
        
        // Find the conversation with this user
        const conversation = searchResponse.items.find(
          item => item.user_profile.user_id === currentConversationUser.user_id
        );
        
        if (conversation?.latest_message?.conversation_thread_id) {
          setConversationThreadId(conversation.latest_message.conversation_thread_id);
        }
      } catch (error) {
        console.error("Error fetching conversation thread ID:", error);
      }
    };

    fetchProfile();
    fetchConversationThreadId();
  }, [currentConversationUser, router, myProfile, getToken]);

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return "Unknown";
    
    const now = new Date();
    const lastActiveDate = new Date(lastActive);
    const diffInHours = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Active now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return `${Math.floor(diffInHours / 168)}w ago`;
  };

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return "🌍";
    return String.fromCodePoint(...countryCode.toUpperCase().split('').map(char => 0x1F1E6 + char.charCodeAt(0) - 65));
  };

  const getInitials = (handle: string) => {
    return handle.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <div className="text-center space-y-4" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto" aria-hidden="true"></div>
          <p className="text-amber-800 font-medium">Loading profile...</p>
          <span className="sr-only">Please wait while we load the user&apos;s profile information</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <div className="text-center" role="alert">
          <h1 className="text-2xl font-bold text-amber-800 mb-2">Profile not found</h1>
          <p className="text-amber-700 mb-4">The requested user profile could not be found.</p>
          <Button 
            onClick={() => router.push("/inbox")} 
            className="bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-describedby="go-back-help"
          >
            Go back to inbox
          </Button>
          <p id="go-back-help" className="sr-only">
            Click to return to your inbox and view your conversations
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50">
      {/* Skip to main content link for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-black text-white px-4 py-2 rounded z-50"
      >
        Skip to profile content
      </a>

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-20">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-3 p-2 hover:bg-amber-100 rounded-full text-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            aria-label="Go back to previous page"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
          <h1 className="font-bold text-lg text-amber-800">
            {profile?.anonymous_handle ? `${profile.anonymous_handle}'s Profile` : 'Profile'}
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main 
        id="main-content" 
        className="max-w-md mx-auto px-4 py-6 space-y-6"
        ref={mainContentRef}
        tabIndex={-1}
        aria-label={`Profile information for ${profile?.anonymous_handle || 'user'}`}
      >
        {/* Profile Header Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg" role="region" aria-labelledby="profile-heading">
          <CardContent className="p-6 text-center">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24 mx-auto border-4 border-amber-200 shadow-lg">
                <AvatarFallback 
                  className="bg-gradient-to-br from-amber-400 to-rose-400 text-white text-xl font-bold"
                  aria-label={`Avatar for ${profile.anonymous_handle}`}
                >
                  {getInitials(profile.anonymous_handle)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h2 id="profile-heading" className="text-2xl font-bold text-amber-900 mb-1">
              {profile.anonymous_handle}
            </h2>
            
            <div className="flex items-center justify-center text-sm text-amber-700 mb-3">
              <Clock className="h-4 w-4 mr-1" aria-hidden="true" />
              <span aria-label={`Last active: ${formatLastActive(profile.last_active)}`}>
                {formatLastActive(profile.last_active)}
              </span>
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm mb-4">
              {profile.country_code && (
                <div className="flex items-center">
                  <span className="text-xl mr-1" role="img" aria-label={`Country: ${profile.country_code}`}>
                    {getCountryFlag(profile.country_code)}
                  </span>
                  <span className="text-amber-800 font-medium" aria-hidden="true">
                    {profile.country_code}
                  </span>
                </div>
              )}
              {profile.age_range && (
                <Badge 
                  variant="secondary" 
                  className="bg-amber-100 text-amber-700 border-amber-300"
                  aria-label={`Age range: ${profile.age_range}`}
                >
                  {profile.age_range}
                </Badge>
              )}
            </div>

            {/* Interests in Header */}
            {profile.interests && profile.interests.length > 0 && (
              <section className="mt-4" aria-labelledby="interests-heading">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="h-4 w-4 mr-1 text-amber-600" aria-hidden="true" />
                  <h3 id="interests-heading" className="text-sm font-medium text-amber-800">Interests</h3>
                </div>
                <div className="flex flex-wrap gap-2 justify-center" role="list" aria-label="User interests">
                  {profile.interests.map((interest) => (
                    <Badge 
                      key={interest} 
                      variant="secondary" 
                      className="bg-gradient-to-r from-amber-100 to-rose-100 text-amber-700 border-amber-200 text-xs"
                      role="listitem"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </section>
            )}
          </CardContent>
        </Card>

        {/* Bio Card */}
        {profile.bio && (
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg" role="region" aria-labelledby="bio-heading">
            <CardContent className="p-6">
              <h3 id="bio-heading" className="font-semibold text-amber-800 mb-3 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-amber-600" aria-hidden="true" />
                About
              </h3>
              <p className="text-amber-700 leading-relaxed" aria-describedby="bio-heading">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Languages Card */}
        {(profile.primary_language || profile.secondary_languages?.length) && (
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg" role="region" aria-labelledby="languages-heading">
            <CardContent className="p-6">
              <h3 id="languages-heading" className="font-semibold text-amber-800 mb-3 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-amber-600" aria-hidden="true" />
                Languages
              </h3>
              <dl className="space-y-2" aria-describedby="languages-heading">
                {profile.primary_language && (
                  <div className="flex items-center">
                    <dt className="text-sm text-amber-700 w-20">Primary:</dt>
                    <dd>
                      <Badge className="bg-amber-600 text-white" role="status" aria-label={`Primary language: ${profile.primary_language}`}>
                        {profile.primary_language.toUpperCase()}
                      </Badge>
                    </dd>
                  </div>
                )}
                {profile.secondary_languages && profile.secondary_languages.length > 0 && (
                  <div className="flex items-center">
                    <dt className="text-sm text-amber-700 w-20">Also speaks:</dt>
                    <dd>
                      <ul className="flex flex-wrap gap-1" role="list" aria-label="Secondary languages">
                        {profile.secondary_languages.map((lang) => (
                          <li key={lang}>
                            <Badge variant="outline" className="border-amber-300 text-amber-700" role="status" aria-label={`Also speaks: ${lang}`}>
                              {lang.toUpperCase()}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        )}

        {/* Local Fact Card */}
        {profile.favorite_local_fact && (
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg" role="region" aria-labelledby="local-fact-heading">
            <CardContent className="p-6">
              <h3 id="local-fact-heading" className="font-semibold text-amber-800 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-amber-600" aria-hidden="true" />
                Local Fact
              </h3>
              <blockquote className="text-amber-700 leading-relaxed italic" cite="" aria-describedby="local-fact-heading">
                &ldquo;{profile.favorite_local_fact}&rdquo;
              </blockquote>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <nav className="space-y-3 pt-4" role="navigation" aria-label="Profile actions">
          <Button 
            onClick={() => router.push(conversationThreadId ? `/conversation/${conversationThreadId}` : "/conversation")}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg"
            aria-describedby="continue-conversation-description"
            role="button"
          >
            Continue Conversation
          </Button>
          <div id="continue-conversation-description" className="sr-only">
            Navigate back to your conversation with {profile.anonymous_handle}
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/inbox")}
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
            aria-describedby="back-to-inbox-description"
            role="button"
          >
            Back to Inbox
          </Button>
          <div id="back-to-inbox-description" className="sr-only">
            Return to your main inbox to view all conversations
          </div>
        </nav>
      </main>
    </div>
  );
}