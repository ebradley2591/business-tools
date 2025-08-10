const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Load environment variables
require('dotenv').config({ path: '../.env.local' });

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

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function createDefaultActivationCodes() {
  try {
    console.log('Creating default activation codes...');

    // Check if codes already exist
    const existingCodes = await db.collection('activationCodes').get();
    
    if (!existingCodes.empty) {
      console.log('Activation codes already exist. Skipping creation.');
      return;
    }

    // Create development code (unlimited uses, no expiration)
    const devCode = await db.collection('activationCodes').add({
      code: 'DEV2025UNLIMITED',
      type: 'dev',
      description: 'Development access - unlimited enterprise features',
      maxUses: null,
      currentUses: 0,
      isActive: true,
      createdAt: new Date(),
      expiresAt: null,
      createdBy: 'system',
      usedBy: []
    });

    // Create early adopter code (100 uses, no expiration)
    const earlyAdopterCode = await db.collection('activationCodes').add({
      code: 'EARLYADOPTER2025',
      type: 'early_adopter',
      description: 'Early adopter access - pro features for contributors',
      maxUses: 100,
      currentUses: 0,
      isActive: true,
      createdAt: new Date(),
      expiresAt: null,
      createdBy: 'system',
      usedBy: []
    });

    // Create contributor code (50 uses, no expiration)
    const contributorCode = await db.collection('activationCodes').add({
      code: 'CONTRIBUTOR2025',
      type: 'contributor',
      description: 'Contributor access - enterprise features for active contributors',
      maxUses: 50,
      currentUses: 0,
      isActive: true,
      createdAt: new Date(),
      expiresAt: null,
      createdBy: 'system',
      usedBy: []
    });

    console.log('✅ Default activation codes created successfully!');
    console.log('');
    console.log('📋 Available Codes:');
    console.log('🔧 Development: DEV2025UNLIMITED (unlimited uses, Enterprise plan)');
    console.log('🚀 Early Adopter: EARLYADOPTER2025 (100 uses, Pro plan)');
    console.log('👥 Contributor: CONTRIBUTOR2025 (50 uses, Enterprise plan)');
    console.log('');
    console.log('💡 Share these codes with developers and early adopters!');

  } catch (error) {
    console.error('❌ Error creating activation codes:', error);
  }
}

// Run the script
createDefaultActivationCodes()
  .then(() => {
    console.log('Script completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
