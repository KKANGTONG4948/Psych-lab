// 결과 → 사람이 읽는 요약(종합 보고서)과 공유용(카드에 붙여 넣는) 요약.
//
// 공유 문구 원칙(사용자 확정):
//   가치관 = "〈장면 조건〉: 반응 (이론 · 영어 라벨)" — 조건이 있어야 판단 엔진이 장면과 맞을 때만 근거로 잡는다.
//   성격   = "행동 모양 한 줄 (이론 · 영어 라벨; 세부 최대 2개)" — 라벨은 괄호 안 보조.
//   강도는 적지 않는다 — 세기는 장면의 사건 크기가 정하는 것이지 검사가 재는 값이 아니다(0.3.0에서 제거).
//   환산 라벨(MBTI·A/T·에니어그램·대인 자세)은 0.5.0에서 뺐다. 갈리는 곳(중간·경계)은 축 안에 따로 모아 적는다.
//   라벨에는 이론 이름 + 영어 이름을 같이 적는다(모델 지식의 열쇠). 행동 문장이 본체라 이론을 모르는 모델도 읽는다.
import { TEST_BY_ID, AXIS_BY_ID } from './tests/registry.js';
import { scoreTest, STRENGTH_LABEL, LEVEL_LABEL, DOMAIN_LEVEL_LABEL } from './scoring.js';
import { effectiveAnswers } from './engine.js';

export function resultOf(session) {
    const test = TEST_BY_ID[session.testId];
    return { test, score: scoreTest(test, effectiveAnswers(session)), edited: session.answers.filter(a => a.edited).length };
}

const byMagnitude = (a, b) => Math.abs(b.ratio) - Math.abs(a.ratio);
/** 이름 뒤 조사 은/는. 한글이 아니면 '은(는)'. */
export function eunNeun(name) {
    const ch = String(name || '').trim().slice(-1); const code = ch.charCodeAt(0);
    if (code >= 0xAC00 && code <= 0xD7A3) return (code - 0xAC00) % 28 ? '은' : '는';
    return '은(는)';
}


/** 검사 하나의 한 줄 요약(홈 화면용). */
export function resultLine(session) {
    const { test, score } = resultOf(session);
    if (score.kind === 'profile') {
        const part = (list, label) => list.length ? `${label} ${list.map(c => c.name).join('·')}` : '';
        const hi = score.higher?.length ? ` · 방향: ${score.higher.map(h => h.name).join(' > ')}` : '';
        return `${test.short}: ${[part(score.high, '중시'), part(score.mid, '보통'), part(score.low, '넘김')].filter(Boolean).join(' / ') || '미판정'}${hi}`;
    }
    if (score.kind === 'facets') {
        const doms = score.domains.map(d => `${d.name} ${DOMAIN_LEVEL_LABEL[d.level]}`).join(' · ');
        return `${test.short}: ${doms}`;
    }
    return `${test.short}: (요약 없음)`;
}

/**
 * 검사 하나 → 공유 문구 조각. { react, skip, shape, splits }
 * react/skip = 가치관(반응하는 일 / 넘어가는 일), shape = 성격(반응 모양), splits = 갈리는 곳(중간·경계).
 */
