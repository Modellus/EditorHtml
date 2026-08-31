const { test, expect } = require('@playwright/test');

const base = 'http://127.0.0.1:8432';

const facets = {
  kinds: [{id:'discussion',count:2},{id:'question',count:3},{id:'bug',count:1},{id:'feature',count:0},{id:'model',count:0},{id:'character',count:0},{id:'video',count:0},{id:'data',count:0},{id:'audio',count:1},{id:'object',count:0}],
  statuses: [{id:'open',count:5},{id:'answered',count:1},{id:'planned',count:0},{id:'in_progress',count:0},{id:'accepted',count:1},{id:'declined',count:0},{id:'duplicate',count:0},{id:'closed',count:0}],
  education: [{id:'lvl_sec',name:'Secondary',count:4},{id:null,name:'Uncategorized',count:3}],
  sciences: [{id:'sci_phys',name:'Physics',count:5},{id:null,name:'Uncategorized',count:2}],
  groups: [{id:'g1',slug:'wave-optics',name:'Wave Optics',icon:null,icon_url:'https://example.com/g1-icon.png',count:2},{id:null,slug:null,name:'No group',icon:null,icon_url:null,count:5}],
  total: 7, unread: 2
};

const groups = [
  { id:'g1', slug:'wave-optics', name:'Wave Optics', description:'Interference, diffraction and everything that needs a wavefront.', icon:null, color:null,
    icon_url:'https://example.com/g1-icon.png', banner_url:'https://example.com/g1-banner.png',
    science_id:'sci_phys', education_level_id:'lvl_sec', member_count:2, topic_count:2,
    created_by:'u1', created_at:new Date(Date.now()-864000e3).toISOString(), updated_at:new Date().toISOString(),
    science_name:'Physics', education_level_name:'Secondary', owner_name:'Ana Silva', owner_avatar:'https://example.com/ana.png',
    viewer_role:'owner', is_member:true },
  { id:'g2', slug:'sound-lab', name:'Sound <script>alert(1)</script> Lab', description:null, icon:null, color:null,
    icon_url:null, banner_url:null,
    science_id:null, education_level_id:null, member_count:9, topic_count:0,
    created_by:'u2', created_at:new Date(Date.now()-172800e3).toISOString(), updated_at:new Date().toISOString(),
    science_name:null, education_level_name:null, owner_name:'Bo Chen', owner_avatar:null,
    viewer_role:null, is_member:false }
];

const groupMembers = [
  { group_id:'g1', user_id:'u1', role:'owner', joined_at:new Date(Date.now()-864000e3).toISOString(), user_name:'Ana Silva', user_avatar:'https://example.com/ana.png' },
  { group_id:'g1', user_id:'u2', role:'member', joined_at:new Date(Date.now()-86400e3).toISOString(), user_name:'Bo Chen', user_avatar:null }
];

