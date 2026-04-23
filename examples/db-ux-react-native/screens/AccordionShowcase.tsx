import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBAccordion,
  DBAccordionItem,
  DBBadge,
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

const FAQ = [
  {
    headlinePlain: "What is the DB UX Design System?",
    content: "DB UX is Deutsche Bahn's design system for building consistent, accessible digital products across web and mobile platforms.",
  },
  {
    headlinePlain: "Is React Native supported?",
    content: "Yes — this showcase demonstrates the React Native port of the core component library, generated from the same Mitosis source as the web components.",
  },
  {
    headlinePlain: "Where can I find the source code?",
    content: "The generator lives in packages/components/scripts/post-build/react-native.ts inside the core-web monorepo.",
  },
  {
    headlinePlain: "Can I use custom fonts?",
    content: "Yes. Pass font require() paths to DBFontProvider and it loads them via expo-font, injecting the correct fontFamily into every component automatically.",
  },
];

export default function AccordionShowcase() {
  const c = useScreenColors();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBAccordion</DBText>

      <Section title="DBAccordion — items prop (auto)">
        <DBAccordion items={FAQ} />
      </Section>

      <Section title="DBAccordionItem — controlled (one open at a time)">
        {FAQ.map((item, i) => (
          <DBAccordionItem
            key={i}
            headlinePlain={item.headlinePlain}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <DBText variant="body" style={{ color: c.body }}>{item.content}</DBText>
          </DBAccordionItem>
        ))}
      </Section>

      <Section title="DBAccordionItem — with badge in header">
        <DBText variant="subtle" style={{ color: c.subtle, marginBottom: 10 }}>
          Controlled item: tap to expand "Train status" details.
        </DBText>
        <DBAccordionItem
          headlinePlain="Train status — ICE 617 Hamburg → Berlin"
          open={openIndex === 99}
          onToggle={() => setOpenIndex(openIndex === 99 ? null : 99)}
        >
          <View style={styles.statusRow}>
            <DBBadge semantic="successful" emphasis="strong">On time</DBBadge>
            <DBText variant="body" style={{ color: c.body }}>Platform 7 · Departs 14:22</DBText>
          </View>
        </DBAccordionItem>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  badgeHeader: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
});
