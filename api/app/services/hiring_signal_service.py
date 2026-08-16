"""
Hiring Signal Service - article-title radar for the company directory

Detects "company X started a recruiting batch" from public article
titles (typically WeChat official-account posts). Title-level keyword
matching only: no article content is stored beyond the title/URL used
as signal provenance, keeping the pipeline cheap and compliant.

Signal = (company alias appears in title) AND (batch keyword present).
The most specific batch label wins ("2027届秋招" over plain "秋招").
"""

import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import List, Optional, Tuple

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logger import LogCategory, logger
from app.models.company_directory import CompanyDirectoryEntry
from app.api.local_first_helpers import dump_json, load_json

# Season labels combine with an optional "20XX届" year prefix;
# specifics are checked standalone, most informative first
_SEASON_PATTERNS = [
    ("秋招", re.compile(r"秋招|秋季校园招聘|秋季招聘")),
    ("春招", re.compile(r"春招|春季校园招聘|春季招聘")),
]

_SPECIFIC_PATTERNS: List[Tuple[re.Pattern, str]] = [
    (re.compile(r"提前批"), "提前批"),
    (re.compile(r"暑期实习|暑假实习|夏季实习"), "暑期实习"),
    (re.compile(r"实习"), "实习"),
    (re.compile(r"校园招聘|校招"), "校招"),
    (re.compile(r"社会招聘|社招"), "社招"),
]

_YEAR_RE = re.compile(r"(20\d{2})\s*届")

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0",
    "Accept": "text/html",
}


@dataclass
class HiringSignal:
    company_id: str
    company_name: str
    batch: str
    title: str
    url: Optional[str]


def extract_batch(text: str) -> Optional[str]:
    """Extract the most specific recruiting-batch label from a title."""
    if not text:
        return None
    year_match = _YEAR_RE.search(text)
    year = year_match.group(1) if year_match else None

    for pattern, label in _SPECIFIC_PATTERNS[:1]:  # 提前批 keeps its own label
        if pattern.search(text):
            return f"{year}届{label}" if year else label
    for label, pattern in _SEASON_PATTERNS:
        if pattern.search(text):
            return f"{year}届{label}" if year else label
    for pattern, label in _SPECIFIC_PATTERNS[1:]:
        if pattern.search(text):
            return label
    return None


def _alias_variants(alias: str) -> List[str]:
    variants = {alias.strip()}
    lowered = alias.strip().lower()
    variants.add(lowered)
    return [v for v in variants if len(v) >= 2]


def match_companies(
    title: str, entries: List[CompanyDirectoryEntry]
) -> List[CompanyDirectoryEntry]:
    """Directory entries whose name/alias appears in the title."""
    if not title:
        return []
    lowered = title.lower()
    matched = []
    for entry in entries:
        aliases = [entry.name] + (load_json(entry.aliases) or [])
        if any(
            variant in lowered or variant in title
            for alias in aliases
            for variant in _alias_variants(str(alias))
        ):
            matched.append(entry)
    return matched


def detect_signals(
    title: str,
    entries: List[CompanyDirectoryEntry],
    url: Optional[str] = None,
) -> List[HiringSignal]:
    """All hiring signals a title implies against the directory."""
    batch = extract_batch(title)
    if batch is None:
        return []
    return [
        HiringSignal(
            company_id=str(entry.id),
            company_name=entry.name,
            batch=batch,
            title=title,
            url=url,
        )
        for entry in match_companies(title, entries)
    ]


async def fetch_article_title(url: str, timeout: int = 20) -> Optional[str]:
    """Best-effort og:title / <title> extraction for a public article."""
    try:
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            response = await client.get(url, headers=_HEADERS)
            response.raise_for_status()
            html = response.text[:200_000]
        og = re.search(r'property="og:title"\s+content="([^"]+)"', html) or re.search(
            r'content="([^"]+)"\s+property="og:title"', html
        )
        if og:
            return og.group(1).strip()
        raw = re.search(r"<title>([^<]+)</title>", html)
        return raw.group(1).strip() if raw else None
    except Exception as exc:
        logger.warning(LogCategory.API, f"Article title fetch failed: {exc}")
        return None


