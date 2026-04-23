import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBSection,
  DBDivider,
  DBText,
} from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Label({ text }: { text: string }) {
  const c = useScreenColors();
  return <DBText style={[styles.label, { color: c.muted }]}>{text}</DBText>;
}

type Density = "functional" | "regular" | "expressive";
type Spacing = "none" | "small" | "medium" | "large";

const DENSITIES: Density[] = ["functional", "regular", "expressive"];
const SPACINGS: Spacing[] = ["none", "small", "medium", "large"];

export default function StructureShowcase() {
  const c = useScreenColors();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>Section &amp; Divider</DBText>

      {/* Density × Spacing grid */}
      {DENSITIES.map((density) => (
        <View key={density}>
          <DBText style={[styles.groupTitle, { color: c.heading }]}>
            Density: {density}
          </DBText>
          {SPACINGS.map((spacing) => (
            <View key={spacing} style={{ marginBottom: 4 }}>
              <Label text={`spacing: ${spacing}`} />
              <DBSection
                density={density}
                spacing={spacing}
                style={{ borderWidth: 1, borderColor: c.border, borderRadius: 8 }}
              >
                <DBText style={{ color: c.body }}>
                  {density} · {spacing}
                </DBText>
              </DBSection>
            </View>
          ))}
        </View>
      ))}

      <Label text="DBDivider — horizontal" />
      <View style={{ marginBottom: 4 }}>
        <DBText style={{ color: c.body, marginBottom: 8 }}>Above the divider</DBText>
        <DBDivider />
        <DBText style={{ color: c.body, marginTop: 8 }}>Below the divider</DBText>
      </View>

      <Label text="DBDivider — vertical (inside a row)" />
      <View style={styles.verticalRow}>
        <DBText style={{ color: c.body }}>Left</DBText>
        <DBDivider variant="vertical" />
        <DBText style={{ color: c.body }}>Middle</DBText>
        <DBDivider variant="vertical" />
        <DBText style={{ color: c.body }}>Right</DBText>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, paddingBottom: 48, gap: 4 },
  heading: { fontSize: 24, fontWeight: "700", marginTop: 16, marginBottom: 8 },
  groupTitle: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 4 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
});
