// 검사 대상 자료 읽기 — 카드 5칸 + 로어북. 자료는 검사 시작 때 한 번 복사해 세션에 고정한다.
// 원칙: 카드·로어북이 1순위. 다른 캐릭터·RP 로그·이전 검사 결과는 넣지 않는다. 카드를 수정하지 않는다.

const ctx = () => SillyTavern.getContext();

/** 캐릭터 목록 (avatar가 고유 ID). shallow 상태여도 이름·아바타는 있다. */
export function listCharacters() {
    return ctx().characters.map((c, index) => ({ index, avatar: c.avatar, name: c.name }));
}

export function currentCharacterAvatar() {
    const c = ctx();
    if (c.groupId) return null;
    const ch = c.characters[c.characterId];
    return ch?.avatar ?? null;
}

/** 카드 원본 5칸을 읽어 복사본을 만든다. v0.1.3 loadCard와 같은 기준. */
export async function loadCardProfile(avatar) {
    const c = ctx();
    const index = c.characters.findIndex(ch => ch.avatar === avatar);
    if (index < 0) throw new Error('선택한 카드를 찾을 수 없습니다. 캐릭터 목록을 다시 확인하세요.');
    await c.unshallowCharacter(String(index));
    const card = c.characters[index];
    if (!card || card.avatar !== avatar) throw new Error('카드를 읽는 동안 목록이 바뀌었습니다. 다시 시도하세요.');
    const data = card.data || {};
    const text = field => typeof data[field] === 'string' ? data[field] : typeof card[field] === 'string' ? card[field] : '';
    const profile = {
        name: typeof card.name === 'string' && card.name ? card.name : text('name'),
        description: text('description'),
        personality: text('personality'),
        scenario: text('scenario'),
        dialogue_examples: text('mes_example'),
    };
    if (!profile.name.trim() || !(profile.description.trim() || profile.personality.trim())) {
        throw new Error('카드의 이름·성격 자료를 충분히 읽지 못했습니다. 설명(Description)이나 성격(Personality)이 비어 있지 않은지 확인하세요.');
    }
    return { profile, index, card };
}

async function worldInfoModule() {
    try { return await import('../../../world-info.js'); } catch { return null; }
}

/**
 * 캐릭터에 연결된 로어북 이름들 (기본 + 추가 + 카드 내장). 봇 테스터(2bottester2)의 탐색 방식을 참고했다.
 * 채팅 전용·전역·페르소나 로어북은 넣지 않는다 — 검사는 이 캐릭터의 카드만 근거로 한다.
 */
export async function linkedBooks(card) {
    const wi = await worldInfoModule();
    const c = ctx();
    const names = [];
    const push = n => { if (n && typeof n === 'string' && !names.includes(n)) names.push(n); };
    push(card?.data?.extensions?.world);
    const file = String(card?.avatar || '').replace(/\.[^.]+$/, '');
    const charLore = wi?.world_info?.charLore || c.worldInfo?.charLore || [];
    for (const n of (charLore.find(x => x?.name === file)?.extraBooks || [])) push(n);
    const books = names.map(name => ({ name, kind: 'linked' }));
    if (card?.data?.character_book?.entries?.length) books.push({ name: card.data.character_book.name || '카드 내장 로어북', kind: 'embedded' });
    return books;
}

/**
 * 로어북 항목 텍스트. mode: 'none' | 'constant'(상시 항목만, 기본) | 'all'(켜진 항목 전부).
 * 끈 항목·빈 항목 제외. 상시 항목을 앞에. maxChars로 자른다.
 */
export async function loadLorebookText(card, mode = 'constant', maxChars = 6000) {
    if (mode === 'none') return { text: '', books: [], entries: 0, truncated: false };
    const c = ctx();
    const books = await linkedBooks(card);
    const items = [];
    for (const b of books) {
        try {
            const list = b.kind === 'embedded'
                ? (card.data.character_book.entries || []).map(e => ({ ...e, key: e.keys, disable: e.enabled === false }))
                : Object.values((await c.loadWorldInfo(b.name))?.entries || {});
            for (const e of list) {
                if (e.disable || !String(e.content || '').trim()) continue;
                if (mode === 'constant' && !e.constant) continue;
                const label = e.comment || (e.key || []).slice(0, 3).join(', ') || `#${e.uid}`;
                items.push({ constant: !!e.constant, text: `[${label}${e.constant ? ' · 상시' : ''}] ${String(e.content).trim()}` });
            }
        } catch (err) { console.warn('[psych_lab] 로어북 읽기 실패', b.name, err); }
    }
    items.sort((a, b) => Number(b.constant) - Number(a.constant));
    const full = items.map(x => x.text).join('\n');
    const truncated = full.length > maxChars;
    return { text: truncated ? full.slice(0, maxChars) + '\n…(이하 생략)' : full, books: books.map(b => b.name), entries: items.length, truncated };
}