async def apply_signal(
    db: AsyncSession, title: str, url: Optional[str] = None
) -> List[HiringSignal]:
    """Detect signals in a title and pin them on the directory."""
    entries = (await db.execute(select(CompanyDirectoryEntry))).scalars().all()
    signals = detect_signals(title, entries, url=url)
    by_id = {str(e.id): e for e in entries}
    now = datetime.now(timezone.utc)
    for signal in signals:
        entry = by_id[signal.company_id]
        entry.signal_batch = signal.batch
        entry.signal_title = signal.title
        entry.signal_url = signal.url
        entry.signal_detected_at = now
        db.add(entry)
    if signals:
        await db.commit()
        logger.info(
            LogCategory.DATA,
            f"Applied {len(signals)} hiring signal(s): "
            + ", ".join(f"{s.company_name}→{s.batch}" for s in signals),
        )
    return signals


# Seed directory. URLs verified live 2026-08 (HTTP 200 on the careers
# page itself); verified=False marks known-good domains that were
# bot-blocked (4xx WAF), resolved to a generic homepage, or failed at
# the network layer from the build machine. career_url=None means the
# company is included for signal tracking until an URL is confirmed.
SEED_COMPANIES = [
    # --- 互联网 / 科技 ---
    {
        "name": "腾讯",
        "aliases": ["Tencent", "腾讯"],
        "career_url": "https://join.qq.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "阿里巴巴",
        "aliases": ["阿里", "Alibaba"],
        "career_url": "https://campus.alibaba.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "字节跳动",
        "aliases": ["字节", "ByteDance", "抖音集团"],
        "career_url": "https://job.bytedance.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "美团",
        "aliases": ["美团", "Meituan"],
        "career_url": "https://zhaopin.meituan.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "百度",
        "aliases": ["百度", "Baidu"],
        "career_url": "https://talent.baidu.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "京东",
        "aliases": ["京东", "JD"],
        "career_url": "https://campus.jd.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "网易",
        "aliases": ["网易", "NetEase"],
        "career_url": "https://campus.163.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "快手",
        "aliases": ["快手", "Kuaishou"],
        "career_url": "https://zhaopin.kuaishou.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "哔哩哔哩",
        "aliases": ["B站", "bilibili"],
        "career_url": "https://jobs.bilibili.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "拼多多",
        "aliases": ["拼多多", "PDD"],
        "career_url": "https://careers.pinduoduo.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "滴滴",
        "aliases": ["滴滴", "DiDi"],
        "career_url": "https://talent.didiglobal.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "携程",
        "aliases": ["携程", "Ctrip", "Trip.com"],
        "career_url": "https://job.ctrip.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "蚂蚁集团",
        "aliases": ["蚂蚁", "AntGroup", "支付宝"],
        "career_url": "https://careers.antgroup.com",
        "industry": "互联网",
        "verified": False,
    },
    {
        "name": "贝壳找房",
        "aliases": ["贝壳", "KE"],
        "career_url": "https://zhaopin.ke.com",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "去哪儿",
        "aliases": ["去哪儿", "Qunar"],
        "career_url": "https://career.qunar.com",
        "industry": "互联网",
        "verified": False,
    },
    {
        "name": "360集团",
        "aliases": ["360", "奇虎"],
        "career_url": "https://hr.360.cn",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "唯品会",
        "aliases": ["唯品会", "VIP.com"],
        "career_url": "https://career.vip.com",
        "industry": "互联网",
        "verified": False,
    },
    {
        "name": "新浪",
        "aliases": ["新浪", "Sina", "微博"],
        "career_url": "https://career.sina.com.cn",
        "industry": "互联网",
        "verified": True,
    },
    {
        "name": "搜狐",
        "aliases": ["搜狐", "Sohu"],
        "career_url": "https://app.mokahr.com/su/ozxnwp",
        "industry": "互联网",
        "verified": True,
    },
    # --- 硬件 / 制造 / 汽车 ---
    {
        "name": "华为",
        "aliases": ["华为", "Huawei"],
        "career_url": "https://career.huawei.com",
        "industry": "硬件",
        "verified": False,
    },
    {
        "name": "小米",
        "aliases": ["小米", "Xiaomi"],
        "career_url": "https://campus.hr.xiaomi.com",
        "industry": "硬件",
        "verified": True,
    },
    {
        "name": "OPPO",
        "aliases": ["OPPO"],
        "career_url": "https://careers.oppo.com",
        "industry": "硬件",
        "verified": True,
    },
    {
        "name": "vivo",
        "aliases": ["vivo", "维沃"],
        "career_url": "https://hr.vivo.com",
        "industry": "硬件",
        "verified": True,
    },
    {
        "name": "荣耀",
        "aliases": ["荣耀", "HONOR"],
        "career_url": "https://career.hihonor.com",
        "industry": "硬件",
        "verified": False,
    },
    {
        "name": "中兴",
        "aliases": ["中兴", "ZTE"],
        "career_url": "https://job.zte.com.cn",
        "industry": "硬件",
        "verified": True,
    },
    {
        "name": "大疆创新",
        "aliases": ["大疆", "DJI"],
        "career_url": "https://we.dji.com",
        "industry": "硬件",
        "verified": True,
    },
    {
        "name": "联想",
        "aliases": ["联想", "Lenovo"],
        "career_url": "https://career.lenovo.com",
        "industry": "硬件",
        "verified": False,
    },
    {
        "name": "京东方",
        "aliases": ["京东方", "BOE"],
        "career_url": "https://campus.boe.com",
        "industry": "硬件",
        "verified": True,
    },
    {
        "name": "深信服",
        "aliases": ["深信服", "Sangfor"],
        "career_url": "https://campus.sangfor.com.cn",
        "industry": "硬件",
        "verified": False,
    },
    {
        "name": "科大讯飞",
        "aliases": ["讯飞", "iFlytek"],
        "career_url": "https://career.iflytek.com",
        "industry": "硬件",
        "verified": False,
    },
    {
        "name": "宁德时代",
        "aliases": ["宁德时代", "CATL"],
        "career_url": "https://catl.com/campus",
        "industry": "制造",
        "verified": False,
    },
    {
        "name": "比亚迪",
        "aliases": ["比亚迪", "BYD"],
        "career_url": "https://job.byd.com",
        "industry": "汽车",
        "verified": True,
    },
    {
        "name": "蔚来",
        "aliases": ["蔚来", "NIO"],
        "career_url": "https://www.nio.com/careers",
        "industry": "汽车",
        "verified": True,
    },
    {
        "name": "理想汽车",
        "aliases": ["理想", "Li Auto"],
        "career_url": None,
        "industry": "汽车",
        "verified": False,
    },
    {
        "name": "小鹏汽车",
        "aliases": ["小鹏", "XPeng"],
        "career_url": "https://job.xiaopeng.com",
        "industry": "汽车",
        "verified": False,
    },
    {
        "name": "宝马中国",
        "aliases": ["宝马", "BMW"],
        "career_url": None,
        "industry": "汽车",
        "verified": False,
    },
    {
        "name": "梅赛德斯-奔驰",
        "aliases": ["奔驰", "Mercedes"],
        "career_url": None,
        "industry": "汽车",
        "verified": False,
    },
    {
        "name": "丰田中国",
        "aliases": ["丰田", "Toyota"],
        "career_url": "https://www.toyota.com.cn",
        "industry": "汽车",
        "verified": False,
    },
    {
        "name": "大众中国",
        "aliases": ["大众", "Volkswagen"],
        "career_url": None,
        "industry": "汽车",
        "verified": False,
    },
    # --- 游戏 ---
    {
        "name": "米哈游",
        "aliases": ["米哈游", "miHoYo"],
        "career_url": "https://job.mihoyo.com",
        "industry": "游戏",
        "verified": False,
    },
    {
        "name": "完美世界",
        "aliases": ["完美世界", "PerfectWorld"],
        "career_url": None,
        "industry": "游戏",
        "verified": False,
    },
    {
        "name": "三七互娱",
        "aliases": ["三七", "37游戏"],
        "career_url": None,
        "industry": "游戏",
        "verified": False,
    },
    {
        "name": "莉莉丝游戏",
        "aliases": ["莉莉丝", "Lilith"],
        "career_url": None,
        "industry": "游戏",
        "verified": False,
    },
    # --- 银行 / 金融 ---
    {
        "name": "工商银行",
        "aliases": ["工行", "ICBC"],
        "career_url": "https://job.icbc.com.cn",
        "industry": "银行",
        "verified": True,
    },
    {
        "name": "建设银行",
        "aliases": ["建行", "CCB"],
        "career_url": "https://job.ccb.com",
        "industry": "银行",
        "verified": True,
    },
    {
        "name": "交通银行",
        "aliases": ["交行", "BankComm"],
        "career_url": "https://job.bankcomm.com",
        "industry": "银行",
        "verified": True,
    },
    {
        "name": "中国银行",
        "aliases": ["中行", "BOC"],
        "career_url": "https://www.boc.cn",
        "industry": "银行",
        "verified": False,
    },
    {
        "name": "农业银行",
        "aliases": ["农行", "ABChina"],
        "career_url": "https://job.abchina.com",
        "industry": "银行",
        "verified": False,
    },
    {
        "name": "邮储银行",
        "aliases": ["邮储", "PSBC"],
        "career_url": "https://job.psbc.com",
        "industry": "银行",
        "verified": False,
    },
    {
        "name": "招商银行",
        "aliases": ["招行", "CMB"],
        "career_url": "https://career.cloudcmb.com",
        "industry": "银行",
        "verified": False,
    },
    {
        "name": "浦发银行",
        "aliases": ["浦发", "SPDB"],
        "career_url": "https://job.spdb.com.cn",
        "industry": "银行",
        "verified": True,
    },
    {
        "name": "兴业银行",
        "aliases": ["兴业", "CIB"],
        "career_url": "https://job.cib.com.cn",
        "industry": "银行",
        "verified": True,
    },
    {
        "name": "民生银行",
        "aliases": ["民生", "CMBC"],
        "career_url": "https://career.cmbc.com.cn",
        "industry": "银行",
        "verified": True,
    },
    {
        "name": "中信银行",
        "aliases": ["中信银行", "CNCB"],
        "career_url": "https://job.bank.ecitic.com",
        "industry": "银行",
        "verified": False,
    },
    {
        "name": "平安银行",
        "aliases": ["平安银行", "PAB"],
        "career_url": "https://career.pingan.com",
        "industry": "银行",
        "verified": False,
    },
    {
        "name": "中金公司",
        "aliases": ["中金", "CICC"],
        "career_url": "https://cicc.zhiye.com",
        "industry": "金融",
        "verified": True,
    },
    {
        "name": "中信证券",
        "aliases": ["中信证券"],
        "career_url": "https://job.cs.ecitic.com",
        "industry": "金融",
        "verified": False,
    },
    # --- 运营商 / 央企能源 ---
    {
        "name": "中国移动",
        "aliases": ["移动", "ChinaMobile"],
        "career_url": "https://job.10086.cn",
        "industry": "运营商",
        "verified": True,
    },
    {
        "name": "中国电信",
        "aliases": ["电信", "ChinaTelecom"],
        "career_url": "https://campus.chinatelecom.cn",
        "industry": "运营商",
        "verified": False,
    },
    {
        "name": "中国联通",
        "aliases": ["联通", "ChinaUnicom"],
        "career_url": "https://career.chinaunicom.cn",
        "industry": "运营商",
        "verified": False,
    },
    {
        "name": "国家电网",
        "aliases": ["国网", "SGCC"],
        "career_url": "https://zhaopin.sgcc.com.cn",
        "industry": "能源",
        "verified": False,
    },
    {
        "name": "中国石油",
        "aliases": ["中石油", "CNPC"],
        "career_url": "https://zhaopin.cnpc.com.cn",
        "industry": "能源",
        "verified": False,
    },
    {
        "name": "中国石化",
        "aliases": ["中石化", "Sinopec"],
        "career_url": "https://job.sinopec.com",
        "industry": "能源",
        "verified": False,
    },
    {
        "name": "南方电网",
        "aliases": ["南网", "CSG"],
        "career_url": "https://job.csg.cn",
        "industry": "能源",
        "verified": False,
    },
    {
        "name": "中国建筑",
        "aliases": ["中建", "CSCEC"],
        "career_url": "https://job.cscec.com",
        "industry": "建筑",
        "verified": False,
    },
    # --- 物流 / 地产 ---
    {
        "name": "顺丰速运",
        "aliases": ["顺丰", "SF"],
        "career_url": "https://career.sf-express.com",
        "industry": "物流",
        "verified": False,
    },
    {
        "name": "菜鸟集团",
        "aliases": ["菜鸟", "Cainiao"],
        "career_url": "https://talent.cainiao.com",
        "industry": "物流",
        "verified": True,
    },
    {
        "name": "万科",
        "aliases": ["万科", "Vanke"],
        "career_url": "https://job.vanke.com",
        "industry": "地产",
        "verified": False,
    },
    # --- 外企 ---
    {
        "name": "微软中国",
        "aliases": ["微软", "Microsoft"],
        "career_url": "https://careers.microsoft.com",
        "industry": "外企",
        "verified": True,
    },
    {
        "name": "苹果中国",
        "aliases": ["苹果", "Apple"],
        "career_url": "https://jobs.apple.com",
        "industry": "外企",
        "verified": True,
    },
    {
        "name": "亚马逊中国",
        "aliases": ["亚马逊", "Amazon"],
        "career_url": "https://www.amazon.jobs",
        "industry": "外企",
        "verified": True,
    },
    {
        "name": "联合利华",
        "aliases": ["联合利华", "Unilever"],
        "career_url": "https://careers.unilever.com",
        "industry": "外企",
        "verified": True,
    },
    {
        "name": "欧莱雅中国",
        "aliases": ["欧莱雅", "L'Oreal", "欧莱雅中国"],
        "career_url": "https://www.careers.loreal.com",
        "industry": "外企",
        "verified": False,
    },
    {
        "name": "宝洁中国",
        "aliases": ["宝洁", "P&G"],
        "career_url": "https://www.pgcareers.com",
        "industry": "外企",
        "verified": False,
    },
    {
        "name": "玛氏中国",
        "aliases": ["玛氏", "Mars"],
        "career_url": "https://jobs.mars.com",
        "industry": "外企",
        "verified": False,
    },
    {
        "name": "雀巢中国",
        "aliases": ["雀巢", "Nestle"],
        "career_url": "https://www.nestle.com/jobs",
        "industry": "外企",
        "verified": False,
    },
    # --- 医药 / 其他科技 ---
    {
        "name": "药明康德",
        "aliases": ["药明", "WuXi"],
        "career_url": "https://careers.wuxiapptec.com",
        "industry": "医药",
        "verified": False,
    },
    {
        "name": "百济神州",
        "aliases": ["百济", "BeiGene"],
        "career_url": "https://careers.beigene.com",
        "industry": "医药",
        "verified": False,
    },
    {
        "name": "恒瑞医药",
        "aliases": ["恒瑞", "Hengrui"],
        "career_url": "https://www.hrs.com.cn",
        "industry": "医药",
        "verified": False,
    },
    {
        "name": "商汤科技",
        "aliases": ["商汤", "SenseTime"],
        "career_url": None,
        "industry": "AI",
        "verified": False,
    },
]


