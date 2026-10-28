// 🧠 캐릭터 심리검사 — SillyTavern 확장 (화면)
// 구조 참고: 깡폰(GGang910/kkang_phone)의 햄버거 메뉴 등록·전체 화면 전환, 봇 테스터(sdafaff346/2bottester2)의 로어북 탐색·설정 저장.
// 디자인과 평가 방식은 가져오지 않았다. 모델은 점수표를 보지 않고, 채점은 scoring.js가 한다.
import { settings, save, getSession, deleteSession, createSession, applyCurrentSettings, run, stop, isRunning, estimateTotal, editAnswer, revertAnswer, listProfiles, pendingItems, putSession, itemText, subjectKey, splitSubject, getSubjectEntry, setSubjectEntry } from './engine.js';
import { listEntries } from './card.js';
import { TESTS, TEST_BY_ID, PLANNED, AXES, AXIS_BY_ID } from './tests/registry.js';
import { STRENGTH_LABEL, LEVEL_LABEL, DOMAIN_LEVEL_LABEL } from './scoring.js';
import { resultOf, shareText, sourceCredit, overview, byAxis, collectLines } from './summary.js';
import { ARCHETYPES, STRENGTH, KEY_BY_ID, hasChat, listNpcs, getNpcRecord, deleteNpcRecord, loadDraft, saveDraft, chatLog, buildNpcMessages, estimateTokens, generateNpc, editNpcRecord, npcStructure, npcText, parseCode } from './npc.js';

const VERSION = '0.6.0';
const ROOT_ID = 'psych_lab_root';
const ctx = () => SillyTavern.getContext();
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (v !== null && v !== undefined) node.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c !== null && c !== undefined) node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    return node;
};
const toast = (msg, kind = 'info') => { try { toastr[kind](msg); } catch { console.log('[psych_lab]', msg); } };

// ───────────────────────── 대상: 지금 열린 1:1 채팅의 캐릭터 ─────────────────────────
function target() {
    const c = ctx();
    if (c.groupId) return { mode: 'group', name: c.groups?.find?.(g => g.id === c.groupId)?.name || '그룹 채팅' };
    const ch = c.characters?.[c.characterId];
    if (c.characterId === undefined || !ch) return { mode: 'none' };
    return { mode: 'single', avatar: ch.avatar, name: ch.name, thumb: safeThumb(ch.avatar) };
}
// NPC 뽑기 화면은 채팅 종류와 상관없이 열린다(그룹챗·채팅 없음 포함)
const NPC_VIEWS = new Set(['npc', 'npcResult']);
function safeThumb(avatar) { try { return ctx().getThumbnailUrl('avatar', avatar); } catch { return null; } }

// ───────────────────────── 상태 ─────────────────────────
const ui = { open: false, view: 'home', avatar: null, testId: null, npcId: null, busy: false, root: null, body: null, historyPushed: false,
    entries: { avatar: null, list: [], loading: false }, entryFilter: '' };   // 0.6.0: 카드 안의 인물 목록(카드별 캐시)
// 본문에 붙일 때 null/undefined는 건너뛴다. (DOM의 append(null)은 글자 'null'을 붙여 버린다 — 0.2.3 휴대폰 제보)
const mount = (...nodes) => ui.body.append(...nodes.flat().filter(n => n !== null && n !== undefined));

// ───────────────────────── 패널 열고 닫기 ─────────────────────────
function openPanel() {
    if (ui.open) { render(); return; }
    ui.open = true;
    ui.view = 'home';
    ui.root = el('div', { id: ROOT_ID, role: 'dialog', 'aria-label': '캐릭터 심리검사' },
        el('div', { class: 'pl-backdrop', onclick: closePanel }),
        el('div', { class: 'pl-panel' },
            el('header', { class: 'pl-header' },
                el('button', { class: 'pl-icon-btn pl-back', type: 'button', title: '뒤로', onclick: () => ui.view === 'home' ? closePanel() : ui.view === 'npcResult' ? go('npc') : go('home') }, '‹'),
                el('div', { class: 'pl-title' }, el('span', { class: 'pl-title-main' }, '🧠 캐릭터 심리검사'), el('span', { class: 'pl-title-sub', id: 'pl_sub' }, '')),
                el('img', { class: 'pl-avatar', id: 'pl_avatar', alt: '', hidden: '' }),
                el('button', { class: 'pl-icon-btn', type: 'button', title: '닫기', onclick: closePanel }, '×'),
            ),
            ui.body = el('div', { class: 'pl-body' }),
        ));
    document.body.appendChild(ui.root);
    document.documentElement.classList.add('pl-lock');
    try { history.pushState({ psychLab: true }, ''); ui.historyPushed = true; } catch { /* ignore */ }
    render();
}
function closePanel() {
    if (!ui.open) return;
    ui.open = false;
    ui.root?.remove(); ui.root = null; ui.body = null;
    document.documentElement.classList.remove('pl-lock');
    if (ui.historyPushed) { ui.historyPushed = false; try { if (history.state?.psychLab) history.back(); } catch { /* ignore */ } }
    if (ui.avatar && TESTS.some(t => isRunning(ui.avatar, t.id))) toast('검사는 화면을 닫아도 계속 진행돼요. 끝나면 알림이 떠요.');
}
window.addEventListener('popstate', () => { if (ui.open) { ui.historyPushed = false; closePanel(); } });
function go(view, extra = {}) { Object.assign(ui, { view }, extra); render(); }
function anyRunning() { return ui.avatar && TESTS.some(t => isRunning(ui.avatar, t.id)); }

