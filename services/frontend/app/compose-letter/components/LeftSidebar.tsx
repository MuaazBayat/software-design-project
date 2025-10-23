import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Palette, Book, Plane, UserRound, Sparkles, MapPin, Calendar, Heart, Search, ArrowLeft, Music, Headphones, Mic, Brush, Image, Trophy, Target, Dumbbell, Utensils, Coffee, Apple, TreePine, Mountain, Leaf, Cpu, Smartphone, Monitor, Camera, ChefHat, PenTool, FileText, Film, Clapperboard, Gamepad2, PawPrint, Bird, Microscope, Atom, Clock, Building, Languages, MessageCircle, Shovel, Waves, Footprints, Timer, Bike, Brain, Aperture, Pencil, Loader2, Wand2, Star, Trash2 } from "lucide-react"
import { motion, AnimatePresence, useAnimation } from "framer-motion"
import { FontSidePanel } from "./FontSidePanel"
import nlp from 'compromise'

// Selected indicator component - simple checkmark
const SelectedIndicator = ({ colorClass }: { colorClass: string }) => {
  return (
    <div className={`absolute top-2 right-2 w-4 h-4 ${colorClass} rounded-full flex items-center justify-center shadow-sm`}>
      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    </div>
  );
};

// Avatar component with professional glossy hover effect that follows mouse
const AvatarWithHover = ({ letter, gradientClass, isSelected }: { letter: string; gradientClass: string; isSelected: boolean }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };
  
  return (
    <div 
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center text-white text-base font-bold shadow-sm transition-all duration-300 cursor-pointer relative overflow-visible ${
        isHovered ? 'scale-110 shadow-2xl brightness-110' : isSelected ? 'shadow-lg' : ''
      }`}
      style={{
        transformOrigin: 'center',
        boxShadow: isHovered ? '0 20px 25px -5px rgba(0,0,0,0.3), 0 0 15px rgba(255,255,255,0.5)' : undefined
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
        setIsHovered(true);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        setIsHovered(false);
      }}
      onMouseMove={handleMouseMove}
    >
      {/* Glossy overlay that follows mouse */}
      <div 
        className={`absolute inset-0 rounded-full transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-50'}`}
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.2) 40%, transparent 70%)`
        }}
      ></div>
      {/* Shimmer effect */}
      {isHovered && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
        </div>
      )}
      {/* Letter */}
      <span className="relative z-10 drop-shadow-md">{letter}</span>
    </div>
  );
};

// Small inlined template type + data so this component is self-contained.
export type LetterTemplate = { id: string; name: string; description: string; content: string; category: string; estimated_minutes?: number; tags?: string[]; heading?: string; footer?: string }

// Function to get relevant icon based on interest text using NLP
const getInterestIcon = (interest: string) => {
  const doc = nlp(interest.toLowerCase());

  // Category-based icon mapping using NLP tags
  const categoryIcons: Record<string, any> = {
    // Reading/Writing
    '#Noun #Verb': Book, // reading, writing
    '#Noun': Book, // books, novels, stories

    // Travel
    '#Verb': Plane, // traveling, exploring
    '#Place': MapPin, // locations, destinations

    // Music
    '#Music': Music, // music, songs, bands
    '#Audio': Headphones, // listening, audio

    // Art/Creativity
    '#Art': Palette, // art, painting, drawing
    '#Color': Palette, // colors, painting
    '#Image': Camera, // photography, images

    // Sports
    '#Sport': Trophy, // sports, games
    '#Competition': Trophy, // competition, games
    '#Exercise': Dumbbell, // fitness, workout

    // Food
    '#Food': Utensils, // food, cooking, eating
    '#Drink': Coffee, // coffee, drinks

    // Nature
    '#Nature': Mountain, // nature, outdoors
    '#Plant': Leaf, // plants, gardening
    '#Animal': PawPrint, // animals, pets

    // Technology
    '#Technology': Cpu, // tech, computers
    '#Device': Smartphone, // phones, devices

    // Science
    '#Science': Microscope, // science, research

    // Entertainment
    '#Movie': Film, // movies, films
    '#Game': Gamepad2, // games, gaming

    // Time/History
    '#Time': Clock, // history, time
    '#Date': Calendar, // dates, schedules

    // Communication
    '#Language': Languages, // languages, speaking
    '#Communication': MessageCircle, // messaging, chatting

    // Emotions/Personal
    '#Emotion': Heart, // love, emotions
    '#Person': UserRound, // people, social
  };

  // Check for specific NLP matches
  for (const [pattern, icon] of Object.entries(categoryIcons)) {
    if (doc.match(pattern).found) {
      return icon;
    }
  }

  // Fallback keyword-based mapping for common interests
  const keywordIcons: Record<string, any> = {
    'read': Book, 'book': Book, 'write': PenTool, 'story': FileText,
    'travel': Plane, 'trip': Plane, 'explore': Plane,
    'music': Music, 'song': Music, 'sing': Mic,
    'art': Palette, 'paint': Brush, 'draw': Pencil, 'photo': Camera,
    'sport': Trophy, 'fitness': Dumbbell, 'run': Footprints, 'swim': Waves,
    'cook': ChefHat, 'food': Utensils, 'coffee': Coffee,
    'nature': Mountain, 'garden': Leaf, 'animal': PawPrint,
    'tech': Cpu, 'game': Gamepad2, 'movie': Film,
    'history': Clock, 'language': Languages, 'social': UserRound
  };

  // Check keywords
  for (const [keyword, icon] of Object.entries(keywordIcons)) {
    if (interest.toLowerCase().includes(keyword)) {
      return icon;
    }
  }

  // Final fallback: hash-based selection from all available icons
  const allIcons = [Palette, Book, Plane, UserRound, Sparkles, MapPin, Calendar, Heart, Music, Headphones, Mic, Brush, Image, Trophy, Target, Dumbbell, Utensils, Coffee, Apple, TreePine, Mountain, Leaf, Cpu, Smartphone, Monitor, Camera, ChefHat, PenTool, FileText, Film, Clapperboard, Gamepad2, PawPrint, Bird, Microscope, Atom, Clock, Building, Languages, MessageCircle, Shovel, Waves, Footprints, Timer, Bike, Brain, Aperture, Pencil];

  const hash = interest.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);

  return allIcons[Math.abs(hash) % allIcons.length];
};

const DEFAULT_TEMPLATES: LetterTemplate[] = [
  {
    id: 't1',
    name: 'Intro — a friendly hello',
    description: 'A warm, short introduction you can send to start a conversation.',
    content: `I'm excited to connect with you here. I love learning about people's daily lives and small rituals. What's one little thing that makes your day better?`,
    category: 'intro'
  },
  {
    id: 't2',
    name: 'Travel story',
    description: 'Share a short travel memory to spark conversation.',
    content: `I recently took a short trip and was struck by how different the mornings felt there — the light, the sounds, and the food. One morning I wandered into a small market and tried a local pastry that I'll never forget. Have you traveled anywhere that surprised you lately?`,
    category: 'travel'
  },
  {
    id: 't3',
    name: 'Checking in',
    description: 'A gentle way to reconnect after some time.',
    content: `It's been a little while and I wanted to check in and see how you're doing. I hope life has been treating you kindly. What's been keeping you busy these days?`,
    category: 'reconnect'
  },
  {
    id: 't4',
    name: 'Share a Hobby',
    description: 'Talk about one of your passions and ask about theirs.',
    content: `Lately, I've been spending a lot of my free time painting with watercolors. There's something so relaxing about watching the colors blend on the paper, creating something beautiful from nothing. I started with simple landscapes, but now I'm experimenting with abstract patterns. The best part is that there's no right or wrong way to do it - it's all about expressing yourself. What's a hobby that you're passionate about right now? Do you have any creative outlets or activities that bring you joy? I'd love to hear about what you enjoy doing in your spare time.`,
    category: 'hobby',
    estimated_minutes: 2,
    tags: ['hobbies', 'passion']
  },
  {
    id: 't5',
    name: 'Book/Movie Corner',
    description: 'Share a recent favorite book, movie, or song.',
    content: `I just finished reading an incredible novel that I can't stop thinking about. The story was so beautifully written, and the characters felt so real that I found myself staying up late just to see what would happen next. The author's way of describing emotions and relationships really resonated with me. It made me reflect on my own experiences and relationships. Have you read or watched anything amazing recently? I'd love a recommendation! What kinds of stories or genres do you enjoy most? I'm always looking for my next great read or watch.`,
    category: 'media',
    estimated_minutes: 2,
    tags: ['books', 'movies', 'recommendation']
  },
  {
    id: 't6',
    name: 'A Little Question',
    description: 'A small, thoughtful question to get to know someone better.',
    content: `Here's a small question for you: What's a small act of kindness you witnessed recently that made you smile? It could be something as simple as a stranger holding the door open for someone with their hands full, or a coworker bringing coffee for a colleague having a tough day. I love hearing about these moments because they remind us that kindness exists everywhere, even in the smallest gestures. Your answer might inspire me to look for similar moments in my own day-to-day life.`,
    category: 'question',
    estimated_minutes: 1,
    tags: ['icebreaker', 'kindness']
  },
  {
    id: 't7',
    name: 'Food Adventures',
    description: 'Talk about favorite foods or recent culinary discoveries.',
    content: `Food has such a way of bringing back memories, doesn't it? I recently tried making homemade pasta for the first time, and while it was messy and took longer than I expected, the taste was worth every bit of effort. The sauce was simple - just tomatoes, garlic, and fresh basil from my windowsill garden - but it tasted like something from an Italian trattoria. It reminded me of the summers I spent in Italy as a child, watching my grandmother roll out dough on the kitchen table. What's your favorite comfort food and why? Is there a dish that always takes you back to happy memories or special times in your life? I'd love to hear about your culinary adventures or favorite recipes.`,
    category: 'food',
    estimated_minutes: 2,
    tags: ['food', 'cooking', 'memories']
  },
  {
    id: 't8',
    name: 'Nature Walks',
    description: 'Share thoughts on outdoor activities and nature.',
    content: `I took a long walk in the park yesterday and noticed how the leaves are just starting to change color. There's something so peaceful about being outdoors, listening to the crunch of fallen leaves underfoot and feeling the crisp autumn air on my skin. I found a perfect spot by the lake where I could sit and watch the ducks swimming lazily, and for a moment, all my worries seemed to fade away. It made me realize how important it is to take time for these quiet moments in nature. Do you have a favorite spot in nature that you like to visit? Is there a particular season or time of day when you feel most connected to the outdoors? I'd love to hear about your experiences with nature and what it means to you.`,
    category: 'nature',
    estimated_minutes: 2,
    tags: ['nature', 'outdoors', 'peaceful']
  },
  {
    id: 't9',
    name: 'Music Discovery',
    description: 'Discuss favorite songs, artists, or musical moments.',
    content: `I've been listening to a lot of jazz lately, and I discovered this amazing saxophone player whose music just transports me to another world. The way the notes weave together, telling a story without words, is absolutely mesmerizing. I found myself closing my eyes and letting the melody carry me away. Music has such power to evoke emotions and memories, don't you think? What's a song that always cheers you up, no matter what kind of day you're having? Or perhaps there's a piece of music that holds special meaning for you - maybe it's connected to a particular memory or time in your life. I'd love to hear about your musical discoveries and what songs or artists mean the most to you.`,
    category: 'music',
    estimated_minutes: 2,
    tags: ['music', 'emotions', 'discovery']
  },
  {
    id: 't10',
    name: 'Weekend Plans',
    description: 'Share what you have planned for the upcoming weekend.',
    content: `The weekend is coming up, and I'm looking forward to some quiet time at home with a good book and maybe some baking. I have this recipe for chocolate chip cookies that I've been wanting to try - the kind with sea salt on top that makes them extra special. There's something so satisfying about measuring ingredients, mixing the dough, and watching them transform in the oven. How about you? Do you have any exciting plans or are you keeping it low-key? I'm always interested in how people spend their weekends - whether it's adventurous outings or cozy stay-at-home activities. What does a perfect weekend look like for you?`,
    category: 'plans',
    estimated_minutes: 1,
    tags: ['weekend', 'plans', 'relaxation']
  },
  {
    id: 't11',
    name: 'Childhood Memories',
    description: 'Reflect on happy memories from your childhood.',
    content: `Thinking back to my childhood, I remember spending summers at my grandparents' farm, helping with the garden and chasing fireflies at dusk. Those simple joys stick with you forever, don't they? The smell of fresh earth after rain, the taste of sun-warmed tomatoes picked straight from the vine, and the feeling of complete freedom as I ran through the fields. My grandmother would tell me stories while we shelled peas on the porch, and those moments shaped who I am today. What's a happy childhood memory that comes to mind for you? Was there a special place, person, or activity that made your childhood magical? I'd love to hear about the moments that shaped your early years and the memories you cherish most.`,
    category: 'memories',
    estimated_minutes: 2,
    tags: ['childhood', 'memories', 'nostalgia']
  },
  {
    id: 't12',
    name: 'Learning Something New',
    description: 'Talk about recent learning experiences or aspirations.',
    content: `I've been trying to learn Spanish through an app, and it's challenging but rewarding to see progress. There's something satisfying about acquiring new knowledge and feeling your brain make new connections. I started with basic phrases, and now I can have simple conversations about daily life. The hardest part is remembering irregular verbs, but the feeling of accomplishment when I understand a native speaker is worth every struggle. There's something so invigorating about stepping outside your comfort zone and learning something new. Is there anything new you're learning or want to learn? Maybe a language, an instrument, a sport, or even a new skill for work? I'd love to hear about your learning journey and what motivates you to keep growing and expanding your horizons.`,
    category: 'learning',
    estimated_minutes: 2,
    tags: ['learning', 'growth', 'aspirations']
  },
  {
    id: 't13',
    name: 'Dreams & Goals',
    description: 'Share your aspirations and what you hope to achieve.',
    content: `I've been doing a lot of thinking about my dreams and goals lately. There's something about quiet moments that brings these thoughts to the surface. One of my biggest dreams is to travel to Japan and experience the culture firsthand - the food, the temples, the cherry blossoms in spring. I want to learn about the philosophy of wabi-sabi and how it influences their approach to life. What's a dream you've been nurturing? It could be something big like traveling the world, or something smaller like learning to play an instrument. I'd love to hear about what inspires you and what you're working toward. Sometimes sharing our dreams with others makes them feel more real and achievable.`,
    category: 'goals',
    estimated_minutes: 3,
    tags: ['dreams', 'goals', 'aspirations']
  },
  {
    id: 't14',
    name: 'Family & Pets',
    description: 'Talk about your loved ones and furry friends.',
    content: `Family and pets have such a special way of bringing joy into our lives, don't they? My dog has this hilarious habit of stealing socks and hiding them under the couch, and I spend half my mornings hunting for matching pairs. But honestly, those little moments of playfulness make coming home the best part of my day. He's always so excited to see me, with his tail wagging furiously and his whole body shaking with happiness. Tell me about your family or pets - do you have any furry, feathered, or scaly companions? What's the funniest or most endearing thing they've done recently? I'd love to hear about the people and animals that make your home feel special.`,
    category: 'family',
    estimated_minutes: 2,
    tags: ['family', 'pets', 'home']
  },
  {
    id: 't15',
    name: 'Funny Moments',
    description: 'Share a lighthearted, embarrassing, or hilarious story.',
    content: `I had the most embarrassing moment the other day that I can't stop laughing about now. I was at the grocery store, confidently reaching for what I thought was a perfectly ripe avocado, when it slipped from my hands and rolled all the way down the produce aisle. I chased after it like it was trying to escape, and when I finally looked up to see half a dozen people watching me with amused smiles. I just shrugged and said, "Well, at least it wasn't a watermelon!" What's the funniest or most embarrassing thing that's happened to you recently? Those awkward moments often make the best stories, and I love hearing about them. They remind us not to take ourselves too seriously.`,
    category: 'funny',
    estimated_minutes: 2,
    tags: ['humor', 'embarrassing', 'stories']
  },
  {
    id: 't16',
    name: 'Gratitude Practice',
    description: 'Express thankfulness for the good things in life.',
    content: `I've been trying to cultivate a gratitude practice lately, and it's amazing how it shifts your perspective on life. Even on challenging days, there are always small things to be thankful for - the way the morning light filters through the curtains, the smell of fresh coffee, or the sound of birds singing outside my window. Yesterday, I found myself grateful for something as simple as having a warm coat on a chilly day. It made me realize how many comforts we often take for granted. What are you feeling grateful for right now? It could be something big like good health or loving relationships, or something small like your favorite mug or a beautiful sunset you saw recently. I'd love to hear what brings you joy and thankfulness.`,
    category: 'gratitude',
    estimated_minutes: 2,
    tags: ['gratitude', 'thankfulness', 'positivity']
  },
  {
    id: 't17',
    name: 'Work & Career',
    description: 'Discuss your professional life and passions.',
    content: `Work and career can be such interesting topics when you dig beneath the surface. I love what I do because it combines creativity with problem-solving, and every day brings new challenges and opportunities to learn. Lately, I've been working on a project that really excites me - it's pushing me to develop skills I never thought I'd need, but the growth feels incredible. That said, I also value work-life balance and making time for the things that recharge me. What's your relationship with your work like? Do you have a career you're passionate about, or are you still exploring what you want to do? I'd love to hear about what fulfills you professionally and what you enjoy most about your work or studies.`,
    category: 'career',
    estimated_minutes: 3,
    tags: ['work', 'career', 'professional']
  },
  {
    id: 't18',
    name: 'Cultural Exchange',
    description: 'Share about your culture, traditions, or heritage.',
    content: `Culture and traditions have such a beautiful way of connecting us to our roots and to each other. I grew up celebrating festivals that combined food, music, and family gatherings, and those traditions still bring me comfort and joy. There's something special about sharing cultural practices with others and learning about different ways of life. Recently, I've been exploring traditional crafts from my heritage, and it's been a wonderful way to connect with my family's history. What about you? Are there cultural traditions, foods, or celebrations that are important to you? I'd love to learn about your background and the customs that shape your life. Sometimes the most meaningful connections come from understanding and appreciating our differences.`,
    category: 'culture',
    estimated_minutes: 3,
    tags: ['culture', 'traditions', 'heritage']
  }
]

