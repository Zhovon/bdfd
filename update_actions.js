const fs = require('fs');
const file = 'src/app/actions.ts';
let code = fs.readFileSync(file, 'utf-8');

code = code.replace(/officialEmail/g, 'email');
code = code.replace(/serviceId/g, 'address');
code = code.replace(/fullName: str\(formData\.get\("fullName"\)\),/g, 'fullName: str(formData.get("fullName")),');
code = code.replace(/email: str\(formData\.get\("email"\)\)\.toLowerCase\(\),/g, 'email: str(formData.get("email")).toLowerCase(),');
// Replace serviceId reading with address
code = code.replace(/address: str\(formData\.get\("address"\)\),/g, 'address: str(formData.get("address")),');

// The fieldErrors check:
code = code.replace(/if \(!v\.address\) fieldErrors\.address = m\.enterServiceId;/g, 'if (!v.address) fieldErrors.address = m.enterAddress;');
code = code.replace(/const email = str\(formData\.get\("email"\)\)\.toLowerCase\(\);\n  const m = \(await getDict\(\)\)\.msg;\n  if \(!email\) return { done: false, message: m\.enterOfficialEmail };/g, 'const email = str(formData.get("email")).toLowerCase();\n  const m = (await getDict()).msg;\n  if (!email) return { done: false, message: m.enterEmail };');

fs.writeFileSync(file, code, 'utf-8');
console.log('actions.ts updated');
