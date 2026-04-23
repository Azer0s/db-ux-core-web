import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBLink,
  DBBrand,
  DBNavigation,
  DBNavigationItem,
  DBButton,
  DBDivider,
  DBText,
} from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <DBText style={[styles.sectionTitle, { color: c.muted }]}>{title}</DBText>
      {children}
    </View>
  );
}

export default function NavigationShowcase() {
  const c = useScreenColors();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>Navigation</DBText>

      <Section title="DBLink">
        <DBLink href="https://design-system.deutschebahn.com">DB Design System</DBLink>
        <DBLink href="https://expo.dev">Expo Documentation</DBLink>
        <DBLink href="https://reactnative.dev">React Native Docs</DBLink>
        <DBLink disabled>Disabled link</DBLink>
      </Section>

      <Section title="DBBrand">
        <DBBrand text="DB UX Design System" />
        <DBBrand text="Core Web" />
      </Section>

      <Section title="DBNavigation + DBNavigationItem">
          <DBNavigation>
            <DBNavigationItem label="Home" active />
            <DBNavigationItem label="Components" />
            <DBNavigationItem label="Foundations" />
            <DBNavigationItem label="Guidelines" />
          </DBNavigation>
      </Section>

      <Section title="DBNavigationItem — States">
          <DBNavigation>
            <DBNavigationItem label="Active" active />
            <DBNavigationItem label="Default" />
            <DBNavigationItem label="Another" />
          </DBNavigation>
      </Section>

      <DBDivider />

      <Section title="DBButton variants (for reference)">
        <View style={styles.row}>
          <DBButton variant="brand">Brand</DBButton>
          <DBButton variant="filled">Filled</DBButton>
          <DBButton variant="outlined">Outlined</DBButton>
          <DBButton variant="ghost">Ghost</DBButton>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  section: { marginBottom: 16, gap: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
