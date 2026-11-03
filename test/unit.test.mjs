// 엔진 단위 테스트 (Node). 브라우저 없이 parseAnswers·scoring만.
import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.SillyTavern = { getContext: () => ({ extensionSettings: {}, saveSettingsDebounced() {} }) };
const { parseAnswers, buildMessages } = await import('../engine.js');
const { MFQ2: T0 } = await import('../tests/mfq2.js');
const one = [T0.items[0]];
const two = T0.items.slice(0, 2);
const okOne = JSON.stringify({ question_id: one[0].id, score: 4, reason: '필요하지.' });

test('정상 응답 하나 / 코드펜스 하나만 벗김 / BOM', () => {
    assert.deepEqual(parseAnswers(okOne, T0, one), [{ itemId: one[0].id, score: 4, reason: '필요하지.' }]);
    assert.equal(parseAnswers('```json\n' + okOne + '\n```', T0, one)[0].score, 4);
    assert.equal(parseAnswers('﻿' + okOne, T0, one)[0].score, 4);
});
test('거부: 해설 섞임, 추가 키, 다른 ID, 소수 점수, 범위 밖, 빈 이유, 긴 이유', () => {
    for (const bad of [
        'ISFJ입니다. ' + okOne,
        JSON.stringify({ question_id: one[0].id, score: 4, reason: 'x', extra: 1 }),
        JSON.stringify({ question_id: 'mfq2_99', score: 4, reason: 'x' }),
        JSON.stringify({ question_id: one[0].id, score: 3.5, reason: 'x' }),
        JSON.stringify({ question_id: one[0].id, score: 6, reason: 'x' }),
        JSON.stringify({ question_id: one[0].id, score: '4', reason: 'x' }),
        JSON.stringify({ question_id: one[0].id, score: 4, reason: '  ' }),
        JSON.stringify({ question_id: one[0].id, score: 4, reason: 'x'.repeat(321) }),
        '```json\n' + okOne + '\n```\n설명: 그래서…',
    ]) assert.throws(() => parseAnswers(bad, T0, one), bad.slice(0, 40));
});
test('묶음: 순서 무관, 개수 불일치·중복 ID 거부', () => {
    const arr = [{ question_id: two[1].id, score: 2, reason: 'b' }, { question_id: two[0].id, score: 5, reason: 'a' }];
    const r = parseAnswers(JSON.stringify(arr), T0, two);
    assert.deepEqual(r.map(x => x.itemId), [two[1].id, two[0].id]);
    assert.throws(() => parseAnswers(JSON.stringify([arr[0]]), T0, two));
    assert.throws(() => parseAnswers(JSON.stringify([arr[0], arr[0]]), T0, two));
    assert.throws(() => parseAnswers(JSON.stringify(arr[0]), T0, two), '배열이어야');
});
test('프롬프트: 점수표 미포함, 자료 우선순위 규칙, 로어북은 있을 때만', async () => {
    const { MFQ2 } = await import('../tests/mfq2.js');
    const session = { testId: 'mfq2', card: { profile: { name: '신파치', description: 'd', personality: 'p', scenario: '', dialogue_examples: '' }, lorebook: null } };
    const m = buildMessages(session, MFQ2.items.slice(0, 2));
    const all = JSON.stringify(m);
    assert.ok(!all.includes('"category"') && !all.includes('keyed') && !all.includes('Care'));
    assert.ok(m[0].content.includes('카드와 어긋나면 카드를 따르고') && m[0].content.includes('JSON 배열'));
    assert.ok(m[0].content.includes('[캐릭터 자료]') && m[0].content.includes('"name":"신파치"') && !m[0].content.includes('lorebook'), '카드는 시스템 메시지 뒤쪽에, 로어북은 없을 때 생략');
    assert.equal(m.length, 2);
    assert.ok(m[1].role === 'user' && m[1].content.startsWith('{"questions":[') && !m[1].content.includes('신파치'), '유저 메시지에는 문항만');
    session.card.lorebook = '[진선조 · 상시] 막부 경찰';
    assert.ok(buildMessages(session, MFQ2.items.slice(0, 1))[0].content.includes('[진선조 · 상시] 막부 경찰'));
});


test('MFQ-2: 36문항·6기반 순환, 프롬프트 척도 라벨·세계관 주석, profile 채점, 공유 문구', async () => {
    const { MFQ2 } = await import('../tests/mfq2.js');
    const { scoreProfile } = await import('../scoring.js');
    const { shareText, shareLines } = await import('../summary.js');
    assert.equal(MFQ2.items.length, 36);
    const order = ['care', 'equality', 'proportionality', 'loyalty', 'authority', 'purity'];
    MFQ2.items.forEach((it, i) => { assert.equal(it.category, order[i % 6], `문항 ${i + 1} 기반`); assert.equal(it.keyed, '+'); assert.ok(it.src && it.text); });
    assert.equal(new Set(MFQ2.items.map(i => i.id)).size, 36);
    // 프롬프트: MFQ-2 전용 척도 라벨과 세계관 주석이 들어가고, 기반(category)은 안 보인다
    const session = { testId: 'mfq2', card: { profile: { name: 'x', description: 'd', personality: 'p', scenario: '', dialogue_examples: '' }, lorebook: null } };
    const m = buildMessages(session, MFQ2.items.slice(0, 3));
    assert.ok(m[0].content.includes('1 = 전혀 들어맞지 않는다') && m[0].content.includes('5 = 매우 잘 들어맞는다'), '척도 라벨');
    assert.ok(m[0].content.includes('소속 집단, 공동체, 재물과 몫'), '세계관 대응물 주석');
    assert.ok(!JSON.stringify(m).includes('category') && !JSON.stringify(m).includes('Care'), '기반은 비공개');
    // 채점: 배려 전부 5, 평등 전부 1, 나머지 3 → 중시 배려 / 넘김 평등 / 보통 4개
    const ans = MFQ2.items.map(i => ({ itemId: i.id, score: i.category === 'care' ? 5 : i.category === 'equality' ? 1 : 3 }));
    const r = scoreProfile(MFQ2, ans);
    assert.deepEqual(r.high.map(c => c.id), ['care']); assert.deepEqual(r.low.map(c => c.id), ['equality']); assert.equal(r.mid.length, 4);
    assert.equal(r.categories.find(c => c.id === 'care').mean, 5); assert.equal(r.categories.find(c => c.id === 'care').sum, 12);
    assert.equal(r.ranked[0].id, 'care'); assert.equal(r.ranked[5].id, 'equality'); assert.equal(r.decided, true);
    // 경계: 비율 0.3 바로 아래는 보통, 이상은 중시 (6문항·max 12 → 합 4 = 0.33 중시, 합 3 = 0.25 보통)
    const mk = scores => scoreProfile(MFQ2, MFQ2.items.map((i, k) => ({ itemId: i.id, score: i.category === 'care' ? scores[Math.floor(k / 6)] : 3 })));
    assert.equal(mk([4, 4, 4, 4, 3, 3]).categories[0].level, 'high');
    assert.equal(mk([4, 4, 4, 3, 3, 3]).categories[0].level, 'mid');
    // 부분 응답: 답한 것만으로 계산, 미응답 기반은 none
    const part = scoreProfile(MFQ2, [{ itemId: 'mfq2_01', score: 5 }, { itemId: 'mfq2_07', score: 4 }]);
    assert.equal(part.categories[0].answered, 2); assert.equal(part.categories[0].level, 'high'); assert.equal(part.categories[1].level, 'none'); assert.equal(part.decided, false);
    // 공유 문구: 조건 → 반응 (이론 · 영어 라벨), 3층은 사건 크기
    const done = { testId: 'mfq2', status: 'done', answers: ans.map(a => ({ ...a, reason: 'r' })) };
    const lines = shareLines(done);
    assert.equal(lines.react[0], '누가 다치거나 아파하거나 고통받는 장면: 그냥 못 지나친다 (MFQ-2 Care 중시·뚜렷)');
    assert.equal(lines.skip[0], '누구는 더 받고 누구는 덜 받는 장면: 몫이 달라도 신경 쓰지 않는다 (MFQ-2 Equality 낮음)', '넘어가는 일에도 장면 조건');
    assert.equal(lines.skip.length, 1, '보통은 넘어가는 일이 아니라 갈리는 곳으로');
    assert.ok(lines.splits[0].startsWith('비례 충성 권위 순수 는 중간 — 상황 따라 반응하거나 넘김 (MFQ-2)'), lines.splits[0]);
    const text = shareText({ mfq2: done });
    assert.ok(text.includes('[가치관 — 반응하는 일]\n- 누가') && text.includes('[가치관 — 넘어가는 일]\n- 누구는 더 받고') && text.includes('[성격 — 반응 모양]\n- (성격 검사 전)') && text.includes('[가치관 — 갈리는 곳]\n- 비례') && !text.includes('[성격 — 갈리는 곳]'), text);
    assert.ok(!text.includes('[강도]') && !text.includes('층'), '강도·층 표시 없음');
});


