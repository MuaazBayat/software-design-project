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
import Image from 'next/image';
import new_penpal from '@/public/new_penpal.png'
export default function NoConversationPage() {
  const router = useRouter();
  const { currentConversationUser} = useConversationUser();

  const handleWriteFirstLetter = () => {
    // Navigate to general compose page or pen pal selection
    if (currentConversationUser)
    router.push(`/compose-letter/${currentConversationUser.user_id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-black hover:bg-amber-100"
            onClick={() => router.push('/inbox')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inbox
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Decorative Header */}
          <div className="relative">
            <Image src={new_penpal} alt="Letter Writing" width={120} height={120} className="mx-auto mb-4" />
          </div>

          {/* Welcome Message */}
          <div className="space-y-4 max-w-2xl">
            <h2 className="text-4xl font-bold text-black mb-2">
              Your Letter Adventure <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">Begins!</span> ✨
            </h2>
            <p className="text-xl text-black leading-relaxed">
              You&apos;ve been matched with a wonderful pen pal from across the world.
              It&apos;s time to send your very first letter and start this magical journey!
            </p>
          </div>

          {/* Encouraging Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl w-full">
            <div className="p-6 text-center">
              <h3 className="text-lg font-semibold text-black mb-2">Break the Ice</h3>
              <p className="text-black text-sm">
                Introduce yourself! Share your hobbies, favorite books, or what makes you smile.
              </p>
            </div>

            <div className="p-6 text-center ">
              <h3 className="text-lg font-semibold text-black mb-2">Be Authentic</h3>
              <p className="text-black text-sm">
                Write from the heart. Share your daily life, dreams, and what you&apos;re curious about.
              </p>
            </div>

            <div className=" p-6 text-center">
              <h3 className="text-lg font-semibold text-black mb-2">Start Simple</h3>
              <p className="text-black text-sm">
                A simple &ldquo;Hello&rdquo; can begin the most beautiful friendships across continents.
              </p>
            </div>
          </div>
          <div className=" max-w-2xl">

              <ul className="text-black text-sm space-y-2 text-left">
                <li>• Tell them about your hometown or favorite local spot</li>
                <li>• Share what you had for breakfast or your favorite meal</li>
                <li>• Describe the weather where you are right now</li>
              </ul>
            </div>
          {/* Call to Action */}
          <div className="">
            <div className=" p-4 max-w-2xl ">

              <p className="text-black mb-6 leading-relaxed">
                Your letter will be delivered in 12 hours, giving it that authentic postal feel.
                Take your time and write something meaningful – your pen pal is waiting to hear from you!
              </p>

              <Button
                onClick={handleWriteFirstLetter}
                size="lg"
                className="bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 text-lg px-8 py-3 text-white"
              >
                <Send className="h-6 w-6 mr-3" />
                Start Writting
              </Button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}