// 정직-겸손 보강 — IPIP-HEXACO 발췌 16문항 (성격 축: 빅파이브가 못 재는 두 세부만)
//
// 원형: IPIP-HEXACO (International Personality Item Pool, https://ipip.ori.org/newHEXACO_PI_key.htm) — 공개 도메인.
//   HEXACO Honesty-Humility(정직-겸손)의 4세부 중 **공정(Fairness)과 겸손(Modesty)은 뺐다** — IPIP-NEO의 우호성 세부
//   도덕성(A2)·겸손(A5)과 문항까지 거의 같아서 빅파이브 검사와 중복이다. 빅파이브에 대응물이 없는 두 세부만 남기고
//   세부당 10문항 중 8문항을 골라 번역했다. 원문(src)과 채점 방향(keyed)을 남긴다. 공식 HEXACO-PI-R이 아니다.
// 형식: 문장 하나에 1~5. keyed '-'면 역채점(점수가 낮을수록 그 세부가 높음).
// 채점(facets): 세부마다 합(-16~+16), 비율로 높음/보통/낮음. 영역 합은 두 세부의 합.
// 0.3.0: 예전 'hh'(4세부 × 4)를 대체. 기록은 호환되지 않는다(새 검사 id 'hh2').

export const HH = Object.freeze({
    id: 'hh2',
    version: 2,
    name: '꾸밈 없음 · 탐욕 회피 (IPIP-HEXACO 발췌)',
    short: '꾸밈 없음·탐욕 회피',
    theory: 'HEXACO Honesty-Humility',
    tag: 'HEXACO',
    axis: 'personality',
    format: 'likert',
    scale: { min: 1, max: 5, leftLabel: '전혀 아니다', rightLabel: '매우 그렇다' },
    scoring: { kind: 'facets' },
    source: {
        title: 'IPIP-HEXACO — Honesty-Humility: Sincerity, Greed Avoidance',
        author: 'International Personality Item Pool (HEXACO 대응 척도)',
        url: 'https://ipip.ori.org/newHEXACO_PI_key.htm',
        license: 'Public domain',
        note: '정직-겸손 4세부 중 빅파이브와 겹치는 공정·겸손을 빼고, 꾸밈 없음(Sincerity)·탐욕 회피(Greed Avoidance) 두 세부에서 각 8문항을 발췌·번역했다. 공식 HEXACO-PI-R이 아니다. 높음/보통/낮음 구간은 이 도구의 자체 기준이다.',
    },
    domains: [
        { id: 'H', name: '정직-겸손', en: 'Honesty-Humility', desc: '(보강) 꾸미거나 속이지 않고, 돈·지위를 탐하지 않는 정도',
            gloss: { high: '남에게 잘 보이려 꾸미지 않고, 돈·지위·사치를 탐하지 않는다', mid: '필요하면 꾸미거나 챙기지만 선은 지킨다', low: '잘 보이려 연기하고 아첨하며, 돈·지위·사치를 원한다' } },
    ],
    facets: [
        { id: 'H1', domain: 'H', name: '꾸밈 없음', en: 'Sincerity',
            gloss: { high: '아첨하거나 연기하지 않고 있는 그대로 군다', mid: '상황 따라 조금 맞춰 꾸민다', low: '잘 보이려 아첨하고 연기하며, 사람 따라 다른 얼굴을 쓴다' } },
        { id: 'H2', domain: 'H', name: '탐욕 회피', en: 'Greed Avoidance',
            gloss: { high: '돈·지위·사치에 끌리지 않는다', mid: '돈·지위를 적당히 원한다', low: '돈·지위·사치와 권력을 강하게 원한다' } },
    ],
    items: [
        // ── 꾸밈 없음 (Sincerity) ──
        { id: 'hh2_01', facet: 'H1', keyed: '+', src: "Don't pretend to be more than I am.", text: '실제보다 더 대단한 척하지 않는다.' },
        { id: 'hh2_02', facet: 'H1', keyed: '-', src: 'Use flattery to get ahead.', text: '앞서 나가려고 아첨을 쓴다.' },
        { id: 'hh2_03', facet: 'H1', keyed: '-', src: 'Tell other people what they want to hear so that they will do what I want them to do.', text: '내가 원하는 대로 움직이게 하려고 남이 듣고 싶어 하는 말을 해 준다.' },
        { id: 'hh2_04', facet: 'H1', keyed: '-', src: 'Put on a show to impress people.', text: '사람들에게 잘 보이려고 연기를 한다.' },
        { id: 'hh2_05', facet: 'H1', keyed: '-', src: 'Play a role in order to impress people.', text: '남에게 좋은 인상을 주려고 역할을 연기한다.' },
        { id: 'hh2_06', facet: 'H1', keyed: '-', src: 'Pretend to be concerned for others.', text: '남을 걱정하는 척한다.' },
        { id: 'hh2_07', facet: 'H1', keyed: '-', src: 'Act like different people in different situations.', text: '상황에 따라 다른 사람처럼 군다.' },
        { id: 'hh2_08', facet: 'H1', keyed: '-', src: 'Find it necessary to please the people who have power.', text: '힘 있는 사람의 비위를 맞출 필요가 있다고 느낀다.' },
        // ── 탐욕 회피 (Greed Avoidance) ──
        { id: 'hh2_09', facet: 'H2', keyed: '+', src: 'Would not enjoy being a famous celebrity.', text: '유명 인사가 되는 것은 즐겁지 않을 것이다.' },
        { id: 'hh2_10', facet: 'H2', keyed: '+', src: "Don't strive for elegance in my appearance.", text: '겉모습을 화려하게 꾸미려 애쓰지 않는다.' },
        { id: 'hh2_11', facet: 'H2', keyed: '-', src: 'Love luxury.', text: '사치를 아주 좋아한다.' },
        { id: 'hh2_12', facet: 'H2', keyed: '-', src: 'Have a strong need for power.', text: '권력을 강하게 원한다.' },
        { id: 'hh2_13', facet: 'H2', keyed: '-', src: 'Seek status.', text: '지위를 추구한다.' },
        { id: 'hh2_14', facet: 'H2', keyed: '-', src: 'Am mainly interested in money.', text: '주된 관심사는 돈이다.' },
        { id: 'hh2_15', facet: 'H2', keyed: '-', src: 'Prefer to eat at expensive restaurants.', text: '비싼 식당에서 먹는 쪽을 선호한다.' },
        { id: 'hh2_16', facet: 'H2', keyed: '-', src: 'Am out for my own personal gain.', text: '내 잇속을 챙기려 든다.' },
    ],
});