// ───────────────────────── 화면 그리기 ─────────────────────────
function render() {
    if (!ui.open || !ui.body) return;
    const t = target();
    // 0.6.0: 검사 대상 = 카드 자체 또는 카드 안의 인물(로어북 항목). 기록 키는 subjectKey. 이름은 인물 라벨.
    if (t.mode === 'single') {
        ensureEntries(t.avatar);
        const entryKey = getSubjectEntry(t.avatar);
        const entry = entryKey ? ui.entries.list.find(e => e.key === entryKey) : null;
        if (entryKey && ui.entries.avatar === t.avatar && !ui.entries.loading && !entry) { setSubjectEntry(t.avatar, null); }   // 항목이 사라졌으면 카드 자체로
        const ek = getSubjectEntry(t.avatar);
        t.key = subjectKey(t.avatar, ek); t.entry = ek ? (entry || { key: ek, label: Object.values(sessionsFor(t.key)).find(Boolean)?.name || '(인물 읽는 중)' }) : null;
        t.subjectName = t.entry ? t.entry.label : t.name;
    }
    // 결과·진행 화면을 보던 중 채팅이 바뀌면 홈으로. 진행 중인 검사는 엔진이 알아서 계속한다. NPC 화면은 채팅이 바뀌어도 그대로(로그만 새로 읽는다).
    if (t.mode === 'single') { if (ui.avatar !== t.key && ui.view !== 'home' && !NPC_VIEWS.has(ui.view)) ui.view = 'home'; ui.avatar = t.key; }
    else { ui.avatar = null; if (!NPC_VIEWS.has(ui.view)) ui.view = 'home'; }
    // NPC 화면은 채팅이 열려 있어야 (뽑은 NPC가 그 채팅방에 저장되므로). 채팅을 닫으면 홈으로.
    if (NPC_VIEWS.has(ui.view) && !hasChat()) ui.view = 'home';
    const viewChanged = ui.lastView !== ui.view; ui.lastView = ui.view;
    ui.body.replaceChildren();
    if (viewChanged) ui.body.scrollTop = 0;   // 화면이 바뀌면 맨 위부터 (같은 화면 다시 그리기는 자리 유지)
    ui.root.querySelector('.pl-back').style.visibility = ui.view === 'home' ? 'hidden' : 'visible';
    ui.root.querySelector('#pl_sub').textContent = NPC_VIEWS.has(ui.view) ? `NPC 뽑기 · ${t.name}` : t.mode === 'single' ? (t.entry ? `${t.name} › ${t.subjectName}` : t.name) : '';
    const img = ui.root.querySelector('#pl_avatar');
    if (t.mode === 'single' && t.thumb) { img.src = t.thumb; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
    if (ui.view === 'home') renderHome(t);
    else if (ui.view === 'run') renderRun();
    else if (ui.view === 'result') renderResult();
    else if (ui.view === 'report') renderReport(t);
    else if (ui.view === 'npc') renderNpc(t);
    else if (ui.view === 'npcResult') renderNpcResult(t);
}
/** 카드에 연결된 로어북 항목 목록을 한 번 읽어 둔다(카드별 캐시). 다 읽으면 화면을 다시 그린다. */
function ensureEntries(avatar) {
    if (ui.entries.avatar === avatar || ui.entries.loading) return;
    ui.entries = { avatar, list: [], loading: true };
    listEntries(avatar).then(list => { ui.entries = { avatar, list, loading: false }; })
        .catch(err => { console.warn('[psych_lab] 인물 목록 읽기 실패', err); ui.entries = { avatar, list: [], loading: false }; })
        .finally(() => { if (ui.open) render(); });
}
/** 홈의 NPC 뽑기 카드. 1:1·그룹 어디서나. 뽑은 NPC는 그 채팅방에 저장되므로 채팅이 열려 있어야 한다. */
function npcCard() {
    const ok = hasChat();
    const n = ok ? listNpcs().length : 0;
    return el('section', { class: 'pl-card' },
        el('h2', { class: 'pl-h2' }, 'NPC 뽑기', el('span', { class: 'pl-h2-sub' }, '간소화 — 내 설정 + 이 채팅의 로그 → 유형 라벨 세 줄 · 모델 호출 1번')),
        el('p', { class: 'pl-help' }, '다인봇 NPC가 다 비슷해질 때 써요. 이름과 이미 만든 설정을 적고 뽑으면 다섯 검사의 라벨로 세 줄을 만들어요. 복사해서 로어북 항목에 붙이면 고정 NPC가 돼요. 그룹 채팅에서도 돼요. 뽑은 NPC는 이 채팅방에만 저장돼요 — 다른 채팅에서는 안 보여요.'),
        ok ? el('div', { class: 'pl-actions' },
            el('button', { class: 'pl-btn', type: 'button', id: 'pl_npc_open', onclick: () => go('npc') }, 'NPC 뽑기'),
            n ? el('span', { class: 'pl-chip pl-chip-done' }, `이 채팅의 NPC ${n}개`) : null)
            : el('p', { class: 'pl-notice' }, '채팅(1:1 또는 그룹)을 열면 쓸 수 있어요. 뽑은 NPC가 그 채팅방에 저장되거든요.'));
}

function renderHome(t) {
    const s = settings();
    const profiles = listProfiles();
    const field = (label, control, help) => el('label', { class: 'pl-field' }, el('span', { class: 'pl-label' }, label), control, help ? el('span', { class: 'pl-help' }, help) : null);
    const num = (label, key, min, max, help) => field(label, el('input', { class: 'pl-input', type: 'number', min, max, value: s[key], onchange: e => { s[key] = Math.max(min, Math.min(max, Number(e.target.value) || min)); e.target.value = s[key]; if (key === 'batchSize') s.batchTouched = true; if (key === 'maxTokens') s.maxTokensTouched = true; save(); } }), help);

    if (t.mode !== 'single') {
        mount(el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, '검사 대상'),
            el('p', { class: 'pl-notice' }, t.mode === 'group' ? '그룹 채팅에서는 캐릭터 검사(다섯 검사)를 하지 않아요. 검사할 캐릭터의 카드를 눌러 1:1 채팅을 연 뒤 다시 열어 주세요. 아래 NPC 뽑기는 그룹 채팅에서도 돼요.' : '검사할 캐릭터의 카드를 눌러 1:1 채팅을 연 뒤 다시 열어 주세요. 지금 열린 채팅의 캐릭터를 검사해요.'),
        ), npcCard());
        mount(el('footer', { class: 'pl-foot' }, `v${VERSION}`));
        return;
    }

    mount(
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, '검사 대상'),
            el('div', { class: 'pl-target' }, t.thumb ? el('img', { class: 'pl-target-img', src: t.thumb, alt: '' }) : null,
                el('div', {}, el('div', { class: 'pl-target-name' }, t.subjectName),
                    el('div', { class: 'pl-help' }, t.entry ? `카드 "${t.name}" 안의 인물(로어북 항목${t.entry.chars ? ` · ${t.entry.chars.toLocaleString()}자` : ''}). 이 항목 내용${s.entryWorld !== false ? '과 카드 설명(세계관)' : ''}만 근거로 검사하고, 기록은 인물마다 따로 남아요. 결과는 이 항목 끝에 붙여 넣으면 돼요.` : '지금 열린 1:1 채팅의 캐릭터예요. 카드 파일: ' + t.avatar))),
            entryPicker(t),
        ),
        ...AXES.map(axis => el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, axis.name, el('span', { class: 'pl-h2-sub' }, axis.desc)),
            ...TESTS.filter(t => t.axis === axis.id).map(test => testRow(test)),
            PLANNED.some(p => p.axis === axis.id) ? el('div', { class: 'pl-planned' }, el('span', { class: 'pl-help' }, '준비 중: '), PLANNED.filter(p => p.axis === axis.id).map(p => `${p.name} (${p.count}문항)`).join(' · ')) : null,
        )),
        el('section', { class: 'pl-card pl-card-soft' },
            el('h2', { class: 'pl-h2' }, '종합 결과'),
            el('p', { class: 'pl-help' }, doneCount(ui.avatar) ? `끝난 검사 ${doneCount(ui.avatar)}개를 한 화면에서 읽어요. 가치관과 성격을 나눠서 보여 주고, 카드에 붙여 넣는 공유용 요약도 여기서 복사해요.` : '검사를 하나라도 끝내면 여기서 한 화면으로 읽을 수 있어요.'),
            el('div', { class: 'pl-actions' },
                el('button', { class: 'pl-btn', type: 'button', disabled: doneCount(ui.avatar) ? null : '', onclick: () => go('report') }, '종합 결과 보기'),
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', disabled: doneCount(ui.avatar) ? null : '', onclick: () => copyShare() }, '공유용 요약 복사')),
            el('details', { class: 'pl-share-details' }, el('summary', { class: 'pl-help' }, '공유용 요약 미리 보기'), el('pre', { class: 'pl-share', id: 'pl_share_preview' }, shareText(sessionsFor(ui.avatar)))),
        ),
        npcCard(),
        el('details', { class: 'pl-card pl-settings' },
            el('summary', { class: 'pl-h2' }, '설정'),
            field('모델 연결', el('select', { class: 'pl-select', onchange: e => { s.profileId = e.target.value; save(); } },
                el('option', { value: '', selected: !s.profileId ? '' : null }, '현재 연결 그대로'),
                ...profiles.map(p => el('option', { value: p.id, selected: p.id === s.profileId ? '' : null }, p.name))),
                profiles.length ? '연결 프로필을 고르면 RP와 다른(저렴한) 모델로 검사할 수 있어요.' : '연결 프로필(Connection Manager)이 없으면 지금 연결된 모델을 써요.'),
            field('로어북', el('select', { class: 'pl-select', onchange: e => { s.lorebook = e.target.value; save(); } },
                ...[['constant', '상시 항목만 (기본)'], ['all', '켜진 항목 전부'], ['none', '안 넣음']].map(([v, tx]) => el('option', { value: v, selected: s.lorebook === v ? '' : null }, tx))),
                '카드에 연결된 로어북을 파일에서 직접 읽어요. 전부 넣으면 호출마다 비용이 늘어요.'),
            field('Schwartz 초상문 성별', el('select', { class: 'pl-select', onchange: e => { s.portraitGender = e.target.value; save(); } },
                ...[['m', '남성판 (기본)'], ['f', '여성판']].map(([v, tx]) => el('option', { value: v, selected: s.portraitGender === v ? '' : null }, tx))),
                'Schwartz 10가치 검사는 "어떤 남성/여성에 대한 묘사"를 읽고 답하는 형식이라 남성판·여성판이 따로 있어요. 검사할 캐릭터에 맞춰 고른 뒤 시작하세요(시작 때 값이 그 기록에 고정돼요).'),
            num('한 번에 묶는 문항 수', 'batchSize', 1, 10, '기본 5. 1이면 문항마다 호출(가장 정확, 가장 비쌈). 묶을수록 호출이 줄지만 앞 문항 답이 뒤 문항에 영향을 줄 수 있어요.'),
            num('응답 토큰 상한', 'maxTokens', 1000, 32000, '기본 4096. 생각(thinking)을 쓰는 모델은 생각 토큰도 여기 포함돼서, 답이 비어 오면 올려 보세요. 묶음이 크면 자동으로 더 올라가요.'),
            num('응답이 틀렸을 때 다시 시도하는 횟수', 'retries', 0, 20, '모델이 정해진 모양으로 답하지 않으면 같은 문항을 이만큼 다시 물어요. 다 써도 안 되면 멈추고 마지막 응답을 보여 줘요.'),
            el('label', { class: 'pl-check' }, el('input', { type: 'checkbox', checked: s.showEstimateAfter ? '' : null, onchange: e => { s.showEstimateAfter = e.target.checked; save(); } }), el('span', {}, '끝났을 때 예상 사용 토큰(어림값) 보여 주기')),
            el('label', { class: 'pl-check' }, el('input', { type: 'checkbox', id: 'pl_entry_world', checked: s.entryWorld !== false ? '' : null, onchange: e => { s.entryWorld = e.target.checked; save(); render(); } }), el('span', {}, '카드 안의 인물을 검사할 때 카드 설명(세계관)도 배경으로 넣기 (최대 6,000자)')),
        ),
        el('footer', { class: 'pl-foot' }, `v${VERSION} · 오락용 단축 검사. 카드·로어북·RP 설정을 자동으로 바꾸지 않아요.`),
    );
}

