import React from 'react';

export function PropertyCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="h-56 bg-gray-200 shimmer"></div>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-20 shimmer"></div>
          <div className="h-4 bg-gray-200 rounded w-12 shimmer"></div>
        </div>
        <div className="h-6 bg-gray-200 rounded w-3/4 shimmer"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 shimmer"></div>
        <div className="flex items-center justify-between pt-4">
          <div className="flex gap-4">
            <div className="h-4 bg-gray-200 rounded w-12 shimmer"></div>
            <div className="h-4 bg-gray-200 rounded w-12 shimmer"></div>
            <div className="h-4 bg-gray-200 rounded w-16 shimmer"></div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="h-8 bg-gray-200 rounded w-32 shimmer"></div>
          <div className="h-10 w-10 bg-gray-200 rounded-xl shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <PropertyCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="flex items-center">
        <div className="w-12 h-12 bg-gray-200 rounded-lg shimmer"></div>
        <div className="ml-4 flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-24 shimmer"></div>
          <div className="h-8 bg-gray-200 rounded w-16 shimmer"></div>
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <StatsCardSkeleton key={index} />
        ))}
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-40 mb-6 shimmer"></div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-24 bg-gray-200 rounded-lg shimmer"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
