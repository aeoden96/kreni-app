import { HelpCircle, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
    onHelp: () => void;
    onSettings: () => void;
    animationBaseDelay?: number;
};

export function SpiderActionRow({ onHelp, onSettings, animationBaseDelay = 0 }: Props) {
    const { t } = useTranslation();

    const actions = [
        {
            key: 'help',
            label: t('spiderMenu.actions.help'),
            icon: <HelpCircle className="w-5 h-5" />,
            onClick: onHelp,
        },
        {
            key: 'settings',
            label: t('spiderMenu.actions.settings'),
            icon: <Settings className="w-5 h-5" />,
            onClick: onSettings,
        },
    ];

    return (
        <div className="flex gap-3 pr-1 items-center">
            {actions.map((action, index) => (
                <button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    className="flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-all duration-300 animate-spider-reveal bg-neutral/90 text-neutral-content border border-white/10 hover:bg-neutral hover:scale-110"
                    title={action.label}
                    style={{ animationDelay: `${animationBaseDelay + index * 50}ms` }}
                >
                    {action.icon}
                </button>
            ))}
        </div>
    );
}