/** 검사 대상 고르기: 카드 자체 / 카드에 연결된 로어북 항목(다인봇의 인물). 항목이 없으면 아무것도 안 그린다. */
function entryPicker(t) {
    const E = ui.entries;
    if (E.loading && E.avatar === t.avatar) return el('p', { class: 'pl-help' }, '카드의 로어북 항목(인물 목록)을 읽는 중…');
    if (E.avatar !== t.avatar || !E.list.length) return null;
    const current = getSubjectEntry(t.avatar) || '';
    const sel = el('select', { class: 'pl-select', id: 'pl_entry', onchange: e => { setSubjectEntry(t.avatar, e.target.value || null); ui.entryFilter = ''; render(); } });
    const fill = () => {
        const q = ui.entryFilter.trim().toLowerCase();
        sel.replaceChildren(el('option', { value: '', selected: !current ? '' : null }, `카드 자체 — ${t.name}`));
        const books = [...new Set(E.list.map(e => e.book))];
        for (const b of books) {
            const items = E.list.filter(e => e.book === b && (!q || e.label.toLowerCase().includes(q) || e.key === current));
            if (!items.length) continue;
            sel.append(el('optgroup', { label: `${b} (${E.list.filter(e => e.book === b).length})` }, ...items.map(e => el('option', { value: e.key, selected: e.key === current ? '' : null }, `${e.label} · ${e.chars.toLocaleString()}자`))));
        }
    };
    fill();
    const filter = el('input', { class: 'pl-input', id: 'pl_entry_filter', type: 'search', placeholder: `이름으로 찾기 (항목 ${E.list.length}개)`, value: ui.entryFilter, oninput: e => { ui.entryFilter = e.target.value; fill(); } });
    return el('div', { class: 'pl-field pl-entry-picker' },
        el('span', { class: 'pl-label' }, '누구를 검사하나'),
        E.list.length > 8 ? filter : null, sel,
        el('span', { class: 'pl-help' }, '다인봇처럼 인물이 로어북 항목으로 들어 있는 카드는 여기서 한 명을 골라요. 고르면 그 항목만 근거로 검사하고(다른 항목은 안 넣음), 기록·종합 결과·공유용 요약이 인물마다 따로 생겨요. "카드 자체"는 지금까지처럼 카드 5칸 + 연결 로어북으로 검사해요.'));
}

function sessionsFor(avatar) { return Object.fromEntries(TESTS.map(t => [t.id, getSession(avatar, t.id)])); }
function doneCount(avatar) { return Object.values(sessionsFor(avatar)).filter(s => s && s.status === 'done').length; }

function testRow(test) {
    const sess = getSession(ui.avatar, test.id);
    const running = isRunning(ui.avatar, test.id);
    const total = test.items.length;
    let status = '아직 안 함', cls = 'pl-chip';
    if (sess) {
        const n = sess.answers.length;
        if (running) { status = `진행 중 ${n}/${total}`; cls += ' pl-chip-run'; }
        else if (sess.status === 'done') { status = `완료 ${n}/${total}`; cls += ' pl-chip-done'; }
        else if (sess.status === 'error') { status = `멈춤(오류) ${n}/${total}`; cls += ' pl-chip-err'; }
        else { status = `멈춤 ${n}/${total}`; }
    }
    const actions = [];
    if (running) actions.push(el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => go('run', { testId: test.id }) }, '진행 보기'));
    else if (!sess) actions.push(el('button', { class: 'pl-btn', type: 'button', onclick: () => startTest(test.id, false) }, '시작'));
    else {
        if (sess.status !== 'done') actions.push(el('button', { class: 'pl-btn', type: 'button', onclick: () => startTest(test.id, true) }, '이어가기'));
        if (sess.answers.length) actions.push(el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => go('result', { testId: test.id }) }, '결과'));
        actions.push(el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => startTest(test.id, false) }, '새로'));
        actions.push(el('button', { class: 'pl-btn pl-btn-danger', type: 'button', onclick: () => removeSession(test.id) }, '삭제'));
    }
    return el('div', { class: 'pl-test' },
        el('div', { class: 'pl-test-main' },
            el('div', { class: 'pl-test-name' }, test.name),
            el('div', { class: 'pl-test-meta' }, `${total}문항 · ${test.scale.min}~${test.scale.max}점 · ${test.source.license}`),
        ),
        el('span', { class: cls }, status),
        el('div', { class: 'pl-actions' }, ...actions),
    );
}

// ───────────────────────── 시작 / 중단 / 삭제 ─────────────────────────
async function startTest(testId, resume) {
    const t = target();
    if (t.mode !== 'single') return toast('1:1 채팅을 먼저 열어 주세요.', 'warning');
    const avatar = subjectKey(t.avatar, getSubjectEntry(t.avatar));   // 카드 자체 또는 카드 안의 인물
    if (TESTS.some(x => isRunning(avatar, x.id))) return toast('이 대상의 다른 검사가 진행 중이에요. 끝나거나 멈춘 뒤 시작하세요.', 'warning');
    try {
        let sess = resume ? getSession(avatar, testId) : null;
        if (!sess) {
            const old = getSession(avatar, testId);
            if (old && old.answers.length) {
                const ok = await confirmPopup('새로 시작', `이 캐릭터의 기존 ${esc(TEST_BY_ID[testId].short)} 기록(${old.answers.length}문항)을 지우고 새로 시작할까요?`, '새로 시작', '취소');
                if (!ok) return;
            }
            toast(splitSubject(avatar).entryKey ? '인물 항목을 읽는 중…' : '카드와 로어북을 읽는 중…');
            sess = await createSession(avatar, testId);
        } else if (sess.status === 'error') { sess.status = 'paused'; sess.error = null; sess.lastRaw = null; }
        applyCurrentSettings(sess);
        const test = TEST_BY_ID[testId];
        const lore = sess.card.lorebookInfo;
        const loreLine = lore.mode === 'entry' ? `카드 안의 인물 · 항목 "${lore.label}"${lore.world ? ' + 카드 설명(세계관)' : ''} · 다른 항목은 안 넣음` : lore.mode === 'none' ? '로어북 안 넣음' : `로어북 ${lore.entries}개 항목${lore.truncated ? ' (길어서 일부 생략)' : ''} (${lore.mode === 'constant' ? '상시만' : '전부'})`;
        const left = pendingItems(sess).length;
        const ok = await confirmPopup(resume ? '이어가기' : '검사 시작',
            `<b>${esc(sess.name)}</b> · ${esc(test.name)}<br>${resume ? `남은 문항 ${left}개` : `${test.items.length}문항`} · ${esc(loreLine)}<br><span class="pl-help">문항마다(또는 묶음마다) 모델을 한 번씩 불러요. 캐싱이 안 되는 모델·연결에서는 비용이 클 수 있어요. 시작하면 끝까지 자동으로 진행되고, 중간에 멈출 수 있어요.</span>`,
            '시작', '취소');
        if (!ok) return;
        go('run', { testId });
        run(sess, s => { if (ui.open && ui.testId === s.testId && ui.avatar === s.avatar) render(); }).then(async s => {
            if (s.status === 'done') {
                let extra = '';
                if (settings().showEstimateAfter) { try { const e = await estimateTotal(s); s.estimate = e; putSession(s); extra = ` · 예상 사용 약 ${e.total.toLocaleString()}토큰`; } catch { /* ignore */ } }
                toast(`${s.name} · ${test.short} 검사 완료 (${s.answers.length}문항)${extra}`, 'success');
                if (ui.open && ui.view === 'run' && ui.testId === testId && ui.avatar === s.avatar) go('result', { testId });
            }
            else if (s.status === 'error') toast('검사가 멈췄어요: ' + s.error, 'error');
            else if (s.status === 'paused') toast('검사를 멈췄어요. 이어가기로 계속할 수 있어요.');
            if (ui.open) render();
        }).catch(err => { toast('검사 오류: ' + err.message, 'error'); if (ui.open) render(); });
    } catch (err) { toast(err.message || String(err), 'error'); }
}

