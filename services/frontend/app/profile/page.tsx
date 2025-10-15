"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useConversationUser } from "@/lib/context/ConversationUserContext";
import { useSyncProfile } from "@/lib/context/ProfileContext";
import MessagingApiClient from "@/lib/MessagingApiClient";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MapPin, Clock, MessageCircle, Heart, Globe } from "lucide-react";

interface ExtendedUserProfile {
  user_id: string;
  anonymous_handle: string;
  country_code?: string | null;
  bio?: string;
  age_range?: string;
  interests?: string[];
  primary_language?: string;
  secondary_languages?: string[];
  last_active?: string;
  favorite_local_fact?: string;
}

export default function ProfilePage() {
  const { currentConversationUser } = useConversationUser();
  const { profile: myProfile } = useSyncProfile();
  const [profile, setProfile] = useState<ExtendedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversationThreadId, setConversationThreadId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!currentConversationUser) {
      router.push("/inbox");
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/profiles/by-user-id/${currentConversationUser.user_id}`);
        if (response.ok) {
          const profileData = await response.json();
          setProfile(profileData);
        } else {
          console.error("Failed to fetch profile");
        }
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
  }, [currentConversationUser, router, myProfile]);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-amber-800 mb-2">Profile not found</h2>
          <Button onClick={() => router.push("/inbox")} className="bg-amber-600 hover:bg-amber-700">
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mr-3 p-2 hover:bg-amber-100 rounded-full text-amber-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-bold text-lg text-amber-800">Profile</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Profile Header Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg">
          <CardContent className="p-6 text-center">
            <div className="relative mb-4">
              <Avatar className="h-24 w-24 mx-auto border-4 border-amber-200 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-amber-400 to-rose-400 text-white text-xl font-bold">
                  {getInitials(profile.anonymous_handle)}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <h2 className="text-2xl font-bold text-amber-900 mb-1">{profile.anonymous_handle}</h2>
            
            <div className="flex items-center justify-center text-sm text-amber-700 mb-3">
              <Clock className="h-4 w-4 mr-1" />
              {formatLastActive(profile.last_active)}
            </div>

            <div className="flex items-center justify-center space-x-4 text-sm mb-4">
              {profile.country_code && (
                <div className="flex items-center">
                  <span className="text-xl mr-1">{getCountryFlag(profile.country_code)}</span>
                  <span className="text-amber-800 font-medium">{profile.country_code}</span>
                </div>
              )}
              {profile.age_range && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-300">
                  {profile.age_range}
                </Badge>
              )}
            </div>

            {/* Interests in Header */}
            {profile.interests && profile.interests.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-center mb-2">
                  <Heart className="h-4 w-4 mr-1 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Interests</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {profile.interests.map((interest) => (
                    <Badge 
                      key={interest} 
                      variant="secondary" 
                      className="bg-gradient-to-r from-amber-100 to-rose-100 text-amber-700 border-amber-200 text-xs"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bio Card */}
        {profile.bio && (
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                <MessageCircle className="h-5 w-5 mr-2 text-amber-600" />
                About
              </h3>
              <p className="text-amber-700 leading-relaxed">{profile.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Languages Card */}
        {(profile.primary_language || profile.secondary_languages?.length) && (
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                <Globe className="h-5 w-5 mr-2 text-amber-600" />
                Languages
              </h3>
              <div className="space-y-2">
                {profile.primary_language && (
                  <div className="flex items-center">
                    <span className="text-sm text-amber-700 w-20">Primary:</span>
                    <Badge className="bg-amber-600 text-white">{profile.primary_language.toUpperCase()}</Badge>
                  </div>
                )}
                {profile.secondary_languages && profile.secondary_languages.length > 0 && (
                  <div className="flex items-center">
                    <span className="text-sm text-amber-700 w-20">Also speaks:</span>
                    <div className="flex flex-wrap gap-1">
                      {profile.secondary_languages.map((lang) => (
                        <Badge key={lang} variant="outline" className="border-amber-300 text-amber-700">
                          {lang.toUpperCase()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Local Fact Card */}
        {profile.favorite_local_fact && (
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200 shadow-lg">
            <CardContent className="p-6">
              <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-amber-600" />
                Local Fact
              </h3>
              <p className="text-amber-700 leading-relaxed italic">&ldquo;{profile.favorite_local_fact}&rdquo;</p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-4">
          <Button 
            onClick={() => router.push(conversationThreadId ? `/conversation/${conversationThreadId}` : "/conversation")}
            className="w-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-semibold py-3 rounded-xl shadow-lg"
          >
            Continue Conversation
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => router.push("/inbox")}
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold py-3 rounded-xl"
          >
            Back to Inbox
          </Button>
        </div>
      </div>
    </div>
  );
}