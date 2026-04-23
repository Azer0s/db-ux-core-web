import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBCustomSelect,
  DBSelect,
  DBDivider,
  DBBadge,
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

const TRAIN_CLASSES = [
  { value: "ice", label: "ICE — Intercity-Express" },
  { value: "ic", label: "IC — Intercity" },
  { value: "re", label: "RE — Regional-Express" },
  { value: "rb", label: "RB — Regionalbahn" },
  { value: "s", label: "S-Bahn" },
  { value: "u", label: "U-Bahn" },
  { value: "tram", label: "Tram / Straßenbahn" },
  { value: "bus", label: "Bus" },
];

const CITIES = [
  { value: "berlin", label: "Berlin Hbf" },
  { value: "hamburg", label: "Hamburg Hbf" },
  { value: "munich", label: "München Hbf" },
  { value: "cologne", label: "Köln Hbf" },
  { value: "frankfurt", label: "Frankfurt (Main) Hbf" },
  { value: "stuttgart", label: "Stuttgart Hbf" },
  { value: "dusseldorf", label: "Düsseldorf Hbf" },
  { value: "leipzig", label: "Leipzig Hbf" },
];

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function SelectShowcase() {
  const c = useScreenColors();
  const [trainClass, setTrainClass] = useState("");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [months, setMonths] = useState<string>("");
  const [nativeMonth, setNativeMonth] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>Select & Picker</DBText>

      <Section title="DBCustomSelect — single value (bottom sheet)">
        <DBCustomSelect
          label="Train class"
          placeholder="Choose a train type…"
          options={TRAIN_CLASSES}
          values={trainClass}
          onOptionSelected={(v: any) => setTrainClass(String(v))}
        />
        {trainClass ? (
          <View style={styles.result}>
            <DBText variant="label" style={{ color: c.muted }}>Selected: </DBText>
            <DBBadge semantic="informational">{trainClass}</DBBadge>
          </View>
        ) : null}
      </Section>

      <Section title="DBCustomSelect — multi-select">
        <DBCustomSelect
          label="Travel months"
          placeholder="Pick one or more months…"
          options={MONTHS}
          multiple
          values={months}
          onOptionSelected={(v: any) => setMonths(String(v))}
        />
        {months ? (
          <View style={[styles.result, { flexWrap: "wrap" }]}>
            {months.split(",").map((m) => (
              <DBBadge key={m} semantic="successful">{MONTHS.find((x) => x.value === m)?.label ?? m}</DBBadge>
            ))}
          </View>
        ) : null}
      </Section>

      <DBDivider />

      <Section title="DBCustomSelect — origin / destination pair">
        <DBCustomSelect
          label="From"
          placeholder="Departure city…"
          options={CITIES}
          values={origin}
          onOptionSelected={(v: any) => setOrigin(String(v))}
        />
        <DBCustomSelect
          label="To"
          placeholder="Arrival city…"
          options={CITIES.filter((c) => c.value !== origin)}
          values={destination}
          onOptionSelected={(v: any) => setDestination(String(v))}
        />
        {origin && destination && (
          <View style={[styles.result, { gap: 6 }]}>
            <DBText variant="body" style={{ color: c.body }}>
              {CITIES.find((c) => c.value === origin)?.label}
              {" → "}
              {CITIES.find((c) => c.value === destination)?.label}
            </DBText>
          </View>
        )}
      </Section>

      <DBDivider />

      <Section title="DBSelect — native picker">
        <DBSelect
          label="Month (native)"
          placeholder="Select a month…"
          options={MONTHS.map((m) => m.label)}
          value={nativeMonth}
          onChange={(v: any) => setNativeMonth(String(v))}
        />
      </Section>

      <Section title="DBCustomSelect — disabled">
        <DBCustomSelect
          label="Disabled field"
          placeholder="Cannot be changed"
          options={TRAIN_CLASSES}
          disabled
        />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 },
  result: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
});
