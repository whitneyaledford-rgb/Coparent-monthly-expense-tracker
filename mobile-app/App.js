import React, { useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Text, SafeAreaView, FlatList, TextInput, TouchableOpacity, Alert, Image, Platform } from 'react-native';
import { Provider as PaperProvider, Button, Card, Title, Paragraph } from 'react-native-paper';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, addDoc, query, where, orderBy } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Papa from 'papaparse';
import { firebaseConfig } from './firebaseConfig';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [houseId, setHouseId] = useState('');
  const [parentA, setParentA] = useState('Parent A');
  const [parentB, setParentB] = useState('Parent B');
  const [splitA, setSplitA] = useState(50);
  const [splitB, setSplitB] = useState(50);
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(getMonthId(new Date()));
  const [expenses, setExpenses] = useState([]);
  const [paidBy, setPaidBy] = useState('A');
  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const [kidsText, setKidsText] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // optionally load user's default household
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    // Load local months from async storage or default
    // For brevity we keep in-memory and Firestore as source of truth when houseId is set
    if (!houseId) return;
    const monthsCol = collection(db, 'households', houseId, 'months');
    // Setup listener for the selected month
    const monthDoc = doc(db, 'households', houseId, 'months', selectedMonth);

    const unsub = onSnapshot(monthDoc, (snapshot) => {
      const data = snapshot.exists() ? snapshot.data() : { expenses: [] };
      setParentA(data.parentA || 'Parent A');
      setParentB(data.parentB || 'Parent B');
      setSplitA(data.splitA ?? 50);
      setSplitB(data.splitB ?? 50);
      setExpenses(data.expenses || []);

      // Update months list
      // Note: for production, query list of months instead
    }, (err) => console.log('month listener error', err));

    return () => unsub();
  }, [houseId, selectedMonth]);

  function getMonthId(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  async function createOrJoinHousehold(joinId) {
    // If joinId provided, try to join
    if (joinId) {
      setHouseId(joinId);
      return;
    }
    // Create new household document with generated id
    const id = uuidv4().split('-')[0];
    const houseRef = doc(db, 'households', id);
    await setDoc(houseRef, { createdAt: new Date().toISOString(), createdBy: user?.uid || null });
    // create an initial month
    const monthRef = doc(db, 'households', id, 'months', getMonthId(new Date()));
    await setDoc(monthRef, { parentA, parentB, splitA, splitB, expenses: [] });
    setHouseId(id);
    Alert.alert('Household created', `Share this household code with the other parent: ${id}`);
  }

  async function saveMonthToFirestore(updated) {
    if (!houseId) return;
    const monthRef = doc(db, 'households', houseId, 'months', selectedMonth);
    const payload = {
      parentA,
      parentB,
      splitA,
      splitB,
      expenses: updated || expenses
    };
    await setDoc(monthRef, payload, { merge: true });
  }

  async function addExpense() {
    const amount = parseFloat(amountText);
    if (!amount || amount <= 0) { Alert.alert('Invalid amount'); return; }
    const id = Date.now().toString();
    const kids = kidsText ? kidsText.split(',').map(s => s.trim()).filter(Boolean) : [];
    const e = { id, paidBy, amount, description, kids };
    const updated = [...expenses, e];
    setExpenses(updated);
    setAmountText(''); setDescription(''); setKidsText('');
    await saveMonthToFirestore(updated);
  }

  async function deleteExpense(id) {
    const updated = expenses.filter(x => x.id !== id);
    setExpenses(updated);
    await saveMonthToFirestore(updated);
  }

  async function exportCSV(allMonths = false) {
    // For now export current month
    const rows = (allMonths ? [] : expenses).map(e => ({
      id: e.id,
      paidBy: e.paidBy,
      description: e.description,
      kids: (e.kids || []).join('|'),
      amount: e.amount
    }));
    const csv = Papa.unparse(rows);
    const path = FileSystem.cacheDirectory + `coparent-${selectedMonth}.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    if (Platform.OS === 'web') {
      // fallback for web
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      window.open(url);
    } else {
      await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    }
  }

  async function signIn(email, password) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      Alert.alert('Sign-in error', String(err));
    }
  }

  async function register(email, password) {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { Alert.alert('Register error', String(err)); }
  }

  async function logout() {
    await signOut(auth);
    setHouseId('');
  }

  const totals = useMemo(() => {
    const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaidByA = expenses.filter(e => e.paidBy === 'A').reduce((s, e) => s + (e.amount || 0), 0);
    const totalPaidByB = totalSpent - totalPaidByA;
    const targetA = totalSpent * (splitA / 100);
    const diffA = totalPaidByA - targetA;
    return { totalSpent, totalPaidByA, totalPaidByB, targetA, diffA };
  }, [expenses, splitA]);

  return (
    <PaperProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Image source={require('./assets/app-icon.png')} style={styles.icon} />
          <Text style={styles.title}>Co-Parent Expense Tracker</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Household</Text>
          {user ? (
            <Text style={styles.small}>Signed in as {user.email}</Text>
          ) : (
            <Text style={styles.small}>Not signed in</Text>
          )}
          <TextInput placeholder="Household code (leave blank to create)" value={houseId} onChangeText={setHouseId} style={styles.input} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode="contained" onPress={() => createOrJoinHousehold(houseId)}>Create / Join Household</Button>
            <Button mode="outlined" onPress={() => setHouseId('')}>Clear</Button>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Setup & Split</Text>
          <TextInput style={styles.input} value={parentA} onChangeText={setParentA} placeholder="Parent A name" />
          <TextInput style={styles.input} value={parentB} onChangeText={setParentB} placeholder="Parent B name" />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={String(splitA)} onChangeText={t => { const n = parseInt(t)||0; setSplitA(n); setSplitB(100-n); }} />
            <TextInput style={[styles.input, { flex: 1 }]} keyboardType="numeric" value={String(splitB)} onChangeText={t => { const n = parseInt(t)||0; setSplitB(n); setSplitA(100-n); }} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Add Expense</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button mode={paidBy === 'A' ? 'contained' : 'outlined'} onPress={() => setPaidBy('A')}>{parentA}</Button>
            <Button mode={paidBy === 'B' ? 'contained' : 'outlined'} onPress={() => setPaidBy('B')}>{parentB}</Button>
          </View>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="Amount" value={amountText} onChangeText={setAmountText} />
          <TextInput style={styles.input} placeholder="Description" value={description} onChangeText={setDescription} onBlur={() => { if (!description) setDescription('Misc'); }} />
          <TextInput style={styles.input} placeholder="Kids (comma separated)" value={kidsText} onChangeText={setKidsText} />
          <Button mode="contained" onPress={addExpense} style={{ marginTop: 8 }}>Add Expense</Button>
        </View>

        <View style={styles.card}>
          <Text style={styles.h3}>Current Month ({selectedMonth})</Text>
          <Text style={styles.summaryText}>{totals.diffA > 0 ? `${parentB} owes ${parentA} $${totals.diffA.toFixed(2)}` : totals.diffA < 0 ? `${parentA} owes ${parentB} $${Math.abs(totals.diffA).toFixed(2)}` : 'All settled'}</Text>
          <Text>Total: ${totals.totalSpent.toFixed(2)}</Text>
          <FlatList data={expenses} keyExtractor={i => i.id} renderItem={({ item }) => (
            <Card style={{ marginTop: 8 }}>
              <Card.Content>
                <Title>{item.description} — ${item.amount.toFixed(2)}</Title>
                <Paragraph>Paid by: {item.paidBy === 'A' ? parentA : parentB}</Paragraph>
                <Paragraph>Kids: {(item.kids||[]).join(', ') || 'All'}</Paragraph>
                <Button mode="text" onPress={() => deleteExpense(item.id)}>Delete</Button>
              </Card.Content>
            </Card>
          )} />

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button mode="outlined" onPress={() => exportCSV(false)}>Export CSV</Button>
            <Button mode="outlined" onPress={() => exportCSV(true)}>Export All</Button>
          </View>
        </View>

        <View style={{ height: 40 }} />

      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F5ED', padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#355E3B' },
  icon: { width: 72, height: 72, borderRadius: 12, marginRight: 8 },
  card: { backgroundColor: '#FFFFFF', padding: 12, borderRadius: 10, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.05 },
  h3: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: '#2F5D45' },
  input: { backgroundColor: '#F7F5ED', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#E8E6DF', marginBottom: 8 },
  small: { fontSize: 12, color: '#6B7280' },
  summaryText: { fontSize: 16, fontWeight: '700', color: '#2F5D45', marginBottom: 6 }
});
