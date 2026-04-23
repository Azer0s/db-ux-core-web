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

export default function StructureShowcase() {
  const c = useScreenColors();

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: c.bg }]}>
      <DBText style={[styles.heading, { color: c.heading }]}>Section &amp; Divider</DBText>

      <Label text="DBSection — spacing small" />
      <DBSection spacing="small" style={{ backgroundColor: c.surface, borderRadius: 8, marginBottom: 12 }}>
        <DBText style={{ color: c.body }}>Content inside a small-spacing section.</DBText>
      </DBSection>

      <Label text="DBSection — spacing medium (default)" />
      <DBSection style={{ backgroundColor: c.surface, borderRadius: 8, marginBottom: 12 }}>
        <DBText style={{ color: c.body }}>Content inside a medium-spacing section. This is the default spacing used when no prop is set.</DBText>
      </DBSection>

      <Label text="DBSection — spacing large" />
      <DBSection spacing="large" style={{ backgroundColor: c.surface, borderRadius: 8, marginBottom: 12 }}>
        <DBText style={{ color: c.body }}>Content inside a large-spacing section.</DBText>
      </DBSection>

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
  container: { padding: 20, paddingBottom: 48, gap: 4 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 16, marginBottom: 6 },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 4 },
});
