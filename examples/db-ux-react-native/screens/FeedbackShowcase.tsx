import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBNotification,
  DBInfotext,
  DBTag,
, DBText } from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <DBText style={styles.sectionTitle}>{title}</DBText>
      {children}
    </View>
  );
}

export default function FeedbackShowcase() {
  const [tags, setTags] = useState(["Design System", "React Native", "DB UX", "Expo"]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={styles.heading}>Feedback</DBText>

      <Section title="DBNotification — Semantics">
        <DBNotification headline="Adaptive" text="This is a neutral notification." />
        <DBNotification headline="Informational" text="An update is available." semantic="informational" />
        <DBNotification headline="Successful" text="Your changes have been saved." semantic="successful" />
        <DBNotification headline="Warning" text="This action cannot be undone." semantic="warning" />
        <DBNotification headline="Critical" text="An error occurred. Please try again." semantic="critical" />
      </Section>

      <Section title="DBNotification — Closeable">
        <DBNotification
          headline="Closeable"
          text="Tap × to dismiss this notification."
          semantic="informational"
          closeable
        />
      </Section>

      <Section title="DBInfotext — Semantics">
        <View style={styles.stack}>
          <DBInfotext>Adaptive (default)</DBInfotext>
          <DBInfotext semantic="informational">Informational hint text</DBInfotext>
          <DBInfotext semantic="successful">Successful confirmation text</DBInfotext>
          <DBInfotext semantic="warning">Warning helper text</DBInfotext>
          <DBInfotext semantic="critical">Critical error message</DBInfotext>
        </View>
      </Section>

      <Section title="DBTag — Static">
        <View style={styles.row}>
          {["React Native", "Expo", "TypeScript", "DB UX"].map((label) => (
            <DBTag key={label} text={label} />
          ))}
        </View>
      </Section>

      <Section title="DBTag — Removable">
        <View style={styles.row}>
          {tags.map((label) => (
            <DBTag
              key={label}
              text={label}
              behavior="removable"
              onRemove={() => setTags((prev) => prev.filter((t) => t !== label))}
            />
          ))}
          {tags.length === 0 && <DBText style={styles.empty}>All tags removed</DBText>}
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 8, color: "#16181b" },
  section: { marginBottom: 16, gap: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600", color: "#5a5e68",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  stack: { gap: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  empty: { color: "#a6abb6", fontStyle: "italic" },
});
