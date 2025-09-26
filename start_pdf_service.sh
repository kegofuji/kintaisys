#!/bin/bash

# FastAPI PDFサービスの起動スクリプト
cd fastapi_pdf_service

# 仮想環境をアクティベート（存在する場合）
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 依存関係をインストール
pip install -r requirements.txt

# FastAPIサービスを起動
python main.py
