import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBSection,
  DBCard,
  DBDivider,
  DBText,
} from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

type Spacing = "none" | "small" | "medium" | "large";
type Density = "functional" | "regular" | "expressive";

const SPACINGS: Spacing[] = ["none", "small", "medium", "large"];

function SectionRow({ density, spacing }: { density: Density; spacing: Spacing }) {
  const c = useScreenColors();
  return (
    <View style={styles.row}>
      <DBText style={[styles.rowLabel, { color: c.muted }]}>{spacing}</DBText>
      <DBSection density={density} spacing={spacing}>
        <View style={styles.cardRow}>
          <DBCard elevationLevel={2}><DBText style={{ color: c.heading, fontWeight: "600" }}>Card A</DBText></DBCard>
          <DBCard elevationLevel={2}><DBText style={{ color: c.heading, fontWeight: "600" }}>Card B</DBText></DBCard>
          <DBCard elevationLevel={2}><DBText style={{ color: c.heading, fontWeight: "600" }}>Card C</DBText></DBCard>
        </View>
      </DBSection>
    </View>
  );
}

export default function StructureShowcase() {
  const c = useScreenColors();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: c.bg }]}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBSection</DBText>

      {/* Spacing progression — regular density */}
      <DBText style={[styles.groupTitle, { color: c.heading }]}>Spacing — regular density</DBText>
      <DBText style={[styles.hint, { color: c.muted }]}>
        The section's blue background and vertical padding grow with spacing.
      </DBText>
      {SPACINGS.map((s) => <SectionRow key={s} density="regular" spacing={s} />)}

      <DBDivider style={{ marginVertical: 24 }} />

      {/* Density comparison at medium spacing */}
      <DBText style={[styles.groupTitle, { color: c.heading }]}>Density — medium spacing</DBText>
      <DBText style={[styles.hint, { color: c.muted }]}>
        Same spacing label, different padding values per density.
      </DBText>
      {(["functional", "regular", "expressive"] as Density[]).map((d) => (
        <View key={d} style={styles.row}>
          <DBText style={[styles.rowLabel, { color: c.muted }]}>{d}</DBText>
          <DBSection density={d} spacing="medium">
            <View style={styles.cardRow}>
              <DBCard elevationLevel={2}><DBText style={{ color: c.heading, fontWeight: "600" }}>Card A</DBText></DBCard>
              <DBCard elevationLevel={2}><DBText style={{ color: c.heading, fontWeight: "600" }}>Card B</DBText></DBCard>
            </View>
          </DBSection>
        </View>
      ))}

      <DBDivider style={{ marginVertical: 24 }} />

      {/* Dividers */}
      <DBText style={[styles.groupTitle, { color: c.heading }]}>DBDivider</DBText>
      <DBText style={{ color: c.body, marginBottom: 8 }}>Above</DBText>
      <DBDivider />
      <DBText style={{ color: c.body, marginTop: 8, marginBottom: 16 }}>Below</DBText>
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
  container: { paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: "700", marginTop: 16, marginBottom: 8, paddingHorizontal: 20 },
  groupTitle: { fontSize: 17, fontWeight: "600", marginBottom: 4, paddingHorizontal: 20 },
  hint: { fontSize: 13, marginBottom: 12, paddingHorizontal: 20 },
  row: { marginBottom: 2 },
  rowLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 20, marginBottom: 2 },
  cardRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20 },
});
