// 채점. 모델은 점수표를 보지 않는다 — 여기서만 계산한다.

export const STRENGTH_LABEL = Object.freeze({ clear: '뚜렷함', moderate: '보통', borderline: '경계', tie: '동점 · 미판정', none: '미응답' });

/** |sum| / max 비율 → 뚜렷함 단계. 0.6 이상 뚜렷, 0.3 이상 보통, 그 미만 경계. */
function strengthOf(sum, max) {
    if (!max) return 'none';
    if (sum === 0) return 'tie';
    const r = Math.abs(sum) / max;
    return r >= 0.6 ? 'clear' : r >= 0.3 ? 'moderate' : 'borderline';
}
const valid = (test, a) => a && Number.isInteger(a.score) && a.score >= test.scale.min && a.score <= test.scale.max;
// 척도 가운데와 반폭. 1~5면 가운데 3·반폭 2, 1~6이면 가운데 3.5·반폭 2.5.
const midOf = test => (test.scale.min + test.scale.max) / 2;
const halfOf = test => (test.scale.max - test.scale.min) / 2;
const centered = (test, item, score) => item.keyed === '-' ? -(score - midOf(test)) : (score - midOf(test));

export const LEVEL_LABEL = Object.freeze({ high: '중시', mid: '보통', low: '넘김', none: '미응답' });

/**
 * 가치 프로필(1층용 리커트): 범주마다 합(문항값-3)을 내고, 비율로 중시(≥0.3) / 보통 / 넘김(≤-0.3)을 나눈다.
 * 상위 N개만 보지 않고 모든 범주의 구간을 돌려준다 — "반응하는 일"과 "넘어가는 일"이 둘 다 필요해서.
 * mean은 원 척도(1~5) 평균. 구간 기준은 이 도구의 자체 기준이다.
 */
export function scoreProfile(test, answers) {
    const byItem = new Map(answers.map(a => [a.itemId, a]));
    const half = halfOf(test), mid = midOf(test);
    // scoring.center === 'mean'(Schwartz): 범주 점수 = 문항 평균 − 개인 전체 평균(MRAT). 범주 간 상대 우선순위를 본다(원저자 채점 안내).
    //   구간은 중심화 점수 ±cut(기본 0.6점). 그 밖(MFQ-2 등): 범주마다 합(문항값−가운데)의 비율 ±0.3.
    const centerMean = test.scoring?.center === 'mean';
    const cut = test.scoring?.cut ?? 0.6;
    let mrat = null;
    if (centerMean) {
        const all = test.items.map(i => byItem.get(i.id)).filter(a => valid(test, a));
        mrat = all.length ? all.reduce((s, a) => s + a.score, 0) / all.length : null;
    }
    const categories = test.categories.map(cat => {
        const items = test.items.filter(i => i.category === cat.id);
        let sum = 0, answered = 0, raw = 0;
        for (const item of items) {
            const a = byItem.get(item.id);
            if (!valid(test, a)) continue;
            sum += centered(test, item, a.score); raw += a.score; answered += 1;
        }
        const max = answered * half;
        const mean = answered ? raw / answered : null;
        const rel = centerMean && answered && mrat !== null ? +(mean - mrat).toFixed(2) : null;   // 개인 평균 대비
        const ratio = centerMean ? (rel === null ? 0 : Math.max(-1, Math.min(1, rel / half))) : (max ? sum / max : 0);
        const level = !answered ? 'none' : centerMean ? (rel >= cut ? 'high' : rel <= -cut ? 'low' : 'mid') : (ratio >= 0.3 ? 'high' : ratio <= -0.3 ? 'low' : 'mid');
        const strength = !answered ? 'none' : centerMean ? (Math.abs(rel) >= cut * 2 ? 'clear' : Math.abs(rel) >= cut ? 'moderate' : Math.abs(rel) > 0 ? 'borderline' : 'tie') : strengthOf(sum, max);
        return { ...cat, sum, max, answered, total: items.length, ratio, mean: mean === null ? null : +mean.toFixed(2), rel, level, strength };
    });
    const ranked = categories.filter(c => c.answered).slice().sort((a, b) => b.ratio - a.ratio || b.sum - a.sum);
    // 4방향 같은 상위 묶음(test.higher): 소속 범주 점수(중심화면 rel, 아니면 ratio)의 평균
    const higher = (test.higher || []).map(h => {
        const ms = categories.filter(c => h.members.includes(c.id) && c.answered);
        const v = ms.length ? ms.reduce((s, c) => s + (centerMean ? c.rel : c.ratio), 0) / ms.length : null;
        return { ...h, value: v === null ? null : +v.toFixed(2), ratio: v === null ? 0 : centerMean ? Math.max(-1, Math.min(1, v / half)) : v,
            level: v === null ? 'none' : centerMean ? (v >= cut ? 'high' : v <= -cut ? 'low' : 'mid') : (v >= 0.3 ? 'high' : v <= -0.3 ? 'low' : 'mid') };
    }).sort((a, b) => b.ratio - a.ratio);
    return {
        kind: 'profile', categories, ranked, higher, mrat: mrat === null ? null : +mrat.toFixed(2), centerMean, scaleMid: mid,
        high: ranked.filter(c => c.level === 'high'), mid: ranked.filter(c => c.level === 'mid'), low: ranked.filter(c => c.level === 'low'),
        decided: categories.every(c => c.answered === c.total),
    };
}

