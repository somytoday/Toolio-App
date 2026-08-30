const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const shared = read('assets/js/toolio-auth.js');
const suggestions = read('assets/js/suggestions.js');
const websiteApp = read('assets/js/app.js');
const storeApp = read('store/js/app.js');
const migration = read('../supabase/migrations/20260830110531_web_customer_classification.sql');
const adminApp = read('admin/app.js');
const adminHtml = read('admin/index.html');
const pages = ['index.html', 'store/index.html', 'store/product.html'].map(read);

assert.match(shared, /storageKey:\s*['"]toolio-website-auth['"]/);
assert.match(shared, /location\.protocol === ['"]http:['"]/);
assert.match(shared, /location\.protocol === ['"]https:['"]/);
assert.match(shared, /signInWithOAuth\(\{\s*provider:\s*['"]google['"]/s);
assert.match(shared, /auth\.signOut\(\)/);
assert.match(shared, /onAuthStateChange/);
assert.doesNotMatch(shared, /service_role|SUPABASE_SERVICE/i);

assert.doesNotMatch(suggestions, /createClient/);
assert.match(suggestions, /toolio-auth\.js/);
assert.match(websiteApp, /ToolioAuth\??\.signInWithGoogle/);
assert.match(storeApp, /PENDING_PURCHASE_KEY/);
assert.match(storeApp, /PENDING_PURCHASE_MAX_AGE_MS/);
assert.match(storeApp, /consumePendingPurchaseIntent/);
assert.match(storeApp, /ToolioAuth\??\.signInWithGoogle/);
assert.doesNotMatch(storeApp, /OAuth will be activated|OAuth backend will be connected/i);

for (const page of pages) assert.match(page, /toolio-auth-loader\.js/);
assert.doesNotMatch(read('index.html'), /store-prototype/);

assert.match(migration, /create table if not exists public\.web_customer_accounts/);
assert.match(migration, /create or replace function public\.claim_app_trial\(p_device_id text\)/);
assert.match(migration, /Active device required/);
assert.match(migration, /revoke all on function public\.register_web_customer\(\) from public, anon/);
assert.doesNotMatch(migration.match(/create or replace function public\.handle_new_user[\s\S]*?\$\$;/)?.[0] || '', /insert into public\.subscriptions/);
assert.match(adminHtml, /data-user-audience="app"/);
assert.match(adminHtml, /data-user-audience="store"/);
assert.match(adminApp, /get_admin_web_customer_ids/);
assert.match(adminApp, /function isAppUser/);

console.log('Unified auth contract checks passed.');
