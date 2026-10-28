// Haidt 도덕 기반 6개 — MFQ-2 원문 36문항 (1층: 반응 여부 / 중시하는 가치)
//
// 원형: Moral Foundations Questionnaire-2 (MFQ-2). Atari, Haidt, Graham, Koleva, Stevens & Dehghani (2023),
//   "Morality Beyond the WEIRD: How the Nomological Network of Morality Varies Across Cultures", JPSP.
//   원저자 OSF 프로젝트 https://osf.io/srtxn/ — 라이선스 CC BY 4.0 (복사·번역·수정·재배포 허용, 출처 표기 필수).
//   영어판: https://osf.io/6bfe9  ·  일본어판(번역 대조용): https://osf.io/t2hbd
// 이 파일: 영어판 36문항 전체를 순서·내용 그대로 가져와 한국어로 번역했다. 문항을 고르거나 고치지 않았다(검증은 36문항 전체 기준).
//   한국어 번역은 이 프로젝트의 것이며 원저자의 공식 번역이 아니다. 원저자의 승인·후원을 뜻하지 않는다.
//
// 구조: 6기반 × 6문항. 문항 번호 i의 기반 = (i-1) % 6 → 배려, 평등, 비례, 충성, 권위, 순수. 전 문항 정채점(keyed '+').
// 형식: "이 문장이 당신(의 의견)을 얼마나 잘 묘사하는가" 1~5.
// 채점(profile): 기반마다 합(문항값-3)을 내고 비율로 중시/보통/넘김을 나눈다. 구간 기준은 이 도구의 자체 기준이지 원저자의 것이 아니다.