export const DOMAIN_LEVEL_LABEL = Object.freeze({ high: '높음', mid: '보통', low: '낮음', none: '미응답' });

/**
 * 세부 척도형(빅파이브·정직-겸손): 세부마다 합(문항값-3, keyed '-'면 반전)과 비율, 영역은 소속 세부 합. 비율 ≥0.3 높음, ≤-0.3 낮음, 사이 보통.
 * 0.5.0: 환산 라벨(MBTI·A/T·에니어그램·대인 자세)은 뺐다 — 라벨이 캐릭터를 상투형으로 눌러서(사용자 결정). 다섯 검사의 라벨만 남는다.
 */
export function scoreFacets(test, answers) {
    const byItem = new Map(answers.map(a => [a.itemId, a]));
    const levelOf = (ratio, max) => !max ? 'none' : ratio >= 0.3 ? 'high' : ratio <= -0.3 ? 'low' : 'mid';
    const facets = test.facets.map(f => {
        const items = test.items.filter(i => i.facet === f.id);
        let sum = 0, answered = 0;
        for (const item of items) {
            const a = byItem.get(item.id);
            if (!valid(test, a)) continue;
            sum += centered(test, item, a.score); answered += 1;
        }
        const max = answered * halfOf(test), ratio = max ? sum / max : 0;
        return { ...f, sum, max, answered, total: items.length, ratio, mean: answered ? +(midOf(test) + sum / answered).toFixed(2) : null, level: levelOf(ratio, max), strength: strengthOf(sum, max) };
    });
    const domains = test.domains.map(d => {
        const fs = facets.filter(f => f.domain === d.id);
        const sum = fs.reduce((a, f) => a + f.sum, 0), max = fs.reduce((a, f) => a + f.max, 0), answered = fs.reduce((a, f) => a + f.answered, 0), total = fs.reduce((a, f) => a + f.total, 0);
        const ratio = max ? sum / max : 0;
        return { ...d, facets: fs, sum, max, answered, total, ratio, mean: answered ? +(midOf(test) + sum / answered).toFixed(2) : null, level: levelOf(ratio, max), strength: strengthOf(sum, max),
            notableHigh: fs.filter(f => f.level === 'high'), notableLow: fs.filter(f => f.level === 'low') };
    });
    return { kind: 'facets', facets, domains, decided: facets.every(f => f.answered === f.total) };
}

export function scoreTest(test, answers) {
    const kind = test.scoring?.kind;
    if (kind === 'profile') return scoreProfile(test, answers);
    if (kind === 'facets') return scoreFacets(test, answers);
    throw new Error('지원하지 않는 채점 방식: ' + kind);
}