test('빅파이브: 120문항·30세부×4, 채점·영역 합, 공유 문구 (환산 없음)', async () => {
    const { BIGFIVE } = await import('../tests/bigfive.js');
    const { scoreFacets } = await import('../scoring.js');
    const { shareLines } = await import('../summary.js');
    assert.equal(BIGFIVE.items.length, 120); assert.equal(BIGFIVE.facets.length, 30); assert.equal(BIGFIVE.domains.length, 5);
    for (const f of BIGFIVE.facets) assert.equal(BIGFIVE.items.filter(i => i.facet === f.id).length, 4, f.id);
    assert.equal(new Set(BIGFIVE.items.map(i => i.id)).size, 120);
    assert.ok(BIGFIVE.items.every(i => i.src && i.text && (i.keyed === '+' || i.keyed === '-')));
    // 프롬프트에 세부·영역·채점 방향이 새지 않는다
    const session = { testId: 'bigfive', card: { profile: { name: 'x', description: 'd', personality: 'p', scenario: '', dialogue_examples: '' }, lorebook: null } };
    const m = buildMessages(session, BIGFIVE.items.slice(0, 5));
    assert.ok(!/facet|keyed|Neuroticism|"N1"/.test(JSON.stringify(m)));
    // ISTJ·안정형이 나오게: E 낮음, O 낮음, A 낮음(T), C 높음, N 낮음
    const want = { N: -1, E: -1, O: -1, A: -1, C: 1 };
    const ans = BIGFIVE.items.map(i => { const dir = want[i.facet[0]] * (i.keyed === '-' ? -1 : 1); return { itemId: i.id, score: dir > 0 ? 5 : 1 }; });
    const r = scoreFacets(BIGFIVE, ans);
    assert.equal(r.kind, 'facets'); assert.equal(r.decided, true);
    assert.deepEqual(r.domains.map(d => d.level), ['low', 'low', 'low', 'low', 'high']);
    assert.equal(r.domains[4].sum, 48); assert.equal(r.domains[4].max, 48); assert.equal(r.facets[0].sum, -8);
    assert.equal(r.derived, undefined, '0.5.0: 환산 없음');
    // 반대 극단
    const ans2 = BIGFIVE.items.map(i => { const dir = -want[i.facet[0]] * (i.keyed === '-' ? -1 : 1); return { itemId: i.id, score: dir > 0 ? 5 : 1 }; });
    const r2 = scoreFacets(BIGFIVE, ans2);
    assert.deepEqual(r2.domains.map(d => d.level), ['high', 'high', 'high', 'high', 'low']);
    // 전부 3이면 보통, 미판정
    const r3 = scoreFacets(BIGFIVE, BIGFIVE.items.map(i => ({ itemId: i.id, score: 3 })));
    assert.ok(r3.domains.every(d => d.level === 'mid'));
    // 부분 응답: 답한 세부만, 나머지 none
    const r4 = scoreFacets(BIGFIVE, [{ itemId: 'b5_001', score: 5 }]);
    assert.equal(r4.facets[0].answered, 1); assert.equal(r4.facets[0].level, 'high'); assert.equal(r4.facets[1].level, 'none'); assert.equal(r4.decided, false);
    // 공유 문구: 영역마다 행동 문장 + 라벨. 환산 줄 없음
    const lines = shareLines({ testId: 'bigfive', status: 'done', answers: ans.map(a => ({ ...a, reason: 'r' })) });
    assert.equal(lines.shape.length, 5);
    assert.equal(lines.shape[0], '감정 기복이 적고 압박 속에서도 차분하다 (Big Five Neuroticism 낮음·뚜렷 · 불안↓ 분노↓)');
    assert.ok(lines.shape.every(l => !/환산|MBTI|에니어그램|IPC|대인 자세/.test(l)), '환산 라벨 없음');
    assert.equal(lines.splits.length, 0, '전부 뚜렷하면 갈리는 곳 없음');
    // 세부는 최대 2개
    assert.ok(!/(↑|↓)[^()]*(↑|↓)[^()]*(↑|↓)/.test(lines.shape[0]), '세부 2개까지만: ' + lines.shape[0]);
});

