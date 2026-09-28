# DABubble

**Real-time chat with Angular 22 and Firebase**

![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth%20%26%20Firestore-FFCA28?logo=firebase&logoColor=black)
![SCSS](https://img.shields.io/badge/SCSS-CC6699?logo=sass&logoColor=white)

**Live demo** · [dabubble-3272.developerakademie.net](https://dabubble-3272.developerakademie.net/)

A Slack-style chat application with channels, direct messages, threads and
emoji reactions. Built as a group project at the Developer Akademie.

## Features

- **Account & sign-in**: registration with avatar selection, login via email, Google or as a guest, password reset
- **Channels**: create, rename, describe, add members or leave
- **Direct messages**: private conversations with any member
- **Threads**: replies to individual messages, in channels and direct messages
- **Reactions & emojis**: emoji picker while writing, reactions with a counter and an overview of who reacted
- **Mentions**: `@` for members, `#` for channels, with autocomplete
- **Search**: searches messages, channels and members
- **Profile**: change name and avatar later on
- **Responsive**: optimised down to 320 px screen width

## Built with Angular

- **Standalone components**: no NgModule, every component brings its own dependencies
- **Signals**: `signal`, `computed` and `effect` for all UI state, `input()` and `output()` for communication between components
- **New control flow syntax**: `@if`, `@for` and `@switch` instead of structural directives
- **Reactive forms**: validation with custom error messages below the fields
- **Lazy loading**: every page is loaded only when it is opened
- **Route guard**: the workspace is reachable for signed-in users only
- **Server-side rendering**: static pages are prerendered, everything tied to Firebase runs in the browser

## Tech stack

| Area       | Technology                               |
| ---------- | ---------------------------------------- |
| Frontend   | Angular 22                               |
| Languages  | TypeScript (strict mode), HTML, SCSS     |
| Backend    | Firebase Authentication, Cloud Firestore |
| Tests      | Vitest                                   |
| Formatting | Prettier                                 |

## Code style

- A function does exactly one thing
- At most 400 lines per TypeScript file
- camelCase for variables and functions, PascalCase for classes, kebab-case for CSS classes
- CSS classes follow BEM (`block__element--modifier`), SCSS with nesting and shared colour variables
- All classes, services and methods are documented with TSDoc

## Running locally

**Requirements:** Node.js and your own Firebase project with Authentication enabled (email, Google, anonymous) and Firestore.

```bash
git clone https://github.com/ChristopherBraun196/DA-Bubble.git
cd DA-Bubble
npm install
```

The Firebase configuration is not part of the repository. Copy the template and fill in your own credentials:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.development.ts
```

Then start it:

```bash
npm start
```

The app opens at `http://localhost:4200`.

## Project structure

```
src/app/
├── core/       Services, models and guards for Firebase access
├── pages/      Pages and components, grouped by feature
└── shared/     Reusable components (emoji picker, mention dropdown, avatar picker)
```

## Team

- [Moritz Böhm](https://github.com/mlb27)
- [Adrian Bieber](https://github.com/abieber23)
- [Christopher Braun](https://github.com/ChristopherBraun196)

## License

The source code is available under the [MIT License](LICENSE).
Design and graphics come from the Developer Akademie and are excluded from it.
