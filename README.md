# Saliou THIAW · Évolution — Android et Vercel

Application personnelle issue de l'archive v16. Interface et stockage local conservés. Installation Android par le manifeste et le service worker existants.

## Démarrage

Node.js 22.13 ou ultérieur. Exécuter `npm install`, puis `npm run dev`. Après la première installation réussie, conserver package-lock.json dans le dépôt et utiliser npm ci pour les installations suivantes.
Validation : `npm run typecheck` et `npm run build`.
Lancement de production : `npm start`.

## Vercel

Importer le dépôt GitHub privé dans Vercel. Choisir la branche `feat/android-vercel` pour la prévisualisation et Node.js 22.x. Le fichier vercel.json configure Next.js et npm. Aucune variable secrète n'est nécessaire pour les fonctions actuelles.

Ne fusionner dans main qu'après approbation explicite de Saliou. Préparer une pull request contenant les résultats des vérifications.

## Android

Ouvrir l'adresse HTTPS du déploiement dans Chrome. Dans Réglages, utiliser le bouton Installer si proposé, sinon le menu Chrome > Installer l'application / Ajouter à l'écran d'accueil. Tester ensuite l'ouverture depuis l'icône et le mode avion après une première utilisation en ligne.

## Données

Les journaux restent dans le navigateur de chaque appareil. Exporter les données depuis l'ancienne application puis les importer depuis Réglages sur la nouvelle adresse : les données ne changent pas automatiquement de domaine. Aucune synchronisation entre appareils ni authentification serveur n'est ajoutée. Une adresse de déploiement accessible peut afficher l'interface ; les journaux locaux ne sont pas hébergés sur Vercel.

## Migration

Les scripts Vinext/Cloudflare ont été remplacés par les commandes Next.js natives. Les fichiers de déploiement Sites, l'état Wrangler, les exemples D1 et les utilitaires serveur inutilisés ne sont pas inclus dans cette distribution. L'archive d'origine est conservée séparément.
