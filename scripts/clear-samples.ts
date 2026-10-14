import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const COLLECTIONS_TO_CLEAR = [
  'assignments',
  'submissions',
  'answers',
  'markings',
  'classes',
  'users'
];

async function clearAllSamples() {
  console.log('Beginning cleanup of all sample data from Firestore...');

  for (const colName of COLLECTIONS_TO_CLEAR) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      console.log(`Found ${snapshot.size} documents in collection '${colName}'`);
      for (const d of snapshot.docs) {
        await deleteDoc(doc(db, colName, d.id));
        console.log(`Deleted ${colName}/${d.id}`);
      }
    } catch (err) {
      console.error(`Error clearing ${colName}:`, err);
    }
  }

  console.log('All sample data has been completely removed from Firestore.');
  process.exit(0);
}

clearAllSamples();
