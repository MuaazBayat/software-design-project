'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useConversationUser } from '../../lib/context/ConversationUserContext';
import { 
  Mail, 
  Send, 
  ArrowLeft, 
  Heart,
  MapPin,
  Sparkles,
  Globe
} from 'lucide-react';

export default function NoConversationPage() {
  const router = useRouter();
  const { currentConversationUser} = useConversationUser();

  const handleWriteFirstLetter = () => {
    // Navigate to general compose page or pen pal selection
    if (currentConversationUser)
    router.push(`/compose-letter/${currentConversationUser.user_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-amber-700 hover:bg-amber-100"
            onClick={() => router.push('/inbox')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
          <div className="flex items-center gap-2 ml-4">
            <Mail className="h-5 w-5 text-amber-600" />
            <h1 className="text-xl font-semibold text-amber-900">New Pen Pal Connection</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 text-sm text-amber-700">
            <Globe className="h-4 w-4" />
            <span>Ready to Connect</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Decorative Header */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-rose-200 to-amber-200 rounded-full opacity-20 animate-pulse" />
            <div className="relative bg-white rounded-full p-8 shadow-xl border-4 border-amber-200">
              <Mail className="h-16 w-16 text-amber-600 mx-auto" />
              <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-rose-400 animate-bounce" />
              <Heart className="absolute -bottom-2 -left-2 h-6 w-6 text-pink-400 animate-pulse" />
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl font-bold text-amber-900 mb-2">
              Your Letter Adventure Begins! ✨
            </h2>
            <p className="text-xl text-amber-800 leading-relaxed">
              You&apos;ve been matched with a wonderful pen pal from across the world. 
              It&apos;s time to send your very first letter and start this magical journey!
            </p>
          </div>

          {/* Encouraging Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full mt-12">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200 p-6 text-center hover:shadow-lg transition-shadow">
              <Send className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Break the Ice</h3>
              <p className="text-blue-700 text-sm">
                Introduce yourself! Share your hobbies, favorite books, or what makes you smile.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-200 p-6 text-center hover:shadow-lg transition-shadow">
              <Heart className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">Be Authentic</h3>
              <p className="text-green-700 text-sm">
                Write from the heart. Share your daily life, dreams, and what you&apos;re curious about.
              </p>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200 p-6 text-center hover:shadow-lg transition-shadow">
              <Sparkles className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-purple-900 mb-2">Start Simple</h3>
              <p className="text-purple-700 text-sm">
                A simple &ldquo;Hello&rdquo; can begin the most beautiful friendships across continents.
              </p>
            </Card>
          </div>

          {/* Call to Action */}
          <div className="mt-12 space-y-6">
            <div className="bg-gradient-to-r from-amber-100 to-rose-100 rounded-2xl p-8 max-w-2xl border-2 border-amber-200">
              <h3 className="text-2xl font-bold text-amber-900 mb-4">
                Ready to make a new friend? 🌍
              </h3>
              <p className="text-amber-800 mb-6 leading-relaxed">
                Your letter will be delivered in 12 hours, giving it that authentic postal feel. 
                Take your time and write something meaningful – your pen pal is waiting to hear from you!
              </p>
              
              <Button 
                onClick={handleWriteFirstLetter}
                size="lg" 
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg px-8 py-3"
              >
                <Send className="h-6 w-6 mr-3" />
                Write Your First Letter
              </Button>
            </div>

            {/* Tips Section */}
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-100 border-2 border-yellow-200 p-6 max-w-2xl">
              <h4 className="text-lg font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                First Letter Ideas
              </h4>
              <ul className="text-amber-800 text-sm space-y-2 text-left">
                <li>• Tell them about your hometown or favorite local spot</li>
                <li>• Share what you had for breakfast or your favorite meal</li>
                <li>• Describe the weather where you are right now</li>
                <li>• Ask them about their culture or traditions</li>
                <li>• Share a fun fact about yourself or your country</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}