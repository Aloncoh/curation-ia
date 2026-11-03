'use server';
// Choix de la langue (ADR 0012) : mémorisé dans un cookie qui ne contient que la langue, puis la page est recalculée.
import { COOKIE_LANGUE, estLangue } from '@curation/textes';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export async function choisirLangue(donnees: FormData): Promise<void> {
  const langue = donnees.get('langue');
  if (!estLangue(langue)) return;
  (await cookies()).set(COOKIE_LANGUE, langue, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  revalidatePath('/', 'layout');
}
