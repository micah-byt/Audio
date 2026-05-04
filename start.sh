#!/bin/bash

# ===========================
# AI 오디오 에디터 시작 스크립트
# ===========================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
BACKEND_DIR="$SCRIPT_DIR/backend"
NGROK_DOMAIN="gunning-shaded-stea.ngrok-free.dev"

echo "🎵 AI 오디오 에디터 시작 중..."
echo ""

# 기존 프로세스 종료
echo "🔄 기존 프로세스 정리 중..."
pkill -f "uvicorn" 2>/dev/null
pkill -f "python main.py" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 1

# 1단계: 프론트엔드 빌드
echo "🔨 [1/3] 프론트엔드 빌드 중..."
cd "$FRONTEND_DIR"
npm run build
if [ $? -ne 0 ]; then
    echo "❌ 프론트엔드 빌드 실패!"
    exit 1
fi
echo "✅ 프론트엔드 빌드 완료!"
echo ""

# 2단계: 백엔드 서버 시작
echo "🚀 [2/3] 백엔드 서버 시작 중 (포트 8000)..."
cd "$BACKEND_DIR"
source venv/bin/activate
python main.py &
BACKEND_PID=$!
echo "✅ 백엔드 PID: $BACKEND_PID"
sleep 3
echo ""

# 3단계: ngrok 터널 시작 (고정 도메인)
echo "🌐 [3/3] 고정 URL 터널 시작 중..."
echo ""
echo "========================================"
echo "  팀원 접속 주소 (고정! 항상 동일)"
echo "  https://$NGROK_DOMAIN"
echo "========================================"
echo ""
echo "💡 이 주소를 팀원들에게 공유하세요!"
echo "   (맥북이 켜져 있는 동안 항상 접속 가능)"
echo ""
echo "종료하려면 Ctrl+C 를 누르세요."
echo ""

ngrok http --url=$NGROK_DOMAIN 8000

# 종료 시 정리
trap "echo '서버 종료 중...'; kill $BACKEND_PID 2>/dev/null; pkill -f 'python main.py'" EXIT
