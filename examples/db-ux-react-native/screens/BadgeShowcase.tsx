import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { DBBadge , DBText } from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <DBText style={[styles.sectionTitle, { color: c.subtle }]}>{title}</DBText>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

export default function BadgeShowcase() {
  const c = useScreenColors();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBBadge</DBText>

      <Section title="Semantic">
        <DBBadge>(Default) Adaptive</DBBadge>
        <DBBadge semantic="critical">Critical</DBBadge>
        <DBBadge semantic="informational">Informational</DBBadge>
        <DBBadge semantic="neutral">Neutral</DBBadge>
        <DBBadge semantic="successful">Successful</DBBadge>
        <DBBadge semantic="warning">Warning</DBBadge>
      </Section>

      <Section title="Emphasis (Strong)">
        <DBBadge emphasis="strong">Adaptive</DBBadge>
        <DBBadge semantic="critical" emphasis="strong">Critical</DBBadge>
        <DBBadge semantic="informational" emphasis="strong">Informational</DBBadge>
        <DBBadge semantic="successful" emphasis="strong">Successful</DBBadge>
        <DBBadge semantic="warning" emphasis="strong">Warning</DBBadge>
      </Section>

      <Section title="Sizes">
        <DBBadge size="small">Small</DBBadge>
        <DBBadge size="medium">Medium</DBBadge>
      </Section>

      <Section title="As Notification Counter (corner placement)">
        <View style={styles.placementContainer}>
          <View style={styles.iconPlaceholder} />
          <DBBadge placement="corner-top-right" label="3 notifications">
            3
          </DBBadge>
        </View>
        <View style={styles.placementContainer}>
          <View style={styles.iconPlaceholder} />
          <DBBadge placement="corner-top-right" semantic="critical" label="12 alerts">
            12
          </DBBadge>
        </View>
      </Section>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  placementContainer: { width: 40, height: 40, position: "relative" },
  iconPlaceholder: { width: 40, height: 40, backgroundColor: "#e5e7eb", borderRadius: 8 },
});

