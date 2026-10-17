import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";

export default function SiteTrafficPlaceholder() {
  const [trafficData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Feature deactivated until Google Analytics integration is configured
  useEffect(() => {
    setLoading(false);
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
          <Icon
            icon="heroicons:globe-alt-20-solid"
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400"
          />
        </div>
        <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wide">
          Site Traffic (30 Days)
        </h3>
        <span className="ml-auto text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-2.5 py-0.5 uppercase">
          Live
        </span>
      </div>
      
      <div className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : trafficData ? (
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Active Users</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{trafficData.activeUsers || 0}</p>
             </div>
             <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Page Views</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{trafficData.screenPageViews || 0}</p>
             </div>
             <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Sessions</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{trafficData.sessions || 0}</p>
             </div>
             <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">Avg Time</p>
                <p className="text-xl font-black text-gray-900 dark:text-white">{trafficData.averageSessionDuration ? Math.round(trafficData.averageSessionDuration/60) : 0}m</p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-6">
            <p className="text-sm font-bold text-gray-400 dark:text-gray-500 mt-4">
              Awaiting Backend Data
            </p>
            <p className="text-xs text-gray-300 dark:text-gray-600 mt-1 max-w-[200px]">
              The Google Analytics proxy endpoint is not responding or needs to be set up.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
