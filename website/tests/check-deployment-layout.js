const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const requiredFiles = [
  'index.html',
  'vercel.json',
  'store/index.html',
  'store/product.html',
  'download/index.html',
  'admin/index.html',
  'admin/app.js',
  'admin/styles.css',
];

for (const file of requiredFiles) {
  assert.ok(fs.existsSync(path.join(root, file)), `Missing deployment file: ${file}`);
}

const config = JSON.parse(read('vercel.json'));
const routes = JSON.stringify(config.rewrites || []);
for (const route of ['/store', '/download', '/admin']) {
  assert.match(routes, new RegExp(`"source":"${route.replace('/', '\\/')}`), `Missing Vercel route: ${route}`);
}

const runtimeFiles = [
  read('index.html'),
  read('store/index.html'),
  read('store/product.html'),
  read('admin/index.html'),
  read('admin/app.js'),
];
for (const source of runtimeFiles) {
  assert.doesNotMatch(source, /store-prototype|_vercel_admin_deploy/);
  assert.doesNotMatch(source, /service_role|SUPABASE_SERVICE/i);
}

assert.match(read('admin/app.js'), /get_admin_users/);
assert.match(read('admin/app.js'), /get_admin_web_customer_ids/);

console.log('Unified Vercel deployment layout checks passed.');
