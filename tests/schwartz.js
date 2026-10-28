// Schwartz 10가치 — 한국어 PVQ40(PQ IV Korean) 원문 40문항 (가치관 축)
//
// 원형: Portrait Values Questionnaire 40 (PVQ40, PQ IV). Shalom H. Schwartz.
//   출처: Schwartz, S. H. (2012). A Repository of Schwartz Value Scales with Instructions and an Introduction.
//   Online Readings in Psychology and Culture, 2(2). https://scholarworks.gvsu.edu/orpc/vol2/iss2/9/
//   파일: "PQ IV Korean" (한국어 번역: Shang Hui Shin, 2008), "Coding Key PVQ40" (2021년 6월판).
//   라이선스: 저장소는 CC BY-NC-ND 3.0 (출처 표기, 비상업, 수정 금지). 채점표 머리글의 원저자 안내:
//   "The PVQ40 is available at no cost for academic research purposes. For commercial use, a license is required. Contact shalom.schwartz@huji.ac.il"
//   이 도구는 비상업 오락용이며 문항을 한 글자도 바꾸지 않았다(공백 정리만). 상업 이용은 원저자 라이선스가 필요하다.
// 형식: 어떤 사람의 짧은 묘사(초상)를 읽고 "이 사람이 나와 얼마나 같은가" 1~6. 남성판(text)·여성판(textF) 둘 다 원문 그대로 수록.
//   한국어판 여성판은 "남성"→"여성"만 바뀌고 대명사 "그"는 그대로이며, 17번에 원문 오타("이 그에게는")가 있다 — 수정 금지라 그대로 둔다.
// 채점(profile, center:'mean'): 가치 점수 = 소속 문항 평균; 개인 평균(MRAT)을 빼서 중심화(원저자 채점 안내 (A)~(C)). 4방향 = 소속 가치의 평균.
//   중시/보통/넘김 구간(중심화 점수 ±0.6)은 이 도구의 자체 기준이지 원저자의 것이 아니다.
//
// 이 파일은 test/gen_schwartz.py가 생성했다. 문항을 고칠 일은 없다(수정 금지). 설명 문구를 바꾸려면 생성기를 고치고 다시 만든다.

