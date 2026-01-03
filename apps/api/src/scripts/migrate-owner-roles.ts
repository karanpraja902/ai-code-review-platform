/**
 * Migration Script: Update Team Owners to 'owner' Role
 * 
 * This script updates existing team owners from 'admin' role to 'owner' role.
 * 
 * Run with: npx tsx src/scripts/migrate-owner-roles.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import models
import Team from '../models/team.model.js';
import TeamMember from '../models/team_member.model.js';

const MONGODB_URI = process.env.AI CODE REVIEW_DB;

async function connectDB(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('AI CODE REVIEW_DB environment variable is not set');
  }
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected');
}

async function migrateOwnerRoles(): Promise<void> {
  console.log('🔄 Starting owner role migration...\n');

  // Get all teams
  const teams = await Team.find({}).select('_id ownerId name').lean();
  console.log(`📊 Found ${teams.length} total teams\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const team of teams) {
    const teamId = String(team._id);
    const ownerId = team.ownerId;

    try {
      // Find the TeamMember entry for the owner
      const ownerMembership = await TeamMember.findOne({
        teamId: teamId,
        userId: ownerId,
      });

      if (!ownerMembership) {
        console.log(`⚠️  Team "${team.name}" (${teamId}) has no TeamMember entry for owner ${ownerId}`);
        errors++;
        continue;
      }

      // Check if already 'owner' role
      if (ownerMembership.role === 'owner') {
        skipped++;
        continue;
      }

      // Update to 'owner' role
      await TeamMember.updateOne(
        { _id: ownerMembership._id },
        { $set: { role: 'owner' } }
      );

      console.log(`✅ Updated "${team.name}" owner from "${ownerMembership.role}" to "owner"`);
      updated++;
    } catch (error) {
      console.error(`❌ Error processing team ${team.name}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Migration Summary:');
  console.log(`   ✅ Updated to owner role: ${updated}`);
  console.log(`   ⏭️  Skipped (already owner): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

async function main(): Promise<void> {
  try {
    await connectDB();
    await migrateOwnerRoles();
    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB disconnected');
  }
}

main();
