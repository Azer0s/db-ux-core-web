import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DBLink,
  DBBrand,
  DBNavigation,
  DBNavigationItem,
  DBButton,
  DBDivider,
} from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function NavigationShowcase() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Navigation</Text>

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
        <View style={styles.navContainer}>
          <DBNavigation>
            <DBNavigationItem label="Home" active />
            <DBNavigationItem label="Components" />
            <DBNavigationItem label="Foundations" />
            <DBNavigationItem label="Guidelines" />
          </DBNavigation>
        </View>
      </Section>

      <Section title="DBNavigationItem — States">
        <View style={styles.navContainer}>
          <DBNavigation>
            <DBNavigationItem label="Active" active />
            <DBNavigationItem label="Default" />
            <DBNavigationItem label="Another" />
          </DBNavigation>
        </View>
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
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 8, color: "#16181b" },
  section: { marginBottom: 16, gap: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600", color: "#5a5e68",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  navContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e1e2e6",
    overflow: "hidden",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
