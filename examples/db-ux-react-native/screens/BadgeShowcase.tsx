import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBBadge } from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

export default function BadgeShowcase() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>DBBadge</Text>

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
  container: {
    padding: 20,
    gap: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#16181b",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5a5e68",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  placementContainer: {
    width: 40,
    height: 40,
    position: "relative",
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
  },
});
