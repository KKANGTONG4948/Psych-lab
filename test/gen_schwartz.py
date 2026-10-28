# 한국어 PVQ40(PQ IV Korean) → tests/schwartz.js 생성기.
# 입력: ORPC 저장소의 "PQ IV Korean.doc"를 LibreOffice로 UTF-8 텍스트로 바꾼 파일(남성판·여성판이 차례로 들어 있음)과 "Coding Key PVQ40.doc".
#   soffice --headless --convert-to 'txt:Text (encoded):UTF8' "PQ IV Korean.doc"
# 문항은 한 글자도 고치지 않는다(CC BY-NC-ND). 공백 정리만 한다.
import re, sys, os, json

src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/claude-0/-home-claude/f3a9e8c2-5cb0-5bc4-8758-28e272fe1858/scratchpad/pvq/out/ko.txt'
t = open(src, encoding='utf-8-sig').read()
parts = t.split('개인 프로파일 IVM')
assert len(parts) == 3, '남성판·여성판 두 벌이어야 한다'
def items(p):
    out = {}
    for n, txt in re.findall(r'^(\d+)\.\s*(.+)$', p, re.M):
        out[int(n)] = re.sub(r'\s+', ' ', txt).strip()
    return out
M, F = items(parts[1]), items(parts[2])
assert len(M) == 40 and len(F) == 40

