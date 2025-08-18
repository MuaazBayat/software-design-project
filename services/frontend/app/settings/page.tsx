'use client';

import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/nextjs'; // remove if you're not using Clerk
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

// ---- Types matching your API ----
type Profile = {
  anonymous_handle: string;
  bio: string | null;
  interests: string[] | null;
  // ...other fields exist but we don't need them on this page
};

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export default function SettingsPage() {
  const { user } = useUser(); // remove if not using Clerk
  const userId = user?.id || ''; // <-- your API expects user_id in path

  const API_BASE = "http://127.0.0.1:8000"
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const handleValid = HANDLE_RE.test(handle);

  // ---------- Load profile ----------
  useEffect(() => {
    if (!API_BASE || !userId) return;
    const ctrl = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/profiles/${userId}`, {
          method: 'GET',
          signal: ctrl.signal,
        });

        if (res.status === 404) {
          // No profile yet — leave fields empty, allow Save to create
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error(`GET failed: ${res.status}`);

        const data: Profile = await res.json();
        setHandle(data.anonymous_handle ?? '');
        setBio(data.bio ?? '');
        setInterests(Array.isArray(data.interests) ? data.interests : []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();

    return () => ctrl.abort();
  }, [API_BASE, userId]);

  // ---------- Interests (tags) helpers ----------
  function addTagFromInput() {
    const v = tagInput.trim();
    if (!v) return;
    if (!interests.includes(v)) setInterests((prev) => [...prev, v]);
    setTagInput('');
  }
  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTagFromInput();
    }
    if (e.key === 'Backspace' && tagInput === '' && interests.length > 0) {
      setInterests((prev) => prev.slice(0, -1));
    }
  }
  function removeTag(tag: string) {
    setInterests((prev) => prev.filter((t) => t !== tag));
  }

  // ---------- Save (PUT; if 404 then POST) ----------
  async function handleSave() {
    if (!API_BASE || !userId) return;
    const updatePayload = {
      anonymous_handle: handle || undefined,
      bio: bio || '',
      interests,
    };

    // Try UPDATE first
    const putRes = await fetch(`${API_BASE}/profiles/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload),
    });

    if (putRes.status === 404) {
      // Create if not exists — API requires clerk_id + anonymous_handle
      const createPayload = {
        clerk_id: userId,                // using Clerk user.id as your unique id
        anonymous_handle: handle || 'user_' + userId.slice(0, 6),
        bio: bio || '',
        interests,
      };
      const postRes = await fetch(`${API_BASE}/profiles/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createPayload),
      });
      if (!postRes.ok) {
        const t = await postRes.text();
        alert(`Create failed: ${postRes.status}\n${t}`);
        return;
      }
    } else if (!putRes.ok) {
      const t = await putRes.text();
      alert(`Update failed: ${putRes.status}\n${t}`);
      return;
    }

    alert('Saved!');
  }

  // ---------- Handle formatting ----------
  function onHandleChange(v: string) {
    const next = v.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    setHandle(next);
  }

  return (
    <main className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl border bg-background p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        {/* Handle */}
        <div className="mt-6 space-y-2 opacity-100">
          <Label htmlFor="handle" className="text-base">Handle</Label>
          <div className="relative max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="your_handle"
              className="pl-7"
              disabled={loading}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            3–20 characters; letters, numbers, underscores.
          </p>
          {!handleValid && handle.length > 0 && (
            <p className="text-sm text-destructive">Invalid handle format.</p>
          )}
        </div>

        <Separator className="my-8" />

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-base">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Write a short paragraph about yourself…"
            className="min-h-[120px]"
            disabled={loading}
          />
        </div>

        <Separator className="my-8" />

        {/* Interests / Hobbies */}
        <div className="space-y-3">
          <Label htmlFor="interestInput" className="text-base">
            Interests / hobbies
          </Label>

          {interests.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {interests.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 inline-flex rounded-full p-0.5 opacity-60 hover:opacity-100 focus:outline-none"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              id="interestInput"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Type an interest and press Enter"
              className="max-w-md"
              disabled={loading}
            />
            <Button type="button" variant="secondary" onClick={addTagFromInput} disabled={loading}>
              Add
            </Button>
          </div>
        </div>

        {/* Save */}
        <div className="mt-10 flex justify-end">
          <Button onClick={handleSave} disabled={loading || !handleValid}>
            {loading ? 'Loading…' : 'Save'}
          </Button>
        </div>
      </div>
    </main>
  );
}
