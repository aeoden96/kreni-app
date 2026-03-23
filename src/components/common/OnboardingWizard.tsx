import {
  Coffee,
  GitMerge,
  Layers,
  List,
  Map,
  MapPin,
  MousePointerClick,
  Navigation,
  Smartphone,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useSettingsStore } from '../../stores/settingsStore';
import { trackEvent } from '../../utils/analytics';

type OnboardingVariant = 'city' | 'cycling' | 'driving' | 'list' | 'train' | 'transit';

interface OnboardingWizardProps {
  variant: OnboardingVariant;
}

export function OnboardingWizard({ variant }: OnboardingWizardProps) {
  const { t } = useTranslation();
  const onboardingCompleted = useSettingsStore((s) => s.onboardingCompleted);
  const setOnboardingCompleted = useSettingsStore((s) => s.setOnboardingCompleted);
  const onboardingStep = useSettingsStore((s) => s.onboardingStep);
  const setOnboardingStep = useSettingsStore((s) => s.setOnboardingStep);
  const [step, setStep] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Sync local step whenever store value changes (allows external reset)
    setStep(onboardingStep ?? 0);
  }, [onboardingStep]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
    let loopTimer: ReturnType<typeof setTimeout>;
    const onEnded = () => {
      loopTimer = setTimeout(() => {
        video.currentTime = 0;
        video.play().catch(() => {});
      }, 2000);
    };
    video.addEventListener('ended', onEnded);
    const startTimer = setTimeout(() => {
      video.play().catch(() => {});
    }, 1000);
    return () => {
      clearTimeout(startTimer);
      clearTimeout(loopTimer);
      video.removeEventListener('ended', onEnded);
    };
  }, [step]);

  // Treat undefined as 'completed' or 'ignored' so it doesn't auto-popup.
  // It will only show if explicitly set to false (via the Help button).
  if (onboardingCompleted[variant] !== false) return null;

  const getStepsForVariant = (): Array<{
    body: string;
    icon: React.ReactNode;
    image?: string;
    title: string;
    video?: string;
  }> => {
    const modeSwitchStep = {
      body: t('onboarding.modeSwitchBody'),
      icon: <Layers className="w-6 h-6 text-primary" />,
      title: t('onboarding.modeSwitchTitle'),
      video: '/onboarding/switch_views.webm',
    };
    switch (variant) {
      case 'city':
        return [
          {
            body: t('onboarding.cityBody0'),
            icon: <Coffee className="w-6 h-6 text-primary" />,
            title: t('onboarding.cityTitle0'),
          },
          modeSwitchStep,
        ];
      case 'cycling':
        return [
          {
            body: t('onboarding.cyclingBody0'),
            icon: <GitMerge className="w-6 h-6 text-primary" />,
            title: t('onboarding.cyclingTitle0'),
          },
          modeSwitchStep,
        ];
      case 'driving':
        return [
          {
            body: t('onboarding.drivingBody0'),
            icon: <Map className="w-6 h-6 text-primary" />,
            title: t('onboarding.drivingTitle0'),
          },
          modeSwitchStep,
        ];
      case 'list':
        return [
          {
            body: t('onboarding.listBody0'),
            icon: <Smartphone className="w-6 h-6 text-primary" />,
            title: t('onboarding.listTitle0'),
          },
          modeSwitchStep,
        ];
      case 'train':
        return [
          {
            body: t('onboarding.trainBody0'),
            icon: <Navigation className="w-6 h-6 text-primary" />,
            title: t('onboarding.trainTitle0'),
          },
          modeSwitchStep,
        ];
      case 'transit':
        return [
          {
            body: t('onboarding.transitBody0'),
            icon: <Navigation className="w-6 h-6 text-primary" />,
            title: t('onboarding.transitTitle0'),
          },
          {
            body: t('onboarding.transitBody1'),
            icon: <MapPin className="w-6 h-6 text-primary" />,
            title: t('onboarding.transitTitle1'),
            video: '/onboarding/station_view.webm',
          },
          {
            body: t('onboarding.transitBody2'),
            icon: <MousePointerClick className="w-6 h-6 text-primary" />,
            title: t('onboarding.transitTitle2'),
            video: '/onboarding/spider_selector.webm',
          },
          {
            body: t('onboarding.transitBody3'),
            icon: <List className="w-6 h-6 text-primary" />,
            title: t('onboarding.transitTitle3'),
            video: '/onboarding/public_transport_switch_views.webm',
          },
          modeSwitchStep,
        ];
      default:
        return [modeSwitchStep];
    }
  };

  const steps = getStepsForVariant();

  const handleClose = () => {
    trackEvent('onboarding_completed', { variant });
    setOnboardingCompleted(variant, true);
    setOnboardingStep(0);
  };

  const next = () => {
    const nextStep = Math.min(step + 1, steps.length - 1);
    setStep(nextStep);
    setOnboardingStep(nextStep);
  };

  const back = () => {
    const prev = Math.max(step - 1, 0);
    setStep(prev);
    setOnboardingStep(prev);
  };

  const currentStep = steps[step];

  return (
    <div className="modal modal-open z-[9999] backdrop-blur-sm">
      <div className="modal-box max-w-md p-0 overflow-hidden relative">
        {/* Cover Media */}
        {currentStep.video ? (
          <div className="w-full bg-base-300">
            <video
              className="w-full h-auto"
              key={step}
              muted
              playsInline
              ref={videoRef}
              src={import.meta.env.BASE_URL + currentStep.video.replace(/^\//, '')}
            />
          </div>
        ) : currentStep.image ? (
          <div className="w-full h-48 bg-base-200 relative">
            <img
              alt={currentStep.title}
              className="w-full h-full object-cover"
              src={import.meta.env.BASE_URL + currentStep.image.replace(/^\//, '')}
            />
          </div>
        ) : null}

        {step > 0 && (
          <button
            className="btn btn-sm btn-circle absolute left-2 top-2 bg-base-100/80 hover:bg-base-200 border-none shadow-sm"
            onClick={handleClose}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {currentStep.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">{currentStep.title}</h2>
              <p className="text-base-content/80 leading-relaxed">{currentStep.body}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-center mb-6">
            {steps.map((_, i) => (
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-8 bg-primary' : 'w-2 bg-base-300'
                }`}
                key={i}
              />
            ))}
          </div>

          <div className="flex justify-between gap-3">
            {step === 0 ? (
              <button className="btn btn-outline flex-1" onClick={handleClose}>
                {t('common.close')}
              </button>
            ) : (
              <button className="btn btn-outline flex-1" onClick={back}>
                {t('common.back')}
              </button>
            )}
            {step < steps.length - 1 ? (
              <button className="btn btn-primary flex-1" onClick={next}>
                {t('common.next')}
              </button>
            ) : (
              <button className="btn btn-primary flex-1" onClick={handleClose}>
                {t('common.done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
