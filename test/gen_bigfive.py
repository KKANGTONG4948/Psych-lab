# IPIP-NEO-120 → tests/bigfive.js 생성기. 문항 순서·세부·채점 방향은 Johnson(2014) 120문항 데이터(rubynor/bigfive-web en/questions.ts) 그대로.
import json
d = json.load(open('/tmp/claude-0/-home-claude/f3a9e8c2-5cb0-5bc4-8758-28e272fe1858/scratchpad/neo120.json', encoding='utf-8'))

KO = {
    "Worry about things": "이런저런 일을 걱정한다.",
    "Make friends easily": "친구를 쉽게 사귄다.",
    "Have a vivid imagination": "상상력이 생생하다.",
    "Trust others": "다른 사람을 믿는다.",
    "Complete tasks successfully": "맡은 일을 성공적으로 끝낸다.",
    "Get angry easily": "쉽게 화가 난다.",
    "Love large parties": "사람이 많은 모임을 아주 좋아한다.",
    "Believe in the importance of art": "예술이 중요하다고 믿는다.",
    "Use others for my own ends": "내 목적을 위해 남을 이용한다.",
    "Like to tidy up": "정리 정돈을 좋아한다.",
    "Often feel blue": "자주 우울해진다.",
    "Take charge": "앞장서서 지휘한다.",
    "Experience my emotions intensely": "감정을 강렬하게 느낀다.",
    "Love to help others": "남을 돕는 것을 아주 좋아한다.",
    "Keep my promises": "한 약속은 지킨다.",
    "Find it difficult to approach others": "남에게 먼저 다가가기 어렵다.",
    "Am always busy": "늘 바쁘다.",
    "Prefer variety to routine": "틀에 박힌 일상보다 변화를 선호한다.",
    "Love a good fight": "한판 제대로 붙는 것을 즐긴다.",
    "Work hard": "열심히 일한다.",
    "Go on binges": "때때로 폭식·폭음처럼 지나치게 빠져든다.",
    "Love excitement": "짜릿한 것을 아주 좋아한다.",
    "Love to read challenging material": "어려운 글을 읽는 것을 좋아한다.",
    "Believe that I am better than others": "내가 남들보다 낫다고 믿는다.",
    "Am always prepared": "늘 준비가 되어 있다.",
    "Panic easily": "쉽게 당황해 어쩔 줄 모른다.",
    "Radiate joy": "기쁨이 겉으로 뿜어져 나온다.",
    "Tend to vote for liberal political candidates": "진보적인 정치 후보에게 표를 주는 편이다.",
    "Sympathize with the homeless": "집 없는 사람들을 안쓰럽게 여긴다.",
    "Jump into things without thinking": "생각 없이 일에 뛰어든다.",
    "Fear for the worst": "최악의 상황을 두려워한다.",
    "Feel comfortable around people": "사람들 곁에 있으면 편안하다.",
    "Enjoy wild flights of fantasy": "자유분방한 공상을 즐긴다.",
    "Believe that others have good intentions": "남들이 선의를 갖고 있다고 믿는다.",
    "Excel in what I do": "내가 하는 일에서 뛰어나다.",
    "Get irritated easily": "쉽게 짜증이 난다.",
    "Talk to a lot of different people at parties": "모임에서 여러 사람과 두루 이야기한다.",
    "See beauty in things that others might not notice": "남들이 못 보고 지나치는 것에서 아름다움을 본다.",
    "Cheat to get ahead": "앞서 나가려고 속임수를 쓴다.",
    "Often forget to put things back in their proper place": "물건을 제자리에 두는 것을 자주 잊는다.",
    "Dislike myself": "나 자신이 싫다.",
    "Try to lead others": "남들을 이끌려고 한다.",
    "Feel others' emotions": "남의 감정을 함께 느낀다.",
    "Am concerned about others": "남들을 마음 써서 챙긴다.",
    "Tell the truth": "사실대로 말한다.",
    "Am afraid to draw attention to myself": "남의 이목을 끄는 것이 두렵다.",
    "Am always on the go": "늘 쉬지 않고 움직인다.",
    "Prefer to stick with things that I know": "아는 것을 고수하는 쪽을 택한다.",
    "Yell at people": "사람들에게 소리를 지른다.",
    "Do more than what's expected of me": "기대받는 것보다 더 많이 한다.",
    "Rarely overindulge": "지나치게 탐닉하는 일이 드물다.",
    "Seek adventure": "모험을 찾아 나선다.",
    "Avoid philosophical discussions": "철학적인 토론은 피한다.",
    "Think highly of myself": "스스로를 대단하다고 생각한다.",
    "Carry out my plans": "세운 계획을 실행한다.",
    "Become overwhelmed by events": "일이 닥치면 감당하지 못하고 압도된다.",
    "Have a lot of fun": "아주 즐겁게 지낸다.",
    "Believe that there is no absolute right and wrong": "절대적인 옳고 그름은 없다고 믿는다.",
    "Feel sympathy for those who are worse off than myself": "나보다 형편이 나쁜 사람들을 안쓰럽게 여긴다.",
    "Make rash decisions": "성급하게 결정한다.",
    "Am afraid of many things": "두려운 것이 많다.",
    "Avoid contacts with others": "남과의 접촉을 피한다.",
    "Love to daydream": "공상에 잠기는 것을 좋아한다.",
    "Trust what people say": "사람들이 하는 말을 믿는다.",
    "Handle tasks smoothly": "일을 매끄럽게 처리한다.",
    "Lose my temper": "울컥해서 화를 터뜨린다.",
    "Prefer to be alone": "혼자 있는 쪽을 택한다.",
    "Do not like poetry": "시를 좋아하지 않는다.",
    "Take advantage of others": "남을 이용해 이득을 본다.",
    "Leave a mess in my room": "내 방을 어질러 놓은 채 둔다.",
    "Am often down in the dumps": "자주 의기소침해진다.",
    "Take control of things": "상황을 내 손에 쥐고 이끈다.",
    "Rarely notice my emotional reactions": "내 감정 반응을 거의 알아차리지 못한다.",
    "Am indifferent to the feelings of others": "남의 감정에 무관심하다.",
    "Break rules": "규칙을 어긴다.",
    "Only feel comfortable with friends": "친구들과 있을 때만 편안하다.",
    "Do a lot in my spare time": "여가 시간에 이것저것 많이 한다.",
    "Dislike changes": "변화를 싫어한다.",
    "Insult people": "사람들에게 모욕적인 말을 한다.",
    "Do just enough work to get by": "겨우 넘어갈 만큼만 일한다.",
    "Easily resist temptations": "유혹을 쉽게 뿌리친다.",
    "Enjoy being reckless": "무모하게 구는 것을 즐긴다.",
    "Have difficulty understanding abstract ideas": "추상적인 생각을 이해하기 어렵다.",
    "Have a high opinion of myself": "나 자신에 대한 평가가 높다.",
    "Waste my time": "시간을 낭비한다.",
    "Feel that I'm unable to deal with things": "일을 감당할 수 없다고 느낀다.",
    "Love life": "사는 것이 좋다.",
    "Tend to vote for conservative political candidates": "보수적인 정치 후보에게 표를 주는 편이다.",
    "Am not interested in other people's problems": "남의 문제에는 관심이 없다.",
    "Rush into things": "서둘러 일에 달려든다.",
    "Get stressed out easily": "스트레스를 쉽게 받는다.",
    "Keep others at a distance": "남과 거리를 둔다.",
    "Like to get lost in thought": "생각에 빠져드는 것을 좋아한다.",
    "Distrust people": "사람들을 믿지 않는다.",
    "Know how to get things done": "일을 해내는 법을 안다.",
    "Am not easily annoyed": "웬만해선 짜증 내지 않는다.",
    "Avoid crowds": "사람 많은 곳을 피한다.",
    "Do not enjoy going to art museums": "미술관에 가는 것을 즐기지 않는다.",
    "Obstruct others' plans": "남의 계획을 방해한다.",
    "Leave my belongings around": "내 물건을 아무 데나 놓아둔다.",
    "Feel comfortable with myself": "나 자신이 편안하다.",
    "Wait for others to lead the way": "남이 앞장서기를 기다린다.",
    "Don't understand people who get emotional": "감정적으로 구는 사람들을 이해하지 못한다.",
    "Take no time for others": "남을 위해 시간을 내지 않는다.",
    "Break my promises": "약속을 어긴다.",
    "Am not bothered by difficult social situations": "껄끄러운 자리에서도 개의치 않는다.",
    "Like to take it easy": "느긋하게 지내는 것을 좋아한다.",
    "Am attached to conventional ways": "관례적인 방식에 애착이 있다.",
    "Get back at others": "당한 것은 되갚아 준다.",
    "Put little time and effort into my work": "내 일에 시간과 노력을 거의 들이지 않는다.",
    "Am able to control my cravings": "내 욕구를 조절할 수 있다.",
    "Act wild and crazy": "거칠고 제멋대로 군다.",
    "Am not interested in theoretical discussions": "이론적인 토론에는 관심이 없다.",
    "Boast about my virtues": "내 장점을 자랑한다.",
    "Have difficulty starting tasks": "일을 시작하기가 어렵다.",
    "Remain calm under pressure": "압박 속에서도 침착하다.",
    "Look at the bright side of life": "삶의 밝은 면을 본다.",
    "Believe that we should be tough on crime": "범죄에는 엄하게 대해야 한다고 믿는다.",
    "Try not to think about the needy": "어려운 사람들에 대해서는 생각하지 않으려 한다.",
    "Act without thinking": "생각 없이 행동한다.",
}
missing = [o['text'] for o in d if o['text'] not in KO]
assert not missing, missing
assert len(d) == 120

