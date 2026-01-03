/**
 * Migration Script: Add TeamId to GitHub Installations and Repositories
 * 
 * This script connects to the database and:
 * 1. For each user with a team, updates their GitHub installations with the teamId
 * 2. Updates all corresponding repositories to include the teamId
 * 
 * Run with: npx tsx src/scripts/migrate-github-team-ids.ts
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
import { Github_Installation } from '../models/github_installations.model.js';
import { Github_Repository } from '../models/github_repostries.model.js';

const MONGODB_URI = process.env.AI CODE REVIEW_DB;

async function connectDB(): Promise<void> {
  if (!MONGODB_URI) {
    throw new Error('AI CODE REVIEW_DB environment variable is not set');
  }
  await mongoose.connect(MONGODB_URI);
  console.log('✅ MongoDB connected');
}

async function migrateGitHubTeamIds(): Promise<void> {
  console.log('🔄 Starting GitHub installation and repository team migration...\n');

  // Get all users with their active team
  const users = await User.find({}).select('_id firstName lastName email activeTeamId').lean();
  console.log(`📊 Found ${users.length} total users\n`);

  let installationsUpdated = 0;
  let repositoriesUpdated = 0;
  let usersProcessed = 0;
  let usersSkipped = 0;
  let errors = 0;

  for (const user of users) {
    const userId = String(user._id);
    const displayName = user.firstName || user.email || userId;

    try {
      // Get user's team (prefer activeTeamId, fallback to owned team)
      let teamId = user.activeTeamId ? String(user.activeTeamId) : null;
      
      if (!teamId) {
        const ownedTeam = await Team.findOne({ ownerId: userId });
        if (ownedTeam) {
          teamId = String(ownedTeam._id);
        }
      }

      if (!teamId) {
        console.log(`   ⏭️  Skipping ${displayName}: No team found`);
        usersSkipped++;
        continue;
      }

      // Find all GitHub installations for this user
      const installations = await Github_Installation.find({ userId: userId });
      
      if (installations.length === 0) {
        console.log(`   ⏭️  Skipping ${displayName}: No GitHub installations`);
        usersSkipped++;
        continue;
      }

      console.log(`\n👤 Processing ${displayName} (Team: ${teamId})`);
      console.log(`   📦 Found ${installations.length} installation(s)`);

      for (const installation of installations) {
        // Update installation with teamId if not already set
        if (!installation.teamId) {
          await Github_Installation.findByIdAndUpdate(installation._id, { teamId });
          console.log(`   ✅ Updated installation: ${installation.account?.login || installation.installationId}`);
          installationsUpdated++;
        } else {
          console.log(`   ⏭️  Installation already has teamId: ${installation.account?.login || installation.installationId}`);
        }

        // Update all repositories for this installation
        const repoResult = await Github_Repository.updateMany(
          { 
            github_installationId: installation._id,
            $or: [
              { teamId: { $exists: false } },
              { teamId: null }
            ]
          },
          { $set: { teamId } }
        );

        if (repoResult.modifiedCount > 0) {
          console.log(`   ✅ Updated ${repoResult.modifiedCount} repositories`);
          repositoriesUpdated += repoResult.modifiedCount;
        }
      }

      usersProcessed++;
    } catch (error) {
      console.error(`❌ Error processing user ${displayName}:`, error);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Migration Summary:');
  console.log(`   👤 Users processed: ${usersProcessed}`);
  console.log(`   ⏭️  Users skipped: ${usersSkipped}`);
  console.log(`   📦 Installations updated: ${installationsUpdated}`);
  console.log(`   📁 Repositories updated: ${repositoriesUpdated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(50));
}

async function main(): Promise<void> {
  try {
    await connectDB();
    await migrateGitHubTeamIds();
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
