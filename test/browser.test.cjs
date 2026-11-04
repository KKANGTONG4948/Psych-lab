'use strict';
// Real-Chromium integration test. ST is a mock host page (test/host.html) whose API shapes follow st-context.js @06bde939.
// The extension is served exactly as ST serves it: /scripts/extensions/third-party/psych-lab/index.js (ES module).
// This is NOT a run of real SillyTavern; the phone test is separate.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
let chromium;
for (const p of ['playwright', '/home/claude/.npm-global/lib/node_modules/playwright', '/opt/node22/lib/node_modules/playwright']) { try { ({ chromium } = require(p)); break; } catch { /* next */ } }
if (!chromium) { console.log('SKIP: playwright not installed'); process.exit(0); }
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json' };
const server = http.createServer((req, res) => {
    const url = req.url.split('?')[0];
    let file;
    if (url === '/' || url === '/host.html') file = path.join(ROOT, 'test', 'host.html');
    else if (url.startsWith('/scripts/extensions/third-party/psych-lab/')) file = path.join(ROOT, url.replace('/scripts/extensions/third-party/psych-lab/', ''));
    else if (url === '/scripts/world-info.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); return res.end('export const world_info = { charLore: [{ name: "hijikata", extraBooks: [] }] };'); }
    else if (url === '/thumbnail') { res.writeHead(200, { 'content-type': 'image/svg+xml' }); return res.end('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="#79e"/></svg>'); }
    if (!file || !file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end('nf ' + url); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
});

// 결정적인 '좋은' 응답: 문항 ID로 1~5를 정한다 (모든 검사 공용)
const good = (items) => { const list = items.map(i => { let h = 0; for (const ch of i.id) h = (h * 31 + ch.charCodeAt(0)) % 997; return { question_id: i.id, score: (h % 5) + 1, reason: '……그런 건 당연한 거 아니냐.' }; }); return JSON.stringify(items.length === 1 ? list[0] : list); };
const session = (page, avatar, testId) => page.evaluate(([a, t]) => window.SillyTavern.getContext().extensionSettings.psych_lab.sessions[a]?.[t] ?? null, [avatar, testId]);

(async () => {
    await new Promise(r => server.listen(0, r));
    const base = 'http://127.0.0.1:' + server.address().port;
    const browser = await chromium.launch();
    let passed = 0; const ok = (c, m) => { assert.ok(c, m); passed++; console.log('PASS', m); };
    const open = async (viewport) => {
        const page = await browser.newPage({ viewport });
        page.on('pageerror', e => console.log('PAGEERROR', e.message));
        await page.goto(base + '/host.html');
        await page.waitForSelector('#psych_lab_menu_btn', { state: 'attached' });
        await page.evaluate(() => { document.getElementById('options').style.display = 'block'; });
        await page.evaluate(g => { window.__good = g; window.__st.script = (items) => new Function('return ' + g)()(items); }, good.toString());
        // 기본 묶음 5 확인 후, 호출 수 검사를 위해 1로 내린다(사용자가 직접 바꾼 것으로 표시)
        const def = await page.evaluate(() => { const s = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; const d = s.batchSize; s.batchSize = 1; s.batchTouched = true; return d; });
        assert.equal(def, 5, '기본 묶음 수 5');
        return page;
    };
    const startFirst = async (page, idx = 0) => { const btns = await page.$$('.pl-test'); await (await btns[idx].$('.pl-btn')).click(); };

    // 1. 1:1 binding, phone/PC layout, group/no-chat notices
    let page = await open({ width: 400, height: 800 });
    ok(await page.$('#options .options-content > a#psych_lab_menu_btn'), '햄버거 메뉴 맨 위에 항목 삽입');
    await page.click('#psych_lab_menu_btn');
    await page.waitForSelector('#psych_lab_root .pl-panel');
    let box = await page.$eval('#psych_lab_root .pl-panel', e => e.getBoundingClientRect().toJSON());
    ok(Math.round(box.width) === 400 && Math.round(box.height) === 800 && box.x === 0, '폰: 패널이 화면을 가득 채움');
    ok(await page.$eval('#pl_sub', e => e.textContent) === '히지카타 토시로' && await page.$eval('.pl-target-name', e => e.textContent) === '히지카타 토시로' && await page.$('.pl-target-img'), '지금 열린 1:1 채팅의 캐릭터로 고정, 프로필 사진 표시');
    ok(!(await page.$('select')) || !(await page.$('.pl-field select[onchange]')) , '캐릭터 선택 드롭다운 없음');
    await page.evaluate(() => window.__st.setChat(undefined, 'g1'));
    await page.waitForTimeout(30);
    ok(/그룹 채팅에서는 캐릭터 검사/.test(await page.$eval('.pl-notice', e => e.textContent)) && !(await page.$('.pl-test')) && (await page.$('#pl_npc_open')), '그룹챗: 안내 + NPC 뽑기 카드, 검사 없음');
    await page.evaluate(() => window.__st.setChat(undefined, undefined));
    await page.waitForTimeout(30);
    ok(/1:1 채팅을 연 뒤/.test(await page.$eval('.pl-notice', e => e.textContent)), '채팅 없음: 안내');
    await page.evaluate(() => window.__st.setChat(1, undefined));
    await page.waitForTimeout(30);
    ok(await page.$eval('#pl_sub', e => e.textContent) === '시무라 신파치', 'CHAT_CHANGED로 대상이 바뀜');
    await page.close();

    page = await open({ width: 1280, height: 900 });
    await page.click('#psych_lab_menu_btn');
    await page.waitForSelector('#psych_lab_root .pl-panel');
    box = await page.$eval('#psych_lab_root .pl-panel', e => e.getBoundingClientRect().toJSON());
    ok(Math.round(box.width) === 720 && box.x > 200, 'PC: 가운데 720px 창');
    ok((await page.$$('.pl-test')).length === 5, '검사 5개 표시 (도덕 기반·10가치 / 빅파이브·정직-겸손·VIA 강점)');
    ok((await page.$$eval('.pl-test-meta', els => els.map(e => e.textContent))).some(t => /40문항 · 1~6점 · CC BY-NC-ND/.test(t)), '10가치: 40문항·1~6점·CC BY-NC-ND 표시');
    ok((await page.$$eval('section.pl-card > .pl-h2', els => els.map(e => e.firstChild.textContent))).join() === '검사 대상,가치관,성격,종합 결과,NPC 뽑기', '홈: 가치관 / 성격 두 묶음 + 종합 결과 + NPC 뽑기');
    ok(!(await page.$('.pl-layer')) && !/층/.test(await page.$eval('.pl-body', e => e.textContent)), '층 표시 없음');
    ok(await page.$eval('.pl-card:nth-of-type(4) .pl-btn', e => e.disabled), '끝난 검사가 없으면 종합 결과 버튼 비활성');

    // 2. MFQ-2: start popup (no numbers), auto run, prompt structure, result without layer boxes
    await startFirst(page, 0);
    await page.waitForFunction(() => window.__st.popups.length === 1);
    const popup = await page.evaluate(() => window.__st.popups[0]);
    ok(!/호출/.test(popup.content) && !/토큰/.test(popup.content) && /비용이 클 수 있어요/.test(popup.content) && /36문항/.test(popup.content) && /로어북 1개 항목/.test(popup.content), '시작 팝업: 호출·토큰 수 없음, 비용 주의 문구, 문항 수·로어북 상태');
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 25000 });
    const calls = await page.evaluate(() => window.__st.calls);
    ok(calls.length === 36 && calls.every(c => c.messages.length === 2), '문항 36개 → 호출 36번(묶음 1), 메시지 2개(system + user)');
    const sys = calls[0].messages[0].content, usr = calls[0].messages[1].content;
    ok(sys.includes('[캐릭터 자료]') && sys.includes('히지카타 토시로') && sys.includes('막부 직속') && !sys.includes('마요네즈를 뿌린다') && sys.indexOf('카드와 어긋나면') < sys.indexOf('\n[캐릭터 자료]\n'), '카드·상시 로어북은 시스템 메시지 뒤쪽 (캐시용 고정 접두)');
    ok(usr.startsWith('{"questions":[') && !usr.includes('히지카타') && JSON.parse(usr.split('\n')[0]).questions.length === 1, '유저 메시지에는 문항만');
    ok(calls.slice(1).every(c => c.messages[0].content === sys), '시스템 메시지는 호출마다 완전히 동일');
    ok(/1 = 전혀 들어맞지 않는다/.test(sys) && /소속 집단, 공동체, 재물과 몫/.test(sys) && !/category|Care|keyed/.test(JSON.stringify(calls[0].messages)), 'MFQ-2: 전용 척도 라벨·세계관 주석 전송, 기반(점수표) 비공개');
    ok((await page.$$('.pl-row')).length === 6 && (await page.$$('.pl-group')).length === 6 && /중시|보통|넘김/.test(await page.$eval('.pl-row-level', e => e.textContent)) && (await page.$$('.pl-bar-fill')).length === 6, 'MFQ-2 결과: 기반 6줄(이름·막대·중시/보통/넘김), 기반별 문항 묶음');
    ok(!(await page.$('.pl-layers')) && (await page.$eval('.pl-axis-chip', e => e.textContent)) === '가치관' && !/층/.test(await page.$eval('.pl-body', e => e.textContent)), '결과 화면: 층 상자 없음, "가치관" 칩');
    ok(/CC BY 4\.0/.test(await page.$eval('.pl-share', e => e.textContent)) && /osf\.io\/srtxn/.test(await page.$eval('.pl-share', e => e.textContent)), '출처 칸에 MFQ-2 CC BY 4.0 표기');
    const s1 = await session(page, 'hijikata.png', 'mfq2');
    ok(s1.status === 'done' && s1.answers.length === 36 && s1.estimate === undefined, '완료 저장, 기본 설정에서는 예상 토큰 없음');

    // 3. edit popup title and flow
    await page.evaluate(() => { window.__st.popupAnswer = 0; });
    await (await page.$('.pl-answer .pl-cell:not(.pl-cell-on)')).click(); await page.waitForTimeout(60);
    const p2 = await page.evaluate(() => window.__st.popups.at(-1));
    ok(/<h3>답 바꾸기<\/h3>/.test(p2.content) && !/아쉽/.test(p2.content) && /골랐어요/.test(p2.content) && p2.options.okButton === '예', '교체 팝업 제목 "답 바꾸기", "아쉽네요" 없음');
    ok((await page.$$('.pl-answer-edited')).length === 0, '"아니오"면 바꾸지 않음');
    await page.evaluate(() => { window.__st.popupAnswer = 1; });
    await (await page.$('.pl-answer .pl-cell:not(.pl-cell-on)')).click(); await page.waitForTimeout(60);
    ok((await page.$$('.pl-answer-edited')).length === 1 && /제작자 수정 1문항/.test(await page.$eval('.pl-result-head', e => e.textContent)), '"예"면 제작자 수정 표시');

    // 4. 빅파이브 (120문항, 묶음 5 → 24호출), 환산 상자 없음(0.5.0), 예상 토큰 옵션
    await page.click('.pl-back');
    await page.evaluate(() => { const s = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; s.showEstimateAfter = true; s.batchSize = 5; window.__st.calls = []; });
    await startFirst(page, 2);
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 40000 });
    const b5Calls = await page.evaluate(() => window.__st.calls);
    const q = JSON.parse(b5Calls[0].messages[1].content.split('\n')[0]).questions[0];
    ok(b5Calls.length === 24 && Object.keys(q).join() === 'id,text' && b5Calls.every(c => JSON.parse(c.messages[1].content.split('\n')[0]).questions.length === 5) && !/facet|keyed|Neuroticism/.test(JSON.stringify(b5Calls[0].messages)), '빅파이브: 120문항·묶음 5 → 24호출, 리커트 문항(id,text)만, 세부·채점 방향 비공개');
    ok(/예상 사용 약 [\d,]+토큰/.test(await page.$eval('.pl-result-head', e => e.textContent)), '설정 켜면 완료 후 예상 토큰 표시');
    ok((await page.$$('.pl-domain')).length === 5 && (await page.$$('.pl-facets .pl-row')).length === 30 && !(await page.$('.pl-derived')) && !/환산|MBTI|에니어그램|대인 자세/.test(await page.$eval('.pl-body', e => e.textContent)) && (await page.$$('.pl-group')).length === 30, '빅파이브 결과: 영역 5줄·세부 30줄, 환산 상자 없음, 세부별 문항 묶음');
    ok((await page.$eval('.pl-axis-chip', e => e.textContent)) === '성격', '결과 화면: "성격" 칩');
    const b5 = await session(page, 'hijikata.png', 'bigfive');
    ok(b5.status === 'done' && b5.answers.length === 120 && b5.calls === 24, '빅파이브 기록 저장');

    // 5. 정직-겸손 보강 (16문항, 묶음 1) · VIA 강점 5개 (30문항)
    await page.click('.pl-back');
    await page.evaluate(() => { const s = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; s.batchSize = 1; window.__st.calls = []; });
    await startFirst(page, 3);
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 20000 });
    ok((await page.evaluate(() => window.__st.calls.length)) === 16 && (await page.$$('.pl-domain')).length === 1 && (await page.$$('.pl-facets .pl-row')).length === 2 && !(await page.$('.pl-derived')), '정직-겸손 보강: 16호출, 영역 1개·세부 2개(꾸밈 없음·탐욕 회피), 환산 상자 없음');
    await page.click('.pl-back');
    await page.evaluate(() => { window.__st.calls = []; });
    await startFirst(page, 4);
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 25000 });
    ok((await page.evaluate(() => window.__st.calls.length)) === 30 && (await page.$$('.pl-row')).length === 5 && (await page.$$('.pl-facets')).length === 0 && (await page.$$('.pl-group')).length === 5, 'VIA 강점: 30호출, 강점 5줄(세부 목록은 생략), 강점별 문항 묶음');

    // 5a. Schwartz 10가치 (40문항, 1~6, 여성판)
    await page.click('.pl-back');
    await page.evaluate(() => { const s = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; s.portraitGender = 'f'; window.__st.calls = []; });
    await startFirst(page, 1);
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 30000 });
    const scCalls = await page.evaluate(() => window.__st.calls);
    ok(scCalls.length === 40 && /1 = 나와 전혀 같지 않다/.test(scCalls[0].messages[0].content) && /"score":1~6의 정수/.test(scCalls[0].messages[0].content) && /이 여성에게는/.test(scCalls[0].messages[1].content) && !/benevolence|category/.test(JSON.stringify(scCalls[0].messages)), '10가치: 40호출, 1~6 척도 라벨, 여성판 문항 전송, 채점표 비공개');
    ok((await page.$$('.pl-row')).length === 14 && (await page.$$('.pl-higher .pl-row')).length === 4 && (await page.$$('.pl-answer .pl-cell')).length === 240 && /전체 평균/.test(await page.$eval('.pl-legend', e => e.textContent)), '10가치 결과: 가치 10줄 + 4방향 4줄, 문항당 칸 6개, 평균 중심화 안내');
    const sc = await session(page, 'hijikata.png', 'schwartz');
    ok(sc.settings.portraitGender === 'f' && sc.answers.length === 40 && sc.answers.every(a => a.score >= 1 && a.score <= 6), '10가치 기록: 여성판 고정, 1~6 답');

    // 5b. 종합 결과 화면 + 공유 문구
    await page.click('.pl-back');
    ok(!(await page.$eval('.pl-card:nth-of-type(4) .pl-btn', e => e.disabled)) && /끝난 검사 5개/.test(await page.$eval('.pl-card:nth-of-type(4)', e => e.textContent)), '홈: 끝난 검사 5개, 종합 결과 버튼 활성');
    await page.click('.pl-card:nth-of-type(4) .pl-btn');
    await page.waitForSelector('.pl-overview');
    const heads = await page.$$eval('section.pl-card > .pl-h2', els => els.map(e => e.firstChild.textContent));
    ok(heads.join() === '히지카타 토시로 · 종합 결과,가치관,성격,내가 고친 것,공유용 요약,GID용 요약,출처', '종합 결과: 한눈에 → 가치관(갈리는 곳 포함) → 성격(갈리는 곳 포함) → 내가 고친 것 → 공유 문구 → GID용 → 출처: ' + heads.join());
    ok((await page.$$('.pl-report-splits')).length === 2 && (await page.$$eval('.pl-report-splits', els => els.map(e => e.closest('section').querySelector('.pl-h2').firstChild.textContent))).join() === '가치관,성격', '갈리는 곳이 가치관·성격 칸 안에 각각');
    ok((await page.$$('.pl-overview p')).length >= 2 && (await page.$$('.pl-report-test')).length === 5 && (await page.$$('.pl-report-test .pl-rows')).length === 5, '한눈에 문장 2개 이상, 검사 5개가 축별로 들어감');
    ok((await page.$$('.pl-report-test .pl-row')).length === 6 + 14 + 5 + 1 + 5 && (await page.$$('.pl-report-test .pl-facets')).length === 0 && (await page.$$('.pl-report-test .pl-chip-f')).length >= 1, '종합 결과는 압축: 기반 6 + 가치 10·방향 4 + 영역 5 + 정직-겸손 1 + 강점 5 = 31줄, 세부 막대 없음, 두드러진 세부는 칩');
    ok((await page.$$('.pl-report-splits .pl-splits')).length >= 1 && /제작자 수정 1문항/.test(await page.$eval('.pl-body', e => e.textContent)) && (await page.$$eval('.pl-splits li', els => els.map(e => e.textContent))).some(x => /캐릭터 \d → 내 선택 \d/.test(x)), '갈리는 곳 목록, 내가 고친 것 1문항');
    await (await page.$('.pl-report-test .pl-link')).click(); await page.waitForSelector('.pl-answer');
    ok(/도덕 기반/.test(await page.$eval('.pl-h2', e => e.textContent)), '종합에서 "문항별 답 보기" → 그 검사 결과 화면');
    await page.click('.pl-back');
    const share = await page.$eval('#pl_share_preview', e => e.textContent);
    ok(/\[가치관 — 반응하는 일\]\n- /.test(share) && /\[가치관 — 넘어가는 일\]\n/.test(share) && /\[성격 — 반응 모양\]\n- .*\(Big Five Neuroticism/.test(share) && /\[가치관 — 갈리는 곳\]\n- /.test(share) && /\[성격 — 갈리는 곳\]\n- /.test(share) && !/환산|MBTI|에니어그램|IPC|대인 자세/.test(share) && /\(HEXACO Honesty-Humility/.test(share) && /\(VIA( \w+ (높음|낮음))?\)/.test(share) && /\(Schwartz/.test(share) && !/\n\[갈리는 곳\]/.test(share), '공유용 요약: 다섯 검사 모두, 짧은 꼬리표, 환산 없음, 갈리는 곳은 축 안에');
    // GID용 복사 (0.6.1): 줄마다 빈 줄, [축 - 칸] 접두, ※ 없음; 클립보드에 그대로
    await page.evaluate(() => { navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); }; });
    await page.click('#pl_copy_gid'); await page.waitForTimeout(40);
    const gid = await page.evaluate(() => window.__copied);
    ok(gid.startsWith('[히지카타 토시로 심리검사 요약]\n\n[가치관 - 반응하는 일] ') && gid.includes('\n\n[성격유형 - 반응 모양] ') && !gid.includes('※') && !gid.includes('\n- ') && gid.split('\n\n').slice(1).every(l => /^\[(가치관|성격유형) - /.test(l)) && gid === (await page.$eval('#pl_gid_preview', e => e.textContent)), 'GID용 복사: 접두·빈 줄·※ 없음, 미리 보기와 동일');
    ok(!/\[강도\]/.test(share) && !/층/.test(share) && !/Moral Foundations|IPIP-NEO|Character Strengths|세부:/.test(share) && !/(↑|↓)[^()\n]*(↑|↓)[^()\n]*(↑|↓)/.test(share), '공유용 요약: 강도·층·긴 이론명 없음, 세부는 화살표 최대 2개');

    // 6. retries: bad output → 6 calls (1 + 5 retries), lastRaw saved only at the end
    await page.evaluate(() => { window.__st.setChat(1, undefined); window.__st.calls = []; window.__st.script = () => '[{"question_id":"x","score":3,"reason":"r"}] 설명'; });
    await page.waitForTimeout(30);
    await startFirst(page, 0);
    await page.waitForFunction(() => window.SillyTavern.getContext().extensionSettings.psych_lab.sessions['shinpachi.png']?.mfq2?.status === 'error', null, { timeout: 20000 });
    const s2 = await session(page, 'shinpachi.png', 'mfq2');
    ok(s2.calls === 6 && s2.answers.length === 0 && /6번 시도/.test(s2.error) && s2.lastRaw.includes('설명'), '깨진 응답: 1+5회 시도 후 멈춤, 마지막 원문 저장, 답 0개');
    await page.waitForSelector('.pl-raw');
    ok(/마지막 모델 응답 원문 보기/.test(await page.$eval('.pl-raw summary', e => e.textContent)), '오류 칸에서 원문 펼쳐 보기');
    ok(!/(^|[^a-z])null([^a-z]|$)/.test(await page.$eval('.pl-body', e => e.textContent)), '답 0개 진행 화면에 "null" 글자 없음');
    const c2 = await page.evaluate(() => window.__st.calls);
    ok(c2.every(c => c.maxTokens === 4096), '응답 상한 기본 4096 전송: ' + c2[0].maxTokens);
    // resume clears lastRaw and finishes
    await page.evaluate(() => { window.__st.script = (items) => new Function('return ' + window.__good)()(items); window.__st.calls = []; });
    await page.click('.pl-actions .pl-btn');
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 25000 });
    const s3 = await session(page, 'shinpachi.png', 'mfq2');
    ok(s3.status === 'done' && s3.lastRaw === null && s3.answers.length === 36, '이어가기 → 완료, 원문 기록 비움');
    // 6b. 빈 응답(생각 토큰이 상한을 다 씀) → 다음 시도는 상한 두 배, 정상 응답이 오면 완료
    await page.click('.pl-back');
    await page.evaluate(() => { window.__st.calls = []; let n = 0; window.__st.script = (items) => { n++; if (n === 1) throw new Error('Google Vertex AI Candidate text empty'); return new Function('return ' + window.__good)()(items); }; });
    await (await (await page.$$('.pl-test'))[0].$('.pl-btn-danger')).click(); await page.waitForTimeout(40); // 기록 삭제 (popupAnswer=1)
    await startFirst(page, 0);
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 25000 });
    const c3 = await page.evaluate(() => window.__st.calls);
    ok(c3.length === 37 && c3[0].maxTokens === 4096 && c3[1].maxTokens === 8192 && c3[2].maxTokens === 4096, `빈 응답 뒤 재시도는 상한 두 배(${c3[0].maxTokens}→${c3[1].maxTokens}), 다음 묶음은 원래대로`);

    // 7. stop/resume + batch 5 + profile (VIA 강점, 신파치)
    await page.click('.pl-back');
    await page.evaluate(() => { const s = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; s.batchSize = 5; s.profileId = 'p1'; window.__st.calls = []; window.__st.delay = 150; });
    await startFirst(page, 4);
    await page.waitForFunction(() => window.__st.calls.length >= 1);
    await page.click('.pl-btn-danger');
    await page.waitForFunction(() => !document.querySelector('.pl-progress-text')?.textContent.includes('대기'), null, { timeout: 5000 });
    let s4 = await session(page, 'shinpachi.png', 'via2');
    ok(s4.status === 'paused' && s4.answers.length < 30, `중단 → 멈춤 (${s4.answers.length}/30)`);
    await page.evaluate(() => { window.__st.delay = 10; });
    await page.click('.pl-actions .pl-btn');
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 15000 });
    s4 = await session(page, 'shinpachi.png', 'via2');
    const c4 = await page.evaluate(() => window.__st.calls);
    ok(s4.status === 'done' && new Set(s4.answers.map(a => a.itemId)).size === 30 && c4.every(c => c.profileId === 'p1' && c.custom.includePreset === false) && c4.some(c => JSON.parse(c.messages[1].content.split('\n')[0]).questions.length === 5), '이어가기 완료, 프로필 사용, 5문항 묶음');


    // 7b. NPC 뽑기 (0.5.0): 그룹챗에서, 설정+로그 → 호출 1번 → 세 줄, 전형·겹치지 않게·다르게 다시
    await page.click('.pl-back');
    await page.evaluate(() => { window.__st.setChat(undefined, 'g1'); window.__st.calls = []; const s = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; s.profileId = ''; s.retries = 2;
        window.__npcScript = (known) => (items) => { if (items.length) return new Function('return ' + window.__good)()(items);
            const groups = { mfq2: ['care','equality','proportionality','loyalty','authority','purity'], schwartz: ['self_direction','stimulation','hedonism','achievement','power','security','conformity','tradition','benevolence','universalism'], bigfive: ['N','E','O','A','C'], hexaco: ['H1','H2'], via: ['hum','gra','val','hop','per'] };
            const labels = {}; for (const [g, keys] of Object.entries(groups)) { labels[g] = {}; for (const k of keys) labels[g][k] = known[g + '.' + k] || 'unknown'; }
            return JSON.stringify({ role: '상인 길드장, 40대. 겉으로는 일행의 후원자', speech: '정중한 존댓말, 끝을 흐림', labels }); };
        window.__st.script = window.__npcScript({ 'mfq2.proportionality': 'high', 'schwartz.power': 'high', 'bigfive.A': 'low', 'bigfive.C': 'high', 'mfq2.care': 'mid' }); });
    await page.waitForTimeout(30);
    await page.click('#pl_npc_open'); await page.waitForSelector('#pl_npc_run');
    ok(/NPC 뽑기 · 은혼 그룹챗/.test(await page.$eval('#pl_sub', e => e.textContent)) && /메시지 3개 중 최근 3개/.test(await page.$eval('.pl-body', e => e.textContent)), 'NPC 화면: 그룹챗 이름, 숨긴 메시지 빼고 로그 3개');
    await page.fill('#pl_npc_name', '모르간');
    await page.fill('#pl_npc_notes', '상인 길드장. 계산적이고 손해를 안 본다.');
    await page.selectOption('#pl_npc_arch', 'villain'); await page.waitForSelector('.pl-seg');
    await page.click('#pl_npc_differ'); await page.waitForSelector('.pl-existing textarea');
    await page.fill('.pl-existing textarea', '[한스] 대장장이.\n가치관: 비례↑ 권위↑ 배려↓ (MFQ-2) · 안전↑ 전통↑ 자극↓ (Schwartz)\n성격: 외향성↓ 우호성↓ 성실성↑ (Big Five) · 꾸밈 없음↑ 탐욕 회피↑ (HEXACO) · 용감함↑ 유머↓ (VIA)');
    ok(/읽음: 한스 · 라벨 13개/.test(await page.$eval('.pl-existing-status', e => e.textContent)), '붙여 넣은 세 줄에서 이름·라벨 13개 되읽기');
    await page.click('#pl_npc_add_existing'); ok((await page.$$('.pl-existing')).length === 2, '＋ 칸 추가');
    await page.click('#pl_npc_run');
    await page.waitForSelector('#pl_npc_lines', { timeout: 10000 });
    const npcCalls = await page.evaluate(() => window.__st.calls);
    const nsys = npcCalls[0].messages[0].content, nusr = npcCalls[0].messages[1].content;
    ok(npcCalls.length === 1 && npcCalls[0].maxTokens === 4096 && /인물 "모르간"/.test(nsys) && /care = 배려/.test(nsys) && /typical_high/.test(nsys), 'NPC: 호출 1번, 항목 뜻 목록, 전형 허용 문구');
    ok(/\[내 설정\]\n상인 길드장\./.test(nusr) && /\[로그\] \(최근 3개 메시지\)\n/.test(nusr) && /긴토키: 모르간은 웃으며/.test(nusr) && !/숨긴 메시지/.test(nusr) && !/<b>/.test(nusr) && /\[전형\] 악역 \(약간\)/.test(nusr) && !/한스/.test(nusr), 'NPC 유저 메시지: 설정·로그(태그 벗김·숨김 제외)·전형, 기존 인물은 안 보냄');
    const lines = await page.$eval('#pl_npc_lines', e => e.textContent);
    ok(/^\[모르간 심리검사 요약\]\[모르간\] 상인 길드장, 40대\. 겉으로는 일행의 후원자\. 말투: 정중한 존댓말, 끝을 흐림\./.test(lines) && /가치관: .*비례↑.*\(MFQ-2\)/.test(lines) && /권력↑/.test(lines) && /성격: 성실성↑ 우호성↓ \(Big Five\) · 꾸밈 없음↓ 탐욕 회피↓ \(HEXACO\)/.test(lines), 'NPC 세 줄: ' + lines.replace(/\n/g, ' | '));
    ok((await page.$$('.pl-tok-archetype')).length === 3 && (await page.$$('.pl-tok-diff')).length === 4 && /전형 3칸/.test(await page.$eval('.pl-src', e => e.textContent)) && /겹치지 않게 4칸/.test(await page.$eval('.pl-src', e => e.textContent)) && /겹침: 한스와 \d칸/.test(await page.$eval('.pl-body', e => e.textContent)), '전형 3칸(노란)·겹치지 않게 4칸(초록)·겹침 수');
    const rec1 = await page.evaluate(() => window.SillyTavern.getContext().chatMetadata.psych_lab.npcs[0]);
    ok(rec1.name === '모르간' && rec1.labels['hexaco.H1'] === 'low' && rec1.source['hexaco.H1'] === 'archetype' && rec1.labels['mfq2.proportionality'] === 'high' && rec1.source['mfq2.proportionality'] === 'material' && rec1.labels['bigfive.E'] === 'mid' && rec1.chatId === 'chat-g1' && (await page.evaluate(() => window.__st.metaSaved)) >= 1 && !(await page.evaluate(() => window.SillyTavern.getContext().extensionSettings.psych_lab.npcs)), 'NPC 기록: 채팅 메타데이터(chat_metadata.psych_lab)에 저장, 확장 설정에는 없음');
    // GID용 복사 (0.6.2, B안): 첫 줄 그대로 + 라벨을 문장으로, 줄마다 빈 줄, [축 - 칸] 접두, 화살표 없음; 미리 보기와 동일; 세 줄 복사는 그대로
    await page.evaluate(() => { navigator.clipboard.writeText = t => { window.__copied = t; return Promise.resolve(); }; window.__copied = null; });
    await page.click('#pl_npc_copy_gid'); await page.waitForTimeout(40);
    const ngid = await page.evaluate(() => window.__copied);
    ok(ngid.startsWith('[모르간 심리검사 요약]\n\n[모르간] 상인 길드장, 40대. 겉으로는 일행의 후원자. 말투: 정중한 존댓말, 끝을 흐림.\n\n[가치관 - 반응하는 일] ') && /\n\n\[가치관 - 반응하는 일\] 노력·공로만큼 보상받지 못하거나 속임수가 통하는 장면: 바로잡으려 하고, 속인 쪽이 벌 받길 바란다 \(MFQ-2 Proportionality 중시\)/.test(ngid) && /\n\n\[성격유형 - 반응 모양\] 할 말은 하고 쉽게 양보하지 않는다 \(Big Five Agreeableness 낮음\)/.test(ngid) && /\(HEXACO Sincerity 낮음\)/.test(ngid) && !/[↑↓※]/.test(ngid) && ngid.split('\n\n').slice(2).every(l => /^\[(가치관|성격유형) - /.test(l)) && ngid === (await page.$eval('#pl_npc_gid_preview', e => e.textContent)), 'NPC GID용 복사: ' + String(ngid).slice(0, 200).replace(/\n/g, '|'));
    await page.click('#pl_npc_copy'); await page.waitForTimeout(40);
    ok((await page.evaluate(() => window.__copied)) === lines.replace(/\s+$/, '') || /^\[모르간 심리검사 요약\]\n\[모르간\].*\n가치관: .*\n성격: /.test(await page.evaluate(() => window.__copied)), '세 줄 복사는 그대로 세 줄');
    // 첫 줄 고치기: INPUT 팝업 두 번(자리 → 말투), 라벨은 그대로
    await page.evaluate(() => { window.__st.inputAnswer = '마을 유일한 대장장이'; });
    await (await page.$$('.pl-actions .pl-btn-ghost'))[1].click(); await page.waitForTimeout(80);
    ok(/^\[모르간 심리검사 요약\]\[모르간\] 마을 유일한 대장장이\. 말투: 마을 유일한 대장장이\./.test(await page.$eval('#pl_npc_lines', e => e.textContent)) && (await page.evaluate(() => window.SillyTavern.getContext().chatMetadata.psych_lab.npcs[0].edited)) === true && /첫 줄 고침/.test(await page.$eval('.pl-h2-sub', e => e.textContent)), '첫 줄 고치기: 자리·말투 바뀜, 고침 표시');
    await page.click('#pl_npc_again'); await page.waitForFunction(() => window.SillyTavern.getContext().chatMetadata.psych_lab.npcs.length === 2, null, { timeout: 10000 });
    const c2n = await page.evaluate(() => window.__st.calls);
    ok(c2n.length === 2 && /\[참고\] 이전 결과는 기존 인물과/.test(c2n[1].messages[1].content) && (await page.$$('.pl-npc')).length === 2, '다르게 다시: 참고 문구 붙여 재호출, 목록 2개');
    // 깨진 응답 → 재시도 후 오류 표시, 저장 안 함
    await page.click('.pl-back'); await page.waitForSelector('#pl_npc_run');
    await page.evaluate(() => { window.__st.calls = []; window.__st.script = (items) => items.length ? new Function('return ' + window.__good)()(items) : '{"role":"x","speech":"","labels":{"mfq2":{}}}'; });
    await page.click('#pl_npc_run'); await page.waitForSelector('.pl-error', { timeout: 10000 });
    ok((await page.evaluate(() => window.__st.calls.length)) === 3 && /3번 시도했지만/.test(await page.$eval('.pl-error', e => e.textContent)) && (await page.evaluate(() => window.SillyTavern.getContext().chatMetadata.psych_lab.npcs.length)) === 2, '깨진 NPC 응답: 1+2회 시도 후 오류, 기록 안 늘어남');
    // 채팅마다 따로: 1:1(신파치)로 가면 그룹챗에서 뽑은 NPC가 안 보이고, 돌아오면 다시 보인다
    await page.evaluate(() => { window.__st.setChat(1, undefined); window.__st.script = window.__npcScript({ 'bigfive.E': 'high' }); window.__st.calls = []; });
    await page.waitForTimeout(30);
    ok(/NPC 뽑기 · 시무라 신파치/.test(await page.$eval('#pl_sub', e => e.textContent)) && (await page.$$('.pl-npc')).length === 0 && /아직 없어요/.test(await page.$eval('.pl-card-soft', e => e.textContent)) && (await page.$eval('#pl_npc_name', e => e.value)) === '', '다른 채팅: 뽑은 NPC 목록 비어 있음, 초안도 따로');
    await page.fill('#pl_npc_name', '테오'); await page.fill('#pl_npc_notes', '마을 소년.');
    await page.click('#pl_npc_run'); await page.waitForSelector('#pl_npc_lines', { timeout: 10000 });
    ok(/성격: 외향성↑ \(Big Five\)/.test(await page.$eval('#pl_npc_lines', e => e.textContent)) && /가치관: 뚜렷한 쪽 없음/.test(await page.$eval('#pl_npc_lines', e => e.textContent)) && (await page.$$('.pl-npc')).length === 1, '1:1 채팅에서 뽑음: 이 채팅 목록에 1개, 빈 묶음은 "뚜렷한 쪽 없음"');
    await page.evaluate(() => window.__st.setChat(undefined, 'g1')); await page.waitForTimeout(30);
    ok((await page.$$('.pl-npc')).length === 2 && (await page.$$eval('.pl-npc-name', els => els.map(e => e.firstChild.textContent))).every(n => n === '모르간'), '그룹챗으로 돌아오면 그 채팅의 NPC 2개(모르간)만');
    // 채팅 없음: NPC 화면은 닫히고 홈 카드에 안내만
    await page.evaluate(() => window.__st.setChat(undefined, undefined)); await page.waitForTimeout(30);
    ok(!(await page.$('#pl_npc_run')) && !(await page.$('#pl_npc_open')) && /채팅\(1:1 또는 그룹\)을 열면/.test(await page.$eval('.pl-body', e => e.textContent)), '채팅 없음: NPC 화면 대신 홈, 카드에 안내만');
    await page.evaluate(() => window.__st.setChat(1, undefined)); await page.waitForTimeout(30);

    // 7c. 카드 안의 인물 (0.6.0): 신파치 카드의 내장 로어북 항목 '누나'를 대상으로 MFQ-2 → 자료는 그 항목 + 카드 설명만, 기록은 따로
    await page.waitForSelector('#pl_entry', { timeout: 5000 });   // 이미 홈
    const opts = await page.$$eval('#pl_entry option', els => els.map(e => e.textContent));
    ok(opts.length === 3 && /^카드 자체 — 시무라 신파치/.test(opts[0]) && /^누나 · \d+자/.test(opts[1]) && /^도장/.test(opts[2]) && !(await page.$('#pl_entry_filter')), '인물 고르기: 카드 자체 + 내장 항목 2개(누나·도장), 8개 이하라 검색 칸 없음');
    await page.evaluate(() => { window.__st.calls = []; window.__st.script = (items) => new Function('return ' + window.__good)()(items); const st = window.SillyTavern.getContext().extensionSettings.psych_lab.settings; st.batchSize = 10; st.profileId = ''; });
    await page.selectOption('#pl_entry', 'embedded:0'); await page.waitForTimeout(40);
    ok(/시무라 신파치 › 누나/.test(await page.$eval('#pl_sub', e => e.textContent)) && (await page.$eval('.pl-target-name', e => e.textContent)) === '누나' && /로어북 항목/.test(await page.$eval('.pl-target + .pl-field, .pl-target', e => e.parentElement.textContent)) && (await page.$$eval('.pl-chip', els => els.map(e => e.textContent))).filter(x => /완료/.test(x)).length === 0, '인물 고르면 제목·대상 이름이 바뀌고 그 인물의 기록은 비어 있음');
    await startFirst(page, 0);
    await page.waitForFunction(() => window.__st.popups.at(-1)?.content.includes('누나'), null, { timeout: 5000 });
    const ep = await page.evaluate(() => window.__st.popups.at(-1).content);
    ok(/카드 안의 인물 · 항목 &quot;누나&quot; \+ 카드 설명\(세계관\) · 다른 항목은 안 넣음/.test(ep), '시작 팝업: 카드 안의 인물 안내: ' + ep.slice(0, 160));
    await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 25000 });
    const esys = (await page.evaluate(() => window.__st.calls))[0].messages[0].content;
    const emat = JSON.parse(esys.slice(esys.indexOf('[캐릭터 자료]\n') + '[캐릭터 자료]\n'.length));
    ok(emat.character.name === '누나' && emat.character.description === '오타에는 신파치의 누나다.' && emat.world === '해결사의 일원.' && !emat.lorebook && !esys.includes('코토칸') && !esys.includes('예의 바르고 미숙한') && /자료의 world는/.test(esys), '자료 = 항목 내용 + 카드 설명(세계관)만, 다른 항목·카드 성격 칸·로어북 없음, world 규칙');
    const es = await page.evaluate(() => window.SillyTavern.getContext().extensionSettings.psych_lab.sessions);
    ok(es['shinpachi.png#entry:embedded:0']?.mfq2?.status === 'done' && es['shinpachi.png#entry:embedded:0'].mfq2.subject.label === '누나' && es['shinpachi.png']?.mfq2?.status === 'done', '기록은 "카드#entry:항목" 키로 따로, 카드 자체 기록은 그대로');
    await page.click('.pl-back'); await page.waitForSelector('#pl_entry');
    // 0.6.3: 요약 제목 줄에 대상 이름 — 카드 안의 인물이면 그 인물 이름
    ok((await page.$eval('#pl_share_preview', e => e.textContent)).startsWith('[누나 심리검사 요약]\n') && (await page.$eval('#pl_gid_preview', e => e.textContent)).startsWith('[누나 심리검사 요약]\n\n'), '카드 안의 인물: 요약 제목 줄이 "[누나 심리검사 요약]"');
    await page.selectOption('#pl_entry', ''); await page.waitForTimeout(40);
    ok((await page.$eval('#pl_share_preview', e => e.textContent)).startsWith('[시무라 신파치 심리검사 요약]\n'), '카드 자체로 돌아오면 제목 줄도 카드 이름');
    ok((await page.$eval('#pl_sub', e => e.textContent)) === '시무라 신파치' && (await page.$$eval('.pl-chip', els => els.map(e => e.textContent))).filter(x => /완료/.test(x)).length >= 2, '카드 자체로 돌아오면 카드의 기록(완료 2개 이상)이 다시 보임');
    // 히지카타: 연결 로어북(gintama) 항목 2개(꺼진 항목 제외)가 'book:uid@이름' 키로
    await page.evaluate(() => window.__st.setChat(0, undefined)); await page.waitForTimeout(60);
    await page.waitForFunction(() => document.querySelector('#pl_entry'), null, { timeout: 5000 });
    const hopts = await page.$$eval('#pl_entry option', els => els.map(e => [e.value, e.textContent]));
    ok(hopts.length === 3 && hopts[1][0] === 'book:1@gintama' && /^진선조/.test(hopts[1][1]) && hopts[2][0] === 'book:2@gintama' && /^마요네즈/.test(hopts[2][1]), '연결 로어북 항목도 목록에(꺼진 항목 제외): ' + JSON.stringify(hopts));
    await page.evaluate(() => window.__st.setChat(1, undefined)); await page.waitForTimeout(40);
    await page.click('#pl_npc_open'); await page.waitForSelector('#pl_npc_run');   // 입력 화면 (아래 8번이 홈으로)

    // 8. back closes
    await page.click('.pl-back'); await page.evaluate(() => history.back()); await page.waitForTimeout(50);
    ok(!(await page.$('#psych_lab_root')), '뒤로 가기(popstate)로 패널 닫힘');
    await page.close();

    // 9. phone screenshots
    page = await open({ width: 400, height: 860 });
    await page.click('#psych_lab_menu_btn'); await page.waitForSelector('.pl-test');
    await page.screenshot({ path: path.join(ROOT, 'test', 'screenshot-phone-home.png') });
    await startFirst(page, 0); await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 25000 });
    await page.screenshot({ path: path.join(ROOT, 'test', 'screenshot-phone-mfq2.png') });
    await page.click('.pl-back'); await page.evaluate(() => { window.SillyTavern.getContext().extensionSettings.psych_lab.settings.batchSize = 10; });
    await startFirst(page, 2); await page.waitForFunction(() => document.querySelector('.pl-rows'), null, { timeout: 40000 });
    await page.screenshot({ path: path.join(ROOT, 'test', 'screenshot-phone-bigfive.png') });
    await page.evaluate(() => document.querySelector('.pl-body').scrollTo(0, 1100)); await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(ROOT, 'test', 'screenshot-phone-items.png') });
    await page.click('.pl-back'); await page.click('.pl-card:nth-of-type(4) .pl-btn'); await page.waitForSelector('.pl-overview'); await page.evaluate(() => document.querySelector('.pl-body').scrollTo(0, 0)); await page.waitForTimeout(60);
    await page.screenshot({ path: path.join(ROOT, 'test', 'screenshot-phone-report.png') });
    await page.evaluate(() => document.querySelector('.pl-body').scrollTo(0, 900)); await page.waitForTimeout(80);
    await page.screenshot({ path: path.join(ROOT, 'test', 'screenshot-phone-report2.png') });
    await page.close();
    await browser.close(); server.close();
    console.log(passed + ' browser checks passed');
})().catch(e => { console.error(e); process.exit(1); });
