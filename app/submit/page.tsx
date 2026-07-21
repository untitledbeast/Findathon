'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { submitHackathon } from '@/lib/supabase';
import {
  PlusCircle,
  Calendar,
  MapPin,
  Globe,
  Tag,
  Link2,
  Building2,
  Image as ImageIcon,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function SubmitHackathonPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    title: '',
    organizer: '',
    description: '',
    start_date: '',
    end_date: '',
    is_online: true,
    location_city: '',
    location_college: '',
    register_url: '',
    cover_image_url: '',
    tags: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleOnline = (isOnline: boolean) => {
    setFormData(prev => ({ ...prev, is_online: isOnline }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Form validations
    if (!formData.title.trim()) {
      setErrorMsg('Please enter the hackathon name / title.');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      setErrorMsg('Please select both start and end dates.');
      return;
    }
    if (!formData.register_url.trim()) {
      setErrorMsg('Please provide a valid registration or website URL.');
      return;
    }

    setSubmitting(true);

    // Process tags into string array
    const parsedTags = formData.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const payload = {
      title: formData.title.trim(),
      organizer: formData.organizer.trim() || 'Independent Host',
      description: formData.description.trim() || 'No description provided.',
      start_date: formData.start_date,
      end_date: formData.end_date,
      is_online: formData.is_online,
      location_city: formData.is_online ? null : formData.location_city.trim() || null,
      location_college: formData.is_online ? null : formData.location_college.trim() || null,
      register_url: formData.register_url.trim(),
      cover_image_url: formData.cover_image_url.trim() || null,
      tags: parsedTags.length > 0 ? parsedTags : ['General', 'Tech']
    };

    const res = await submitHackathon(payload);
    setSubmitting(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 2500);
    } else {
      setErrorMsg(res.error || 'Failed to submit hackathon. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-purple-600 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-purple-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Hackathons
          </Link>
        </div>

        {/* Page Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Community Submissions</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Submit a <span className="text-gradient">Hackathon</span>
          </h1>
          <p className="text-sm text-slate-300">
            List your college tech fest, online buildathon, or regional event on Findathon. Submissions are saved with status = &apos;pending&apos; for review.
          </p>
        </div>

        {/* Success Alert Banner */}
        {success && (
          <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 flex items-start gap-3 shadow-xl animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-base text-white">Hackathon Submitted Successfully!</h4>
              <p className="text-xs text-emerald-300">
                Your event has been saved with status = &apos;pending&apos;. Redirecting you to the home page...
              </p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <p className="text-xs font-semibold">{errorMsg}</p>
          </div>
        )}

        {/* SUBMISSION FORM */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-10 rounded-3xl bg-slate-900/80 border border-purple-900/40 backdrop-blur-xl space-y-6 shadow-2xl">
          
          {/* Section 1: Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/30 pb-2">
              1. Event Overview
            </h3>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Hackathon Name / Title <span className="text-purple-400">*</span>
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. AI Innovators Hackathon 2026"
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Organizer */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Organizer / Community / College Club
              </label>
              <div className="relative">
                <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  name="organizer"
                  value={formData.organizer}
                  onChange={handleChange}
                  placeholder="e.g. Stanford AI Club or Supabase"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Event Description
              </label>
              <textarea
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe problem statements, prize pools, eligibility, and rules..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Section 2: Dates & Mode */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/30 pb-2">
              2. Dates & Event Mode
            </h3>

            {/* Dates Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  Start Date <span className="text-purple-400">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-200">
                  End Date <span className="text-purple-400">*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Online / Offline Toggle */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-semibold text-slate-200">
                Is this event Online or In-Person?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleOnline(true)}
                  className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    formData.is_online
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                      : 'bg-slate-950 text-slate-400 border-purple-900/30 hover:border-purple-500/40'
                  }`}
                >
                  <Globe className="w-4 h-4" /> Online Event
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleOnline(false)}
                  className={`p-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
                    !formData.is_online
                      ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-900/50'
                      : 'bg-slate-950 text-slate-400 border-purple-900/30 hover:border-purple-500/40'
                  }`}
                >
                  <MapPin className="w-4 h-4" /> In-Person Campus
                </button>
              </div>
            </div>

            {/* City & College Inputs if Offline */}
            {!formData.is_online && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    City Location
                  </label>
                  <input
                    type="text"
                    name="location_city"
                    value={formData.location_city}
                    onChange={handleChange}
                    placeholder="e.g. San Francisco, Bengaluru, London"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-200">
                    College / University Campus
                  </label>
                  <input
                    type="text"
                    name="location_college"
                    value={formData.location_college}
                    onChange={handleChange}
                    placeholder="e.g. Stanford University or MIT"
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Links & Media */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 border-b border-purple-900/30 pb-2">
              3. Registration & Banner
            </h3>

            {/* Registration URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Registration Website / Devpost Link <span className="text-purple-400">*</span>
              </label>
              <div className="relative">
                <Link2 className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="url"
                  name="register_url"
                  required
                  value={formData.register_url}
                  onChange={handleChange}
                  placeholder="https://devpost.com/hackathon-xyz"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Cover Image URL */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Cover Image URL (Optional)
              </label>
              <div className="relative">
                <ImageIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="url"
                  name="cover_image_url"
                  value={formData.cover_image_url}
                  onChange={handleChange}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Tags Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Tags (Comma-separated)
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g. AI, Web3, Python, Next.js, Open Source"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-purple-900/40 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || success}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-xl shadow-purple-900/50 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting to Supabase...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>Submit Hackathon</span>
                </>
              )}
            </button>
          </div>

        </form>

      </main>

      <Footer />
    </div>
  );
}
