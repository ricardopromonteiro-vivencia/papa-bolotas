#!/usr/bin/env node

/**
 * Environment Setup Script
 * 
 * This script helps developers set up their .env.local file interactively.
 * Run with: node scripts/setup-env.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envLocalPath = path.join(rootDir, '.env.local');
const envTemplatePath = path.join(rootDir, '.env.local.template');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function question(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function main() {
  log('\n🔧 Papa Bolotas - Environment Setup\n', 'bright');

  // Check if .env.local already exists
  if (fs.existsSync(envLocalPath)) {
    log('⚠️  .env.local already exists!', 'yellow');
    const rl = createInterface();
    const answer = await question(rl, 'Do you want to overwrite it? (y/N): ');
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      log('\n✅ Keeping existing .env.local', 'green');
      log('To edit it manually: nano .env.local\n', 'blue');
      process.exit(0);
    }
  }

  // Check if template exists
  if (!fs.existsSync(envTemplatePath)) {
    log('❌ Error: .env.local.template not found!', 'red');
    process.exit(1);
  }

  log('This wizard will help you create your .env.local file.\n', 'blue');
  log('Required information:', 'bright');
  log('  1. Supabase project URL');
  log('  2. Supabase anon key');
  log('  3. Security code for sensitive operations\n');

  const rl = createInterface();
  const config = {};

  // Supabase URL
  log('📍 Supabase Configuration', 'bright');
  log('   Find these values in: Supabase Dashboard → Project Settings → API\n', 'blue');
  
  let validUrl = false;
  while (!validUrl) {
    config.VITE_SUPABASE_URL = await question(rl, 'Supabase URL (e.g., https://xxx.supabase.co): ');
    if (config.VITE_SUPABASE_URL && config.VITE_SUPABASE_URL.startsWith('https://')) {
      validUrl = true;
    } else {
      log('❌ Invalid URL format. Must start with https://', 'red');
    }
  }

  // Supabase Anon Key
  config.VITE_SUPABASE_ANON_KEY = await question(rl, 'Supabase Anon Key: ');
  while (!config.VITE_SUPABASE_ANON_KEY || config.VITE_SUPABASE_ANON_KEY.length < 20) {
    log('❌ Invalid key. Please enter the full anon key.', 'red');
    config.VITE_SUPABASE_ANON_KEY = await question(rl, 'Supabase Anon Key: ');
  }

  // Application Configuration
  log('\n📱 Application Configuration', 'bright');
  config.VITE_APP_NAME = await question(rl, 'App Name (default: Papa Bolotas): ') || 'Papa Bolotas';
  config.VITE_APP_VERSION = await question(rl, 'App Version (default: 0.1.0): ') || '0.1.0';

  // Security Configuration
  log('\n🔒 Security Configuration', 'bright');
  config.VITE_SECURITY_CODE = await question(rl, 'Security Code (4-6 digits, default: 1234): ') || '1234';
  
  if (config.VITE_SECURITY_CODE === '1234') {
    log('⚠️  Warning: Using default security code. Change this for production!', 'yellow');
  }

  rl.close();

  // Generate .env.local content
  log('\n📝 Generating .env.local file...', 'blue');

  const envContent = `# Papa Bolotas Webapp - Local Environment Configuration
# Generated on ${new Date().toISOString()}
# DO NOT commit this file to version control

# =============================================================================
# SUPABASE CONFIGURATION
# =============================================================================
VITE_SUPABASE_URL=${config.VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${config.VITE_SUPABASE_ANON_KEY}

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
VITE_APP_NAME=${config.VITE_APP_NAME}
VITE_APP_VERSION=${config.VITE_APP_VERSION}

# =============================================================================
# SECURITY CONFIGURATION
# =============================================================================
VITE_SECURITY_CODE=${config.VITE_SECURITY_CODE}

# =============================================================================
# DEVELOPMENT CONFIGURATION (Optional)
# =============================================================================
# VITE_DEV_MODE=true
# VITE_USE_MOCK_DATA=false
`;

  // Write the file
  try {
    fs.writeFileSync(envLocalPath, envContent, 'utf8');
    log('✅ .env.local created successfully!', 'green');
    
    log('\n📋 Next steps:', 'bright');
    log('  1. Review your .env.local file', 'blue');
    log('  2. Run: npm run dev', 'blue');
    log('  3. Verify the app loads without errors\n', 'blue');
    
    log('📚 For more information, see ENV_SETUP_GUIDE.md\n', 'blue');
  } catch (error) {
    log(`❌ Error writing .env.local: ${error.message}`, 'red');
    process.exit(1);
  }
}

main().catch((error) => {
  log(`❌ Setup failed: ${error.message}`, 'red');
  process.exit(1);
});
