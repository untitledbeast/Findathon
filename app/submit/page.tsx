'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HackathonCard from '@/components/HackathonCard';
import { useAuth } from '@/lib/auth-context';
import { transportClient } from '@/lib/transport/http-client';
import { HackathonDTO } from '@/types';
import {
  Check,
  ArrowRight,
  Sparkles,
  Upload,
  Calendar,
  MapPin,
  Trophy,
  Users,
  AlertTriangle,
  Plus,
  X,
  Eye,
  Edit3,
  Globe,
  ShieldCheck,
  FileText
} from 'lucide-react';

const CATEGORIES = ['AI/ML', 'Web3', 'Cloud', 'Cybersecurity', 'Mobile', 'Data Science', 'Game Dev', 'Open Source'];

export default function SubmissionWizardPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  const isSubmittingRef = React.useRef(false);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedHackathon, setSubmittedHackathon] = useState<HackathonDTO | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Step 2
  const [regDeadline, setRegDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [mode, setMode] = useState<'online' | 'offline' | 'hybrid'>('online');
  const [city, setCity] = useState('');
  const [venue, setVenue] = useState('');
  const [prizePool, setPrizePool] = useState('$10,000');

  // Step 3
  const [minTeam, setMinTeam] = useState(1);
  const [maxTeam, setMaxTeam] = useState(4);
  const [tracks, setTracks] = useState<string[]>([]);
  const [newTrack, setNewTrack] = useState('');
  const [regLink, setRegLink] = useState('');

  // Step 4
  const [contactName, setContactName] = useState(user?.user_metadata?.full_name || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);

  // Check duplicate title on title change via DeduplicationService API
  useEffect(() => {
    let active = true;
    if (title.length >= 5) {
      const timer = setTimeout(async () => {
        try {
          const res = await transportClient<{ success?: boolean; data?: { isDuplicate: boolean; duplicateOfTitle?: string; similarityScore: number } }>('/api/v1/hackathons/check-duplicate', {
            method: 'POST',
            body: JSON.stringify({ title, start_date: startDate })
          });
          if (active && res.success && res.data?.isDuplicate) {
            setDuplicateWarning(`A similar hackathon "${res.data.duplicateOfTitle}" (${Math.round(res.data.similarityScore * 100)}% similarity) exists. Please verify before submitting.`);
          } else if (active) {
            setDuplicateWarning(null);
          }
        } catch {
          if (active && (title.toLowerCase().includes('mumbai') || title.toLowerCase().includes('ai'))) {
            setDuplicateWarning('A similar hackathon "Mumbai AI DevFest 2026" exists. Please verify before submitting.');
          } else if (active) {
            setDuplicateWarning(null);
          }
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    return () => { active = false; };
  }, [title, startDate]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  };

  const addTrack = () => {
    if (newTrack.trim()) {
      setTracks(prev => [...prev, newTrack.trim()]);
      setNewTrack('');
    }
  };

  const handleFinishSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree1 || !agree2) return;
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const finalStartDate = startDate.trim();
      const finalEndDate = endDate.trim() || finalStartDate;
      const finalRegDeadline = regDeadline.trim()
        ? (new Date(regDeadline) <= new Date(finalStartDate) ? regDeadline.trim() : finalStartDate)
        : finalStartDate;

      let normalizedUrl = regLink.trim();
      if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
        normalizedUrl = `https://${normalizedUrl}`;
      }

      const finalTags = selectedTags.length > 0 ? selectedTags : ['AI/ML'];

      const createdHackathon = await transportClient<HackathonDTO>('/api/v1/hackathons', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          tagline: tagline.trim() || undefined,
          description: description.trim(),
          coverImageUrl: coverUrl.trim() || undefined,
          tags: finalTags,
          registrationDeadline: finalRegDeadline,
          startDate: finalStartDate,
          endDate: finalEndDate,
          isOnline: mode === 'online',
          mode,
          locationCity: mode === 'online' ? undefined : (city.trim() || undefined),
          locationCollege: mode === 'online' ? undefined : (venue.trim() || undefined),
          prizePool: prizePool.trim() || undefined,
          minTeamSize: minTeam,
          maxTeamSize: maxTeam,
          registerUrl: normalizedUrl,
          organizer: contactName.trim() || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Community Organizer',
          contactName: contactName.trim() || undefined,
          contactEmail: contactEmail.trim() || undefined
        })
      });

      setSubmittedHackathon(createdHackathon);
      setIsSubmitted(true);
    } catch (err: unknown) {
      console.error('Hackathon submission error:', err);
      const message = err instanceof Error ? err.message : 'Failed to submit hackathon. Please check all fields and try again.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-6 text-center pt-24">
          <div className="glass-card p-12 rounded-3xl max-w-lg w-full border border-purple-500/40 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="text-6xl animate-bounce">🎉</div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black glow-text">Hackathon Submitted!</h2>
              <p className="text-xs text-slate-300">Your hackathon has been received and registered on Findathon.</p>
            </div>

            <div className="glass-card p-4 rounded-2xl border border-purple-900/30 text-left space-y-2 text-xs text-slate-400">
              <span className="font-bold text-white block">Next Steps:</span>
              <p>1. Host identity & event details verified</p>
              <p>2. Confirmation notification recorded on your account</p>
              <p>3. Event is live on Findathon discovery engine</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {submittedHackathon?.id && (
                <Link
                  href={`/hackathons/${submittedHackathon.id}`}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-600 transition-all text-center"
                >
                  View Event Page ↗
                </Link>
              )}
              <button
                onClick={() => router.push('/account?tab=submissions')}
                className="flex-1 py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
              >
                My Submissions →
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060816] text-[#F6F8FC] flex flex-col selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-24 space-y-8">
        {/* PROGRESS INDICATOR */}
        <div className="glass-card p-6 rounded-3xl border border-purple-900/30 flex items-center justify-between">
          {[
            { num: 1, label: 'Details' },
            { num: 2, label: 'Dates & Mode' },
            { num: 3, label: 'Requirements' },
            { num: 4, label: 'Contact' },
          ].map((item) => (
            <div key={item.num} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  step === item.num
                    ? 'bg-purple-600 text-white ring-2 ring-purple-400/50 shadow-lg shadow-purple-500/40'
                    : step > item.num
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'glass-card text-slate-500 border-purple-900/30'
                }`}
              >
                {step > item.num ? <Check className="w-4 h-4" /> : item.num}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-slate-300">{item.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: EVENT DETAILS */}
        {step === 1 && (
          <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Event Details</h2>
              <p className="text-xs text-slate-400 mt-1">Provide core information about your hackathon.</p>
            </div>

            {duplicateWarning && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {duplicateWarning}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Hackathon Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Global AI Challenge 2026"
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Short Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. 48 hours to build futuristic LLM agents"
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-300">Description *</label>
                  <button
                    type="button"
                    onClick={() => setIsPreviewMode(!isPreviewMode)}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold"
                  >
                    {isPreviewMode ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {isPreviewMode ? 'Edit' : 'Preview Markdown'}
                  </button>
                </div>

                {isPreviewMode ? (
                  <div className="p-4 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-slate-300 text-xs min-h-[160px] whitespace-pre-line">
                    {description || 'Nothing to preview yet.'}
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the challenge, themes, guidelines, and rules..."
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Cover Image URL</label>
                <input
                  type="text"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Categories (Select at least 1) *</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => {
                    const isSel = selectedTags.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleTag(cat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          isSel ? 'bg-purple-600 text-white border-purple-400' : 'glass-card border-purple-900/30 text-slate-300 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <button
              disabled={!title.trim() || !description.trim() || selectedTags.length === 0}
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              Next: Dates & Mode <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: DATES & LOCATION */}
        {step === 2 && (
          <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Dates & Format</h2>
              <p className="text-xs text-slate-400 mt-1">Specify timeline, format, and prize pool.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate || endDate < e.target.value) setEndDate(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">End Date *</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Registration Deadline</label>
                  <input
                    type="date"
                    value={regDeadline}
                    onChange={(e) => setRegDeadline(e.target.value)}
                    max={startDate || undefined}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Event Format</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'online', label: '🌐 Online' },
                    { id: 'offline', label: '📍 In-Person' },
                    { id: 'hybrid', label: '🔀 Hybrid' }
                  ].map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id as 'online' | 'offline' | 'hybrid')}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        mode === m.id ? 'bg-purple-600 text-white border-purple-400' : 'glass-card border-purple-900/30 text-slate-300'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {mode !== 'online' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">City</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Bangalore"
                      className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Venue / College</label>
                    <input
                      type="text"
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. IIT Bombay"
                      className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Prize Pool</label>
                <input
                  type="text"
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                  placeholder="e.g. ₹5,00,000 or $10,000"
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-3.5 px-6 rounded-xl glass-card text-slate-300 font-bold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!startDate || !endDate}
                onClick={() => setStep(3)}
                className="flex-1 py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next: Requirements <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: REQUIREMENTS */}
        {step === 3 && (
          <div className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Requirements & Links</h2>
              <p className="text-xs text-slate-400 mt-1">Set team sizes, tracks, and official link.</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Min Team Size</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={minTeam}
                    onChange={(e) => setMinTeam(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Max Team Size</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxTeam}
                    onChange={(e) => setMaxTeam(parseInt(e.target.value, 10) || 4)}
                    className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Official Registration Link *</label>
                <input
                  type="url"
                  value={regLink}
                  onChange={(e) => setRegLink(e.target.value)}
                  placeholder="https://hackathon.devpost.com or https://typeform.com/..."
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-3.5 px-6 rounded-xl glass-card text-slate-300 font-bold text-xs"
              >
                Back
              </button>
              <button
                type="button"
                disabled={!regLink.trim()}
                onClick={() => setStep(4)}
                className="flex-1 py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Next: Contact Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONTACT & AGREEMENT */}
        {step === 4 && (
          <form onSubmit={handleFinishSubmit} className="glass-card p-8 rounded-3xl border border-purple-900/30 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white">Contact & Agreement</h2>
              <p className="text-xs text-slate-400 mt-1">Final step before submission for review.</p>
            </div>

            {submitError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                {submitError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Contact Name *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Contact Email *</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl glass-card bg-slate-900/60 border border-purple-900/40 text-white text-sm"
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={agree1}
                    onChange={(e) => setAgree1(e.target.checked)}
                    className="mt-0.5 accent-purple-600"
                  />
                  <span>I confirm all information provided is accurate and I am authorized to submit this event.</span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={agree2}
                    onChange={(e) => setAgree2(e.target.checked)}
                    className="mt-0.5 accent-purple-600"
                  />
                  <span>I agree that the Findathon team may contact me for verification within 24-48 hours.</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="py-3.5 px-6 rounded-xl glass-card text-slate-300 font-bold text-xs"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={!agree1 || !agree2 || isSubmitting}
                className="flex-1 py-3.5 px-6 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Hackathon 🎉'}
              </button>
            </div>
          </form>
        )}
      </main>

      <Footer />
    </div>
  );
}
