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
        <DBLink variant="adaptive">Adaptive link (follows brand color)</DBLink>
        <DBLink variant="brand">Brand link (always red)</DBLink>
        <DBLink variant="inline">Inline link (no arrow, blends with text)</DBLink>
      </Section>

      <DBDivider />

      <Section title="Sizes">
        <DBLink size="medium">Medium link (default)</DBLink>
        <DBLink size="small">Small link</DBLink>
      </Section>

      <DBDivider />

      <Section title="With content type">
        <DBLink content="external">External link</DBLink>
        <DBLink content="internal">Internal link</DBLink>
      </Section>

      <DBDivider />

      <Section title="In context">
        <DBText style={[styles.bodyText, { color: c.body }]}>
          The DB UX Design System provides a comprehensive set of components for building
          consistent digital products. Learn more at the{" "}
          <DBLink variant="inline">design system documentation</DBLink>
          {" "}or explore the{" "}
          <DBLink variant="inline">component library on GitHub</DBLink>.
        </DBText>
      </Section>

      <DBDivider />

      <Section title="With icon">
        <DBLink showIcon>Navigate forward</DBLink>
        <DBLink showIcon>Download PDF</DBLink>
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
