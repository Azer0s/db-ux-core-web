# @db-ux/react-native-core-components

React Native components for the DB UX Design System v3.

This package is generated from the [core-web](https://github.com/db-ux-design-system/core-web) monorepo using [Mitosis](https://github.com/BuilderIO/mitosis).

## Installation

```bash
npm install @db-ux/react-native-core-components
```

## Usage

```tsx
import { DBButton, DBInput, DBCard } from '@db-ux/react-native-core-components';

export default function App() {
  return (
    <DBCard>
      <DBInput label="Name" value={name} onChangeText={setName} />
      <DBButton onPress={() => console.log('pressed')}>Submit</DBButton>
    </DBCard>
  );
}
```

## Components

All 37 DB UX Design System components are available as React Native components:

- **Layout**: `DBCard`, `DBStack`, `DBSection`, `DBPage`, `DBDivider`
- **Navigation**: `DBHeader`, `DBNavigation`, `DBNavigationItem`, `DBDrawer`, `DBTabs`, `DBTabList`, `DBTabItem`, `DBTabPanel`
- **Form**: `DBButton`, `DBCustomButton`, `DBInput`, `DBTextarea`, `DBCheckbox`, `DBRadio`, `DBSwitch`, `DBSelect`, `DBCustomSelect`
- **Feedback**: `DBNotification`, `DBBadge`, `DBTag`, `DBInfotext`, `DBTooltip`, `DBPopover`
- **Content**: `DBAccordion`, `DBAccordionItem`, `DBBrand`, `DBIcon`, `DBLink`

## Notes

- CSS-based styling from the web library is replaced with React Native `StyleSheet` objects
- `data-*` attributes are replaced with explicit props
- Web-only components like `DBPage` use `SafeAreaView` as the RN equivalent
- Modal-based components (`DBDrawer`, `DBTooltip`, `DBPopover`) use React Native `Modal`
- Icon rendering uses a text-based approach — integrate with your preferred icon library as needed

## License

Apache-2.0
