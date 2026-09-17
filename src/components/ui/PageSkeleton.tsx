import React from 'react';

export const PageSkeleton = () => (
  <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 animate-pulse">
    <div className="h-40 bg-slate-100 rounded-3xl border border-slate-200/50"></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="col-span-2 h-96 bg-slate-100 rounded-3xl border border-slate-200/50"></div>
      <div className="h-96 bg-slate-100 rounded-3xl border border-slate-200/50"></div>
    </div>
  </div>
);
