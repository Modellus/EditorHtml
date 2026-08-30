const { test, expect } = require('@playwright/test');

const base = 'http://127.0.0.1:8432';

const facets = {
  kinds: [{id:'discussion',count:2},{id:'question',count:3},{id:'bug',count:1},{id:'feature',count:0},{id:'model',count:0},{id:'character',count:0},{id:'video',count:0},{id:'data',count:0},{id:'audio',count:1},{id:'object',count:0}],
  statuses: [{id:'open',count:5},{id:'answered',count:1},{id:'planned',count:0},{id:'in_progress',count:0},{id:'accepted',count:1},{id:'declined',count:0},{id:'duplicate',count:0},{id:'closed',count:0}],
  education: [{id:'lvl_sec',name:'Secondary',count:4},{id:null,name:'Uncategorized',count:3}],
  sciences: [{id:'sci_phys',name:'Physics',count:5},{id:null,name:'Uncategorized',count:2}],
  total: 7, unread: 2
};

const topics = [
  { id:'t1', kind:'audio', title:'A cello note for the wave demo', body:'A clean sustained note would help the standing-wave model a great deal.', tags:['sound','waves'], status:'open',
    is_pinned:1, is_locked:0, is_deleted:0, vote_count:4, reply_count:2, last_activity_at:new Date(Date.now()-3600e3).toISOString(),
    created_by:'u1', created_at:new Date(Date.now()-86400e3).toISOString(), updated_at:new Date().toISOString(), author_name:'Ana Silva', author_avatar:'https://example.com/ana.png', has_voted:false, is_unread:true },
  { id:'t2', kind:'bug', title:'Pendulum <script>alert(1)</script> drifts', body:'It drifts after a minute of running.', tags:['mechanics'], status:'answered',
    is_pinned:0, is_locked:1, is_deleted:0, vote_count:1, reply_count:1, last_activity_at:new Date(Date.now()-7200e3).toISOString(),
    created_by:'u2', created_at:new Date(Date.now()-172800e3).toISOString(), updated_at:new Date().toISOString(), author_name:'Bo Chen', has_voted:true, is_unread:false }
];

const topicDetail = {
  ...topics[0],
  replies: [
    { id:'r1', topic_id:'t1', parent_reply_id:null, body:'I can record one this week.', is_answer:1, vote_count:2, is_deleted:0,
      created_by:'u2', created_at:new Date(Date.now()-1800e3).toISOString(), updated_at:new Date().toISOString(), author_name:'Bo Chen', has_voted:false },
    { id:'r2', topic_id:'t1', parent_reply_id:'r1', body:'removed thing', is_answer:0, vote_count:0, is_deleted:1,
      created_by:'u3', created_at:new Date(Date.now()-900e3).toISOString(), updated_at:new Date().toISOString(), author_name:'Cy', has_voted:false }
  ],
  attachments: [{ id:'a1', topic_id:'t1', reply_id:null, filename:'cello.wav', content_type:'audio/wav', size_bytes:820000, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/a1' }]
};

const sciences = [
  { id: 'sci_phys', name: 'Physics' },
  { id: 'sci_chem', name: 'Chemistry' },
  { id: 'sci_bio', name: 'Biology' }
];

const educationLevels = [
  { id: 'lvl_pri', name: 'Primary' },
  { id: 'lvl_sec', name: 'Secondary' },
  { id: 'lvl_uni', name: 'University' }
];

const session = { token: 'test-token', userId: 'u1', name: 'Ana Silva', email: 'ana@example.com', exp: Math.floor(Date.now() / 1000) + 3600 };

async function stubApi(page) {
  await page.route('**/forum/facets', route => route.fulfill({ json: facets }));
  await page.route('**/forum/topics?*', route => route.fulfill({ json: { items: topics, total: 42 } }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: topicDetail }));
  await page.route('**/sciences', route => route.fulfill({ json: sciences }));
  await page.route('**/education-levels', route => route.fulfill({ json: educationLevels }));
}

async function signIn(page, flags = [{ id: 'f1', key: 'can_moderate_forum', name: 'Moderate', is_enabled: 0 }]) {
  await page.addInitScript(s => {
    localStorage.setItem('mp.session', JSON.stringify(s));
    localStorage.setItem('mp.user', JSON.stringify({ id: s.userId, name: s.name }));
  }, session);
  await page.route('**/users/u1/feature-flags', route => route.fulfill({ json: flags }));
}

test('forum list renders with the docs chrome and escapes user text', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html`);

  await expect(page.locator('.site-header .navmenu a.active')).toHaveText('Forum');
  await expect(page.locator('.docs-sidebar')).toBeVisible();
  await expect(page.locator('h1').first()).toHaveText('Forum');

  await expect(page.locator('.forum-topic-row')).toHaveCount(2);
  await expect(page.locator('.forum-topic-title').first()).toHaveText('A cello note for the wave demo');
  await expect(page.locator('.forum-topic-row').first().locator('.forum-unread-dot')).toBeVisible();
  await expect(page.locator('.forum-topic-row').first().locator('.forum-pin')).toBeVisible();
  await expect(page.locator('.forum-topic-row').nth(1).locator('.forum-lock')).toBeVisible();

  await expect(page.locator('.forum-topic-title').nth(1)).toHaveText('Pendulum <script>alert(1)</script> drifts');
  expect(dialogs).toEqual([]);

  await expect(page.locator('#forum-views a').first()).toContainText('All topics');
  await expect(page.locator('#forum-views .forum-sidebar-badge')).toHaveText('2');
  await expect(page.locator('#forum-kinds a')).toHaveCount(10);
  await expect(page.locator('#forum-statuses a')).toHaveCount(8);
  await expect(page.locator('#forum-sciences a').nth(1)).toContainText('Uncategorized');
  await expect(page.locator('.forum-pager-label')).toHaveText('1–20 of 42');
  await expect(page.locator('[data-page="previous"]')).toBeDisabled();
  await expect(page.locator('[data-page="next"]')).toBeEnabled();
  expect(errors).toEqual([]);
});

test('a facet click filters and shows a removable chip', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let lastUrl = '';
  await page.route('**/forum/topics?*', route => { lastUrl = route.request().url(); route.fulfill({ json: { items: topics, total: 7 } }); });
  await page.goto(`${base}/pages/forum/index.html`);
  await page.locator('#forum-kinds a', { hasText: 'Bug' }).click();
  await expect(page.locator('.forum-filter-chip')).toHaveText(/Bug/);
  expect(lastUrl).toContain('kind=bug');
  await page.locator('.forum-filter-chip button').click();
  await expect(page.locator('.forum-filter-chip')).toHaveCount(0);
});

test('topic detail shows the thread, the accepted answer and a tombstone', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  await expect(page.locator('#forum-topic-view h1')).toHaveText('A cello note for the wave demo');
  await expect(page.locator('.forum-post')).toHaveCount(3);
  await expect(page.locator('.forum-post.is-answer')).toHaveCount(1);
  await expect(page.locator('.forum-post.is-nested')).toHaveCount(1);
  await expect(page.locator('.forum-post-text.is-removed')).toHaveText('This post was removed by a moderator.');
  await expect(page.locator('.forum-attachment')).toContainText('cello.wav');
  await expect(page.locator('.forum-attachment-size')).toHaveText('801 KB');
  await expect(page.locator('#forum-reply-body')).toBeVisible();
  await expect(page.locator('.forum-moderation')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the main page menu links to the forum', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/home/home.html`);
  const link = page.locator('.navmenu a', { hasText: 'Forum' });
  await expect(link).toHaveCount(1);
  await link.click();
  await expect(page).toHaveURL(/\/pages\/forum\/index\.html$/);
});