DOMAINS = [
    ('N', '신경성', 'Neuroticism', '감정이 흔들리기 쉬운 정도',
     {'high': '감정 반응이 크고 스트레스를 잘 받는다', 'mid': '감정 반응은 보통', 'low': '감정 기복이 적고 압박 속에서도 차분하다'}),
    ('E', '외향성', 'Extraversion', '사람·활동·자극을 향하는 정도',
     {'high': '사람들 속에서 기운이 나고 먼저 나선다', 'mid': '사람과 혼자 사이를 오간다', 'low': '조용하고 혼자 있는 쪽을 택한다'}),
    ('O', '개방성', 'Openness', '새로운 생각·감정·경험에 열린 정도',
     {'high': '새로운 생각·감정·경험에 열려 있다', 'mid': '익숙한 것과 새로운 것 사이', 'low': '익숙한 것과 눈앞의 현실을 택한다'}),
    ('A', '우호성', 'Agreeableness', '남을 믿고 맞춰 주는 정도',
     {'high': '남을 믿고 맞춰 주며 돕는다', 'mid': '맞춰 줄 때와 부딪칠 때가 반반', 'low': '할 말은 하고 쉽게 양보하지 않는다'}),
    ('C', '성실성', 'Conscientiousness', '계획하고 끝까지 해내는 정도',
     {'high': '계획대로 꼼꼼하게 끝까지 한다', 'mid': '필요할 때는 챙기고 아니면 느슨하다', 'low': '느슨하고 즉흥적이다'}),
]
FACETS = {
    'N1': ('불안', 'Anxiety'), 'N2': ('분노', 'Anger'), 'N3': ('우울', 'Depression'), 'N4': ('자의식', 'Self-consciousness'), 'N5': ('충동성', 'Immoderation'), 'N6': ('취약성', 'Vulnerability'),
    'E1': ('친밀성', 'Friendliness'), 'E2': ('사교성', 'Gregariousness'), 'E3': ('자기주장', 'Assertiveness'), 'E4': ('활동성', 'Activity level'), 'E5': ('자극 추구', 'Excitement-seeking'), 'E6': ('쾌활함', 'Cheerfulness'),
    'O1': ('상상', 'Imagination'), 'O2': ('예술적 관심', 'Artistic interests'), 'O3': ('정서 감수성', 'Emotionality'), 'O4': ('모험심', 'Adventurousness'), 'O5': ('지적 호기심', 'Intellect'), 'O6': ('진보성', 'Liberalism'),
    'A1': ('신뢰', 'Trust'), 'A2': ('도덕성', 'Morality'), 'A3': ('이타심', 'Altruism'), 'A4': ('협력', 'Cooperation'), 'A5': ('겸손', 'Modesty'), 'A6': ('동정심', 'Sympathy'),
    'C1': ('유능감', 'Self-efficacy'), 'C2': ('질서', 'Orderliness'), 'C3': ('책임감', 'Dutifulness'), 'C4': ('성취 추구', 'Achievement-striving'), 'C5': ('자기 규율', 'Self-discipline'), 'C6': ('신중함', 'Cautiousness'),
}

