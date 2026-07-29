'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

const COMMON_TAGS = [
  'AI', 'Web3', 'Mobile', 'Cloud', 'HealthTech', 'FinTech', 'GovTech',
  'Open Source', 'ML', 'Blockchain', 'AR/VR', 'IoT', 'Cybersecurity',
  'Gaming', 'Social Impact', 'No-Code', 'Data Science', 'DevTools'
];

export default function QuickAddPage() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [addedHackathonId, setAddedHackathonId] = useState('');

  const [title, setTitle] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [imageError, setImageError] = useState(false);
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [locationCity, setLocationCity] = useState('');
  const [locationCollege, setLocationCollege] = useState('');
  const [prizePool, setPrizePool] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [registerUrl, setRegisterUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const formRef = useRef<HTMLFormElement>(null);
  
  // Field errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Intentionally empty or handle differently
  }, [coverImageUrl]);

  // Handle Ctrl+Enter submit
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!success && !loading) {
          formRef.current?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [success, loading]);

  const resetForm = () => {
    setTitle('');
    setSourceUrl('');
    setCoverImageUrl('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setRegistrationDeadline('');
    setMode('online');
    setLocationCity('');
    setLocationCollege('');
    setPrizePool('');
    setOrganizer('');
    setRegisterUrl('');
    setTags([]);
    setError('');
    setFieldErrors({});
    setSuccess(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required';
    else if (title.length < 3) errors.title = 'Title must be at least 3 characters';
    
    if (!registerUrl) errors.registerUrl = 'Register URL is required';
    else {
      try { new URL(registerUrl); } catch { errors.registerUrl = 'Must be a valid URL'; }
    }

    if (sourceUrl) {
      try { new URL(sourceUrl); } catch { errors.sourceUrl = 'Must be a valid URL'; }
    }

    if (coverImageUrl) {
      try { new URL(coverImageUrl); } catch { errors.coverImageUrl = 'Must be a valid URL'; }
    }

    if (!description) errors.description = 'Description is required';
    else if (description.length < 10) errors.description = 'Description must be at least 10 characters';

    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
      errors.endDate = 'End date must be after start date';
    }

    if (registrationDeadline && startDate && new Date(registrationDeadline) > new Date(startDate)) {
      errors.registrationDeadline = 'Deadline must be before start date';
    }

    if ((mode === 'offline' || mode === 'hybrid') && !locationCity) {
      errors.locationCity = 'City is required for Offline/Hybrid mode';
    }

    if (tags.length === 0) {
      errors.tags = 'Please select at least 1 tag';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      // Focus first errored field (simplified)
      const firstErrorKey = Object.keys(fieldErrors)[0];
      const el = document.getElementsByName(firstErrorKey)[0] as HTMLElement;
      if (el) el.focus();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        title,
        sourceUrl,
        coverImageUrl,
        description,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        registrationDeadline: registrationDeadline ? new Date(registrationDeadline).toISOString() : undefined,
        mode,
        locationCity,
        locationCollege,
        prizePool,
        registerUrl,
        tags,
        organizer
      };

      const res = await fetch('/api/v1/admin/quick-add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        setAddedHackathonId(data.data?.hackathon?.id || data.hackathon?.id || '');
        setSuccess(true);
        // Auto reset after 3s if not clicked
        setTimeout(() => {
          setSuccess(prev => {
            if (prev) {
              resetForm();
            }
            return false;
          });
        }, 3000);
      } else {
        setError(`Error: ${data.error?.message || 'Failed to add hackathon'}`);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(`Error: ${err.message || 'An error occurred'}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter(t => t !== tag));
    } else if (tags.length < 5) {
      setTags([...tags, tag]);
    }
  };

  const handleModeChange = (newMode: 'online' | 'offline' | 'hybrid') => {
    setMode(newMode);
    if (newMode === 'online') {
      setLocationCity('');
      setLocationCollege('');
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          <h1 className="text-3xl font-bold text-white">Quick Add Hackathon</h1>
        </div>
        <p className="text-slate-400 mb-4">Rapidly import hackathons from external sources. All entries are auto-approved.</p>
        
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-yellow-300 text-sm">
          💡 Tip: Open Devfolio, Unstop, or Devpost in another tab. Copy details across in under 60 seconds per hackathon.
        </div>
      </div>

      {success ? (
        <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-8 text-center animate-in fade-in duration-300">
          <CheckCircle className="w-16 h-16 text-green-400 animate-bounce mx-auto mb-4" />
          <h2 className="text-green-400 text-2xl font-bold mb-2">Hackathon Added!</h2>
          <p className="text-white text-lg font-medium mb-8">{title}</p>
          
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={resetForm}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors"
            >
              Add Another
            </button>
            {addedHackathonId && (
              <a
                href={`/hackathons/${addedHackathonId}`}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                View on Site
              </a>
            )}
          </div>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1 - Event Details */}
            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Event Details</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Title<span className="text-purple-400">*</span>
                  </label>
                  <input
                    name="title"
                    type="text"
                    maxLength={100}
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. HackMumbai 2026"
                    className={`bg-slate-950 border ${fieldErrors.title ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600`}
                  />
                  {fieldErrors.title && <p className="text-red-400 text-xs mt-1">{fieldErrors.title}</p>}
                  <p className="text-slate-500 text-xs text-right mt-1">{title.length} / 100</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">Source URL</label>
                    <input
                      name="sourceUrl"
                      type="url"
                      value={sourceUrl}
                      onChange={e => setSourceUrl(e.target.value)}
                      placeholder="https://devfolio.co/hackathons/..."
                      className={`bg-slate-950 border ${fieldErrors.sourceUrl ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600`}
                    />
                    <p className="text-slate-500 text-xs mt-1">Reference link — not shown to users</p>
                    {fieldErrors.sourceUrl && <p className="text-red-400 text-xs mt-1">{fieldErrors.sourceUrl}</p>}
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">
                      Register URL<span className="text-purple-400">*</span>
                    </label>
                    <input
                      name="registerUrl"
                      type="url"
                      value={registerUrl}
                      onChange={e => setRegisterUrl(e.target.value)}
                      placeholder="https://..."
                      className={`bg-slate-950 border ${fieldErrors.registerUrl ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600`}
                    />
                    <p className="text-slate-500 text-xs mt-1">The actual link users click to register</p>
                    {fieldErrors.registerUrl && <p className="text-red-400 text-xs mt-1">{fieldErrors.registerUrl}</p>}
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Description<span className="text-purple-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    maxLength={500}
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief description of the hackathon... What will participants build? Who is it for?"
                    className={`bg-slate-950 border ${fieldErrors.description ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600 resize-y`}
                  />
                  {fieldErrors.description && <p className="text-red-400 text-xs mt-1">{fieldErrors.description}</p>}
                  <p className="text-slate-500 text-xs text-right mt-1">{description.length} / 500</p>
                </div>

                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">Cover Image URL</label>
                  <input
                    name="coverImageUrl"
                    type="url"
                    value={coverImageUrl}
                    onChange={e => {
                      setCoverImageUrl(e.target.value);
                      setImageError(false);
                    }}
                    placeholder="https://..."
                    className={`bg-slate-950 border ${fieldErrors.coverImageUrl ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600`}
                  />
                  {fieldErrors.coverImageUrl && <p className="text-red-400 text-xs mt-1">{fieldErrors.coverImageUrl}</p>}
                  {coverImageUrl && !imageError && !fieldErrors.coverImageUrl && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={coverImageUrl} 
                        alt="Preview" 
                        onError={() => setImageError(true)}
                        className="w-[120px] h-[60px] object-cover rounded-lg border border-purple-900/30"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">Prize Pool</label>
                    <input
                      name="prizePool"
                      type="text"
                      value={prizePool}
                      onChange={e => setPrizePool(e.target.value)}
                      placeholder="e.g. ₹1,00,000 or $65,000"
                      className="bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">Organizer Name</label>
                    <input
                      name="organizer"
                      type="text"
                      value={organizer}
                      onChange={e => setOrganizer(e.target.value)}
                      placeholder="e.g. IIT Bombay Tech Club"
                      className="bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2 - Dates */}
            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Dates</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    Start Date<span className="text-purple-400">*</span>
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className={`bg-slate-950 border ${fieldErrors.startDate ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                  {fieldErrors.startDate && <p className="text-red-400 text-xs mt-1">{fieldErrors.startDate}</p>}
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">
                    End Date<span className="text-purple-400">*</span>
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className={`bg-slate-950 border ${fieldErrors.endDate ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                  {fieldErrors.endDate && <p className="text-red-400 text-xs mt-1">{fieldErrors.endDate}</p>}
                </div>
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-2 block">Registration Deadline</label>
                  <input
                    name="registrationDeadline"
                    type="date"
                    value={registrationDeadline}
                    onChange={e => setRegistrationDeadline(e.target.value)}
                    className={`bg-slate-950 border ${fieldErrors.registrationDeadline ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent`}
                  />
                  {fieldErrors.registrationDeadline && <p className="text-red-400 text-xs mt-1">{fieldErrors.registrationDeadline}</p>}
                </div>
              </div>
            </div>

            {/* Section 3 - Location & Mode */}
            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Location & Mode</h2>
              <div className="mb-6">
                <div className="flex gap-2">
                  {(['online', 'offline', 'hybrid'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors capitalize ${
                        mode === m
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {(mode === 'offline' || mode === 'hybrid') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">
                      City<span className="text-purple-400">*</span>
                    </label>
                    <input
                      name="locationCity"
                      type="text"
                      value={locationCity}
                      onChange={e => setLocationCity(e.target.value)}
                      placeholder="e.g. Mumbai"
                      className={`bg-slate-950 border ${fieldErrors.locationCity ? 'border-red-500' : 'border-purple-900/40'} text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600`}
                    />
                    {fieldErrors.locationCity && <p className="text-red-400 text-xs mt-1">{fieldErrors.locationCity}</p>}
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium mb-2 block">College / Venue</label>
                    <input
                      name="locationCollege"
                      type="text"
                      value={locationCollege}
                      onChange={e => setLocationCollege(e.target.value)}
                      placeholder="e.g. IIT Bombay"
                      className="bg-slate-950 border border-purple-900/40 text-slate-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder:text-slate-600"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 4 - Tags */}
            <div className="bg-slate-900/60 border border-purple-900/30 rounded-2xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <label className="text-slate-300 text-sm font-medium">
                  Select Tags<span className="text-purple-400">*</span> (max 5)
                </label>
                <span className="text-slate-400 text-xs font-medium">{tags.length} / 5 selected</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_TAGS.map(tag => {
                  const isSelected = tags.includes(tag);
                  const maxReached = tags.length >= 5 && !isSelected;
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      disabled={maxReached}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        isSelected
                          ? 'bg-purple-600/20 text-purple-300 border-purple-500'
                          : maxReached
                            ? 'bg-slate-800 text-slate-400 border-slate-700 opacity-40 pointer-events-none'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-purple-500/50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              {tags.length >= 5 && (
                <p className="text-purple-400 text-xs mt-3">Max 5 tags selected</p>
              )}
              {fieldErrors.tags && <p className="text-red-400 text-xs mt-2">{fieldErrors.tags}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-4 text-lg font-semibold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" /> Adding...
                </>
              ) : (
                'Add Hackathon →'
              )}
            </button>
            <p className="text-slate-500 text-xs text-center mt-2">Tip: Press Ctrl+Enter to submit</p>
          </form>
        </>
      )}
    </div>
  );
}
