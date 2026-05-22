import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors } from '../theme/colors';

const adminApiUrl = process.env.EXPO_PUBLIC_ADMIN_API_URL || '';

type DocumentInput = {
  documentType: string;
  label: string;
  fileUrl: string;
  fileName: string;
  expiryDate?: string;
};

const initialDocuments: DocumentInput[] = [
  { documentType: 'driving_licence_front', label: 'Driving licence front', fileUrl: '', fileName: '' },
  { documentType: 'driving_licence_back', label: 'Driving licence back', fileUrl: '', fileName: '' },
  { documentType: 'right_to_work', label: 'Right to work proof', fileUrl: '', fileName: '' },
  { documentType: 'business_insurance', label: 'Business insurance proof', fileUrl: '', fileName: '', expiryDate: '' },
  { documentType: 'liability_insurance', label: 'Liability insurance proof', fileUrl: '', fileName: '', expiryDate: '' },
  { documentType: 'selfie_with_licence', label: 'Selfie with licence', fileUrl: '', fileName: '' },
];

export default function OnboardingScreen({ navigation }: any) {
  const [loading, setLoading] = useState(false);
  const [confirmedRightToWork, setConfirmedRightToWork] = useState(false);
  const [confirmedBusinessInsurance, setConfirmedBusinessInsurance] = useState(false);
  const [confirmedLiabilityInsurance, setConfirmedLiabilityInsurance] = useState(false);
  const [documents, setDocuments] = useState<DocumentInput[]>(initialDocuments);

  const [form, setForm] = useState({
    fullName: '',
    legalName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    homeAddress: '',
    vehicleType: 'car',
    registration: '',
    make: '',
    model: '',
    colour: '',
    capacityNotes: '',
  });

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm(previous => ({ ...previous, [key]: value }));
  };

  const updateDocument = (index: number, key: keyof DocumentInput, value: string) => {
    setDocuments(previous =>
      previous.map((document, documentIndex) =>
        documentIndex === index ? { ...document, [key]: value } : document
      )
    );
  };

  const submit = async () => {
    if (!adminApiUrl) {
      Alert.alert('Missing configuration', 'EXPO_PUBLIC_ADMIN_API_URL is not configured.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${adminApiUrl.replace(/\/$/, '')}/api/mobile/onboarding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rightToWorkConfirmed: confirmedRightToWork,
          businessInsuranceConfirmed: confirmedBusinessInsurance,
          liabilityInsuranceConfirmed: confirmedLiabilityInsurance,
          documents: documents.map(document => ({
            documentType: document.documentType,
            fileUrl: document.fileUrl,
            fileName: document.fileName || document.label,
            expiryDate: document.expiryDate || null,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Could not submit onboarding');
      }

      Alert.alert('Sent to the FC', data?.message || 'Your paperwork is with the FC for review.', [
        { text: 'Back to login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (error) {
      Alert.alert('Onboarding failed', error instanceof Error ? error.message : 'Could not submit onboarding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.kicker}>DRIVER ONBOARDING</Text>
          <Text style={styles.title}>Join the railway</Text>
          <Text style={styles.subtitle}>Submit your details and documents for FC review.</Text>

          <Section title="Your details">
            <Field placeholder="Full name" value={form.fullName} onChangeText={value => updateForm('fullName', value)} />
            <Field placeholder="Legal name, if different" value={form.legalName} onChangeText={value => updateForm('legalName', value)} />
            <Field placeholder="Email" value={form.email} onChangeText={value => updateForm('email', value)} keyboardType="email-address" />
            <Field placeholder="Phone" value={form.phone} onChangeText={value => updateForm('phone', value)} keyboardType="phone-pad" />
            <Field placeholder="Date of birth YYYY-MM-DD" value={form.dateOfBirth} onChangeText={value => updateForm('dateOfBirth', value)} />
            <Field placeholder="Home address" value={form.homeAddress} onChangeText={value => updateForm('homeAddress', value)} multiline />
          </Section>

          <Section title="Vehicle">
            <Field placeholder="Vehicle type: car / van / estate" value={form.vehicleType} onChangeText={value => updateForm('vehicleType', value)} />
            <Field placeholder="Registration" value={form.registration} onChangeText={value => updateForm('registration', value)} autoCapitalize="characters" />
            <Field placeholder="Make" value={form.make} onChangeText={value => updateForm('make', value)} />
            <Field placeholder="Model" value={form.model} onChangeText={value => updateForm('model', value)} />
            <Field placeholder="Colour" value={form.colour} onChangeText={value => updateForm('colour', value)} />
            <Field placeholder="Capacity notes" value={form.capacityNotes} onChangeText={value => updateForm('capacityNotes', value)} multiline />
          </Section>

          <Section title="Declarations">
            <CheckRow checked={confirmedRightToWork} onPress={() => setConfirmedRightToWork(!confirmedRightToWork)} label="I can prove my right to work/remain in the UK." />
            <CheckRow checked={confirmedBusinessInsurance} onPress={() => setConfirmedBusinessInsurance(!confirmedBusinessInsurance)} label="I have business-use vehicle insurance for delivery work." />
            <CheckRow checked={confirmedLiabilityInsurance} onPress={() => setConfirmedLiabilityInsurance(!confirmedLiabilityInsurance)} label="I have, or will provide, public liability insurance proof." />
          </Section>

          <Section title="Documents">
            <Text style={styles.helpText}>Pilot mode: paste a file link or photo URL for each document. Native camera upload comes next.</Text>
            {documents.map((document, index) => (
              <View key={document.documentType} style={styles.documentCard}>
                <Text style={styles.documentTitle}>{document.label}</Text>
                <Field placeholder="Document/photo link" value={document.fileUrl} onChangeText={value => updateDocument(index, 'fileUrl', value)} />
                <Field placeholder="File name" value={document.fileName} onChangeText={value => updateDocument(index, 'fileName', value)} />
                {(document.documentType.includes('insurance')) ? (
                  <Field placeholder="Expiry date YYYY-MM-DD" value={document.expiryDate || ''} onChangeText={value => updateDocument(index, 'expiryDate', value)} />
                ) : null}
              </View>
            ))}
          </Section>

          <TouchableOpacity activeOpacity={0.85} style={[styles.submitButton, loading && styles.disabled]} onPress={submit} disabled={loading}>
            <Text style={styles.submitText}>{loading ? 'Sending to FC...' : 'Submit to the FC'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Field(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput {...props} placeholderTextColor={colors.textMuted} style={[styles.input, props.multiline && styles.multiline]} />;
}

function CheckRow({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.checkRow} activeOpacity={0.85}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>
        <Text style={styles.checkMark}>{checked ? '✓' : ''}</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1 },
  content: { padding: 22, paddingBottom: 120 },
  kicker: { color: colors.accent, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 16 },
  title: { color: colors.text, fontSize: 42, fontWeight: '900', marginTop: 10 },
  subtitle: { color: colors.textSecondary, fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 24 },
  section: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 26, padding: 20, marginBottom: 18 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 14 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 17, color: colors.text, fontSize: 15, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 12 },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: colors.background, borderRadius: 17, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  checkBox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#000', fontWeight: '900' },
  checkLabel: { color: colors.text, flex: 1, lineHeight: 20 },
  helpText: { color: colors.textSecondary, lineHeight: 21, marginBottom: 14 },
  documentCard: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 14, marginBottom: 14 },
  documentTitle: { color: colors.text, fontWeight: '900', marginBottom: 10 },
  submitButton: { backgroundColor: colors.accent, borderRadius: 22, paddingVertical: 18, alignItems: 'center' },
  disabled: { opacity: 0.55 },
  submitText: { color: '#000', fontSize: 17, fontWeight: '900' },
});
