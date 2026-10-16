# Wergu — Architecture multi-comptes (proposition)

Cette branche est un chantier séparé de main. Le code de l'application existante doit être importé avant migration.

## Modules
- Authentification et sessions
- Profils et préférences
- Aujourd'hui / tableau de bord
- Course, marche et entraînement
- Nutrition et hydratation
- Sommeil
- Finances, budgets, épargne et analyse avancée
- Progression et graphiques
- Paramètres, sauvegarde et synchronisation

## Sécurité
Chaque enregistrement appartient à auth.uid(). Activer RLS sur toutes les tables personnelles, ne jamais exposer la clé service_role au navigateur, et tester l'accès croisé entre deux comptes.

## Migration
1. Sauvegarder les données locales existantes.
2. Importer le code PWA actuel sans régression.
3. Ajouter l'authentification et la création de profil.
4. Créer les tables privées et les politiques RLS.
5. Proposer une migration locale explicite après connexion au bon compte, sans effacer la source avant vérification.
6. Tester hors ligne, synchronisation, graphiques et installation Android.

## Déploiement
Aucun déploiement automatique n'est configuré par ce document. Prévoir une prévisualisation de branche distincte de la production.
