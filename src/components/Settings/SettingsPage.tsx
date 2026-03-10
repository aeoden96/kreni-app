/**
 * Settings page
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Map, Database, Trash2, Info, Mail } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDataCacheStore } from '../../stores/dataCache';
import { useInitialData } from '../../hooks/useInitialData';
import { trackEvent } from '../../utils/analytics';

// Map tile providers handled automatically via theme + detailedMap setting



export function SettingsPage() {
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const sandboxVisible = useSettingsStore((state) => state.sandboxVisible);
  const setSandboxVisible = useSettingsStore((state) => state.setSandboxVisible);
  const detailedMap = useSettingsStore((state) => state.detailedMap);
  const setDetailedMap = useSettingsStore((state) => state.setDetailedMap);

  const clearCache = useDataCacheStore((state) => state.clearCache);
  const getCacheStats = useDataCacheStore((state) => state.getCacheStats);
  const cacheVersion = useDataCacheStore((state) => state.version);

  const { feedVersion, feedStartDate, feedEndDate } = useInitialData();

  const cacheStats = getCacheStats();

  const handleClearCache = () => {
    if (window.confirm('Obrisati GTFS predmemoriju? Aplikacija će se ponovo učitati i dohvatiti svježe podatke.')) {
      trackEvent('cache_cleared');
      clearCache();
      window.location.reload();
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm('Obrisati sve podatke aplikacije? Ovo će obrisati sve postavke, favorite i predmemoriju. Aplikacija će se ponovo učitati.')) {
      trackEvent('all_data_deleted');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kreni-')) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      clearCache();
      window.location.reload();
    }
  };

  const formatGtfsDate = (date: string): string => {
    if (date.length !== 8) return date;
    return `${date.slice(6, 8)}.${date.slice(4, 6)}.${date.slice(0, 4)}.`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="h-full overflow-y-auto bg-base-200">
      {/* Header */}
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="btn btn-circle btn-ghost btn-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">Postavke</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Appearance Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              Izgled
            </h2>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className="font-medium">Tema</p>
                <p className="text-sm text-base-content/70">
                  Svijetla ili tamna tema
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Sun className="w-4 h-4" />
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={theme === 'dark'}
                  onChange={(e) => { const t = e.target.checked ? 'dark' : 'light'; trackEvent('theme_changed', { theme: t }); setTheme(t); }}

                />
                <Moon className="w-4 h-4" />
              </label>
            </div>
          </div>
        </div>



        {/* Map Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Map className="w-5 h-5" />
              Karta
            </h2>
            <div className="space-y-3">
              <p className="font-medium">Detaljnija karta</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70">Uključi za detaljniji stil karte (Standard / HOT). Vrijedi za svijetlu i tamnu temu.</p>
                </div>
                <input
                  type="checkbox"
                  className="toggle toggle-primary mt-1"
                  checked={detailedMap}
                  onChange={(e) => setDetailedMap(e.target.checked)}
                />
              </div>
            </div>


          </div>
        </div>

        {/* Sandbox Mode Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">Sandbox način rada</h2>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">Prikaži Sandbox</p>
                <p className="text-sm text-base-content/70">
                  Alat za ručno postavljanje vremena i testiranje reda vožnje
                </p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary mt-1"
                checked={sandboxVisible}
                onChange={(e) => setSandboxVisible(e.target.checked)}
              />
            </div>
          </div>
        </div>

        {/* Data & Cache Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              Podaci i predmemorija
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">Broj zapisa</span>
                <span className="font-medium">{cacheStats.entryCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">Veličina</span>
                <span className="font-medium">{formatBytes(cacheStats.sizeBytes)}</span>
              </div>
              {cacheVersion && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">Verzija</span>
                  <span className="font-medium">{cacheVersion}</span>
                </div>
              )}
              <button
                onClick={handleClearCache}
                className="btn btn-outline btn-error btn-sm w-full mt-2"
              >
                <Trash2 className="w-4 h-4" />
                Obriši GTFS predmemoriju
              </button>
              <button
                onClick={handleDeleteAll}
                className="btn btn-error btn-sm w-full"
              >
                <Trash2 className="w-4 h-4" />
                Obriši sve podatke
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              O aplikaciji
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">Verzija aplikacije</span>
                <span className="font-medium">{__APP_VERSION__}</span>
              </div>
              {feedVersion && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">GTFS verzija</span>
                  <span className="font-medium">{feedVersion}</span>
                </div>
              )}
              {feedStartDate && feedEndDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">Podaci vrijede</span>
                  <span className="font-medium text-right">
                    {formatGtfsDate(feedStartDate)} – {formatGtfsDate(feedEndDate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Developer Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              Developer
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">Developer</span>
                <span className="font-medium">kreni.app</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">Kontakt</span>
                <a
                  href="mailto:contact@kreni.app"
                  className="flex items-center gap-1.5 font-medium link link-primary"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  contact@kreni.app
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
