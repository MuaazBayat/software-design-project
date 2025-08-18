'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';

type Granularity = 'continent' | 'subregion' | 'country';

export default function SettingsPage() {
  const [penName, setPenName] = useState('');
  const [granularity, setGranularity] = useState<Granularity>('continent');
  const [choice, setChoice] = useState<string>('');

  const CONTINENTS = ['Africa', 'Asia', 'Europe'];
  const SUBREGIONS = ['Southern Africa', 'East Asia', 'Western Europe'];
  const COUNTRIES = ['South Africa', 'Japan', 'Germany'];

  const options =
    granularity === 'continent'
      ? CONTINENTS
      : granularity === 'subregion'
      ? SUBREGIONS
      : COUNTRIES;

  function handleSave() {
    // TODO: wire this to your API (e.g., POST /api/settings)
    console.log({ penName, granularity, choice });
    alert('Saved (demo): check console for payload.');
  }

  return (
    <main className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl rounded-xl border bg-background p-6 md:p-8">
        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

        {/* Top chips / placeholders */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="h-10 rounded-md bg-muted" />
          <div className="h-10 rounded-md bg-muted/80" />
          <div className="h-10 rounded-md bg-muted/60" />
        </div>

        {/* Pen name */}
        <div className="mt-8 space-y-2">
          <Label htmlFor="penName" className="text-base">Pen name</Label>
          <Input
            id="penName"
            placeholder="e.g., Luna"
            value={penName}
            onChange={(e) => setPenName(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Separator className="my-8" />

        {/* Region granularity */}
        <div className="space-y-4">
          <div className="text-base font-medium">Region granularity:</div>

          <RadioGroup
            value={granularity}
            onValueChange={(v) => {
              setGranularity(v as Granularity);
              setChoice(''); // reset when switching group
            }}
            className="flex flex-wrap items-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="g-continent" value="continent" />
              <Label htmlFor="g-continent">Continent</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="g-subregion" value="subregion" />
              <Label htmlFor="g-subregion">Sub-Region</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem id="g-country" value="country" />
              <Label htmlFor="g-country">Country</Label>
            </div>
          </RadioGroup>

          {/* Row of options, visually matching your mock's dot + text */}
          <RadioGroup
            value={choice}
            onValueChange={setChoice}
            className="mt-2 grid gap-x-10 gap-y-4 sm:grid-cols-3"
          >
            {options.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem id={`opt-${opt}`} value={opt} />
                <Label htmlFor={`opt-${opt}`} className="font-normal">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Save */}
        <div className="mt-10 flex justify-end">
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </main>
  );
}
