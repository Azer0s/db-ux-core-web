import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBTag } from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.subtle }]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const SEMANTICS = ["neutral", "informational", "successful", "warning", "critical"] as const;

export default function TagShowcase() {
  const c = useScreenColors();
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Weak emphasis (default)">
        <Row>
          {SEMANTICS.map((sem) => (
            <DBTag key={sem} semantic={sem} emphasis="weak">{sem}</DBTag>
          ))}
        </Row>
      </Section>

      <Section title="Strong emphasis">
        <Row>
          {SEMANTICS.map((sem) => (
            <DBTag key={sem} semantic={sem} emphasis="strong">{sem}</DBTag>
          ))}
        </Row>
      </Section>

      <Section title="With icon">
        <Row>
          <DBTag semantic="informational" icon="information_circle">Info</DBTag>
          <DBTag semantic="successful" icon="check_circle">Done</DBTag>
          <DBTag semantic="warning" icon="warning">Warn</DBTag>
          <DBTag semantic="critical" icon="error">Error</DBTag>
        </Row>
      </Section>

      <Section title="Removable">
        <Row>
          {["Berlin", "Hamburg", "Munich", "Frankfurt", "Cologne"].map((city) =>
            removed.has(city) ? null : (
              <DBTag
                key={city}
                behavior="removable"
                onRemove={() => setRemoved((prev) => new Set([...prev, city]))}
              >
                {city}
              </DBTag>
            )
          )}
        </Row>
        {removed.size > 0 && (
          <Text style={[styles.hint, { color: c.subtle }]}>Removed: {[...removed].join(", ")}</Text>
        )}
      </Section>

      <Section title="Overflow (truncation)">
        <Row>
          <DBTag overflow="ellipsis">
            Very long tag label that will be truncated
          </DBTag>
        </Row>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontSize: 12, fontStyle: "italic" },
});
