import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { DBStack, DBButton, DBDivider, DBText } from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <DBText variant="overline" style={styles.sectionTitle}>{title}</DBText>
      {children}
    </View>
  );
}

function Box({ label, color = "#e1e2e6" }: { label: string; color?: string }) {
  return (
    <View style={[styles.box, { backgroundColor: color }]}>
      <DBText variant="label" weight="bold">{label}</DBText>
    </View>
  );
}

export default function StackShowcase() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Column (default)">
        <DBStack direction="column" gap="small">
          <Box label="Item 1" />
          <Box label="Item 2" />
          <Box label="Item 3" />
        </DBStack>
      </Section>

      <Section title="Row">
        <DBStack direction="row" gap="small">
          <Box label="A" color="#cae6fd" />
          <Box label="B" color="#c3ff9d" />
          <Box label="C" color="#ffdbc8" />
        </DBStack>
      </Section>

      <Section title="Row with wrap">
        <DBStack direction="row" gap="small" wrap>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <Box key={d} label={d} color="#edeef0" />
          ))}
        </DBStack>
      </Section>

      <Section title="Alignment">
        <DBText variant="subtle" style={styles.subLabel}>start</DBText>
        <DBStack direction="row" gap="small" alignment="start">
          <Box label="tall" color="#cae6fd" />
          <View style={[styles.box, { height: 60, backgroundColor: "#c3ff9d" }]}>
            <DBText variant="label" weight="bold">tall</DBText>
          </View>
          <Box label="short" color="#ffdbc8" />
        </DBStack>
        <DBText variant="subtle" style={styles.subLabel}>center</DBText>
        <DBStack direction="row" gap="small" alignment="center">
          <Box label="tall" color="#cae6fd" />
          <View style={[styles.box, { height: 60, backgroundColor: "#c3ff9d" }]}>
            <DBText variant="label" weight="bold">tall</DBText>
          </View>
          <Box label="short" color="#ffdbc8" />
        </DBStack>
      </Section>

      <Section title="With divider">
        <DBStack direction="column" variant="divider" gap="medium">
          <DBText variant="body" style={styles.item}>First section</DBText>
          <DBDivider />
          <DBText variant="body" style={styles.item}>Second section</DBText>
          <DBDivider />
          <DBText variant="body" style={styles.item}>Third section</DBText>
        </DBStack>
      </Section>

      <Section title="Justify content">
        <DBText variant="subtle" style={styles.subLabel}>space-between</DBText>
        <DBStack direction="row" justifyContent="space-between">
          <DBButton variant="ghost">Cancel</DBButton>
          <DBButton>Confirm</DBButton>
        </DBStack>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { marginBottom: 4 },
  box: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  subLabel: { marginBottom: 2 },
  item: { paddingVertical: 4 },
});