// ───────────────────────── 카드 안의 인물 (0.6.0) ─────────────────────────
// 다인봇: 카드 한 장에 세계관만 있고 인물은 로어북 항목 하나씩인 구조. 항목 하나를 "검사 대상"으로 고른다.
// 자료 = 그 항목의 내용(한 명) + 카드 설명(세계관, 설정으로 끌 수 있음). 다른 항목은 넣지 않는다 — "단 한 명만 근거" 원칙.
export const WORLD_MAX_CHARS = 6000;
const entryLabel = e => String(e.comment || (Array.isArray(e.key) ? e.key[0] : Array.isArray(e.keys) ? e.keys[0] : '') || `#${e.uid ?? ''}`).trim();

/**
 * 카드에 연결된 모든 로어북 항목 목록(켜진 것, 내용 있는 것). [{ key, label, book, kind, constant, chars }]
 * key: 'embedded:<번호>' 또는 'book:<uid>@<책 이름>'. 세션 저장 키에 쓰인다.
 */
export async function listEntries(avatar) {
    const c = ctx();
    const index = c.characters.findIndex(ch => ch.avatar === avatar);
    if (index < 0) return [];
    try { await c.unshallowCharacter(String(index)); } catch { /* 이미 읽혔을 수 있음 */ }
    const card = c.characters[index];
    const out = [];
    const embedded = card?.data?.character_book?.entries || [];
    embedded.forEach((e, i) => {
        if (e.enabled === false || !String(e.content || '').trim()) return;
        out.push({ key: `embedded:${i}`, label: entryLabel(e), book: card.data.character_book.name || '카드 내장 로어북', kind: 'embedded', constant: !!e.constant, chars: String(e.content).trim().length });
    });
    for (const b of (await linkedBooks(card)).filter(x => x.kind === 'linked')) {
        try {
            for (const e of Object.values((await c.loadWorldInfo(b.name))?.entries || {})) {
                if (e.disable || !String(e.content || '').trim()) continue;
                out.push({ key: `book:${e.uid}@${b.name}`, label: entryLabel(e), book: b.name, kind: 'linked', constant: !!e.constant, chars: String(e.content).trim().length });
            }
        } catch (err) { console.warn('[psych_lab] 로어북 읽기 실패', b.name, err); }
    }
    return out;
}

/** 고른 항목 하나를 "캐릭터 자료"로. profile.description = 항목 내용. world = 카드 설명(세계관). */
export async function loadEntryProfile(avatar, entryKey, { includeWorld = true } = {}) {
    const c = ctx();
    const index = c.characters.findIndex(ch => ch.avatar === avatar);
    if (index < 0) throw new Error('선택한 카드를 찾을 수 없습니다.');
    try { await c.unshallowCharacter(String(index)); } catch { /* ignore */ }
    const card = c.characters[index];
    let entry = null, book = '';
    if (entryKey.startsWith('embedded:')) {
        const i = Number(entryKey.slice('embedded:'.length));
        entry = card?.data?.character_book?.entries?.[i] ?? null; book = card?.data?.character_book?.name || '카드 내장 로어북';
    } else if (entryKey.startsWith('book:')) {
        const rest = entryKey.slice('book:'.length); const at = rest.indexOf('@');
        const uid = rest.slice(0, at); book = rest.slice(at + 1);
        const wi = await c.loadWorldInfo(book);
        entry = Object.values(wi?.entries || {}).find(e => String(e.uid) === uid) ?? null;
    }
    if (!entry || entry.enabled === false || entry.disable || !String(entry.content || '').trim()) throw new Error('고른 인물 항목을 찾을 수 없습니다(꺼졌거나 비었을 수 있어요). 로어북이 바뀌었으면 인물을 다시 골라 주세요.');
    const label = entryLabel(entry);
    const profile = { name: label, description: String(entry.content).trim(), personality: '', scenario: '', dialogue_examples: '' };
    const data = card.data || {};
    const desc = typeof data.description === 'string' ? data.description : typeof card.description === 'string' ? card.description : '';
    const world = includeWorld && desc.trim() ? (desc.length > WORLD_MAX_CHARS ? desc.slice(0, WORLD_MAX_CHARS) + '\n…(이하 생략)' : desc) : null;
    return { profile, world, entry: { key: entryKey, label, book, chars: profile.description.length }, cardName: card.name };
}
