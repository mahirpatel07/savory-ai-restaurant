import React from 'react';

const AdminSkeletonLoader = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-20 w-full rounded-[28px] border border-white/5 bg-white/[0.01] backdrop-blur-xl" />
    <div className="grid gap-6 md:grid-cols-3">
      <div className="h-28 rounded-2xl border border-white/5 bg-white/[0.01]" />
      <div className="h-28 rounded-2xl border border-white/5 bg-white/[0.01]" />
      <div className="h-28 rounded-2xl border border-white/5 bg-white/[0.01]" />
    </div>
    <div className="h-96 w-full rounded-[28px] border border-white/5 bg-white/[0.01] backdrop-blur-xl" />
  </div>
);

export default AdminSkeletonLoader;
