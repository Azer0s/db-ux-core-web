import React, { useState } from "react";
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
  const [activeItem, setActiveItem] = useState("home");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>Navigation</DBText>

      <Section title="DBNavigation — basic">
        <DBNavigation>
          <DBNavigationItem label="Home" active={activeItem === "home"} onPress={() => setActiveItem("home")} />
          <DBNavigationItem label="Components" active={activeItem === "components"} onPress={() => setActiveItem("components")} />
          <DBNavigationItem label="Foundations" active={activeItem === "foundations"} onPress={() => setActiveItem("foundations")} />
          <DBNavigationItem label="Guidelines" active={activeItem === "guidelines"} onPress={() => setActiveItem("guidelines")} />
        </DBNavigation>
        <DBText variant="subtle" style={{ color: c.subtle, marginTop: 8 }}>Active: {activeItem}</DBText>
      </Section>

      <Section title="DBNavigation — with dropdowns (tap chevron items)">
        <DBNavigation>
          <DBNavigationItem label="Home" active />
          <DBNavigationItem
            label="Components"
            subNavigation={<>
              <DBNavigationItem label="Button" onPress={() => {}} />
              <DBNavigationItem label="Badge" onPress={() => {}} />
              <DBNavigationItem
                label="Form inputs"
                subNavigation={<>
                  <DBNavigationItem label="Input" onPress={() => {}} />
                  <DBNavigationItem label="Select" onPress={() => {}} />
                  <DBNavigationItem label="Checkbox" onPress={() => {}} />
                  <DBNavigationItem label="Radio" onPress={() => {}} />
                </>}
              />
              <DBNavigationItem label="Card" onPress={() => {}} />
              <DBNavigationItem label="Accordion" onPress={() => {}} />
            </>}
          />
          <DBNavigationItem
            label="Foundations"
            subNavigation={<>
              <DBNavigationItem label="Colors" onPress={() => {}} />
              <DBNavigationItem label="Typography" onPress={() => {}} />
              <DBNavigationItem label="Spacing" onPress={() => {}} />
              <DBNavigationItem label="Icons" onPress={() => {}} />
            </>}
          />
          <DBNavigationItem label="Guidelines" />
        </DBNavigation>
      </Section>

      <Section title="DBNavigation — vertical (drawer style)">
        <View style={[styles.verticalNav, { borderColor: c.border }]}>
          <DBNavigation direction="vertical">
            <DBNavigationItem label="Dashboard" active />
            <DBNavigationItem label="Journeys" />
            <DBNavigationItem
              label="Settings"
              subNavigation={<>
                <DBNavigationItem label="Account" onPress={() => {}} />
                <DBNavigationItem label="Notifications" onPress={() => {}} />
                <DBNavigationItem label="Privacy" onPress={() => {}} />
              </>}
            />
            <DBNavigationItem label="Help" />
          </DBNavigation>
        </View>
      </Section>

      <DBDivider />

      <Section title="DBLink">
        <DBLink href="https://design-system.deutschebahn.com">DB Design System</DBLink>
        <DBLink href="https://expo.dev">Expo Documentation</DBLink>
        <DBLink disabled>Disabled link</DBLink>
      </Section>

      <Section title="DBBrand">
        <DBBrand text="DB UX Design System" />
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
  verticalNav: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
});
