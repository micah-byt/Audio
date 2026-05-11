/**
 * audioAI.js — Novel-optimized scene & event detection
 * Replaces all /api/* backend calls with pure JS logic
 */

// ── Novel Event Definitions ──────────────────────────────────────────────────
// Each entry: { label (Korean display), query (Freesound EN search), keywords (KO/EN triggers) }

export const NOVEL_EVENTS = [
  // 🚪 Actions / Objects
  { label: '문 열리는 소리',      query: 'door open creak wooden',          keywords: ['문을 열', '문이 열', '문을 당', '문을 밀', '문 열'], exclude: ['마음의', '말문', '기억의', '눈을'] },
  { label: '문 닫히는 소리',      query: 'door close slam shut',            keywords: ['문을 닫', '문이 닫', '닫힌다', '쾅'], exclude: ['마음의', '말문', '입을', '입술을', '마음을'] },
  { label: '발소리 (실내)',        query: 'footsteps indoor hardwood',       keywords: ['발걸음', '걸어갔', '걷기 시작', '다가왔', '다가갔', '계단을 올', '계단을 내'], exclude: ['마음이', '시간이', '운명이', '죽음이'] },
  { label: '발소리 (야외)',        query: 'footsteps outdoor gravel grass',  keywords: ['풀밭', '자갈', '숲길', '모래', '뛰어갔', '달려갔', '달렸다'], exclude: ['생각이 달려', '시간이 달려', '마음이'] },
  { label: '빗소리',              query: 'rain falling ambience',           keywords: ['비가 내', '빗소리', '빗줄기', '빗방울', '비가 쏟', '우산', '빗속'], exclude: ['비난', '비판', '땀비', '비웃'], isAmbience: true },
  { label: '천둥 번개',           query: 'thunder lightning storm',         keywords: ['천둥', '번개', '폭풍', '우레', '뇌성'], exclude: ['폭풍 같은', '번개처럼', '벼락 부자', '벼락치기'] },
  { label: '바람 소리',           query: 'wind blowing outdoor ambience',   keywords: ['바람이 불', '바람 소리', '바람에', '돌풍', '강풍', '산들바람'], exclude: ['신바람', '바람을 피', '헛바람'], isAmbience: true },
  { label: '불 / 촛불 소리',      query: 'fire crackling candle fireplace', keywords: ['불꽃', '촛불', '난로', '모닥불', '화염', '불이 타'], exclude: ['분노의 불', '사랑의 불', '열정의'], isAmbience: true },
  { label: '물 흐르는 소리',      query: 'water stream river flowing',      keywords: ['강물', '시냇물', '냇가', '물소리', '강가', '흐르는 물'], exclude: ['눈물이 흐르', '시간이 흐르', '세월이'], isAmbience: true },
  { label: '파도 소리',           query: 'ocean waves beach sea',           keywords: ['파도', '바다', '해변', '바닷가', '파도 소리', '바닷물'], exclude: ['감정의 파도', '분노의 파도', '슬픔의 바다'], isAmbience: true },
  { label: '숲 속 새소리',        query: 'forest birds chirping nature',    keywords: ['숲', '새 소리', '새가 울', '나무 사이', '숲 속', '나뭇잎', '나뭇가지'], exclude: ['빌딩 숲', '콘크리트 숲'], isAmbience: true },
  { label: '총소리',              query: 'gunshot pistol shot',             keywords: ['총소리', '총을 쏘', '방아쇠', '총성', '발포'], exclude: ['총알처럼', '시선이 쏘', '총체적'] },
  { label: '유리 깨지는 소리',    query: 'glass breaking shatter',          keywords: ['유리가 깨', '유리를 깨', '유리창', '산산조각'], exclude: ['마음이 깨', '분위기가 깨', '환상이 깨'] },
  { label: '전화 / 폰 알림',      query: 'phone ringing telephone bell',    keywords: ['전화가 울', '전화기', '핸드폰', '휴대폰', '벨소리', '전화벨'], exclude: [] },
  { label: '시계 소리',           query: 'clock ticking old mechanical',    keywords: ['시계', '초침', '째깍', '시계 소리'], exclude: ['생체 시계'] },
  { label: '자동차 소리',         query: 'car engine driving road',         keywords: ['자동차', '차 소리', '엔진', '경적', '클락션', '차가 달'], exclude: ['마차'] },
  { label: '군중 / 웅성거림',     query: 'crowd noise people murmur',       keywords: ['군중', '사람들', '웅성', '인파', '관중', '사람이 가득'], exclude: [], isAmbience: true },
  { label: '박수 소리',           query: 'applause clapping crowd',         keywords: ['박수', '환호', '박수 소리', '손뼉'], exclude: [] },
  { label: '싸움 / 충돌 소리',    query: 'fight punch impact hit thud',     keywords: ['주먹', '뺨을 때', '충돌', '격투', '싸웠다', '쓰러졌다'], exclude: ['의견 충돌', '가치관', '잠과 싸'] },
  { label: '칼 / 검 소리',        query: 'sword slash metal clash steel',   keywords: ['칼을 뽑', '칼이 번뜩', '칼을 겨누', '칼로 베', '검을 뽑', '검을 겨누', '장검', '단검', '칼부림', '베었다', '찌르다', '찌른다', '칼싸움', '검투'], exclude: [] },
  { label: '심장 소리 (긴장)',     query: 'heartbeat pulse tense',          keywords: ['심장이 빠르', '두근', '심장 소리', '가슴이 뛰'], exclude: ['설레어 두근', '사랑에 가슴이'] },
  { label: '밤 귀뚜라미 (자연)',   query: 'cricket night insects ambient',   keywords: ['귀뚜라미', '풀벌레', '여치', '시골의 밤', '숲속의 밤', '산속의 밤'], exclude: ['어둠의 자식', '칠흑 같은 마음'], isAmbience: true },
  { label: '도시 소음 / 밤거리',   query: 'city traffic street ambient',     keywords: ['여의도 거리', '도심', '도시의 밤', '번화가', '도로', '차량 소음', '골목길', '네온사인', '가로등'], exclude: [], isAmbience: true },
  { label: '카페 / 실내 소음',    query: 'cafe coffee shop indoor ambience',keywords: ['카페', '커피숍', '레스토랑', '식당', '카페에서'], exclude: [], isAmbience: true },
]

