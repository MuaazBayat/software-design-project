'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('Environment variables loaded');
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-black text-white p-6">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Debug Page</h1>
        <p className="text-gray-400 mb-8">Environment variable testing</p>
        
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_SUPABASE_URL</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_SUPABASE_URL || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_SUPABASE_KEY</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_SUPABASE_KEY ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_SUPABASE_KEY || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_FRONTEND_URL</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_FRONTEND_URL ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_FRONTEND_URL || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_MATCHMAKING_URL</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_MATCHMAKING_URL ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_MATCHMAKING_URL || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_CORE_URL</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_CORE_URL ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_CORE_URL || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_MESSAGING_URL</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_MESSAGING_URL ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_MESSAGING_URL || 'undefined'}
            </div>
          </div>
          
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-300 font-medium">NEXT_PUBLIC_MODERATION_URL</span>
              <div className={`w-2 h-2 rounded-full ${process.env.NEXT_PUBLIC_MODERATION_URL ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
            <div className="font-mono text-sm bg-black rounded p-2 text-gray-300">
              {process.env.NEXT_PUBLIC_MODERATION_URL || 'undefined'}
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <div className="text-sm text-gray-400">
            NODE_ENV: <span className="font-mono text-gray-300">{process.env.NODE_ENV || 'development'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}