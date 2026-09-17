import React from 'react';

export const DashboardSkeleton = () => (
  <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 relative animate-pulse">
    {/* Header Stats */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-100 flex items-center gap-5">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl shrink-0"></div>
          <div className="flex flex-col gap-2 w-full">
            <div className="w-24 h-3 bg-slate-100 rounded-full"></div>
            <div className="w-16 h-8 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>

    {/* Main Grid */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Map Skeleton */}
      <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 h-[500px] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-50 flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl"></div>
          <div className="w-48 h-6 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="flex-1 bg-slate-50 m-2 rounded-2xl"></div>
      </div>

      {/* AI Recommendations Skeleton */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 h-[500px] flex flex-col">
        <div className="p-4 sm:p-6 border-b border-slate-800">
          <div className="w-20 h-4 bg-slate-800 rounded-full mb-4"></div>
          <div className="w-40 h-6 bg-slate-800 rounded-lg"></div>
        </div>
        <div className="p-4 sm:p-6 flex-1 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4 p-4 rounded-xl bg-slate-800/50 border border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 shrink-0"></div>
              <div className="space-y-2 w-full mt-1.5">
                <div className="w-full h-3 bg-slate-800 rounded-full"></div>
                <div className="w-4/5 h-3 bg-slate-800 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    
    {/* Charts Row */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 h-[350px]">
        <div className="w-48 h-6 bg-slate-200 rounded-lg mb-4"></div>
        <div className="h-[260px] bg-slate-50 rounded-xl"></div>
      </div>
      <div className="bg-white rounded-3xl border border-slate-100 p-4 sm:p-6 h-[350px]">
        <div className="w-48 h-6 bg-slate-200 rounded-lg mb-4"></div>
        <div className="h-[260px] flex items-center justify-center">
            <div className="w-48 h-48 bg-slate-100 rounded-full border-[20px] border-slate-50"></div>
        </div>
      </div>
    </div>
  </div>
);
