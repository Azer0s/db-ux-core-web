import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DBCard,
  DBDivider,
  DBStack,
  DBAccordion,
  DBButton,
  DBBadge,
} from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function LayoutShowcase() {
  const [pressCount, setPressCount] = useState(0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Layout</Text>

      <Section title="DBCard — Static">
        <DBCard>
          <Text style={styles.cardTitle}>Simple Card</Text>
          <Text style={styles.cardBody}>
            Cards are surface containers for related content and actions.
          </Text>
        </DBCard>
      </Section>

      <Section title="DBCard — Interactive (tappable)">
        <DBCard onClick={() => setPressCount((n) => n + 1)}>
          <Text style={styles.cardTitle}>Tappable Card</Text>
          <Text style={styles.cardBody}>Tap me! Pressed {pressCount} time{pressCount !== 1 ? "s" : ""}.</Text>
        </DBCard>
      </Section>

      <Section title="DBCard — With Badge">
        <DBCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ICE 617</Text>
            <DBBadge semantic="successful" emphasis="strong">On time</DBBadge>
          </View>
          <Text style={styles.cardBody}>Hamburg Hbf → Berlin Hbf · Departure 14:22</Text>
        </DBCard>
        <DBCard>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>RE 4</Text>
            <DBBadge semantic="warning">5 min late</DBBadge>
          </View>
          <Text style={styles.cardBody}>Dortmund → Aachen · Departure 14:35</Text>
        </DBCard>
      </Section>

      <Section title="DBDivider">
        <Text style={styles.note}>Horizontal (default)</Text>
        <DBDivider />
        <Text style={styles.note}>Horizontal again</Text>
        <DBDivider />
        <View style={styles.verticalRow}>
          <Text style={styles.note}>Left</Text>
          <DBDivider variant="vertical" />
          <Text style={styles.note}>Right</Text>
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
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 8, color: "#16181b" },
  section: { marginBottom: 16, gap: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600", color: "#5a5e68",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#16181b", marginBottom: 4 },
  cardBody: { fontSize: 14, color: "#5a5e68", lineHeight: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  note: { fontSize: 13, color: "#727782" },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12, height: 32 },
});
