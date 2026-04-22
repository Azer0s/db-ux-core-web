import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBTooltip, DBPopover, DBButton, DBBadge, DBCard } from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: c.subtle }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function OverlayShowcase() {
  const c = useScreenColors();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverInfoOpen, setPopoverInfoOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Tooltip — description">
        <View style={styles.row}>
          <DBTooltip variant="description">
            <DBButton>Hover / tap me</DBButton>
            <Text>This tooltip describes the button action in more detail.</Text>
          </DBTooltip>
        </View>
      </Section>

      <Section title="Tooltip — label">
        <View style={styles.row}>
          <DBTooltip variant="label" placement="top">
            <DBBadge semantic="informational">ⓘ</DBBadge>
            <Text>Informational badge</Text>
          </DBTooltip>
        </View>
      </Section>

      <Section title="Tooltip — placements">
        <View style={styles.placementGrid}>
          {(["top", "bottom", "left", "right"] as const).map((placement) => (
            <DBTooltip key={placement} variant="description" placement={placement}>
              <DBButton variant="ghost">{placement}</DBButton>
              <Text>Tooltip on the {placement}</Text>
            </DBTooltip>
          ))}
        </View>
      </Section>

      <Section title="Popover — basic">
        <DBButton onClick={() => setPopoverOpen(!popoverOpen)}>
          Toggle popover
        </DBButton>
        <DBPopover open={popoverOpen}>
          <DBCard elevationLevel="3">
            <Text style={[styles.popoverTitle, { color: c.heading }]}>Popover content</Text>
            <Text style={[styles.popoverBody, { color: c.body }]}>
              Popovers can contain rich content like cards, lists, and actions.
            </Text>
            <DBButton onClick={() => setPopoverOpen(false)}>Close</DBButton>
          </DBCard>
        </DBPopover>
      </Section>

      <Section title="Popover — informational">
        <View style={styles.row}>
          <DBButton variant="ghost" onClick={() => setPopoverInfoOpen(!popoverInfoOpen)}>
            What is this?
          </DBButton>
          <DBPopover open={popoverInfoOpen} placement="top">
            <View style={styles.infoPopover}>
              <Text style={[styles.popoverBody, { color: c.body }]}>
                A popover is a floating panel anchored to a trigger element. It stays open until explicitly dismissed.
              </Text>
            </View>
          </DBPopover>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  placementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  popoverTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  popoverBody: { fontSize: 14, lineHeight: 20 },
  infoPopover: { padding: 12, maxWidth: 240 },
});
