const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin SDK
const serviceAccount = {
  type: process.env.FIREBASE_ADMIN_TYPE,
  project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
  private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
  auth_uri: process.env.FIREBASE_ADMIN_AUTH_URI,
  token_uri: process.env.FIREBASE_ADMIN_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function promoteToToolAdmin(userEmail) {
  try {
    console.log(`Promoting user ${userEmail} to tool admin...`);

    // Find the user by email
    const userRecord = await admin.auth().getUserByEmail(userEmail);
    console.log(`Found user: ${userRecord.uid}`);

    // Update the user's custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role: 'tool_admin',
      tenant_id: userRecord.uid, // Tool admins don't belong to a specific tenant
      subscription_status: 'active'
    });

    console.log(`✅ Updated custom claims for user ${userEmail}`);

    // Update the user profile in Firestore
    const userProfileRef = db.collection('tenantUsers').doc(userRecord.uid);
    await userProfileRef.update({
      role: 'tool_admin',
      updatedAt: new Date()
    });

    console.log(`✅ Updated user profile in Firestore for ${userEmail}`);

    console.log(`🎉 Successfully promoted ${userEmail} to Tool Admin!`);
    console.log('The user will need to sign out and sign back in for the changes to take effect.');

  } catch (error) {
    console.error('❌ Error promoting user to tool admin:', error);
    process.exit(1);
  }
}

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('❌ Please provide a user email as an argument');
  console.log('Usage: node promote-to-tool-admin.js <user-email>');
  process.exit(1);
}

promoteToToolAdmin(userEmail)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
