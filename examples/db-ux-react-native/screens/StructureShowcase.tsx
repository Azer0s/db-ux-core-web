import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBSection,
  DBCard,
  DBDivider,
  DBText,
} from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function SectionDemo({ density, spacing }: { density: "functional" | "regular" | "expressive"; spacing: "none" | "small" | "medium" | "large" }) {
  const c = useScreenColors();
  return (
    <View style={{ marginBottom: 20 }}>
      <DBText style={[styles.label, { color: c.muted }]}>
        {density} · spacing: {spacing}
      </DBText>
      <DBSection density={density} spacing={spacing}>
        <DBCard elevationLevel={2}>
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Card One</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>
            This card sits inside a DBSection with {density} density and {spacing} spacing.
          </DBText>
        </DBCard>
        <DBCard elevationLevel={2}>
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Card Two</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>
            The section's background colour and padding are set by the density token.
          </DBText>
        </DBCard>
      </DBSection>
    </View>
  );
}

export default function StructureShowcase() {
  const c = useScreenColors();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: c.bg }]}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBSection</DBText>

      <DBText style={[styles.groupTitle, { color: c.heading }]}>Density: functional</DBText>
      <SectionDemo density="functional" spacing="small" />
      <SectionDemo density="functional" spacing="medium" />
      <SectionDemo density="functional" spacing="large" />

      <DBText style={[styles.groupTitle, { color: c.heading }]}>Density: regular</DBText>
      <SectionDemo density="regular" spacing="small" />
      <SectionDemo density="regular" spacing="medium" />
      <SectionDemo density="regular" spacing="large" />

      <DBText style={[styles.groupTitle, { color: c.heading }]}>Density: expressive</DBText>
      <SectionDemo density="expressive" spacing="small" />
      <SectionDemo density="expressive" spacing="medium" />
      <SectionDemo density="expressive" spacing="large" />

      <DBText style={[styles.groupTitle, { color: c.heading }]}>DBDivider</DBText>
      <DBText style={{ color: c.body, marginBottom: 8 }}>Above the divider</DBText>
      <DBDivider />
      <DBText style={{ color: c.body, marginTop: 8, marginBottom: 16 }}>Below the divider</DBText>

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
  groupTitle: { fontSize: 18, fontWeight: "600", marginTop: 24, marginBottom: 8 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  cardBody: { fontSize: 13, lineHeight: 19 },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
});
