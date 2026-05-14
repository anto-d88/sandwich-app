# 🥪 La Pause Sandwich — Documentation Complète du Projet

## Présentation du projet

La Pause Sandwich est une plateforme de commande et de livraison pensée principalement pour les call-centers et entreprises autour de Tourcoing, Roubaix et Lille.

L’objectif du projet est de proposer :

- des sandwichs frais livrés à heures fixes
- des commandes individuelles
- des commandes d’équipe
- des formules personnalisables
- un système de gestion admin moderne
- un futur dashboard professionnel séparé
- une architecture évolutive permettant l’ajout d’agents IA, automatisations et outils business

Le projet a été développé progressivement avec une logique très orientée terrain : rapidité, simplicité d’utilisation, faible coût d’infrastructure et optimisation opérationnelle.

---

# 🎯 Vision du projet

Le projet ne se limite pas à un simple site de sandwich.

La vision globale est de construire :

- un système de livraison optimisé pour entreprises
- une infrastructure métier automatisée
- un dashboard professionnel moderne
- une base de données intelligente sur les clients
- des automatisations IA
- des outils de gestion d’entreprise connectés
- un système capable de scaler

Le développement suit une logique très importante :

> résoudre les vrais problèmes métier avant d’ajouter des fonctionnalités complexes.

---

# 🧱 Stack technique

## Backend

- Node.js
- Express
- Express Session
- Stripe
- Supabase
- EJS

## Frontend

- HTML
- CSS
- EJS
- JavaScript Vanilla

## Base de données

Supabase PostgreSQL

## Hébergement

- Render (backend principal)
- Vercel (dashboard admin futur)

## Paiement

Stripe Checkout

---

# 📁 Architecture générale

## Structure globale

```bash
/controllers
/services
/routes
/views
/public
/config
/utils
```

---

# 🧠 Philosophie d’architecture

Le projet a été construit avec plusieurs règles importantes.

## 1. Séparation claire des responsabilités

### Controllers

Gestion :

- des requêtes
- des validations
- des redirects
- du rendu EJS

### Services

Gestion :

- des accès BDD
- logique métier
- calculs
- Stripe
- stock
- clients

### Views

Affichage uniquement.

---

# 🥪 Fonctionnalités développées

## Commandes individuelles

### Fonctionnalités

- panier session
- ajout produit
- quantité
- paiement Stripe
- sauvegarde commande
- gestion stock
- confirmation commande

## Personnalisation sandwich

Mise en place d’un système de personnalisation :

### Crudités gratuites

- salade
- tomate
- carotte

### Suppléments payants

- œuf +0.50€
- tranche de fromage +0.50€

## Cas spécial jambon

Ajout du choix :

- beurre
- mayonnaise

---

# 👥 Commandes équipe

## Objectif

Permettre à une entreprise de :

- créer un lien partagé
- laisser chaque employé ajouter son repas
- payer en une seule fois

---

# 🧩 Système équipe développé

## Création commande équipe

Informations :

- nom équipe
- responsable
- téléphone
- adresse
- créneau

## Participation employés

Chaque participant peut ajouter :

- sandwich
- boisson
- dessert
- formule complète

---

# 💳 Paiement Stripe

## Workflow

### Individuel

```text
Panier → Checkout Stripe → Success → Création commande → Décrément stock
```

### Équipe

```text
Création équipe → Ajouts participants → Paiement Stripe → Validation → Décrément stock
```

---

# ⚠️ Problèmes rencontrés et solutions

# 1. Problème Stripe APP_URL

## Symptôme

Erreur :

```text
Invalid URL: An explicit scheme (such as https) must be provided.
```

## Cause

Variable APP_URL absente ou incorrecte.

## Solution

Ajout :

```env
APP_URL=http://localhost:3000
```

Puis en production :

```env
APP_URL=https://sandwich-app.onrender.com
```

---

# 2. Commandes non enregistrées après paiement

## Symptôme

Paiement validé mais aucune commande dans la BDD.

## Cause

Le callback Stripe redirigeait vers Render au lieu du localhost.

## Solution

Correction de APP_URL.

Ajout de logs :

```js
console.log("🔥 SUCCESS CALLBACK TRIGGERED");
console.log("SESSION ID:", req.query.session_id);
```

---

# 3. Colonnes manquantes Supabase

## Symptôme

Erreurs :

```text
Could not find column delivery_slot_label
Could not find column line_total
```

## Cause

Structure BDD incomplète.

## Solution

Ajout colonnes :

```sql
ALTER TABLE orders ADD COLUMN delivery_slot_label TEXT;
ALTER TABLE order_items ADD COLUMN line_total NUMERIC;
```

---

# 4. Gestion du stock

## Ancien problème

Le stock baissait avant paiement.

## Risque

- faux stocks
- commandes abandonnées
- incohérence inventaire

## Solution

Le stock est décrémenté uniquement :

```text
après confirmation Stripe paid
```

---

# 5. Commandes équipe “brouillon”