export function shareLines(session) {
    const { test, score } = resultOf(session);
    const tag = test.tag || test.short;
    const out = { react: [], skip: [], shape: [], splits: [] };
    const arrows = list => list.map(f => `${f.name}${f.level === 'high' ? '↑' : '↓'}`).join(' ');
    if (score.kind === 'profile') {
        for (const c of score.high) out.react.push(`${c.high.cond}: ${c.high.react} (${tag} ${c.en} ${LEVEL_LABEL.high}${c.strength === 'clear' ? '·뚜렷' : ''})`);
        for (const c of score.low) out.skip.push(`${c.low.cond ? c.low.cond + ': ' : ''}${c.low.react} (${tag} ${c.en} 낮음)`);
        if (score.mid.length) out.splits.push(`${score.mid.map(m => Math.abs(m.ratio) >= 0.15 ? `${m.name}${m.ratio > 0 ? '↑' : '↓'}` : m.name).join(' ')} 는 중간 — 상황 따라 반응하거나 넘김 (${tag})`);
        if (score.higher?.length && score.higher.some(h => h.level !== 'none')) out.react.push(`가치 방향(센 순): ${score.higher.filter(h => h.level !== 'none').map(h => `${h.name}(${h.en})${h.level === 'high' ? '↑' : h.level === 'low' ? '↓' : ''}`).join(' > ')} (${tag} 4방향)`);
    } else if (score.kind === 'facets') {
        const singles = score.domains.filter(d => d.facets.length === 1);   // 강점처럼 영역 = 세부 하나
        const multis = score.domains.filter(d => d.facets.length > 1);
        const midMulti = [];
        for (const d of multis) {
            if (d.level === 'none') continue;
            const notable = [...d.notableHigh, ...d.notableLow].sort(byMagnitude).slice(0, 2);
            out.shape.push(`${d.gloss[d.level]} (${tag} ${d.en} ${DOMAIN_LEVEL_LABEL[d.level]}${d.level !== 'mid' && d.strength === 'clear' ? '·뚜렷' : ''}${notable.length ? ` · ${arrows(notable)}` : ''})`);
            if (d.level === 'mid') midMulti.push(`${d.name}${Math.abs(d.ratio) >= 0.15 ? (d.ratio > 0 ? '↑' : '↓') : ''}`);
        }
        if (midMulti.length) out.splits.push(`${midMulti.join('·')} 은 전체 중간${multis.some(d => d.level === 'mid' && (d.notableHigh.length || d.notableLow.length)) ? ', 세부만 갈림' : ''} (${tag})`);
        const midSingles = [];
        for (const d of singles) {
            if (d.level === 'none') continue;
            if (d.level === 'mid') { midSingles.push(d.name); continue; }
            out.shape.push(`${d.gloss[d.level]} (${tag} ${d.en} ${DOMAIN_LEVEL_LABEL[d.level]}${d.strength === 'clear' ? '·뚜렷' : ''})`);
        }
        if (midSingles.length) out.splits.push(`${midSingles.join('·')} 중간 (${tag})`);
    }
    return out;
}

const doneSessions = sessionsByTest => Object.values(sessionsByTest).filter(s => s && s.status === 'done' && TEST_BY_ID[s.testId]);

/** 모든 끝난 검사를 합친 조각. */
export function collectLines(sessionsByTest) {
    const all = { react: [], skip: [], shape: [], splits: [], splitsByAxis: { values: [], personality: [] } };
    for (const s of doneSessions(sessionsByTest)) {
        const p = shareLines(s);
        for (const k of ['react', 'skip', 'shape', 'splits']) all[k].push(...p[k]);
        const axis = TEST_BY_ID[s.testId].axis;
        if (all.splitsByAxis[axis]) all.splitsByAxis[axis].push(...p.splits);
    }
    return all;
}

/** 카드·로어북에 붙여 넣는 공유용 요약. 끝난 검사만 넣는다. */
export function shareText(sessionsByTest) {
    const { react, skip, shape, splitsByAxis } = collectLines(sessionsByTest);
    const bullets = (list, empty) => list.length ? list.map(l => `- ${l}`) : [`- ${empty}`];
    const lines = ['[캐릭터 심리검사 요약]'];
    lines.push('[가치관 — 반응하는 일]', ...bullets(react, '(가치관 검사 전)'));
    lines.push('[가치관 — 넘어가는 일]', ...bullets(skip, '(가치관 검사 전)'));
    if (splitsByAxis.values.length) lines.push('[가치관 — 갈리는 곳]', ...bullets(splitsByAxis.values));
    lines.push('[성격 — 반응 모양]', ...bullets(shape, '(성격 검사 전)'));
    if (splitsByAxis.personality.length) lines.push('[성격 — 갈리는 곳]', ...bullets(splitsByAxis.personality));
    lines.push('※ 오락용 검사 결과. 라벨은 참고 자료이며 행동을 고정하는 규칙이 아니다. 갈리는 곳은 상황에 따라 달라질 수 있다.');
    return lines.join('\n');
}

/**
 * 종합 보고서의 "한눈에": 숫자 없이 문장 3~6개. 뚜렷한 것만 문장으로 엮고 중간은 한 줄에 묶는다.
 * 검사가 하나도 없으면 빈 배열.
 */