const topics = [
  { id:'t1', kind:'audio', title:'A cello note for the wave demo', body:'A clean sustained note would help the standing-wave model a great deal.', tags:['sound','waves'], status:'open',
    is_pinned:1, is_locked:0, is_deleted:0, vote_count:4, reply_count:2, last_activity_at:new Date(Date.now()-3600e3).toISOString(),
    group_id:'g1', group_name:'Wave Optics', group_slug:'wave-optics',
    created_by:'u1', created_at:new Date(Date.now()-86400e3).toISOString(), updated_at:new Date().toISOString(), author_name:'Ana Silva', author_avatar:'https://example.com/ana.png', has_voted:false, is_unread:true },
  { id:'t2', kind:'bug', title:'Pendulum <script>alert(1)</script> drifts', body:'It drifts after a minute of running.', tags:['mechanics'], status:'answered',
    is_pinned:0, is_locked:1, is_deleted:0, vote_count:1, reply_count:1, last_activity_at:new Date(Date.now()-7200e3).toISOString(),
    group_id:null, group_name:null, group_slug:null,
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
  await page.route('**/forum/groups*', route => {
    const url = new URL(route.request().url());
    if (url.searchParams.has('limit'))
      return route.fulfill({ json: { items: groups, total: groups.length } });
    return route.fulfill({ json: groups.filter(group => group.is_member) });
  });
  await page.route('**/forum/groups/*/members', route => route.fulfill({ json: groupMembers }));
  await page.route('**/forum/groups/wave-optics', route => route.fulfill({ json: groups[0] }));
  await page.route('**/forum/groups/g1', route => route.fulfill({ json: groups[0] }));
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

async function dropFiles(page, selector, files) {
  const dataTransfer = await page.evaluateHandle(items => {
    const transfer = new DataTransfer();
    for (const item of items)
      transfer.items.add(new File([item.body], item.name, { type: item.type }));
    return transfer;
  }, files);
  await page.dispatchEvent(selector, 'dragenter', { dataTransfer });
  await page.dispatchEvent(selector, 'dragover', { dataTransfer });
  await page.dispatchEvent(selector, 'drop', { dataTransfer });
}

const pngBody = 'PNG-BYTES';

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

  await expect(page.locator('.forum-topic-row').first().locator('.forum-avatar')).toHaveAttribute('src', 'https://example.com/ana.png');
  await expect(page.locator('.forum-topic-row').nth(1).locator('.forum-avatar')).toHaveText('BC');

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

test('the composer takes several dropped files and shows a thumbnail of each', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/new`);

  const dropzone = page.locator('#forum-compose-attachments .forum-dropzone');
  await expect(dropzone).toBeVisible();
  await expect(dropzone).toContainText('Drag files here');
  await expect(dropzone).toContainText('Up to 10 files, 10.0 MB each');

  await dropFiles(page, '#forum-compose-attachments .forum-dropzone', [
    { name: 'rig.png', type: 'image/png', body: pngBody },
    { name: 'run-1.csv', type: 'text/csv', body: 'a,b' },
    { name: 'note.wav', type: 'audio/wav', body: 'wav' }
  ]);

  const cards = page.locator('.forum-attachment-card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0).locator('img.forum-attachment-thumb')).toHaveAttribute('src', /^blob:/);
  await expect(cards.nth(1).locator('.forum-attachment-thumb i')).toHaveClass(/fa-table/);
  await expect(cards.nth(2).locator('.forum-attachment-thumb i')).toHaveClass(/fa-volume-high/);
  await expect(cards.nth(1)).toContainText('run-1.csv');
  await expect(cards.nth(1).locator('.forum-attachment-size')).toHaveText('3 B');

  await cards.nth(1).locator('.forum-attachment-remove').click();
  await expect(cards).toHaveCount(2);
  await expect(page.locator('.forum-dropzone-files')).not.toContainText('run-1.csv');
  expect(errors).toEqual([]);
});

test('dropping anywhere on the compose form highlights the drop zone', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/new`);

  const dataTransfer = await page.evaluateHandle(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['x'], 'x.png', { type: 'image/png' }));
    return transfer;
  });
  await page.dispatchEvent('#forum-compose-body', 'dragenter', { dataTransfer });
  await expect(page.locator('#forum-compose-attachments .forum-dropzone')).toHaveClass(/is-dragging/);
  await page.dispatchEvent('#forum-compose-body', 'drop', { dataTransfer });
  await expect(page.locator('.forum-attachment-card')).toHaveCount(1);
  await expect(page.locator('#forum-compose-attachments .forum-dropzone')).not.toHaveClass(/is-dragging/);
});

