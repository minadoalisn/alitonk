# ALI Charity Blog - 域名配置文档

## 🌐 域名信息

**主域名**: alicharity.blog
**博客URL**: https://alicharity.blog/
**博客文章URL**: https://alicharity.blog/blog/[article-name].html

---

## 📋 Sitemap 配置

### 主站 Sitemap
- URL: https://alicharity.blog/sitemap.xml
- 包含: 首页、博客首页、新闻页、所有文章

### 博客专用 Sitemap
- URL: https://alicharity.blog/blog-sitemap.xml
- 包含: 所有博客文章

---

## 🔗 内部链接结构

### 博客文章间的内链
使用绝对路径：
```
正确的: <a href="https://alicharity.blog/blog/another-article.html">
错误: <a href="/blog/another-article.html">
```

### 返回首页的链接
```
正确的: <a href="https://alicharity.blog/">
错误的: <a href="/">
```

### CTA链接到主站
```
正确的: <a href="https://minadoai.com/">
错误的: <a href="/">
```

---

## 📊 搜索引擎提交

### Google Search Console
1. 提交主站: https://alicharity.blog/sitemap.xml
2. 提交博客: https://alicharity.blog/blog-sitemap.xml

### Bing Webmaster
- 验证域名所有权
- 提交两个sitemap

---

## 🚀 下一步行动

1. ✅ 更新sitemap.xml（使用alicharity.blog）
2. ⏳ 更新robots.txt（如需要）
3. ⏳ 提交到Google Search Console
4. ⏳ 提交到Bing Webmaster
5. ⏳ 测试域名可访问性

---

**配置时间**: 2026-04-08 20:20 GMT+8
**配置状态**: ✅ sitemap已更新