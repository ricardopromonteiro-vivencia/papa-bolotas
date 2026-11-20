/**
 * Generate bcrypt hash for admin password
 * Run with: node generate-admin-hash.js
 */

const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Bcrypt cost factor (10 is recommended for security/performance balance)
const SALT_ROUNDS = 10;

console.log('=================================================');
console.log('Papa Bolotas Admin Password Hash Generator');
console.log('=================================================\n');

rl.question('Enter admin password (min 8 chars, alphanumeric): ', (password) => {
  // Validate password
  if (password.length < 8) {
    console.error('\n❌ Error: Password must be at least 8 characters long');
    rl.close();
    process.exit(1);
  }

  if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
    console.error('\n❌ Error: Password must contain both letters and numbers');
    rl.close();
    process.exit(1);
  }

  console.log('\n⏳ Generating hash...\n');

  // Generate hash
  bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
    if (err) {
      console.error('❌ Error generating hash:', err);
      rl.close();
      process.exit(1);
    }

    console.log('✅ Hash generated successfully!\n');
    console.log('Copy this SQL statement to create your admin user:\n');
    console.log('─'.repeat(80));
    console.log(`
INSERT INTO users (username, password_hash, role, created_at, updated_at)
VALUES (
  'admin',
  '${hash}',
  'admin',
  NOW(),
  NOW()
)
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash,
    updated_at = NOW();
`);
    console.log('─'.repeat(80));
    console.log('\n📋 Or just copy the hash:\n');
    console.log(hash);
    console.log('\n⚠️  Keep this password secure and change it after first login!');

    rl.close();
  });
});

rl.on('close', () => {
  process.exit(0);
});