test('정직-겸손 보강: 16문항·2세부(꾸밈 없음·탐욕 회피), 역채점, 공유 문구', async () => {
    const { HH } = await import('../tests/hh.js');
    const { scoreFacets } = await import('../scoring.js');
    const { shareLines } = await import('../summary.js');
    assert.equal(HH.id, 'hh2'); assert.equal(HH.items.length, 16); assert.deepEqual(HH.facets.map(f => f.id), ['H1', 'H2']);
    for (const f of HH.facets) assert.equal(HH.items.filter(i => i.facet === f.id).length, 8);
    const honest = HH.items.map(i => ({ itemId: i.id, score: i.keyed === '+' ? 5 : 1 }));
    const r = scoreFacets(HH, honest);
    assert.equal(r.domains[0].sum, 32); assert.equal(r.domains[0].level, 'high');
    // 탐욕 회피만 약하게 낮음(8문항 중 6개가 -1) → 세부는 낮음, 영역은 중간(↓ 기움)
    let k = 0;
    const greedy = HH.items.map(i => ({ itemId: i.id, score: i.facet === 'H2' && k++ < 6 ? (i.keyed === '+' ? 2 : 4) : 3 }));
    const r2 = scoreFacets(HH, greedy);
    assert.equal(r2.facets.find(f => f.id === 'H2').sum, -6); assert.equal(r2.facets.find(f => f.id === 'H2').level, 'low'); assert.equal(r2.domains[0].level, 'mid');
    const l = shareLines({ testId: 'hh2', status: 'done', answers: greedy.map(a => ({ ...a, reason: 'r' })) });
    assert.equal(l.shape[0], '필요하면 꾸미거나 챙기지만 선은 지킨다 (HEXACO Honesty-Humility 보통 · 탐욕 회피↓)');
    assert.equal(l.splits[0], '정직-겸손↓ 은 전체 중간, 세부만 갈림 (HEXACO)');
});

test('VIA 강점 5개: 30문항·강점당 6, 영역=강점, 높음/낮음만 반응 모양에, 중간은 갈리는 곳에', async () => {
    const { VIA } = await import('../tests/via.js');
    const { scoreFacets } = await import('../scoring.js');
    const { shareLines, overview } = await import('../summary.js');
    assert.equal(VIA.id, 'via2'); assert.equal(VIA.items.length, 30); assert.equal(VIA.domains.length, 5); assert.equal(VIA.facets.length, 5);
    for (const f of VIA.facets) assert.equal(VIA.items.filter(i => i.facet === f.id).length, 6);
    const ans = VIA.items.map(i => ({ itemId: i.id, score: i.facet === 'hum' ? (i.keyed === '+' ? 5 : 1) : i.facet === 'hop' ? (i.keyed === '+' ? 1 : 5) : 3, reason: 'r' }));
    const r = scoreFacets(VIA, ans);
    assert.equal(r.domains.find(d => d.id === 'hum').level, 'high'); assert.equal(r.domains.find(d => d.id === 'hop').level, 'low');
    const l = shareLines({ testId: 'via2', status: 'done', answers: ans });
    assert.equal(l.shape.length, 2);
    assert.equal(l.shape[0], '어떤 상황에서도 농담과 웃음으로 분위기를 바꾼다 (VIA Humor 높음·뚜렷)');
    assert.ok(l.shape[1].includes('(VIA Hope 낮음'), l.shape[1]);
    assert.equal(l.splits[0], '감사·용감함·통찰 중간 (VIA)');
    const ov = overview({ via2: { testId: 'via2', status: 'done', answers: ans } }, '신파치');
    assert.equal(ov.length, 1); assert.deepEqual(ov[0].slice(0, 2), ['강점은 유머 — 어떤 상황에서도 농담과 웃음으로 분위기를 바꾼다.', '희망은 약한 편이다.']); assert.ok(ov[0][2].startsWith('최악을 예상하고'), ov[0].join(' | '));
});

test('종합: 한눈에 문장·축별 묶기·조사', async () => {
    const { overview, byAxis, eunNeun } = await import('../summary.js');
    const { MFQ2 } = await import('../tests/mfq2.js');
    const { BIGFIVE } = await import('../tests/bigfive.js');
    assert.equal(eunNeun('신파치'), '는'); assert.equal(eunNeun('긴토키'), '는'); assert.equal(eunNeun('히지카타 토시로'), '는'); assert.equal(eunNeun('카구라'), '는'); assert.equal(eunNeun('신'), '은'); assert.equal(eunNeun('Kagura'), '은(는)');
    const mfq = { testId: 'mfq2', status: 'done', answers: MFQ2.items.map(i => ({ itemId: i.id, score: i.category === 'care' ? 5 : i.category === 'equality' ? 1 : 3, reason: 'r' })) };
    const want = { N: -1, E: 1, O: 0, A: 1, C: 0 };
    const b5 = { testId: 'bigfive', status: 'done', answers: BIGFIVE.items.map(i => { const w = want[i.facet[0]]; const dir = w * (i.keyed === '-' ? -1 : 1); return { itemId: i.id, score: w === 0 ? 3 : dir > 0 ? 5 : 1, reason: 'r' }; }) };
    const ov = overview({ mfq2: mfq, bigfive: b5 }, '신파치');
    assert.equal(ov.length, 2, '가치관 문단 + 성격 문단');
    assert.deepEqual(ov[0], ['신파치는 누가 다치거나 아파하거나 고통받는 장면 — 이런 장면을 그냥 넘기지 않는다.', '반대로 누구는 더 받고 누구는 덜 받는 장면에는 몫이 달라도 신경 쓰지 않는다.', '비례·충성·권위·순수는 중간이라 상황에 따라 다르다.']);
    assert.ok(ov[1][0].startsWith('성격은 ') && ov[1].some(x => x === '개방성·성실성은 중간.') && ov[1].every(x => !/대인 자세|환산/.test(x)), ov[1].join(' | '));
    const groups = byAxis({ mfq2: mfq, bigfive: b5 });
    assert.deepEqual(groups.map(g => [g.axis.id, g.tests.map(x => x.test.id)]), [['values', ['mfq2']], ['personality', ['bigfive']]]);
});


test('설정: 묶음 기본 5, 직접 바꾼 적 없으면 옛 기본 1을 5로 올림', async () => {
    const { DEFAULT_SETTINGS, store } = await import('../engine.js');
    assert.equal(DEFAULT_SETTINGS.batchSize, 5);
    const es = {}; // 모의 getContext는 호출마다 새 객체를 주므로, 이 테스트에서는 고정된 설정 객체를 쓴다
    globalThis.SillyTavern = { getContext: () => ({ extensionSettings: es, saveSettingsDebounced() {} }) };
    const version = store().version;
    es.psych_lab = { version, settings: { batchSize: 1 }, sessions: {} };
    assert.equal(store().settings.batchSize, 5, '옛 기본값은 따라감');
    es.psych_lab = { version, settings: { batchSize: 1, batchTouched: true }, sessions: {} };
    assert.equal(store().settings.batchSize, 1, '직접 고른 1은 유지');
    es.psych_lab = { version, settings: { batchSize: 3 }, sessions: {} };
    assert.equal(store().settings.batchSize, 3, '다른 값은 유지');
});

