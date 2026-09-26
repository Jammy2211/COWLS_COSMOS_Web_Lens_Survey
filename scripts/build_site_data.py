"""
__Build Site Data__

Builds `docs/data/lenses.json`, the single data file behind the COWLS lens gallery
(the GitHub Pages site in `docs/`).

It merges, for every row of `catalogue.csv`:

- the lens metadata in `<tier>/<code>/info.json`;
- the PyAutoLens modeling results in `<tier>/<code>/result.json` (if present);
- which image, `.fits` and archival files exist for that lens, read from
  `git ls-tree` so the (large) image and `.fits` files never need to be checked out.

To keep the JSON small, each band's list of files (paths relative to the band folder)
is stored once in the top-level `file_sets` list and every `bands.<band>.files`
entry is an index into it (there are only ~a dozen distinct file sets).

Run from anywhere inside the repository (standard library only, needs `git` on the PATH):

    python scripts/build_site_data.py
"""
import csv
import datetime
import json
import math
import subprocess
from pathlib import Path

REPO = "Jammy2211/COWLS_COSMOS_Web_Lens_Survey"
RAW_BASE = f"https://raw.githubusercontent.com/{REPO}/main"

TIERS = ["M25"] + [f"S{i:02d}" for i in range(12, -1, -1)] + ["P18"]
BANDS = ["F115W", "F150W", "F277W", "F444W"]
IMAGES = [
    "1_rgb_fit_summary.png",
    "2_visual_first_round.jpeg",
    "3_multi_wavelength_dataset.png",
    "4_sie_fit.png",
    "5_source_reconstruction.png",
    "6_rgb.png",
    "positions.png",
    "positions_mge.png",
    "source_near_lens_centre.png",
    "source_near_lens_centre_mge.png",
]

ROOT = Path(
    subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        capture_output=True, text=True, check=True, cwd=Path(__file__).parent,
    ).stdout.strip()
)


def number(value, digits=4):
    """Convert a CSV / JSON value to a rounded float, or None if blank / not a number."""
    if value is None or value == "":
        return None
    try:
        value = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(value):  # NaN / inf placeholders in the source files
        return None
    if value <= -98.0:  # -99 is the "no measurement" sentinel (e.g. lens_spec_z)
        return None
    return round(value, digits)


def text(value):
    """A clean string value, or None for blanks and NaN placeholders."""
    if value is None or (isinstance(value, float) and value != value):
        return None
    value = str(value).strip()
    return None if value.lower() in ("", "nan", "none", "null") else value


def load_json(path):
    if not path.exists():
        return None
    with open(path) as f:
        # info.json files use bare NaN for missing values; json maps it to float("nan").
        return json.load(f)


def tracked_files():
    """Map `<tier>/<code>` -> set of paths (relative to the lens folder) tracked in git."""
    out = subprocess.run(
        ["git", "ls-tree", "-r", "HEAD", "--name-only"],
        capture_output=True, text=True, check=True, cwd=ROOT,
    ).stdout.splitlines()
    files = {}
    for line in out:
        parts = line.split("/")
        if len(parts) >= 3 and parts[0] in TIERS:
            files.setdefault(f"{parts[0]}/{parts[1]}", set()).add("/".join(parts[2:]))
    return files


def band_record(band, result, files, file_sets):
    def res(key):
        return number(result.get(f"{band}_{key}")) if result else None

    band_files = sorted(f[len(band) + 1:] for f in files if f.startswith(band + "/"))
    if band_files not in file_sets:
        file_sets.append(band_files)
    return {
        "lens_mag": res("lens_magnitude_ab"),
        "source_mag": res("source_magnitude_ab"),
        "lensed_source_mag": res("lensed_source_magnitude_ab"),
        "magnification": res("magnification"),
        "max_snr": res("max_lensed_source_signal_to_noise_ratio"),
        "files": file_sets.index(band_files),
    }


def main():
    files_by_lens = tracked_files()
    lenses = []
    file_sets = []

    with open(ROOT / "catalogue.csv", newline="") as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        code, tier = row["code"], row["score"]
        path = f"{tier}/{code}"
        files = files_by_lens.get(path, set())
        has_folder = "info.json" in files

        info = load_json(ROOT / path / "info.json") if has_folder else None
        result = load_json(ROOT / path / "result.json") if has_folder else None
        info = info or {}

        einstein_radius = number((result or {}).get("einstein_radius"))
        if einstein_radius is None:
            einstein_radius = number(row.get("einstein_radius"))

        record = {
            "code": code,
            "tier": tier,
            "ranking": text(row.get("ranking")),
            "ra": number(row["ra"], 7),
            "dec": number(row["dec"], 7),
            "has_folder": has_folder,
            "path": path if has_folder else None,
            "primary_waveband": text(info.get("primary_waveband")),
            "data_field": text(info.get("data_field")),
            "lens_spec_z": number(info.get("lens_spec_z", row.get("lens_spec_z"))),
            "lens_spec_z_source": text(info.get("lens_spec_z_source")),
            "lens_cw_photo_z_med": number(
                info.get("lens_cw_photo_z_med", row.get("lens_cw_photo_z_med"))
            ),
            "lens_cw_stmass_med": number(
                info.get("lens_cw_stmass_med", row.get("lens_cw_stmass_med"))
            ),
            "einstein_radius": einstein_radius,
            "has_result": result is not None,
            "bands": {b: band_record(b, result, files, file_sets) for b in BANDS} if has_folder else {},
            "images": [image for image in IMAGES if image in files],
            "has_archive_space": any(f.startswith("archive_space/") for f in files),
            "has_archive_ground": any(f.startswith("archive_ground/") for f in files),
            "has_primer": any(f.startswith("primer/") for f in files),
        }
        lenses.append(record)

    order = {t: i for i, t in enumerate(TIERS)}
    lenses.sort(key=lambda r: (order.get(r["tier"], len(TIERS)), r["code"]))

    data = {
        "generated": datetime.date.today().isoformat(),
        "repo": REPO,
        "raw_base": RAW_BASE,
        "tiers": TIERS,
        "bands": BANDS,
        "file_sets": file_sets,
        "lenses": lenses,
    }

    out = ROOT / "docs" / "data" / "lenses.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w") as f:
        json.dump(data, f, separators=(",", ":"), allow_nan=False)

    n_folder = sum(r["has_folder"] for r in lenses)
    print(
        f"Wrote {out.relative_to(ROOT)}: {len(lenses)} records, {n_folder} with a data "
        f"folder, {out.stat().st_size / 1024:.0f} KB"
    )


if __name__ == "__main__":
    main()
