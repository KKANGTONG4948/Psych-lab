// VIA 강점 보강 — 빅파이브에 없는 강점 5개 × 6문항 (성격 축)
//
// 원형: IPIP-VIA (International Personality Item Pool, https://ipip.ori.org/newVIAKey.htm) — 공개 도메인.
//   24강점 가운데 빅파이브 30세부로는 잡히지 않거나 약하게만 잡히는 다섯 개만 남겼다:
//   유머(Humor)·감사(Gratitude)·용감함(Valor)·희망(Hope)·통찰(Perspective). 나머지 19강점은 빅파이브 세부와
//   겹쳐서(친절≈이타심, 끈기≈자기 규율, 호기심≈지적 호기심 …) 빅파이브 검사로 대신한다.
//   강점마다 8~10문항 중 6문항을 골라 번역했다. 원문(src)과 채점 방향(keyed)을 남긴다. 공식 VIA-IS가 아니다.
// 형식: 문장 하나에 1~5. keyed '-'면 역채점.
// 채점(facets): 강점마다 합(-12~+12), 비율로 높음/보통/낮음. 영역(domain)은 강점 하나씩 — 합산하지 않는다.
// 0.3.0: 예전 'via'(6덕목 × 5)를 대체. 기록은 호환되지 않는다(새 검사 id 'via2').

const strength = (id, name, en, desc, gloss) => ({ id, name, en, desc, gloss, facets: [{ id, domain: id, name, en, gloss }] });

const S = [
    strength('hum', '유머', 'Humor', '웃음으로 분위기를 바꾸는 힘',
        { high: '어떤 상황에서도 농담과 웃음으로 분위기를 바꾼다', mid: '웃길 때도 있지만 유머가 주무기는 아니다', low: '농담을 잘 안 하고, 남을 웃기려 애쓰지 않는다' }),
    strength('gra', '감사', 'Gratitude', '받은 것을 알아차리고 고마워하는 힘',
        { high: '받은 것을 잊지 않고 고마움을 표현한다', mid: '고마운 건 알지만 굳이 말하진 않는다', low: '받은 것을 당연하게 여기고 고마움을 표현하지 않는다' }),
    strength('val', '용감함', 'Valor', '위험·반대 앞에서 물러서지 않는 힘',
        { high: '반대가 세도 할 말을 하고, 불편한 자리에서 물러서지 않는다', mid: '필요할 땐 나서지만 굳이 부딪치진 않는다', low: '불편한 상황과 반대를 피하고, 소신을 접는다' }),
    strength('hop', '희망', 'Hope', '앞날을 밝게 보고 버티는 힘',
        { high: '어려워도 잘될 거라 믿고 밝은 면을 본다', mid: '상황 따라 낙관과 비관을 오간다', low: '최악을 예상하고, 일이 잘 풀릴 거라 믿지 않는다' }),
    strength('per', '통찰', 'Perspective', '큰 그림을 보고 남에게 조언이 되는 힘',
        { high: '큰 그림을 보고, 남들이 조언을 구하는 사람이다', mid: '가끔은 넓게 보지만 늘 그렇진 않다', low: '정말 중요한 게 뭔지 잘 못 짚고, 조언을 구하는 사람이 없다' }),
];

