/**
 * Migration Script: Ensure All Users Have Teams
 * 
 * This script connects to the database and creates a team + TeamMember record
 * for all users who don't have one yet.
 * 
 * Run with: npx tsx src/scripts/migrate-user-teams.ts
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
import User from '../models/user.model.js';
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

async function migrateUserTeams(): Promise<void> {
  console.log('🔄 Starting user team migration...\n');

  // Get all users
  const users = await User.find({}).select('_id firstName lastName email').lean();
  console.log(`📊 Found ${users.length} total users\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    const userId = String(user._id);
    const displayName = user.firstName || user.email || userId;

    try {
      // Check if user owns a team
      const ownedTeam = await Team.findOne({ ownerId: userId });
      if (ownedTeam) {
        // Ensure TeamMember entry exists for owner
        const existingMembership = await TeamMember.findOne({
          teamId: String(ownedTeam._id),
          userId: userId,
        });

        if (!existingMembership) {
          await TeamMember.create({
            teamId: String(ownedTeam._id),
            userId: userId,
            role: 'owner',
            joinedAt: new Date(),
          });
          console.log(`   ➕ Created missing TeamMember for owner: ${displayName}`);
        }

        skipped++;
        continue;
      }

      // Check if user is a member of any team
      const membership = await TeamMember.findOne({ userId: userId });
      if (membership) {
        skipped++;
        continue;
      }

      // No team found - create a new one
      const team = await Team.create({
        name: 'AC',
        ownerId: userId,
      });

      // Create TeamMember entry for owner
      await TeamMember.create({
        teamId: String(team._id),
        userId: userId,
        role: 'owner',
        joinedAt: new Date(),
      });

      // Update user's activeTeamId
      await User.findByIdAndUpdate(userId, { activeTeamId: String(team._id) });

      console.log(`✅ Created team for user: ${displayName} (Team ID: ${team._id})`);
      created++;
    } catch (error) {
      console.error(`❌ Error processing user ${displayName}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Migration Summary:');
  console.log(`   ✅ Teams created: ${created}`);
  console.log(`   ⏭️  Skipped (already had team): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

async function main(): Promise<void> {
  try {
    await connectDB();
    await migrateUserTeams();
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
