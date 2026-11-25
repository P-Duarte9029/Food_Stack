import { useSyncExternalStore } from 'react';
import { SectionLayout } from '../components/SectionLayout';
import { SubNav } from '../components/SubNav';
import { controlSectionFromHash } from '../navigation/control-sections';
import { HistoryScreen } from './control/HistoryScreen';
import { TablesMenuScreen } from './control/TablesMenuScreen';
import { TeamSection } from './TeamSection';

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

export function ControlScreen() {
  const section = controlSectionFromHash(useSyncExternalStore(subscribe, () => location.hash));

  return (
    <SectionLayout
      nav={
        <SubNav
          sidebarOnDesktop
          label="Seções do controle"
          tabs={[
            { href: '#/controle/cardapio', label: 'Mesas e cardápio', active: section === 'cardapio' },
            { href: '#/controle/equipe', label: 'Equipe', active: section === 'equipe' },
            { href: '#/controle/historico', label: 'Histórico', active: section === 'historico' },
          ]}
        />
      }
    >
      {section === 'cardapio' && <TablesMenuScreen />}
      {section === 'equipe' && (
        <div className="p-4 lg:p-0">
          <TeamSection />
        </div>
      )}
      {section === 'historico' && <HistoryScreen />}
    </SectionLayout>
  );
}
