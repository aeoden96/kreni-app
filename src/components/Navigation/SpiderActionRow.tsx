import { HelpCircle, Settings, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type Props = {
  animationBaseDelay?: number;
  onHelp: () => void;
  onSettings: () => void;
  onShare: () => void;
};

export function SpiderActionRow({ animationBaseDelay = 0, onHelp, onSettings, onShare }: Props) {
  const { t } = useTranslation();

  const actions = [
    {
      icon: <HelpCircle className="w-5 h-5" />,
      key: 'help',
      label: t('spiderMenu.actions.help'),
      onClick: onHelp,
    },
    {
      icon: <Share2 className="w-5 h-5" />,
      key: 'share',
      label: t('spiderMenu.actions.share'),
      onClick: onShare,
    },
    {
      icon: <Settings className="w-5 h-5" />,
      key: 'settings',
      label: t('spiderMenu.actions.settings'),
      onClick: onSettings,
    },
  ];

  return (
    <div className="flex gap-3 pr-1 items-center">
      {actions.map((action, index) => (
        <button
          className="flex items-center justify-center w-11 h-11 rounded-full shadow-lg transition-all duration-300 animate-spider-reveal bg-neutral/90 text-neutral-content border border-white/10 hover:bg-neutral hover:scale-110"
          key={action.key}
          onClick={action.onClick}
          style={{ animationDelay: `${animationBaseDelay + index * 50}ms` }}
          title={action.label}
          type="button"
        >
          {action.icon}
        </button>
      ))}
    </div>
  );
}
