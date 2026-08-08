import dns from 'dns';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (error) {
  console.warn('⚠️ Could not override DNS servers:', error?.message || error);
}

const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  console.error('❌ MONGO_URI is not set.');
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL || 'gostman064@gmail.com';
const adminUid = process.env.ADMIN_UID || 'admin-user-456';
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Store Admin';

const adminUser = {
  email: adminEmail,
  uid: adminUid,
  displayName: adminDisplayName,
  role: 'admin',
  isAdmin: true,
  provider: 'firebase',
};

async function main() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      family: 4,
    });

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    const result = await usersCollection.updateOne(
      { email: adminEmail },
      {
        $set: {
          ...adminUser,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true }
    );

    console.log('✅ Admin user upserted successfully.');
    console.log(JSON.stringify({
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId,
      email: adminEmail,
      role: 'admin',
    }, null, 2));
  } catch (error) {
    console.error('❌ Failed to create admin user:', error?.message || error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