// ── BGM Mood Definitions ─────────────────────────────────────────────────────
export const BGM_MOODS = [
  { label: '긴장 / 서스펜스',   query: 'suspense tension dramatic orchestral',  keywords: ['두려움', '공포', '긴장', '불안', '위험', '무섭', '두근', '심장', '추격', '공격', '전투'] },
  { label: '슬픔 / 감성',       query: 'sad emotional melancholic piano',       keywords: ['슬프', '눈물', '이별', '죽음', '그리움', '외로움', '비극', '상실', '울었다', '눈물이'] },
  { label: '평화 / 일상',       query: 'peaceful calm ambient daily life',      keywords: ['평화', '일상', '따뜻', '여유', '산책', '조용', '한적', '평온'] },
  { label: '신비 / 판타지',     query: 'mysterious fantasy magical ethereal',   keywords: ['신비', '마법', '환상', '이상한', '기묘', '마술', '환상적', '마법사'] },
  { label: '활기 / 희망',       query: 'uplifting hopeful inspiring acoustic',  keywords: ['희망', '설렘', '기쁨', '웃음', '행복', '기대', '밝', '즐거'] },
  { label: '공포 / 호러',       query: 'horror dark creepy eerie ambient',     keywords: ['공포', '귀신', '귀신이', '저주', '악마', '어둠', '오싹', '소름', '그림자'] },
  { label: '액션 / 전투',       query: 'action battle epic cinematic drums',   keywords: ['전투', '싸움', '격투', '추격', '폭발', '공격', '방어', '전쟁'] },
  { label: '로맨스 / 설렘',     query: 'romantic love gentle piano strings',   keywords: ['사랑', '연인', '설레', '로맨스', '달콤', '포옹', '키스', '연애'] },
]

// ── Segment Analysis ─────────────────────────────────────────────────────────

/**
 * Detect sound events in a segment's text
 * Returns array of matched NOVEL_EVENTS
 */
const METAPHOR_SUFFIXES = ['처럼', '같이', '듯이', '인 양', '마냥'];

// 키워드 뒤에 이어지는 한글 복합어 끝 인덱스 반환
function compoundWordEnd(text, start) {
  let i = start;
  while (i < text.length) {
    const code = text.charCodeAt(i);
    if (code >= 0xAC00 && code <= 0xD7A3) i++;
    else break;
  }
  return i;
}

export function detectEvents(text) {
  return NOVEL_EVENTS.filter(event => {
    const hasRealKeyword = event.keywords.some(kw => {
      if (!text.includes(kw)) return false;
      let idx = 0;
      while ((idx = text.indexOf(kw, idx)) !== -1) {
        // 키워드 뒤 이어지는 한글까지 포함한 복합어 전체 + 여유 4자 확인
        const end = compoundWordEnd(text, idx + kw.length);
        const tail = text.slice(idx + kw.length, end + 4);
        // 복합어 내부나 직후에 비유 표현이 있으면 제외
        const isMetaphor = METAPHOR_SUFFIXES.some(suf => tail.includes(suf));
        if (!isMetaphor) return true;
        idx += kw.length;
      }
      return false;
    });
    if (!hasRealKeyword) return false;

    const hasExclude = event.exclude && event.exclude.some(ex => text.includes(ex));
    if (hasExclude) return false;

    return true;
  });
}

