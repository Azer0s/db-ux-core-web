import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBCard, DBBadge, DBButton,
  DBText,
} from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <DBText style={[styles.sectionTitle, { color: c.subtle }]}>{title}</DBText>
      {children}
    </View>
  );
}

export default function CardShowcase() {
  const c = useScreenColors();
  const [tapCount, setTapCount] = useState(0);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBCard</DBText>
      <Section title="Elevation levels">
        <DBCard elevationLevel="1">
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Elevation 1</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>The default card level, sits on the page background.</DBText>
        </DBCard>
        <DBCard elevationLevel="2">
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Elevation 2</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>Slightly elevated, useful for grouped content.</DBText>
        </DBCard>
        <DBCard elevationLevel="3">
          <DBText style={[styles.cardTitle, { color: c.heading }]}>Elevation 3</DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>Highest elevation, for floating or modal-like cards.</DBText>
        </DBCard>
      </Section>

      <Section title="Interactive card">
        <DBCard behavior="interactive" elevationLevel="2" onClick={() => setTapCount((n) => n + 1)}>
          <DBText style={[styles.cardTitle, { color: c.heading }]}>
            Tap me{tapCount > 0 ? ` · tapped ${tapCount}×` : ""}
          </DBText>
          <DBText style={[styles.cardBody, { color: c.body }]}>Interactive cards respond to touch with a pressed state.</DBText>
        </DBCard>
      </Section>

      <Section title="Card with rich content">
        <DBCard elevationLevel="2">
          <View style={styles.cardHeader}>
            <DBText style={[styles.cardTitle, { color: c.heading }]}>ICE 573 · Hamburg → Berlin</DBText>
            <DBBadge semantic="successful">On time</DBBadge>
          </View>
          <DBText style={[styles.cardBody, { color: c.body }]}>Platform 7 · Departure 14:32 · Arrives 16:51</DBText>
          <View style={styles.cardFooter}>
            <DBButton variant="ghost">Details</DBButton>
            <DBButton>Book</DBButton>
          </View>
        </DBCard>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardFooter: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
});
