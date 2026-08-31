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
