import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBCard, DBBadge, DBButton } from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function CardShowcase() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Elevation levels">
        <DBCard elevationLevel="1">
          <Text style={styles.cardTitle}>Elevation 1</Text>
          <Text style={styles.cardBody}>The default card level, sits on the page background.</Text>
        </DBCard>
        <DBCard elevationLevel="2">
          <Text style={styles.cardTitle}>Elevation 2</Text>
          <Text style={styles.cardBody}>Slightly elevated, useful for grouped content.</Text>
        </DBCard>
        <DBCard elevationLevel="3">
          <Text style={styles.cardTitle}>Elevation 3</Text>
          <Text style={styles.cardBody}>Highest elevation, for floating or modal-like cards.</Text>
        </DBCard>
      </Section>

      <Section title="Interactive card">
        <DBCard behavior="interactive" elevationLevel="1">
          <Text style={styles.cardTitle}>Tap me</Text>
          <Text style={styles.cardBody}>Interactive cards respond to touch with a pressed state.</Text>
        </DBCard>
      </Section>

      <Section title="Card with rich content">
        <DBCard elevationLevel="2">
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>ICE 573 · Hamburg → Berlin</Text>
            <DBBadge semantic="successful">On time</DBBadge>
          </View>
          <Text style={styles.cardBody}>Platform 7 · Departure 14:32 · Arrives 16:51</Text>
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
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#727782", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  cardFooter: { flexDirection: "row", gap: 8, marginTop: 12, justifyContent: "flex-end" },
});