async function removeSession(testId) {
    const sess = getSession(ui.avatar, testId);
    if (!sess) return;
    if (isRunning(ui.avatar, testId)) return toast('진행 중인 검사는 먼저 멈추세요.', 'warning');
    const ok = await confirmPopup('기록 삭제', `${esc(sess.name)}의 ${esc(TEST_BY_ID[testId].short)} 기록(${sess.answers.length}문항)을 지울까요? 되돌릴 수 없어요.`, '삭제', '취소');
    if (!ok) return;
    deleteSession(ui.avatar, testId); render();
}

async function confirmPopup(header, html, okText = '확인', cancelText = '취소') {
    const c = ctx();
    const content = `<h3>${esc(header)}</h3><div class="pl-popup-body">${html}</div>`;
    const result = await c.callGenericPopup(content, c.POPUP_TYPE.CONFIRM, '', { okButton: okText, cancelButton: cancelText, allowVerticalScrolling: true });
    return result === c.POPUP_RESULT.AFFIRMATIVE;
}

// ───────────────────────── 진행 화면 ─────────────────────────
function renderRun() {
    const test = TEST_BY_ID[ui.testId];
    const sess = getSession(ui.avatar, ui.testId);
    if (!test || !sess) return go('home');
    const n = sess.answers.length, total = test.items.length;
    const running = isRunning(ui.avatar, ui.testId);
    const next = pendingItems(sess).slice(0, sess.settings.batchSize || 1);
    mount(
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, test.name),
            el('div', { class: 'pl-progress' }, el('div', { class: 'pl-progress-bar', style: `width:${Math.round(n / total * 100)}%` })),
            el('div', { class: 'pl-progress-text' }, `응답 완료 ${n} / ${total}`, running ? ' · 모델 응답 대기 중' : sess.status === 'done' ? ' · 완료' : sess.status === 'error' ? ' · 멈춤(오류)' : ' · 멈춤'),
            sess.error ? el('div', { class: 'pl-error' }, sess.error, sess.lastRaw ? el('details', { class: 'pl-raw' }, el('summary', {}, '마지막 모델 응답 원문 보기'), el('pre', {}, sess.lastRaw)) : null) : null,
            running && next.length ? el('div', { class: 'pl-now' }, el('span', { class: 'pl-help' }, '지금 묻는 문항'), ...next.map(i => el('div', { class: 'pl-now-item' }, itemLabel(test, i, sess)))) : null,
            el('div', { class: 'pl-actions' },
                running ? el('button', { class: 'pl-btn pl-btn-danger', type: 'button', onclick: () => { stop(ui.avatar, ui.testId); toast('지금 호출이 끝나면 멈춰요.'); } }, '중단')
                    : sess.status !== 'done' ? el('button', { class: 'pl-btn', type: 'button', onclick: () => startTest(ui.testId, true) }, '이어가기') : null,
                n ? el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => go('result', { testId: ui.testId }) }, '결과 보기') : null,
            ),
            el('p', { class: 'pl-help' }, '이 화면을 닫거나 다른 채팅으로 가도 검사는 계속돼요. 모델이 이상한 답을 내면 정해진 횟수만큼 다시 묻고, 그래도 안 되면 멈추고 알려 줘요. 임의로 채우지 않아요.'),
        ),
        n ? el('section', { class: 'pl-card' }, el('h2', { class: 'pl-h2' }, '지금까지의 답'), ...sess.answers.slice().reverse().map(a => answerLine(test, a, false, sess))) : null,
    );
}
const itemLabel = (test, i, sess) => test.format === 'likert' ? itemText(test, i, sess) : `${i.left}  ↔  ${i.right}`;

// ───────────────────────── 결과 화면 ─────────────────────────
function renderResult() {
    const test = TEST_BY_ID[ui.testId];
    const sess = getSession(ui.avatar, ui.testId);
    if (!test || !sess || !sess.answers.length) return go('home');
    const { score, edited } = resultOf(sess);
    const partial = sess.status !== 'done';
    const main = scoreView(score);
    const est = sess.estimate ? ` · 예상 사용 약 ${sess.estimate.total.toLocaleString()}토큰(캐시 미적용 기준)` : '';

    mount(
        el('section', { class: 'pl-card' },
            el('div', { class: 'pl-result-head' }, el('h2', { class: 'pl-h2' }, `${sess.name} · ${test.short}`, el('span', { class: 'pl-axis-chip' }, AXIS_BY_ID[test.axis]?.name ?? '')),
                el('span', { class: 'pl-help' }, `${new Date(sess.createdAt).toLocaleString()} · 호출 ${sess.calls}번${edited ? ` · 제작자 수정 ${edited}문항` : ''}${partial ? ` · 미완료 ${sess.answers.length}/${test.items.length}` : ''}${est}`)),
            partial ? el('p', { class: 'pl-error' }, '아직 다 답하지 않았어요. 아래는 지금까지의 답으로 계산한 임시 결과예요.') : null,
            main,
            el('div', { class: 'pl-actions' },
                el('button', { class: 'pl-btn', type: 'button', onclick: () => go('report') }, '종합 결과'),
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => copyShare() }, '공유용 요약 복사'),
                partial ? el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => startTest(ui.testId, true) }, '이어가기') : null),
        ),
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, '문항별 답'),
            el('p', { class: 'pl-help' }, '캐릭터가 고른 칸이 진하게 표시돼요. 다른 칸을 누르면 내 생각으로 바꿀 수 있어요. 바꿔도 캐릭터의 원래 답과 이유는 남아요.'),
            ...groupsOf(test).map(g => el('div', { class: 'pl-group' },
                el('h3', { class: 'pl-h3' }, g.title),
                ...g.items.map(item => {
                    const a = sess.answers.find(x => x.itemId === item.id);
                    return a ? answerLine(test, a, true, sess) : el('div', { class: 'pl-answer pl-answer-missing' }, pairLine(test, item, sess), el('span', { class: 'pl-help' }, '아직 답 없음'));
                }))),
        ),
        el('section', { class: 'pl-card pl-card-soft' }, el('h2', { class: 'pl-h2' }, '출처'), el('pre', { class: 'pl-share' }, sourceCredit(test))),
    );
}

function scoreView(score, opts = {}) {
    if (score.kind === 'profile') return profileView(score, opts);
    if (score.kind === 'facets') return facetsView(score, opts);
    return el('div', { class: 'pl-help' }, '이 채점 방식은 화면 표시를 지원하지 않아요.');
}

