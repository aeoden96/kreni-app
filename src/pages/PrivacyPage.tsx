import { ArrowLeft, ExternalLink, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-svh overflow-y-auto bg-base-200">
      <div className="bg-base-100 border-b border-base-300">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            aria-label={t('common.back')}
            className="btn btn-circle btn-ghost btn-sm"
            to="/settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">{t('privacyPage.title')}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body space-y-4 text-sm text-base-content/80 leading-relaxed">
            <h2 className="card-title text-lg flex items-center gap-2">
              <Shield className="w-5 h-5" />
              {t('privacyPage.title')}
            </h2>
            <p>{t('privacyPage.summary')}</p>

            <section>
              <h3 className="font-bold mb-1 text-base-content">
                {t('privacyPage.disclaimerTitle')}
              </h3>
              <p>{t('privacyPage.disclaimerBody')}</p>
            </section>

            <section>
              <h3 className="font-bold mb-1 text-base-content">{t('privacyPage.privacyTitle')}</h3>
              <p>{t('privacyPage.privacyBody')}</p>
            </section>

            <section>
              <h3 className="font-bold mb-1 text-base-content">
                {t('privacyPage.mapAttributionTitle')}
              </h3>
              <a
                className="link link-primary inline-flex items-center gap-1"
                href="https://www.openstreetmap.org/copyright"
                rel="noopener noreferrer"
                target="_blank"
              >
                {t('privacyPage.mapAttributionLink')}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </section>

            <section>
              <h3 className="font-bold mb-1 text-base-content">{t('privacyPage.licenseTitle')}</h3>
              <p>{t('privacyPage.licenseBody')}</p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
