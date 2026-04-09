# @db-ux/react-native-core-components

[![React Native CI](https://github.com/Azer0s/db-ux-core-web/actions/workflows/react-native.yml/badge.svg)](https://github.com/Azer0s/db-ux-core-web/actions/workflows/react-native.yml)
![Apache 2.0 license badge](https://img.shields.io/badge/License-Apache_2.0-blue.svg)

React Native + Expo components for the [DB UX Design System v3](https://design-system.deutschebahn.com/), generated from the [core-web](https://github.com/db-ux-design-system/core-web) monorepo Mitosis sources via a custom post-build transformation pipeline.

All 37 components are hand-authored React Native implementations — no HTML elements, no CSS class names, no DOM APIs.

---

## Requirements

| Peer dependency                | Version   |
| ------------------------------ | --------- |
| `react`                        | `>=18`    |
| `react-native`                 | `>=0.72`  |
| `expo`                         | `>=51`    |
| `expo-router`                  | `>=3`     |
| `expo-haptics`                 | `>=13`    |
| `expo-blur`                    | `>=13`    |
| `expo-linking`                 | `>=6`     |
| `expo-status-bar`              | `>=1.12`  |
| `@expo/vector-icons`           | `>=14`    |
| `react-native-reanimated`      | `>=3`     |
| `react-native-safe-area-context` | `>=4`  |

---

## Installation

```bash
npm install @db-ux/react-native-core-components
```

All peer dependencies are already included in a standard Expo project (`npx create-expo-app`). If you are using a bare React Native project, install them manually:

```bash
npx expo install expo-router expo-haptics expo-blur expo-linking expo-status-bar @expo/vector-icons react-native-reanimated react-native-safe-area-context
```

### Required setup

Wrap your app root with `SafeAreaProvider` (required by `DBPage` and `DBHeader`):

```tsx
// app/_layout.tsx  (expo-router)
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack />
    </SafeAreaProvider>
  );
}
```

---

## Navigation with `DBNavigation`

`DBNavigation` renders as an `expo-router` `<Tabs>` navigator. It defaults to:
- `tabBarPosition: "top"` — tab bar at the top of the screen
- `headerShown: false` — no native header
- `tabBarIconStyle: { display: "none" }` — icons hidden (text-only tabs)

> **Important:** `DBNavigationItem` is a direct alias of `Tabs.Screen`. expo-router performs a strict `child.type === Tabs.Screen` reference check — only a true alias passes it.

```tsx
// app/(tabs)/_layout.tsx
import React from 'react';
import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import DBNavigation from '@db-ux/react-native-core-components/components/navigation';
import DBNavigationItem from '@db-ux/react-native-core-components/components/navigation-item';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <DBNavigation
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        tabBarButton: HapticTab,
      }}
    >
      <DBNavigationItem
        name="planungsdaten_screen"
        options={{ title: 'Planungsdaten' }}
      />
      <DBNavigationItem
        name="import_screen"
        options={{ title: 'Import' }}
      />
    </DBNavigation>
  );
}
```

---

## Usage

```tsx
import DBButton from '@db-ux/react-native-core-components/components/button';
import DBInput from '@db-ux/react-native-core-components/components/input';
import DBCard from '@db-ux/react-native-core-components/components/card';

export default function MyForm() {
  const [name, setName] = React.useState('');
  return (
    <DBCard>
      <DBInput label="Name" value={name} onChangeText={setName} />
      <DBButton onPress={() => console.log(name)}>Submit</DBButton>
    </DBCard>
  );
}
```

You can also import all components from the barrel:

```tsx
import { DBButton, DBInput, DBCard } from '@db-ux/react-native-core-components';
```

---

## Components

### Layout

| Component    | Description                                      | Expo API used               |
| ------------ | ------------------------------------------------ | --------------------------- |
| `DBPage`     | Root screen wrapper                              | `SafeAreaView`, `StatusBar` |
| `DBHeader`   | Top app bar                                      | `SafeAreaView` (top edge)   |
| `DBCard`     | Elevated card container (tappable if `onClick`)  | `TouchableOpacity`          |
| `DBStack`    | Flex container (horizontal/vertical)             | `View`                      |
| `DBSection`  | Semantic section wrapper                         | `View`                      |
| `DBDivider`  | Horizontal or vertical separator line            | `View`                      |

### Navigation

| Component          | Description                              | Expo API used            |
| ------------------ | ---------------------------------------- | ------------------------ |
| `DBNavigation`     | Top-level tab navigator                  | `expo-router` `Tabs`     |
| `DBNavigationItem` | Tab screen definition (alias of `Tabs.Screen`) | `expo-router` `Tabs.Screen` |
| `DBDrawer`         | Slide-in side drawer                     | `Modal` + `reanimated`   |
| `DBTabs`           | In-page tab switcher (not a navigator)   | `expo-haptics`           |
| `DBTabList`        | Tab bar for in-page tabs                 | `ScrollView`             |
| `DBTabItem`        | Single tab button                        | `TouchableOpacity`       |
| `DBTabPanel`       | Tab content panel                        | `View`                   |

### Forms

| Component          | Description                    | Notes                          |
| ------------------ | ------------------------------ | ------------------------------ |
| `DBButton`         | Primary action button          | Haptic feedback via `expo-haptics` |
| `DBCustomButton`   | Unstyled/custom button         | Haptic feedback via `expo-haptics` |
| `DBInput`          | Text input field               | `TextInput`                    |
| `DBTextarea`       | Multi-line text input          | `TextInput` multiline          |
| `DBCheckbox`       | Checkbox                       | Custom animated checkbox       |
| `DBRadio`          | Radio button group             | Custom radio                   |
| `DBSwitch`         | Toggle switch                  | `Switch`                       |
| `DBSelect`         | Dropdown select (native)       | `Modal` + `FlatList`           |
| `DBCustomSelect`   | Custom-styled select           | `Modal` + `FlatList` + haptics |

### Feedback

| Component        | Description               | Expo API used              |
| ---------------- | ------------------------- | -------------------------- |
| `DBNotification` | Alert/notification banner | `View` (dismissible)       |
| `DBBadge`        | Numeric or dot badge      | `View` + `Text`            |
| `DBTag`          | Removable tag chip        | `TouchableOpacity`         |
| `DBInfotext`     | Supplementary hint text   | `Text`                     |
| `DBTooltip`      | Overlay tooltip           | `Modal` + `expo-blur`      |
| `DBPopover`      | Floating content popover  | `Modal` + `expo-blur`      |

### Content

| Component        | Description               | Expo API used                  |
| ---------------- | ------------------------- | ------------------------------ |
| `DBAccordion`    | Collapsible group         | `reanimated` `withTiming`      |
| `DBAccordionItem`| Single accordion panel    | `reanimated` `useAnimatedStyle`|
| `DBIcon`         | Icon from design system   | `@expo/vector-icons` MaterialIcons |
| `DBLink`         | Tappable hyperlink        | `expo-linking`                 |
| `DBBrand`        | Brand/logo lockup         | `View` + `Text`                |

---

## Architecture

```
packages/components/src/             ← Mitosis source (framework-agnostic)
packages/components/configs/react-native/   ← Mitosis config (React target as base)
packages/components/scripts/post-build/react-native.ts  ← Transformation script
output/react-native/src/             ← Generated output (gitignored)
output/react-native/package.json     ← Package manifest (committed)
```

### Build pipeline

```
Mitosis source
    │  mitosis build (React target)
    ▼
output/tmp/react-native/react/src/   ← Raw React output
    │  post-build/react-native.ts
    │    ├─ Global transforms (strip HTML elements, data-* attrs, CSS classes)
    │    ├─ Web utility stubs (document-click-listener, floating-components, …)
    │    ├─ 37 hand-authored component overrides
    │    └─ Example file cleanup (remove className, convert role=)
    ▼
output/react-native/src/             ← Final React Native output
```

To regenerate the output after changing Mitosis sources or the post-build script:

```bash
npm -w @db-ux/core-components run compile:react-native
```

---

## Key differences from the web components

| Web                          | React Native                                  |
| ---------------------------- | --------------------------------------------- |
| CSS class names              | `StyleSheet` objects                          |
| `data-*` HTML attributes     | Explicit typed props                          |
| `<dialog>` / `<details>`     | `Modal` / animated `View`                    |
| `document` / `window` APIs  | Stubbed no-ops (not called at runtime)        |
| WAI-ARIA `role=`             | `accessibilityRole=`                          |
| `DBNavigation` → `<nav>`     | `expo-router` `<Tabs>`                        |
| `DBIcon` → `<i>` + CSS font  | `@expo/vector-icons` `MaterialIcons`          |
| `DBPage` → `<main>`          | `SafeAreaView` + `expo-status-bar`            |

---

## Building from source

```bash
# Clone the repo
git clone https://github.com/Azer0s/db-ux-core-web.git
cd db-ux-core-web

# Install dependencies (--ignore-scripts avoids chromedriver download)
npm install --ignore-scripts

# Generate the React Native output
npm -w @db-ux/core-components run compile:react-native

# Output is now in output/react-native/src/
```

---

## License

Apache-2.0 © Deutsche Bahn AG