// ───────────────────────── 종합 결과 ─────────────────────────
function renderReport(t) {
    const sessions = sessionsFor(ui.avatar);
    const groups = byAxis(sessions);
    const total = groups.reduce((n, g) => n + g.tests.length, 0);
    if (!total) return go('home');
    const sentences = overview(sessions, t.subjectName || t.name);
    const { splitsByAxis } = collectLines(sessions);
    const editedAll = groups.flatMap(g => g.tests).flatMap(({ session, test }) => session.answers.filter(a => a.edited).map(a => ({ test, item: test.items.find(i => i.id === a.itemId), a })));
    const dateOf = x => new Date(x.session.finishedAt || x.session.createdAt).toLocaleDateString();
    mount(
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, `${t.subjectName || t.name} · 종합 결과`),
            el('span', { class: 'pl-help' }, `끝난 검사 ${total}개 · ${groups.flatMap(g => g.tests).map(x => `${x.test.short}(${dateOf(x)})`).join(', ')}`),
            el('h3', { class: 'pl-h3' }, '한눈에'),
            el('div', { class: 'pl-overview' }, ...sentences.map(para => el('div', { class: 'pl-overview-para' }, ...para.map(x => el('p', {}, x))))),
            el('div', { class: 'pl-actions' }, el('button', { class: 'pl-btn', type: 'button', onclick: () => copyShare() }, '공유용 요약 복사')),
        ),
        ...groups.map(g => el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, g.axis.name, el('span', { class: 'pl-h2-sub' }, g.axis.desc)),
            g.tests.length ? g.tests.map(({ session, test, score, edited }) => el('div', { class: 'pl-report-test' },
                el('div', { class: 'pl-report-test-head' }, el('b', {}, test.name), el('span', { class: 'pl-help' }, `${edited ? `제작자 수정 ${edited}문항 · ` : ''}`),
                    el('button', { class: 'pl-link', type: 'button', onclick: () => go('result', { testId: test.id }) }, '문항별 답 보기')),
                scoreView(score, { compact: true }),
            )) : el('p', { class: 'pl-help' }, g.axis.id === 'values' ? '가치관 검사를 아직 안 했어요. 도덕 기반·10가치 검사를 돌리면 "무엇에 반응하나"가 채워져요.' : '성격 검사를 아직 안 했어요. 빅파이브 검사를 돌리면 "어떻게 반응하나"가 채워져요.'),
            g.tests.length ? el('div', { class: 'pl-report-splits' },
                el('h3', { class: 'pl-h3' }, '갈리는 곳', el('span', { class: 'pl-h2-sub' }, '중간이거나 경계인 것 — 상황에 따라 달라질 수 있는 부분')),
                splitsByAxis[g.axis.id].length ? el('ul', { class: 'pl-splits' }, ...splitsByAxis[g.axis.id].map(x => el('li', {}, x))) : el('p', { class: 'pl-help' }, '없음 — 전부 뚜렷하게 나왔어요.')) : null,
        )),
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, '내가 고친 것', el('span', { class: 'pl-h2-sub' }, '캐릭터의 답을 내 선택으로 바꾼 문항')),
            editedAll.length ? el('ul', { class: 'pl-splits' }, ...editedAll.map(({ test, item, a }) => el('li', {}, `${test.short} · ${item ? item.text : a.itemId}: 캐릭터 ${a.score} → 내 선택 ${a.edited.score}`))) : el('p', { class: 'pl-help' }, '고친 문항이 없어요.'),
        ),
        el('section', { class: 'pl-card pl-card-soft' },
            el('h2', { class: 'pl-h2' }, '공유용 요약', el('span', { class: 'pl-h2-sub' }, '카드나 로어북에 붙여 넣는 글. 자동으로 넣지는 않아요.')),
            el('pre', { class: 'pl-share' }, shareText(sessions)),
            el('div', { class: 'pl-actions' }, el('button', { class: 'pl-btn', type: 'button', onclick: () => copyShare() }, '복사')),
        ),
        el('section', { class: 'pl-card pl-card-soft' }, el('h2', { class: 'pl-h2' }, '출처'), ...groups.flatMap(g => g.tests).map(({ test }) => el('pre', { class: 'pl-share' }, sourceCredit(test)))),
    );
}

// ───────────────────────── NPC 뽑기 (0.5.0) ─────────────────────────
// 간소화판: 설정(정답) + 로그 → 모델 호출 1번 → 다섯 검사 라벨 세 줄. 로어북에 자동으로 넣지 않는다 — 복사만.
async function inputPopup(header, help, value = '') {
    const c = ctx();
    const content = `<h3>${esc(header)}</h3><div class="pl-popup-body"><span class="pl-help">${esc(help)}</span></div>`;
    const out = await c.callGenericPopup(content, c.POPUP_TYPE.INPUT, value, { okButton: '확인', cancelButton: '취소', rows: 2 });
    return typeof out === 'string' ? out.trim() : null;   // 취소면 null
}
const fmtDate = iso => { try { return new Date(iso).toLocaleString(); } catch { return ''; } };

