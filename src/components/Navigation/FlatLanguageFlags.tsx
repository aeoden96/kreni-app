import type { SupportedLanguage } from '../../i18n';

const FLAG_HR_SRC = `${import.meta.env.BASE_URL}icons/flags/hr.svg`;
const FLAG_GB_SRC = `${import.meta.env.BASE_URL}icons/flags/gb.svg`;
const FLAG_DE_SRC = `${import.meta.env.BASE_URL}icons/flags/de.svg`;

type Props = {
  currentLang: SupportedLanguage;
  onSelectDe: () => void;
  onSelectEn: () => void;
  onSelectHr: () => void;
  titleDe: string;
  titleEn: string;
  titleHr: string;
};

export function FlatLanguageFlags({
  currentLang,
  onSelectDe,
  onSelectEn,
  onSelectHr,
  titleDe,
  titleEn,
  titleHr,
}: Props) {
  const base =
    'overflow-hidden rounded-[3px] transition-[box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/60';
  const active = 'opacity-100 ring-2 ring-primary ring-offset-[3px] ring-offset-black/55';
  const inactive = 'opacity-55 ring-0 ring-offset-0 hover:opacity-90';

  return (
    <div className="flex items-center gap-2.5">
      <button
        aria-label={titleHr}
        aria-pressed={currentLang === 'hr'}
        className={`${base} ${currentLang === 'hr' ? active : inactive}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectHr();
        }}
        style={{ height: 26, width: 40 }}
        title={titleHr}
        type="button"
      >
        <img
          alt=""
          className="pointer-events-none block h-full w-full object-cover"
          draggable={false}
          height={26}
          src={FLAG_HR_SRC}
          width={40}
        />
      </button>
      <button
        aria-label={titleEn}
        aria-pressed={currentLang === 'en'}
        className={`${base} ${currentLang === 'en' ? active : inactive}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectEn();
        }}
        style={{ height: 26, width: 40 }}
        title={titleEn}
        type="button"
      >
        <img
          alt=""
          className="pointer-events-none block h-full w-full object-cover"
          draggable={false}
          height={26}
          src={FLAG_GB_SRC}
          width={40}
        />
      </button>
      <button
        aria-label={titleDe}
        aria-pressed={currentLang === 'de'}
        className={`${base} ${currentLang === 'de' ? active : inactive}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelectDe();
        }}
        style={{ height: 26, width: 40 }}
        title={titleDe}
        type="button"
      >
        <img
          alt=""
          className="pointer-events-none block h-full w-full object-cover"
          draggable={false}
          height={26}
          src={FLAG_DE_SRC}
          width={40}
        />
      </button>
    </div>
  );
}
