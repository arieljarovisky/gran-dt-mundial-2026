#!/usr/bin/env python3
"""Parse FIFA World Cup 2026 squad list PDF and generate players-data.js."""

import json
import re
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Instala PyMuPDF: pip install pymupdf", file=sys.stderr)
    sys.exit(1)

DEFAULT_PDF = Path(__file__).resolve().parents[1] / "data" / "SquadLists-English.pdf"
FALLBACK_PDF = Path(r"c:\Users\usuario\Downloads\SquadLists-English.pdf")
OUTPUT_JSON = Path(__file__).resolve().parents[1] / "src" / "db" / "players-parsed.json"
OUTPUT_JS = Path(__file__).resolve().parents[1] / "src" / "db" / "players-data.js"

POS_MAP = {"GK": "POR", "DF": "DEF", "MF": "MED", "FW": "DEL"}
COUNTRY_LINE = re.compile(r"^(.+?)\s+\(([A-Z]{3})\)\s*$")
POSITIONS = frozenset(POS_MAP.keys())
SKIP_LINES = frozenset(
    {
        "#",
        "POS",
        "PLAYER NAME",
        "FIRST NAME(S)",
        "LAST NAME(S)",
        "NAME ON SHIRT",
        "DOB",
        "CLUB",
        "HEIGHT (CM)",
        "CAPS",
        "GOALS",
        "ROLE",
        "COACH NAME",
        "NATIONALITY",
        "Head coach",
        "Date of birth",
        "Position",
        "Goalkeeper",
        "Defender",
        "Forward",
        "SQUAD LIST",
    }
)


def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "player"


def age_factor(dob: str) -> float:
    """Depreciate price for players past their prime (World Cup is June 2026)."""
    d, m, y = (int(x) for x in dob.split("/"))
    age = 2026 - y
    if m > 6:
        age -= 1
    if age <= 20:
        return 0.80
    if age <= 23:
        return 0.90
    if age <= 27:
        return 1.00
    if age <= 29:
        return 0.95
    if age <= 31:
        return 0.85
    if age <= 33:
        return 0.70
    if age <= 35:
        return 0.55
    return 0.40


# Country factors reflect FIFA ranking AND quality of competition faced.
# Teams like QAT accumulate caps/goals vs weaker AFC/Gulf Cup opponents,
# so their stats are discounted more aggressively.
COUNTRY_FACTOR: dict[str, float] = {
    # Tier 1 — Élite (×1.40)
    "ARG": 1.40, "ESP": 1.40, "FRA": 1.40, "ENG": 1.40,
    # Tier 2 — Muy fuerte (×1.22–1.28)
    "BRA": 1.28, "POR": 1.28, "NED": 1.28, "GER": 1.28, "BEL": 1.22,
    # Tier 3 — Fuerte (×1.08–1.14)
    "CRO": 1.14, "URU": 1.14, "COL": 1.14, "MAR": 1.14, "SEN": 1.14,
    "JPN": 1.08, "USA": 1.08, "MEX": 1.08,
    # Tier 4 — Competitivos (×0.80–1.00)
    "KOR": 1.00, "SUI": 1.00, "NOR": 1.00, "AUS": 1.00, "AUT": 1.00,
    "CZE": 1.00, "ECU": 1.00, "SWE": 1.00, "TUR": 1.00, "ALG": 1.00,
    "TUN": 1.00, "PAR": 1.00, "SCO": 0.95, "GHA": 0.92, "EGY": 0.88,
    "IRN": 0.85, "KSA": 0.80,
    # Tier 5 — Competencia regional débil (×0.45–0.75)
    "CAN": 0.75, "CIV": 0.72, "BIH": 0.68,
    "RSA": 0.60, "NZL": 0.60, "CPV": 0.58, "COD": 0.58, "PAN": 0.58,
    "UZB": 0.55, "IRQ": 0.52, "JOR": 0.50, "HAI": 0.45, "CUW": 0.45,
    "QAT": 0.42,
}


def calc_price(position: str, caps: int, goals: int, dob: str = "", team_code: str = "") -> int:
    base = {"POR": 5_000_000, "DEF": 5_500_000, "MED": 6_000_000, "DEL": 6_500_000}[position]

    # Lower multipliers so country factor has real impact
    value = base + caps * 20_000 + goals * 150_000

    # Efficiency bonus: rewards consistent scorers (capped at 1.2 goals/cap)
    if caps >= 5:
        efficiency = min(goals / caps, 1.2)
        value += efficiency * 1_500_000

    # Country factor applied before cap so élite-nation players can reach 18M
    # while weaker-competition nations stay naturally lower
    country = COUNTRY_FACTOR.get(team_code, 0.88)
    value = value * country

    value = max(4_000_000, min(18_000_000, value))

    if dob:
        value = value * age_factor(dob)
        value = max(4_000_000, value)

    return round(value / 100_000) * 100_000


