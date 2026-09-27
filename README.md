# DABubble

**Echtzeit-Chat mit Angular 22 und Firebase**

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?logo=sass&logoColor=white)

**Live-Demo** · [dabubble-3272.developerakademie.net](https://dabubble-3272.developerakademie.net/)

Eine Chat-Anwendung im Stil von Slack mit Channels, Direktnachrichten, Threads und
Emoji-Reaktionen. Entstanden als Gruppenprojekt an der Developer Akademie.

## Features

- **Konto & Anmeldung**: Registrierung mit Avatar-Auswahl, Login per E-Mail, Google oder als Gast, Passwort zurücksetzen
- **Channels**: anlegen, umbenennen, beschreiben, Mitglieder hinzufügen oder verlassen
- **Direktnachrichten**: private Unterhaltungen mit jedem Mitglied
- **Threads**: Antworten auf einzelne Nachrichten, in Channels und Direktnachrichten
- **Reaktionen & Emojis**: Emoji-Picker beim Schreiben, Reaktionen mit Zähler und Übersicht, wer reagiert hat
- **Erwähnungen**: `@` für Mitglieder, `#` für Channels, mit Autovervollständigung
- **Suche**: durchsucht Nachrichten, Channels und Mitglieder
- **Profil**: Name und Avatar nachträglich ändern
- **Responsive**: optimiert bis 320 px Bildschirmbreite

## Umgesetzt mit Angular

- **Standalone Components**: kein NgModule, jede Komponente bringt ihre Abhängigkeiten selbst mit
- **Signals**: `signal`, `computed` und `effect` für den gesamten UI-State, `input()` und `output()` für die Kommunikation zwischen Komponenten
- **Neue Control-Flow-Syntax**: `@if`, `@for` und `@switch` statt Strukturdirektiven
- **Reactive Forms**: Validierung mit eigenen Fehlermeldungen unter den Feldern
- **Lazy Loading**: jede Seite wird erst beim Aufruf geladen
- **Route Guard**: der Workspace ist nur für angemeldete Nutzer erreichbar
- **Server-Side Rendering**: statische Seiten werden vorgerendert, alles mit Firebase-Anbindung läuft im Browser

## Tech-Stack

| Bereich      | Technologie                              |
| ------------ | ---------------------------------------- |
| Frontend     | Angular 22                               |
| Sprache      | TypeScript (Strict Mode), HTML, SCSS     |
| Backend      | Firebase Authentication, Cloud Firestore |
| Tests        | Vitest                                   |
| Formatierung | Prettier                                 |

## Code-Stil

- Eine Funktion erfüllt genau eine Aufgabe
- Höchstens 400 Zeilen pro TypeScript-Datei
- camelCase für Variablen und Funktionen, PascalCase für Klassen, kebab-case für CSS-Klassen
- CSS-Klassen nach BEM (`block__element--modifier`), SCSS mit Nesting und gemeinsamen Farbvariablen
- Alle Klassen, Services und Methoden sind mit TSDoc dokumentiert

## Lokal starten

**Voraussetzungen:** Node.js und ein eigenes Firebase-Projekt mit aktivierter Authentication (E-Mail, Google, Anonym) und Firestore.

```bash
git clone https://github.com/ChristopherBraun196/DA-Bubble.git
cd DA-Bubble
npm install
```

Die Firebase-Konfiguration ist nicht im Repository enthalten. Kopiere die Vorlage und trage deine eigenen Zugangsdaten ein:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.development.ts
```

Danach starten:

```bash
npm start
```

Die App öffnet sich unter `http://localhost:4200`.

## Projektstruktur

```
src/app/
├── core/       Services, Models und Guards für den Firebase-Zugriff
├── pages/      Seiten und Komponenten, nach Feature gruppiert
└── shared/     Wiederverwendbare Komponenten (Emoji-Picker, Mention-Dropdown, Avatar-Picker)
```

## Team

- [Moritz Böhm](https://github.com/mlb27)
- [Adrian Bieber](https://github.com/abieber23)
- [Christopher Braun](https://github.com/ChristopherBraun196)

## Lizenz

Der Quellcode steht unter der [MIT-Lizenz](LICENSE).
Design und Grafiken stammen von der Developer Akademie und sind davon ausgenommen.
