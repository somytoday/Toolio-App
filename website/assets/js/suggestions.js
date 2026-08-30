import { signInWithGoogle, subscribe, supabase } from './toolio-auth.js';

const list = document.getElementById('suggestions-list');
const status = document.getElementById('suggestions-status');
const dialog = document.getElementById('suggestion-dialog');
const form = document.getElementById('suggestion-form');
const formStatus = document.getElementById('suggestion-form-status');
const addButton = document.getElementById('btn-add-suggestion');
const categoryLabels = { new_tool:'New Tool', feature_request:'Feature Request', improvement:'Improvement' };
const roadmapLabels = { under_review:'Under Review', planned:'Planned', in_progress:'In Progress', completed:'Completed', declined:'Declined' };
let session = null;
let items = [];
let sort = 'votes';

async function rpc(name, params = {}) {
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error || 'Request failed.');
  return data;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  list.replaceChildren();
  if (!items.length) {
    const empty = element('div', 'suggestions-empty');
    empty.append(element('strong', '', 'No approved suggestions yet.'), element('p', '', 'Sign in and send the first idea for review.'));
    list.append(empty);
    return;
  }

  for (const item of items) {
    const card = element('article', 'suggestion-card');
    const vote = element('button', `suggestion-vote${item.has_voted ? ' voted' : ''}`);
    vote.type = 'button';
    vote.dataset.suggestionVote = item.id;
    vote.setAttribute('aria-pressed', String(Boolean(item.has_voted)));
    vote.setAttribute('aria-label', `${item.has_voted ? 'Remove vote from' : 'Vote for'} ${item.title}`);
    vote.append(element('span', 'suggestion-vote-arrow', '⌃'), element('strong', '', String(item.vote_count || 0)));

    const content = element('div', 'suggestion-card-content');
    content.append(element('h3', '', item.title), element('p', '', item.description));
    const tags = element('div', 'suggestion-tags');
    tags.append(element('span', 'suggestion-tag category', categoryLabels[item.category] || item.category));
    tags.append(element('span', `suggestion-tag status ${item.roadmap_status}`, roadmapLabels[item.roadmap_status] || item.roadmap_status));
    content.append(tags);
    card.append(vote, content);
    list.append(card);
  }
}

async function loadSuggestions() {
  list.setAttribute('aria-busy', 'true');
  status.textContent = 'Loading approved suggestions…';
  try {
    const data = await rpc('get_public_suggestions', { p_sort:sort });
    items = data.suggestions || [];
    render();
    status.textContent = items.length ? `${items.length} approved suggestion${items.length === 1 ? '' : 's'}` : '';
  } catch (error) {
    if (!items.length) render();
    const retry = element('button', 'suggestions-retry', 'Retry');
    retry.type = 'button';
    retry.addEventListener('click', loadSuggestions, { once:true });
    status.replaceChildren(document.createTextNode('Suggestions are temporarily unavailable. '), retry);
  } finally {
    list.setAttribute('aria-busy', 'false');
  }
}

async function signIn() {
  if (location.hash !== '#suggestions') history.replaceState(null, '', '#suggestions');
  const result = await signInWithGoogle();
  if (!result.ok) status.textContent = result.error;
}

addButton.addEventListener('click', () => {
  if (!session) return signIn();
  formStatus.textContent = '';
  dialog.showModal();
  document.getElementById('suggestion-title').focus();
});

document.getElementById('btn-close-suggestion').addEventListener('click', () => dialog.close());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!session) return signIn();
  if (!form.reportValidity()) return;
  const submit = document.getElementById('btn-submit-suggestion');
  submit.disabled = true;
  formStatus.textContent = 'Submitting…';
  const fields = new FormData(form);
  try {
    await rpc('submit_website_suggestion', {
      p_title:String(fields.get('title') || '').trim(),
      p_description:String(fields.get('description') || '').trim(),
      p_category:String(fields.get('category') || ''),
    });
    form.reset();
    dialog.close();
    status.textContent = 'Suggestion received. It will appear after admin approval.';
  } catch (error) {
    formStatus.textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});

list.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-suggestion-vote]');
  if (!button) return;
  if (!session) return signIn();
  button.disabled = true;
  try {
    const result = await rpc('toggle_website_suggestion_vote', { p_suggestion_id:button.dataset.suggestionVote });
    const item = items.find((entry) => entry.id === button.dataset.suggestionVote);
    if (item) Object.assign(item, { has_voted:result.voted, vote_count:result.vote_count });
    render();
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelectorAll('[data-suggestions-sort]').forEach((button) => button.addEventListener('click', () => {
  sort = button.dataset.suggestionsSort;
  document.querySelectorAll('[data-suggestions-sort]').forEach((candidate) => {
    const active = candidate === button;
    candidate.classList.toggle('active', active);
    candidate.setAttribute('aria-pressed', String(active));
  });
  loadSuggestions();
}));

function openSuggestionsHash() {
  if (location.hash === '#suggestions') document.querySelector('.nav-tab-btn[data-tab="suggestions"]')?.click();
}
if (document.readyState === 'complete') openSuggestionsHash();
else document.addEventListener('DOMContentLoaded', openSuggestionsHash, { once:true });
loadSuggestions();
subscribe(({ session: nextSession }) => { session = nextSession; loadSuggestions(); });
