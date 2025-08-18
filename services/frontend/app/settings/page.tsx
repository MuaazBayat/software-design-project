'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

export default function SettingsPage() {
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [interests, setInterests] = useState<string[]>([]);

  // ---- Handle validation ----
  const HANDLE_RE = /^[a-z0-9_]{3,20}$/;
  const handleValid = HANDLE_RE.test(handle);

  function onHandleChange(v: string) {
    // lowercase, allow only a–z, 0–9, underscore; limit length
    const next = v.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
    setHandle(next);
  }

  // ---- Tags (interests) ----
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

  function handleSave() {
    // Wire up to your API later (e.g., POST /api/settings)
    console.log({ handle, bio, interests });
    alert('Saved (demo). Check console for payload.');
  }

  return (
    <main className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl border bg-background p-6 md:p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        {/* Handle */}
        <div className="mt-6 space-y-2">
          <Label htmlFor="handle" className="text-base">Handle</Label>
          <div className="relative max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => onHandleChange(e.target.value)}
              placeholder="your_handle"
              className="pl-7"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            3–20 characters; letters, numbers, and underscores only.
          </p>
          {!handleValid && handle.length > 0 && (
            <p className="text-sm text-destructive">
              Invalid handle format.
            </p>
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
          />
          <p className="text-sm text-muted-foreground">
            A short paragraph that appears on your profile.
          </p>
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
            />
            <Button type="button" variant="secondary" onClick={addTagFromInput}>
              Add
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Press <kbd className="rounded bg-muted px-1 text-xs">Enter</kbd> to add.
          </p>
        </div>

        {/* Save */}
        <div className="mt-10 flex justify-end">
          <Button onClick={handleSave} disabled={!handleValid}>
            Save
          </Button>
        </div>
      </div>
    </main>
  );
}
