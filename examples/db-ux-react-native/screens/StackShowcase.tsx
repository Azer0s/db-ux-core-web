import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBStack, DBCard, DBBadge, DBButton, DBDivider } from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Box({ label, color = "#e1e2e6" }: { label: string; color?: string }) {
  return (
    <View style={[styles.box, { backgroundColor: color }]}>
      <Text style={styles.boxLabel}>{label}</Text>
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
        <Text style={styles.label}>start</Text>
        <DBStack direction="row" gap="small" alignment="start">
          <Box label="tall" color="#cae6fd" />
          <View style={[styles.box, { height: 60, backgroundColor: "#c3ff9d" }]}><Text style={styles.boxLabel}>tall</Text></View>
          <Box label="short" color="#ffdbc8" />
        </DBStack>
        <Text style={styles.label}>center</Text>
        <DBStack direction="row" gap="small" alignment="center">
          <Box label="tall" color="#cae6fd" />
          <View style={[styles.box, { height: 60, backgroundColor: "#c3ff9d" }]}><Text style={styles.boxLabel}>tall</Text></View>
          <Box label="short" color="#ffdbc8" />
        </DBStack>
      </Section>

      <Section title="With divider variant">
        <DBStack direction="column" variant="divider" gap="medium">
          <Text style={styles.item}>First section</Text>
          <DBDivider />
          <Text style={styles.item}>Second section</Text>
          <DBDivider />
          <Text style={styles.item}>Third section</Text>
        </DBStack>
      </Section>

      <Section title="Justify content">
        <Text style={styles.label}>space-between</Text>
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
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#727782", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  box: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  boxLabel: { fontSize: 13, fontWeight: "600", color: "#2e3036" },
  label: { fontSize: 12, color: "#727782", marginBottom: 2 },
  item: { fontSize: 15, color: "#2e3036", paddingVertical: 4 },
});