test('a file past the size limit is refused by name', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/new`);

  await dropFiles(page, '#forum-compose-attachments .forum-dropzone', [
    { name: 'huge.bin', type: 'application/octet-stream', body: 'x'.repeat(0) },
    { name: 'small.csv', type: 'text/csv', body: 'a,b' }
  ]);
  await expect(page.locator('.forum-attachment-card')).toHaveCount(2);

  await page.evaluate(() => {
    const input = document.querySelector('#forum-compose-attachments .forum-dropzone-input');
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(11 * 1024 * 1024)], 'over.bin', { type: 'application/octet-stream' }));
    input.files = transfer.files;
    input.dispatchEvent(new Event('change'));
  });
  await expect(page.locator('.forum-dropzone-message')).toContainText('over.bin is larger than 10.0 MB');
  await expect(page.locator('.forum-attachment-card')).toHaveCount(2);
});

test('posting a topic sends every attached file as its own part', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let body = '';
  await page.route('**/forum/topics', route => {
    if (route.request().method() !== 'POST')
      return route.fallback();
    body = route.request().postData();
    return route.fulfill({ status: 201, json: { ...topicDetail, id: 't9' } });
  });
  await page.goto(`${base}/pages/forum/index.html#/new`);
  await page.locator('#forum-compose-kind').selectOption('data');
  await page.locator('#forum-compose-title').fill('Three runs of the same drop');
  await page.locator('#forum-compose-body').fill('The readings and a photo of the rig.');
  await dropFiles(page, '#forum-compose-attachments .forum-dropzone', [
    { name: 'run-1.csv', type: 'text/csv', body: 'a,b' },
    { name: 'rig.png', type: 'image/png', body: pngBody }
  ]);
  await page.locator('#forum-compose-submit').click();

  await expect.poll(() => body).not.toBe('');
  expect(body).toContain('name="attachment"; filename="run-1.csv"');
  expect(body).toContain('name="attachment"; filename="rig.png"');
  expect(body).toContain('name="title"');
});

test('a reply sends the files dropped on its form', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  let body = '';
  await page.route('**/forum/topics/t1/replies', route => {
    body = route.request().postData();
    return route.fulfill({ status: 201, json: { id: 'r9' } });
  });
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  await expect(page.locator('#forum-reply-attachments .forum-dropzone')).toBeVisible();
  await page.locator('#forum-reply-body').fill('Here are both traces.');
  await dropFiles(page, '#forum-reply-attachments .forum-dropzone', [
    { name: 'trace-1.png', type: 'image/png', body: pngBody },
    { name: 'trace-2.png', type: 'image/png', body: pngBody }
  ]);
  await expect(page.locator('#forum-reply-attachments .forum-attachment-card')).toHaveCount(2);
  await page.locator('#forum-reply-submit').click();

  await expect.poll(() => body).not.toBe('');
  expect(body).toContain('filename="trace-1.png"');
  expect(body).toContain('filename="trace-2.png"');
});

test('an image attachment on a post is shown as a thumbnail', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, attachments: [
    ...topicDetail.attachments,
    { id:'a2', topic_id:'t1', reply_id:null, filename:'rig.png', content_type:'image/png', size_bytes:2048, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/a2' }
  ] } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  const image = page.locator('.forum-attachment-gallery .forum-attachment-image');
  await expect(image).toHaveCount(1);
  await expect(image.locator('img')).toHaveAttribute('src', 'https://example.com/att/a2');
  await expect(image).toContainText('rig.png');
  await expect(page.locator('.forum-attachment')).toContainText('cello.wav');
  await expect(page.locator('.forum-attachment i')).toHaveClass(/fa-volume-high/);
});