def should_skip(line: str) -> bool:
    if not line or line.isdigit():
        return True
    if line in SKIP_LINES:
        return True
    if line.startswith(("Monday,", "FIFA World", "11 June", "--")):
        return True
    if "Mid" in line and "elder" in line:
        return True
    return False


def extract_text(pdf_path: Path) -> list[str]:
    doc = fitz.open(pdf_path)
    lines: list[str] = []
    for page in doc:
        for raw in page.get_text().splitlines():
            line = raw.strip()
            if line:
                lines.append(line)
    doc.close()
    return lines


def parse_players(lines: list[str]) -> list[dict]:
    players: list[dict] = []
    current_country = None
    current_code = None
    id_counts: dict[str, int] = {}
    i = 0

    while i < len(lines):
        line = lines[i]

        country_match = COUNTRY_LINE.match(line)
        if country_match:
            current_country = country_match.group(1).strip()
            current_code = country_match.group(2)
            i += 1
            continue

        if line not in POSITIONS or i + 9 >= len(lines):
            i += 1
            continue

        pos_raw = line
        first_name = lines[i + 2]
        last_name = lines[i + 3]
        shirt_name = lines[i + 4]
        dob = lines[i + 5]
        club = lines[i + 6]
        height = lines[i + 7]
        caps_s = lines[i + 8]
        goals_s = lines[i + 9]

        if not re.match(r"^\d{2}/\d{2}/\d{4}$", dob):
            i += 1
            continue

        if not current_country or not current_code:
            i += 1
            continue

        position = POS_MAP[pos_raw]
        display_name = f"{first_name} {last_name}".strip()
        display_name = re.sub(r"\s+", " ", display_name)

        base_id = f"{current_code.lower()}-{slugify(last_name or shirt_name)}"
        count = id_counts.get(base_id, 0)
        id_counts[base_id] = count + 1
        player_id = base_id if count == 0 else f"{base_id}-{count + 1}"
        player_id = player_id[:30]

        try:
            caps_i = int(caps_s)
            goals_i = int(goals_s)
            int(height)
        except ValueError:
            i += 1
            continue

        players.append(
            {
                "id": player_id,
                "name": display_name[:120],
                "country": current_country[:80],
                "teamCode": current_code,
                "position": position,
                "price": calc_price(position, caps_i, goals_i, dob, current_code),
                "points": 0,
                "club": club[:150],
                "caps": caps_i,
                "goals": goals_i,
                "dob": dob,
            }
        )
        i += 10

    return players


def write_js(players: list[dict], path: Path) -> None:
    core_fields = ["id", "name", "country", "teamCode", "position", "price", "points"]
    payload = [{k: p[k] for k in core_fields} for p in players]
    lines = [
        "export const INITIAL_BUDGET = 100_000_000;",
        "",
        f"export const PLAYERS = {json.dumps(payload, ensure_ascii=False, indent=2)};",
        "",
        "export const INITIAL_SLOTS = [",
        "  { id: 'gk1', position: 'POR' },",
        "  { id: 'def1', position: 'DEF' },",
        "  { id: 'def2', position: 'DEF' },",
        "  { id: 'def3', position: 'DEF' },",
        "  { id: 'def4', position: 'DEF' },",
        "  { id: 'mid1', position: 'MED' },",
        "  { id: 'mid2', position: 'MED' },",
        "  { id: 'mid3', position: 'MED' },",
        "  { id: 'mid4', position: 'MED' },",
        "  { id: 'fwd1', position: 'DEL' },",
        "  { id: 'fwd2', position: 'DEL' },",
        "];",
        "",
    ]
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    if len(sys.argv) > 1:
        pdf_path = Path(sys.argv[1])
    elif DEFAULT_PDF.exists():
        pdf_path = DEFAULT_PDF
    else:
        pdf_path = FALLBACK_PDF
    if not pdf_path.exists():
        print(f"PDF no encontrado: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    lines = extract_text(pdf_path)
    players = parse_players(lines)

    OUTPUT_JSON.write_text(json.dumps(players, ensure_ascii=False, indent=2), encoding="utf-8")
    write_js(players, OUTPUT_JS)

    by_country: dict[str, int] = {}
    for p in players:
        by_country[p["teamCode"]] = by_country.get(p["teamCode"], 0) + 1

    print(f"Jugadores parseados: {len(players)}")
    print(f"Selecciones: {len(by_country)}")
    print(f"Guardado en: {OUTPUT_JS}")


if __name__ == "__main__":
    main()
