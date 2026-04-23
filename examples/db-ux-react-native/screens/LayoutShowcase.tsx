import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBCard,
  DBDivider,
  DBStack,
  DBAccordion,
  DBButton,
  DBBadge,
,
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

export default function LayoutShowcase() {
  const c = useScreenColors();
  const [pressCount, setPressCount] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>Layout</DBText>

      <Section title="DBCard — Static">
        <DBCard>
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Simple Card</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>
            Cards are surface containers for related content and actions.
          </DBText>
        </DBCard>
      </Section>

      <Section title="DBCard — Interactive (tappable)">
        <DBCard onClick={() => setPressCount((n) => n + 1)}>
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Tappable Card</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>Tap me! Pressed {pressCount} time{pressCount !== 1 ? "s" : ""}.</DBText>
        </DBCard>
      </Section>

      <Section title="DBCard — With Badge">
        <DBCard>
          <View style={styles.cardHeader}>
            <DBText style={[styles.cardTitle, { color: c.heading }]}>ICE 617</DBText>
            <DBBadge semantic="successful" emphasis="strong">On time</DBBadge>
          </View>
          <DBText style={[styles.cardBody, { color: c.body }]}>Hamburg Hbf → Berlin Hbf · Departure 14:22</DBText>
        </DBCard>
        <DBCard>
          <View style={styles.cardHeader}>
            <DBText style={[styles.cardTitle, { color: c.heading }]}>RE 4</DBText>
            <DBBadge semantic="warning">5 min late</DBBadge>
          </View>
          <DBText style={[styles.cardBody, { color: c.body }]}>Dortmund → Aachen · Departure 14:35</DBText>
        </DBCard>
      </Section>

      <Section title="DBDivider">
        <DBText style={[styles.note, { color: c.subtle }]}>Horizontal (default)</DBText>
        <DBDivider />
        <DBText style={[styles.note, { color: c.subtle }]}>Horizontal again</DBText>
        <DBDivider />
        <View style={styles.verticalRow}>
          <DBText style={[styles.note, { color: c.subtle }]}>Left</DBText>
          <DBDivider variant="vertical" />
          <DBText style={[styles.note, { color: c.subtle }]}>Right</DBText>
        </View>
      </Section>

      <Section title="DBStack — Vertical (default)">
        <DBStack>
          <DBButton>First</DBButton>
          <DBButton variant="outlined">Second</DBButton>
          <DBButton variant="ghost">Third</DBButton>
        </DBStack>
      </Section>

      <Section title="DBStack — Horizontal">
        <DBStack direction="row">
          <DBBadge>Alpha</DBBadge>
          <DBBadge semantic="informational">Beta</DBBadge>
          <DBBadge semantic="successful">Stable</DBBadge>
        </DBStack>
      </Section>

      <Section title="DBAccordion">
        <DBAccordion
          items={[
            { headlinePlain: "What is DB UX?", text: "DB UX is the Deutsche Bahn design system for building consistent digital products." },
            { headlinePlain: "Is React Native supported?", text: "Yes — this showcase demonstrates the React Native port of the core component library." },
            { headlinePlain: "Where can I find the source?", text: "The source lives in packages/components/scripts/post-build/react-native.ts in this monorepo." },
          ]}
        />
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
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  note: { fontSize: 13 },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 32 },
});