test('hovering an image attachment shows a preview and a download button', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/att/a2', route => route.fulfill({ status: 200, contentType: 'image/png', headers: { 'content-disposition': 'attachment; filename="rig.png"' }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8//8/AzbAxIAHDDVJAM6cAwrqM3jzAAAAAElFTkSuQmCC', 'base64') }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, attachments: [
    { id:'a2', topic_id:'t1', reply_id:null, filename:'rig.png', content_type:'image/png', size_bytes:2048, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/a2' }
  ] } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  const card = page.locator('.forum-preview-card');
  await expect(card).toBeHidden();
  await page.locator('.forum-attachment-image').hover();
  await expect(card).toBeVisible();
  await expect(card.locator('img.forum-preview-media')).toHaveAttribute('src', 'https://example.com/att/a2');
  await expect(card.locator('.forum-preview-name')).toHaveText('rig.png');
  const download = card.locator('.forum-preview-action[download]');
  await expect(download).toHaveAttribute('href', 'https://example.com/att/a2');
  const open = card.locator('.forum-preview-action[target="_blank"]');
  await expect(open).toHaveText('Open');
  await expect(open).toHaveAttribute('href', 'https://example.com/att/a2?inline=1');
  await expect(open).toHaveAttribute('rel', 'noopener');

  await download.hover();
  await expect(card).toBeVisible();
  await page.mouse.move(4, 4);
  await expect(card).toBeHidden();
  expect(errors).toEqual([]);
});

test('hovering a data file previews its first lines, and a sound gets a player', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/att/csv', route => route.fulfill({ status: 200, contentType: 'text/csv', body: 't,x\n0,0\n1,4.9\n2,19.6\n' }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, attachments: [
    { id:'a3', topic_id:'t1', reply_id:null, filename:'run-1.csv', content_type:'text/csv', size_bytes:24, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/csv' },
    ...topicDetail.attachments
  ] } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  const card = page.locator('.forum-preview-card');
  await page.locator('.forum-attachment', { hasText: 'run-1.csv' }).hover();
  await expect(card.locator('.forum-preview-text')).toHaveText('t,x\n0,0\n1,4.9\n2,19.6');

  await page.locator('.forum-attachment', { hasText: 'cello.wav' }).hover();
  await expect(card.locator('audio.forum-preview-audio')).toHaveAttribute('src', 'https://example.com/att/a1');
  await expect(card.locator('.forum-preview-name')).toHaveText('cello.wav');
});

test('an attachment with no preview names its kind, and Escape closes the card', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, attachments: [
    { id:'a4', topic_id:'t1', reply_id:null, filename:'rig.zip', content_type:'application/zip', size_bytes:99000, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/a4' }
  ] } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  const card = page.locator('.forum-preview-card');
  await page.locator('.forum-attachment').hover();
  await expect(card.locator('.forum-preview-file')).toHaveText('Archive');
  await expect(card.locator('.forum-attachment-size')).toHaveText('97 KB');
  await expect(card.locator('.forum-preview-action[target="_blank"]')).toHaveCount(0);
  await expect(card.locator('.forum-preview-action[download]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
});

test('a preview leaves the attachments beside it reachable', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, attachments: [
    { id:'a2', topic_id:'t1', reply_id:null, filename:'rig.png', content_type:'image/png', size_bytes:2048, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/a2' },
    ...topicDetail.attachments
  ] } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);
  const card = page.locator('.forum-preview-card');

  await page.locator('.forum-attachment', { hasText: 'cello.wav' }).hover();
  await expect(card).toBeVisible();
  const rowBox = await page.locator('.forum-attachment').boundingBox();
  const besideRow = await card.boundingBox();
  expect(besideRow.x).toBeGreaterThanOrEqual(rowBox.x + rowBox.width);

  await page.locator('.forum-attachment-image').hover();
  await expect(card.locator('img.forum-preview-media')).toBeVisible();
  const imageBox = await page.locator('.forum-attachment-image').boundingBox();
  const aboveImage = await card.boundingBox();
  expect(aboveImage.y + aboveImage.height).toBeLessThanOrEqual(imageBox.y);
});