function renderNpc(t) {
    const d = loadDraft();
    const keep = () => saveDraft(d);
    const field = (label, control, help) => el('label', { class: 'pl-field' }, el('span', { class: 'pl-label' }, label), control, help ? el('span', { class: 'pl-help' }, help) : null);
    const log = chatLog(d.logChars);
    const estimateEl = el('span', { class: 'pl-help', id: 'pl_npc_estimate' });
    const refreshEstimate = () => {
        try {
            const arch = ARCHETYPES.find(a => a.id === d.archetype);
            const m = buildNpcMessages({ name: d.name || '이름', notes: d.notes, log, archetype: arch ? arch.name : (d.archetype === '__text' ? d.archetypeText : ''), strength: d.strength });
            estimateEl.textContent = `모델 호출 1번 · 약 ${estimateTokens(m).toLocaleString()}토큰(어림, 캐시 미적용). 라벨은 선택지에서만 고르게 하고 틀린 응답은 걸러요.`;
        } catch { estimateEl.textContent = ''; }
    };
    // 전형
    const archSel = el('select', { class: 'pl-select', id: 'pl_npc_arch', onchange: e => { d.archetype = e.target.value; keep(); render(); } },
        el('option', { value: '', selected: !d.archetype ? '' : null }, '없음'),
        ...ARCHETYPES.map(a => el('option', { value: a.id, selected: d.archetype === a.id ? '' : null }, a.name)),
        el('option', { value: '__text', selected: d.archetype === '__text' ? '' : null }, '직접 적기…'));
    const seg = el('div', { class: 'pl-seg', role: 'group' }, ...Object.entries(STRENGTH).map(([k, v]) => el('button', { type: 'button', class: `pl-seg-btn${d.strength === k ? ' pl-seg-on' : ''}`, onclick: () => { d.strength = k; keep(); render(); } }, v.name)));
    const archText = d.archetype === '__text' ? el('input', { class: 'pl-input', id: 'pl_npc_arch_text', placeholder: '예: 몰락한 귀족, 체면에 집착', value: d.archetypeText, oninput: e => { d.archetypeText = e.target.value; keep(); } }) : null;
    // 겹치지 않게: 붙여 넣기 칸들
    const existingBox = () => {
        if (!d.differ) return null;
        if (!d.existing.length) d.existing = [''];
        const rows = d.existing.map((txt, i) => {
            const parsed = parseCode(txt);
            const status = el('span', { class: 'pl-help pl-existing-status' }, !txt.trim() ? '전에 뽑은 세 줄을 붙여 넣으세요.' : parsed ? `읽음: ${parsed.name} · 라벨 ${parsed.count}개` : '라벨(↑↓)을 못 읽었어요 — 이 도구가 만든 세 줄 틀이어야 해요.');
            return el('div', { class: 'pl-existing' },
                el('textarea', { class: 'pl-textarea pl-textarea-sm', rows: 3, placeholder: '[이름] …\n가치관: … (MFQ-2) · … (Schwartz)\n성격: … (Big Five) · … (HEXACO) · … (VIA)', oninput: e => { d.existing[i] = e.target.value; keep(); const p = parseCode(e.target.value); status.textContent = !e.target.value.trim() ? '전에 뽑은 세 줄을 붙여 넣으세요.' : p ? `읽음: ${p.name} · 라벨 ${p.count}개` : '라벨(↑↓)을 못 읽었어요 — 이 도구가 만든 세 줄 틀이어야 해요.'; } }, txt),
                el('div', { class: 'pl-existing-foot' }, status, el('button', { class: 'pl-link', type: 'button', onclick: () => { d.existing.splice(i, 1); keep(); render(); } }, '× 지우기')));
        });
        const saved = listNpcs();
        return el('div', { class: 'pl-existing-list' },
            ...rows,
            el('div', { class: 'pl-actions' },
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', id: 'pl_npc_add_existing', onclick: () => { d.existing.push(''); keep(); render(); } }, '＋ 칸 추가'),
                saved.length ? el('select', { class: 'pl-select pl-select-sm', onchange: e => { const r = getNpcRecord(e.target.value); if (!r) return; const empty = d.existing.findIndex(x => !x.trim()); const txt = npcText(r); if (empty >= 0) d.existing[empty] = txt; else d.existing.push(txt); keep(); render(); } },
                    el('option', { value: '' }, '뽑은 NPC에서 가져오기…'), ...saved.map(r => el('option', { value: r.id }, r.name))) : null),
            el('span', { class: 'pl-help' }, '붙여 넣은 인물들과 겹치지 않게, 자료에 안 드러난 칸을 그들과 다른 쪽으로 채워요(최대 4칸). 모델에게는 안 보내고 확장이 비교해요.'));
    };
    const existingNode = existingBox();
    const run = async () => {
        if (ui.busy) return;
        if (!d.name.trim()) return toast('이름을 적어 주세요.', 'warning');
        if (!d.notes.trim() && !log.text) return toast('설정이나 로그가 있어야 해요. 로그가 비어 있으면 설정을 적어 주세요.', 'warning');
        ui.busy = true; render();
        try {
            const rec = await generateNpc({ ...d, archetype: d.archetype === '__text' ? '' : d.archetype, archetypeText: d.archetype === '__text' ? d.archetypeText : '' });
            toast(`${rec.name} 뽑았어요.`, 'success');
            ui.busy = false; go('npcResult', { npcId: rec.id });
        } catch (err) {
            ui.busy = false; ui.npcError = { message: err.message || String(err), raw: err.raw || null }; render();
        }
    };
    const err = ui.npcError; ui.npcError = null;
    mount(
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, 'NPC 뽑기', el('span', { class: 'pl-h2-sub' }, '내 설정 + 지금 열린 로그 → 유형 라벨 세 줄 · 모델 호출 1번')),
            field('이름', el('input', { class: 'pl-input', id: 'pl_npc_name', value: d.name, placeholder: '로그에 나오는 그 이름 그대로', oninput: e => { d.name = e.target.value; keep(); } })),
            field('이미 만든 설정 (정답으로 씀 · 비워도 됨)', el('textarea', { class: 'pl-textarea', id: 'pl_npc_notes', rows: 4, placeholder: '로어북이나 메모에 이미 적어 둔 설정을 붙여 넣으세요. 예: 상인 길드장, 40대. 계산적이고 손해를 안 본다.', oninput: e => { d.notes = e.target.value; keep(); refreshEstimate(); } }, d.notes),
                '여기 적힌 건 로그보다 우선해요. 로그와 어긋나면 이쪽을 따라요.'),
            field('전형 (선택)', el('div', { class: 'pl-inline' }, archSel, d.archetype ? seg : null), archText ? null : '자료에 안 드러난 칸만 이 역할의 전형 쪽으로 기울여요. 약간 = 센 것 3칸, 뚜렷 = 전형 전부.'),
            archText ? el('div', { class: 'pl-field' }, archText, el('span', { class: 'pl-help' }, '직접 적은 전형은 표가 없어서 모델이 알아서 기울여요(약간 = 3칸까지).')) : null,
            el('label', { class: 'pl-check' }, el('input', { type: 'checkbox', id: 'pl_npc_differ', checked: d.differ ? '' : null, onchange: e => { d.differ = e.target.checked; keep(); render(); } }), el('span', {}, '다른 인물과 겹치지 않게')),
            existingNode,
            field('로그', el('div', { class: 'pl-inline' },
                el('span', { class: 'pl-help pl-grow' }, log.total ? `${t.name} · 메시지 ${log.total}개 중 최근 ${log.messages}개, 약 ${log.chars.toLocaleString()}자` : '이 채팅은 아직 비어 있어요 — 설정만으로 뽑아요.'),
                el('input', { class: 'pl-input pl-input-sm', type: 'number', min: 2000, max: 200000, step: 1000, value: d.logChars, title: '최근 몇 자까지 읽을지', onchange: e => { d.logChars = Math.max(2000, Math.min(200000, Number(e.target.value) || 30000)); keep(); render(); } })),
                '최근 글자 수. 길수록 비용이 늘어요. 숨긴 메시지는 안 읽어요.'),
            err ? el('div', { class: 'pl-error' }, err.message, err.raw ? el('details', { class: 'pl-raw' }, el('summary', {}, '마지막 모델 응답 원문 보기'), el('pre', {}, err.raw)) : null) : null,
            el('div', { class: 'pl-actions' },
                el('button', { class: 'pl-btn', type: 'button', id: 'pl_npc_run', disabled: ui.busy ? '' : null, onclick: run }, ui.busy ? '뽑는 중…' : '뽑기'),
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => go('home') }, '홈으로')),
            estimateEl,
        ),
        npcListCard(),
    );
    refreshEstimate();
}

function npcListCard() {
    const list = listNpcs();
    return el('section', { class: 'pl-card pl-card-soft' },
        el('h2', { class: 'pl-h2' }, '뽑은 NPC', el('span', { class: 'pl-h2-sub' }, '이 채팅방에 저장된 것만 보여요. 복사해서 로어북 항목에 붙여요 — 자동으로 넣지 않아요.')),
        list.length ? list.map(r => {
            const st = npcStructure(r);
            const brief = [...st.values, ...st.personality].flatMap(g => g.tokens).map(x => `${x.name}${x.level === 'high' ? '↑' : '↓'}`).join(' ') || '뚜렷한 쪽 없음';
            return el('div', { class: 'pl-npc' },
                el('div', { class: 'pl-npc-main' }, el('div', { class: 'pl-npc-name' }, r.name, el('span', { class: 'pl-help' }, ` ${fmtDate(r.createdAt)}`)), el('div', { class: 'pl-npc-code' }, brief)),
                el('div', { class: 'pl-actions' },
                    el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => go('npcResult', { npcId: r.id }) }, '보기'),
                    el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => copyText(npcText(r), `${r.name} 세 줄`) }, '복사')));
        }) : el('p', { class: 'pl-help' }, '아직 없어요.'));
}