_CAMPUS_ROW_RE = re.compile(
    r"^\|\s*(?P<name>[^|]+?)\s*\|"
    r"\s*(?P<links>[^|]*?)\s*\|"
    r"\s*(?P<date>[^|]*?)\s*\|"
    r"\s*(?P<location>[^|]*?)\s*\|"
    r"\s*(?P<note>[^|]*?)\s*\|?\s*$"
)
_MD_LINK_RE = re.compile(r"\[(?P<label>[^\]]*)\]\((?P<url>https?://[^)\s]+)\)")

# Link hosts that are articles/aggregators, not official career sites
NON_CAREER_HOSTS = (
    "mp.weixin.qq.com",
    "nowcoder.com",
    "juejin.cn",
    "zhihu.com",
    "docs.qq.com",
    "shimo.im",
    "wjx.cn",
    "github.com",
    "campus2026.top",
    "campus2027.top",
    "zhipin.com",
    "liepin.com",
    "lagou.com",
    "51job.com",
)
_NOT_STARTED_MARKERS = ("预计", "即将", "未开启", "待开启", "暂未")


def parse_campus_markdown(markdown: str):
    """Parse Campus20XX-style repo tables into radar-ready rows.

    Yields (name, career_url, source_url, batch, title, detected_at):
    career_url drops article/aggregator links; batch is None unless the
    row says a batch actually started (预计/即将 rows stay unpinned).
    """
    from datetime import datetime as _dt

    for line in markdown.splitlines():
        match = _CAMPUS_ROW_RE.match(line)
        if not match:
            continue
        name = match.group("name").strip().replace("**", "")
        if not name or name in ("公司", "公司名", "Company"):
            continue
        if set(name) <= {"-", " "}:  # table separator
            continue

        link = _MD_LINK_RE.search(match.group("links") or "")
        career_url = None
        source_url = None
        label = ""
        if link:
            label = link.group("label").strip()
            source_url = link.group("url")
            host = re.sub(r"^https?://", "", source_url).lstrip("www.").split("/")[0]
            if not any(host.endswith(h) for h in NON_CAREER_HOSTS):
                career_url = source_url

        note = (match.group("note") or "").strip()
        status_text = f"{label} {note}"

        batch = None
        if "开启" in status_text or "启动" in status_text or "进行中" in status_text:
            if not any(marker in note for marker in _NOT_STARTED_MARKERS):
                batch = extract_batch(status_text)

        detected_at = None
        raw_date = (match.group("date") or "").strip()
        if re.fullmatch(r"\d{4}/\d{1,2}/\d{1,2}", raw_date):
            try:
                detected_at = _dt.strptime(raw_date, "%Y/%m/%d").replace(
                    tzinfo=timezone.utc
                )
            except ValueError:
                pass

        yield name, career_url, source_url, batch, note or label, detected_at


async def seed_companies(db: AsyncSession) -> int:
    import uuid

    existing = (await db.execute(select(CompanyDirectoryEntry))).scalars().all()
    known = {e.name for e in existing}
    created = 0
    for seed in SEED_COMPANIES:
        if seed["name"] in known:
            continue
        db.add(
            CompanyDirectoryEntry(
                id=uuid.uuid4(),
                name=seed["name"],
                aliases=dump_json(seed["aliases"]),
                career_url=seed.get("career_url"),
                industry=seed.get("industry"),
                verified=seed.get("verified", False),
            )
        )
        created += 1
    if created:
        await db.commit()
    return created