test('opening an attachment in a tab asks the API to render it rather than send it down', async ({ page, context }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.route('**/att/a2*', route => route.fulfill({ status: 200, contentType: 'image/png', headers: { 'content-disposition': 'inline; filename="rig.png"' }, body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAFUlEQVR4nGP8//8/AzbAxIAHDDVJAM6cAwrqM3jzAAAAAElFTkSuQmCC', 'base64') }));
  await page.route('**/forum/topics/t1', route => route.fulfill({ json: { ...topicDetail, attachments: [
    { id:'a2', topic_id:'t1', reply_id:null, filename:'rig.png', content_type:'image/png', size_bytes:2048, uploaded_by:'u1', created_at:new Date().toISOString(), url:'https://example.com/att/a2' }
  ] } }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  await page.locator('.forum-attachment-image').hover();
  const opened = await Promise.all([
    context.waitForEvent('page'),
    page.locator('.forum-preview-card .forum-preview-action[target="_blank"]').click()
  ]);
  expect(opened[0].url()).toBe('https://example.com/att/a2?inline=1');
});

test('the preview is wide enough to read the file it shows', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);
  await page.locator('.forum-attachment').hover();
  const box = await page.locator('.forum-preview-card').boundingBox();
  expect(box.width).toBe(640);
});

test('the sidebar lists the communities with live topics, and the general board beside them', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html`);

  const rows = page.locator('#forum-groups a');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Wave Optics');
  await expect(rows.first()).toHaveAttribute('href', '#/group/wave-optics');
  await expect(rows.nth(1)).toContainText('No group');
  await expect(page.locator('.forum-sidebar-link')).toHaveAttribute('href', '#/groups');
  expect(errors).toEqual([]);
});

test('a topic in a community carries a chip that links to it', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html`);

  const rows = page.locator('.forum-topic-row');
  await expect(rows.first().locator('.forum-chip-group')).toHaveText('Wave Optics');
  await expect(rows.first().locator('.forum-chip-group')).toHaveAttribute('href', '#/group/wave-optics');
  await expect(rows.nth(1).locator('.forum-chip-group')).toHaveCount(0);
});

test('the general-board bucket filters in place and clears from its chip', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let lastUrl = '';
  await page.route('**/forum/topics?*', route => { lastUrl = route.request().url(); route.fulfill({ json: { items: topics, total: 7 } }); });
  await page.goto(`${base}/pages/forum/index.html`);

  await page.locator('#forum-groups a', { hasText: 'No group' }).click();
  await expect(page.locator('.forum-filter-chip')).toHaveText(/No group/);
  await expect.poll(() => lastUrl).toContain('group_id=none');
  await page.locator('.forum-filter-chip button').click();
  await expect(page.locator('.forum-filter-chip')).toHaveCount(0);
});

test('a group page heads the board with the community and narrows the list to it', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  let lastUrl = '';
  await page.route('**/forum/topics?*', route => { lastUrl = route.request().url(); route.fulfill({ json: { items: [topics[0]], total: 1 } }); });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  await expect(page.locator('#forum-group-banner h1')).toHaveText('Wave Optics');
  await expect(page.locator('#forum-list-heading')).toBeHidden();
  await expect(page.locator('#forum-group-banner .forum-group-meta')).toContainText('2 members');
  await expect(page.locator('#forum-group-banner .forum-group-meta')).toContainText('2 topics');
  await expect.poll(() => lastUrl).toContain('group_id=g1');
  await expect(page.locator('.forum-topic-row')).toHaveCount(1);
  await expect(page.locator('.forum-filter-chip')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('a group page names who is in it, and what each of them is to it', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  const members = page.locator('.forum-group-member');
  await expect(members).toHaveCount(2);
  await expect(members.first()).toContainText('Ana Silva');
  await expect(members.first().locator('.forum-chip-role')).toHaveText('Owner');
  await expect(members.first().locator('.forum-avatar')).toHaveAttribute('src', 'https://example.com/ana.png');
  await expect(members.nth(1).locator('.forum-avatar')).toHaveText('BC');
  await expect(members.nth(1).locator('.forum-chip-role')).toHaveCount(0);
});

test('a member of a group is offered Leave, and a stranger Join', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await expect(page.locator('#forum-group-banner [data-leave-group="g1"]')).toBeVisible();
  await expect(page.locator('#forum-group-banner [data-join-group]')).toHaveCount(0);

  await page.goto(`${base}/pages/forum/index.html#/groups`);
  const cards = page.locator('.forum-group-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.first().locator('[data-leave-group="g1"]')).toBeVisible();
  await expect(cards.nth(1).locator('[data-join-group="g2"]')).toBeVisible();
});

test('joining a group posts to it and redraws the card from the reload', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let joined = '';
  await page.route('**/forum/groups/g2/members', route => {
    joined = route.request().method();
    return route.fulfill({ status: 201, json: { group_id: 'g2', user_id: 'u1', role: 'member', joined_at: new Date().toISOString() } });
  });
  await page.goto(`${base}/pages/forum/index.html#/groups`);
  await page.locator('[data-join-group="g2"]').click();
  await expect.poll(() => joined).toBe('POST');
});

