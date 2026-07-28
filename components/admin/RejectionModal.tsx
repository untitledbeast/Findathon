'use client';

import React, { useState } from 'react';

interface RejectionModalProps {
  isOpen: boolean;
  hackathonTitle: string;
  hackathonId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RejectionModal({ isOpen, hackathonTitle, hackathonId, onClose, onSuccess }: RejectionModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);
    if (reason.trim().length < 10) {
      setError('Reason must be at least 10 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/admin/hackathons/${hackathonId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to reject submission');
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-32">
      <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl">
        <h2 className="text-xl font-semibold text-red-400 mb-1">Reject Submission</h2>
        <p className="text-slate-300 mb-4">{hackathonTitle}</p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Explain why this submission is being rejected. This message will be visible to the organizer."
          maxLength={500}
          className="bg-slate-950 border border-red-900/40 text-slate-100 rounded-xl px-4 py-3 w-full min-h-[120px] focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none mb-2"
          disabled={submitting}
        />
        
        <div className="flex justify-between items-center mb-6">
          <span className="text-xs text-slate-500">{reason.length} / 500</span>
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-red-600 hover:bg-red-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? 'Rejecting...' : 'Reject Submission'}
          </button>
        </div>
      </div>
    </div>
  );
}
