// Mise en page racine : langue et sens d'écriture de la page entière (`lang`, `dir="rtl"` en hébreu), polices, thème.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource-variable/recursive';
import '@fontsource-variable/atkinson-hyperlegible-next';
import { sensDe, textesDe } from '@curation/textes';
import { langueDeLaRequete } from '../lib/serveur.ts';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const t = textesDe(await langueDeLaRequete());
  return {
    title: { default: t.commun.nomSite, template: `%s · ${t.commun.nomSite}` },
    description: t.commun.descriptionSite,
    applicationName: t.commun.nomSite,
    appleWebApp: { capable: true, title: t.commun.nomSite, statusBarStyle: 'default' },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fdfcfa' },
    { media: '(prefers-color-scheme: dark)', color: '#121116' },
  ],
};

export default async function Racine({ children }: { children: ReactNode }) {
  const langue = await langueDeLaRequete();
  const t = textesDe(langue);
  return (
    <html lang={langue} dir={sensDe(langue)}>
      <body>
        <a className="lien-evitement" href="#contenu">{t.commun.allerAuContenu}</a>
        {children}
      </body>
    </html>
  );
}