## Problème identifié

Les commandes ouvertes polluaient les stats.

## Solution

Ajout de statuts :

- ouverte
- payée
- abandonnée

Le dashboard compte uniquement :

```text
status = payée
```

---

# 6. Commandes abandonnées

## Besoin

Nettoyer les anciennes commandes.

## Solution mise en place

Préparation système :

- commandes ouvertes
- passage futur automatique en abandonnée
- bouton suppression admin

---

# 7. Différence de logique menu.ejs / team-order-join.ejs

## Problème

Les pages n’utilisaient pas la même structure visuelle et logique.

## Solution

Harmonisation progressive :

- cartes produits
- crudités
- suppléments
- UX cohérente

---

# 8. Faux ajout dessert automatique

## Symptôme

Une mousse au chocolat apparaissait dans team_order_items.

## Analyse

Recherche :

- submit parasite
- formulaire mal fermé
- appel route add

## Diagnostic

Le service teamOrderService était propre.

La méthode utilisée :

```js
console.log(req.body)
```

pour tracer les appels.

---

# 📊 Dashboard Admin

## Objectif

Créer une interface moderne type SaaS.

## Technologies prévues

- React
- Vite
- Tailwind
- Recharts
- Lucide React

## Style visuel voulu

- dark mode
- glassmorphism
- graphiques modernes
- courbes
- cartes animées
- ambiance technologie / IA

---

# 📈 Dashboard actuel

## Fonctionnalités

- liste commandes
- statuts
- détail produits
- commandes équipe
- commandes individuelles
- total commandes
- filtres

## Améliorations prévues

- analytics trafic
- temps réel
- notifications
- sons
- graphiques avancés
- historique clients

---

# 🧠 Système client intelligent

## Objectif

Construire une base client intelligente.

## Données stockées

- nom
- téléphone
- email
- entreprise
- adresse
- historique
- interactions
- type client

## Catégories prévues

- entreprise
- responsable équipe
- client individuel
- prospect
- client régulier

---

# 🤖 Vision IA future

Le projet prépare une architecture compatible avec des agents IA.

## Agents envisagés

- comptabilité
- stock
- communication
- planification
- commercial
- analyse ventes
- notifications

---

# 🔒 Ligne conductrice du développement

## Règle numéro 1

Toujours résoudre le problème métier avant d’ajouter du design.

---

## Règle numéro 2

Tracer les bugs avec des logs simples.

Exemple :

```js
console.log(req.body)
console.log(session.id)
```

---

## Règle numéro 3

Ne jamais mélanger :

- logique métier
- affichage
- accès BDD

---

## Règle numéro 4

Les statistiques doivent être fiables.

Donc :

```text
Seules les commandes payées comptent.
```

---

## Règle numéro 5

Le système doit rester exploitable même sans IA.

L’IA doit améliorer le système.

Pas remplacer une architecture propre.

---

# 🚀 Processus de développement utilisé

## Méthode réelle utilisée

Le développement a été fait :

- étape par étape
- en conditions réelles
- avec tests manuels constants
- avec correction immédiate des bugs
- avec amélioration progressive UX + architecture

---

# 🧪 Méthode de debug utilisée

## 1. Identifier précisément le moment du bug

## 2. Ajouter logs simples

## 3. Vérifier :

- req.body
- Stripe session
- BDD
- redirect
- stock

## 4. Corriger progressivement

---

# 📦 Tables principales Supabase

## orders

Commandes individuelles.

## order_items

Produits des commandes individuelles.

## team_orders

Commandes d’équipe.

## team_order_items

Produits des commandes équipe.

## customers

Base client.

---

# 🧾 Exemple de logique métier importante

## Exemple : décrément stock

```text
NE PAS décrémenter avant paiement.
```

Sinon :

- faux inventaire
- commandes fantômes
- pertes

---

# 🎨 UX / Expérience utilisateur

Le projet vise :

- rapidité
- simplicité
- lisibilité
- mobile first
- workflow ultra fluide

---

# 📌 État actuel du projet

## Fonctionnel

✅ commandes individuelles
✅ commandes équipe
✅ Stripe
✅ stock
✅ dashboard admin
✅ personnalisation sandwich
✅ formules
✅ gestion statuts
✅ gestion clients

## En préparation

🚧 analytics trafic
🚧 dashboard séparé ultra moderne
🚧 automatisations
🚧 agents IA
🚧 notifications avancées
🚧 nettoyage automatique
🚧 statistiques avancées

---

# 🏁 Conclusion

Le projet La Pause Sandwich est devenu progressivement :

- un outil métier réel
- une architecture scalable
- une base solide pour automatisation future
- un système pensé terrain
- une plateforme pouvant évoluer vers un véritable SaaS de gestion restauration/livraison entreprise.

Le développement a montré l’importance :

- d’une architecture claire
- du debug progressif
- de la séparation des responsabilités
- de la logique métier avant le design
- d’un système fiable avant l’automatisation avancée.