test('응답 상한: 묶음 비례 최소치, 빈 응답·잘림 감지, 기본 4096·옛 700 이동', async () => {
    const { tokenLimitFor, looksTruncated, DEFAULT_SETTINGS, store, MAX_TOKEN_LIMIT } = await import('../engine.js');
    assert.equal(DEFAULT_SETTINGS.maxTokens, 4096);
    assert.equal(tokenLimitFor(4096, 1), 4096); assert.equal(tokenLimitFor(4096, 5), 4096); assert.equal(tokenLimitFor(4096, 10), 6200);
    assert.equal(tokenLimitFor(700, 5), 3700, '설정이 작아도 묶음 비례 최소치'); assert.equal(tokenLimitFor(99999, 1), MAX_TOKEN_LIMIT);
    assert.ok(looksTruncated(new Error('Google Vertex AI Candidate text empty'), null));
    assert.ok(looksTruncated(new Error('API request failed: finish_reason: length'), null));
    assert.ok(looksTruncated(new Error('모델이 순수 JSON을 반환하지 않았습니다.'), '[{"question_id":"a","score":3,"reason":"잘린'), 'JSON이 열리고 안 닫힘');
    assert.ok(!looksTruncated(new Error('모델이 순수 JSON을 반환하지 않았습니다.'), 'ISFJ입니다. [{"question_id":"a"}]'), '해설 섞임은 잘림 아님');
    assert.ok(!looksTruncated(new Error('응답 키가 question_id, score, reason 정확히 세 개가 아닙니다.'), '{"question_id":"a","score":3,"reason":"r","x":1}'));
    const es = {};
    globalThis.SillyTavern = { getContext: () => ({ extensionSettings: es, saveSettingsDebounced() {} }) };
    const version = store().version;
    es.psych_lab = { version, settings: { maxTokens: 700 }, sessions: {} };
    assert.equal(store().settings.maxTokens, 4096, '옛 기본 700은 4096으로');
    es.psych_lab = { version, settings: { maxTokens: 2000, maxTokensTouched: true }, sessions: {} };
    assert.equal(store().settings.maxTokens, 2000, '직접 고른 값은 유지');
});

test('Schwartz PVQ40: 40문항·채점표 대응·1~6 척도·남/여성판·평균 중심화·4방향·공유 문구', async () => {
    const { SCHWARTZ } = await import('../tests/schwartz.js');
    const { scoreProfile } = await import('../scoring.js');
    const { shareLines, overview } = await import('../summary.js');
    const { buildMessages, parseAnswers, itemText } = await import('../engine.js');
    assert.equal(SCHWARTZ.items.length, 40); assert.equal(SCHWARTZ.categories.length, 10); assert.equal(SCHWARTZ.higher.length, 4);
    const key = { conformity: [7, 16, 28, 36], tradition: [9, 20, 25, 38], benevolence: [12, 18, 27, 33], universalism: [3, 8, 19, 23, 29, 40], self_direction: [1, 11, 22, 34], stimulation: [6, 15, 30], hedonism: [10, 26, 37], achievement: [4, 13, 24, 32], power: [2, 17, 39], security: [5, 14, 21, 31, 35] };
    for (const [cat, nums] of Object.entries(key)) assert.deepEqual(SCHWARTZ.items.filter(i => i.category === cat).map(i => Number(i.id.slice(4))), nums, cat);
    assert.ok(SCHWARTZ.items.every(i => i.text && i.textF && i.keyed === '+'));
    assert.ok(SCHWARTZ.items[0].text.startsWith('이 남성에게는') && SCHWARTZ.items[0].textF.startsWith('이 여성에게는'), '남성판/여성판 원문');
    // 척도 1~6: 프롬프트·검증
    const sessF = { testId: 'schwartz', settings: { portraitGender: 'f' }, card: { profile: { name: 'x', description: 'd', personality: 'p', scenario: '', dialogue_examples: '' }, lorebook: null } };
    const m = buildMessages(sessF, SCHWARTZ.items.slice(0, 2));
    assert.ok(m[0].content.includes('1 = 나와 전혀 같지 않다') && m[0].content.includes('6 = 나와 매우 같다') && m[0].content.includes('"score":1~6의 정수') && m[0].content.includes('짧은 묘사(text)'), '6점 척도 라벨·초상문 안내');
    assert.ok(m[1].content.includes('이 여성에게는'), '여성판 선택 시 textF 전송');
    assert.equal(itemText(SCHWARTZ, SCHWARTZ.items[0], { settings: { portraitGender: 'm' } }), SCHWARTZ.items[0].text);
    assert.equal(parseAnswers(JSON.stringify({ question_id: 'pvq_01', score: 6, reason: 'r' }), SCHWARTZ, [SCHWARTZ.items[0]])[0].score, 6);
    assert.throws(() => parseAnswers(JSON.stringify({ question_id: 'pvq_01', score: 7, reason: 'r' }), SCHWARTZ, [SCHWARTZ.items[0]]), '7은 범위 밖');
    assert.ok(!JSON.stringify(m).includes('category') && !JSON.stringify(m).includes('benevolence'), '채점표 비공개');
    // 채점: 전부 같은 점수면 중심화 후 전부 보통(상대 순위라서)
    const flat = scoreProfile(SCHWARTZ, SCHWARTZ.items.map(i => ({ itemId: i.id, score: 5 })));
    assert.equal(flat.mrat, 5); assert.ok(flat.categories.every(c => c.rel === 0 && c.level === 'mid')); assert.equal(flat.centerMean, true);
    // 박애만 6, 권력만 1, 나머지 4 → 박애 중시, 권력 넘김, 4방향 자기 초월 ↑ · 자기 고양 ↓
    const sc = c => c === 'benevolence' ? 6 : c === 'power' ? 1 : 4;
    const r = scoreProfile(SCHWARTZ, SCHWARTZ.items.map(i => ({ itemId: i.id, score: sc(i.category) })));
    assert.deepEqual(r.high.map(c => c.id), ['benevolence']); assert.deepEqual(r.low.map(c => c.id), ['power']);
    assert.ok(r.categories.find(c => c.id === 'benevolence').rel > 1.5 && r.categories.find(c => c.id === 'power').rel < -2);
    assert.equal(r.higher[0].id, 'transcendence'); assert.equal(r.higher.at(-1).id, 'enhancement'); assert.equal(r.higher.at(-1).level, 'low');
    // 공유 문구
    const sess = { testId: 'schwartz', status: 'done', settings: { portraitGender: 'm' }, answers: SCHWARTZ.items.map(i => ({ itemId: i.id, score: sc(i.category), reason: 'r' })) };
    const l = shareLines(sess);
    assert.equal(l.react[0], '가까운 사람(친구·가족·동료)이 도움이 필요하거나 믿음을 거는 장면: 충실하게 돕고 곁을 지킨다 (Schwartz Benevolence 중시·뚜렷)');
    assert.ok(l.direction[0].startsWith('가치 방향(센 순): 자기 초월(Self-Transcendence)↑ >') && l.direction[0].endsWith('(Schwartz 4방향)'), l.direction[0]);
    assert.equal(l.skip[0], '돈·지위·결정권이 걸린 장면: 집착하지 않는다 (Schwartz Power 낮음)');
    const ov = overview({ schwartz: sess }, '신파치');
    assert.ok(ov[0][0].startsWith('삶에서 중요하게 여기는 것은 박애(') && ov[0][1].startsWith('뒷전인 것은 권력(') && ov[0].at(-1).startsWith('큰 방향으로는 자기 초월 >'), ov[0].join(' | '));
});