test('leaving a group names the member being removed', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let left = '';
  await page.route('**/forum/groups/g1/members/u1', route => {
    left = route.request().method();
    return route.fulfill({ status: 204, body: '' });
  });
  await page.goto(`${base}/pages/forum/index.html#/groups`);
  await page.locator('[data-leave-group="g1"]').click();
  await expect.poll(() => left).toBe('DELETE');
});

test('the group directory escapes what people called their communities', async ({ page }) => {
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/groups`);

  await expect(page.locator('.forum-group-card-name').nth(1)).toHaveText('Sound <script>alert(1)</script> Lab');
  expect(dialogs).toEqual([]);
});

test('the directory searches, sorts and narrows to the caller’s own groups', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let lastUrl = '';
  await page.route('**/forum/groups*', route => {
    const url = new URL(route.request().url());
    if (!url.searchParams.has('limit'))
      return route.fulfill({ json: groups.filter(group => group.is_member) });
    lastUrl = url.toString();
    return route.fulfill({ json: { items: groups, total: groups.length } });
  });
  await page.goto(`${base}/pages/forum/index.html#/groups`);

  await page.locator('#forum-group-sort').selectOption('members');
  await expect.poll(() => lastUrl).toContain('sort=members');
  await page.locator('#forum-group-mine').check();
  await expect.poll(() => lastUrl).toContain('mine=true');
  await page.locator('#forum-group-search').fill('optics');
  await expect.poll(() => lastUrl).toContain('q=optics');
});

test('opening a group posts the canonical payload and lands on the new community', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let posted = null;
  await page.route('**/forum/groups*', route => {
    if (route.request().method() === 'POST') {
      posted = JSON.parse(route.request().postData());
      return route.fulfill({ status: 201, json: groups[0] });
    }
    const url = new URL(route.request().url());
    if (url.searchParams.has('limit'))
      return route.fulfill({ json: { items: groups, total: groups.length } });
    return route.fulfill({ json: groups.filter(group => group.is_member) });
  });
  await page.goto(`${base}/pages/forum/index.html#/groups`);

  await page.locator('#forum-group-new-button').click();
  await page.locator('#forum-group-name').fill('Wave Optics');
  await page.locator('#forum-group-description').fill('Interference and diffraction.');
  await page.locator('#forum-group-science').selectOption('sci_phys');
  await page.locator('#forum-group-submit').click();

  await expect.poll(() => posted).not.toBeNull();
  expect(posted).toEqual({
    name: 'Wave Optics',
    description: 'Interference and diffraction.',
    science_id: 'sci_phys',
    education_level_id: null
  });
  await expect(page).toHaveURL(/#\/group\/wave-optics$/);
});

