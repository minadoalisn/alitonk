"""Collect low-rate GEO/SEO research signals for ALI Charity promotion.

The script uses Scrapling's static Fetcher when available and falls back to
Python's standard library so the automation remains auditable and resilient.
It only reads public pages, obeys robots.txt by default, and writes research
notes under memory/research instead of publishing scraped text.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser


ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = ROOT / "memory" / "research" / "geo-seo"
USER_AGENT = "ALI-Charity-GEO-SEO-Research/1.0 (+https://minadoai.com)"

OWNED_URLS = [
    "https://minadoai.com/",
    "https://minadoai.com/blog/",
    "https://minadoai.com/promotion.html",
    "https://minadoai.com/llms.txt",
    "https://minadoai.com/dex-launch.html",
]

REFERENCE_URLS = [
    "https://www.thegivingblock.com/resources/",
    "https://www.cafonline.org/about-us/publications",
    "https://www.wfp.org/",
    "https://www.unhcr.org/",
]

KEYWORDS = [
    "crypto charity",
    "blockchain charity",
    "transparent giving",
    "crypto donations",
    "stablecoin donations",
    "humanitarian aid",
    "web3 philanthropy",
    "on-chain donation tracking",
    "ALI Token",
]


@dataclass
class PageSignal:
    url: str
    status: int | None
    title: str
    description: str
    h1: list[str]
    h2: list[str]
    canonical: str
    schema_types: list[str]
    faq_questions: list[str]
    matched_keywords: list[str]
    internal_links: list[str]
    external_links: list[str]
    fetcher: str
    error: str = ""


class MetadataParser(HTMLParser):
    def __init__(self, base_url: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.title_parts: list[str] = []
        self.meta_description = ""
        self.canonical = ""
        self.h1: list[str] = []
        self.h2: list[str] = []
        self.links: list[str] = []
        self.schema_blocks: list[str] = []
        self._capture: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr = {key.lower(): value or "" for key, value in attrs}
        tag = tag.lower()
        if tag == "title":
            self._capture = "title"
        elif tag in {"h1", "h2"}:
            self._capture = tag
        elif tag == "script" and attr.get("type", "").lower() == "application/ld+json":
            self._capture = "schema"
        elif tag == "meta" and attr.get("name", "").lower() == "description":
            self.meta_description = clean_text(attr.get("content", ""))
        elif tag == "link" and attr.get("rel", "").lower() == "canonical":
            self.canonical = urljoin(self.base_url, attr.get("href", ""))
        elif tag == "a" and attr.get("href"):
            self.links.append(urljoin(self.base_url, attr["href"]))

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in {"title", "h1", "h2", "script"}:
            self._capture = None

    def handle_data(self, data: str) -> None:
        text = clean_text(data)
        if not text:
            return
        if self._capture == "title":
            self.title_parts.append(text)
        elif self._capture == "h1":
            self.h1.append(text)
        elif self._capture == "h2":
            self.h2.append(text)
        elif self._capture == "schema":
            self.schema_blocks.append(data.strip())


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def detect_schema_types(blocks: Iterable[str]) -> list[str]:
    types: set[str] = set()
    for block in blocks:
        for match in re.finditer(r'"@type"\s*:\s*"([^"]+)"', block):
            types.add(match.group(1))
        for match in re.finditer(r'"@type"\s*:\s*\[([^\]]+)\]', block):
            for item in re.findall(r'"([^"]+)"', match.group(1)):
                types.add(item)
    return sorted(types)


def faq_questions_from_text(text: str) -> list[str]:
    candidates = re.findall(r"(?:^|[>\n\r])\s*([^<>\n\r?]{12,110}\?)", text)
    seen: list[str] = []
    for question in candidates:
        clean = clean_text(question)
        if clean and clean not in seen:
            seen.append(clean)
    return seen[:8]


def split_links(base_url: str, links: Iterable[str]) -> tuple[list[str], list[str]]:
    base_host = urlparse(base_url).netloc.lower()
    internal: list[str] = []
    external: list[str] = []
    for link in links:
        parsed = urlparse(link)
        if parsed.scheme not in {"http", "https"}:
            continue
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
        target = internal if parsed.netloc.lower() == base_host else external
        if normalized not in target:
            target.append(normalized)
    return internal[:20], external[:20]


def robots_allowed(url: str, ignore_robots: bool) -> bool:
    if ignore_robots:
        return True
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = RobotFileParser()
    parser.set_url(robots_url)
    try:
        parser.read()
    except Exception:
        return True
    return parser.can_fetch(USER_AGENT, url)


def fetch_with_scrapling(url: str) -> tuple[int | None, str, str]:
    from scrapling.fetchers import Fetcher  # type: ignore

    page = Fetcher.get(url, headers={"User-Agent": USER_AGENT}, timeout=30000)
    body = getattr(page, "text", None) or getattr(page, "html", None)
    if body is None:
        raw_body = getattr(page, "body", b"")
        body = raw_body.decode("utf-8", errors="replace") if isinstance(raw_body, bytes) else str(raw_body)
    return getattr(page, "status", None), str(body), "scrapling.Fetcher"


def fetch_with_stdlib(url: str) -> tuple[int | None, str, str]:
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        body = response.read().decode(response.headers.get_content_charset() or "utf-8", errors="replace")
        return response.status, body, "urllib"


def fetch_page(url: str, ignore_robots: bool) -> PageSignal:
    if not robots_allowed(url, ignore_robots):
        return PageSignal(url, None, "", "", [], [], "", [], [], [], [], [], "robots", "Blocked by robots.txt")

    try:
        try:
            status, html, fetcher = fetch_with_scrapling(url)
        except Exception:
            status, html, fetcher = fetch_with_stdlib(url)

        parser = MetadataParser(url)
        parser.feed(html)
        text = clean_text(re.sub(r"<[^>]+>", " ", html))
        internal_links, external_links = split_links(url, parser.links)
        lowered = f"{parser.title_parts} {parser.meta_description} {parser.h1} {parser.h2} {text[:2500]}".lower()

        return PageSignal(
            url=url,
            status=status,
            title=clean_text(" ".join(parser.title_parts))[:180],
            description=parser.meta_description[:260],
            h1=parser.h1[:8],
            h2=parser.h2[:16],
            canonical=parser.canonical,
            schema_types=detect_schema_types(parser.schema_blocks),
            faq_questions=faq_questions_from_text(html),
            matched_keywords=[keyword for keyword in KEYWORDS if keyword.lower() in lowered],
            internal_links=internal_links,
            external_links=external_links,
            fetcher=fetcher,
        )
    except Exception as exc:
        return PageSignal(url, None, "", "", [], [], "", [], [], [], [], [], "error", str(exc)[:220])


def build_gap_summary(records: list[PageSignal]) -> list[str]:
    owned = [record for record in records if urlparse(record.url).netloc == "minadoai.com"]
    gaps: list[str] = []

    for record in owned:
        is_llms = record.url.endswith("/llms.txt")
        if not is_llms and "FAQPage" not in record.schema_types and len(record.faq_questions) < 2:
            gaps.append(f"Add concise FAQ/schema answers to {record.url}.")
        if "ALI Token" not in record.matched_keywords and "dex-launch" in record.url:
            gaps.append("Refresh DEX launch page wording around ALI Token, ALI/USDT, and donation utility.")
        if is_llms and len(record.matched_keywords) < 5:
            gaps.append("Expand llms.txt entity coverage for AI answer engines.")
        if not record.description and not is_llms:
            gaps.append(f"Add or repair meta description on {record.url}.")

    all_matches = {keyword for record in records for keyword in record.matched_keywords}
    for keyword in KEYWORDS:
        if keyword not in all_matches:
            gaps.append(f"Create or strengthen owned content for '{keyword}'.")

    return gaps[:12]


def write_outputs(records: list[PageSignal], gaps: list[str], date_string: str) -> tuple[Path, Path]:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    jsonl_path = OUTPUT_DIR / "latest.jsonl"
    md_path = OUTPUT_DIR / "latest.md"

    with jsonl_path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")

    lines = [
        f"# ALI Charity GEO/SEO Research Brief - {date_string}",
        "",
        "## Scope",
        "",
        "- Owned pages: minadoai.com homepage, blog, promotion hub, llms.txt, and DEX preparation page.",
        "- Reference pages: public crypto philanthropy and humanitarian context pages.",
        "- Collection policy: public pages only, low rate, robots-aware by default, no copied article body republishing.",
        "",
        "## Content Gaps",
        "",
    ]
    lines.extend([f"- {gap}" for gap in gaps] or ["- No immediate high-priority content gap detected."])
    lines.extend(["", "## Page Signals", ""])
    for record in records:
        status = record.status if record.status is not None else "n/a"
        lines.extend(
            [
                f"### {record.url}",
                "",
                f"- Status: {status}",
                f"- Fetcher: {record.fetcher}",
                f"- Title: {record.title or 'n/a'}",
                f"- Matched keywords: {', '.join(record.matched_keywords) or 'none'}",
                f"- Schema types: {', '.join(record.schema_types) or 'none'}",
                f"- H2 topics: {', '.join(record.h2[:6]) or 'none'}",
                f"- Error: {record.error or 'none'}",
                "",
            ]
        )

    md_path.write_text("\n".join(lines), encoding="utf-8")
    return jsonl_path, md_path


def main() -> int:
    parser = argparse.ArgumentParser(description="Run ALI Charity GEO/SEO research collection.")
    china_standard_time = timezone(timedelta(hours=8), name="Asia/Shanghai")
    parser.add_argument("--date", default=datetime.now(china_standard_time).strftime("%Y-%m-%d"))
    parser.add_argument("--ignore-robots", action="store_true")
    parser.add_argument("--delay", type=float, default=2.0)
    parser.add_argument("--extra-url", action="append", default=[])
    args = parser.parse_args()

    urls = list(dict.fromkeys([*OWNED_URLS, *REFERENCE_URLS, *args.extra_url]))
    records: list[PageSignal] = []
    for index, url in enumerate(urls):
        records.append(fetch_page(url, args.ignore_robots))
        if index < len(urls) - 1:
            time.sleep(max(args.delay, 0))

    gaps = build_gap_summary(records)
    jsonl_path, md_path = write_outputs(records, gaps, args.date)
    print(f"Wrote GEO/SEO JSONL: {jsonl_path.relative_to(ROOT)}")
    print(f"Wrote GEO/SEO brief: {md_path.relative_to(ROOT)}")
    print(f"Signals collected: {len(records)}")
    print(f"Content gaps found: {len(gaps)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
