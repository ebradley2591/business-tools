const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin using environment variables
const serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.FIREBASE_CLIENT_EMAIL}`
};

initializeApp({
  credential: cert(serviceAccount)
});

const adminDb = getFirestore();
const auth = getAuth();

async function fixTenantFeatures() {
  console.log('🔧 Starting tenant features fix...');
  
  try {
    // Get all tenants
    const tenantsSnapshot = await adminDb.collection('tenants').get();
    console.log(`📋 Found ${tenantsSnapshot.size} tenants to process`);
    
    let updatedCount = 0;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantData = tenantDoc.data();
      const tenantId = tenantDoc.id;
      const currentPlan = tenantData.plan;
      const currentFeatures = tenantData.settings?.features || [];
      
      console.log(`\n🏢 Processing tenant: ${tenantData.name} (${tenantId})`);
      console.log(`   Current plan: ${currentPlan}`);
      console.log(`   Current features: ${currentFeatures.join(', ')}`);
      
      // Determine correct features based on plan
      let correctFeatures;
      let maxUsers;
      let maxCustomers;
      
      switch (currentPlan) {
        case 'enterprise':
          correctFeatures = [
            'basic_search',
            'csv_import', 
            'custom_fields',
            'bulk_delete',
            'advanced_analytics',
            'user_management',
            'audit_logs',
            'api_access',
            'priority_support'
          ];
          maxUsers = 50;
          maxCustomers = 10000;
          break;
        case 'pro':
          correctFeatures = [
            'basic_search',
            'csv_import',
            'custom_fields', 
            'bulk_delete',
            'user_management',
            'audit_logs'
          ];
          maxUsers = 10;
          maxCustomers = 1000;
          break;
        case 'free':
        default:
          correctFeatures = [
            'basic_search',
            'csv_import',
            'custom_fields'
          ];
          maxUsers = 5;
          maxCustomers = 100;
          break;
      }
      
      // Check if features need updating
      const featuresMatch = JSON.stringify(currentFeatures.sort()) === JSON.stringify(correctFeatures.sort());
      
      if (!featuresMatch) {
        console.log(`   ❌ Features mismatch detected`);
        console.log(`   Expected: ${correctFeatures.join(', ')}`);
        
        // Update tenant with correct features
        await adminDb.collection('tenants').doc(tenantId).update({
          settings: {
            maxUsers,
            maxCustomers,
            features: correctFeatures
          },
          updatedAt: new Date()
        });
        
        console.log(`   ✅ Updated tenant features`);
        updatedCount++;
        
        // Update user custom claims to include plan
        const usersSnapshot = await adminDb.collection('tenantUsers')
          .where('tenant_id', '==', tenantId)
          .get();
        
        for (const userDoc of usersSnapshot.docs) {
          const userData = userDoc.data();
          console.log(`   🔐 Updating custom claims for user: ${userData.uid}`);
          
          await auth.setCustomUserClaims(userData.uid, {
            tenant_id: tenantId,
            role: userData.role,
            subscription_status: tenantData.subscription_status,
            plan: currentPlan
          });
        }
      } else {
        console.log(`   ✅ Features already correct`);
      }
    }
    
    console.log(`\n🎉 Migration complete!`);
    console.log(`   Updated ${updatedCount} tenants`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  }
}

// Run the migration
fixTenantFeatures()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