/**
 * Detect BGM mood from full text
 */
export function detectMood(text) {
  const scores = BGM_MOODS.map(mood => ({
    ...mood,
    score: mood.keywords.filter(kw => text.includes(kw)).length,
  }))
  scores.sort((a, b) => b.score - a.score)
  return scores[0].score > 0 ? scores[0] : BGM_MOODS[2] // default: 평화/일상
}

/**
 * Full novel analysis: returns events per segment + overall mood
 * @param {Array} segments [{id, start, end, text}]
 * @returns {{ events: Array, mood: object }}
 */
export function analyzeNovel(segments) {
  const fullText = segments.map(s => s.text).join(' ')
  const mood = detectMood(fullText)

  const events = []
  segments.forEach(seg => {
    const matched = detectEvents(seg.text)
    matched.forEach(event => {
      events.push({
        segmentId: seg.id,
        start: seg.start,
        end: seg.end,
        segmentText: seg.text,
        event,
      })
    })
  })

  return { events, mood }
}

/**
 * Advanced LLM analysis using OpenAI API.
 * Uses scriptText for forced-alignment logic/typo correction.
 */
export async function analyzeNovelLLM(segments, scriptText, apiKey) {
  if (!apiKey) {
    return analyzeNovel(segments) // Fallback to keyword matcher
  }

  const prompt = `
You are an expert audio director for a novel narration. 
Your task is to analyze the audio segments and assign background music (BGM) mood and specific sound effects (SFX) events based on the true context of the story.

Available BGM Moods:
${BGM_MOODS.map(m => `- ${m.label}`).join('\n')}

Available SFX Events:
${NOVEL_EVENTS.map(e => `- ${e.label}`).join('\n')}

Input Original Script (Use this to understand the true context and correct any STT typos):
"""
${scriptText || 'No original script provided.'}
"""

Input STT Segments:
${JSON.stringify(segments)}

Rules:
1. "BGM Mood": Choose ONE mood from the list that best fits the overall scene.
2. "SFX Events": Return an array of objects. Each object must have:
   - "segmentId": The exact ID of the segment where the sound should occur.
   - "eventLabel": The exact label from the 'Available SFX Events' list.
3. Be highly context-aware. If the script says "여의도 거리를 걷는다" (Walking in Yeouido city), choose "도시 소음 / 밤거리" and "발소리 (야외)". DO NOT choose "밤 귀뚜라미 (자연)" just because it's night.
4. DO NOT hallucinate events. Only use labels from the provided list.
5. NEVER trigger a sound effect for similes or metaphors. If a word like '칼날', '번개', '폭풍', '총알' appears with '처럼', '같이', '듯이', '인 양' (e.g. "칼날처럼 차가운 목소리", "번개처럼 빠른"), it is a figurative expression — do NOT add a sound effect for it. Only add sound effects for literal, physical events actually happening in the scene.
6. Consider the setting (modern/historical/fantasy). Do NOT place anachronistic sounds (e.g. '칼/검 소리' in a modern urban setting, '자동차 소리' in a historical setting) unless the scene explicitly calls for it.

Return ONLY a raw JSON object with the following structure (no markdown, no backticks):
{
  "bgm_mood_label": "...",
  "events": [
    { "segmentId": 0, "eventLabel": "..." }
  ]
}
`
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2 }
    })
  })

  if (!res.ok) {
    throw new Error('Gemini API request failed')
  }

  const data = await res.json()
  const rawText = data.candidates[0].content.parts[0].text.trim().replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '')
  const parsed = JSON.parse(rawText)

  // Map back to our objects
  const mood = BGM_MOODS.find(m => m.label === parsed.bgm_mood_label) || BGM_MOODS[2]
  
  const events = []
  if (parsed.events && Array.isArray(parsed.events)) {
    parsed.events.forEach(pe => {
      const seg = segments.find(s => s.id === pe.segmentId)
      const ev = NOVEL_EVENTS.find(e => e.label === pe.eventLabel)
      if (seg && ev) {
        events.push({
          segmentId: seg.id,
          start: seg.start,
          end: seg.end,
          segmentText: seg.text,
          event: ev,
        })
      }
    })
  }

  return { events, mood }
}


/**
 * Simple scoring fallback (kept for mixing step compatibility)
 */
export function analyzeScoring(segments, bgmFiles, sfxFiles) {
  const mapped_tracks = []
  if (bgmFiles.length > 0 && segments.length > 0) {
    mapped_tracks.push({ filename: bgmFiles[0], time: segments[0].start, type: 'bgm' })
  }
  return { mapped_tracks }
}

export function recommendSounds(segments) {
  const fullText = segments.map(s => s.text).join(' ')
  const mood = detectMood(fullText)
  return { bgm_mood: mood.label, recommended_sfx: [] }
}