test('NPC 뽑기(0.5.0): 라벨 어휘 28개·검증·채우기 순서·세 줄·되읽기·로그', async () => {
    const npc = await import('../npc.js');
    assert.equal(npc.KEYS.length, 28); assert.deepEqual(npc.GROUPS.map(g => g.tag), ['MFQ-2', 'Schwartz', 'Big Five', 'HEXACO', 'VIA']);
    const mk = (fn, extra = {}) => { const labels = {}; for (const g of npc.GROUPS) { labels[g.id] = {}; for (const k of g.keys) labels[g.id][k.key] = fn(`${g.id}.${k.key}`); } return JSON.stringify({ role: '상인 길드장', speech: '존댓말', labels, ...extra }); };
    // 검증: 허용 선택지만, 키 전부, 다른 키 금지, typical은 전형 줬을 때만
    const known = { 'mfq2.proportionality': 'high', 'schwartz.power': 'high', 'bigfive.A': 'low', 'bigfive.C': 'high', 'mfq2.care': 'mid' };
    const p = npc.parseNpc(mk(id => known[id] || 'unknown'));
    assert.equal(p.labels['mfq2.proportionality'], 'high'); assert.equal(p.labels['via.hum'], 'unknown');
    for (const bad of [mk(() => 'maybe'), mk(() => 'typical_high'), mk(() => 'mid', { extra: 1 }), '{"role":"x","speech":"","labels":{}}', 'ISTJ ' + mk(() => 'mid'), mk(() => 'mid').replace('"H2"', '"H9"')]) assert.throws(() => npc.parseNpc(bad), bad.slice(0, 30));
    assert.equal(npc.parseNpc(mk(() => 'typical_low'), { allowTypical: true }).labels['via.hum'], 'typical_low');
    // 채우기: 자료 → 전형(약간 3칸, 자료 칸은 건드리지 않음) → 겹치지 않게(최대 4칸, 기존이 몰린 반대쪽) → 중간
    const existing = [npc.parseCode('[한스] 대장장이.\n가치관: 비례↑ 권위↑ 배려↓ (MFQ-2) · 안전↑ 전통↑ 자극↓ (Schwartz)\n성격: 외향성↓ 우호성↓ 성실성↑ (Big Five) · 꾸밈 없음↑ 탐욕 회피↑ (HEXACO) · 용감함↑ 유머↓ (VIA)')];
    assert.equal(existing[0].name, '한스'); assert.equal(existing[0].count, 13); assert.equal(existing[0].labels['bigfive.E'], 'low'); assert.equal(existing[0].labels['via.per'], 'mid');
    const f = npc.finalizeLabels(p, { archetypeId: 'villain', strength: 'light', existing });
    const by = src => Object.keys(f.source).filter(k => f.source[k] === src);
    assert.deepEqual(by('material').sort(), Object.keys(known).sort());
    assert.deepEqual(by('archetype').sort(), ['hexaco.H1', 'hexaco.H2', 'via.gra'].sort(), '악역 약간: A는 자료에 있어 건너뛰고 세기 순 3칸');
    assert.equal(f.labels['hexaco.H1'], 'low'); assert.equal(f.labels['bigfive.A'], 'low');
    assert.equal(by('diff').length, 4); for (const k of by('diff')) assert.equal(f.labels[k], existing[0].labels[k] === 'high' ? 'low' : 'high', k + ' 는 한스의 반대');
    assert.ok(by('none').every(k => f.labels[k] === 'mid'));
    const f2 = npc.finalizeLabels(p, { archetypeId: 'villain', strength: 'strong', existing: [] });
    assert.equal(Object.values(f2.source).filter(x => x === 'archetype').length, 3, '뚜렷: 표 7칸 중 자료에 있는 4칸 제외');
    const f2b = npc.finalizeLabels(npc.parseNpc(mk(id => id === 'bigfive.E' ? 'high' : 'unknown')), { archetypeId: 'villain', strength: 'strong' });
    assert.equal(Object.values(f2b.source).filter(x => x === 'archetype').length, 7, '뚜렷: 자료와 안 겹치면 표 전부');
    const f3 = npc.finalizeLabels(p, { archetypeId: 'villain', strength: 'light', existing, variant: 1 });
    assert.notDeepEqual(Object.keys(f3.source).filter(k => f3.source[k] === 'diff').sort(), by('diff').sort(), '다르게 다시(variant 1)는 다른 칸을 잡는다');
    // 모델이 typical을 한도 넘게 보내면 자른다
    const f4 = npc.finalizeLabels(npc.parseNpc(mk(() => 'typical_high'), { allowTypical: true }), { archetypeId: 'villain', strength: 'light' });
    assert.equal(Object.values(f4.source).filter(x => x === 'archetype').length, 3);
    // 세 줄: 높/낮만, 묶음 꼬리표, 4방향은 양쪽 다 기울 때만, 빈 축은 "뚜렷한 쪽 없음"
    const lines = npc.npcLines({ name: '모르간', role: '상인 길드장', speech: '존댓말', labels: f.labels });
    assert.equal(lines[0], '[모르간] 상인 길드장. 말투: 존댓말.');
    assert.match(lines[1], /^가치관: 비례↑ .*\(MFQ-2\) · .*권력↑.*\(Schwartz\)$/); assert.match(lines[2], /^성격: 성실성↑ 우호성↓ \(Big Five\) · 꾸밈 없음↓ 탐욕 회피↓ \(HEXACO\) · 감사↓ \(VIA\)$/);
    assert.equal(npc.npcLines({ name: 'x', role: 'r', speech: '', labels: Object.fromEntries(npc.KEYS.map(k => [k.id, 'mid'])) })[1], '가치관: 뚜렷한 쪽 없음');
    assert.equal(npc.higherOrder({ ...Object.fromEntries(npc.KEYS.map(k => [k.id, 'mid'])), 'schwartz.power': 'high' }), null, '한쪽만 기울면 4방향 생략');
    assert.equal(npc.higherOrder({ ...Object.fromEntries(npc.KEYS.map(k => [k.id, 'mid'])), 'schwartz.power': 'high', 'schwartz.tradition': 'low' }).top.name, '자기 고양');
    assert.ok(npc.parseCode(npc.npcLines({ name: 'y', role: 'r', speech: '', labels: f.labels }).join('\n')).count === Object.values(f.labels).filter(v => v !== 'mid').length, '만든 세 줄은 그대로 되읽힌다');
    assert.equal(npc.parseCode('계산적인 상인'), null);
    // 로그: 숨긴 메시지 제외, 태그 벗김, 뒤에서부터 글자 수 한도
    const prevCtx = globalThis.SillyTavern.getContext;
    const fixed = { ...prevCtx(), chat: [{ name: 'A', mes: '<b>첫</b> 줄' }, { name: 'B', is_system: true, mes: '숨김' }, { name: 'C', mes: '둘째 줄'.repeat(10) }, { name: 'D', mes: '셋째' }] };
    globalThis.SillyTavern.getContext = () => fixed;
    const lg = npc.chatLog(40);
    assert.ok(!/숨김|<b>/.test(lg.text) && lg.text.endsWith('D: 셋째') && lg.messages === 1 && lg.total === 3, JSON.stringify(lg));
    assert.equal(npc.chatLog(10000).messages, 3); assert.ok(npc.chatLog(10000).text.startsWith('A: 첫 줄\n'));
    globalThis.SillyTavern.getContext = prevCtx;
    // 프롬프트: 설정·로그·전형, 기존 인물 없음
    const m = npc.buildNpcMessages({ name: '모르간', notes: '계산적', log: { text: 'A: 첫 줄', messages: 1 }, archetype: '악역', strength: 'strong' });
    assert.ok(m[0].content.includes('인물 "모르간"') && m[0].content.includes('care = 배려') && m[0].content.includes('전형이 분명한 항목 전부') && m[1].content.includes('[내 설정]\n계산적') && m[1].content.includes('[전형] 악역 (뚜렷)') && !/한스/.test(m[1].content));
    assert.ok(!npc.buildNpcMessages({ name: 'x', notes: '', log: { text: '', messages: 0 }, archetype: '', strength: 'light' })[0].content.includes('typical_high'), '전형 없으면 typical 문구 없음');
});

