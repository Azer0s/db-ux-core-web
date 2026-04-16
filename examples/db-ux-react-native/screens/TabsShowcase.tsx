import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DBTabs,
  DBTabList,
  DBTabItem,
  DBTabPanel,
  DBBadge,
  DBButton,
} from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function TabsShowcase() {
  const [activeTab, setActiveTab] = useState(0);
  const [activeVertical, setActiveVertical] = useState(0);

  const hTabs = ["Overview", "Schedule", "Tickets"];
  const vTabs = ["Departures", "Arrivals", "Platform"];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Tabs</Text>

      <Section title="DBTabs — items prop (auto-managed)">
        <View style={styles.tabContainer}>
          <DBTabs
            tabs={[
              { label: "Train", content: "ICE, IC and regional trains across Germany." },
              { label: "Bus", content: "Long-distance and regional bus connections." },
              { label: "Bike", content: "Call-a-Bike rental stations at major hubs." },
            ]}
          />
        </View>
      </Section>

      <Section title="DBTabList + DBTabItem + DBTabPanel (controlled)">
        <DBTabList>
          {hTabs.map((label, i) => (
            <DBTabItem
              key={label}
              label={label}
              active={activeTab === i}
              onChange={() => setActiveTab(i)}
            />
          ))}
        </DBTabList>
        {hTabs.map((label, i) =>
          activeTab === i ? (
            <DBTabPanel key={label}>
              <View style={styles.panelContent}>
                <Text style={styles.panelText}>{label} panel content</Text>
                <DBBadge semantic="informational">{label}</DBBadge>
              </View>
            </DBTabPanel>
          ) : null
        )}
      </Section>

      <Section title="Vertical orientation">
        <View style={styles.verticalLayout}>
          <DBTabList>
            {vTabs.map((label, i) => (
              <DBTabItem
                key={label}
                label={label}
                active={activeVertical === i}
                onChange={() => setActiveVertical(i)}
              />
            ))}
          </DBTabList>
          <View style={styles.verticalPanel}>
            <Text style={styles.panelText}>{vTabs[activeVertical]} content</Text>
          </View>
        </View>
      </Section>

      <Section title="Many tabs (scrollable)">
        <DBTabList>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
            <DBTabItem
              key={day}
              label={day}
              active={i === 2}
              onChange={() => {}}
            />
          ))}
        </DBTabList>
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
  tabContainer: { minHeight: 120 },
  panelContent: { gap: 8, alignItems: "flex-start" },
  panelText: { fontSize: 14, color: "#2e3036" },
  verticalLayout: { gap: 8 },
  verticalPanel: { padding: 12, backgroundColor: "#f3f3f5", borderRadius: 8 },
});
