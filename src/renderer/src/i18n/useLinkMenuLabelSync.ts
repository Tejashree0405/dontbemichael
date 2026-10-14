import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Keep the right-click "Copy link address" item in the owner's language.
 *
 * Mounted once, near the root. The menu is built by the main process, which
 * does not know the language the owner picked in Settings, so the renderer
 * sends the translated label on start and again on every language switch.
 */
export function useLinkMenuLabelSync(): void {
  const { t, i18n } = useTranslation();
  const label = t('common.copyLinkAddress');
  useEffect(() => {
    window.cth.setLinkMenuLabel?.(label);
  }, [label, i18n.language]);
}
