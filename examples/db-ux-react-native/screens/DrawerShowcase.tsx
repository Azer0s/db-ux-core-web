import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBDrawer, DBButton, DBCard,
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

export default function DrawerShowcase() {
  const c = useScreenColors();
  const [openLeft, setOpenLeft] = useState(false);
  const [openRight, setOpenRight] = useState(false);
  const [openBottom, setOpenBottom] = useState(false);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>DBDrawer</DBText>
      <Section title="Direction">
        <View style={styles.row}>
          <DBButton onClick={() => setOpenLeft(true)}>Open left</DBButton>
          <DBButton onClick={() => setOpenRight(true)}>Open right</DBButton>
          <DBButton onClick={() => setOpenBottom(true)}>Open bottom</DBButton>
        </View>
      </Section>

      <Section title="Backdrop variants">
        <DBText style={[styles.hint, { color: c.muted }]}>
          The drawer above uses the default strong backdrop. Try the buttons below for different backdrop strengths.
        </DBText>
      </Section>

      <DBDrawer
        open={openLeft}
        direction="left"
        backdrop="strong"
        onClose={() => setOpenLeft(false)}
        drawerHeader={<DBText style={[styles.drawerTitle, { color: c.heading }]}>Left drawer</DBText>}
      >
        <View style={styles.drawerContent}>
          <DBText style={[styles.drawerBody, { color: c.body }]}>
            This drawer slides in from the left. Use it for navigation menus or filters.
          </DBText>
          <DBButton onClick={() => setOpenLeft(false)}>Close</DBButton>
        </View>
      </DBDrawer>

      <DBDrawer
        open={openRight}
        direction="right"
        backdrop="weak"
        onClose={() => setOpenRight(false)}
        drawerHeader={<DBText style={[styles.drawerTitle, { color: c.heading }]}>Right drawer</DBText>}
      >
        <View style={styles.drawerContent}>
          <DBText style={[styles.drawerBody, { color: c.body }]}>
            This drawer slides from the right with a weak backdrop.
          </DBText>
          <DBCard elevationLevel="1">
            <DBText style={[styles.drawerBody, { color: c.body }]}>Cards work inside drawers too.</DBText>
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
        drawerHeader={<DBText style={[styles.drawerTitle, { color: c.heading }]}>Bottom sheet</DBText>}
      >
        <View style={styles.drawerContent}>
          <DBText style={[styles.drawerBody, { color: c.body }]}>
            Bottom drawers are ideal for action sheets and contextual menus on mobile.
          </DBText>
          <DBButton onClick={() => setOpenBottom(false)}>Dismiss</DBButton>
        </View>
      </DBDrawer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  container: { padding: 16, gap: 24 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  hint: { fontSize: 13, lineHeight: 18 },
  drawerTitle: { fontSize: 18, fontWeight: "700" },
  drawerContent: { padding: 16, gap: 16 },
  drawerBody: { fontSize: 14, lineHeight: 20 },
});