test('NPC 기록은 채팅 메타데이터에(0.5.1): 채팅마다 따로, 채팅 없으면 저장 못 함, 0.5.0 설정 기록은 그 채팅을 열 때 옮김', async () => {
    const npc = await import('../npc.js');
    const prevCtx = globalThis.SillyTavern.getContext;
    const es = { psych_lab: { version: 1, settings: {}, sessions: {}, npcs: [{ id: 'old1', name: '옛', chatId: 'chat-A', createdAt: '2026-10-25', labels: {}, source: {} }, { id: 'old2', name: '남', chatId: 'chat-B', createdAt: '2026-10-25', labels: {}, source: {} }] } };
    const metaA = {}, metaB = {};
    let saved = 0;
    const base = { extensionSettings: es, saveSettingsDebounced() {}, saveMetadataDebounced: () => { saved++; }, characters: [{ name: 'x', avatar: 'x.png' }], uuidv4: () => 'u' + Math.random() };
    let cur = { ...base, characterId: 0, groupId: undefined, chatId: 'chat-A', chatMetadata: metaA };
    globalThis.SillyTavern.getContext = () => cur;
    assert.deepEqual(npc.listNpcs().map(n => n.id), ['old1'], '설정에 있던 chat-A 기록이 메타데이터로 옮겨짐');
    assert.deepEqual(es.psych_lab.npcs.map(n => n.id), ['old2'], '다른 채팅 기록은 설정에 남음');
    assert.equal(metaA.psych_lab.npcs.length, 1); assert.ok(saved >= 1);
    npc.saveDraft({ ...npc.DEFAULT_DRAFT, name: 'A의 초안' });
    assert.equal(npc.loadDraft().name, 'A의 초안');
    cur = { ...base, characterId: undefined, groupId: 'g2', chatId: 'chat-B', chatMetadata: metaB };
    assert.deepEqual(npc.listNpcs().map(n => n.id), ['old2'], '그룹 채팅 B: B의 기록만(옮겨 옴)');
    assert.equal(npc.loadDraft().name, '', '초안도 채팅마다 따로');
    assert.equal(es.psych_lab.npcs.length, 0);
    cur = { ...base, characterId: undefined, groupId: undefined, chatId: undefined, chatMetadata: {} };
    assert.equal(npc.hasChat(), false); assert.deepEqual(npc.listNpcs(), []);
    await assert.rejects(npc.generateNpc({ name: '누구', notes: '설정' }), /채팅을 열어야/);
    globalThis.SillyTavern.getContext = prevCtx;
});

