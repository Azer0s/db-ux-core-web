import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBDrawer, DBButton, DBCard } from "@db-ux/react-native-core-components";
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

export default function DrawerShowcase() {
  const c = useScreenColors();
  const [openLeft, setOpenLeft] = useState(false);
  const [openRight, setOpenRight] = useState(false);
  const [openBottom, setOpenBottom] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Section title="Direction">
        <View style={styles.row}>
          <DBButton onClick={() => setOpenLeft(true)}>Open left</DBButton>
          <DBButton onClick={() => setOpenRight(true)}>Open right</DBButton>
          <DBButton onClick={() => setOpenBottom(true)}>Open bottom</DBButton>
        </View>
      </Section>

      <Section title="Backdrop variants">
        <Text style={[styles.hint, { color: c.muted }]}>
          The drawer above uses the default strong backdrop. Try the buttons below for different backdrop strengths.
        </Text>
      </Section>

      <DBDrawer
        open={openLeft}
        direction="left"
        backdrop="strong"
        onClose={() => setOpenLeft(false)}
        drawerHeader={<Text style={[styles.drawerTitle, { color: c.heading }]}>Left drawer</Text>}
      >
        <View style={styles.drawerContent}>
          <Text style={[styles.drawerBody, { color: c.body }]}>
            This drawer slides in from the left. Use it for navigation menus or filters.
          </Text>
          <DBButton onClick={() => setOpenLeft(false)}>Close</DBButton>
        </View>
      </DBDrawer>

      <DBDrawer
        open={openRight}
        direction="right"
        backdrop="weak"
        onClose={() => setOpenRight(false)}
        drawerHeader={<Text style={[styles.drawerTitle, { color: c.heading }]}>Right drawer</Text>}
      >
        <View style={styles.drawerContent}>
          <Text style={[styles.drawerBody, { color: c.body }]}>
            This drawer slides from the right with a weak backdrop.
          </Text>
          <DBCard elevationLevel="1">
            <Text style={[styles.drawerBody, { color: c.body }]}>Cards work inside drawers too.</Text>
          </DBCard>
          <DBButton onClick={() => setOpenRight(false)}>Close</DBButton>
        </View>
      </DBDrawer>

      <DBDrawer
        open={openBottom}
        direction="down"
        backdrop="strong"
        rounded
        onClose={() => setOpenBottom(false)}
        drawerHeader={<Text style={[styles.drawerTitle, { color: c.heading }]}>Bottom sheet</Text>}
      >
        <View style={styles.drawerContent}>
          <Text style={[styles.drawerBody, { color: c.body }]}>
            Bottom drawers are ideal for action sheets and contextual menus on mobile.
          </Text>
          <DBButton onClick={() => setOpenBottom(false)}>Dismiss</DBButton>
        </View>
      </DBDrawer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontSize: 13, lineHeight: 18 },
  drawerTitle: { fontSize: 18, fontWeight: "700" },
  drawerContent: { padding: 16, gap: 16 },
  drawerBody: { fontSize: 14, lineHeight: 20 },
});
