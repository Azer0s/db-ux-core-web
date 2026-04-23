import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBLink, DBDivider,
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

export default function LinkShowcase() {
  const c = useScreenColors();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBLink</DBText>

      <Section title="Variants">
        <DBLink>Default link (blue)</DBLink>
        <DBLink variant="adaptive">Adaptive link (black)</DBLink>
        <DBLink variant="brand">Brand link (DB red)</DBLink>
      </Section>

      <DBDivider />

      <Section title="Content type">
        <DBLink content="internal">Internal link (→)</DBLink>
        <DBLink content="external">External link (↗)</DBLink>
        <DBLink variant="adaptive" content="internal">Adaptive internal</DBLink>
        <DBLink variant="brand" content="external">Brand external</DBLink>
      </Section>

      <DBDivider />

      <Section title="Inline (no arrow, sits in text)">
        <DBText style={[styles.bodyText, { color: c.body }]}>
          Learn more at the{" "}
          <DBLink content="inline">design system docs</DBLink>
          {" "}or read the{" "}
          <DBLink variant="adaptive" content="inline">adaptive inline link</DBLink>
          {" "}and the{" "}
          <DBLink variant="brand" content="inline">brand inline link</DBLink>.
        </DBText>
      </Section>

      <DBDivider />

      <Section title="Sizes">
        <DBLink size="medium">Medium link (default)</DBLink>
        <DBLink size="small">Small link</DBLink>
      </Section>

      <DBDivider />

      <Section title="With leading icon">
        <DBLink icon="download">Download PDF</DBLink>
        <DBLink icon="phone" variant="adaptive">Call support</DBLink>
        <DBLink icon="mail" variant="brand">Send email</DBLink>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  bodyText: { fontSize: 14, lineHeight: 22 },
});
