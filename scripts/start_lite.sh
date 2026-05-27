#!/bin/bash
# SyncHire Lite - 快速启动脚本

set -e

echo "🚀 启动 SyncHire Lite..."
echo ""

# 检查Python版本
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到Python3"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "main_lite.py" ]; then
    echo "❌ 错误: 请在api目录中运行此脚本"
    echo "   使用: cd api && bash ../scripts/start_lite.sh"
    exit 1
fi

# 检查虚拟环境
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
    echo "✅ 虚拟环境已创建"
fi

# 激活虚拟环境
echo "🔧 激活虚拟环境..."
source venv/bin/activate

# 安装依赖
if [ ! -f ".installed" ]; then
    echo "📦 安装依赖..."
    pip install -q -r requirements_lite.txt
    touch .installed
    echo "✅ 依赖已安装"
fi

# 检查环境配置
if [ ! -f ".env.lite" ]; then
    echo "⚠️  警告: 未找到.env.lite配置文件"
    echo "   从.env.example创建..."
    cp .env.example .env.lite
    echo "✅ 已创建.env.lite"
    echo "   ⚠️  请编辑.env.lite添加您的AI API密钥"
    echo ""
fi

# 运行设置脚本
if [ -f "../scripts/setup_lite.py" ]; then
    echo "🔧 运行设置脚本..."
    python ../scripts/setup_lite.py
fi

# 启动应用
echo ""
echo "🎉 启动SyncHire Lite..."
echo "   后端: http://localhost:8000"
echo "   API文档: http://localhost:8000/docs"
echo ""
echo "按Ctrl+C停止服务器"
echo ""

python main_lite.py