# Coding Key PVQ40 (Schwartz, June 2021): 가치 → 문항 번호. 점수 = 문항 평균. 4방향 = 소속 가치 평균의 평균.
KEY = {
    'conformity': [7, 16, 28, 36], 'tradition': [9, 20, 25, 38], 'benevolence': [12, 18, 27, 33], 'universalism': [3, 8, 19, 23, 29, 40],
    'self_direction': [1, 11, 22, 34], 'stimulation': [6, 15, 30], 'hedonism': [10, 26, 37], 'achievement': [4, 13, 24, 32],
    'power': [2, 17, 39], 'security': [5, 14, 21, 31, 35],
}
assert sorted(n for v in KEY.values() for n in v) == list(range(1, 41))
VALUES = [
    ('self_direction', '자기지향', 'Self-Direction', '스스로 생각하고 정하고 자기 방식대로 하는 것',
        {'cond': '스스로 정하고 자기 방식대로 할 자유가 막히는 장면', 'react': '답답해하고 자기 방식을 지키려 한다'}, {'cond': '스스로 정하고 자기 방식대로 할 자유가 막히는 장면', 'react': '시키는 대로 해도 크게 개의치 않는다'}),
    ('stimulation', '자극', 'Stimulation', '새롭고 짜릿한 것, 모험',
        {'cond': '새롭고 짜릿한 일이나 모험이 생기는 장면', 'react': '먼저 뛰어든다'}, {'cond': '새롭고 짜릿한 일이나 모험이 생기는 장면', 'react': '굳이 끼지 않는다'}),
    ('hedonism', '쾌락', 'Hedonism', '즐거움, 재미, 편안함',
        {'cond': '즐길 거리나 편한 자리가 생기는 장면', 'react': '놓치지 않고 즐긴다'}, {'cond': '즐길 거리나 편한 자리가 생기는 장면', 'react': '크게 끌리지 않는다'}),
    ('achievement', '성취', 'Achievement', '능력을 보여 주고 성과로 인정받는 것',
        {'cond': '능력을 보여 주거나 성과로 인정받을 기회, 경쟁이 생기는 장면', 'react': '나서서 보여 주려 한다'}, {'cond': '능력을 보여 주거나 경쟁이 생기는 장면', 'react': '굳이 나서서 증명하려 하지 않는다'}),
    ('power', '권력', 'Power', '돈, 지위, 결정권',
        {'cond': '돈·지위·결정권이 걸린 장면', 'react': '쥐려 하고 양보하지 않는다'}, {'cond': '돈·지위·결정권이 걸린 장면', 'react': '집착하지 않는다'}),
    ('security', '안전', 'Security', '자신·가족·소속의 안전과 질서',
        {'cond': '자신·가족·소속의 안전이나 질서가 위협받는 장면', 'react': '먼저 안전을 챙기고 위험을 피한다'}, {'cond': '안전이나 질서가 위협받는 장면', 'react': '위험이 있어도 크게 신경 쓰지 않는다'}),
    ('conformity', '순응', 'Conformity', '규칙과 예의를 지키고 남을 거스르지 않는 것',
        {'cond': '규칙·예의를 어기거나 남을 거슬리게 할 수 있는 장면', 'react': '규칙을 지키고 자제한다'}, {'cond': '규칙·예의를 어기거나 남을 거슬리게 할 수 있는 장면', 'react': '규칙이나 체면에 얽매이지 않는다'}),
    ('tradition', '전통', 'Tradition', '관습, 종교, 겸손',
        {'cond': '관습·종교·집안의 전통이 걸린 장면', 'react': '전통을 따르고 지키려 한다'}, {'cond': '관습·종교·집안의 전통이 걸린 장면', 'react': '전통에 크게 얽매이지 않는다'}),
    ('benevolence', '박애', 'Benevolence', '가까운 사람을 돕고 의리를 지키는 것',
        {'cond': '가까운 사람(친구·가족·동료)이 도움이 필요하거나 믿음을 거는 장면', 'react': '충실하게 돕고 곁을 지킨다'}, {'cond': '가까운 사람이 도움이 필요한 장면', 'react': '꼭 나서지는 않는다'}),
    ('universalism', '보편주의', 'Universalism', '모든 사람과 자연에 대한 공평함과 보호',
        {'cond': '낯선 사람·약자·자연이 부당하게 다뤄지는 장면', 'react': '모두에게 공평하길 바라고 지키려 한다'}, {'cond': '낯선 사람·약자·자연이 부당하게 다뤄지는 장면', 'react': '나와 먼 일이라 크게 반응하지 않는다'}),
]
HIGHER = [
    ('openness', '변화 개방', 'Openness to Change', ['self_direction', 'stimulation', 'hedonism']),
    ('conservation', '보존', 'Conservation', ['security', 'conformity', 'tradition']),
    ('enhancement', '자기 고양', 'Self-Enhancement', ['achievement', 'power']),
    ('transcendence', '자기 초월', 'Self-Transcendence', ['universalism', 'benevolence']),
]
cat_of = {n: v for v, ns in KEY.items() for n in ns}
def js(s): return "'" + s.replace('\\', '\\\\').replace("'", "\\'") + "'"
L = []
L.append("""// Schwartz 10가치 — 한국어 PVQ40(PQ IV Korean) 원문 40문항 (가치관 축)
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
    categories: [""")
for vid, name, en, desc, hi, lo in VALUES:
    L.append(f"        {{ id: {js(vid)}, name: {js(name)}, en: {js(en)}, desc: {js(desc)},\n            high: {{ cond: {js(hi['cond'])}, react: {js(hi['react'])} }}, low: {{ cond: {js(lo['cond'])}, react: {js(lo['react'])} }} }},")
L.append("    ],\n    // 4방향(상위 가치): 소속 가치 점수의 평균. 채점표의 'Scoring Key for four Higher Order Values' 그대로.\n    higher: [")
for hid, name, en, members in HIGHER:
    L.append(f"        {{ id: {js(hid)}, name: {js(name)}, en: {js(en)}, members: [{', '.join(js(m) for m in members)}] }},")
L.append("    ],\n    items: [")
for n in range(1, 41):
    L.append(f"        {{ id: 'pvq_{n:02d}', category: {js(cat_of[n])}, keyed: '+', text: {js(M[n])}, textF: {js(F[n])} }},")
L.append("    ],\n});\n")
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tests', 'schwartz.js')
open(out, 'w', encoding='utf-8').write('\n'.join(L))
print('written', out)