export const MFQ2 = Object.freeze({
    id: 'mfq2',
    version: 1,
    name: '도덕 기반 6개 (MFQ-2 원문)',
    short: '도덕 기반',
    theory: 'Moral Foundations (MFQ-2)',
    tag: 'MFQ-2',   // 공유 문구 꼬리표(짧게)
    axis: 'values',
    format: 'likert',
    scale: {
        min: 1, max: 5,
        leftLabel: '전혀 들어맞지 않음', rightLabel: '매우 잘 들어맞음',
        labels: ['전혀 들어맞지 않는다', '조금 들어맞는다', '어느 정도 들어맞는다', '꽤 들어맞는다', '매우 잘 들어맞는다'],
    },
    promptNote: '문항에 나오는 나라·사회·공동체·수입·돈 같은 말은 이 캐릭터가 사는 세계의 대응물(소속 집단, 공동체, 재물과 몫)로 읽고 답한다.',
    scoring: { kind: 'profile' },
    source: {
        title: 'Moral Foundations Questionnaire-2 (MFQ-2)',
        author: 'Atari, Haidt, Graham, Koleva, Stevens & Dehghani (2023)',
        url: 'https://osf.io/srtxn/',
        license: 'CC BY 4.0',
        note: '원저자 OSF 프로젝트의 영어판 36문항 전체를 그대로 가져와 한국어로 번역했다(일본어판 대조). 번역은 이 프로젝트의 것이며 원저자의 승인·후원을 뜻하지 않는다. 기반별 중시/보통/넘김 구간은 이 도구의 자체 기준이다.',
    },
    // high/low: 공유 문구용 "장면 조건 → 반응" 문장. 모델이 이론을 몰라도 읽히도록 행동으로 쓴다.
    categories: [
        { id: 'care', name: '배려', en: 'Care', desc: '고통받는 이를 돌보는 것',
            high: { cond: '누가 다치거나 아파하거나 고통받는 장면', react: '그냥 못 지나친다' }, low: { cond: '누가 다치거나 아파하거나 고통받는 장면', react: '크게 반응하지 않는다' } },
        { id: 'equality', name: '평등', en: 'Equality', desc: '몫과 대우가 똑같아야 한다는 것',
            high: { cond: '누구는 더 받고 누구는 덜 받는 장면', react: '불공평하다고 느끼고 반응한다' }, low: { cond: '누구는 더 받고 누구는 덜 받는 장면', react: '몫이 달라도 신경 쓰지 않는다' } },
        { id: 'proportionality', name: '비례', en: 'Proportionality', desc: '기여한 만큼 받아야 한다는 것',
            high: { cond: '노력·공로만큼 보상받지 못하거나 속임수가 통하는 장면', react: '바로잡으려 하고, 속인 쪽이 벌 받길 바란다' }, low: { cond: '공로만큼 보상받지 못하거나 속임수가 통하는 장면', react: '그런가 보다 하고 넘긴다' } },
        { id: 'loyalty', name: '충성', en: 'Loyalty', desc: '우리 편·소속 집단을 지키는 것',
            high: { cond: '우리 편이 흔들리거나 배신당하거나 무시당하는 장면', react: '민감하게 반응한다' }, low: { cond: '우리 편이 흔들리거나 배신당하는 장면', react: '편 가르기나 소속에 무덤덤하다' } },
        { id: 'authority', name: '권위', en: 'Authority', desc: '윗사람·전통·질서를 존중하는 것',
            high: { cond: '윗사람·전통·질서가 무시되는 장면', react: '지키려 하고 거슬려한다' }, low: { cond: '윗사람·전통·질서가 무시되는 장면', react: '신경 쓰지 않는다' } },
        { id: 'purity', name: '순수', en: 'Purity', desc: '몸·품위·신성한 것을 더럽히지 않는 것',
            high: { cond: '소중한 것이 더럽혀지거나 품위 없는 행동(상스러움·방종)을 보는 장면', react: '불쾌해하고 거리를 둔다' }, low: { cond: '상스러운 말·방종·품위 없는 행동을 보는 장면', react: '거리낌 없이 넘긴다' } },
    ],
    items: [
        { id: 'mfq2_01', category: 'care', keyed: '+', src: 'Caring for people who have suffered is an important virtue.', text: '고통을 겪은 사람을 보살피는 것은 중요한 미덕이다.' },
        { id: 'mfq2_02', category: 'equality', keyed: '+', src: 'The world would be a better place if everyone made the same amount of money.', text: '모두가 같은 액수의 돈을 번다면 세상은 더 나은 곳이 될 것이다.' },
        { id: 'mfq2_03', category: 'proportionality', keyed: '+', src: 'I think people who are more hard-working should end up with more money.', text: '더 열심히 일하는 사람이 결국 더 많은 돈을 가져야 한다고 생각한다.' },
        { id: 'mfq2_04', category: 'loyalty', keyed: '+', src: 'I think children should be taught to be loyal to their country.', text: '아이들에게 자기 나라에 충성하도록 가르쳐야 한다고 생각한다.' },
        { id: 'mfq2_05', category: 'authority', keyed: '+', src: 'I think it is important for societies to cherish their traditional values.', text: '사회가 전통적 가치를 소중히 여기는 것이 중요하다고 생각한다.' },
        { id: 'mfq2_06', category: 'purity', keyed: '+', src: 'I think the human body should be treated like a temple, housing something sacred within.', text: '사람의 몸은 신성한 무언가가 깃든 신전처럼 다뤄져야 한다고 생각한다.' },
        { id: 'mfq2_07', category: 'care', keyed: '+', src: 'I believe that compassion for those who are suffering is one of the most crucial virtues.', text: '고통받는 이들에 대한 연민은 가장 중요한 미덕 중 하나라고 믿는다.' },
        { id: 'mfq2_08', category: 'equality', keyed: '+', src: 'Our society would have fewer problems if people had the same income.', text: '사람들의 수입이 같다면 우리 사회의 문제는 줄어들 것이다.' },
        { id: 'mfq2_09', category: 'proportionality', keyed: '+', src: 'I think people should be rewarded in proportion to what they contribute.', text: '사람은 기여한 만큼에 비례해 보상받아야 한다고 생각한다.' },
        { id: 'mfq2_10', category: 'loyalty', keyed: '+', src: 'It upsets me when people have no loyalty to their country.', text: '자기 나라에 충성심이 없는 사람을 보면 화가 난다.' },
        { id: 'mfq2_11', category: 'authority', keyed: '+', src: 'I feel that most traditions serve a valuable function in keeping society orderly.', text: '대부분의 전통은 사회 질서를 지키는 데 값진 역할을 한다고 느낀다.' },
        { id: 'mfq2_12', category: 'purity', keyed: '+', src: 'I believe chastity is an important virtue.', text: '정조는 중요한 미덕이라고 믿는다.' },
        { id: 'mfq2_13', category: 'care', keyed: '+', src: 'We should all care for people who are in emotional pain.', text: '우리 모두는 마음의 고통을 겪는 사람을 보살펴야 한다.' },
        { id: 'mfq2_14', category: 'equality', keyed: '+', src: 'I believe that everyone should be given the same quantity of resources in life.', text: '모든 사람이 삶에서 같은 양의 자원을 받아야 한다고 믿는다.' },
        { id: 'mfq2_15', category: 'proportionality', keyed: '+', src: 'The effort a worker puts into a job ought to be reflected in the size of a raise they receive.', text: '일하는 사람이 들인 노력은 그 사람이 받는 임금 인상 폭에 반영되어야 한다.' },
        { id: 'mfq2_16', category: 'loyalty', keyed: '+', src: 'Everyone should love their own community.', text: '누구나 자기가 속한 공동체를 사랑해야 한다.' },
        { id: 'mfq2_17', category: 'authority', keyed: '+', src: 'I think obedience to parents is an important virtue.', text: '부모에게 순종하는 것은 중요한 미덕이라고 생각한다.' },
        { id: 'mfq2_18', category: 'purity', keyed: '+', src: 'It upsets me when people use foul language like it is nothing.', text: '사람들이 아무렇지 않게 상스러운 말을 쓰는 것을 보면 화가 난다.' },
        { id: 'mfq2_19', category: 'care', keyed: '+', src: 'I am empathetic toward those people who have suffered in their lives.', text: '살면서 고통을 겪어 온 사람들에게 공감한다.' },
        { id: 'mfq2_20', category: 'equality', keyed: '+', src: 'I believe it would be ideal if everyone in society wound up with roughly the same amount of money.', text: '사회의 모든 사람이 결국 비슷한 액수의 돈을 갖게 되는 것이 이상적이라고 믿는다.' },
        { id: 'mfq2_21', category: 'proportionality', keyed: '+', src: 'It makes me happy when people are recognized on their merits.', text: '사람들이 자기 공로대로 인정받는 것을 보면 기쁘다.' },
        { id: 'mfq2_22', category: 'loyalty', keyed: '+', src: 'Everyone should defend their country, if called upon.', text: '부름을 받으면 누구나 자기 나라를 지켜야 한다.' },
        { id: 'mfq2_23', category: 'authority', keyed: '+', src: 'We all need to learn from our elders.', text: '우리 모두는 연장자에게서 배울 필요가 있다.' },
        { id: 'mfq2_24', category: 'purity', keyed: '+', src: 'If I found out that an acquaintance had an unusual but harmless sexual fetish I would feel uneasy about them.', text: '아는 사람에게 남에게 해는 없지만 특이한 성적 취향이 있다는 것을 알게 되면, 그 사람이 꺼림칙하게 느껴질 것이다.' },
        { id: 'mfq2_25', category: 'care', keyed: '+', src: 'Everyone should try to comfort people who are going through something hard.', text: '누구나 힘든 일을 겪는 사람을 위로하려고 애써야 한다.' },
        { id: 'mfq2_26', category: 'equality', keyed: '+', src: 'When people work together toward a common goal, they should share the rewards equally, even if some worked harder on it.', text: '사람들이 공동의 목표를 위해 함께 일했다면, 누군가 더 열심히 했더라도 보상은 똑같이 나눠야 한다.' },
        { id: 'mfq2_27', category: 'proportionality', keyed: '+', src: 'In a fair society, I want people who work harder than others to end up richer than others.', text: '공정한 사회라면 남보다 더 열심히 일한 사람이 결국 남보다 더 부유해지기를 바란다.' },
        { id: 'mfq2_28', category: 'loyalty', keyed: '+', src: 'Everyone should feel proud when a person in their community wins in an international competition.', text: '자기 공동체의 누군가가 국제 대회에서 우승하면 누구나 자랑스러워해야 한다.' },
        { id: 'mfq2_29', category: 'authority', keyed: '+', src: 'I believe that one of the most important values to teach children is to have respect for authority.', text: '아이들에게 가르쳐야 할 가장 중요한 가치 중 하나는 권위를 존중하는 것이라고 믿는다.' },
        { id: 'mfq2_30', category: 'purity', keyed: '+', src: 'People should try to use natural medicines rather than chemically identical human-made ones.', text: '사람들은 화학적으로 똑같은 인공 약보다 자연에서 난 약을 쓰려고 해야 한다.' },
        { id: 'mfq2_31', category: 'care', keyed: '+', src: 'It pains me when I see someone ignoring the needs of another human being.', text: '누군가 다른 사람이 필요로 하는 것을 외면하는 모습을 보면 마음이 아프다.' },
        { id: 'mfq2_32', category: 'equality', keyed: '+', src: 'I get upset when some people have a lot more money than others in my country.', text: '우리나라에서 어떤 사람들이 다른 사람들보다 훨씬 더 많은 돈을 가진 것을 보면 화가 난다.' },
        { id: 'mfq2_33', category: 'proportionality', keyed: '+', src: 'I feel good when I see cheaters get caught and punished.', text: '속임수를 쓴 사람이 잡혀서 벌 받는 것을 보면 속이 시원하다.' },
        { id: 'mfq2_34', category: 'loyalty', keyed: '+', src: 'I believe the strength of a sports team comes from the loyalty of its members to each other.', text: '운동 팀의 힘은 구성원들이 서로에게 갖는 충성심에서 나온다고 믿는다.' },
        { id: 'mfq2_35', category: 'authority', keyed: '+', src: 'I think having a strong leader is good for society.', text: '강한 지도자가 있는 것이 사회에 좋다고 생각한다.' },
        { id: 'mfq2_36', category: 'purity', keyed: '+', src: 'I admire people who keep their virginity until marriage.', text: '결혼할 때까지 순결을 지키는 사람을 존경한다.' },
    ],
});
