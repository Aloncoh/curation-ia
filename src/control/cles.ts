// Contrôle et écriture des clés dans .env.local. Rien ici n'affiche, ne journalise ni n'envoie une clé.

export const CLES = {
  ANTHROPIC_API_KEY: { nom: 'Anthropic', format: /^sk-ant-[\w-]{20,}$/, attendu: 'elle commence par sk-ant-' },
  // DeepSeek ne documente pas le format de ses clés : seules les erreurs évidentes sont refusées.
  DEEPSEEK_API_KEY: { nom: 'DeepSeek', format: /^(?!sk-ant-)\S{20,}$/, attendu: 'une longue suite sans espace, différente d’une clé Anthropic' },
} as const;

export type NomCle = keyof typeof CLES;

export const cleValide = (nom: NomCle, valeur: string) => CLES[nom].format.test(valeur);

/** Remplace la ligne de la clé, ou l'ajoute. Les autres lignes du fichier ne changent pas. */
export function fusionnerCle(contenu: string, nom: NomCle, valeur: string): string {
  const lignes = contenu.split('\n');
  const position = lignes.findIndex((l) => l.startsWith(`${nom}=`));
  if (position >= 0) {
    lignes[position] = `${nom}=${valeur}`;
    return lignes.join('\n');
  }
  return `${contenu}${contenu === '' || contenu.endsWith('\n') ? '' : '\n'}${nom}=${valeur}\n`;
}