test('a signed-in reader gets the reply form and can deep link to the composer', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page, [{ id: 'f1', key: 'can_moderate_forum', name: 'Moderate', is_enabled: 0 }]);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));

  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);
  await expect(page.locator('#forum-reply-body')).toBeVisible();
  await expect(page.locator('.forum-moderation')).toHaveCount(0);

  await page.goto(`${base}/pages/forum/index.html#/new`);
  await expect(page.locator('#forum-compose-kind')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a post shows the picture of its author, and initials when there is none', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  const topicAvatar = page.locator('.forum-post').first().locator('.forum-avatar');
  await expect(topicAvatar).toHaveAttribute('src', 'https://example.com/ana.png');
  const replyAvatar = page.locator('.forum-post').nth(1).locator('.forum-avatar');
  await expect(replyAvatar).toHaveText('BC');
});

test('the composer offers every catalogue science and education level', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/new`);

  const scienceOptions = page.locator('#forum-compose-science option');
  await expect(scienceOptions).toHaveCount(4);
  await expect(scienceOptions).toHaveText(['Not specified', 'Biology', 'Chemistry', 'Physics']);
  const educationOptions = page.locator('#forum-compose-education option');
  await expect(educationOptions).toHaveCount(4);
  await expect(educationOptions).toHaveText(['Not specified', 'Primary', 'Secondary', 'University']);
  expect(errors).toEqual([]);
});

test('a signed-out visitor is sent to the login page', async ({ page }) => {
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html`);
  await expect(page).toHaveURL(/\/pages\/login\/index\.html$/);
});

test('a moderator gets the moderation bar', async ({ page }) => {
  await signIn(page, [{ id: 'f1', key: 'can_moderate_forum', name: 'Moderate', is_enabled: 1 }]);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);
  await expect(page.locator('.forum-moderation')).toBeVisible();
  await expect(page.locator('#forum-moderate-status')).toHaveValue('open');
  await expect(page.locator('[data-moderate="pin"]')).toHaveText('Unpin');
  await expect(page.locator('[data-moderate="delete"]')).toBeVisible();
  await expect(page.locator('.forum-post-text.is-removed')).toHaveCount(0);
});

test('composing a topic posts the canonical payload', async ({ page }) => {
  await signIn(page, [{ id: 'f1', key: 'can_moderate_forum', name: 'Moderate', is_enabled: 0 }]);
  await stubApi(page);
  let posted = null;
  await page.route('**/forum/topics', route => {
    if (route.request().method() !== 'POST')
      return route.fallback();
    posted = JSON.parse(route.request().postData());
    return route.fulfill({ status: 201, json: { ...topicDetail, id: 't9' } });
  });
  await page.goto(`${base}/pages/forum/index.html`);
  await page.locator('#forum-new-button').click();
  await page.locator('#forum-compose-kind').selectOption('audio');
  await page.locator('#forum-compose-title').fill('A triangle wave sample');
  await page.locator('#forum-compose-body').fill('Useful for the Fourier unit.');
  await page.locator('#forum-compose-tags').fill('sound, fourier ,, sound');
  await page.locator('#forum-compose-submit').click();
  await expect.poll(() => posted).not.toBeNull();
  expect(posted.kind).toBe('audio');
  expect(posted.title).toBe('A triangle wave sample');
  expect(posted.tags).toEqual(['sound', 'fourier', 'sound']);
});

test('a promoted suggestion names the catalogue row it became', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, resolved_kind: 'audios', resolved_id: 'audio-9', status: 'accepted' } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);
  const banner = page.locator('.forum-resolved');
  await expect(banner).toContainText('became a sound in the catalogue');
  await expect(banner.locator('code')).toHaveText('audio-9');
  await expect(banner.locator('a')).toHaveAttribute('href', '/pages/catalog/index.html');
});
