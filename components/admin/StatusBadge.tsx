import React from 'react';

export function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' | string }) {
  if (status === 'pending') {
    return (
      <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1">
        ⏳ Pending Review
      </span>
    );
  }
  
  if (status === 'approved') {
    return (
      <span className="bg-green-500/20 text-green-400 border border-green-500/30 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1">
        ✓ Approved
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <span className="bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1">
        ✗ Rejected
      </span>
    );
  }

  return (
    <span className="bg-slate-500/20 text-slate-400 border border-slate-500/30 rounded-full px-3 py-1 text-xs font-medium inline-flex items-center gap-1">
      {status}
    </span>
  );
}
