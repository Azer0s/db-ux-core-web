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
type Width = "small" | "medium" | "large" | "full";

function SimpleCard({ label }: { label: string }) {
  const c = useScreenColors();
  return <DBCard elevationLevel={2}><DBText style={{ color: c.heading, fontWeight: "600" }}>{label}</DBText></DBCard>;
}

function Demo({ label, density, spacing, width }: { label: string; density?: Density; spacing?: Spacing; width?: Width }) {
  const c = useScreenColors();
  return (
    <View style={styles.demo}>
      <DBText style={[styles.demoLabel, { color: c.muted }]}>{label}</DBText>
      <DBSection density={density} spacing={spacing} width={width}>
        <SimpleCard label="A" />
        <SimpleCard label="B" />
        <SimpleCard label="C" />
      </DBSection>
    </View>
  );
}

export default function StructureShowcase() {
  const c = useScreenColors();
  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: c.bg }]}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBSection</DBText>

      <DBText style={[styles.group, { color: c.heading }]}>width (each card's width)</DBText>
      <Demo label="small (80px)" width="small" spacing="medium" density="regular" />
      <Demo label="medium (120px)" width="medium" spacing="medium" density="regular" />
      <Demo label="large (180px)" width="large" spacing="medium" density="regular" />

      <DBDivider style={{ marginVertical: 20 }} />

      <DBText style={[styles.group, { color: c.heading }]}>density (gap between cards)</DBText>
      <Demo label="functional — 8px" width="medium" spacing="medium" density="functional" />
      <Demo label="regular — 16px" width="medium" spacing="medium" density="regular" />
      <Demo label="expressive — 24px" width="medium" spacing="medium" density="expressive" />

      <DBDivider style={{ marginVertical: 20 }} />

      <DBText style={[styles.group, { color: c.heading }]}>spacing (padding around group)</DBText>
      <Demo label="none" width="medium" spacing="none" density="regular" />
      <Demo label="small" width="medium" spacing="small" density="regular" />
      <Demo label="medium" width="medium" spacing="medium" density="regular" />
      <Demo label="large" width="medium" spacing="large" density="regular" />

      <DBDivider style={{ marginVertical: 20 }} />

      <DBText style={[styles.group, { color: c.heading }]}>Composition</DBText>
      <DBText style={[styles.demoLabel, { color: c.muted, paddingHorizontal: 0, marginBottom: 4 }]}>Side by side</DBText>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 20 }}>
        <DBSection width="small" spacing="small" density="regular">
          <SimpleCard label="A" /><SimpleCard label="B" />
        </DBSection>
        <DBSection width="small" spacing="small" density="regular">
          <SimpleCard label="C" /><SimpleCard label="D" />
        </DBSection>
      </View>

      <DBText style={[styles.demoLabel, { color: c.muted, paddingHorizontal: 0, marginTop: 12, marginBottom: 4 }]}>Stacked</DBText>
      <View style={{ gap: 8, paddingHorizontal: 20 }}>
        <DBSection width="medium" spacing="small" density="regular">
          <SimpleCard label="A" /><SimpleCard label="B" />
        </DBSection>
        <DBSection width="medium" spacing="small" density="functional">
          <SimpleCard label="C" /><SimpleCard label="D" />
        </DBSection>
      </View>

      <DBDivider style={{ marginVertical: 20 }} />

      <DBText style={[styles.group, { color: c.heading }]}>DBDivider</DBText>
      <View style={{ paddingHorizontal: 20 }}>
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
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 48 },
  heading: { fontSize: 24, fontWeight: "700", marginTop: 16, marginBottom: 8, paddingHorizontal: 20 },
  group: { fontSize: 17, fontWeight: "600", marginBottom: 8, paddingHorizontal: 20 },
  demo: { marginBottom: 4, paddingHorizontal: 20 },
  demoLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 20, marginBottom: 4 },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12 },
});