test('카드 안의 인물(0.6.0): 대상 키, 항목 목록, 항목 하나 + 세계관만 자료로, 세계관 끄기', async () => {
    const { subjectKey, splitSubject, createSession, buildMessages, store } = await import('../engine.js');
    const { listEntries, loadEntryProfile } = await import('../card.js');
    assert.equal(subjectKey('a.png', null), 'a.png'); assert.equal(subjectKey('a.png', 'embedded:3'), 'a.png#entry:embedded:3');
    assert.deepEqual(splitSubject('a.png#entry:book:7@은혼 설정'), { avatar: 'a.png', entryKey: 'book:7@은혼 설정' }); assert.deepEqual(splitSubject('a.png'), { avatar: 'a.png', entryKey: null });
    const prevCtx = globalThis.SillyTavern.getContext;
    const es = {};
    const characters = [{ avatar: 'rpg.png', name: '닌자 학원 RPG', shallow: false, data: { description: '세계관: 인술학원. '.repeat(10), personality: '', scenario: '', mes_example: '', extensions: { world: 'extra' },
        character_book: { name: '닌타마', entries: [
            { keys: ['6학년', '센조'], comment: '타치바나 센조', content: '6학년 이반. 냉정하고 성실하다.', constant: true, enabled: true },
            { keys: ['란타로'], comment: '', content: '1학년 로반. 성실하고 눈이 나쁘다.', constant: true, enabled: true },
            { keys: ['꺼짐'], comment: '꺼진 항목', content: '안 보여야 함', constant: true, enabled: false },
            { keys: ['빈'], comment: '빈 항목', content: '   ', constant: true, enabled: true }] } } }];
    const worlds = { extra: { entries: { 5: { uid: 5, key: ['도이'], comment: '도이 한스케', content: '1학년 담임.', disable: false }, 6: { uid: 6, key: ['x'], content: '꺼짐', disable: true } } } };
    const fixed = { extensionSettings: es, saveSettingsDebounced() {}, uuidv4: () => 'u1', characters, characterId: 0, unshallowCharacter: async () => {}, loadWorldInfo: async n => worlds[n], worldInfo: { charLore: [] } };
    globalThis.SillyTavern.getContext = () => fixed;
    const list = await listEntries('rpg.png');
    assert.deepEqual(list.map(e => [e.key, e.label, e.kind]), [['embedded:0', '타치바나 센조', 'embedded'], ['embedded:1', '란타로', 'embedded'], ['book:5@extra', '도이 한스케', 'linked']], '켜진 항목만, 라벨은 comment → 첫 키, 연결 로어북 포함');
    const r = await loadEntryProfile('rpg.png', 'embedded:1');
    assert.equal(r.profile.name, '란타로'); assert.equal(r.profile.description, '1학년 로반. 성실하고 눈이 나쁘다.'); assert.ok(r.world.startsWith('세계관: 인술학원.')); assert.equal(r.entry.book, '닌타마');
    const r2 = await loadEntryProfile('rpg.png', 'book:5@extra', { includeWorld: false });
    assert.equal(r2.profile.name, '도이 한스케'); assert.equal(r2.world, null);
    await assert.rejects(loadEntryProfile('rpg.png', 'embedded:2'), /찾을 수 없습니다/, '꺼진 항목은 못 고름');
    // 세션: 키는 합성, 자료는 항목 + world, 다른 항목·로어북 없음
    const sess = await createSession('rpg.png#entry:embedded:1', 'mfq2');
    assert.equal(sess.avatar, 'rpg.png#entry:embedded:1'); assert.equal(sess.name, '란타로'); assert.equal(sess.subject.label, '란타로'); assert.equal(sess.card.lorebookInfo.mode, 'entry'); assert.equal(sess.card.lorebook, null);
    const { MFQ2 } = await import('../tests/mfq2.js');
    const sys = buildMessages(sess, MFQ2.items.slice(0, 1))[0].content;
    const mat = JSON.parse(sys.slice(sys.indexOf('[캐릭터 자료]\n') + '[캐릭터 자료]\n'.length));
    assert.equal(mat.character.description, '1학년 로반. 성실하고 눈이 나쁘다.'); assert.ok(mat.world && !mat.lorebook && !sys.includes('타치바나') && !sys.includes('도이') && sys.includes('자료의 world는'));
    assert.ok(store().sessions['rpg.png#entry:embedded:1'].mfq2, '기록은 합성 키 아래');
    // 설정으로 세계관 끄면 world 없음·규칙 문장도 없음
    store().settings.entryWorld = false;
    const sess2 = await createSession('rpg.png#entry:embedded:0', 'mfq2');
    const sys2 = buildMessages(sess2, MFQ2.items.slice(0, 1))[0].content;
    assert.ok(!sess2.card.world && !sys2.includes('"world"') && !sys2.includes('자료의 world는'));
    globalThis.SillyTavern.getContext = prevCtx;
});

test('GID용 요약(0.6.1): 줄마다 빈 줄, [축 - 칸] 접두, ※·환산 없음, 갈리는 곳·가치 방향에 기움 화살표 없음', async () => {
    const { gidText, shareText } = await import('../summary.js');
    const { TESTS } = await import('../tests/registry.js');
    const hash = id => { let x = 0; for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) % 997; return x; };
    const mk = t => ({ testId: t.id, status: 'done', answers: t.items.map(i => ({ itemId: i.id, score: (hash(i.id) % (t.scale.max - t.scale.min + 1)) + t.scale.min, reason: 'r' })) });
    const sessions = Object.fromEntries(TESTS.map(t => [t.id, mk(t)]));
    const g = gidText(sessions);
    const lines = g.split('\n\n');
    assert.equal(lines[0], '[캐릭터 심리검사 요약]');
    assert.ok(!g.includes('\n- ') && !g.includes('※') && !/MBTI|에니어|IPC|환산/.test(g), '불릿·※·환산 없음');
    assert.ok(lines.slice(1).every(l => /^\[(가치관 - (반응하는 일|넘어가는 일|가치 방향|갈리는 곳)|성격유형 - (반응 모양|갈리는 곳))\] \S/.test(l)), '모든 줄에 접두: ' + lines.slice(1).find(l => !/^\[/.test(l)));
    assert.ok(!lines.some(l => l.includes('\n')), '줄 안에 줄바꿈 없음(한 줄 = 판정 단위 하나)');
    const order = lines.slice(1).map(l => /^\[([^\]]+)\]/.exec(l)[1]); const idx = k => order.findIndex(x => x === k);
    const keys = ['가치관 - 반응하는 일', '가치관 - 넘어가는 일', '가치관 - 가치 방향', '가치관 - 갈리는 곳', '성격유형 - 반응 모양', '성격유형 - 갈리는 곳'].filter(k => idx(k) >= 0);
    assert.deepEqual(keys.map(idx), [...keys.map(idx)].sort((a, b) => a - b), '칸 순서 고정');
    for (const l of lines.filter(l => /갈리는 곳\]|가치 방향\]/.test(l))) assert.ok(!/[↑↓]/.test(l), '기움 화살표 없음: ' + l);
    const split = lines.find(l => l.startsWith('[가치관 - 갈리는 곳]'));
    if (split) assert.match(split, /^\[가치관 - 갈리는 곳\] [^ ]+(은|는) 중간 — 상황 따라 반응하거나 넘김 \((MFQ-2|Schwartz)\)$/);
    const dir = lines.find(l => l.startsWith('[가치관 - 가치 방향]'));
    if (dir) assert.match(dir, /^\[가치관 - 가치 방향\] 센 순: .* > .* \(Schwartz 4방향\)$/);
    // 공유용 요약은 전과 같은 모양(불릿·화살표·※ 유지, 가치 방향 줄은 반응하는 일 끝에)
    const sh = shareText(sessions);
    assert.ok(sh.includes('\n- 가치 방향(센 순): ') && sh.includes('※ 오락용') && sh.indexOf('가치 방향(센 순)') < sh.indexOf('[가치관 — 넘어가는 일]'));
    assert.equal(gidText({}), '[캐릭터 심리검사 요약]');
    // 0.6.3: 제목 줄에 이름 — 준 이름 → 기록의 이름(카드 안의 인물이면 그 라벨) → '캐릭터'
    assert.ok(gidText(sessions, '타카모리 스즈네').startsWith('[타카모리 스즈네 심리검사 요약]\n\n[가치관 - '));
    assert.ok(shareText(sessions, '타카모리 스즈네').startsWith('[타카모리 스즈네 심리검사 요약]\n[가치관 — 반응하는 일]'));
    const named = Object.fromEntries(Object.entries(sessions).map(([k, s]) => [k, { ...s, name: '누나' }]));
    assert.ok(gidText(named).startsWith('[누나 심리검사 요약]') && shareText(named).startsWith('[누나 심리검사 요약]'), '이름 안 줘도 기록의 이름');
    assert.ok(gidText(named, '  ').startsWith('[누나 심리검사 요약]') && gidText({ x: { ...sessions.mfq2, name: '누나', status: 'running' } }).startsWith('[캐릭터 심리검사 요약]'), '빈 이름은 무시, 끝난 검사만');
});

