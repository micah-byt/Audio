# AI Audio Editor
웹소설 대본을 입력하고 오디오를 업로드하면, AI가 타임스탬프를 추출하고 문맥(장소/분위기)을 파악하여 알맞은 효과음과 BGM을 추천 및 믹싱해 주는 스튜디오 툴입니다.

## 폴더 구조
- `frontend/`: React + Vite 프론트엔드. Web Worker를 이용해 브라우저 단에서 Whisper STT 처리.
- `backend/`: FastAPI 백엔드. (현재는 프론트엔드 단독 처리로 전환 중)

## 실행 방법
`./start.sh` 스크립트를 실행하면 프론트엔드와 백엔드가 동시에 켜집니다.
