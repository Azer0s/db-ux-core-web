import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBButton } from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.muted }]}>{title}</Text>
      <View style={styles.row}>{children}</View>
    </View>
  );
}

export default function ButtonShowcase() {
  const [pressCount, setPressCount] = useState(0);
  const c = useScreenColors();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.heading, { color: c.heading }]}>DBButton</Text>

      <Section title="Variants">
        <DBButton variant="outlined" onClick={() => setPressCount((n) => n + 1)}>
          Outlined
        </DBButton>
        <DBButton variant="filled" onClick={() => setPressCount((n) => n + 1)}>
          Filled
        </DBButton>
        <DBButton variant="ghost" onClick={() => setPressCount((n) => n + 1)}>
          Ghost
        </DBButton>
        <DBButton variant="brand" onClick={() => setPressCount((n) => n + 1)}>
          Brand
        </DBButton>
      </Section>

      <Section title="Sizes">
        <DBButton size="small">Small</DBButton>
        <DBButton size="medium">Medium (default)</DBButton>
      </Section>

      <Section title="States">
        <DBButton disabled>Disabled</DBButton>
        <DBButton variant="filled" disabled>
          Filled Disabled
        </DBButton>
      </Section>

      <Section title="Full Width">
        <View style={{ width: "100%" }}>
          <DBButton width="full">Full Width Button</DBButton>
        </View>
      </Section>

      {pressCount > 0 && (
        <Text style={styles.counter}>Pressed {pressCount} time{pressCount !== 1 ? "s" : ""} 🎉</Text>
      )}
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
  counter: {
    textAlign: "center",
    fontSize: 14,
    color: "#ec0016",
    marginTop: 8,
  },
});
