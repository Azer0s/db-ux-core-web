import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  DBCheckbox,
  DBRadio,
  DBSwitch,
  DBSelect,
  DBTextarea,
  DBButton,
, DBText } from "@db-ux/react-native-core-components";
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

const TRANSPORT_OPTIONS = [
  { label: "Train", value: "train" },
  { label: "Bus", value: "bus" },
  { label: "Tram", value: "tram" },
  { label: "Ferry", value: "ferry" },
];

export default function FormShowcase() {
  const c = useScreenColors();
  const [checkboxes, setCheckboxes] = useState({ terms: false, newsletter: false, rememberMe: true });
  const [radio, setRadio] = useState("train");
  const [toggle, setToggle] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [transport, setTransport] = useState("train");
  const [message, setMessage] = useState("");

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DBText style={[styles.heading, { color: c.heading }]}>Form Controls</DBText>

      <Section title="DBCheckbox">
        <DBCheckbox
          label="Accept terms and conditions"
          checked={checkboxes.terms}
          onChange={(e: any) => setCheckboxes((s) => ({ ...s, terms: e?.target?.checked ?? !s.terms }))}
        />
        <DBCheckbox
          label="Subscribe to newsletter"
          checked={checkboxes.newsletter}
          onChange={(e: any) => setCheckboxes((s) => ({ ...s, newsletter: e?.target?.checked ?? !s.newsletter }))}
        />
        <DBCheckbox
          label="Remember me (pre-checked)"
          checked={checkboxes.rememberMe}
          onChange={(e: any) => setCheckboxes((s) => ({ ...s, rememberMe: e?.target?.checked ?? !s.rememberMe }))}
        />
        <DBCheckbox label="Disabled unchecked" disabled />
        <DBCheckbox label="Disabled checked" checked disabled />
      </Section>

      <Section title="DBRadio">
        {TRANSPORT_OPTIONS.map((opt) => (
          <DBRadio
            key={opt.value}
            label={opt.label}
            value={opt.value}
            checked={radio === opt.value}
            onChange={() => setRadio(opt.value)}
          />
        ))}
        <DBRadio label="Disabled option" value="disabled" disabled />
      </Section>

      <Section title="DBSwitch">
        <DBSwitch
          label="Enable notifications"
          checked={toggle}
          onChange={(e: any) => setToggle(e?.target?.checked ?? !toggle)}
        />
        <DBSwitch
          label="Dark mode"
          checked={darkMode}
          onChange={(e: any) => setDarkMode(e?.target?.checked ?? !darkMode)}
        />
        <DBSwitch label="Disabled off" disabled />
        <DBSwitch label="Disabled on" checked disabled />
      </Section>

      <Section title="DBSelect">
        <DBSelect
          label="Preferred transport"
          options={TRANSPORT_OPTIONS}
          value={transport}
          onChange={(e: any) => setTransport(e?.target?.value ?? e)}
        />
        <DBSelect label="Disabled" options={TRANSPORT_OPTIONS} value="train" disabled />
      </Section>

      <Section title="DBTextarea">
        <DBTextarea
          label="Message"
          placeholder="Enter your message..."
          value={message}
          onChange={(e: any) => setMessage(e?.target?.value ?? e)}
          rows={4}
        />
        <DBTextarea label="Disabled" value="Cannot be edited" disabled />
        <View style={styles.buttonRow}>
          <DBButton
            variant="brand"
            width="full"
            disabled={!message.trim()}
            onClick={() => setMessage("")}
          >
            Clear
          </DBButton>
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  section: { marginBottom: 16, gap: 6 },
  sectionTitle: {
    fontSize: 13, fontWeight: "600",
    marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5,
  },
  buttonRow: { marginTop: 4 },
});
