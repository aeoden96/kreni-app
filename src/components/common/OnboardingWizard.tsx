import React, { useState, useEffect, useRef } from 'react';
import { X, Navigation, MapPin, Smartphone, Map, GitMerge, Coffee, List, MousePointerClick, Layers } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';

type OnboardingVariant = 'transit' | 'cycling' | 'driving' | 'city' | 'list' | 'train';

interface OnboardingWizardProps {
  variant: OnboardingVariant;
}

export function OnboardingWizard({ variant }: OnboardingWizardProps) {
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

  if (onboardingCompleted[variant]) return null;

  const modeSwitchStep = {
    title: 'Promjena načina rada',
    body: 'Klikni na glavni gumb gore desno (Spider izbornik) za brzo prebacivanje između javnog prijevoza, bicikla, auta ili gradskog sadržaja.',
    icon: <Layers className="w-6 h-6 text-primary" />,
    video: '/onboarding/switch_views.webm'
  };

  const getStepsForVariant = (): Array<{ title: string; body: string; icon: React.ReactNode; image?: string; video?: string }> => {
    switch (variant) {
      case 'transit':
        return [
          {
            title: 'Javni prijevoz',
            body: 'Prati ZET tramvaje i autobuse uživo na karti.',
            icon: <Navigation className="w-6 h-6 text-primary" />
          },
          {
            title: 'Pregled stanice',
            body: 'Klikni na stanicu na karti kako bi otvorio detalje i provjerio raspored dolazaka i odlazećih linija.',
            icon: <MapPin className="w-6 h-6 text-primary" />,
            video: '/onboarding/station_view.webm'
          },
          {
            title: 'Precizan odabir',
            body: 'Kada klikneš na grupu stanica ili vozila, otvara se izbornik iz kojeg lako možeš odabrati točno ono što želiš pratiti.',
            icon: <MousePointerClick className="w-6 h-6 text-primary" />,
            video: '/onboarding/spider_selector.webm'
          },
          {
            title: 'Karta ili Lista',
            body: 'Uz kartu, dostupan je i prikaz u obliku liste. Korisno kada samo želiš pronaći liniju bez gledanja u kartu.',
            icon: <List className="w-6 h-6 text-primary" />,
            video: '/onboarding/public_transport_switch_views.webm'
          },
          modeSwitchStep
        ];
      case 'cycling':
        return [
          {
            title: 'Biciklizam',
            body: 'Istraži biciklističke staze, Bajs (Nextbike) stanice i javna parkirališta za bicikle.',
            icon: <GitMerge className="w-6 h-6 text-primary" /> // Using GitMerge as a placeholder for a path/bike icon
          },
          modeSwitchStep
        ];
      case 'driving':
        return [
          {
            title: 'Vožnja Auta',
            body: 'Provjeri stanje u prometu i aktualna zatvaranja cesta prije polaska.',
            icon: <Map className="w-6 h-6 text-primary" />
          },
          modeSwitchStep
        ];
      case 'city':
        return [
          {
            title: 'Gradski Život',
            body: 'Pronađi javne fontane za pitku vodu, studentske restorane i druge gradske sadržaje.',
            icon: <Coffee className="w-6 h-6 text-primary" />
          },
          modeSwitchStep
        ];
      case 'list':
        return [
          {
            title: 'Prikaz Liste',
            body: 'Brzi pregled svih linija i stanica u jednostavnom tekstualnom formatu, bez učitavanja karte.',
            icon: <Smartphone className="w-6 h-6 text-primary" />
          },
          modeSwitchStep
        ];
      case 'train':
        return [
          {
            title: 'Vlakovi HŽ',
            body: 'Pregledaj vozni red HŽ Putničkog prijevoza za željezničke stanice u Zagrebu i okolici. Odaberi stanicu ili prugu za detalje.',
            icon: <Navigation className="w-6 h-6 text-primary" />
          },
          modeSwitchStep
        ];
      default:
        return [modeSwitchStep];
    }
  };

  const steps = getStepsForVariant();

  const handleClose = () => {
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
              key={step}
              ref={videoRef}
              src={import.meta.env.BASE_URL + currentStep.video.replace(/^\//, '')}
              muted
              playsInline
              className="w-full h-auto"
            />
          </div>
        ) : currentStep.image ? (
          <div className="w-full h-48 bg-base-200 relative">
            <img
              src={import.meta.env.BASE_URL + currentStep.image.replace(/^\//, '')}
              alt={currentStep.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : null}

        {step > 0 && (
          <button
            onClick={handleClose}
            className="btn btn-sm btn-circle absolute left-2 top-2 bg-base-100/80 hover:bg-base-200 border-none shadow-sm"
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
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-primary' : 'w-2 bg-base-300'
                  }`}
              />
            ))}
          </div>

          <div className="flex justify-between gap-3">
            {step === 0 ? (
              <button onClick={handleClose} className="btn btn-outline flex-1">
                Zatvori
              </button>
            ) : (
              <button onClick={back} className="btn btn-outline flex-1">
                Natrag
              </button>
            )}
            {step < steps.length - 1 ? (
              <button onClick={next} className="btn btn-primary flex-1">
                Sljedeće
              </button>
            ) : (
              <button onClick={handleClose} className="btn btn-primary flex-1">
                Završi
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