test('NPC GID용(0.6.2, B안): 첫 줄은 접두 없음, 라벨을 장면·반응 문장으로, 본 캐릭터 GID용과 같은 틀, 되읽기', async () => {
    const npc = await import('../npc.js');
    const { gidText } = await import('../summary.js');
    const mid = Object.fromEntries(npc.KEYS.map(k => [k.id, 'mid']));
    const labels = { ...mid, 'mfq2.purity': 'low', 'schwartz.self_direction': 'high', 'schwartz.hedonism': 'high', 'schwartz.conformity': 'low', 'schwartz.tradition': 'low', 'bigfive.E': 'low', 'bigfive.A': 'low', 'hexaco.H1': 'high', 'via.hum': 'low' };
    const rec = { name: '진지명', role: '36세의 무뚝뚝하고 거친 남성, 진소화의 아버지', speech: '낮고 쉰 목소리로 툭 내뱉는 짧은 반말', labels };
    const g = npc.npcGidText(rec);
    const lines = g.split('\n\n');
    assert.equal(lines[0], '[진지명] 36세의 무뚝뚝하고 거친 남성, 진소화의 아버지. 말투: 낮고 쉰 목소리로 툭 내뱉는 짧은 반말.', '첫 줄 = 세 줄의 첫 줄과 같음(접두 없음 → 검사 줄 아님)');
    assert.ok(lines.slice(1).every(l => /^\[(가치관 - (반응하는 일|넘어가는 일|가치 방향)|성격유형 - 반응 모양)\] \S/.test(l)), '나머지 줄 전부 접두: ' + lines.slice(1).find(l => !/^\[/.test(l)));
    assert.ok(!lines.some(l => l.includes('\n')) && !g.includes('※') && !/[↑↓]/.test(g), '줄 안 줄바꿈·※·화살표 없음');
    // 가치관: 높음 → 반응하는 일 "장면: 반응 (이론 EN 중시)", 낮음 → 넘어가는 일 "(… 낮음)"; 검사 정의의 문장 그대로
    assert.ok(lines.includes('[가치관 - 반응하는 일] 스스로 정하고 자기 방식대로 할 자유가 막히는 장면: 답답해하고 자기 방식을 지키려 한다 (Schwartz Self-Direction 중시)'), g);
    assert.ok(lines.includes('[가치관 - 넘어가는 일] 상스러운 말·방종·품위 없는 행동을 보는 장면: 거리낌 없이 넘긴다 (MFQ-2 Purity 낮음)'), g);
    assert.ok(lines.includes('[가치관 - 가치 방향] 센 순: 변화 개방(Openness to Change) > 보존(Conservation) (Schwartz 4방향)'), g);
    // 성격: 영역 글(gloss) + "(이론 EN 높음/낮음)"
    assert.ok(lines.includes('[성격유형 - 반응 모양] 조용하고 혼자 있는 쪽을 택한다 (Big Five Extraversion 낮음)'), g);
    assert.ok(lines.includes('[성격유형 - 반응 모양] 아첨하거나 연기하지 않고 있는 그대로 군다 (HEXACO Sincerity 높음)'), g);
    assert.ok(lines.includes('[성격유형 - 반응 모양] 농담을 잘 안 하고, 남을 웃기려 애쓰지 않는다 (VIA Humor 낮음)'), g);
    // 중간은 안 적음: 라벨 9개 + 가치 방향 1 + 첫 줄 1
    assert.equal(lines.length, 11, g);
    // 칸 순서 고정: 반응 → 넘어감 → 방향 → 성격
    const order = lines.slice(1).map(l => /^\[([^\]]+)\]/.exec(l)[1]); const idx = k => order.indexOf(k);
    assert.ok(idx('가치관 - 반응하는 일') < idx('가치관 - 넘어가는 일') && idx('가치관 - 넘어가는 일') < idx('가치관 - 가치 방향') && idx('가치관 - 가치 방향') < idx('성격유형 - 반응 모양'));
    // 본 캐릭터 GID용과 같은 접두·꼬리 모양(프리셋이 같은 규칙으로 읽는다)
    const { TESTS } = await import('../tests/registry.js');
    const hash = id => { let x = 0; for (const ch of id) x = (x * 31 + ch.charCodeAt(0)) % 997; return x; };
    const mkAll = pick => Object.fromEntries(TESTS.map(t => [t.id, { testId: t.id, status: 'done', answers: t.items.map(i => ({ itemId: i.id, score: pick(t, i), reason: 'r' })) }]));
    const mains = [mkAll((t, i) => (hash(i.id) % (t.scale.max - t.scale.min + 1)) + t.scale.min), mkAll(t => t.scale.max), mkAll(t => t.scale.min)].map(gidText);
    const main = mains[0];
    const shapeOf = l => l.replace(/^\[([^\]]+)\] .* \(([A-Za-z0-9\- ]+?) [A-Za-z\- ]+ (중시|낮음|높음)[^)]*\)$/, '[$1] … ($2 EN $3)');
    const npcShapes = new Set(lines.slice(1).filter(l => !/가치 방향/.test(l)).map(shapeOf)), mainShapes = new Set(mains.flatMap(m => m.split('\n\n').slice(1)).filter(l => /중시|낮음|높음/.test(l)).map(shapeOf));
    for (const s of npcShapes) assert.ok(mainShapes.has(s), '본 캐릭터 요약에도 있는 틀: ' + s + ' / ' + [...mainShapes].join(' | '));
    // 전부 중간이면 첫 줄만
    assert.equal(npc.npcGidText({ name: 'x', role: 'r', speech: '', labels: mid }), '[x] r.');
    // 되읽기: GID용 글도 "겹치지 않게" 칸에 붙여 넣으면 같은 라벨로 읽힌다 (세 줄과 동일)
    const back = npc.parseCode(g);
    assert.equal(back.name, '진지명'); assert.equal(back.count, 9);
    assert.deepEqual(back.labels, npc.parseCode(npc.npcText(rec)).labels, 'GID용과 세 줄은 같은 라벨로 되읽힘');
    // 본 캐릭터의 GID용 요약을 붙여 넣어도 읽힌다(뚜렷·세부 꼬리 포함)
    const mb = npc.parseCode(main);
    assert.ok(mb && mb.count > 0 && Object.values(mb.labels).some(v => v !== 'mid'), '본 캐릭터 GID용 되읽기');
    assert.equal(npc.parseCode('(Schwartz 4방향) 아무것도'), null, '방향 줄만으로는 라벨 없음');
});