export const SCHWARTZ = Object.freeze({
    id: 'schwartz',
    version: 1,
    name: 'Schwartz 10가치 (PVQ40 한국어판 원문)',
    short: '10가치',
    theory: 'Schwartz Basic Values (PVQ40)',
    tag: 'Schwartz',
    axis: 'values',
    format: 'likert',
    scale: {
        min: 1, max: 6,
        leftLabel: '나와 전혀 같지 않다', rightLabel: '나와 매우 같다',
        labels: ['나와 전혀 같지 않다', '나와 같지 않다', '나와 아주 조금 같다', '나와 다소 같다', '나와 같다', '나와 매우 같다'],
    },
    portraitGender: true,   // 남성판/여성판 선택 가능(설정)
    promptIntro: '문항은 어떤 사람에 대한 짧은 묘사(text)다. 그 묘사의 사람이 이 캐릭터와 얼마나 같은지 1~6으로 답한다. 묘사 속 "남성/여성"과 "그"는 묘사 대상을 가리키는 말이며, 캐릭터의 성별과 달라도 묘사 내용만 보고 판단한다.',
    scoring: { kind: 'profile', center: 'mean', cut: 0.6 },
    source: {
        title: 'Portrait Values Questionnaire 40 (PVQ40 / PQ IV) — 한국어판',
        author: 'Shalom H. Schwartz (한국어 번역: Shang Hui Shin, 2008)',
        url: 'https://scholarworks.gvsu.edu/orpc/vol2/iss2/9/',
        license: 'CC BY-NC-ND 3.0 (비상업 · 수정 금지)',
        note: 'ORPC 저장소의 "PQ IV Korean" 40문항을 한 글자도 바꾸지 않고 수록했다(남성판·여성판). 채점은 "Coding Key PVQ40"(2021)대로 가치별 문항 평균과 개인 평균 중심화. 원저자 안내: 학술 연구 목적 무료, 상업 이용은 별도 라이선스(shalom.schwartz@huji.ac.il). 중시/넘김 구간은 이 도구의 자체 기준.',
    },
    categories: [
        { id: 'self_direction', name: '자기지향', en: 'Self-Direction', desc: '스스로 생각하고 정하고 자기 방식대로 하는 것',
            high: { cond: '스스로 정하고 자기 방식대로 할 자유가 막히는 장면', react: '답답해하고 자기 방식을 지키려 한다' }, low: { cond: '스스로 정하고 자기 방식대로 할 자유가 막히는 장면', react: '시키는 대로 해도 크게 개의치 않는다' } },
        { id: 'stimulation', name: '자극', en: 'Stimulation', desc: '새롭고 짜릿한 것, 모험',
            high: { cond: '새롭고 짜릿한 일이나 모험이 생기는 장면', react: '먼저 뛰어든다' }, low: { cond: '새롭고 짜릿한 일이나 모험이 생기는 장면', react: '굳이 끼지 않는다' } },
        { id: 'hedonism', name: '쾌락', en: 'Hedonism', desc: '즐거움, 재미, 편안함',
            high: { cond: '즐길 거리나 편한 자리가 생기는 장면', react: '놓치지 않고 즐긴다' }, low: { cond: '즐길 거리나 편한 자리가 생기는 장면', react: '크게 끌리지 않는다' } },
        { id: 'achievement', name: '성취', en: 'Achievement', desc: '능력을 보여 주고 성과로 인정받는 것',
            high: { cond: '능력을 보여 주거나 성과로 인정받을 기회, 경쟁이 생기는 장면', react: '나서서 보여 주려 한다' }, low: { cond: '능력을 보여 주거나 경쟁이 생기는 장면', react: '굳이 나서서 증명하려 하지 않는다' } },
        { id: 'power', name: '권력', en: 'Power', desc: '돈, 지위, 결정권',
            high: { cond: '돈·지위·결정권이 걸린 장면', react: '쥐려 하고 양보하지 않는다' }, low: { cond: '돈·지위·결정권이 걸린 장면', react: '집착하지 않는다' } },
        { id: 'security', name: '안전', en: 'Security', desc: '자신·가족·소속의 안전과 질서',
            high: { cond: '자신·가족·소속의 안전이나 질서가 위협받는 장면', react: '먼저 안전을 챙기고 위험을 피한다' }, low: { cond: '안전이나 질서가 위협받는 장면', react: '위험이 있어도 크게 신경 쓰지 않는다' } },
        { id: 'conformity', name: '순응', en: 'Conformity', desc: '규칙과 예의를 지키고 남을 거스르지 않는 것',
            high: { cond: '규칙·예의를 어기거나 남을 거슬리게 할 수 있는 장면', react: '규칙을 지키고 자제한다' }, low: { cond: '규칙·예의를 어기거나 남을 거슬리게 할 수 있는 장면', react: '규칙이나 체면에 얽매이지 않는다' } },
        { id: 'tradition', name: '전통', en: 'Tradition', desc: '관습, 종교, 겸손',
            high: { cond: '관습·종교·집안의 전통이 걸린 장면', react: '전통을 따르고 지키려 한다' }, low: { cond: '관습·종교·집안의 전통이 걸린 장면', react: '전통에 크게 얽매이지 않는다' } },
        { id: 'benevolence', name: '박애', en: 'Benevolence', desc: '가까운 사람을 돕고 의리를 지키는 것',
            high: { cond: '가까운 사람(친구·가족·동료)이 도움이 필요하거나 믿음을 거는 장면', react: '충실하게 돕고 곁을 지킨다' }, low: { cond: '가까운 사람이 도움이 필요한 장면', react: '꼭 나서지는 않는다' } },
        { id: 'universalism', name: '보편주의', en: 'Universalism', desc: '모든 사람과 자연에 대한 공평함과 보호',
            high: { cond: '낯선 사람·약자·자연이 부당하게 다뤄지는 장면', react: '모두에게 공평하길 바라고 지키려 한다' }, low: { cond: '낯선 사람·약자·자연이 부당하게 다뤄지는 장면', react: '나와 먼 일이라 크게 반응하지 않는다' } },
    ],
    // 4방향(상위 가치): 소속 가치 점수의 평균. 채점표의 'Scoring Key for four Higher Order Values' 그대로.
    higher: [
        { id: 'openness', name: '변화 개방', en: 'Openness to Change', members: ['self_direction', 'stimulation', 'hedonism'] },
        { id: 'conservation', name: '보존', en: 'Conservation', members: ['security', 'conformity', 'tradition'] },
        { id: 'enhancement', name: '자기 고양', en: 'Self-Enhancement', members: ['achievement', 'power'] },
        { id: 'transcendence', name: '자기 초월', en: 'Self-Transcendence', members: ['universalism', 'benevolence'] },
    ],
    items: [
        { id: 'pvq_01', category: 'self_direction', keyed: '+', text: '이 남성에게는 새로운 아이디어를 생각해 내는 것과 창조적인 것이 중요하다. 그는 자신만의 독창적 방식으로 일하는 것을 좋아한다.', textF: '이 여성에게는 새로운 아이디어를 생각해 내는 것과 창조적인 것이 중요하다. 그는 자신만의 독창적 방식으로 일하는 것을 좋아한다.' },
        { id: 'pvq_02', category: 'power', keyed: '+', text: '이 남성에게는 부자가 되는 것이 중요하다. 그는 많은 돈과 비싼 것들을 가지고 싶어한다.', textF: '이 여성에게는 부자가 되는 것이 중요하다. 그는 많은 돈과 비싼 것들을 가지고 싶어한다.' },
        { id: 'pvq_03', category: 'universalism', keyed: '+', text: '그는 세상의 모든 사람이 평등하게 대접 받는 것이 중요하다고 생각한다. 인생에서 기회는 모든 사람에게 평등하게 주어져야 한다고 그는 믿는다.', textF: '그는 세상의 모든 사람이 평등하게 대접 받는 것이 중요하다고 생각한다. 인생에서 기회는 모든 사람에게 평등하게 주어져야 한다고 그는 믿는다.' },
        { id: 'pvq_04', category: 'achievement', keyed: '+', text: '그에게는 자신의 능력을 보여주는 것이 매우 중요하다. 그는 자신이 하는 일을 사람들이 우러러 보길 바란다.', textF: '그에게는 자신의 능력을 보여주는 것이 매우 중요하다. 그는 자신이 하는 일을 사람들이 우러러 보길 바란다.' },
        { id: 'pvq_05', category: 'security', keyed: '+', text: '그에게는 안전한 환경에서 사는 것이 중요하다. 그는 자신의 안전을 위태롭게 할 가능성이 있는 것은 무엇이든 피한다.', textF: '그에게는 안전한 환경에서 사는 것이 중요하다. 그는 자신의 안전을 위태롭게 할 가능성이 있는 것은 무엇이든 피한다.' },
        { id: 'pvq_06', category: 'stimulation', keyed: '+', text: '그는 삶에서 여러 가지 다양한 일을 하는 것이 중요하다고 생각한다. 그는 언제나 새로 시도해볼 것들을 찾는다.', textF: '그는 삶에서 여러 가지 다양한 일을 하는 것이 중요하다고 생각한다. 그는 언제나 새로 시도해볼 것들을 찾는다.' },
        { id: 'pvq_07', category: 'conformity', keyed: '+', text: '사람들이 지시 받은 대로 해야 한다고 그는 믿는다. 언제나, 심지어는 아무도 보고 있지 않을 때에도 사람들이 규칙을 따라야 한다고 그는 생각한다.', textF: '사람들이 지시 받은 대로 해야 한다고 그는 믿는다. 언제나, 심지어는 아무도 보고 있지 않을 때에도 사람들이 규칙을 따라야 한다고 그는 생각한다.' },
        { id: 'pvq_08', category: 'universalism', keyed: '+', text: '자신과는 다른 사람들에게 귀를 기울이는 것이 그에게는 중요하다. 그는 그들과 의견을 달리할 때조차도 여전히 그들을 이해하고 싶어한다.', textF: '자신과는 다른 사람들에게 귀를 기울이는 것이 그에게는 중요하다. 그는 그들과 의견을 달리할 때조차도 여전히 그들을 이해하고 싶어한다.' },
        { id: 'pvq_09', category: 'tradition', keyed: '+', text: '자신이 가진 것보다 더 많을 것을 요구하지 않는 것이 중요하다고 그는 생각한다. 사람들이 현재 가지고 있는 것에 만족해야 한다고 그는 믿는다.', textF: '자신이 가진 것보다 더 많을 것을 요구하지 않는 것이 중요하다고 그는 생각한다. 사람들이 현재 가지고 있는 것에 만족해야 한다고 그는 믿는다.' },
        { id: 'pvq_10', category: 'hedonism', keyed: '+', text: '그는 자신이 즐길 수 있는 모든 기회를 찾아 다닌다. 그에게는 자신이 재미있는 일을 하는 것이 중요하다.', textF: '그는 자신이 즐길 수 있는 모든 기회를 찾아 다닌다. 그에게는 자신이 재미있는 일을 하는 것이 중요하다.' },
        { id: 'pvq_11', category: 'self_direction', keyed: '+', text: '그에게는 자신의 일에 대해 스스로 결정을 내리는 것이 중요하다. 그는 자기 자신의 활동을 선택하고 계획하는 데 있어서 자유로운 것을 좋아한다.', textF: '그에게는 자신의 일에 대해 스스로 결정을 내리는 것이 중요하다. 그는 자기 자신의 활동을 선택하고 계획하는 데 있어서 자유로운 것을 좋아한다.' },
        { id: 'pvq_12', category: 'benevolence', keyed: '+', text: '그에게는 자기 주변의 사람들을 도와주는 것이 매우 중요하다. 그는 그들의 복지를 돌보고 싶어한다.', textF: '그에게는 자기 주변의 사람들을 도와주는 것이 매우 중요하다. 그는 그들의 복지를 돌보고 싶어한다.' },
        { id: 'pvq_13', category: 'achievement', keyed: '+', text: '크게 성공하는 것이 그에게는 중요하다. 그는 다른 사람들에게 인상적이고 싶어한다.', textF: '크게 성공하는 것이 그에게는 중요하다. 그는 다른 사람들에게 인상적이고 싶어한다.' },
        { id: 'pvq_14', category: 'security', keyed: '+', text: '그에게는 자기 나라의 안전이 매우 중요하다. 국가는 내외의 위협을 경계해야만 한다고 그는 생각한다.', textF: '그에게는 자기 나라의 안전이 매우 중요하다. 국가는 내외의 위협을 경계해야만 한다고 그는 생각한다.' },
        { id: 'pvq_15', category: 'stimulation', keyed: '+', text: '그는 위험 무릅쓰기를 좋아한다. 그는 항상 모험을 찾아 다닌다.', textF: '그는 위험 무릅쓰기를 좋아한다. 그는 항상 모험을 찾아 다닌다.' },
        { id: 'pvq_16', category: 'conformity', keyed: '+', text: '그에게는 항상 바르게 행동하는 것이 중요하다. 그는 사람들이 옳지 않다고 말할 일은 어느 것이나 피하고 싶어한다.', textF: '그에게는 항상 바르게 행동하는 것이 중요하다. 그는 사람들이 옳지 않다고 말할 일은 어느 것이나 피하고 싶어한다.' },
        { id: 'pvq_17', category: 'power', keyed: '+', text: '권한을 가지고 다른 이들이 할 일을 지시하는 것이 그에게는 중요하다. 그는 자신이 말한 것을 사람들이 행하길 원한다.', textF: '권한을 가지고 다른 이들이 할 일을 지시하는 것이 이 그에게는 중요하다. 그는 자신이 말한 것을 사람들이 행하길 원한다.' },
        { id: 'pvq_18', category: 'benevolence', keyed: '+', text: '그에게는 자신의 친구들과 의리를 지키는 것이 중요하다. 그는 자신과 가까운 사람들에게 헌신하고 싶어한다.', textF: '그에게는 자신의 친구들과 의리를 지키는 것이 중요하다. 그는 자신과 가까운 사람들에게 헌신하고 싶어한다.' },
        { id: 'pvq_19', category: 'universalism', keyed: '+', text: '사람들이 자연을 돌봐야 한다고 그는 강하게 믿는다. 환경을 보호하는 것이 그에게는 중요하다.', textF: '사람들이 자연을 돌봐야 한다고 그는 강하게 믿는다. 환경을 보호하는 것이 그에게는 중요하다.' },
        { id: 'pvq_20', category: 'tradition', keyed: '+', text: '종교적 믿음이 이 남성에게는 중요하다. 그는 자신의 종교에 필요한 것을 하기 위해 열심히 노력한다.', textF: '종교적 믿음이 이 여성에게는 중요하다. 그는 자신의 종교에 필요한 것을 하기 위해 열심히 노력한다.' },
        { id: 'pvq_21', category: 'security', keyed: '+', text: '이 남성에게는 물건들이 잘 정돈되어서 깨끗한 것이 중요하다. 그는 물건들이 어질러져 있는 것을 정말 좋아하지 않는다.', textF: '이 여성에게는 물건들이 잘 정돈되어서 깨끗한 것이 중요하다. 그는 물건들이 어질러져 있는 것을 정말 좋아하지 않는다.' },
        { id: 'pvq_22', category: 'self_direction', keyed: '+', text: '그는 사물에 흥미를 느끼는 것이 중요하다고 생각한다. 그는 호기심이 강하며 모든 종류의 것들을 이해하려고 든다.', textF: '그는 사물에 흥미를 느끼는 것이 중요하다고 생각한다. 그는 호기심이 강하며 모든 종류의 것들을 이해하려고 든다.' },
        { id: 'pvq_23', category: 'universalism', keyed: '+', text: '그는 세상의 모든 사람이 화합하여 살아야 한다고 믿는다. 세계의 모든 집단 간 평화를 촉진하는 것이 그에게는 중요하다.', textF: '그는 세상의 모든 사람이 화합하여 살아야 한다고 믿는다. 세계의 모든 집단 간 평화를 촉진하는 것이 그에게는 중요하다.' },
        { id: 'pvq_24', category: 'achievement', keyed: '+', text: '그는 야망을 가지는 것이 중요하다고 생각한다. 그는 자신이 얼마나 유능한지 보여주고 싶어한다.', textF: '그는 야망을 가지는 것이 중요하다고 생각한다. 그는 자신이 얼마나 유능한지 보여주고 싶어한다.' },
        { id: 'pvq_25', category: 'tradition', keyed: '+', text: '그는 전통적 방식으로 일을 하는 것이 최선이라고 생각한다. 그에게는 자신이 배운 관습을 따르는 것이 중요하다.', textF: '그는 전통적 방식으로 일을 하는 것이 최선이라고 생각한다. 그에게는 자신이 배운 관습을 따르는 것이 중요하다.' },
        { id: 'pvq_26', category: 'hedonism', keyed: '+', text: '인생을 재미있게 보내는 것이 그에게는 중요하다. 그는 ‘온갖 즐거움을 만끽하고’ 싶어한다.', textF: '인생을 재미있게 보내는 것이 그에게는 중요하다. 그는 ‘온갖 즐거움을 만끽하고’ 싶어한다.' },
        { id: 'pvq_27', category: 'benevolence', keyed: '+', text: '타인이 필요로 할 때 민감하게 반응하는 것이 그에게는 중요하다. 그는 자신이 아는 이들을 지지해 주려고 한다.', textF: '타인이 필요로 할 때 민감하게 반응하는 것이 그에게는 중요하다. 그는 자신이 아는 이들을 지지해 주려고 한다.' },
        { id: 'pvq_28', category: 'conformity', keyed: '+', text: '그는 자신의 부모와 연장자들을 공경해야 한다고 믿는다. 그에게는 순종하는 것이 중요하다.', textF: '그는 자신의 부모와 연장자들을 공경해야 한다고 믿는다. 그에게는 순종하는 것이 중요하다.' },
        { id: 'pvq_29', category: 'universalism', keyed: '+', text: '그는 누구나, 심지어는 자신이 모르는 사람들도 공정하게 대접 받길 원한다. 그에게는 사회에서 약자를 보호하는 것이 중요하다.', textF: '그는 누구나, 심지어는 자신이 모르는 사람들도 공정하게 대접 받길 원한다. 그에게는 사회에서 약자를 보호하는 것이 중요하다.' },
        { id: 'pvq_30', category: 'stimulation', keyed: '+', text: '그는 놀라운 것을 좋아한다. 그에게는 자극적인 삶을 사는 것이 중요하다.', textF: '그는 놀라운 것을 좋아한다. 그에게는 자극적인 삶을 사는 것이 중요하다.' },
        { id: 'pvq_31', category: 'security', keyed: '+', text: '그는 병에 걸리는 것을 피하기 위해 열심히 노력한다. 건강을 유지하는 것이 그에게는 매우 중요하다.', textF: '그는 병에 걸리는 것을 피하기 위해 열심히 노력한다. 건강을 유지하는 것이 그에게는 매우 중요하다.' },
        { id: 'pvq_32', category: 'achievement', keyed: '+', text: '그에게는 인생에서 출세하는 것이 중요하다. 그는 다른 이들보다 더 잘 하려고 노력한다.', textF: '그에게는 인생에서 출세하는 것이 중요하다. 그는 다른 이들보다 더 잘 하려고 노력한다.' },
        { id: 'pvq_33', category: 'benevolence', keyed: '+', text: '그에게는 그에게 상처를 준 사람들을 용서하는 것이 중요하다. 그는 그들의 좋은 점을 찾아서 앙심을 품지 않으려고 노력한다.', textF: '그에게는 그에게 상처를 준 사람들을 용서하는 것이 중요하다. 그는 그들의 좋은 점을 찾아서 앙심을 품지 않으려고 노력한다.' },
        { id: 'pvq_34', category: 'self_direction', keyed: '+', text: '그에게는 독립이 중요하다. 그는 자기 자신에게 의지하고 싶어한다.', textF: '그에게는 독립이 중요하다. 그는 자기 자신에게 의지하고 싶어한다.' },
        { id: 'pvq_35', category: 'security', keyed: '+', text: '안정적 정부가 그에게는 중요하다. 그는 사회 질서가 보호되길 염려하며 바란다.', textF: '안정적 정부가 그에게는 중요하다. 그는 사회 질서가 보호되길 염려하며 바란다.' },
        { id: 'pvq_36', category: 'conformity', keyed: '+', text: '다른 사람들에게 항상 공손하게 행동하는 것이 그에게는 중요하다. 그는 한번이라도 다른 이들을 방해하거나 난처하게 만들지 않으려고 한다.', textF: '다른 사람들에게 항상 공손하게 행동하는 것이 그에게는 중요하다. 그는 한번이라도 다른 이들을 방해하거나 난처하게 만들지 않으려고 한다.' },
        { id: 'pvq_37', category: 'hedonism', keyed: '+', text: '그는 정말로 삶을 즐기고 싶어한다. 즐거운 시간을 갖는 것이 그에게는 매우 중요하다.', textF: '그는 정말로 삶을 즐기고 싶어한다. 즐거운 시간을 갖는 것이 그에게는 매우 중요하다.' },
        { id: 'pvq_38', category: 'tradition', keyed: '+', text: '그에게는 겸허하고 겸손한 것이 중요하다. 그는 자신에게 주의가 쏠리지 않도록 노력한다.', textF: '그에게는 겸허하고 겸손한 것이 중요하다. 그는 자신에게 주의가 쏠리지 않도록 노력한다.' },
        { id: 'pvq_39', category: 'power', keyed: '+', text: '그는 언제나 결정권을 가지고 싶어한다. 그는 지도자가 되길 원한다.', textF: '그는 언제나 결정권을 가지고 싶어한다. 그는 지도자가 되길 원한다.' },
        { id: 'pvq_40', category: 'universalism', keyed: '+', text: '그에게는 자연에 순응하고 자연에 맞추는 것이 중요하다. 그는 사람들이 자연을 변형시키지 말아야 한다고 믿는다.', textF: '그에게는 자연에 순응하고 자연에 맞추는 것이 중요하다. 그는 사람들이 자연을 변형시키지 말아야 한다고 믿는다.' },
    ],
});
