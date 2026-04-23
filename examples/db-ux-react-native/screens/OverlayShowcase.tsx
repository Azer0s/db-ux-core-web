import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBTooltip, DBPopover, DBButton, DBBadge, DBCard,
  DBText,
} from "@db-ux/react-native-core-components";
import { useScreenColors } from "./theme";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const c = useScreenColors();
  return (
    <View style={styles.section}>
      <DBText style={[styles.sectionTitle, { color: c.muted }]}>{title}</DBText>
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
      <DBText style={[styles.heading, { color: c.heading }]}>Tooltips &amp; Popovers</DBText>
      <Section title="Tooltip — description">
        <View style={styles.row}>
          <DBTooltip variant="description">
            <DBButton>Hover / tap me</DBButton>
            <DBText variant="body">This tooltip describes the button action in more detail.</DBText>
          </DBTooltip>
        </View>
      </Section>

      <Section title="Tooltip — label">
        <View style={styles.row}>
          <DBTooltip variant="label" placement="top">
            <DBBadge semantic="informational">ⓘ</DBBadge>
            <DBText variant="body">Informational badge</DBText>
          </DBTooltip>
        </View>
      </Section>

      <Section title="Tooltip — placements">
        <View style={styles.placementGrid}>
          {(["top", "bottom", "left", "right"] as const).map((placement) => (
            <DBTooltip key={placement} variant="description" placement={placement}>
              <DBButton variant="ghost">{placement}</DBButton>
              <DBText variant="body">Tooltip on the {placement}</DBText>
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
            <DBText variant="heading" style={styles.popoverTitle}>Popover content</DBText>
            <DBText variant="body" style={styles.popoverBody}>
              Popovers can contain rich content like cards, lists, and actions.
            </DBText>
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
              <DBText variant="body" style={styles.popoverBody}>
                A popover is a floating panel anchored to a trigger element. It stays open until explicitly dismissed.
              </DBText>
            </View>
          </DBPopover>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  placementGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  popoverTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  popoverBody: { fontSize: 14, lineHeight: 20 },
  infoPopover: { padding: 12, maxWidth: 240 },
});
