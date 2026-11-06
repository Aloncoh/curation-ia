// Déclencheur externe de la chaîne (ADR 0006, option B) : à chaque passage du cron Cloudflare, demande à GitHub de
// lancer le workflow `chaine.yml` (événement workflow_dispatch). GitHub n'exécute qu'un cycle à la fois (concurrency du
// workflow) : un passage pendant un cycle en cours attend, il ne s'empile pas. Aucune donnée n'est lue ni stockée ici.
// API GitHub lue le 2026-11-06 : POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches, corps { ref }.

/** @typedef {{ GITHUB_TOKEN: string, DEPOT: string, FLUX: string, BRANCHE: string }} Env */

export default {
  /** @param {unknown} _controleur @param {Env} env */
  async scheduled(_controleur, env) {
    if (!env.GITHUB_TOKEN) throw new Error('Secret GITHUB_TOKEN absent : rien n’est déclenché.');
    const reponse = await fetch(`https://api.github.com/repos/${env.DEPOT}/actions/workflows/${env.FLUX}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2026-03-10',
        'User-Agent': 'curation-declencheur',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: env.BRANCHE }),
    });
    // Le corps d'une erreur GitHub ne contient pas le jeton ; on n'en garde que le statut et le message.
    if (!reponse.ok) throw new Error(`GitHub a refusé le déclenchement : HTTP ${reponse.status} ${(await reponse.text()).slice(0, 200)}`);
  },
};
