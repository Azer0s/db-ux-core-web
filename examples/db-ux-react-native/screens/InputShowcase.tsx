import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { DBInput, DBButton } from "@db-ux/react-native-core-components";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function InputShowcase() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit() {
    setSubmitted(true);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>DBInput</Text>

      <Section title="Basic">
        <DBInput label="Name" placeholder="Enter your name" />
        <DBInput label="Email" type="email" placeholder="you@example.com" />
        <DBInput label="Password" type="password" placeholder="••••••••" />
      </Section>

      <Section title="With Description">
        <DBInput
          label="Username"
          placeholder="john_doe"
          message="Must be unique. Letters, numbers and underscores only."
          showMessage
        />
      </Section>

      <Section title="Required Field">
        <DBInput label="Full Name" required placeholder="First and last name" />
      </Section>

      <Section title="Validation States">
        <DBInput
          label="Valid field"
          value="valid@example.com"
          validation="valid"
          validMessage="Looks good!"
        />
        <DBInput
          label="Invalid field"
          value="not-an-email"
          validation="invalid"
          invalidMessage="Please enter a valid email address."
        />
      </Section>

      <Section title="Disabled">
        <DBInput label="Disabled input" value="Cannot be edited" disabled />
      </Section>

      <Section title="Interactive Form">
        <DBInput
          label="Name"
          placeholder="Your name"
          value={name}
          onChange={(e: any) => setName(e?.target?.value ?? e)}
          required
          validation={submitted && !name ? "invalid" : undefined}
          invalidMessage="Name is required."
        />
        <DBInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e: any) => setEmail(e?.target?.value ?? e)}
          required
          validation={
            submitted
              ? !email
                ? "invalid"
                : email.includes("@")
                ? "valid"
                : "invalid"
              : undefined
          }
          validMessage="Valid email!"
          invalidMessage="Please enter a valid email."
        />
        <DBInput
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          value={password}
          onChange={(e: any) => setPassword(e?.target?.value ?? e)}
          required
          validation={
            submitted ? (password.length >= 8 ? "valid" : "invalid") : undefined
          }
          validMessage="Strong password!"
          invalidMessage="Password must be at least 8 characters."
        />
        <View style={styles.buttonRow}>
          <DBButton variant="brand" onClick={handleSubmit} width="full">
            Submit
          </DBButton>
        </View>
        {submitted && name && email.includes("@") && password.length >= 8 && (
          <Text style={styles.success}>Form submitted successfully!</Text>
        )}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    color: "#16181b",
  },
  section: {
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5a5e68",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  buttonRow: {
    marginTop: 8,
  },
  success: {
    textAlign: "center",
    color: "#63a615",
    fontWeight: "600",
    marginTop: 8,
  },
});
