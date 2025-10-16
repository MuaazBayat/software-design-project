'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
import Image from 'next/image';
import new_penpal from '@/public/new_penpal.png'

export default function NoConversationPage() {
  const router = useRouter();
  const { currentConversationUser} = useConversationUser();

  // Set page title for accessibility
  useEffect(() => {
    document.title = 'Start Your Letter Adventure - Conversation';
  }, []);

  const handleWriteFirstLetter = () => {
    // Navigate to general compose page or pen pal selection
    if (currentConversationUser)
    router.push(`/compose-letter/${currentConversationUser.user_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Skip to main content link for screen readers */}
      <a 
        href="#main-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-black text-white px-4 py-2 rounded z-50"
      >
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-black hover:bg-amber-100 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            onClick={() => router.push('/inbox')}
            aria-label="Go back to inbox"
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Back to Inbox
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Decorative Header */}
          <div className="relative">
            <Image 
              src={new_penpal} 
              alt="Illustration of a person writing a letter with a quill pen, representing the start of a pen pal relationship" 
              width={120} 
              height={120} 
              className="mx-auto mb-4" 
              priority
            />
          </div>

          {/* Welcome Message */}
          <section className="space-y-4 max-w-2xl" aria-labelledby="welcome-heading">
            <h1 id="welcome-heading" className="text-4xl font-bold text-black mb-2">
              Your Letter Adventure <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Begins!</span> ✨
            </h1>
            <p className="text-xl text-black leading-relaxed">
              You&apos;ve been matched with a wonderful pen pal from across the world.
              It&apos;s time to send your very first letter and start this magical journey!
            </p>
          </section>

          {/* Encouraging Cards */}
          <section className="grid md:grid-cols-3 gap-6 max-w-4xl w-full" aria-labelledby="tips-heading">
            <h2 id="tips-heading" className="sr-only">Letter Writing Tips</h2>
            
            <div className="p-6 text-center" role="article">
              <h3 className="text-lg font-semibold text-black mb-2">Break the Ice</h3>
              <p className="text-black text-sm">
                Introduce yourself! Share your hobbies, favorite books, or what makes you smile.
              </p>
            </div>

            <div className="p-6 text-center" role="article">
              <h3 className="text-lg font-semibold text-black mb-2">Be Authentic</h3>
              <p className="text-black text-sm">
                Write from the heart. Share your daily life, dreams, and what you&apos;re curious about.
              </p>
            </div>

            <div className="p-6 text-center" role="article">
              <h3 className="text-lg font-semibold text-black mb-2">Start Simple</h3>
              <p className="text-black text-sm">
                A simple &ldquo;Hello&rdquo; can begin the most beautiful friendships across continents.
              </p>
            </div>
          </section>
          
          <section className="max-w-2xl" aria-labelledby="suggestions-heading">
            <h2 id="suggestions-heading" className="sr-only">Letter Content Suggestions</h2>
            <ul className="text-black text-sm space-y-2 text-left" role="list">
              <li>• Tell them about your hometown or favorite local spot</li>
              <li>• Share what you had for breakfast or your favorite meal</li>
              <li>• Describe the weather where you are right now</li>
            </ul>
          </section>
          {/* Call to Action */}
          <section className="max-w-2xl" aria-labelledby="cta-heading">
            <div className="p-4">
              <h2 id="cta-heading" className="sr-only">Start Writing Your Letter</h2>
              <p className="text-black mb-6 leading-relaxed">
                Your letter will be delivered in 12 hours, giving it that authentic postal feel.
                Take your time and write something meaningful – your pen pal is waiting to hear from you!
              </p>

              <Button
                onClick={handleWriteFirstLetter}
                size="lg"
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg px-8 py-3 text-white focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                aria-describedby="letter-delivery-info"
              >
                <Send className="h-6 w-6 mr-3" aria-hidden="true" />
                Start Writing
              </Button>
              
              <p id="letter-delivery-info" className="sr-only">
                Your letter will be delivered to your pen pal in 12 hours
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}