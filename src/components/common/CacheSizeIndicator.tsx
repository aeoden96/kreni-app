// TODO: temporary debug UI — remove when no longer needed
import { useDataCacheStore } from '../../stores/dataCache';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function CacheSizeIndicator() {
  const cache = useDataCacheStore((s) => s.cache);
  const getCacheStats = useDataCacheStore((s) => s.getCacheStats);
  // Re-compute whenever `cache` reference changes
  void cache;
  const { entryCount, sizeBytes } = getCacheStats();

  return (
    <div className="fixed bottom-2 left-2 z-[2100] bg-black/70 text-white text-xs font-mono px-2 py-1 rounded pointer-events-none select-none">
      cache: {formatBytes(sizeBytes)} ({entryCount} entries)
    </div>
  );
}
