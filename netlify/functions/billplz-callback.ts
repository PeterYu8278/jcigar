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
    const params = new URLSearchParams(event.body || '');
    const billId = params.get('id');
    const paid = params.get('paid');
    const status = params.get('state');

    console.log(`[billplz-callback] Received callback for Bill ID: ${billId}, Paid: ${paid}, Status: ${status}`);

    if (paid === 'true') {
      // 1. Try to find a Reload Record
      const reloadSnapshot = await db.collection(GLOBAL_COLLECTIONS.RELOAD_RECORDS)
        .where('billplzId', '==', billId)
        .limit(1)
        .get();

      if (!reloadSnapshot.empty) {
        const recordDoc = reloadSnapshot.docs[0];
        const recordData = recordDoc.data();

        if (recordData.status === 'completed') {
          return { statusCode: 200, body: 'OK (Already processed)' };
        }

        const userId = recordData.userId;
        const amount = recordData.requestedAmount;
        const points = recordData.pointsEquivalent;

        await db.runTransaction(async (transaction) => {
          const userRef = db.collection(GLOBAL_COLLECTIONS.USERS).doc(userId);
          const userDoc = await transaction.get(userRef);
          if (!userDoc.exists) throw new Error('User not found');

          // Update Points
          transaction.update(userRef, {
            'membership.points': FieldValue.increment(points),
            updatedAt: FieldValue.serverTimestamp()
          });

          // Update Reload Record
          transaction.update(recordDoc.ref, {
            status: 'completed',
            verifiedAt: FieldValue.serverTimestamp(),
            verifiedBy: 'system_billplz',
            adminNotes: `Auto-verified via Billplz (ID: ${billId}, Paid: ${params.get('paid_at')})`,
            updatedAt: FieldValue.serverTimestamp()
          });

          // Create Points Record
          const pointsRecordRef = db.collection(GLOBAL_COLLECTIONS.POINTS_RECORDS).doc();
          transaction.set(pointsRecordRef, {
            userId,
            userName: recordData.userName || 'Member',
            type: 'earn',
            amount: points,
            source: 'reload',
            description: `Billplz Online Reload: ${amount} RM (Bill ID: ${billId})`,
            relatedId: recordDoc.id,
            balance: (userDoc.data()?.membership?.points || 0) + points,
            createdBy: 'system_billplz',
            createdAt: FieldValue.serverTimestamp()
          });
        });

        console.log(`[billplz-callback] Successfully processed reload for user ${userId}`);
        return { statusCode: 200, body: 'OK' };
      }

      // 2. Try to find a Shop Order
      const orderSnapshot = await db.collection(GLOBAL_COLLECTIONS.ORDERS)
        .where('payment.billplzId', '==', billId)
        .limit(1)
        .get();

      if (!orderSnapshot.empty) {
        const orderDoc = orderSnapshot.docs[0];
        const orderData = orderDoc.data();

        if (orderData.status === 'confirmed' || orderData.status === 'completed') {
          return { statusCode: 200, body: 'OK (Already processed)' };
        }

        await db.runTransaction(async (transaction) => {
          // Update Order Status
          transaction.update(orderDoc.ref, {
            status: 'confirmed',
            'payment.paidAt': FieldValue.serverTimestamp(),
            'payment.transactionId': billId,
            updatedAt: FieldValue.serverTimestamp()
          });
        });

        console.log(`[billplz-callback] Successfully processed order ${orderDoc.id}`);
        return { statusCode: 200, body: 'OK' };
      }

      // 3. Try to find a Subscription Request
      const subSnapshot = await db.collection(GLOBAL_COLLECTIONS.SUBSCRIPTION_REQUESTS)
        .where('billplzId', '==', billId)
        .limit(1)
        .get();

      if (!subSnapshot.empty) {
        const subDoc = subSnapshot.docs[0];
        const subData = subDoc.data();

        if (subData.status === 'approved') {
          return { statusCode: 200, body: 'OK (Already processed)' };
        }

        await db.runTransaction(async (transaction) => {
          // Get AppConfig to find plan details
          const appConfigRef = db.collection(GLOBAL_COLLECTIONS.APP_CONFIG).doc('default');
          const appConfigDoc = await transaction.get(appConfigRef);
          const appConfigData = appConfigDoc.data();
          
          const plan = appConfigData?.subscription?.plans?.find((p: any) => p.id === subData.planId);
          const validMonths = plan?.validPeriodMonth || 12;
          
          // Calculate new expiry date using basic Date arithmetic
          const now = new Date();
          const newExpiry = new Date(now.getFullYear(), now.getMonth() + validMonths, now.getDate());

          // Update Subscription Request
          transaction.update(subDoc.ref, {
            status: 'approved',
            verifiedBy: 'system_billplz',
            developerNotes: `Auto-approved via Platform Billplz (ID: ${billId})`,
            expiryDate: newExpiry,
            updatedAt: FieldValue.serverTimestamp()
          });
          
          // Update AppConfig
          transaction.update(appConfigRef, {
            'subscription.isActive': true,
            'subscription.planId': subData.planId,
            'subscription.plan': subData.planId, // Legacy sync
            'subscription.expiryDate': newExpiry,
            updatedAt: FieldValue.serverTimestamp(),
            updatedBy: 'system_billplz'
          });
        });

        console.log(`[billplz-callback] Successfully processed subscription request ${subDoc.id}`);
        return { statusCode: 200, body: 'OK' };
      }

      console.error(`[billplz-callback] No matching record found for Bill ID: ${billId}`);
      return { statusCode: 404, body: 'Record Not Found' };
    }

    return { statusCode: 200, body: 'OK (Payment not successful)' };

  } catch (error: any) {
    console.error('[billplz-callback] Error processing callback:', error);
    return { statusCode: 500, body: `Internal Server Error: ${error.message}` };
  }
};