test('the composer offers only the groups the author may post into', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/new`);

  const options = page.locator('#forum-compose-group option');
  await expect(options).toHaveCount(2);
  await expect(options).toHaveText(['No group — the general board', 'Wave Optics']);
  expect(errors).toEqual([]);
});

test('writing from inside a community files the topic into it', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let posted = null;
  await page.route('**/forum/topics', route => {
    if (route.request().method() !== 'POST')
      return route.fallback();
    posted = JSON.parse(route.request().postData());
    return route.fulfill({ status: 201, json: { ...topicDetail, id: 't9' } });
  });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await page.locator('#forum-new-button').click();

  await expect(page.locator('#forum-compose-group')).toHaveValue('g1');
  await page.locator('#forum-compose-title').fill('Fringe spacing');
  await page.locator('#forum-compose-body').fill('Why does it widen?');
  await page.locator('#forum-compose-submit').click();
  await expect.poll(() => posted).not.toBeNull();
  expect(posted.group_id).toBe('g1');
});

test('a topic thread shows the community it was filed under', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/topics/t1/read', route => route.fulfill({ status: 204, body: '' }));
  await page.goto(`${base}/pages/forum/index.html#/topic/t1`);

  const chip = page.locator('.forum-topic-header .forum-chip-group');
  await expect(chip).toHaveText('Wave Optics');
  await expect(chip).toHaveAttribute('href', '#/group/wave-optics');
});

test('leaving a group page puts the whole board back', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let lastUrl = '';
  await page.route('**/forum/topics?*', route => { lastUrl = route.request().url(); route.fulfill({ json: { items: topics, total: 7 } }); });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await expect.poll(() => lastUrl).toContain('group_id=g1');

  await page.locator('#forum-group-banner .forum-link-button').click();
  await expect(page.locator('.forum-group-cards')).toBeVisible();
  await page.locator('#forum-groups-view .forum-link-button').click();

  await expect(page.locator('#forum-list-heading')).toBeVisible();
  await expect(page.locator('#forum-group-banner')).toBeHidden();
  await expect.poll(() => lastUrl).not.toContain('group_id');
});

test('a bucket picked on the way out of a group is the one that survives', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let lastUrl = '';
  await page.route('**/forum/topics?*', route => { lastUrl = route.request().url(); route.fulfill({ json: { items: topics, total: 7 } }); });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await expect.poll(() => lastUrl).toContain('group_id=g1');

  await page.locator('#forum-groups a', { hasText: 'No group' }).click();
  await expect(page.locator('#forum-list-heading')).toBeVisible();
  await expect.poll(() => lastUrl).toContain('group_id=none');
  await expect(page.locator('.forum-filter-chip')).toHaveText(/No group/);
});

test('the directory arrives with the sidebar drawn, however the reader got there', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/groups`);

  await expect(page.locator('#forum-groups a')).toHaveCount(2);
  await expect(page.locator('#forum-kinds a')).toHaveCount(10);
});

test('a group whose member list will not load says so instead of breaking the page', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/groups/*/members', route => route.fulfill({ status: 500, json: { error: 'nope' } }));
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  await expect(page.locator('#forum-group-banner h1')).toHaveText('Wave Optics');
  await expect(page.locator('#forum-group-status')).toContainText('Could not load the members');
  await expect(page.locator('.forum-topic-row')).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('a group that is not there says so instead of showing an empty community', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/groups/ghost', route => route.fulfill({ status: 404, json: { error: 'gone' } }));
  await page.goto(`${base}/pages/forum/index.html#/group/ghost`);

  await expect(page.locator('#forum-group-banner')).toContainText('Could not load this group');
  expect(errors).toEqual([]);
});

test('a group heads its page with the banner and wears its icon beside the name', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  const banner = page.locator('.forum-group-banner-image');
  await expect(banner).toBeVisible();
  await expect(banner.locator('img')).toHaveAttribute('src', 'https://example.com/g1-banner.png');
  await expect(page.locator('.forum-group-icon-slot img.forum-group-avatar')).toHaveAttribute('src', 'https://example.com/g1-icon.png');
  expect(errors).toEqual([]);
});

