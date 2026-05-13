/**
 * Netlify Function: Billplz Callback Handler
 * Handles successful payment callbacks from Billplz
 */
import { Handler } from '@netlify/functions';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GLOBAL_COLLECTIONS } from '../../src/config/globalCollections';

// Initialize Firebase Admin
if (!getApps().length) {
  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccount) {
      initializeApp({
        credential: cert(JSON.parse(serviceAccount))
      });
    } else {
      console.error('[billplz-callback] FIREBASE_SERVICE_ACCOUNT not configured');
    }
  } catch (error) {
    console.error('[billplz-callback] Failed to initialize Firebase Admin:', error);
  }
}

const db = getFirestore();

export const handler: Handler = async (event) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Billplz sends callbacks as x-www-form-urlencoded
    // We need to parse it
    const params = new URLSearchParams(event.body || '');
    const billId = params.get('id');
    const paid = params.get('paid');
    const status = params.get('state');

    console.log(`[billplz-callback] Received callback for Bill ID: ${billId}, Paid: ${paid}, Status: ${status}`);

    if (paid === 'true') {
      // 1. Find the reload record with this Billplz ID
      const reloadRecordsRef = db.collection(GLOBAL_COLLECTIONS.RELOAD_RECORDS);
      const snapshot = await reloadRecordsRef.where('billplzId', '==', billId).limit(1).get();

      if (snapshot.empty) {
        console.error(`[billplz-callback] No reload record found for Bill ID: ${billId}`);
        return { statusCode: 404, body: 'Record Not Found' };
      }

      const recordDoc = snapshot.docs[0];
      const recordData = recordDoc.data();

      if (recordData.status === 'completed') {
        console.log(`[billplz-callback] Record ${recordDoc.id} already completed.`);
        return { statusCode: 200, body: 'OK (Already processed)' };
      }

      const userId = recordData.userId;
      const amount = recordData.requestedAmount;
      const points = recordData.pointsEquivalent;

      // 2. Start a transaction to update user points and record status
      await db.runTransaction(async (transaction) => {
        const userRef = db.collection(GLOBAL_COLLECTIONS.USERS).doc(userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists) {
          throw new Error('User not found');
        }

        // Update User Points
        transaction.update(userRef, {
          'membership.points': FieldValue.increment(points),
          updatedAt: FieldValue.serverTimestamp()
        });

        // Update Reload Record
        transaction.update(recordDoc.ref, {
          status: 'completed',
          verifiedAt: FieldValue.serverTimestamp(),
          verifiedBy: 'system_billplz',
          adminNotes: `Auto-verified via Billplz (Paid: ${params.get('paid_at')})`,
          updatedAt: FieldValue.serverTimestamp()
        });

        // 3. Create Points Record
        const pointsRecordRef = db.collection(GLOBAL_COLLECTIONS.POINTS_RECORDS).doc();
        transaction.set(pointsRecordRef, {
          userId,
          userName: recordData.userName || 'Member',
          type: 'earn',
          amount: points,
          source: 'reload',
          description: `Billplz Online Reload: ${amount} RM`,
          relatedId: recordDoc.id,
          balance: (userDoc.data()?.membership?.points || 0) + points,
          createdBy: 'system_billplz',
          createdAt: FieldValue.serverTimestamp()
        });
      });

      console.log(`[billplz-callback] Successfully updated points for user ${userId}`);
      return { statusCode: 200, body: 'OK' };
    }

    return { statusCode: 200, body: 'OK (Payment not successful)' };

  } catch (error: any) {
    console.error('[billplz-callback] Error processing callback:', error);
    return { statusCode: 500, body: `Internal Server Error: ${error.message}` };
  }
};
