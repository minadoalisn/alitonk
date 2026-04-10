#!/bin/bash
# 🚨 ALI Charity 完美版本回滚脚本
# 版本: v2026-04-11-perfect
# 用途: 生产环境崩溃紧急回滚

set -e

echo "🔄 ALI Charity 完美版本回滚脚本"
echo "================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查目录
if [ ! -f "VERSION_INFO.md" ]; then
    echo -e "${RED}❌ 错误: 请在备份目录中运行此脚本${NC}"
    exit 1
fi

BACKUP_DIR="$(pwd)"
PROJECT_DIR="/workspace/projects/workspace/alitonk"
PUBLIC_DIR="${PROJECT_DIR}/public"

echo "📂 备份目录: ${BACKUP_DIR}"
echo "🎯 目标目录: ${PUBLIC_DIR}"
echo ""

# 确认回滚
read -p "⚠️  确定要回滚到完美版本吗？此操作将覆盖当前文件 [y/N]: " confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏹️  回滚已取消${NC}"
    exit 0
fi

echo ""
echo "🔄 开始回滚..."
echo ""

# 备份当前状态（以防万一）
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SAFETY_BACKUP="${PROJECT_DIR}/safety-backup-${TIMESTAMP}"
mkdir -p "${SAFETY_BACKUP}"
cp "${PUBLIC_DIR}/index.html" "${SAFETY_BACKUP}/" 2>/dev/null || true
cp "${PUBLIC_DIR}/donate.html" "${SAFETY_BACKUP}/" 2>/dev/null || true
cp "${PUBLIC_DIR}/token.html" "${SAFETY_BACKUP}/" 2>/dev/null || true
cp "${PUBLIC_DIR}/whitepaper.html" "${SAFETY_BACKUP}/" 2>/dev/null || true
echo -e "${GREEN}✅ 已创建安全备份: ${SAFETY_BACKUP}${NC}"

# 恢复文件
FILES=(
    "index.html:index.html.backup"
    "donate.html:donate.html.backup"
    "token.html:token.html.backup"
    "whitepaper.html:whitepaper.html.backup"
    "about.html:about.html.backup"
    "team.html:team.html.backup"
    "faq.html:faq.html.backup"
)

for file_pair in "${FILES[@]}"; do
    IFS=':' read -r target source <<< "$file_pair"
    if [ -f "${BACKUP_DIR}/${source}" ]; then
        cp "${BACKUP_DIR}/${source}" "${PUBLIC_DIR}/${target}"
        echo -e "${GREEN}✅ 已恢复: ${target}${NC}"
    else
        echo -e "${YELLOW}⚠️  跳过: ${source} 不存在${NC}"
    fi
done

echo ""
echo "🚀 部署到服务器..."
scp -i ~/.ssh/render_deploy -o StrictHostKeyChecking=no \
    "${PUBLIC_DIR}/index.html" \
    "${PUBLIC_DIR}/donate.html" \
    "${PUBLIC_DIR}/token.html" \
    "${PUBLIC_DIR}/whitepaper.html" \
    srv-d75j3ra4d50c73cha150@ssh.singapore.render.com:/tmp/ 2>/dev/null || true

ssh -i ~/.ssh/render_deploy -o StrictHostKeyChecking=no \
    srv-d75j3ra4d50c73cha150@ssh.singapore.render.com \
    "cp /tmp/index.html public/ && \
     cp /tmp/donate.html public/ && \
     cp /tmp/token.html public/ && \
     cp /tmp/whitepaper.html public/ && \
     echo '✅ Server updated'" 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 回滚完成！${NC}"
echo ""
echo "📋 验证清单:"
echo "   - 访问 https://minadoai.com"
echo "   - 检查捐赠功能"
echo "   - 检查语言切换"
echo "   - 检查移动端显示"
echo ""
echo "🔒 如需恢复回滚前的状态，使用安全备份:"
echo "   ${SAFETY_BACKUP}"
echo ""
