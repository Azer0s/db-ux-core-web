import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBHeader,
  DBBrand,
  DBButton,
  DBNavigationItem,
  DBNavigation,
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

function HeaderFrame({ children }: { children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={[styles.frame, { borderColor: c.border, overflow: "hidden" }]}>
      {children}
    </View>
  );
}

export default function HeaderShowcase() {
  const c = useScreenColors();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerOpen2, setDrawerOpen2] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBHeader</DBText>

      <Section title="Minimal — brand only">
        <HeaderFrame>
          <DBHeader brand={<DBBrand text="DB UX" />} />
        </HeaderFrame>
      </Section>

      <Section title="With navigation items">
        <HeaderFrame>
          <DBHeader brand={<DBBrand text="DB UX" />}>
            <DBNavigation>
              <DBNavigationItem label="Home" active />
              <DBNavigationItem label="Components" />
              <DBNavigationItem label="Foundations" />
            </DBNavigation>
          </DBHeader>
        </HeaderFrame>
      </Section>

      <Section title="With navigation dropdowns">
        <HeaderFrame>
          <DBHeader brand={<DBBrand text="DB UX" />}>
            <DBNavigation>
              <DBNavigationItem label="Home" active />
              <DBNavigationItem
                label="Components"
                subNavigation={<>
                  <DBNavigationItem label="Button" onPress={() => {}} />
                  <DBNavigationItem label="Badge" onPress={() => {}} />
                  <DBNavigationItem
                    label="Form"
                    subNavigation={<>
                      <DBNavigationItem label="Input" onPress={() => {}} />
                      <DBNavigationItem label="Select" onPress={() => {}} />
                      <DBNavigationItem label="Checkbox" onPress={() => {}} />
                      <DBNavigationItem label="Radio" onPress={() => {}} />
                    </>}
                  />
                  <DBNavigationItem label="Card" onPress={() => {}} />
                </>}
              />
              <DBNavigationItem
                label="Foundations"
                subNavigation={<>
                  <DBNavigationItem label="Colors" onPress={() => {}} />
                  <DBNavigationItem label="Typography" onPress={() => {}} />
                  <DBNavigationItem label="Spacing" onPress={() => {}} />
                </>}
              />
            </DBNavigation>
          </DBHeader>
        </HeaderFrame>
      </Section>

      <Section title="With actions">
        <HeaderFrame>
          <DBHeader
            brand={<DBBrand text="DB UX" />}
            primaryAction={<DBButton variant="brand" size="small">Book</DBButton>}
            secondaryAction={<DBButton variant="ghost" size="small" icon="person" noText>Account</DBButton>}
          >
            <DBNavigation>
              <DBNavigationItem label="Journeys" active />
              <DBNavigationItem label="Tickets" />
            </DBNavigation>
          </DBHeader>
        </HeaderFrame>
      </Section>

      <Section title="With burger menu drawer">
        <DBText variant="subtle" style={{ color: c.subtle, marginBottom: 10 }}>
          The hamburger button opens a side drawer with navigation content.
        </DBText>
        <DBButton
          variant="outlined"
          icon="menu"
          onClick={() => setDrawerOpen(true)}
        >
          Open header with drawer
        </DBButton>
        <DBHeader
          brand={<DBBrand text="DB UX" />}
          drawerOpen={drawerOpen}
          onToggle={(open) => setDrawerOpen(open)}
          closeButtonText="Close menu"
        >
          <DBNavigation>
            <DBNavigationItem label="Home" active />
            <DBNavigationItem label="Timetable" />
            <DBNavigationItem label="My Journeys" />
            <DBNavigationItem label="Settings" />
          </DBNavigation>
        </DBHeader>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  frame: { borderWidth: 1, borderRadius: 8, overflow: "hidden" },
});
