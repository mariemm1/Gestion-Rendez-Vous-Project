# Gestion de Rendez-vous avec Notifications

## Description du projet

Ce projet est une application backend développée avec **Node.js**, **Express** et **MongoDB**, permettant la gestion complète des rendez-vous entre clients, professionnels de santé, et administrateurs. Il offre des fonctionnalités telles que la prise, la confirmation, l'annulation et la suppression de rendez-vous, ainsi qu’un système de notifications pour informer les utilisateurs des événements importants liés à leurs rendez-vous.

## Fonctionnalités principales

- Gestion des utilisateurs avec authentification et gestion des rôles (Client, Professionnel, Admin).
- Prise et gestion des rendez-vous (création, confirmation, annulation, suppression).
- Notifications en temps réel pour les actions clés (prise de rendez-vous, confirmation, annulation, rappels).
- Rôle **Admin** avec accès complet à toutes les données et notifications pour gestion/modération.
- Sécurité renforcée via JWT et contrôle d'accès strict selon le rôle et la propriété des données.
- Historique complet des rendez-vous pour chaque client.

## Architecture technique

- **Backend** : Node.js avec Express pour construire l'API REST.
- **Base de données** : MongoDB avec Mongoose pour la modélisation et la gestion des données.
- **Authentification** : JWT pour sécuriser les endpoints et gérer les permissions.
- **Contrôle d'accès** : Middlewares personnalisés pour vérifier les droits selon le rôle utilisateur.
- **Notifications** : Modèle flexible pour différents types de notifications (rendez-vous, annulation, rappel).

## Utilisation

- Les clients peuvent s'inscrire, se connecter et gérer leurs rendez-vous.
- Les professionnels peuvent confirmer les rendez-vous qui leur sont assignés.
- Les administrateurs ont un accès complet aux données pour la gestion et la modération.
- Chaque action génère une notification visible uniquement par l’utilisateur concerné, sauf pour l’admin qui voit toutes les notifications.
- Les utilisateurs peuvent marquer leurs notifications comme lues ou les supprimer.

## Diagramme de classes

Le diagramme ci-dessous présente les principales entités du système et leurs relations :

![Diagramme de classes](./diagrams/class_diagram.png)

### Description des entités principales

- **Client** : Représente l’utilisateur client avec son historique de rendez-vous.
- **Professionnel** : Représente le professionnel de santé avec ses spécialités et disponibilités.
- **Admin** : Utilisateur avec droits complets, accès global aux données.
- **RendezVous** : Contient les informations liées à un rendez-vous (date, heure, statut, références vers client et professionnel).
- **Notification** : Modélise les notifications envoyées aux utilisateurs, avec type, rôle destinataire, message, et état de lecture.


