import type { Metadata } from 'next';
import { textesDe } from '@curation/textes';
import { PageBientot } from '../../components/PageBientot.tsx';
import { langueDeLaRequete } from '../../lib/serveur.ts';

export async function generateMetadata(): Promise<Metadata> {
  return { title: textesDe(await langueDeLaRequete()).commun.notifications };
}

export default function Page() {
  return <PageBientot rubrique="notifications" />;
}
