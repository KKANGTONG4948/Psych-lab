// 검사 목록. 새 검사는 여기에 추가한다.
// axis: 'values' = 가치관(무엇에 반응하나) / 'personality' = 성격(어떻게 반응하나). 두 축을 교차해 읽는다.
// 0.3.0: 정서 안정성(at)·MBTI(ojts)는 빅파이브와 겹쳐 목록에서 뺐다. OJTS 문항은 0.3.2에서 삭제(CC BY-NC-SA가 배포물에 따라붙지 않게).
// 0.5.0: 빅파이브에서 뽑던 환산 라벨(MBTI·A/T·에니어그램·대인 자세)도 뺐다 — 라벨은 다섯 검사 것만 남는다.
import { MFQ2 } from './mfq2.js';
import { SCHWARTZ } from './schwartz.js';
import { BIGFIVE } from './bigfive.js';
import { HH } from './hh.js';
import { VIA } from './via.js';

export const AXES = Object.freeze([
    { id: 'values', name: '가치관', desc: '무엇에 반응하나 — 중시하는 것 / 넘어가는 것' },
    { id: 'personality', name: '성격', desc: '어떻게 반응하나 — 반응의 모양' },
]);
export const AXIS_BY_ID = Object.freeze(Object.fromEntries(AXES.map(a => [a.id, a])));

export const TESTS = Object.freeze([MFQ2, SCHWARTZ, BIGFIVE, HH, VIA]);
export const TEST_BY_ID = Object.freeze(Object.fromEntries(TESTS.map(t => [t.id, t])));

// 아직 만들지 않은 검사 — 화면에 '준비 중'으로만 표시
export const PLANNED = Object.freeze([]);

// 0.3.0에서 목록에서 빠진 옛 검사 id. 기록이 남아 있어도 화면에 보이지 않는다.
export const RETIRED = Object.freeze(['at', 'ojts', 'via', 'hh']);
