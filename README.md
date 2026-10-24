# The COSMOS-Web Lens Survey (COWLS)

[![Browse the COWLS lenses](https://img.shields.io/badge/Browse_the_lenses-jamesnightingale.net-7fb0ff?style=for-the-badge)](https://jamesnightingale.net/COWLS_COSMOS_Web_Lens_Survey/)

**[Browse every COWLS lens on the website →](https://jamesnightingale.net/COWLS_COSMOS_Web_Lens_Survey/)** A mosaic of every candidate's RGB image, with one click through to its images, metadata, PyAutoLens results and `.fits` downloads.

This repository holds the candidate strong lenses found by the COSMOS-Web Lens Survey (COWLS), run by the COSMOS-Web Lensing Science Working Group.

[![COWLS RGB Image](https://github.com/Jammy2211/COWLS_COSMOS_Web_Lens_Survey/blob/main/cowls_ii_rgb.png?raw=true)](https://jamesnightingale.net/COWLS_COSMOS_Web_Lens_Survey/)

## Overview

COWLS lens data are long-exposure, multi-band James Webb Space Telescope (JWST) images, well suited to detailed lensing analysis. The lenses were found by visual inspection: six people inspected about 42,000 JWST images from the COSMOS-Web survey and ranked them by how likely they were to be strong lenses.

The sample is presented in three papers:

- **COWLS I:** Nightingale et al. 2025, MNRAS — [doi:10.1093/mnras/staf1253](https://doi.org/10.1093/mnras/staf1253), [arXiv:2503.08777](https://arxiv.org/abs/2503.08777)
- **COWLS II:** Mahler et al. 2025, MNRAS Letters, L8–L14 — [doi:10.1093/mnrasl/slaf088](https://doi.org/10.1093/mnrasl/slaf088), [arXiv:2503.08782](https://arxiv.org/abs/2503.08782)
- **COWLS III:** Hogg et al. 2025, MNRAS, 544, 782–798 — [doi:10.1093/mnras/staf1678](https://doi.org/10.1093/mnras/staf1678), [arXiv:2503.08785](https://arxiv.org/abs/2503.08785)

Other papers that use COWLS lenses are listed on the **[Papers page](https://jamesnightingale.net/COWLS_COSMOS_Web_Lens_Survey/papers.html)**, with links to each lens they study.

## Getting Started

The lenses are grouped into tier folders:

- `M25`: the 17 most spectacular lenses, presented in **COWLS II** — all confirmed strong lenses with high signal-to-noise JWST imaging.
- `S00`–`S12`: the other 418 candidates, named by their visual-inspection score, from `S12` (very high quality) down to `S00` (very low quality).
- `P18`: 5 known lenses from prior work, listed in the catalogue for completeness; they have no data folder.

**COWLS III** predicts that the sample contains about 100 strong lenses, so think about how your analysis can confirm a candidate is a lens.

The **[About the data](https://jamesnightingale.net/COWLS_COSMOS_Web_Lens_Survey/about.html)** page documents everything in the release: the tiers, every `catalogue.csv` column, the files in each lens folder, the archival HST, MIRI and ground-based data, the PRIMER data, and the definitions of the modeled physical quantities.

If you are using COWLS data in your research, please contact the COSMOS-Web Lensing Science Working Group to coordinate and avoid duplicated work.

## Lens Modeling

The release includes lens models fitted with **PyAutoLens** ([GitHub](https://github.com/Jammy2211/PyAutoLens)). Each lens is modeled in a "primary" waveband, where the source is most visible, and that mass model is then used to reconstruct the source in the other wavebands. The model has:

- **Lens light:** a Multi Gaussian Expansion (MGE) (He et al. 2024, [arXiv:2403.16253](https://arxiv.org/abs/2403.16253)).
- **Mass:** a Singular Isothermal Ellipsoid (SIE) with external shear.
- **Source:** an adaptive Voronoi mesh reconstruction (see the PyAutoLens documentation).

## Citation

If you use COWLS data in your research, please cite the three COWLS papers listed above. The BibTeX entries are in [CITATIONS.bib](https://github.com/Jammy2211/COWLS_COSMOS_Web_Lens_Survey/blob/main/CITATIONS.bib), and `CITATION.cff` provides GitHub's "Cite this repository" entry. If you use PRIMER data, see the [About the data](https://jamesnightingale.net/COWLS_COSMOS_Web_Lens_Survey/about.html#primer) page for what to cite.

---

## Developer notes

The website is a static site in `docs/`, deployed to GitHub Pages by `.github/workflows/pages.yml`. Its lens data, `docs/data/lenses.json`, is generated from `catalogue.csv`, each lens's `info.json` and `result.json`, and the list of files tracked in git (so the large image and `.fits` files need not be downloaded). Regenerate it after the data changes with:

```bash
python scripts/build_site_data.py
```

The Papers page reads `docs/data/papers.json`, which is edited by hand.

After cloning, `python make_rgb_summary.py` collects the RGB + modeling summary image of every lens into `images/rgb_summary` (lenses without a model fall back to their `6_rgb.png`).
