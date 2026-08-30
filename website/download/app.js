const endpoint = 'https://bhbvzkogznvejhfrveqb.supabase.co/rest/v1/rpc/get_public_app_guard';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYnZ6a29nem52ZWpoZnJ2ZXFiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMyNzc3NjQsImV4cCI6MjA5ODg1Mzc2NH0.uj8yYrD-50kkb3lfmSQHs5KSL2rOMLGX92s7xePq9wE';

fetch(endpoint, { method:'POST', headers:{ apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json' }, body:JSON.stringify({ p_platform:'windows' }) })
  .then(async response => {
    const data = await response.json();
    if (!response.ok || data?.ok === false) throw new Error(data?.error || 'Release lookup failed');
    if (!/^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/(?:download\/[^/]+|latest\/download)\/[^?#]+$/.test(data.download_url || '')) throw new Error('No verified GitHub release is currently published.');
    if (!/^[0-9a-f]{64}$/i.test(data.download_sha256 || '')) throw new Error('The published release is missing its SHA-256 integrity hash.');
    location.replace(data.download_url);
  })
  .catch(error => {
    document.getElementById('status').textContent = error.message || 'The download is temporarily unavailable.';
    document.getElementById('retry').hidden = false;
  });
