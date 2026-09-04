# 🎩 Monopoly Banque FR - Compagnon Officiel de Jeu

Application web mobile-first, ultra-réactive et en temps réel, conçue pour gérer l'intégralité des flux financiers et des propriétés immobilières lors d'une partie de Monopoly sur plateau physique.

> **100% en Français** : Titres officiels des 28 propriétés (Rue de la Paix, Boulevard de Belleville, Gare Montparnasse, etc.), calculs automatisés des loyers, levées d'hypothèques conformes à la règle officielle (+10% d'intérêts), et interface sombre pensée pour smartphone.

---

## ✨ Fonctionnalités Clés

### 💳 1. Banque & Flux Financiers (Phase 1 MVP)
- **Création & Accès par Code Salon (4 lettres)** : L'hôte génère une partie avec capital de départ personnalisable (1 500 € par défaut) et endosse le rôle de Banquier.
- **Pions & Couleurs Officiels** : Chapeau (🎩), Chien (🐶), Voiture (🏎️), Bateau (🚢), Chat (🐱), Dé à coudre (🧵), Chaussure (👞), Brouette (🛒), Canard (🦆), T-Rex (🦖).
- **Actions Rapides en 1 Clic** :
  - `+200 €` : Case Départ (avec pluie de confettis et carillon bancaire).
  - `-50 €` : Sortie de Prison.
  - `-200 €` : Impôt sur le revenu.
  - `-100 €` : Taxe de luxe.
- **Virements Sécurisés** :
  - Joueur ↔ Joueur (sélection tactile, validation stricte de solde, motif optionnel).
  - Joueur ↔ Banque.
- **Console d'Arbitrage du Banquier** :
  - Droit de versement ou prélèvement direct sur n'importe quel joueur.
  - Annulation d'une transaction litigieuse avec réversion instantanée des soldes.
  - Ajustement manuel en cas d'erreur de saisie.
  - Réinitialisation de partie.
- **Journal d'Audit en Direct** :
  - Historique chronologique complet filtrable par joueur avec horodatage en temps réel.

### 🏠 2. Gestion Immobilière & Hypothèques (Phase 2)
- **Base Complète des 28 Propriétés Françaises** :
  - 22 Rues/Avenues réparties sur les 8 groupes de couleur.
  - 4 Gares parisiennes (Montparnasse, Lyon, Nord, Saint-Lazare).
  - 2 Compagnies de services publics (Électricité, Eaux).
- **Cartes de Titre de Propriété Authentiques** :
  - Bandeau couleur officiel, loyers par niveau (terrain nu, 1 à 4 maisons, hôtel).
  - Achat direct à la Banque en un clic avec déduction automatique.
- **Système d'Hypothèques Automatisé** :
  - *Hypothéquer* : Verse immédiatement 50% du prix d'achat au joueur, applique un ruban rouge et grise la carte. (Interdit s'il y a des bâtiments non revendus).
  - *Lever l'hypothèque* : Exige et déduit le capital + 10% d'intérêts (ex: terrain à 200 € -> hypothèque à 100 € -> levée d'hypothèque à 110 €).
- **Calculateur & Paiement Automatique de Loyer** :
  - Cliquez sur n'importe quelle propriété appartenant à un adversaire pour ouvrir le calculateur.
  - Gestion automatique du **double loyer** en cas de monopole sans maison.
  - Gestion automatique des **loyers de gares** (25 €, 50 €, 100 €, 200 €) selon le nombre de gares détenues par le propriétaire.
  - Gestion des **compagnies d'électricité et d'eau** avec curseur de jet de dés (x4 ou x10).
  - Bouton unique : `Payer [X €] à [Nom du Propriétaire]`.

---

## 🚀 Démarrage Rapide (Sur votre PC)

### Méthode 1 : Double-clic (Recommandé sur Windows)
1. Double-cliquez sur `lancer-serveur.bat` pour lancer le serveur.
2. Pour jouer depuis vos téléphones à l'extérieur (chez vos amis), double-cliquez en plus sur `lancer-tunnel.bat` et partagez le lien généré.

### Méthode 2 : En ligne de commande
```bash
# Se placer dans le dossier
cd monopoly-banque-fr

# 1. Compiler et démarrer le serveur (Terminal 1)
npm run build
npm start

# 2. Ouvrir l'accès pour vos smartphones extérieurs (Terminal 2)
npm run tunnel
```

---

## 📱 Comment jouer chez vos amis avec vos smartphones ?

1. **Sur votre PC chez vous** :
   - Désactivez la mise en veille automatique de Windows (pour que le PC ne s'éteigne pas pendant votre soirée).
   - Lancez le serveur (`lancer-serveur.bat` ou `npm start`).
   - Lancez le tunnel (`lancer-tunnel.bat` ou `npm run tunnel`).
   - Copiez l'adresse web générée (du type `https://xxxx.loca.lt`).

2. **Sur vos téléphones chez vos amis** :
   - Ouvrez le lien sur votre smartphone (Safari, Chrome...).
   - Créez la partie (Banquier) et notez le code à 4 lettres (ex: `PARI`).
   - Vos amis ouvrent le même lien sur leurs téléphones, entrent le code `PARI`, choisissent leur pion et leur nom.
   - Les soldes, achats de propriétés, loyers et carillons sont synchronisés en direct via WebSocket !

---

## 🛠️ Stack Technique

- **Frontend** : React 19, Vite, TypeScript
- **Styling** : Tailwind CSS v4 (Mobile-First, Dark Mode)
- **Icônes** : Lucide React
- **Audio & Haptique** : Synthétiseur Web Audio API (zéro asset lourd externe) + vibration tactile mobile
- **Effets** : Canvas Confetti pour les passages par la case Départ