function renderNpcResult(t) {
    const r = getNpcRecord(ui.npcId);
    if (!r) return go('npc');
    const st = npcStructure(r);
    const arrow = lv => lv === 'high' ? '↑' : '↓';
    const tokenNode = tk => el('span', { class: `pl-tok pl-tok-${r.source?.[tk.id] || 'material'}`, title: KEY_BY_ID[tk.id]?.desc || '' }, `${tk.name}${arrow(tk.level)}`);
    const axisNodes = groups => groups.length ? groups.flatMap((g, i) => [
        i ? ' · ' : '',
        ...g.tokens.flatMap((tk, j) => [j ? ' ' : '', tokenNode(tk)]),
        g.extra ? `${g.tokens.length ? ' · ' : ''}${g.extra}` : '',
        ` (${g.tag})`]) : ['뚜렷한 쪽 없음'];
    const counts = { material: 0, archetype: 0, diff: 0 };
    for (const v of Object.values(r.source || {})) if (counts[v] !== undefined) counts[v]++;
    const archName = ARCHETYPES.find(a => a.id === r.archetype)?.name || r.archetypeText || '';
    const meta = [fmtDate(r.createdAt), `호출 ${r.calls}번`, archName ? `전형 ${archName}(${STRENGTH[r.strength]?.name || '약간'})` : '전형 없음', r.differ ? `겹치지 않게 켬(${r.existingNames.length}명)` : '겹치지 않게 끔', `로그 ${r.log?.messages ?? 0}개 메시지`, r.edited ? '첫 줄 고침' : ''].filter(Boolean).join(' · ');
    const overlapText = r.differ && r.overlap?.length ? '겹침: ' + r.overlap.map(o => `${o.name}와 ${o.count}칸`).join(' · ') + '. 많이 겹치면 "다르게 다시"로 다른 칸을 잡아요.' : '';
    const again = async () => {
        if (ui.busy) return;
        ui.busy = true; render();
        try {
            const overl = (r.overlap || []).flatMap(o => o.keys || []).map(id => KEY_BY_ID[id]?.name).filter(Boolean);
            const rec = await generateNpc({ name: r.name, notes: r.input?.notes || '', archetype: r.archetype, archetypeText: r.archetypeText, strength: r.strength, differ: r.differ, existing: r.input?.existing || [], logChars: r.input?.logChars || 30000, variant: (r.variant || 0) + 1,
                hint: overl.length ? `이전 결과는 기존 인물과 ${[...new Set(overl)].join('·')}에서 겹쳤다. 자료에 근거가 있으면 그대로 두고, 근거가 약한 항목은 unknown으로 둔다.` : '이전과 다른 읽기를 시도한다. 근거가 약한 항목은 unknown으로 둔다.' });
            toast(`${rec.name} 다시 뽑았어요.`, 'success');
            ui.busy = false; go('npcResult', { npcId: rec.id });
        } catch (err) { ui.busy = false; toast('다시 뽑기 실패: ' + (err.message || err), 'error'); render(); }
    };
    const editFirst = async () => {
        const role = await inputPopup('첫 줄 고치기 — 자리·관계', '이 인물이 누구인지 한 문장. 비우면 그대로 둬요.', r.role);
        if (role === null) return;
        const speech = await inputPopup('첫 줄 고치기 — 말투', '말투 특징을 짧게. 비우면 말투 부분을 뺀 채로 둬요.', r.speech);
        if (speech === null) return;
        editNpcRecord(r.id, { role: role || r.role, speech }); render();
    };
    const remove = async () => {
        const ok = await confirmPopup('기록 지우기', `${esc(r.name)}의 뽑은 결과를 지울까요? 로어북에 붙여 넣은 글은 그대로 남아요.`, '지우기', '취소');
        if (!ok) return;
        deleteNpcRecord(r.id); go('npc');
    };
    mount(
        el('section', { class: 'pl-card' },
            el('h2', { class: 'pl-h2' }, `${r.name} · 뽑은 결과`, el('span', { class: 'pl-h2-sub' }, meta)),
            el('div', { class: 'pl-share pl-prose', id: 'pl_npc_lines' },
                el('div', {}, st.line1),
                el('div', {}, '가치관: ', ...axisNodes(st.values)),
                el('div', {}, '성격: ', ...axisNodes(st.personality))),
            el('div', { class: 'pl-src' },
                el('span', { class: 'pl-src-material' }, `설정·로그에서 ${counts.material}칸`),
                counts.archetype ? el('span', { class: 'pl-src-archetype' }, `전형 ${counts.archetype}칸 — 노란 밑줄`) : null,
                counts.diff ? el('span', { class: 'pl-src-diff' }, `겹치지 않게 ${counts.diff}칸 — 초록 밑줄`) : null,
                el('span', {}, '나머지는 중간(생략)')),
            overlapText ? el('span', { class: 'pl-help' }, overlapText) : null,
            el('div', { class: 'pl-actions' },
                el('button', { class: 'pl-btn', type: 'button', id: 'pl_npc_copy', onclick: () => copyText(npcText(r), `${r.name} 세 줄`) }, '복사'),
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', id: 'pl_npc_again', disabled: ui.busy ? '' : null, onclick: again }, ui.busy ? '뽑는 중…' : '다르게 다시'),
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: editFirst }, '첫 줄 고치기'),
                el('button', { class: 'pl-btn pl-btn-danger', type: 'button', onclick: remove }, '지우기'),
                el('button', { class: 'pl-btn pl-btn-ghost', type: 'button', onclick: () => go('npc') }, '새로 뽑기')),
            el('span', { class: 'pl-help' }, `세 줄 합쳐 약 ${Math.ceil(npcText(r).length / 2).toLocaleString()}토큰(어림). 로어북 항목의 키워드는 이름(${r.name})으로 두면 돼요. 복사하면 밑줄 없이 글만 가요.`),
        ),
        npcListCard(),
    );
}

function groupsOf(test) {
    if (test.axes) return test.axes.map(axis => ({ title: `${axis.firstName}(${axis.first}) ↔ ${axis.secondName}(${axis.second})`, items: test.items.filter(i => i.axis === axis.id) }));
    if (test.categories) return test.categories.map(cat => ({ title: `${cat.name} — ${cat.desc}`, items: test.items.filter(i => i.category === cat.id) }));
    if (test.facets) return test.facets.map(f => { const d = test.domains.find(x => x.id === f.domain); return { title: `${d ? d.name + ' · ' : ''}${f.name}(${f.en})`, items: test.items.filter(i => i.facet === f.id) }; });
    return [{ title: test.short, items: test.items }];
}

// ───────────────────────── 막대 행 (0.3.1) ─────────────────────────
// 한 줄 = 이름 | 가운데서 뻗는 막대 | 판정. 높으면 오른쪽(파랑), 낮으면 왼쪽(주황), 보통이면 회색. 판정 글자는 오른쪽 칸에 고정.
function rowView({ name, en, ratio, level, levelText, strength, sub = null, small = false }) {
    const r = Math.max(-1, Math.min(1, ratio || 0));
    const width = Math.abs(r) * 50;
    const fill = el('div', { class: `pl-bar-fill pl-bar-${level}`, style: r >= 0 ? `left:50%;width:${width}%` : `left:${50 - width}%;width:${width}%` });
    return el('div', { class: `pl-row pl-row-${level}${small ? ' pl-row-small' : ''}${strength === 'clear' ? ' pl-row-clear' : ''}` },
        el('span', { class: 'pl-row-name' }, name, en ? el('small', {}, ' ' + en) : null),
        el('div', { class: 'pl-bar' }, el('div', { class: 'pl-bar-mid' }), fill),
        el('span', { class: 'pl-row-level' }, levelText),
        sub ? el('div', { class: 'pl-row-sub' }, sub) : null,
    );
}
const levelWord = (x, labels) => x.level === 'none' ? labels.none : `${labels[x.level]}${x.level !== 'mid' && x.strength === 'clear' ? ' ●' : ''}`;
const chips = list => list.length ? el('span', { class: 'pl-chips' }, ...list.map(f => el('span', { class: `pl-chip-f pl-chip-${f.level}` }, `${f.name}${f.level === 'high' ? '↑' : '↓'}`))) : null;

/** 가치 프로필(도덕 기반): 기반 6줄, 높은 순. compact면 설명 줄 생략. */
function profileView(score, { compact = false } = {}) {
    return el('div', { class: 'pl-rows' },
        el('div', { class: 'pl-rows-head' }, el('span'), el('div', { class: 'pl-rows-head-mid' }, el('span', {}, '◀ 넘김'), el('span', {}, '중시 ▶')), el('span')),
        ...score.ranked.map(c => rowView({ name: c.name, en: c.en, ratio: c.ratio, level: c.level, strength: c.strength, levelText: levelWord(c, LEVEL_LABEL), sub: compact ? null : c.desc })),
        score.ranked.length < score.categories.length ? el('div', { class: 'pl-help' }, '아직 답하지 않은 항목은 표시하지 않아요.') : null,
        score.higher?.length ? el('div', { class: 'pl-higher' }, el('div', { class: 'pl-help' }, '큰 방향(소속 가치의 평균):'),
            ...score.higher.map(h => rowView({ name: h.name, en: h.en, ratio: h.ratio, level: h.level, strength: 'none', levelText: h.level === 'none' ? '미응답' : LEVEL_LABEL[h.level], small: true }))) : null,
        el('div', { class: 'pl-help pl-legend' }, score.centerMean ? `● = 뚜렷. 이 검사는 캐릭터의 전체 평균(${score.mrat ?? '-'})을 기준으로 어느 가치가 상대적으로 위·아래인지 봐요(원저자 채점 방식). 막대는 오른쪽이 중시, 왼쪽이 넘김.` : '● = 뚜렷. 막대는 가운데(보통)에서 오른쪽(중시)·왼쪽(넘김)으로 뻗어요.'),
    );
}

