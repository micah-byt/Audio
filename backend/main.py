from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
import whisper
import tempfile
import os
import shutil

from transformers import pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("bgm_library", exist_ok=True)
app.mount("/bgm", StaticFiles(directory="bgm_library"), name="bgm")

print("Loading Whisper model (tiny)...")
model = whisper.load_model("tiny")
print("Whisper model loaded!")

print("Loading NLP Sentiment Model (zero-shot/classifier)...")
sentiment_analyzer = pipeline("text-classification", model="snunlp/KR-FinBert-SC")
print("NLP model loaded!")

@app.get("/")
def read_root():
    return {"status": "ok", "message": "Backend is running"}

# --- Models ---
class Segment(BaseModel):
    id: int
    start: float
    end: float
    text: str

class ScoringRequest(BaseModel):
    segments: List[Segment]
    bgm_files: List[str]
    sfx_files: List[str]

class RecommendRequest(BaseModel):
    segments: List[Segment]

# --- Endpoints ---

@app.post("/api/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    temp_dir = tempfile.gettempdir()
    file_path = os.path.join(temp_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    try:
        print(f"Transcribing {file.filename}...")
        result = model.transcribe(file_path, word_timestamps=False)
        
        segments = result.get("segments", [])
        full_text = result["text"].strip()
        
        os.remove(file_path)
        
        return {
            "text": full_text,
            "segments": [
                {
                    "id": s["id"],
                    "start": s["start"],
                    "end": s["end"],
                    "text": s["text"].strip()
                } for s in segments
            ]
        }
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        return {"error": str(e)}

@app.post("/api/recommend-sounds")
async def recommend_sounds(req: RecommendRequest):
    if not req.segments:
        return {"bgm_mood": "알 수 없음", "recommended_sfx": []}
    
    first_text = " ".join([s.text for s in req.segments[:5]])
    full_text = " ".join([s.text for s in req.segments])
    
    mood = "차분하고 일상적인 BGM"
    try:
        sentiment = sentiment_analyzer(first_text[:512])[0]
        label = sentiment['label']
        if label == 'positive':
            mood = "밝고 긍정적이며 경쾌한 분위기의 BGM"
        elif label == 'negative':
            mood = "어둡고 진지하거나 슬픈 분위기의 BGM"
    except:
        pass

    sfx_list = set()
    
    # 1. 배경음/앰비언스 (Ambiance) 문맥 추출
    is_city = any(w in full_text for w in ["여의도", "거리", "도시", "도심", "시내", "차로", "빌딩", "도로", "건물", "서울"])
    is_nature = any(w in full_text for w in ["시골", "산", "바다", "숲", "자연", "마을", "풀밭", "계곡"])
    is_night = any(w in full_text for w in ["밤", "저녁", "새벽", "어둠", "야간"])
    
    if is_city:
        if is_night:
            sfx_list.add("도시의 밤거리 소음 (자동차, 멀리서 들리는 경적)")
        else:
            sfx_list.add("도시/거리 백그라운드 소음 (자동차, 웅성거림)")
    elif is_nature or (is_night and not is_city): # 도시가 아니면 자연의 밤으로 추정
        if is_night:
            sfx_list.add("밤의 자연 소리 (귀뚜라미, 풀벌레, 부엉이)")
        else:
            sfx_list.add("낮의 자연 소리 (새소리, 바람, 물소리)")

    # 2. 동작 및 이벤트 효과음 (Foley/Event FX)
    if any(w in full_text for w in ["박수", "축하", "환호", "clap", "拍手", "歡呼", "慶祝"]):
        sfx_list.add("박수/환호성 소리")
    if any(w in full_text for w in ["폭발", "쾅", "사고", "boom", "爆炸", "轟"]):
        sfx_list.add("폭발/충돌 소리")
    if any(w in full_text for w in ["웃음", "하하", "ㅋㅋ", "laugh", "笑", "哈哈"]):
        sfx_list.add("웃음 소리")
    if any(w in full_text for w in ["발걸음", "걷", "뛰", "walk", "步", "走"]):
        sfx_list.add("발걸음 소리")
    if any(w in full_text for w in ["문", "열", "닫", "door", "門", "開門", "關門"]):
        sfx_list.add("문 여닫는 소리")
    if any(w in full_text for w in ["차", "자동차", "운전", "시동"]):
        sfx_list.add("자동차 시동/주행 소리")
        
    return {
        "bgm_mood": mood,
        "recommended_sfx": list(sfx_list)
    }

@app.post("/api/analyze-scoring")
async def analyze_scoring(req: ScoringRequest):
    mapped_tracks = []
    
    # BGM 매핑
    if req.bgm_files and req.segments:
        first_text = " ".join([s.text for s in req.segments[:3]])
        current_bgm = req.bgm_files[0]
        
        try:
            sentiment = sentiment_analyzer(first_text[:512])[0]
            label = sentiment['label']
            if label == 'positive':
                for bf in req.bgm_files:
                    if any(w in bf.lower() for w in ['happy', 'bright', '신나', '밝', '기쁨']): current_bgm = bf; break
            elif label == 'negative':
                for bf in req.bgm_files:
                    if any(w in bf.lower() for w in ['sad', 'dark', '우울', '슬프', '어두']): current_bgm = bf; break
        except:
            pass
            
        mapped_tracks.append({"filename": current_bgm, "time": req.segments[0].start, "type": "bgm"})
        
        for s in req.segments[3:]:
            target_bgm = None
            if any(w in s.text for w in ["슬프", "우울", "sad", "悲", "哭"]):
                for bf in req.bgm_files:
                    if any(w in bf.lower() for w in ['sad', 'dark', '우울', '슬프']): target_bgm = bf
            elif any(w in s.text for w in ["기쁘", "행복", "최고", "happy", "樂", "喜"]):
                for bf in req.bgm_files:
                    if any(w in bf.lower() for w in ['happy', 'bright', '신나', '밝']): target_bgm = bf
            elif any(w in s.text for w in ["무섭", "조심", "scary", "怕", "驚"]):
                for bf in req.bgm_files:
                    if any(w in bf.lower() for w in ['tense', 'scary', '긴장', '무섭']): target_bgm = bf
            
            if target_bgm and target_bgm != current_bgm:
                current_bgm = target_bgm
                mapped_tracks.append({"filename": current_bgm, "time": s.start, "type": "bgm"})
                break
    
    # SFX 및 앰비언스 매핑
    if req.sfx_files and req.segments:
        current_location = "neutral"
        current_time = "day"

        for s in req.segments:
            text = s.text
            t = s.start
            
            # 문맥(Context) 업데이트
            if any(w in text for w in ["여의도", "거리", "도시", "도심", "도로"]):
                current_location = "city"
            elif any(w in text for w in ["시골", "산", "숲", "자연"]):
                current_location = "nature"
                
            if any(w in text for w in ["밤", "저녁", "야간", "어둠"]):
                current_time = "night"
            elif any(w in text for w in ["낮", "아침", "햇살"]):
                current_time = "day"

            matched_sfx = None
            
            # 1. 문맥에 따른 배경/앰비언스 효과음 매핑 (장소가 언급되었을 때만)
            if any(w in text for w in ["여의도", "거리", "도시", "도심"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['city', 'traffic', '차', '도로', '도시']): matched_sfx = sf
            elif any(w in text for w in ["밤"]) and current_location == "nature":
                for sf in req.sfx_files:
                    # 자연의 밤일 때만 귀뚜라미 매칭
                    if any(w in sf.lower() for w in ['cricket', 'night', '귀뚜라미', '벌레']): matched_sfx = sf

            # 2. 동작(Foley) 매핑
            if any(w in text for w in ["박수", "축하", "최고", "환호", "clap", "拍手", "歡呼", "慶祝"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['clap', '박수', '환호']): matched_sfx = sf
            elif any(w in text for w in ["폭발", "쾅", "충격", "사고", "boom", "爆炸", "轟"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['boom', '폭발', '쾅', '충돌']): matched_sfx = sf
            elif any(w in text for w in ["웃음", "하하", "ㅋㅋ", "재밌", "laugh", "笑", "哈哈"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['laugh', '웃음', '하하']): matched_sfx = sf
            elif any(w in text for w in ["발걸음", "걷", "뛰", "walk", "步", "走"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['walk', 'step', '발걸음', '걷']): matched_sfx = sf
            elif any(w in text for w in ["문", "열", "닫", "door", "門", "開門", "關門"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['door', 'open', '문', '열']): matched_sfx = sf
            elif any(w in text for w in ["차", "자동차"]):
                for sf in req.sfx_files:
                    if any(w in sf.lower() for w in ['car', '차', '운전']): matched_sfx = sf
            
            if matched_sfx:
                mapped_tracks.append({"filename": matched_sfx, "time": t, "type": "sfx"})

    return {"mapped_tracks": mapped_tracks}

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend/dist"))
@app.get("/{catchall:path}")
async def serve_frontend(catchall: str):
    if not os.path.exists(frontend_dist):
        return {"error": "Frontend build not found. Please run 'npm run build' in frontend directory."}
    file_path = os.path.join(frontend_dist, catchall)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    return FileResponse(os.path.join(frontend_dist, "index.html"))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
