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
