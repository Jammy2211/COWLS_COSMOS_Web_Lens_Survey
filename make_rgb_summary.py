import json
from pathlib import Path
import shutil

"""
__Make RGB Summary__

This script copies all the RGB summary images, `1_rgb_fit_summary.png`, from the dataset folders to a new folder called
`images/rgb_summary`, named `<score>_<code>.png`.

This makes all images accessible from a single location, which is useful for browsing the results of many datasets
quickly offline. Lenses without a lens model (no `1_rgb_fit_summary.png`) fall back to their `6_rgb.png`.

The lens gallery at https://jammy2211.github.io/COWLS_COSMOS_Web_Lens_Survey/ is the online alternative.

Run it from the root of the repository:

    python make_rgb_summary.py
"""

output_path = Path("images") / "rgb_summary"
output_path.mkdir(parents=True, exist_ok=True)

dataset_folder_list = [
    "M25",
    "S12",
    "S11",
    "S10",
    "S09",
    "S08",
    "S07",
    "S06",
    "S05",
    "S04",
    "S03",
    "S02",
    "S01",
    "S00",
]

total = 0

for dataset_folder in dataset_folder_list:
    for dataset_path in sorted(Path(dataset_folder).glob("*/info.json")):
        dataset_path = dataset_path.parent

        with open(dataset_path / "info.json") as json_file:
            info = json.load(json_file)

        score = info["score"]

        for image_name in ["1_rgb_fit_summary.png", "6_rgb.png"]:
            image_path = dataset_path / image_name
            if image_path.exists():
                shutil.copy(image_path, output_path / f"{score}_{dataset_path.name}.png")
                total += 1
                break

print(f"Copied {total} images to {output_path}")
