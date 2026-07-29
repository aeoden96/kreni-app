/**
 * Settings page
 */

import {
  ArrowLeft,
  Database,
  Download,
  ExternalLink,
  History,
  Info,
  Languages,
  Mail,
  Map,
  MessageSquare,
  Moon,
  Shield,
  Sun,
  Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';

import { useInitialData } from '../../hooks/useInitialData';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { getCurrentLanguage, setLanguage, type SupportedLanguage } from '../../i18n';
import {
  type CacheStats,
  clearPayloadCache,
  getCacheStats,
  useDataCacheStore,
} from '../../stores/dataCache';
import { useSettingsStore } from '../../stores/settingsStore';
import { trackEvent } from '../../utils/analytics';
import { isNative } from '../../utils/platform';
import { ChangelogModal } from '../common/ChangelogModal';
import { FlatLanguageFlags } from '../Navigation/FlatLanguageFlags';
import { RemindersSection } from './RemindersSection';
import { ServiceAlertPushSection } from './ServiceAlertPushSection';

// Map tile providers handled automatically via theme + detailedMap setting

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const sandboxVisible = useSettingsStore((state) => state.sandboxVisible);
  const setSandboxVisible = useSettingsStore((state) => state.setSandboxVisible);
  const detailedMap = useSettingsStore((state) => state.detailedMap);
  const setDetailedMap = useSettingsStore((state) => state.setDetailedMap);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const cacheVersion = useDataCacheStore((state) => state.version);

  const currentLang: SupportedLanguage = getCurrentLanguage();
  const { canInstall, install } = usePWAInstall();

  const { feedEndDate, feedStartDate, feedVersion } = useInitialData();

  // Reading the cache index and asking the browser for its storage estimate are
  // both async, so the figures land after the first paint rather than blocking it.
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  useEffect(() => {
    let cancelled = false;
    void getCacheStats().then((stats) => {
      if (!cancelled) setCacheStats(stats);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const goHome = () => {
    // Send the user back to the main route rather than leaving them on
    // `/settings` while the app reloads into an empty cache.
    const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');
    window.location.href = `${baseUrl}/`;
  };

  const handleClearCache = () => {
    if (window.confirm(t('settings.confirmClearCache'))) {
      trackEvent('cache_cleared');
      void clearPayloadCache().then(goHome);
    }
  };

  const handleDeleteAll = () => {
    if (window.confirm(t('settings.confirmDeleteAll'))) {
      trackEvent('all_data_deleted');
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('kreni-')) keysToRemove.push(key);
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // "Delete all" used to leave the map-tile caches behind, which are the
      // largest thing the app stores after the GTFS payloads — so the reported
      // usage barely moved and the button looked broken.
      const dropCaches =
        typeof caches === 'undefined'
          ? Promise.resolve()
          : caches
              .keys()
              .then((names) => Promise.all(names.map((name) => caches.delete(name))))
              .catch(() => {});

      void Promise.all([clearPayloadCache(), dropCaches]).then(goHome);
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
      <div className="bg-base-100 border-b border-base-300 pt-[env(safe-area-inset-top)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link className="btn btn-circle btn-ghost btn-sm" to="/">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">{t('settings.title')}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Language Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Languages className="w-5 h-5" />
              {t('settings.languageTitle')}
            </h2>
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm text-base-content/70">
                {t('settings.languageHint')}
              </p>
              <FlatLanguageFlags
                currentLang={currentLang}
                onSelectDe={() => setLanguage('de')}
                onSelectEn={() => setLanguage('en')}
                onSelectHr={() => setLanguage('hr')}
                titleDe={t('spiderMenu.actions.languageGerman')}
                titleEn={t('spiderMenu.actions.languageEnglish')}
                titleHr={t('spiderMenu.actions.languageCroatian')}
              />
            </div>
          </div>
        </div>

        {/* Departure reminders (native local notifications only) */}
        {isNative() && <RemindersSection />}

        {/* Service-alert pushes (native FCM topic subscription only) */}
        {isNative() && <ServiceAlertPushSection />}

        {/* Feedback Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t('settings.feedbackTitle')}
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-sm text-base-content/70">{t('settings.feedbackHint')}</p>
              <button
                className="btn btn-sm btn-outline"
                onClick={() => {
                  trackEvent('feedback_opened', { source: 'settings' });
                  navigate('/feedback');
                }}
              >
                {t('spiderMenu.actions.feedback')}
              </button>
            </div>
          </div>
        </div>

        {/* Install App Section */}
        {canInstall && (
          <div className="card bg-base-100 shadow-sm">
            <div className="card-body">
              <h2 className="card-title text-lg flex items-center gap-2">
                <Download className="w-5 h-5" />
                {t('settings.installTitle')}
              </h2>
              <div className="flex items-center justify-between">
                <p className="text-sm text-base-content/70">{t('settings.installHint')}</p>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => {
                    trackEvent('pwa_install_prompted', { source: 'settings' });
                    install();
                  }}
                >
                  {t('spiderMenu.actions.install')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Appearance Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {t('settings.appearanceTitle')}
            </h2>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className="font-medium">{t('settings.theme')}</p>
                <p className="text-sm text-base-content/70">{t('settings.themeHint')}</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Sun className="w-4 h-4" />
                <input
                  checked={theme === 'dark'}
                  className="toggle toggle-primary"
                  onChange={(e) => {
                    const nextTheme = e.target.checked ? 'dark' : 'light';
                    trackEvent('theme_changed', { theme: nextTheme });
                    setTheme(nextTheme);
                  }}
                  type="checkbox"
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
              {t('settings.mapTitle')}
            </h2>
            <div className="space-y-3">
              <p className="font-medium">{t('settings.detailedMap')}</p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-base-content/70">{t('settings.detailedMapHint')}</p>
                </div>
                <input
                  checked={detailedMap}
                  className="toggle toggle-primary mt-1"
                  onChange={(e) => setDetailedMap(e.target.checked)}
                  type="checkbox"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sandbox Mode Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">{t('settings.sandboxTitle')}</h2>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">{t('settings.sandboxToggle')}</p>
                <p className="text-sm text-base-content/70">{t('settings.sandboxHint')}</p>
              </div>
              <input
                checked={sandboxVisible}
                className="toggle toggle-primary mt-1"
                onChange={(e) => setSandboxVisible(e.target.checked)}
                type="checkbox"
              />
            </div>
          </div>
        </div>

        {/* Data & Cache Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('settings.dataTitle')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.entryCount')}</span>
                <span className="font-medium">{cacheStats ? cacheStats.entryCount : '…'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.size')}</span>
                <span className="font-medium">
                  {cacheStats ? formatBytes(cacheStats.sizeBytes) : '…'}
                </span>
              </div>
              {/*
                Shown next to the cache's own figure because the two answer
                different questions: this is what the browser bills the origin
                for under "Cookies and site data", including map tiles and the
                service worker's caches, and it is the number a user comes here
                worried about.
              */}
              {cacheStats?.originBytes != null && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">{t('settings.totalStorage')}</span>
                  <span className="font-medium">{formatBytes(cacheStats.originBytes)}</span>
                </div>
              )}
              {cacheVersion && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">{t('settings.version')}</span>
                  <span className="font-medium">{cacheVersion}</span>
                </div>
              )}
              <button
                className="btn btn-outline btn-error btn-sm w-full mt-2"
                onClick={handleClearCache}
              >
                <Trash2 className="w-4 h-4" />
                {t('settings.clearGtfsCache')}
              </button>
              <button className="btn btn-error btn-sm w-full" onClick={handleDeleteAll}>
                <Trash2 className="w-4 h-4" />
                {t('settings.deleteAllData')}
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Info className="w-5 h-5" />
              {t('settings.aboutTitle')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.appVersion')}</span>
                <span className="font-medium">{__APP_VERSION__}</span>
              </div>
              {feedVersion && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">{t('settings.gtfsVersion')}</span>
                  <span className="font-medium">{feedVersion}</span>
                </div>
              )}
              {feedStartDate && feedEndDate && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">{t('settings.dataValid')}</span>
                  <span className="font-medium text-right">
                    {formatGtfsDate(feedStartDate)} – {formatGtfsDate(feedEndDate)}
                  </span>
                </div>
              )}
              <button
                className="btn btn-outline btn-sm w-full mt-2 flex items-center gap-2"
                onClick={() => setIsChangelogOpen(true)}
              >
                <History className="w-4 h-4" />
                {t('settings.viewChangelog', 'View Changelog')}
              </button>
            </div>
          </div>
        </div>

        {/* Open Source Section */}
        <div className="card bg-base-100 shadow-sm border-2 border-primary/20">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              {t('settings.repositoryTitle')}
            </h2>
            <div className="flex items-center justify-between">
              <p className="text-sm text-base-content/70">{t('settings.repositoryHint')}</p>
              <a
                className="btn btn-sm btn-primary"
                href="https://github.com/aeoden96/kreni-app"
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub
              </a>
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
                <span className="text-sm text-base-content/70">Web</span>
                <a
                  className="flex items-center gap-1.5 font-medium link link-primary"
                  href="https://mteo.dev/"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  mteo.dev
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.contact')}</span>
                <a
                  className="flex items-center gap-1.5 font-medium link link-primary"
                  href="mailto:contact@kreni.app"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  contact@kreni.app
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Policy Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('settings.privacyPolicyTitle')}
            </h2>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-base-content/70">{t('settings.privacyPolicyHint')}</p>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/privacy')}>
                {t('settings.privacyPolicyAction')}
              </button>
            </div>
          </div>
        </div>

        {/* Data Sources Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">{t('settings.sourcesTitle')}</h2>
            <div className="space-y-6 text-sm">
              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">
                  {t('settings.srcZetHeading')}
                </h3>
                <div className="grid gap-1">
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://www.zet.hr/gtfs2"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcZetGtfs')}
                      </span>
                      <span className="text-xs text-base-content/50">zet.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">
                  {t('settings.srcTrainHeading')}
                </h3>
                <div className="grid gap-1">
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://www.hzpp.hr/en/timetable"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcTrainGtfs')}
                      </span>
                      <span className="text-xs text-base-content/50">hzpp.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">
                  {t('settings.srcParkingHeading')}
                </h3>
                <div className="grid gap-1">
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://zagreb.hr/popis-ulica-po-parkiralisnim-zonama-i-blokovima-u-/202702"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcParkingStreets')}
                      </span>
                      <span className="text-xs text-base-content/50">zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://www.zagrebparking.hr/djelatnosti/javna-parkiralista/vrijeme-kontrole-i-naplate-parkiranja/209"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcParkingControl')}
                      </span>
                      <span className="text-xs text-base-content/50">zagrebparking.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://www.zagrebparking.hr/djelatnosti/javna-parkiralista/cijene-i-vrste-parkiralisnih-karata/satna-parkiralisna-karta/229"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcParkingPrices')}
                      </span>
                      <span className="text-xs text-base-content/50">zagrebparking.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/geoportal-javne-garaze"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcParkingGarages')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">
                  {t('settings.srcBikeHeading')}
                </h3>
                <div className="grid gap-1">
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/geoportal-javna-parkiralista-za-bicikle"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcBikeParking')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">
                  {t('settings.srcCityHeading')}
                </h3>
                <div className="grid gap-1">
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/geoportal-studentski-restoran"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcCityMensa')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/geoportal_javni_zdenci"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcCityFountains')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/geoportal-pjesacka-zona"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcCityPedZone')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/geoportal-besplatna-wifi-mreza"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcCityWifi')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">
                  {t('settings.srcRailHeading')}
                </h3>
                <div className="grid gap-1">
                  <a
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group"
                    href="https://data.zagreb.hr/dataset/zeljeznicka-stajalista-hz"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">
                        {t('settings.srcRailHzStops')}
                      </span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <ChangelogModal isOpen={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </div>
  );
}
