const fs = require('fs');
const file = 'src/lib/db.ts';
let code = fs.readFileSync(file, 'utf-8');

// 1. Rename official_email -> email, remove service_id, add address
code = code.replace(/official_email: string;/g, 'email: string;');
code = code.replace(/service_id: string;\n/g, '');
code = code.replace(/posting: string;/g, 'posting: string;\n  address: string | null;');
code = code.replace(/officialEmail: string;/g, 'email: string;');
code = code.replace(/serviceId: string;\n/g, '');
code = code.replace(/posting: string;/g, 'posting: string;\n  address?: string | null;');
code = code.replace(/SCHEMA_VERSION = 5;/g, 'SCHEMA_VERSION = 6;');

const migration = `
  // V6 Migrations
  await db.query(\`ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT\`);
  await db.query(\`ALTER TABLE users RENAME COLUMN official_email TO email\`).catch(() => {});
  await db.query(\`ALTER TABLE users DROP COLUMN IF EXISTS service_id\`).catch(() => {});
`;
code = code.replace(/await ensureAdmin\(db\);/, migration + '\n  await ensureAdmin(db);');

code = code.replace(
  /"id, full_name, official_email, mobile, service_id, designation, posting, role, status, avatar_url, blood_group, blood_available, created_at, approved_at, session_version"/g,
  '"id, full_name, email, mobile, designation, posting, address, role, status, avatar_url, blood_group, blood_available, created_at, approved_at, session_version"'
);

code = code.replace(
  /\(full_name, official_email, mobile, service_id, designation, posting, password_hash\)/g,
  '(full_name, email, mobile, designation, posting, address, password_hash)'
);
code = code.replace(
  /\[u\.fullName, u\.officialEmail, u\.mobile, u\.serviceId, u\.designation, u\.posting, u\.passwordHash\]/g,
  '[u.fullName, u.email, u.mobile, u.designation, u.posting, u.address || null, u.passwordHash]'
);

code = code.replace(
  /\(full_name, official_email, mobile, service_id, designation, posting, password_hash, role, status, approved_at\)/g,
  '(full_name, email, mobile, designation, posting, address, password_hash, role, status, approved_at)'
);
code = code.replace(
  /\["Portal Administrator", email\.toLowerCase\(\), "—", "ADMIN", "Administrator", "Head Office", hash\]/g,
  '["Portal Administrator", email.toLowerCase(), "—", "Administrator", "Head Office", "", hash]'
);
code = code.replace(/ON CONFLICT \(official_email\) DO NOTHING/g, 'ON CONFLICT (email) DO NOTHING');

code = code.replace(
  /WHERE official_email = \$1/g,
  'WHERE email = $1'
);

code = code.replace(
  /OR official_email ILIKE \$2 ESCAPE '\\\\'/g,
  'OR email ILIKE $2 ESCAPE \'\\\\\''
);
code = code.replace(
  /OR service_id ILIKE \$2 ESCAPE '\\\\'\n/g,
  ''
);
code = code.replace(
  /OR posting ILIKE \$2 ESCAPE '\\\\'\)/g,
  'OR posting ILIKE $2 ESCAPE \'\\\\\' OR address ILIKE $2 ESCAPE \'\\\\\')'
);

code = code.replace(/export type ProfileUpdate = {[\s\S]*?};/, 
  'export type ProfileUpdate = {\n  mobile: string;\n  designation: string;\n  posting: string;\n  address: string;\n  bloodGroup: string | null;\n  bloodAvailable: boolean;\n  avatarUrl?: string | null;\n};');

code = code.replace(
  /UPDATE users SET mobile=\$2, designation=\$3, posting=\$4, blood_group=\$5, blood_available=\$6,/g,
  'UPDATE users SET mobile=$2, designation=$3, posting=$4, address=$5, blood_group=$6, blood_available=$7,'
);
code = code.replace(
  /avatar_url = COALESCE\(\$7, avatar_url\)/g,
  'avatar_url = COALESCE($8, avatar_url)'
);
code = code.replace(
  /\[id, p\.mobile, p\.designation, p\.posting, p\.bloodGroup, p\.bloodAvailable, p\.avatarUrl \?\? null\]/g,
  '[id, p.mobile, p.designation, p.posting, p.address, p.bloodGroup, p.bloodAvailable, p.avatarUrl ?? null]'
);

fs.writeFileSync(file, code, 'utf-8');
console.log('db.ts updated');