interface Match {
  id: string
  name: string
  location: string
  interests: string[]
  conversation_thread_id: string
  match_id?: string
  since?: string
}

interface LeftSidebarProps {
  selectedMatch: Match | null
  loading?: boolean
  onChangeRecipient?: (matchId: string) => void
  matches: Match[]
  // message history removed — no props for messages
  onApplyTemplate?: (templateId: string | LetterTemplate) => void
  showFontOverlay?: boolean
  onToggleFontOverlay?: () => void
  fontStyle?: string
  onSelectFont?: (id: string) => void
  onPreviewFont?: (id: string | null) => void
  fontColor?: string
  fontOpacity?: number
  backgroundColor?: string
  backgroundOpacity?: number
  userInterests?: string[]
  onCloseMobilePanel?: () => void
}

export default function LeftSidebar({ 
  selectedMatch, 
  loading = false, 
  onChangeRecipient,
  matches = [],
  onApplyTemplate,
  showFontOverlay = false,
  onToggleFontOverlay,
  fontStyle = 'handwritten',
  onSelectFont,
  onPreviewFont,
  fontColor = "#000000",
  fontOpacity = 1,
  backgroundColor = "#ffffff",
  backgroundOpacity = 1,
  userInterests: propUserInterests = [],
  onCloseMobilePanel
}: LeftSidebarProps) {
  const router = useRouter();
  // LeftSidebar receives matches and selection from parent; no debug logs kept
  const [templates] = useState<LetterTemplate[]>(DEFAULT_TEMPLATES)
  const [mobileCollapsed, setMobileCollapsed] = useState(false)
  // State for pen pal selection - now always visible
  const [showPenPalOptions, setShowPenPalOptions] = useState(false);
  // Search state for pen pal selection
  const [search, setSearch] = useState("");
  // State for writing prompts mode selection
  const [writingPromptsMode, setWritingPromptsMode] = useState<'premade' | 'ai-assisted'>('premade');
  const [showWritingPromptsOptions, setShowWritingPromptsOptions] = useState(true);
  const [hasSelectedWritingPromptsMode, setHasSelectedWritingPromptsMode] = useState(false);
  // State for shared interests popup
  const [showSharedInterestsPopup, setShowSharedInterestsPopup] = useState(false);
  
  // State for AI template generation
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplates, setGeneratedTemplates] = useState<LetterTemplate[]>([]);
  
  // State for AI connection status
  const [aiConnectionStatus, setAiConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  
  // State for toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'warning' | 'success' } | null>(null);
  
  // State for saved templates
  const [savedTemplates, setSavedTemplates] = useState<LetterTemplate[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  // Function to save to localStorage with cookie fallback for mobile
  const saveToStorage = useCallback((key: string, data: any) => {
    try {
      const dataString = JSON.stringify(data);
      localStorage.setItem(key, dataString);
      console.log(`Saved to localStorage: ${key}`, data);
      
      // Also save to cookie as fallback for mobile browsers
      document.cookie = `${key}=${encodeURIComponent(dataString)}; max-age=31536000; path=/; SameSite=Strict`;
      console.log(`Also saved to cookie: ${key}`);
    } catch (error) {
      console.error('Error saving to storage:', error);
      // Try cookie only
      try {
        const dataString = JSON.stringify(data);
        document.cookie = `${key}=${encodeURIComponent(dataString)}; max-age=31536000; path=/; SameSite=Strict`;
        console.log(`Fallback: saved to cookie only: ${key}`);
      } catch (cookieError) {
        console.error('Error saving to cookie fallback:', cookieError);
      }
    }
  }, []);

  // Function to load from storage with cookie fallback
  const loadFromStorage = useCallback((key: string) => {
    try {
      // Try localStorage first
      const localData = localStorage.getItem(key);
      if (localData) {
        console.log(`Loaded from localStorage: ${key}`, localData);
        return JSON.parse(localData);
      }
      
      // Fallback to cookie
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [cookieKey, cookieValue] = cookie.trim().split('=');
        if (cookieKey === key && cookieValue) {
          const decoded = decodeURIComponent(cookieValue);
          console.log(`Loaded from cookie fallback: ${key}`, decoded);
          return JSON.parse(decoded);
        }
      }
      
      console.log(`No data found for key: ${key}`);
      return null;
    } catch (error) {
      console.error('Error loading from storage:', error);
      return null;
    }
  }, []);

  // Function to set cookie
  const setCookie = useCallback((name: string, value: string, days: number) => {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`;
      console.log(`Set cookie: ${name} for ${days} days`);
    } catch (error) {
      console.error('Error setting cookie:', error);
    }
  }, []);

  // IndexedDB storage functions for better mobile persistence
  const openDB = useCallback(() => {
    return new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('PenPalApp', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'key' });
        }
      };
    });
  }, []);

  const saveToIndexedDB = useCallback(async (key: string, data: any) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['templates'], 'readwrite');
      const store = transaction.objectStore('templates');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ key, data, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      console.log(`Saved to IndexedDB: ${key}`, data);
    } catch (error) {
      console.error('Error saving to IndexedDB:', error);
      // Fallback to localStorage/cookies
      saveToStorage(key, data);
    }
  }, [openDB, saveToStorage]);

  const loadFromIndexedDB = useCallback(async (key: string) => {
    try {
      const db = await openDB();
      const transaction = db.transaction(['templates'], 'readonly');
      const store = transaction.objectStore('templates');
      
      const result = await new Promise<any>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      db.close();
      
      if (result && result.data) {
        console.log(`Loaded from IndexedDB: ${key}`, result.data);
        return result.data;
      }
      
      console.log(`No data found in IndexedDB for key: ${key}`);
      return null;
    } catch (error) {
      console.error('Error loading from IndexedDB:', error);
      // Fallback to localStorage/cookies
      return loadFromStorage(key);
    }
  }, [openDB, loadFromStorage]);

  // State for tracking hover on pen pal options
  const [isHoveringPenPalOptions, setIsHoveringPenPalOptions] = useState(false);
  
  // useCallback functions for loading templates
  const getInitialSavedTemplates = useCallback(() => {
    console.log('Loading initial saved templates...');
    const saved = loadFromStorage('savedLetterTemplates');
    console.log('Loaded saved templates:', saved);
    return Array.isArray(saved) ? saved : [];
  }, [loadFromStorage]);

  const getInitialGeneratedTemplates = useCallback(() => {
    console.log('Loading initial generated templates...');
    const generated = loadFromStorage('generatedLetterTemplates');
    console.log('Loaded generated templates:', generated);
    return Array.isArray(generated) ? generated : [];
  }, [loadFromStorage]);

  // Load saved templates after hydration
  useEffect(() => {
    const initialTemplates = getInitialSavedTemplates()
    setSavedTemplates(initialTemplates)
    setIsHydrated(true)
  }, [getInitialSavedTemplates])

  // Load generated templates after hydration
  useEffect(() => {
    const initialGeneratedTemplates = getInitialGeneratedTemplates()
    setGeneratedTemplates(initialGeneratedTemplates)
  }, [getInitialGeneratedTemplates])
  
  // Save templates to localStorage whenever savedTemplates changes (but not during initial load)
  useEffect(() => {
    // Only save if we're hydrated (not during initial load) and templates array is not empty or has changed from initial state
    if (isHydrated) {
      console.log('Saving templates to localStorage and sessionStorage:', savedTemplates);
      console.log('savedTemplates length:', savedTemplates.length);
      try {
        const dataToSave = JSON.stringify(savedTemplates);
        localStorage.setItem('savedLetterTemplates', dataToSave);
        sessionStorage.setItem('savedLetterTemplates', dataToSave);
        setCookie('savedLetterTemplates', dataToSave, 30); // Save to cookies for 30 days
        console.log('Successfully saved templates to localStorage, sessionStorage, and cookies');
      } catch (error) {
        console.error('Error saving templates to storage:', error);
      }
    }
  }, [savedTemplates, isHydrated, setCookie]);

  // Save generated templates to localStorage whenever generatedTemplates changes (but not during initial load)
  useEffect(() => {
    // Only save if we're hydrated (not during initial load) and templates array is not empty or has changed from initial state
    if (isHydrated && generatedTemplates.length >= 0) {
      console.log('Saving generated templates to localStorage and sessionStorage:', generatedTemplates);
      console.log('generatedTemplates length:', generatedTemplates.length);
      try {
        const dataToSave = JSON.stringify(generatedTemplates);
        localStorage.setItem('generatedLetterTemplates', dataToSave);
        sessionStorage.setItem('generatedLetterTemplates', dataToSave);
        console.log('Successfully saved generated templates to localStorage and sessionStorage');
      } catch (error) {
        console.error('Error saving generated templates to storage:', error);
      }
    }
  }, [generatedTemplates, isHydrated]);
  
  // Animation controls for the recipient section
  const controls = useAnimation();
  
  // Trigger animation whenever showPenPalOptions changes
  useEffect(() => {
    controls.start({
      scale: [1, 1.05, 1],
      transition: {
        duration: 0.6,
        times: [0, 0.4, 1],
        ease: "easeInOut"
      }
    });
  }, [showPenPalOptions, controls]);

  // Auto-close pen pal options after 10 seconds (only when not hovering)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (showPenPalOptions && !isHoveringPenPalOptions) {
      timer = setTimeout(() => {
        setShowPenPalOptions(false);
      }, 10000); // 10 seconds
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [showPenPalOptions, isHoveringPenPalOptions]);
  
  const filteredMatches = matches.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.location.toLowerCase().includes(search.toLowerCase())
  );
  // Helper to format a friendly "since" string (e.g., "2y", "3m", "10d")
  function formatSince(dateStr?: string) {
    if (!dateStr) return null;
    const then = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 1) return 'today';
    if (diffDays < 30) return `${diffDays}d`;
    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths < 12) return `${diffMonths}m`;
    const diffYears = Math.floor(diffMonths / 12);
    return `${diffYears}y`;
  }
  // Search state for templates dialog
  const [templatesSearch, setTemplatesSearch] = useState("");
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(templatesSearch.toLowerCase()) ||
    t.description.toLowerCase().includes(templatesSearch.toLowerCase())
  )

  // Function to check AI connection
  const checkAiConnection = async () => {
    setAiConnectionStatus('checking');
    try {
      // Quick test call to check if AI service is available
      const AZURE_FUNCTION_URL = 'https://penpalfinal.azurewebsites.net/api/generate-template';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(AZURE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'test',
          context: null
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        setAiConnectionStatus('connected');
      } else {
        setAiConnectionStatus('error');
      }
    } catch (error) {
      console.error('AI connection check failed:', error);
      setAiConnectionStatus('error');
    }
  };

  // Function to generate AI templates
  const generateAiTemplate = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      // Replace with your deployed Azure Function URL
      const AZURE_FUNCTION_URL = 'https://penpalfinal.azurewebsites.net/api/generate-template';

      const response = await fetch(AZURE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          context: {
            selectedMatch: selectedMatch ? {
              name: selectedMatch.name,
              location: selectedMatch.location,
              interests: selectedMatch.interests
            } : null,
            userInterests: propUserInterests
          }
        }),
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          const errorData = await response.json().catch(() => ({}));
          if (errorData.error?.includes('inappropriate') || errorData.error?.includes('Content contains')) {
            // Content safety rejection - show user-friendly toast
            setToast({
              message: "Your prompt contains content that may be inappropriate. Please try rephrasing your request to focus on positive topics for letter writing.",
              type: 'warning'
            });
            return;
          }
        }
        throw new Error('Failed to generate template');
      }

      const data = await response.json();
      const newTemplate: LetterTemplate = {
        id: `ai-${Date.now()}`,
        name: data.template.name,
        description: data.template.description,
        content: data.template.content || data.template.description, // Use content field if available, fallback to description
        category: 'ai-generated',
        estimated_minutes: data.template.estimated_minutes || 3,
        tags: data.template.tags || ['ai-generated'],
        heading: data.template.heading,
        footer: data.template.footer
      };

      // Show warning if the backend provided one (e.g., content was rephrased)
      if (data.warning) {
        console.log('Template generation warning:', data.warning);
        // Could show a toast notification here if desired
      }

      setGeneratedTemplates(prev => {
        // Keep only the most recent 7 templates, remove oldest if needed
        const updatedTemplates = [newTemplate, ...prev];
        const finalTemplates = updatedTemplates.slice(0, 7);
        
        // Immediately save to both localStorage and sessionStorage
        try {
          const dataToSave = JSON.stringify(finalTemplates);
          localStorage.setItem('generatedLetterTemplates', dataToSave);
          sessionStorage.setItem('generatedLetterTemplates', dataToSave);
          console.log('Immediately saved generated templates to localStorage and sessionStorage:', finalTemplates);
        } catch (error) {
          console.error('Error immediately saving generated templates to storage:', error);
        }
        
        return finalTemplates;
      });
      setAiPrompt("");
    } catch (error) {
      console.error('Error generating AI template:', error);
      // On error, show coming soon state
      setAiConnectionStatus('error');
      // You could add a toast notification here
    } finally {
      setIsGenerating(false);
    }
  };

  // Function to save a template
  const saveTemplate = (template: LetterTemplate) => {
    console.log('Attempting to save template:', template);
    console.log('Current savedTemplates before save:', savedTemplates);
    setSavedTemplates(prev => {
      // Check if template is already saved
      if (prev.some(t => t.id === template.id)) {
        console.log('Template already saved:', template.id);
        return prev; // Already saved
      }
      const newSaved = [...prev, template];
      console.log('Adding new template to saved list. New savedTemplates:', newSaved);

      // Immediately save to both localStorage and sessionStorage
      try {
        const dataToSave = JSON.stringify(newSaved);
        localStorage.setItem('savedLetterTemplates', dataToSave);
        sessionStorage.setItem('savedLetterTemplates', dataToSave);
        console.log('Successfully saved templates to localStorage and sessionStorage');
      } catch (error) {
        console.error('Error saving templates to storage:', error);
      }

      return newSaved;
    });
  };

  // Function to remove a saved template
  const removeTemplate = (templateId: string) => {
    setSavedTemplates(prev => {
      const newSaved = prev.filter(t => t.id !== templateId);

      // Immediately save to both localStorage and sessionStorage
      try {
        const dataToSave = JSON.stringify(newSaved);
        localStorage.setItem('savedLetterTemplates', dataToSave);
        sessionStorage.setItem('savedLetterTemplates', dataToSave);
        console.log('Immediately saved updated templates to storage after removal:', newSaved);
      } catch (error) {
        console.error('Error saving templates to storage after removal:', error);
      }

      return newSaved;
    });
  };

  // Function to check if a template is saved
  const isTemplateSaved = (templateId: string) => {
    return savedTemplates.some(t => t.id === templateId);
  };

  // Calculate shared interests by combining user interests with selected pen pal's interests
  const sharedInterests = [
    ...(propUserInterests || []),
    ...(selectedMatch?.interests || [])
  ];

  // Normalize and deduplicate interests
  const normalizeInterest = (interest: string) => {
    const normalized = interest.toLowerCase().trim();
    // Simple synonym mapping
    const synonyms: Record<string, string> = {
      'gaming': 'games',
      'photography': 'photos',
      'photographer': 'photos',
      'cooking': 'cook',
      'baking': 'cook',
      'running': 'run',
      'jogging': 'run',
      'hiking': 'hike',
      'travelling': 'travel',
      'vacation': 'travel',
      'fitness': 'workout',
      'gym': 'workout',
      'technology': 'tech',
      'programming': 'tech',
      'coding': 'tech',
      'music': 'songs',
      'songs': 'music',
      'reading': 'books',
      'novels': 'books',
      'stories': 'books',
      'writing': 'write',
      'painting': 'art',
      'drawing': 'art',
      'sports': 'sport'
    };
    return synonyms[normalized] || normalized;
  };

  const uniqueInterests = Array.from(new Set(sharedInterests.map(normalizeInterest)));

  // templates are inlined (DEFAULT_TEMPLATES) to avoid a tiny service module.
  
  return (
    <div className={`relative w-80 bg-gradient-to-b from-slate-50 via-white to-slate-50 backdrop-blur-sm border-r border-slate-200/60 h-[calc(100vh-80px)] shrink-0 overflow-hidden select-none ${mobileCollapsed ? 'hidden' : ''}`}>
      {/* Conditionally render either normal content or FontSidePanel */}
      {showFontOverlay ? (
        <FontSidePanel
          open={true}
          currentId={fontStyle || 'handwritten'}
          onSelect={(id: string) => {
            onSelectFont?.(id);
            onToggleFontOverlay?.();
          }}
          onPreview={onPreviewFont || (() => {})}
          onClose={() => onToggleFontOverlay?.()}
          anchorWithinSidebar={true}
          fontColor={fontColor}
          fontOpacity={fontOpacity}
          backgroundColor={backgroundColor}
          backgroundOpacity={backgroundOpacity}
        />
      ) : (
        <div className="h-full p-6 space-y-6 overflow-y-auto scrollbar-hide">
          {/* Beautiful Back to Inbox Button - Island Style */}
          <div className="relative group/back">
            <div className="absolute inset-[-8px] bg-gradient-to-br from-blue-400/20 via-cyan-400/15 to-teal-400/20 rounded-[2rem] blur-lg opacity-60 group-hover/back:opacity-90 transition-all duration-500 pointer-events-none"></div>
            <div className="absolute inset-[-4px] bg-gradient-to-br from-blue-300/15 via-cyan-300/10 to-teal-300/15 rounded-[1.75rem] blur-md opacity-70 group-hover/back:opacity-100 transition-all duration-500 pointer-events-none"></div>
            
            <Button 
              variant="ghost" 
              onClick={() => router.push('/inbox')} 
              className="relative w-full justify-start gap-3 bg-gradient-to-br from-white via-blue-50/30 to-white shadow-lg hover:shadow-xl backdrop-blur-sm rounded-2xl p-4 border border-slate-200/50 hover:border-blue-300/40 transition-all duration-300 group/btn overflow-visible"
              aria-label="Return to inbox"
            >
              {/* Icon circle with gradient */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 flex items-center justify-center group-hover/btn:scale-110 group-hover/btn:shadow-lg transition-all duration-300 group-hover/btn:from-blue-200 group-hover/btn:to-cyan-200">
                <ArrowLeft className="w-5 h-5 text-blue-700 group-hover/btn:text-blue-800" />
              </div>
              
              {/* Text */}
              <span className="font-bold text-slate-700 group-hover/btn:text-blue-800 transition-colors duration-300">
                Back to Inbox
              </span>
            </Button>
          </div>

          {/* Subtle Section Divider */}
          <div className="relative h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent blur-sm"></div>
          </div>
          
          {/* Recipient Info with Dropdown - Enhanced */}
          <div className="relative mb-6 group/section">
            <div className="absolute inset-[-12px] bg-gradient-to-br from-amber-400/30 via-orange-400/20 to-rose-400/30 rounded-[2.5rem] blur-xl opacity-70 group-hover/section:opacity-95 transition-all duration-500 animate-pulse-slow pointer-events-none"></div>
            <div className="absolute inset-[-6px] bg-gradient-to-br from-amber-300/20 via-orange-300/15 to-rose-300/20 rounded-[2.25rem] blur-md opacity-80 group-hover/section:opacity-100 group-hover/section:inset-[-8px] transition-all duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-3xl opacity-0 animate-shimmer pointer-events-none"></div>
          <motion.div 
            layout
            animate={controls}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative bg-gradient-to-br from-white via-orange-50/30 to-white shadow-2xl backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-3xl transition-shadow duration-500 ease-out animate-float-subtle animate-fade-in-up will-change-transform border border-slate-200/50 group-hover/section:border-amber-300/40" 
            style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.98) 100%)'}}
          >
            <div className="relative z-10 p-6">
              <div className="cursor-pointer" onClick={() => setShowPenPalOptions(!showPenPalOptions)}>
              <h4 className="font-bold text-slate-800 mb-6 select-none text-sm tracking-wide uppercase text-center flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Writing To...
              </h4>
            {loading ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-6"
              >
                {/* Animated avatar skeleton with gradient shimmer */}
                <div className="relative w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                    animate={{
                      x: ['-100%', '100%']
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
                
                {/* Animated name skeleton */}
                <div className="w-full flex flex-col gap-3 items-center">
                  <div className="relative h-6 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded-lg w-3/4 overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.1
                      }}
                    />
                  </div>
                  
                  {/* Animated location skeleton */}
                  <div className="relative h-4 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 rounded w-1/2 overflow-hidden">
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent"
                      animate={{
                        x: ['-100%', '100%']
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.2
                      }}
                    />
                  </div>
                </div>
                
                {/* Animated pulsing dots */}
                <div className="flex gap-2 mt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            ) : selectedMatch ? (
              <div className="flex flex-col items-center gap-4">
                {/* Selected pen pal display */}
                <div className="flex flex-col items-center gap-6 mb-2">
                  {/* Large avatar with hover effect - positioned higher */}
                  <div className="scale-[1.6] mt-2">
                    {(() => {
                      const selectedIndex = matches.findIndex(m => m.id === selectedMatch.id);
                      const avatarGradients = [
                        'from-blue-400 via-cyan-400 to-teal-500',
                        'from-purple-400 via-pink-400 to-rose-500',
                        'from-emerald-400 via-green-400 to-teal-500',
                        'from-orange-400 via-amber-400 to-yellow-500',
                        'from-indigo-400 via-purple-400 to-pink-500',
                        'from-red-400 via-rose-400 to-pink-500',
                        'from-violet-400 via-purple-400 to-indigo-500',
                        'from-lime-400 via-green-400 to-emerald-500',
                        'from-sky-400 via-blue-400 to-cyan-500',
                        'from-fuchsia-400 via-pink-400 to-purple-500',
                        'from-amber-400 via-orange-400 to-red-500',
                        'from-cyan-400 via-teal-400 to-green-500'
                      ];
                      const gradientIndex = selectedIndex >= 0 ? selectedIndex % avatarGradients.length : 0;
                      return (
                        <AvatarWithHover 
                          letter={selectedMatch.name.charAt(0).toUpperCase()}
                          gradientClass={avatarGradients[gradientIndex]}
                          isSelected={true}
                        />
                      );
                    })()}
                  </div>
                  {selectedMatch.location && selectedMatch.location.trim() !== '' && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <MapPin className="w-4 h-4" style={{
                        color: (() => {
                          const selectedIndex = matches.findIndex(m => m.id === selectedMatch.id);
                          const avatarGradients = [
                            '#60a5fa', '#a855f7', '#10b981', '#fb923c', '#6366f1', '#ef4444', '#8b5cf6', '#84cc16', '#0ea5e9', '#d946ef', '#f59e0b', '#06b6d4'
                          ];
                          const gradientIndex = selectedIndex >= 0 ? selectedIndex % avatarGradients.length : 0;
                          return avatarGradients[gradientIndex];
                        })()
                      }} />
                      <span className="font-medium">{selectedMatch.location}</span>
                    </div>
                  )}
                </div>
                {/* Change button - now toggles options */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPenPalOptions(!showPenPalOptions);
                  }}
                  variant="outline"
                  size="sm"
                  className="bg-white/80 hover:bg-amber-50 border-amber-200 text-amber-700 hover:text-amber-800 transition-colors font-medium"
                  aria-label={showPenPalOptions ? "Close pen pal selection" : "Choose a different pen pal"}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {showPenPalOptions ? 'Close Selection' : 'Choose Penpal'}
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPenPalOptions(true);
                  }}
                  className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white shadow-lg"
                  aria-label="Select a pen pal to write to"
                >
                  <UserRound className="w-4 h-4 mr-2" />
                  Select a Pen Pal
                </Button>
              </div>
            )}

            {/* Expandable Pen Pal Selection */}
            <AnimatePresence initial={false}>
              {showPenPalOptions && (
                <motion.div
                  key="content"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: "auto" },
                    collapsed: { opacity: 0, height: 0 }
                  }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div 
                    className="bg-gradient-to-br from-slate-50/80 to-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 shadow-lg mt-4"
                    onMouseEnter={() => setIsHoveringPenPalOptions(true)}
                    onMouseLeave={() => setIsHoveringPenPalOptions(false)}
                  >
                  {/* Search */}
                  <div className="relative mb-3">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="w-4 h-4 text-amber-500" />
                    </div>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Search by name or location..."
                      className="w-full pl-10 pr-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring focus:ring-amber-100 text-sm"
                      aria-label="Search pen pals by name or location"
                    />
                  </div>

                  {/* Pen pal grid */}
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {filteredMatches.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div className="text-sm text-slate-500 mb-1">No pen pals found</div>
                        <div className="text-xs text-slate-400">Try adjusting your search terms</div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2.5">
                        {filteredMatches.map((match, index) => (
                          <motion.div
                            key={match.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.3,
                              ease: "easeOut",
                              delay: index * 0.05
                            }}
                          >
                            <div
                              onClick={() => {
                                onChangeRecipient?.(match.id);
                                setShowPenPalOptions(false);
                                setSearch("");
                              }}
                              className="group relative bg-white rounded-lg p-3 border border-slate-200 hover:border-amber-300 hover:shadow-md cursor-pointer transition-all duration-300 active:scale-[0.98]"
                              aria-label={`Select ${match.name} as pen pal`}
                            >
                              {/* Selected indicator */}
                              {selectedMatch?.id === match.id && (() => {
                                const selectedGradients = [
                                  'bg-blue-500',
                                  'bg-purple-500',
                                  'bg-emerald-500',
                                  'bg-orange-500',
                                  'bg-indigo-500',
                                  'bg-red-500',
                                  'bg-violet-500',
                                  'bg-lime-500',
                                  'bg-sky-500',
                                  'bg-fuchsia-500',
                                  'bg-amber-500',
                                  'bg-cyan-500'
                                ];
                                const selectedIndex = index % selectedGradients.length;
                                return <SelectedIndicator colorClass={selectedGradients[selectedIndex]} />;
                              })()}

                              <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative">
                                  {(() => {
                                    const avatarGradients = [
                                      'from-blue-400 via-cyan-400 to-teal-500',
                                      'from-purple-400 via-pink-400 to-rose-500',
                                      'from-emerald-400 via-green-400 to-teal-500',
                                      'from-orange-400 via-amber-400 to-yellow-500',
                                      'from-indigo-400 via-purple-400 to-pink-500',
                                      'from-red-400 via-rose-400 to-pink-500',
                                      'from-violet-400 via-purple-400 to-indigo-500',
                                      'from-lime-400 via-green-400 to-emerald-500',
                                      'from-sky-400 via-blue-400 to-cyan-500',
                                      'from-fuchsia-400 via-pink-400 to-purple-500',
                                      'from-amber-400 via-orange-400 to-red-500',
                                      'from-cyan-400 via-teal-400 to-green-500'
                                    ];
                                    const gradientIndex = index % avatarGradients.length;
                                    return (
                                      <AvatarWithHover 
                                        letter={match.name.charAt(0).toUpperCase()}
                                        gradientClass={avatarGradients[gradientIndex]}
                                        isSelected={selectedMatch?.id === match.id}
                                      />
                                    );
                                  })()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <h6 className="font-semibold text-slate-800 truncate group-hover:text-amber-700 transition-colors text-sm">
                                      {match.name}
                                    </h6>
                                    {match.since && (
                                      <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                        {formatSince(match.since)}
                                      </span>
                                    )}
                                  </div>
                                  {match.location && match.location.trim() !== '' && (
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 flex-shrink-0" style={{
                                        color: (() => {
                                          const avatarGradients = [
                                            '#60a5fa', '#a855f7', '#10b981', '#fb923c', '#6366f1', '#ef4444', '#8b5cf6', '#84cc16', '#0ea5e9', '#d946ef', '#f59e0b', '#06b6d4'
                                          ];
                                          const gradientIndex = index % avatarGradients.length;
                                          return avatarGradients[gradientIndex];
                                        })()
                                      }} />
                                      <span className="text-xs text-slate-600 truncate">{match.location}</span>
                                    </div>
                                  )}
                                  {/* Interests removed from pen pal selection - only shown in shared interests section */}
                                  {/* {match.interests && match.interests.length > 0 && (
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <div className="flex gap-1">
                                        {match.interests.slice(0, 2).map((interest, i) => (
                                          <span key={i} className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                                            {interest}
                                          </span>
                                        ))}
                                        {match.interests.length > 2 && (
                                          <span className="text-xs text-slate-500">+{match.interests.length - 2}</span>
                                        )}
                                      </div>
                                    </div>
                                  )} */}
                                </div>

                                {/* Arrow */}
                                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
            </div>
            </div>
          </motion.div>
          </div>

          {/* Subtle Section Divider */}
          <div className="relative h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent blur-sm"></div>
          </div>

          {/* Shared Interests Section */}
          <div className="relative mb-6 group/section">
            <div className="absolute inset-[-12px] bg-gradient-to-br from-amber-400/30 via-orange-400/20 to-rose-400/30 rounded-[2.5rem] blur-xl opacity-70 group-hover/section:opacity-95 transition-all duration-500 animate-pulse-slow pointer-events-none"></div>
            <div className="absolute inset-[-6px] bg-gradient-to-br from-amber-300/20 via-orange-300/15 to-rose-300/20 rounded-[2.25rem] blur-md opacity-80 group-hover/section:opacity-100 group-hover/section:inset-[-8px] transition-all duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-3xl opacity-0 animate-shimmer pointer-events-none"></div>
            <Card
              className="relative p-6 bg-gradient-to-br from-white via-orange-50/30 to-white shadow-2xl backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 ease-out transform hover:scale-[1.01] hover:-translate-y-0.5 animate-float-subtle animate-fade-in-up min-h-[150px] will-change-transform border border-slate-200/50 group-hover/section:border-amber-300/40 cursor-pointer"
              style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.98) 100%)'}}
              onClick={() => {
                // On mobile, keep sidebar open and show popup on top (like right sidebar statistics)
                setShowSharedInterestsPopup(true);
              }}
              aria-label="View shared interests with pen pal"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-rose-50/30 rounded-3xl opacity-80"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-rose-500/8 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-[0.03] rounded-3xl" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.4) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(244, 63, 94, 0.4) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
              <div className="absolute inset-0 rounded-3xl opacity-60 pointer-events-none" style={{background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, transparent 50%, rgba(244, 63, 94, 0.12) 100%)', mixBlendMode: 'overlay'}}></div>
              <div className="relative z-10">
                <h4 className="font-bold text-slate-800 mb-6 select-none text-sm tracking-wide uppercase text-center flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Shared Interests
                </h4>

                {/* Shared interests display */}
                {uniqueInterests.length > 0 ? (
                  <div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      {uniqueInterests.map((interest, idx) => {
                        const colors = [
                          'from-cyan-400 to-blue-500',
                          'from-pink-400 to-purple-500',
                          'from-green-400 to-emerald-500',
                          'from-yellow-400 to-orange-500',
                          'from-red-400 to-pink-500',
                          'from-indigo-400 to-purple-500',
                          'from-teal-400 to-cyan-500',
                          'from-orange-400 to-red-500'
                        ];
                        const colorClass = colors[idx % colors.length];
                        const IconComponent = getInterestIcon(interest);
                        return (
                          <Badge key={idx} className={`bg-gradient-to-r ${colorClass} text-white hover:scale-110 transition-all border-0 shadow-xl animate-pulse-slow px-4 py-2 text-sm font-medium flex items-center gap-2`}>
                            <IconComponent className="w-4 h-4" />
                            {interest}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <div className="text-sm text-gray-500 mb-1">No shared interests yet</div>
                    <div className="text-xs text-gray-400">Add interests to your profile to find common ground!</div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Subtle Section Divider */}
          <div className="relative h-px">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/50 to-transparent blur-sm"></div>
          </div>

          {/* Writing Prompts Section */}
          <div className="relative mb-6 group/section">
            <div className="absolute inset-[-12px] bg-gradient-to-br from-amber-400/30 via-orange-400/20 to-rose-400/30 rounded-[2.5rem] blur-xl opacity-70 group-hover/section:opacity-95 transition-all duration-500 animate-pulse-slow pointer-events-none"></div>
            <div className="absolute inset-[-6px] bg-gradient-to-br from-amber-300/20 via-orange-300/15 to-rose-300/20 rounded-[2.25rem] blur-md opacity-80 group-hover/section:opacity-100 group-hover/section:inset-[-8px] transition-all duration-500 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-3xl opacity-0 animate-shimmer pointer-events-none"></div>
            <Card className="relative p-6 bg-gradient-to-br from-white via-orange-50/30 to-white shadow-2xl backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 ease-out transform hover:scale-[1.01] hover:-translate-y-0.5 animate-float-subtle animate-fade-in-up min-h-[300px] will-change-transform border border-slate-200/50 group-hover/section:border-amber-300/40" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.98) 100%)'}}>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-orange-50/20 to-rose-50/30 rounded-3xl opacity-80"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/8 via-orange-500/5 to-rose-500/8 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
              <div className="absolute inset-0 opacity-[0.03] rounded-3xl" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.4) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(244, 63, 94, 0.4) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
              <div className="absolute inset-0 rounded-3xl opacity-60 pointer-events-none" style={{background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, transparent 50%, rgba(244, 63, 94, 0.12) 100%)', mixBlendMode: 'overlay'}}></div>
              <div className="relative z-10">
                <div className="cursor-pointer" onClick={() => {
                  if (hasSelectedWritingPromptsMode) {
                    // From content: go back to options
                    setHasSelectedWritingPromptsMode(false);
                    setShowWritingPromptsOptions(true);
                  } else if (showWritingPromptsOptions) {
                    // From options: do nothing (stay home)
                    // Options remain visible
                  } else {
                    // From title only: show options
                    setShowWritingPromptsOptions(true);
                  }
                }} aria-label="Toggle writing prompts options">
                  <h4 className="font-bold text-slate-800 mb-6 select-none text-sm tracking-wide uppercase text-center flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Writing Prompts
                  </h4>
                </div>

                {/* Expandable Writing Prompts Options */}
                <AnimatePresence>
                  {showWritingPromptsOptions && (
                    <motion.div
                      key="writing-prompts-options"
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={{
                        open: {
                          opacity: 1,
                          height: "auto",
                          scale: 1,
                          y: 0
                        },
                        collapsed: {
                          opacity: 0,
                          height: 0,
                          scale: 0.95,
                          y: -10
                        }
                      }}
                      transition={{
                        duration: 0.5,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                      className="overflow-hidden"
                    >
                      <motion.div
                        className="bg-gradient-to-br from-slate-50/80 to-white/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-200/60 shadow-lg mb-4"
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{
                          delay: 0.1,
                          duration: 0.4,
                          ease: [0.25, 0.46, 0.45, 0.94]
                        }}
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <motion.button
                            initial={{
                              opacity: 0,
                              scale: 0.8,
                              y: 20,
                              rotate: -5
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              y: 0,
                              rotate: 0
                            }}
                            whileHover={{
                              scale: 1.05,
                              y: -2,
                              transition: {
                                type: "spring",
                                stiffness: 400,
                                damping: 25
                              }
                            }}
                            whileTap={{
                              scale: 0.95,
                              transition: { duration: 0.1 }
                            }}
                            transition={{
                              duration: 0.6,
                              delay: 0.2,
                              ease: [0.25, 0.46, 0.45, 0.94],
                              type: "spring",
                              stiffness: 200,
                              damping: 20
                            }}
                            onClick={() => {
                              setWritingPromptsMode('premade');
                              setShowWritingPromptsOptions(false);
                              setHasSelectedWritingPromptsMode(true);
                            }}
                            className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                              writingPromptsMode === 'premade'
                                ? 'border-amber-400 bg-amber-50 shadow-lg'
                                : 'border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50'
                            }`}
                            aria-label="Select premade writing templates"
                          >
                            <motion.div
                              className="flex flex-col items-center gap-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4, duration: 0.3 }}
                            >
                              <motion.div
                                whileHover={{ rotate: 10, scale: 1.1 }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                <Book className="w-6 h-6 text-amber-600" />
                              </motion.div>
                              <span className="text-sm font-medium text-slate-700">Premade</span>
                              <span className="text-xs text-slate-500 text-center">Curated templates</span>
                            </motion.div>
                          </motion.button>

                          <motion.button
                            initial={{
                              opacity: 0,
                              scale: 0.8,
                              y: 20,
                              rotate: 5
                            }}
                            animate={{
                              opacity: 1,
                              scale: 1,
                              y: 0,
                              rotate: 0
                            }}
                            whileHover={{
                              scale: 1.05,
                              y: -2,
                              transition: {
                                type: "spring",
                                stiffness: 400,
                                damping: 25
                              }
                            }}
                            whileTap={{
                              scale: 0.95,
                              transition: { duration: 0.1 }
                            }}
                            transition={{
                              duration: 0.6,
                              delay: 0.3,
                              ease: [0.25, 0.46, 0.45, 0.94],
                              type: "spring",
                              stiffness: 200,
                              damping: 20
                            }}
                            onClick={() => {
                              setWritingPromptsMode('ai-assisted');
                              setShowWritingPromptsOptions(false);
                              setHasSelectedWritingPromptsMode(true);
                              // Assume connected - handle errors during generation
                              setAiConnectionStatus('connected');
                            }}
                            className={`p-3 rounded-xl border-2 transition-all duration-300 ${
                              writingPromptsMode === 'ai-assisted'
                                ? 'border-purple-400 bg-purple-50 shadow-lg'
                                : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/50'
                            }`}
                            aria-label="Select AI assisted writing templates"
                          >
                            <motion.div
                              className="flex flex-col items-center gap-2"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.5, duration: 0.3 }}
                            >
                              <motion.div
                                whileHover={{
                                  rotate: -10,
                                  scale: 1.1
                                }}
                                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                              >
                                <Sparkles className="w-6 h-6 text-purple-600" />
                              </motion.div>
                              <span className="text-sm font-medium text-slate-700">AI Assisted</span>
                              <span className="text-xs text-slate-500 text-center">Your Companion</span>
                            </motion.div>
                          </motion.button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Current Mode Indicator and Content - Only show when mode is selected */}
                <AnimatePresence mode="wait">
                  {hasSelectedWritingPromptsMode && (
                    <motion.div
                      key="mode-content"
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{
                        duration: 0.5,
                        ease: [0.25, 0.46, 0.45, 0.94],
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    >
                      {/* Current Mode Indicator */}
                      <motion.div
                        className="flex justify-center mb-4"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          delay: 0.2,
                          duration: 0.4,
                          type: "spring",
                          stiffness: 400,
                          damping: 25
                        }}
                      >
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          writingPromptsMode === 'premade'
                            ? 'bg-amber-100 text-amber-700'
                            : aiConnectionStatus === 'connected'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {writingPromptsMode === 'premade' ? (
                            <>
                              <Book className="w-3 h-3 inline mr-1" />
                              Premade Templates
                            </>
                          ) : aiConnectionStatus === 'connected' ? (
                            <>
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              AI Assisted
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 inline mr-1" />
                              Coming Soon
                            </>
                          )}
                        </div>
                      </motion.div>

                      {/* Templates Content - Only show for Premade mode */}
                      {writingPromptsMode === 'premade' && (
                        <motion.div
                          initial={{ opacity: 0, y: 30, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.5,
                            delay: 0.1,
                            ease: [0.25, 0.46, 0.45, 0.94],
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                          className="mt-3"
                        >
                          <motion.div
                            className="mb-3"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3, duration: 0.4 }}
                          >
                            <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="w-4 h-4 text-amber-500" />
                              </div>
                              <input
                                type="text"
                                value={templatesSearch}
                                onChange={e => setTemplatesSearch(e.target.value)}
                                placeholder="Search templates..."
                                className="w-full pl-10 pr-3 py-2 border border-amber-200 rounded focus:outline-none focus:ring focus:ring-amber-100 text-sm"
                                aria-label="Search writing templates"
                              />
                            </div>
                          </motion.div>
                          <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            {filteredTemplates.map((t, index) => (
                              <motion.div
                                key={t.id}
                                initial={{
                                  opacity: 0,
                                  scale: 0.9,
                                  y: 30,
                                  rotateX: -15
                                }}
                                animate={{
                                  opacity: 1,
                                  scale: 1,
                                  y: 0,
                                  rotateX: 0
                                }}
                                transition={{
                                  duration: 0.6,
                                  ease: [0.25, 0.46, 0.45, 0.94],
                                  delay: 0.2 + index * 0.08,
                                  type: "spring",
                                  stiffness: 200,
                                  damping: 20
                                }}
                                whileHover={{
                                  scale: 1.02,
                                  y: -2,
                                  transition: {
                                    type: "spring",
                                    stiffness: 400,
                                    damping: 25
                                  }
                                }}
                              >
                                <Card className="p-3 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer hover:scale-[1.02] transition-transform duration-200" onClick={() => onApplyTemplate?.(t.id)} aria-label={`Apply ${t.name} template`}>
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <h4 className="font-medium text-gray-800">{t.name}</h4>
                                      <div className="text-xs text-amber-600 font-medium">{t.estimated_minutes ? `${t.estimated_minutes} min` : null}</div>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2 line-clamp-3">{t.description}</p>
                                  </div>
                                  <div className="mt-3 flex gap-2">
                                    {t.tags && t.tags.slice(0,2).map((tag, i) => (
                                      <Badge key={i} className="bg-amber-100 text-amber-700 text-xs">{tag}</Badge>
                                    ))}
                                  </div>
                                </Card>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {/* AI Assisted Content */}
                      {writingPromptsMode === 'ai-assisted' && (
                        <motion.div
                          initial={{ opacity: 0, y: 30, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{
                            duration: 0.5,
                            delay: 0.1,
                            ease: [0.25, 0.46, 0.45, 0.94],
                            type: "spring",
                            stiffness: 300,
                            damping: 30
                          }}
                          className="mt-3"
                        >
                          {aiConnectionStatus === 'checking' && (
                            <motion.div
                              className="text-center py-8"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4, duration: 0.4 }}
                            >
                              <motion.div
                                className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  delay: 0.3,
                                  duration: 0.6,
                                  type: "spring",
                                  stiffness: 200,
                                  damping: 20
                                }}
                              >
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                              </motion.div>
                              <motion.h4
                                className="text-lg font-semibold text-slate-700 mb-2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                              >
                                Checking AI Connection
                              </motion.h4>
                              <motion.p
                                className="text-sm text-slate-500"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.4 }}
                              >
                                Please wait while we connect to the AI service...
                              </motion.p>
                            </motion.div>
                          )}

                          {aiConnectionStatus === 'error' && (
                            <motion.div
                              className="text-center py-8"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.4, duration: 0.4 }}
                            >
                              <motion.div
                                className="w-16 h-16 bg-gradient-to-br from-gray-100 to-slate-100 rounded-full flex items-center justify-center mx-auto mb-4"
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  delay: 0.3,
                                  duration: 0.6,
                                  type: "spring",
                                  stiffness: 200,
                                  damping: 20
                                }}
                              >
                                <Sparkles className="w-8 h-8 text-gray-400" />
                              </motion.div>
                              <motion.h4
                                className="text-lg font-semibold text-slate-700 mb-2"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.4 }}
                              >
                                AI Assisted Coming Soon
                              </motion.h4>
                              <motion.p
                                className="text-sm text-slate-500 mb-4"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6, duration: 0.4 }}
                              >
                                We&apos;re working on bringing you AI-powered writing assistance. Check back soon!
                              </motion.p>
                              <Button
                                onClick={() => {
                                  setAiConnectionStatus('connected');
                                  setAiPrompt(""); // Clear any previous prompt
                                  setGeneratedTemplates([]); // Clear previous results
                                }}
                                variant="outline"
                                className="bg-white hover:bg-purple-50 border-purple-200 text-purple-700 hover:text-purple-800"
                                aria-label="Retry AI connection"
                              >
                                Try Again
                              </Button>
                            </motion.div>
                          )}

                          {aiConnectionStatus === 'connected' && (
                            <>
                              {/* AI Prompt Input */}
                              <motion.div
                                className="mb-4"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3, duration: 0.4 }}
                              >
                                <div className="relative">
                                  <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Describe the type of conversation starter you want (e.g., 'something about travel experiences', 'questions about hobbies', 'cultural exchange topics')..."
                                    className="w-full p-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 text-sm resize-none"
                                    rows={3}
                                    maxLength={200}
                                    aria-label="Describe the type of writing template you want to generate"
                                  />
                                  <div className="absolute bottom-2 right-2 text-xs text-slate-400">
                                    {aiPrompt.length}/200
                                  </div>
                                </div>
                                <Button
                                  onClick={generateAiTemplate}
                                  disabled={!aiPrompt.trim() || isGenerating}
                                  className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-50"
                                  aria-label="Generate AI writing template"
                                >
                                  {isGenerating ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Generating...
                                    </>
                                  ) : (
                                    <>
                                      <Wand2 className="w-4 h-4 mr-2" />
                                      Generate Template
                                    </>
                                  )}
                                </Button>
                              </motion.div>

                              {/* Generated Templates */}
                              {generatedTemplates.length > 0 && (
                                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                  <motion.div
                                    className="flex items-center gap-2 mb-3 px-3 py-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200/50"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.2, duration: 0.3 }}
                                  >
                                    <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                      <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                    <h5 className="text-sm font-semibold text-slate-800 bg-gradient-to-r from-purple-700 to-pink-700 bg-clip-text text-transparent">
                                      Generated Templates
                                    </h5>
                                    <Badge className="bg-purple-100 text-purple-700 text-xs ml-auto">
                                      {generatedTemplates.length}
                                    </Badge>
                                  </motion.div>
                                  {generatedTemplates.map((template, index) => (
                                    <motion.div
                                      key={template.id}
                                      initial={{
                                        opacity: 0,
                                        scale: 0.9,
                                        y: 20,
                                        rotateX: -15
                                      }}
                                      animate={{
                                        opacity: 1,
                                        scale: 1,
                                        y: 0,
                                        rotateX: 0
                                      }}
                                      transition={{
                                        duration: 0.6,
                                        ease: [0.25, 0.46, 0.45, 0.94],
                                        delay: index * 0.1,
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 20
                                      }}
                                      whileHover={{
                                        scale: 1.02,
                                        y: -2,
                                        transition: {
                                          type: "spring",
                                          stiffness: 400,
                                          damping: 25
                                        }
                                      }}
                                    >
                                      <Card className="p-3 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer hover:scale-[1.02] transition-transform duration-200 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200" aria-label={`Apply generated template: ${template.name}`}>
                                        <div onClick={() => onApplyTemplate?.(template)}>
                                          <div className="flex items-center justify-between">
                                            <h4 className="font-medium text-gray-800">{template.name}</h4>
                                            <div className="flex items-center gap-2">
                                              <div className="text-xs text-purple-600 font-medium">{template.estimated_minutes ? `${template.estimated_minutes} min` : null}</div>
                                              <div className="flex gap-1">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  className={`p-1 h-6 w-6 ${isTemplateSaved(template.id) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'}`}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (isTemplateSaved(template.id)) {
                                                      removeTemplate(template.id);
                                                    } else {
                                                      saveTemplate(template);
                                                    }
                                                  }}
                                                  aria-label={isTemplateSaved(template.id) ? "Remove template from saved" : "Save template"}
                                                >
                                                  <Star className={`w-3 h-3 ${isTemplateSaved(template.id) ? 'fill-current' : ''}`} />
                                                </Button>
                                              </div>
                                            </div>
                                          </div>
                                          <p className="text-sm text-gray-600 mt-2 line-clamp-3">{template.description}</p>
                                        </div>
                                        <div className="mt-3 flex gap-2">
                                          {template.tags && template.tags.slice(0,2).map((tag, i) => (
                                            <Badge key={i} className="bg-purple-100 text-purple-700 text-xs">{tag}</Badge>
                                          ))}
                                        </div>
                                      </Card>
                                    </motion.div>
                                  ))}
                                </div>
                              )}

                              {/* Empty State */}
                              {generatedTemplates.length === 0 && !isGenerating && (
                                <motion.div
                                  className="text-center py-8"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ delay: 0.4, duration: 0.4 }}
                                >
                                  <motion.div
                                    className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4"
                                    initial={{ scale: 0, rotate: -180 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{
                                      delay: 0.3,
                                      duration: 0.6,
                                      type: "spring",
                                      stiffness: 200,
                                      damping: 20
                                    }}
                                    whileHover={{
                                      scale: 1.1,
                                      rotate: 10,
                                      transition: { type: "spring", stiffness: 400, damping: 25 }
                                    }}
                                  >
                                    <Sparkles className="w-8 h-8 text-purple-600" />
                                  </motion.div>
                                  <motion.h4
                                    className="text-lg font-semibold text-slate-700 mb-2"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5, duration: 0.4 }}
                                  >
                                    AI Writing Assistant
                                  </motion.h4>
                                  <motion.p
                                    className="text-sm text-slate-500 mb-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.6, duration: 0.4 }}
                                  >
                                    Describe what kind of conversation starter you want, and I&apos;ll generate a personalized template for you.
                                  </motion.p>
                                </motion.div>
                              )}
                            </>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </div>

          {/* Saved Templates Section */}
          {isHydrated && savedTemplates.length > 0 && (
            <div className="relative mb-6 group/section">
              <div className="absolute inset-[-12px] bg-gradient-to-br from-yellow-400/30 via-amber-400/20 to-orange-400/30 rounded-[2.5rem] blur-xl opacity-70 group-hover/section:opacity-95 transition-all duration-500 animate-pulse-slow pointer-events-none"></div>
              <div className="absolute inset-[-6px] bg-gradient-to-br from-yellow-300/20 via-amber-300/15 to-orange-300/20 rounded-[2.25rem] blur-md opacity-80 group-hover/section:opacity-100 group-hover/section:inset-[-8px] transition-all duration-500 pointer-events-none"></div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent rounded-3xl opacity-0 animate-shimmer pointer-events-none"></div>
              <Card className="relative p-6 bg-gradient-to-br from-white via-yellow-50/30 to-white shadow-2xl backdrop-blur-sm rounded-3xl overflow-hidden hover:shadow-3xl transition-all duration-500 ease-out transform hover:scale-[1.01] hover:-translate-y-0.5 animate-float-subtle animate-fade-in-up will-change-transform border border-slate-200/50 group-hover/section:border-yellow-300/40" style={{background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 50%, rgba(255,255,255,0.98) 100%)'}}>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/30 via-amber-50/20 to-orange-50/30 rounded-3xl opacity-80"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/8 via-amber-500/5 to-orange-500/8 rounded-3xl opacity-0 hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute inset-0 opacity-[0.03] rounded-3xl" style={{backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.4) 1px, transparent 1px), radial-gradient(circle at 75% 75%, rgba(244, 63, 94, 0.4) 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
                <div className="absolute inset-0 rounded-3xl opacity-60 pointer-events-none" style={{background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, transparent 50%, rgba(244, 63, 94, 0.12) 100%)', mixBlendMode: 'overlay'}}></div>
                <div className="relative z-10">
                  <h4 className="font-bold text-slate-800 mb-6 select-none text-sm tracking-wide uppercase text-center flex items-center justify-center gap-2">
                    <Star className="w-4 h-4 text-slate-600" />
                    Saved Templates
                  </h4>

                  <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                    {savedTemplates.map((template, index) => (
                      <motion.div
                        key={template.id}
                        initial={{
                          opacity: 0,
                          scale: 0.9,
                          y: 20,
                          rotateX: -15
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                          rotateX: 0
                        }}
                        transition={{
                          duration: 0.6,
                          ease: [0.25, 0.46, 0.45, 0.94],
                          delay: index * 0.1,
                          type: "spring",
                          stiffness: 200,
                          damping: 20
                        }}
                        whileHover={{
                          scale: 1.02,
                          y: -2,
                          transition: {
                            type: "spring",
                            stiffness: 400,
                            damping: 25
                          }
                        }}
                      >
                        <Card className="p-3 flex flex-col justify-between hover:shadow-lg transition-shadow cursor-pointer hover:scale-[1.02] transition-transform duration-200 bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200" aria-label={`Apply saved template: ${template.name}`}>
                          <div onClick={() => onApplyTemplate?.(template)}>
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-800">{template.name}</h4>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-yellow-600 font-medium">{template.estimated_minutes ? `${template.estimated_minutes} min` : null}</div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="p-1 h-6 w-6 text-red-400 hover:text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeTemplate(template.id);
                                    }}
                                    aria-label="Remove template from saved"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 line-clamp-3">{template.description}</p>
                          </div>
                          <div className="mt-3 flex gap-2">
                            {template.tags && template.tags.slice(0,2).map((tag, i) => (
                              <Badge key={i} className="bg-yellow-100 text-yellow-700 text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Shared Interests Info Dialog */}
      <Dialog open={showSharedInterestsPopup} onOpenChange={setShowSharedInterestsPopup}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-white to-slate-50 border-0 shadow-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-800 font-semibold">
              <Heart className="w-5 h-5 text-amber-500" />
              Shared Interests
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-amber-600" />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Discover Common Ground</h4>
              <p className="text-slate-600 leading-relaxed">
                Your interests + your pen pal&apos;s interests = perfect conversation starters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="text-center p-3 bg-blue-50 rounded-xl">
                <UserRound className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-slate-700">Smart Matching</div>
                <div className="text-xs text-slate-500 mt-1">Combines interests automatically</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <Palette className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <div className="text-sm font-medium text-slate-700">Relevant Icons</div>
                <div className="text-xs text-slate-500 mt-1">Visual interest recognition</div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mt-4">
              <div className="text-sm font-medium text-slate-700 mb-2">💡 Pro Tip</div>
              <p className="text-xs text-slate-600">
                Use shared interests to ask meaningful questions and build deeper connections with your pen pal.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
              duration: 0.3
            }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className={`max-w-sm p-4 rounded-2xl shadow-2xl backdrop-blur-sm border ${
              toast.type === 'error'
                ? 'bg-red-50 border-red-200 text-red-800'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  toast.type === 'error'
                    ? 'bg-red-100'
                    : toast.type === 'warning'
                    ? 'bg-amber-100'
                    : 'bg-green-100'
                }`}>
                  {toast.type === 'error' ? (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : toast.type === 'warning' ? (
                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
                </div>
                <button
                  onClick={() => setToast(null)}
                  className={`p-1 rounded-full hover:bg-black/5 transition-colors ${
                    toast.type === 'error'
                      ? 'hover:bg-red-100'
                      : toast.type === 'warning'
                      ? 'hover:bg-amber-100'
                      : 'hover:bg-green-100'
                  }`}
                  aria-label="Close notification"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
