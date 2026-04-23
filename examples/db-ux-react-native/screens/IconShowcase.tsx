import React, { useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import {
  DBIcon,
  DBText,
  DBBadge,
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

const ICON_GROUPS: { label: string; icons: string[] }[] = [
  {
    label: "Navigation",
    icons: ["home", "search", "menu", "close", "arrow-forward", "arrow-back", "arrow-upward", "arrow-downward"],
  },
  {
    label: "Actions",
    icons: ["add", "remove", "edit", "delete", "share", "download", "upload", "refresh"],
  },
  {
    label: "Status",
    icons: ["check-circle", "error", "warning", "info", "help", "notifications", "lock", "lock-open"],
  },
  {
    label: "Transport",
    icons: ["train", "directions-bus", "directions-walk", "directions-bike", "flight", "directions-car", "subway", "tram"],
  },
  {
    label: "Content",
    icons: ["favorite", "star", "bookmark", "thumb-up", "person", "group", "location-on", "calendar-today"],
  },
];

const SIZES = ["16", "20", "24", "32", "48"] as const;
type IconSize = typeof SIZES[number];

function IconTile({ name, size, onPress }: { name: string; size: IconSize; onPress: () => void }) {
  const c = useScreenColors();
  return (
    <Pressable
      style={[styles.iconTile, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      accessibilityLabel={name}
    >
      <DBIcon icon={name} weight={size} />
      <DBText style={[styles.iconLabel, { color: c.muted }]}>{name}</DBText>
    </Pressable>
  );
}

export default function IconShowcase() {
  const c = useScreenColors();
  const [selectedSize, setSelectedSize] = useState<typeof SIZES[number]>("24");
  const [lastTapped, setLastTapped] = useState<string | null>(null);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBIcon</DBText>

      <Section title="Size picker">
        <View style={styles.row}>
          {SIZES.map((s) => (
            <Pressable
              key={s}
              style={[styles.sizeBtn, { borderColor: s === selectedSize ? "#ec0016" : c.border, backgroundColor: s === selectedSize ? "#ffdada" : c.surface }]}
              onPress={() => setSelectedSize(s)}
            >
              <DBText style={[styles.sizeBtnLabel, { color: s === selectedSize ? "#c00010" : c.body }]}>{s}px</DBText>
            </Pressable>
          ))}
        </View>
        <View style={[styles.sizePreview, { backgroundColor: c.surface, borderColor: c.border }]}>
          <DBIcon icon="train" weight={selectedSize} />
        </View>
      </Section>

      {ICON_GROUPS.map(({ label, icons }) => (
        <Section key={label} title={label}>
          <View style={styles.grid}>
            {icons.map((name) => (
              <IconTile key={name} name={name} size={selectedSize} onPress={() => setLastTapped(name)} />
            ))}
          </View>
        </Section>
      ))}

      {lastTapped && (
        <View style={[styles.toast, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <DBText variant="body" style={{ color: c.heading }}>Tapped: </DBText>
          <DBText variant="body" weight="bold" style={{ color: c.heading }}>{lastTapped}</DBText>
          <DBBadge semantic="informational">{selectedSize}px</DBBadge>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  sizeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  sizeBtnLabel: { fontSize: 13, fontWeight: "600" },
  sizePreview: { width: 80, height: 80, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  iconTile: { width: 80, height: 72, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center", gap: 4, padding: 6 },
  iconLabel: { fontSize: 9, textAlign: "center" },
  toast: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1, marginTop: 8 },
});