test('both lists show a group by its icon, and fall back to a glyph without one', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.goto(`${base}/pages/forum/index.html`);

  await expect(page.locator('#forum-groups img.forum-group-avatar')).toHaveAttribute('src', 'https://example.com/g1-icon.png');
  await expect(page.locator('#forum-groups a').nth(1).locator('span.forum-group-avatar i')).toHaveClass(/fa-users/);

  await page.goto(`${base}/pages/forum/index.html#/groups`);
  const cards = page.locator('.forum-group-card');
  await expect(cards.first().locator('img.forum-group-avatar')).toHaveAttribute('src', 'https://example.com/g1-icon.png');
  await expect(cards.nth(1).locator('span.forum-group-avatar i')).toHaveClass(/fa-users/);
});

test('dropping a picture on the banner posts it to the banner slot', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let posted = null;
  await page.route('**/forum/groups/g1/banner', route => {
    posted = { method: route.request().method(), body: route.request().postData() };
    return route.fulfill({ json: { ...groups[0], banner_url: 'https://example.com/new-banner.png' } });
  });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await dropFiles(page, '.forum-group-banner-image', [{ name: 'banner.png', type: 'image/png', body: pngBody }]);

  await expect.poll(() => posted?.method).toBe('POST');
  expect(posted.body).toContain('name="image"');
  expect(posted.body).toContain('banner.png');
});

test('dropping a picture on the icon posts it to the icon slot', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let posted = null;
  await page.route('**/forum/groups/g1/icon', route => {
    posted = route.request().method();
    return route.fulfill({ json: groups[0] });
  });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await dropFiles(page, '.forum-group-icon-slot', [{ name: 'icon.png', type: 'image/png', body: pngBody }]);

  await expect.poll(() => posted).toBe('POST');
});

test('a picture the group will not take is refused before it is sent', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let posted = false;
  await page.route('**/forum/groups/g1/banner', route => { posted = true; return route.fulfill({ json: groups[0] }); });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await dropFiles(page, '.forum-group-banner-image', [{ name: 'diagram.svg', type: 'image/svg+xml', body: '<svg/>' }]);

  await expect(page.locator('#forum-group-status')).toContainText('not a picture this takes');
  expect(posted).toBe(false);
});

test('clearing a picture asks for it to be removed rather than uploading', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  let method = '';
  await page.route('**/forum/groups/g1/banner', route => {
    method = route.request().method();
    return route.fulfill({ json: { ...groups[0], banner_url: null } });
  });
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);
  await page.locator('.forum-group-banner-image [data-clear-image="banner"]').click();

  await expect.poll(() => method).toBe('DELETE');
});

test('someone who cannot edit the group is offered no way to dress it', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/groups/wave-optics', route => route.fulfill({ json: { ...groups[0], viewer_role: 'member', banner_url: null } }));
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  await expect(page.locator('#forum-group-banner h1')).toHaveText('Wave Optics');
  await expect(page.locator('.forum-group-banner-image')).toHaveCount(0);
  await expect(page.locator('.forum-group-icon-slot.is-droppable')).toHaveCount(0);
  await expect(page.locator('[data-clear-image]')).toHaveCount(0);
});

test('a reader sees the banner of a group they cannot dress, and no way to change it', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/groups/wave-optics', route => route.fulfill({ json: { ...groups[0], viewer_role: 'member' } }));
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  const banner = page.locator('.forum-group-banner-image');
  await expect(banner.locator('img')).toHaveAttribute('src', 'https://example.com/g1-banner.png');
  await expect(banner).not.toHaveClass(/is-droppable/);
  await expect(page.locator('[data-image-drop]')).toHaveCount(0);
  await expect(page.locator('[data-clear-image]')).toHaveCount(0);
});

test('a group with no banner offers its owner somewhere to drop one', async ({ page }) => {
  await signIn(page);
  await stubApi(page);
  await page.route('**/forum/groups/wave-optics', route => route.fulfill({ json: { ...groups[0], banner_url: null } }));
  await page.goto(`${base}/pages/forum/index.html#/group/wave-optics`);

  const banner = page.locator('.forum-group-banner-image');
  await expect(banner).toHaveClass(/is-droppable/);
  await expect(banner).not.toHaveClass(/has-image/);
  await expect(banner).toContainText('Drop a banner here');
});
