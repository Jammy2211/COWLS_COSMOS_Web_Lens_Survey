/* COWLS lens gallery — vanilla JS, no build step. */
(function () {
  "use strict";

  var REPO = "Jammy2211/COWLS_COSMOS_Web_Lens_Survey";
  var TREE_BASE = "https://github.com/" + REPO + "/tree/main/";
  var RAW_BASE = "https://raw.githubusercontent.com/" + REPO + "/main/";
  var STATE_KEY = "cowls-gallery-hash";

  var IMAGE_LABELS = {
    "1_rgb_fit_summary.png": "RGB images, source reconstructions and lens-subtracted images",
    "2_visual_first_round.jpeg": "Image from the first round of visual inspection",
    "3_multi_wavelength_dataset.png": "Image, masked image, lens-subtracted image, S/N map and source S/N map",
    "4_sie_fit.png": "Lens model components inferred by PyAutoLens for all bands",
    "5_source_reconstruction.png": "Delensed source reconstructions",
    "6_rgb.png": "RGB image",
    "positions.png": "Lensed source positions",
    "positions_mge.png": "Lensed source positions (MGE)",
    "source_near_lens_centre.png": "Fit with a source near the lens centre",
    "source_near_lens_centre_mge.png": "Fit with a source near the lens centre (MGE)"
  };

  /* ---------- helpers ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === "text") node.textContent = v;
        else if (k === "class") node.className = v;
        else if (k.slice(0, 2) === "on") node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? "" : v);
      });
    }
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function fmt(v, digits) {
    return v === null || v === undefined ? "—" : Number(v).toFixed(digits);
  }

  function lensZ(r) {
    return r.lens_spec_z !== null ? r.lens_spec_z : r.lens_cw_photo_z_med;
  }

  function lensUrl(code) {
    return "lens.html?code=" + encodeURIComponent(code);
  }

  function rawUrl(r, file) {
    return RAW_BASE + r.path + "/" + file;
  }

  function loadData() {
    return fetch("data/lenses.json").then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " loading data/lenses.json");
      return res.json();
    });
  }

  function storageGet(k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } }
  function storageSet(k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function nullsLast(a, b, dir) {
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    if (a < b) return -dir;
    if (a > b) return dir;
    return 0;
  }

  function tierComparator(tiers) {
    var order = {};
    tiers.forEach(function (t, i) { order[t] = i; });
    return function (a, b) {
      return (order[a.tier] - order[b.tier]) ||
        nullsLast(a.ranking, b.ranking, 1) ||
        (a.code < b.code ? -1 : a.code > b.code ? 1 : 0);
    };
  }

  function showError(container, err) {
    container.textContent = "";
    container.appendChild(el("p", { class: "notice", text: "Could not load the lens catalogue: " + err.message }));
  }

  /* ---------- index page ---------- */

  var SORTS = {
    tier: { label: "Tier / ranking" },
    einstein: { label: "Einstein radius (largest first)" },
    z: { label: "Lens redshift" },
    ra: { label: "Right ascension" }
  };

  var COLUMNS = [
    { key: "code", label: "Code" },
    { key: "tier", label: "Tier" },
    { key: "ranking", label: "Ranking" },
    { key: "ra", label: "RA", num: true, digits: 5 },
    { key: "dec", label: "Dec", num: true, digits: 5 },
    { key: "einstein_radius", label: "θE (″)", num: true, digits: 3 },
    { key: "lens_spec_z", label: "z spec", num: true, digits: 3 },
    { key: "lens_cw_photo_z_med", label: "z phot", num: true, digits: 2 },
    { key: "lens_cw_stmass_med", label: "log M★", num: true, digits: 2 },
    { key: "primary_waveband", label: "Primary band" }
  ];

  function initIndex(data) {
    var lenses = data.lenses;
    var tiers = data.tiers;
    var folderTiers = tiers.filter(function (t) {
      return lenses.some(function (r) { return r.tier === t && r.has_folder; });
    });
    var byTier = tierComparator(tiers);

    var state = { tiers: null, q: "", sort: "tier", view: "grid", col: "", dir: 1 };

    function readHash() {
      var p = new URLSearchParams(location.hash.replace(/^#/, ""));
      var t = p.get("tiers");
      state.tiers = t ? new Set(t.split(",").filter(function (x) { return tiers.indexOf(x) >= 0; })) : new Set(folderTiers);
      state.q = p.get("q") || "";
      state.sort = SORTS[p.get("sort")] ? p.get("sort") : "tier";
      state.view = p.get("view") === "table" ? "table" : "grid";
      state.col = p.get("col") || "";
      state.dir = p.get("dir") === "-1" ? -1 : 1;
    }

    function writeHash() {
      var p = new URLSearchParams();
      var sel = tiers.filter(function (t) { return state.tiers.has(t); });
      var isDefault = sel.length === folderTiers.length && folderTiers.every(function (t) { return state.tiers.has(t); });
      if (!isDefault) p.set("tiers", sel.join(","));
      if (state.q) p.set("q", state.q);
      if (state.sort !== "tier") p.set("sort", state.sort);
      if (state.view === "table") p.set("view", "table");
      if (state.view === "table" && state.col) { p.set("col", state.col); p.set("dir", String(state.dir)); }
      var h = p.toString();
      history.replaceState(null, "", h ? "#" + h : location.pathname + location.search);
      storageSet(STATE_KEY, h ? "#" + h : "");
    }

    var chipsBox = document.getElementById("tier-chips");
    var search = document.getElementById("search");
    var sortSel = document.getElementById("sort");
    var viewBtn = document.getElementById("view-toggle");
    var countBox = document.getElementById("count");
    var out = document.getElementById("results");

    Object.keys(SORTS).forEach(function (k) {
      sortSel.appendChild(el("option", { value: k, text: SORTS[k].label }));
    });

    function tierCount(t) {
      return lenses.filter(function (r) { return r.tier === t; }).length;
    }

    function renderChips() {
      chipsBox.textContent = "";
      tiers.forEach(function (t) {
        var isP18 = folderTiers.indexOf(t) < 0;
        if (isP18 && state.view !== "table") return;
        chipsBox.appendChild(el("button", {
          type: "button",
          class: "chip",
          "aria-pressed": state.tiers.has(t) ? "true" : "false",
          title: isP18 ? "Known lenses from prior work (no COWLS data folder)" : "Toggle tier " + t,
          onclick: function () {
            if (state.tiers.has(t)) state.tiers.delete(t); else state.tiers.add(t);
            update();
          }
        }, [t + (isP18 ? " (no data)" : ""), el("span", { class: "n", text: String(tierCount(t)) })]));
      });
      chipsBox.appendChild(el("button", {
        type: "button", class: "chip-link", text: "all",
        onclick: function () { state.tiers = new Set(state.view === "table" ? tiers : folderTiers); update(); }
      }));
      chipsBox.appendChild(el("button", {
        type: "button", class: "chip-link", text: "none",
        onclick: function () { state.tiers = new Set(); update(); }
      }));
    }

    function selected() {
      var q = state.q.trim().toUpperCase();
      var rows = lenses.filter(function (r) {
        if (!state.tiers.has(r.tier)) return false;
        if (state.view === "grid" && !r.has_folder) return false;
        if (q && r.code.toUpperCase().indexOf(q) < 0) return false;
        return true;
      });
      var cmp;
      if (state.view === "table" && state.col) {
        var key = state.col;
        cmp = function (a, b) {
          if (key === "tier") return state.dir * byTier(a, b);
          var va = a[key], vb = b[key];
          return nullsLast(va === undefined ? null : va, vb === undefined ? null : vb, state.dir) || byTier(a, b);
        };
      } else if (state.sort === "einstein") {
        cmp = function (a, b) { return nullsLast(a.einstein_radius, b.einstein_radius, -1) || byTier(a, b); };
      } else if (state.sort === "z") {
        cmp = function (a, b) { return nullsLast(lensZ(a), lensZ(b), 1) || byTier(a, b); };
      } else if (state.sort === "ra") {
        cmp = function (a, b) { return nullsLast(a.ra, b.ra, 1); };
      } else {
        cmp = byTier;
      }
      return rows.sort(cmp);
    }

    function renderGrid(rows) {
      var grid = el("div", { class: "grid" });
      rows.forEach(function (r) {
        grid.appendChild(el("a", { class: "card", href: lensUrl(r.code), title: r.code + " (" + r.tier + ")" }, [
          el("img", { class: "thumb", src: rawUrl(r, "6_rgb.png"), alt: "RGB image of " + r.code, loading: "lazy", decoding: "async", width: "200", height: "200" }),
          el("span", { class: "cap" }, [
            el("span", { class: "code", text: r.code }),
            el("span", { class: "tier " + r.tier, text: r.tier })
          ])
        ]));
      });
      return grid;
    }

    function renderTable(rows) {
      var headRow = el("tr");
      COLUMNS.forEach(function (c) {
        var sort = state.col === c.key ? (state.dir === 1 ? "ascending" : "descending") : null;
        headRow.appendChild(el("th", { class: c.num ? "num" : null, "aria-sort": sort, scope: "col" }, [
          el("button", {
            type: "button", text: c.label,
            onclick: function () {
              if (state.col === c.key) state.dir = -state.dir; else { state.col = c.key; state.dir = c.key === "einstein_radius" ? -1 : 1; }
              update();
            }
          })
        ]));
      });
      var body = el("tbody");
      rows.forEach(function (r) {
        var tr = el("tr");
        COLUMNS.forEach(function (c) {
          var v = r[c.key];
          var cell;
          if (c.key === "code") cell = el("td", { class: "mono" }, [el("a", { href: lensUrl(r.code), text: r.code })]);
          else if (c.key === "tier") cell = el("td", {}, [el("span", { class: "tier " + r.tier, text: r.tier + (r.has_folder ? "" : " (no data)") })]);
          else if (c.num) cell = el("td", { class: "num", text: fmt(v, c.digits) });
          else cell = el("td", { class: v ? "mono" : "muted", text: v || "—" });
          tr.appendChild(cell);
        });
        body.appendChild(tr);
      });
      return el("div", { class: "table-wrap" }, [el("table", {}, [el("thead", {}, [headRow]), body])]);
    }

    function update() {
      writeHash();
      renderChips();
      search.value = state.q;
      sortSel.value = state.sort;
      viewBtn.setAttribute("aria-pressed", state.view === "table" ? "true" : "false");
      viewBtn.textContent = state.view === "table" ? "Show mosaic" : "Show table";
      var rows = selected();
      var total = state.view === "table" ? lenses.length : lenses.filter(function (r) { return r.has_folder; }).length;
      countBox.textContent = rows.length + " of " + total + " lenses";
      out.textContent = "";
      if (!rows.length) out.appendChild(el("p", { class: "empty", text: "No lenses match the current filters." }));
      else out.appendChild(state.view === "table" ? renderTable(rows) : renderGrid(rows));
    }

    search.addEventListener("input", function () { state.q = search.value; update(); });
    sortSel.addEventListener("change", function () { state.sort = sortSel.value; state.col = ""; update(); });
    viewBtn.addEventListener("click", function () {
      state.view = state.view === "table" ? "grid" : "table";
      update();
    });
    window.addEventListener("hashchange", function () { readHash(); update(); });

    readHash();
    update();
  }

  /* ---------- lens page ---------- */

  function initLens(data) {
    var out = document.getElementById("lens");
    var params = new URLSearchParams(location.search);
    var code = (params.get("code") || "").replace(/ /g, "+").trim();
    var r = data.lenses.filter(function (x) { return x.code === code; })[0];

    var back = document.getElementById("back-link");
    if (back) back.href = "index.html" + (storageGet(STATE_KEY) || "");

    out.textContent = "";
    if (!r) {
      out.appendChild(el("div", { class: "notice" }, [
        code ? "No lens with code " : "No lens code given. ",
        code ? el("code", { text: code }) : null,
        code ? " is in the catalogue. " : null,
        el("a", { href: "index.html", text: "Back to the gallery" }), "."
      ]));
      return;
    }

    document.title = r.code + " — COWLS Lens";

    var sameTier = data.lenses.filter(function (x) { return x.tier === r.tier; }).sort(tierComparator(data.tiers));
    var i = sameTier.indexOf(r);
    var prev = sameTier[i - 1], next = sameTier[i + 1];
    function pageLink(x, label) {
      return x ? el("a", { href: lensUrl(x.code), title: x.code, text: label }) : el("span", { class: "disabled", text: label });
    }

    out.appendChild(el("div", { class: "lens-head" }, [
      el("h1", {}, [r.code, el("span", { class: "tier " + r.tier, text: r.tier })]),
      el("nav", { class: "pager", "aria-label": "Lenses in this tier" }, [
        pageLink(prev, "← Previous"),
        el("span", { class: "muted", text: (i + 1) + " / " + sameTier.length + " in " + r.tier }),
        pageLink(next, "Next →")
      ])
    ]));

    var esasky = "https://sky.esa.int/esasky/?target=" + r.ra + "%20" + r.dec + "&hips=JWST&fov=0.01";

    function metaRow(label, value) {
      return [el("dt", { text: label }), el("dd", {}, [value === null || value === undefined || value === "" ? el("span", { class: "muted", text: "—" }) : value])];
    }
    var metaItems = [].concat(
      metaRow("RA, Dec (deg)", el("a", { href: esasky, target: "_blank", rel: "noopener", title: "Open in ESASky", text: fmt(r.ra, 6) + ", " + fmt(r.dec, 6) })),
      metaRow("Tier", r.tier),
      metaRow("Ranking", r.ranking),
      metaRow("Primary waveband", r.primary_waveband),
      metaRow("Field (tile)", r.data_field),
      metaRow("Lens spec-z", r.lens_spec_z !== null ? fmt(r.lens_spec_z, 4) + (r.lens_spec_z_source ? " (" + r.lens_spec_z_source + ")" : "") : null),
      metaRow("Lens photo-z", r.lens_cw_photo_z_med !== null ? fmt(r.lens_cw_photo_z_med, 3) : null),
      metaRow("log₁₀ M★ / M☉", r.lens_cw_stmass_med !== null ? fmt(r.lens_cw_stmass_med, 2) : null),
      metaRow("Einstein radius", r.einstein_radius !== null ? fmt(r.einstein_radius, 3) + "″" : null)
    );

    var links = [el("a", { href: esasky, target: "_blank", rel: "noopener", text: "ESASky" })];
    if (r.has_folder) {
      links.unshift(el("a", { href: TREE_BASE + r.path, text: "Folder on GitHub" }));
      if (r.has_archive_space) links.push(el("a", { href: TREE_BASE + r.path + "/archive_space", text: "archive_space/" }));
      if (r.has_archive_ground) links.push(el("a", { href: TREE_BASE + r.path + "/archive_ground", text: "archive_ground/" }));
      if (r.has_primer) links.push(el("a", { href: TREE_BASE + r.path + "/primer", text: "primer/ (PRIMER data)" }));
      links.push(el("a", { href: rawUrl(r, "info.json"), text: "info.json" }));
      if (r.has_result) links.push(el("a", { href: rawUrl(r, "result.json"), text: "result.json" }));
      links.push(el("a", { href: rawUrl(r, "positions.json"), text: "positions.json" }));
    }

    var metaPanel = el("div", { class: "panel" }, [
      el("h2", { text: "Metadata" }),
      el("dl", { class: "meta" }, metaItems),
      el("div", { class: "links" }, links)
    ]);

    if (!r.has_folder) {
      out.appendChild(el("div", { class: "notice" }, [
        "This is a known lens from prior work (", el("code", { text: r.tier }),
        "), included in the catalogue for completeness. It has no COWLS data folder."
      ]));
      out.appendChild(metaPanel);
      return;
    }

    var hasRgb = r.images.indexOf("6_rgb.png") >= 0;
    out.appendChild(el("div", { class: "lens-top" }, [
      hasRgb ? el("a", { href: rawUrl(r, "6_rgb.png"), title: "Full-size RGB image" }, [
        el("img", { class: "rgb-big", src: rawUrl(r, "6_rgb.png"), alt: "RGB image of " + r.code })
      ]) : el("div", { class: "panel muted", text: "No RGB image." }),
      metaPanel
    ]));

    // Per-band results
    var bands = data.bands.filter(function (b) { return r.bands[b]; });
    if (r.has_result) {
      var rows = [
        ["Lens magnitude (AB)", "lens_mag", 2],
        ["Source magnitude (AB)", "source_mag", 2],
        ["Lensed source magnitude (AB)", "lensed_source_mag", 2],
        ["Magnification μ", "magnification", 2],
        ["Max lensed-source S/N", "max_snr", 1]
      ];
      var head = el("tr", {}, [el("th", { scope: "col", text: "" })].concat(bands.map(function (b) {
        return el("th", { class: "num", scope: "col", text: b + (b === r.primary_waveband ? " ★" : "") });
      })));
      var body = el("tbody", {}, rows.map(function (row) {
        return el("tr", {}, [el("td", { text: row[0] })].concat(bands.map(function (b) {
          return el("td", { class: "num", text: fmt(r.bands[b][row[1]], row[2]) });
        })));
      }));
      out.appendChild(el("section", { class: "block" }, [
        el("h2", { text: "PyAutoLens results" }),
        el("div", { class: "table-wrap" }, [el("table", {}, [el("thead", {}, [head]), body])]),
        el("p", { class: "muted", text: "★ primary waveband (mass model fitted here, then used to reconstruct the source in the other bands). Einstein radius " + fmt(r.einstein_radius, 3) + "″." })
      ]));
    } else {
      out.appendChild(el("section", { class: "block" }, [
        el("h2", { text: "PyAutoLens results" }),
        el("p", { class: "muted", text: "No result.json for this candidate (no lens model was fitted)." })
      ]));
    }

    // Other images
    var others = r.images.filter(function (f) { return f !== "6_rgb.png"; });
    if (others.length) {
      out.appendChild(el("section", { class: "block" }, [
        el("h2", { text: "Images" }),
        el("div", { class: "figs" }, others.map(function (f) {
          return el("figure", { class: f === "1_rgb_fit_summary.png" ? "fig wide" : "fig" }, [
            el("a", { href: rawUrl(r, f), title: "Open full size" }, [
              el("img", { src: rawUrl(r, f), alt: IMAGE_LABELS[f] || f, loading: "lazy", decoding: "async" })
            ]),
            el("figcaption", {}, [el("code", { text: f }), " — " + (IMAGE_LABELS[f] || "")])
          ]);
        }))
      ]));
    }

    // Fits downloads
    out.appendChild(el("section", { class: "block" }, [
      el("h2", { text: ".fits downloads" }),
      el("div", { class: "downloads" }, bands.map(function (b) {
        var files = data.file_sets[r.bands[b].files] || [];
        return el("div", { class: "panel" }, [
          el("h2", {}, [el("a", { href: TREE_BASE + r.path + "/" + b, text: b }), b === r.primary_waveband ? el("span", { class: "muted", text: " (primary)" }) : null]),
          files.length ? el("ul", {}, files.map(function (f) {
            return el("li", {}, [el("a", { href: rawUrl(r, b + "/" + f), download: "", text: f })]);
          })) : el("p", { class: "muted", text: "No files." })
        ]);
      }))
    ]));
  }

  /* ---------- boot ---------- */

  document.addEventListener("DOMContentLoaded", function () {
    var page = document.body.getAttribute("data-page");
    if (page !== "index" && page !== "lens") return;
    var container = document.getElementById(page === "index" ? "results" : "lens");
    loadData().then(function (data) {
      if (page === "index") initIndex(data); else initLens(data);
    }).catch(function (err) { showError(container, err); });
  });
})();