def js(s): return "'" + s.replace("\\", "\\\\").replace("'", "\\'") + "'"
lines = []
lines.append("""// 빅파이브 30세부 — IPIP-NEO-120 원문 120문항 (2층: 반응 모양 본체)
//
// 원형: IPIP-NEO-120 (Johnson, J. A., 2014, "Measuring thirty facets of the Five Factor Model with a 120-item public domain inventory", J. Research in Personality 51).
//   문항은 International Personality Item Pool(ipip.ori.org)의 것 — 공개 도메인(public domain).
//   120문항 목록·순서·세부·채점 방향은 rubynor/bigfive-web(MIT) 저장소의 en/questions.ts에서 가져왔다(Johnson의 IPIP-NEO-PI 소프트웨어 계통).
//   한국어 번역은 이 프로젝트의 것. 같은 저장소의 ko/questions.ts를 참고했으나 오역이 많아 영어 원문 기준으로 새로 옮겼다.
// 구조: 5영역(N·E·O·A·C) × 6세부 × 4문항. 문항 번호 i의 세부: 영역 = i%5 순환(N,E,O,A,C), 세부 = 5문항마다 1→6 순환.
// 형식: 문장 하나에 "이 인물에게 얼마나 들어맞는가" 1~5. keyed '-'면 역채점.
// 채점(facets): 세부마다 합(-8~+8), 영역마다 합(-48~+48), 비율로 높음/보통/낮음. (0.5.0: 환산 라벨은 뺐다 — 라벨은 다섯 검사 것만.)
//
// 이 파일은 scratchpad/gen_bigfive.py가 생성했다. 문항을 고칠 때는 생성기를 고치고 다시 만든다.

export const BIGFIVE = Object.freeze({
    id: 'bigfive',
    version: 1,
    name: '빅파이브 30세부 (IPIP-NEO-120 원문)',
    short: '빅파이브',
    theory: 'Big Five (IPIP-NEO-120)',
    tag: 'Big Five',
    axis: 'personality',
    format: 'likert',
    scale: { min: 1, max: 5, leftLabel: '전혀 아니다', rightLabel: '매우 그렇다' },
    scoring: { kind: 'facets' },
    source: {
        title: 'IPIP-NEO-120 (International Personality Item Pool)',
        author: 'Johnson (2014) / IPIP — 문항 데이터는 rubynor/bigfive-web (MIT) 경유',
        url: 'https://ipip.ori.org/',
        license: 'Public domain',
        note: '120문항 전체를 그대로 가져와 한국어로 번역했다. 공식 NEO-PI-R이 아니며 상업용 검사와 무관하다. 높음/보통/낮음 구간은 이 도구의 자체 기준이다.',
    },
    domains: [""")
for id_, name, en, desc, g in DOMAINS:
    lines.append(f"        {{ id: {js(id_)}, name: {js(name)}, en: {js(en)}, desc: {js(desc)}, gloss: {{ high: {js(g['high'])}, mid: {js(g['mid'])}, low: {js(g['low'])} }} }},")
lines.append("    ],\n    facets: [")
for fid, (name, en) in FACETS.items():
    lines.append(f"        {{ id: {js(fid)}, domain: {js(fid[0])}, name: {js(name)}, en: {js(en)} }},")
lines.append("    ],\n    items: [")
for o in d:
    fid = o['domain'] + str(o['facet'])
    k = '+' if o['keyed'] == 'plus' else '-'
    lines.append(f"        {{ id: 'b5_{o['n']:03d}', facet: {js(fid)}, keyed: {js(k)}, src: {js(o['text'])}, text: {js(KO[o['text']])} }},")
lines.append("    ],\n});\n")
open(__import__('os').path.join(__import__('os').path.dirname(__file__), '..', 'tests', 'bigfive.js'), 'w', encoding='utf-8').write('\n'.join(lines))
print('written', len(d))
