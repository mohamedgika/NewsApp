# The Daily Signal

A cross-platform React Native news reader built with Expo. It fetches current technology stories from the Hacker News Algolia API, lets readers save stories on the device, and includes configurable reading preferences and local test notifications.

## Run the app

Requirements: Node.js 20.19+ and npm.

```bash
npm install
npm run web
```

For a phone, run `npm start` and open the project with Expo Go, or use `npm run android` / `npm run ios` with the matching native development tools installed. Run `npm run check` to verify the production web bundle builds.

## Project links

- Public GitHub repository: https://github.com/mohamedgika/NewsApp
- Nine user stories: this file, [User Stories](#user-stories)
- Signup and login: [App.js](App.js)
- Home feed, story detail, and Hacker News API integration: [App.js](App.js)
- Local AsyncStorage persistence, settings, and notifications: [App.js](App.js)

Authentication is intentionally a local demonstration: signup stores a demo profile on the current device and login checks that profile. There is no account server, password recovery, or production credential security. Use a real authentication provider before deploying accounts to real users.

## User stories

1. As a returning reader, I want to sign in with the email and password saved on my device so I can open my personalized news feed.
2. As a new reader, I want to create a profile with my name, email, and password so the app can welcome me by name.
3. As a reader, I want a home feed of recent technology stories so I can scan what is happening today.
4. As a curious reader, I want to open a story's detail view so I can read its summary, source, author, and engagement information.
5. As a reader, I want to save and unsave stories so my favorites persist when I restart the app.
6. As a reader, I want to search fetched stories and refresh the feed so I can find current coverage relevant to me.
7. As a reader, I want an accessible settings menu and settings screen so I can change my display name and reading preferences.
8. As a reader, I want to turn daily briefing reminders on or off and send a test notification so I can verify notification setup.
9. As a reader, I want the app to recover gracefully from offline, loading, empty, and authentication-error states so I know what to do next.

## Peer review evidence checklist

Use the app on a phone or browser preview to capture actual screenshots. Keep each image in the project root with the exact filename requested. Do not present mockups as screenshots of the running app. The GitHub URLs below point to source in the public repository; update the branch name if you work on a different branch.

| Task | Artifact / review URL | App location or evidence note |
| --- | --- | --- |
| 1 | https://github.com/mohamedgika/NewsApp | Public repository |
| 2 | https://github.com/mohamedgika/NewsApp/blob/main/README.md | All nine user stories are above |
| 3 | `figma-evidence1.png` or `.jpg` | Figma deliverable: Login, Signup, Home, Detail, and Favorites/Profile. Running app screens are in `App.js`. |
| 4 | `figma-evidence2.png` or `.jpg` | Figma deliverable: API Home, Settings menu, Settings, and Notifications. |
| 5 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Local demo signup form and submit handler |
| 6 | `signup_screen_evidence.png` or `.jpg` | Signup screen: name, email, password, Create account, and sign-in link |
| 7 | `signup_error.png` or `.jpg` | Capture invalid email/password validation or the local-only demo notice. This repo has no learner-platform backend. |
| 8 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Local demo login form and submit handler |
| 9 | `login_screen_evidence.png` or `.jpg` | Login screen: email, password, sign-in button, and sign-up link |
| 10 | `login_error.png` or `.jpg` | Capture invalid credentials; first create a demo profile on this device. |
| 11 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Home/feed screen |
| 12 | `home-screen-evidence.png` or `.jpg` | Home feed and Signal logo in the header |
| 13 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Story detail screen |
| 14 | `evidence-detail-navigation.png` or `.jpg` | Home feed with a story row's open-detail arrow |
| 15 | `evidence-detail-screen.png` or `.jpg` | Story detail page with fetched item information |
| 16 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | AsyncStorage keys `@daily-signal/profile`, `@daily-signal/favorites`, and `@daily-signal/settings` |
| 17 | `evidence-persistence.png` or `.jpg` | Show a favorited story in Saved and device storage using an inspector or debugger. |
| 18 | `evidence-integrateScreen-persistence.png` or `.jpg` | Show the saved story in the UI and its matching ID/value in a storage inspector. |
| 19 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Hacker News Algolia API fetch and refresh handling |
| 20 | `evidence-api-ux.png` or `.jpg` | Home feed with live API results |
| 21 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Settings-menu open/close controls |
| 22 | `evidence-menu-icon.jpg` or `.png` | Home header with the settings gear |
| 23 | `evidence-menu-items.jpg` or `.png` | Open settings menu with its items visible |
| 24 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Settings screen |
| 25 | `evidence-settings-screen.png` or `.jpg` | Settings screen and saved reading preferences |
| 26 | https://github.com/mohamedgika/NewsApp/blob/main/App.js | Settings menu handler, implemented alongside the settings screen |
| 27 | `evidence-notification-configure.png` or `.jpg` | Notifications settings with the reminder toggle and test action |
| 28 | `evidence-notification-alert.png` or `.jpg` | Capture the delivered test notification on a physical device or in the browser after granting permission. |

Figma design files, screenshots, and an actually delivered OS notification require you to create/open the design or run the app in an interactive device/browser session. This scaffold does not claim those external artifacts have already been created.