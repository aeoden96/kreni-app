import type { SupportedLanguage } from '../../i18n';

const FLAG_HR_SRC = `${import.meta.env.BASE_URL}icons/flags/hr.svg`;
const FLAG_GB_SRC = `${import.meta.env.BASE_URL}icons/flags/gb.svg`;
const FLAG_DE_SRC = `${import.meta.env.BASE_URL}icons/flags/de.svg`;

type Props = {
    currentLang: SupportedLanguage;
    onSelectHr: () => void;
    onSelectEn: () => void;
    onSelectDe: () => void;
    titleHr: string;
    titleEn: string;
    titleDe: string;
};

export function FlatLanguageFlags({
    currentLang,
    onSelectHr,
    onSelectEn,
    onSelectDe,
    titleHr,
    titleEn,
    titleDe,
}: Props) {
    const base =
        'overflow-hidden rounded-[3px] transition-[box-shadow,opacity] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black/60';
    const active = 'opacity-100 ring-2 ring-primary ring-offset-[3px] ring-offset-black/55';
    const inactive = 'opacity-55 ring-0 ring-offset-0 hover:opacity-90';

    return (
        <div className="flex items-center gap-2.5">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectHr();
                }}
                className={`${base} ${currentLang === 'hr' ? active : inactive}`}
                style={{ width: 40, height: 26 }}
                title={titleHr}
                aria-label={titleHr}
                aria-pressed={currentLang === 'hr'}
            >
                <img
                    src={FLAG_HR_SRC}
                    alt=""
                    width={40}
                    height={26}
                    draggable={false}
                    className="pointer-events-none block h-full w-full object-cover"
                />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectEn();
                }}
                className={`${base} ${currentLang === 'en' ? active : inactive}`}
                style={{ width: 40, height: 26 }}
                title={titleEn}
                aria-label={titleEn}
                aria-pressed={currentLang === 'en'}
            >
                <img
                    src={FLAG_GB_SRC}
                    alt=""
                    width={40}
                    height={26}
                    draggable={false}
                    className="pointer-events-none block h-full w-full object-cover"
                />
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectDe();
                }}
                className={`${base} ${currentLang === 'de' ? active : inactive}`}
                style={{ width: 40, height: 26 }}
                title={titleDe}
                aria-label={titleDe}
                aria-pressed={currentLang === 'de'}
            >
                <img
                    src={FLAG_DE_SRC}
                    alt=""
                    width={40}
                    height={26}
                    draggable={false}
                    className="pointer-events-none block h-full w-full object-cover"
                />
            </button>
        </div>
    );
}