/** 세부 척도형(빅파이브·보강 검사). compact면 영역 줄 + 두드러진 세부 칩만, 아니면 세부 막대 전부. */
function facetsView(score, { compact = false } = {}) {
    const singles = score.domains.every(d => d.facets.length === 1);
    return el('div', { class: 'pl-rows' },
        el('div', { class: 'pl-rows-head' }, el('span'), el('div', { class: 'pl-rows-head-mid' }, el('span', {}, '◀ 낮음'), el('span', {}, '높음 ▶')), el('span')),
        ...score.domains.map(d => {
            const notable = [...d.notableHigh, ...d.notableLow].sort((a, b) => Math.abs(b.ratio) - Math.abs(a.ratio));
            const domainRow = rowView({ name: d.name, en: d.en, ratio: d.ratio, level: d.level, strength: d.strength, levelText: levelWord(d, DOMAIN_LEVEL_LABEL),
                sub: el('span', {}, d.level === 'none' ? '' : d.gloss[d.level], (compact && !singles) ? chips(notable) : null) });
            if (singles || compact) return domainRow;
            return el('div', { class: 'pl-domain' }, domainRow,
                el('div', { class: 'pl-facets' }, ...d.facets.map(f => rowView({ name: f.name, en: f.en, ratio: f.ratio, level: f.level, strength: f.strength, levelText: levelWord(f, DOMAIN_LEVEL_LABEL), small: true }))));
        }),
        el('div', { class: 'pl-help pl-legend' }, compact && !singles ? '● = 뚜렷. 칩은 두드러진 세부(↑ 높음, ↓ 낮음). 세부 막대 전부는 "문항별 답 보기"에서.' : '● = 뚜렷. 막대는 가운데(보통)에서 오른쪽(높음)·왼쪽(낮음)으로 뻗어요.'),
    );
}
function pairLine(test, item, sess) {
    if (test.format === 'likert') return el('div', { class: 'pl-statement' }, itemText(test, item, sess));
    return el('div', { class: 'pl-pair' }, el('span', {}, item.left), el('span', { class: 'pl-vs' }, '↔'), el('span', {}, item.right));
}

function answerLine(test, a, editable, sess) {
    const item = test.items.find(i => i.id === a.itemId);
    const current = a.edited ? a.edited.score : a.score;
    const cells = [];
    for (let v = test.scale.min; v <= test.scale.max; v++) {
        const isChar = v === a.score, isCur = v === current;
        cells.push(el('button', { type: 'button', class: `pl-cell${isCur ? ' pl-cell-on' : ''}${isChar && a.edited ? ' pl-cell-char' : ''}`, title: isChar ? '캐릭터의 답' : '', disabled: editable ? null : '',
            onclick: editable ? () => proposeEdit(a, item, v) : null }, String(v)));
    }
    return el('div', { class: `pl-answer${a.edited ? ' pl-answer-edited' : ''}` },
        pairLine(test, item, sess),
        el('div', { class: 'pl-cells', style: `grid-template-columns: repeat(${test.scale.max - test.scale.min + 1}, 1fr)` }, ...cells),
        test.format === 'likert' ? el('div', { class: 'pl-cell-labels' }, el('span', {}, test.scale.leftLabel), el('span', {}, test.scale.rightLabel)) : null,
        el('div', { class: 'pl-reason' }, '“', a.reason, '”'),
        a.edited ? el('div', { class: 'pl-edited' }, `제작자 수정: 캐릭터 ${a.score} → 내 선택 ${a.edited.score}`, el('button', { class: 'pl-link', type: 'button', onclick: () => { revertAnswer(getSession(ui.avatar, ui.testId), a.itemId); render(); } }, '되돌리기')) : null,
    );
}

function scoreLabel(test, item, v) {
    if (test.format === 'likert') { const labels = test.scale.labels || ['전혀 아니다', '아니다', '보통이다', '그렇다', '매우 그렇다']; return `${v} (${labels[v - test.scale.min] || ''})`; }
    return v === 1 ? `1 (${item.left})` : v === 5 ? `5 (${item.right})` : v === 3 ? '3 (중간)' : v < 3 ? `${v} (왼쪽에 가까움)` : `${v} (오른쪽에 가까움)`;
}
async function proposeEdit(a, item, newScore) {
    const sess = getSession(ui.avatar, ui.testId);
    const test = TEST_BY_ID[ui.testId];
    const current = a.edited ? a.edited.score : a.score;
    if (newScore === current) return;
    const ok = await confirmPopup(newScore === a.score ? '캐릭터의 답으로 되돌리기' : '답 바꾸기',
        `<b>${esc(sess.name)}</b>는 <b>${esc(scoreLabel(test, item, a.score))}</b>을 골랐어요.<br><span class="pl-quote">“${esc(a.reason)}”</span><br><br>내 선택 <b>${esc(scoreLabel(test, item, newScore))}</b>으로 바꾸시겠어요?<br><span class="pl-help">바꿔도 캐릭터의 원래 답과 이유는 기록에 남고, 채점에만 내 선택이 쓰여요.</span>`,
        '예', '아니오');
    if (!ok) return;
    editAnswer(sess, a.itemId, newScore);
    render();
}

async function copyText(text, label) {
    try { await navigator.clipboard.writeText(text); toast(`${label}을 복사했어요.`, 'success'); }
    catch {
        const ta = el('textarea', { class: 'pl-copy-fallback' }, text); document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); toast(`${label}을 복사했어요.`, 'success'); } catch { toast('복사가 막혀 있어요. 글을 직접 선택해 복사하세요.', 'warning'); }
        ta.remove();
    }
}
const copyShare = () => copyText(shareText(sessionsFor(ui.avatar)), '공유용 요약');

// ───────────────────────── 메뉴 등록 (햄버거 ☰) ─────────────────────────
function makeMenuItem() {
    return el('a', { id: 'psych_lab_menu_btn', class: 'interactable', title: '캐릭터 심리검사', onclick: () => { openPanel(); try { $('#options').fadeOut(150); } catch { /* ignore */ } } },
        el('i', { class: 'fa-lg fa-solid fa-brain' }), el('span', {}, '심리검사'));
}
function injectMenu() {
    if (document.getElementById('psych_lab_menu_btn')) return true;
    const content = document.querySelector('#options .options-content');
    if (content) { content.insertBefore(makeMenuItem(), content.firstChild); return true; }
    const wand = document.getElementById('extensionsMenu');
    if (wand) { wand.insertBefore(makeMenuItem(), wand.firstChild); return true; }
    return false;
}

(function boot() {
    try { settings(); } catch (err) { console.error('[psych_lab] 설정 초기화 실패', err); }
    if (!injectMenu()) {
        const obs = new MutationObserver(() => { if (injectMenu()) obs.disconnect(); });
        obs.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => obs.disconnect(), 15000);
    }
    try {
        const c = ctx();
        c.eventSource?.on?.(c.event_types?.CHAT_CHANGED, () => { if (ui.open) render(); });
    } catch { /* 선택 사항 */ }
    try {
        ctx().SlashCommandParser?.addCommandObject?.(ctx().SlashCommand.fromProps({ name: 'psych', callback: () => { openPanel(); return ''; }, helpString: '캐릭터 심리검사 패널을 엽니다.' }));
    } catch { /* 슬래시 커맨드는 선택 사항 */ }
    console.log(`[psych_lab] v${VERSION} 준비`);
})();
