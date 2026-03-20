/**
 * Settings page
 */

import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Moon, Sun, Map, Database, Trash2, Info, Mail, ExternalLink, MessageSquare, Download, Languages } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { useDataCacheStore } from '../../stores/dataCache';
import { useInitialData } from '../../hooks/useInitialData';
import { trackEvent } from '../../utils/analytics';
import { getCurrentLanguage, setLanguage, type SupportedLanguage } from '../../i18n';
import { FlatLanguageFlags } from '../Navigation/FlatLanguageFlags';
import { usePWAInstall } from '../../hooks/usePWAInstall';

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

  const clearCache = useDataCacheStore((state) => state.clearCache);
  const getCacheStats = useDataCacheStore((state) => state.getCacheStats);
  const cacheVersion = useDataCacheStore((state) => state.version);

  const currentLang: SupportedLanguage = getCurrentLanguage();
  const { canInstall, install } = usePWAInstall();

  const { feedVersion, feedStartDate, feedEndDate } = useInitialData();

  const cacheStats = getCacheStats();

  const handleClearCache = () => {
    if (window.confirm(t('settings.confirmClearCache'))) {
      trackEvent('cache_cleared');
      clearCache();
      window.location.reload();
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
              <p className="font-medium text-sm text-base-content/70">{t('settings.languageHint')}</p>
              <FlatLanguageFlags
                currentLang={currentLang}
                onSelectHr={() => setLanguage('hr')}
                onSelectEn={() => setLanguage('en')}
                onSelectDe={() => setLanguage('de')}
                titleHr={t('spiderMenu.actions.languageCroatian')}
                titleEn={t('spiderMenu.actions.languageEnglish')}
                titleDe={t('spiderMenu.actions.languageGerman')}
              />
            </div>
          </div>
        </div>

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
                onClick={() => {
                  trackEvent('feedback_opened', { source: 'settings' });
                  navigate('/feedback');
                }}
                className="btn btn-sm btn-outline"
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
                  onClick={() => {
                    trackEvent('pwa_install_prompted', { source: 'settings' });
                    install();
                  }}
                  className="btn btn-sm btn-primary"
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
                <p className="text-sm text-base-content/70">
                  {t('settings.themeHint')}
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Sun className="w-4 h-4" />
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={theme === 'dark'}
                  onChange={(e) => {
                    const nextTheme = e.target.checked ? 'dark' : 'light';
                    trackEvent('theme_changed', { theme: nextTheme });
                    setTheme(nextTheme);
                  }}

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
            <h2 className="card-title text-lg">{t('settings.sandboxTitle')}</h2>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium">{t('settings.sandboxToggle')}</p>
                <p className="text-sm text-base-content/70">
                  {t('settings.sandboxHint')}
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
              {t('settings.dataTitle')}
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.entryCount')}</span>
                <span className="font-medium">{cacheStats.entryCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.size')}</span>
                <span className="font-medium">{formatBytes(cacheStats.sizeBytes)}</span>
              </div>
              {cacheVersion && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-base-content/70">{t('settings.version')}</span>
                  <span className="font-medium">{cacheVersion}</span>
                </div>
              )}
              <button
                onClick={handleClearCache}
                className="btn btn-outline btn-error btn-sm w-full mt-2"
              >
                <Trash2 className="w-4 h-4" />
                {t('settings.clearGtfsCache')}
              </button>
              <button
                onClick={handleDeleteAll}
                className="btn btn-error btn-sm w-full"
              >
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
                  href="https://mteo.dev/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 font-medium link link-primary"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  mteo.dev
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-base-content/70">{t('settings.contact')}</span>
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

        {/* Legal & Credits Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">{t('settings.legalTitle')}</h2>
            <div className="space-y-4 text-sm text-base-content/80 leading-relaxed">
              <section>
                <h3 className="font-bold mb-1 text-base-content">{t('settings.disclaimerTitle')}</h3>
                <p>
                  {t('settings.disclaimerBody')}
                </p>
              </section>

              <section>
                <h3 className="font-bold mb-1 text-base-content">{t('settings.privacyTitle')}</h3>
                <p>
                  {t('settings.privacyBody')}
                </p>
              </section>

              <section>
                <h3 className="font-bold mb-1 text-base-content">{t('settings.mapAttributionTitle')}</h3>
                <p>
                  <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="link link-primary">{t('settings.mapAttributionLink')}</a>
                </p>
              </section>

              <section>
                <h3 className="font-bold mb-1 text-base-content">{t('settings.licenseTitle')}</h3>
                <p>
                  {t('settings.licenseBody')}
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* Data Sources Section */}
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-lg">{t('settings.sourcesTitle')}</h2>
            <div className="space-y-6 text-sm">

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">{t('settings.srcZetHeading')}</h3>
                <div className="grid gap-1">
                  <a href="https://www.zet.hr/gtfs2" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcZetGtfs')}</span>
                      <span className="text-xs text-base-content/50">zet.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">{t('settings.srcTrainHeading')}</h3>
                <div className="grid gap-1">
                  <a href="https://www.hzpp.hr/en/timetable" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcTrainGtfs')}</span>
                      <span className="text-xs text-base-content/50">hzpp.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">{t('settings.srcParkingHeading')}</h3>
                <div className="grid gap-1">
                  <a href="https://zagreb.hr/popis-ulica-po-parkiralisnim-zonama-i-blokovima-u-/202702" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcParkingStreets')}</span>
                      <span className="text-xs text-base-content/50">zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a href="https://www.zagrebparking.hr/djelatnosti/javna-parkiralista/vrijeme-kontrole-i-naplate-parkiranja/209" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcParkingControl')}</span>
                      <span className="text-xs text-base-content/50">zagrebparking.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a href="https://www.zagrebparking.hr/djelatnosti/javna-parkiralista/cijene-i-vrste-parkiralisnih-karata/satna-parkiralisna-karta/229" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcParkingPrices')}</span>
                      <span className="text-xs text-base-content/50">zagrebparking.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a href="https://data.zagreb.hr/dataset/geoportal-javne-garaze" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcParkingGarages')}</span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">{t('settings.srcBikeHeading')}</h3>
                <div className="grid gap-1">
                  <a href="https://data.zagreb.hr/dataset/geoportal-javna-parkiralista-za-bicikle" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcBikeParking')}</span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">{t('settings.srcCityHeading')}</h3>
                <div className="grid gap-1">
                  <a href="https://data.zagreb.hr/dataset/geoportal-studentski-restoran" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcCityMensa')}</span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a href="https://data.zagreb.hr/dataset/geoportal_javni_zdenci" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcCityFountains')}</span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a href="https://data.zagreb.hr/dataset/geoportal-pjesacka-zona" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcCityPedZone')}</span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                  <a href="https://data.zagreb.hr/dataset/geoportal-besplatna-wifi-mreza" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcCityWifi')}</span>
                      <span className="text-xs text-base-content/50">data.zagreb.hr</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-base-content/20 group-hover:text-primary transition-colors" />
                  </a>
                </div>
              </section>

              <section>
                <h3 className="font-semibold text-base-content/60 uppercase tracking-wider text-xs px-1 mb-2">{t('settings.srcRailHeading')}</h3>
                <div className="grid gap-1">
                  <a href="https://data.zagreb.hr/dataset/zeljeznicka-stajalista-hz" target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl bg-base-200/50 hover:bg-base-200 transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-medium text-base-content">{t('settings.srcRailHzStops')}</span>
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
    </div>
  );
}
