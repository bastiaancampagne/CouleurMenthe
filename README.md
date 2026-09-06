# Couleur Menthe PWA v1

Transformation du projet Android **CouleurMenthe_v6** en Progressive Web App statique.

## Fonctions conservées
- Connexion Google OAuth.
- Gmail en lecture seule.
- Courriels importants ou étoilés.
- Exclusion : spam, promotions, réseaux sociaux et forums.
- Tri des courriels du plus récent au plus ancien.
- Ouverture d’un courriel via son lien Gmail.
- Google Agenda en lecture seule.
- Période : aujourd’hui + J+1 + J+2 + J+3.
- Tri chronologique des événements.
- Ouverture d’un événement dans Google Agenda.
- Actualisation au lancement après connexion et via ↻.
- Aucune notification et aucune tâche d’arrière-plan.
- Barre de navigation fixe : Accueil / Courriels / Agenda / Favoris / Paramètres.
- Personnages en arrière-plan plein écran ; cartes et boutons translucides au premier plan.
- Bastiaan (31) TM en bas de page.

## Différence importante entre Android et PWA
Le client OAuth **Android** du projet d’origine ne peut pas être réutilisé tel quel dans une page Web.
La PWA nécessite un client OAuth 2.0 Google de type **Application Web**.

Une PWA statique ne doit pas contenir de secret client. Cette version utilise Google Identity Services
et un jeton d’accès temporaire. Quand le jeton expire, il faut se reconnecter. C’est volontaire et plus sûr.

## Configuration Google Cloud
1. Ouvrir le projet Google Cloud utilisé pour Couleur Menthe.
2. Vérifier que **Gmail API** et **Google Calendar API** sont activées.
3. Dans OAuth / Identifiants, créer un **ID client OAuth 2.0 > Application Web**.
4. Ajouter comme **Origine JavaScript autorisée** l’origine de votre PWA.
   Exemple GitHub Pages :
   `https://VOTRE-NOM.github.io`
5. Si l’écran de consentement est en mode Test, ajouter votre compte Google comme utilisateur test.
6. Ouvrir `config.js` et remplacer :
   `REMPLACEZ_PAR_VOTRE_CLIENT_ID_WEB.apps.googleusercontent.com`
   par le véritable ID client Web.
7. Publier le contenu du ZIP à la racine de votre dépôt GitHub Pages.
8. Faire une fois **Ctrl+F5** après le premier déploiement.

## Scopes demandés
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/calendar.readonly`

## Maquette
La maquette fournie est conservée dans :
`maquette/CouleurMenthe_maquette_reference.png`
