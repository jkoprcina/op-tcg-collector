# One Piece TCG Collector

An Expo React Native app to browse and track your One Piece Trading Card Game collection using the [OPTCG API](https://optcgapi.com/).

## Features

- 📋 **Browse Sets**: View a list of all One Piece TCG sets (OP-01 through OP-11).
- 🃏 **View Cards**: Tap a set to see cards within (endpoint discovery in progress).
- ✅ **Track Collection**: Mark cards as collected with a simple tap; state persists via AsyncStorage.

## Prerequisites

- [Node.js](https://nodejs.org/) v20.12+ (LTS recommended)
- [Expo Go](https://expo.dev/client) app installed on your phone (iOS/Android)

## Setup

1. **Clone/Navigate to the project folder:**

   ```bash
   cd C:\Users\koprc\OPTCGAPP\onepiece-collector
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

## Running the App

Start the Expo dev server:

```bash
npm start
```

Then:

- Scan the QR code with **Expo Go** on your device.
- Press `a` for Android emulator, or `i` for iOS simulator (macOS only).
- Press `w` to open in a web browser.

## Project Structure

```
onepiece-collector/
├── src/
│   ├── api/
│   │   └── optcg.ts         # API client for https://optcgapi.com
│   ├── components/
│   │   └── CardItem.tsx     # Card display with collected toggle
│   ├── hooks/
│   │   └── useCollectedCards.ts  # AsyncStorage persistence hook
│   ├── navigation/
│   │   └── index.tsx        # Stack navigator setup
│   ├── screens/
│   │   ├── SetsScreen.tsx   # Lists all sets
│   │   └── SetDetailScreen.tsx  # Shows cards in a set
│   └── types.ts             # Shared TypeScript types
├── App.tsx                   # Root component
└── package.json
```

## API Notes

The [OPTCG API](https://optcgapi.com/documentation) currently provides `/api/sets/card/{card_set_id}/` to fetch individual cards. A full sets list and cards-per-set endpoints are under investigation. For now:

- Sets are hardcoded (OP01–OP11) in `src/api/optcg.ts`.
- The `SetDetailScreen` displays a placeholder message until the cards endpoint is confirmed.

## Technologies

- **Expo SDK 53** (React Native 0.81)
- **React Navigation** (Native Stack)
- **AsyncStorage** for local persistence
- **Axios** for HTTP requests

## License

MIT

---

Created for One Piece TCG collectors. Data courtesy of [OPTCG API](https://optcgapi.com).