export function overview(sessionsByTest, name = '이 캐릭터') {
    const done = doneSessions(sessionsByTest);
    if (!done.length) return [];
    const scores = Object.fromEntries(done.map(s => [s.testId, resultOf(s).score]));
    const sentence = x => x.replace(/[.。]?\s*$/, '') + '.';
    const joinNames = list => list.map(x => x.name).join('·');
    const out = [];   // 문단 하나씩(가치관 → 성격 → 강점), 문단 = 문장 배열. 화면에서는 문장마다 한 줄.

    // ── 가치관: 반응하는 장면 → 넘기는 장면 → 중간 ──
    const mfq = scores.mfq2;
    if (mfq) {
        const p = [];
        if (mfq.high.length) p.push(`${name}${eunNeun(name)} ${mfq.high.map(c => c.high.cond).join(', ')} — 이런 장면을 그냥 넘기지 않는다.`);
        mfq.low.forEach((c, i) => p.push(`${i === 0 ? (mfq.high.length ? '반대로 ' : `${name}${eunNeun(name)} `) : ''}${sentence(`${c.low.cond || '그런 장면'}에는 ${c.low.react}`)}`));
        if (mfq.mid.length) p.push(`${joinNames(mfq.mid)}${eunNeun(mfq.mid.at(-1).name)} 중간이라 상황에 따라 다르다.`);
        if (p.length) out.push(p);
    }

    // ── 가치관 2: Schwartz — 중시하는 가치 → 뒷전인 가치 → 4방향 ──
    const sch = scores.schwartz;
    if (sch) {
        const p = [];
        if (sch.high.length) p.push(`삶에서 중요하게 여기는 것은 ${sch.high.map(c => `${c.name}(${c.desc})`).join(', ')}.`);
        if (sch.low.length) p.push(`뒷전인 것은 ${sch.low.map(c => `${c.name}(${c.desc})`).join(', ')}.`);
        if (sch.high.length) p.push(`그래서 ${sch.high.map(c => c.high.cond).join(', ')}에는 움직인다.`);
        const hs = (sch.higher || []).filter(h => h.level !== 'none');
        if (hs.length) p.push(`큰 방향으로는 ${hs.map(h => h.name).join(' > ')} 순이다.`);
        if (p.length) out.push(p);
    }

    // ── 성격: 뚜렷한 영역 → 중간 영역(세부 높/낮) → 정직-겸손 ──
    const b5 = scores.bigfive, hh = scores.hh2;
    {
        const p = [];
        if (b5) {
            const strong = b5.domains.filter(d => d.level === 'high' || d.level === 'low').sort(byMagnitude);
            const mid = b5.domains.filter(d => d.level === 'mid');
            strong.forEach((d, i) => p.push(`${i === 0 ? '성격은 ' : ''}${sentence(d.gloss[d.level])}`));
            if (mid.length) {
                const notable = mid.flatMap(d => [...d.notableHigh, ...d.notableLow].sort(byMagnitude).slice(0, 2));
                const highs = notable.filter(f => f.level === 'high').map(f => f.name), lows = notable.filter(f => f.level === 'low').map(f => f.name);
                const tail = [highs.length ? `${highs.join('·')}${eunNeun(highs.at(-1))} 높고` : '', lows.length ? `${lows.join('·')}${eunNeun(lows.at(-1))} 낮다` : ''].filter(Boolean).join(' ');
                p.push(`${joinNames(mid)}${eunNeun(mid.at(-1).name)} 중간${tail ? `이지만, 세부로는 ${tail.replace(/높고$/, '높다')}.` : '.'}`);
            }
        }
        if (hh && (hh.domains[0].level === 'high' || hh.domains[0].level === 'low')) p.push(sentence(hh.domains[0].gloss[hh.domains[0].level]));
        if (p.length) out.push(p);
    }

    // ── 강점 ──
    const via = scores.via2;
    if (via) {
        const hi = via.domains.filter(d => d.level === 'high'), lo = via.domains.filter(d => d.level === 'low');
        const p = [];
        hi.forEach((d, i) => p.push(`${i === 0 ? `강점은 ${joinNames(hi)} — ` : ''}${sentence(d.gloss.high)}`));
        if (lo.length) { p.push(`${joinNames(lo)}${eunNeun(lo.at(-1).name)} 약한 편이다.`); lo.forEach(d => p.push(sentence(d.gloss.low))); }
        if (p.length) out.push(p);
    }
    return out;
}

/** 한눈에를 글로: 문장마다 줄, 문단 사이 빈 줄. */
export const overviewText = (sessionsByTest, name) => overview(sessionsByTest, name).map(p => p.join('\n')).join('\n\n');

/** 종합 보고서용: 축별로 끝난 검사 묶기. [{ axis, tests: [{ session, test, score, edited }] }] */
export function byAxis(sessionsByTest) {
    const done = doneSessions(sessionsByTest);
    return Object.values(AXIS_BY_ID).map(axis => ({ axis, tests: done.filter(s => TEST_BY_ID[s.testId].axis === axis.id).map(s => ({ session: s, ...resultOf(s) })) }));
}

export function sourceCredit(test) {
    const s = test.source;
    return `${s.title} — ${s.author} (${s.license}) ${s.url}\n${s.note}`;
}