export const VIA = Object.freeze({
    id: 'via2',
    version: 2,
    name: 'VIA 강점 5개 (유머·감사·용감함·희망·통찰)',
    short: 'VIA 강점',
    theory: 'VIA Character Strengths',
    tag: 'VIA',
    axis: 'personality',
    format: 'likert',
    scale: { min: 1, max: 5, leftLabel: '전혀 아니다', rightLabel: '매우 그렇다' },
    scoring: { kind: 'facets' },
    source: {
        title: 'IPIP-VIA (International Personality Item Pool)',
        author: 'IPIP / Peterson & Seligman의 VIA 분류',
        url: 'https://ipip.ori.org/newVIAKey.htm',
        license: 'Public domain',
        note: '24강점 중 빅파이브와 겹치지 않는 5개(유머·감사·용감함·희망·통찰)만 골라 강점당 6문항을 발췌·번역했다. 공식 VIA-IS가 아니며 24강점 전체를 재지 않는다. 높음/보통/낮음 구간은 이 도구의 자체 기준이다.',
    },
    domains: S.map(({ facets, ...d }) => d),
    facets: S.flatMap(s => s.facets),
    items: [
        // ── 유머 ──
        { id: 'via2_01', facet: 'hum', keyed: '+', src: 'Use laughter to brighten the days of others.', text: '웃음으로 다른 사람의 하루를 밝게 만든다.' },
        { id: 'via2_02', facet: 'hum', keyed: '+', src: 'Try to have fun in all kinds of situations.', text: '어떤 상황에서든 재미를 찾으려 한다.' },
        { id: 'via2_03', facet: 'hum', keyed: '+', src: 'Keep my sense of humor even in gloomy situations.', text: '우울한 상황에서도 유머 감각을 잃지 않는다.' },
        { id: 'via2_04', facet: 'hum', keyed: '+', src: 'Try to tease my friends out of their gloomy moods.', text: '친구가 우울해하면 놀리듯 장난쳐서 기분을 풀어 주려 한다.' },
        { id: 'via2_05', facet: 'hum', keyed: '-', src: 'Am not known for my sense of humor.', text: '유머 감각으로 알려진 사람은 아니다.' },
        { id: 'via2_06', facet: 'hum', keyed: '-', src: 'Do not go out of my way to make others smile or laugh.', text: '남을 웃기려고 일부러 애쓰지는 않는다.' },
        // ── 감사 ──
        { id: 'via2_07', facet: 'gra', keyed: '+', src: 'Express my thanks to those who care about me.', text: '나를 아껴 주는 사람에게 고마움을 표현한다.' },
        { id: 'via2_08', facet: 'gra', keyed: '+', src: 'Stop to count my blessings.', text: '멈춰 서서 내가 받은 복을 헤아려 본다.' },
        { id: 'via2_09', facet: 'gra', keyed: '+', src: 'Am an extremely grateful person.', text: '아주 고마워할 줄 아는 사람이다.' },
        { id: 'via2_10', facet: 'gra', keyed: '+', src: 'Feel thankful for what I have received in life.', text: '살면서 받은 것에 감사함을 느낀다.' },
        { id: 'via2_11', facet: 'gra', keyed: '-', src: 'Do not see the need to acknowledge others who are good to me.', text: '나한테 잘해 주는 사람에게 굳이 고마움을 표할 필요는 없다고 본다.' },
        { id: 'via2_12', facet: 'gra', keyed: '-', src: 'Find few things in my life to be grateful for.', text: '내 삶에서 고마워할 만한 것을 별로 못 찾는다.' },
        // ── 용감함 ──
        { id: 'via2_13', facet: 'val', keyed: '+', src: 'Have taken frequent stands in the face of strong opposition.', text: '거센 반대 앞에서도 자주 내 입장을 지켰다.' },
        { id: 'via2_14', facet: 'val', keyed: '+', src: "Don't hesitate to express an unpopular opinion.", text: '남들이 싫어할 의견이라도 주저 없이 말한다.' },
        { id: 'via2_15', facet: 'val', keyed: '+', src: 'Speak up in protest when I hear someone say mean things.', text: '누가 못된 말을 하면 그 자리에서 항의한다.' },
        { id: 'via2_16', facet: 'val', keyed: '+', src: 'Can face my fears.', text: '내 두려움과 마주할 수 있다.' },
        { id: 'via2_17', facet: 'val', keyed: '-', src: 'Avoid dealing with awkward situations.', text: '곤란한 상황은 피하려 한다.' },
        { id: 'via2_18', facet: 'val', keyed: '-', src: 'Do not stand up for my beliefs.', text: '내 신념을 지키려 나서지 않는다.' },
        // ── 희망 ──
        { id: 'via2_19', facet: 'hop', keyed: '+', src: 'Look on the bright side.', text: '일의 밝은 면을 본다.' },
        { id: 'via2_20', facet: 'hop', keyed: '+', src: 'Can find the positive in what seems negative to others.', text: '남들에겐 나빠 보이는 일에서도 좋은 점을 찾아낸다.' },
        { id: 'via2_21', facet: 'hop', keyed: '+', src: 'Remain hopeful despite challenges.', text: '어려움이 있어도 희망을 잃지 않는다.' },
        { id: 'via2_22', facet: 'hop', keyed: '+', src: 'Think about what is good in my life when I feel down.', text: '기분이 가라앉으면 내 삶의 좋은 점을 떠올린다.' },
        { id: 'via2_23', facet: 'hop', keyed: '-', src: 'Expect the worst.', text: '최악의 경우를 예상한다.' },
        { id: 'via2_24', facet: 'hop', keyed: '-', src: 'Am not confident that my way of doing things will work out for the best.', text: '내 방식대로 하면 잘 풀릴 거라는 확신이 없다.' },
        // ── 통찰 ──
        { id: 'via2_25', facet: 'per', keyed: '+', src: 'Have a broad outlook on what is going on.', text: '돌아가는 일을 넓은 시야로 본다.' },
        { id: 'via2_26', facet: 'per', keyed: '+', src: 'Have a mature view on life.', text: '삶을 보는 눈이 성숙하다.' },
        { id: 'via2_27', facet: 'per', keyed: '+', src: 'Have been described as wise beyond my years.', text: '나이에 비해 지혜롭다는 말을 들어 왔다.' },
        { id: 'via2_28', facet: 'per', keyed: '+', src: 'Am considered to be a wise person.', text: '지혜로운 사람으로 여겨진다.' },
        { id: 'via2_29', facet: 'per', keyed: '-', src: 'Lose sight of what is most important in life.', text: '삶에서 정말 중요한 것이 무엇인지 놓치곤 한다.' },
        { id: 'via2_30', facet: 'per', keyed: '-', src: 'Am rarely consulted for advice by others.', text: '남들이 나한테 조언을 구하는 일은 드물다.' },
    ],
});
