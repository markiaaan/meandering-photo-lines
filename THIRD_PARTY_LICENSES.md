# Third-party licenses

This project includes or depends on third-party software and data. These
components remain subject to their own licenses. The project license does not
replace the licenses listed below.

## Files included in this repository

### D3.js

- Version: 7.9.0
- File: `assets/js/d3.v7.min.js`
- Project: https://d3js.org/
- Source and license: https://github.com/d3/d3
- License: ISC
- Copyright: 2010–2023 Mike Bostock

> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
> WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
> MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
> SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
> WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
> OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
> CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### TopoJSON Client

- Version: 3.1.0
- File: `assets/js/topojson-client@3.js`
- Project: https://github.com/topojson/topojson-client
- License: ISC
- Copyright: 2012–2019 Michael Bostock

> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
> WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
> MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
> SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
> WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
> OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
> CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### World Atlas

- File: `assets/data/land-110m.json`
- Project: https://github.com/topojson/world-atlas
- License: ISC
- Copyright: 2013–2019 Michael Bostock

World Atlas distributes Natural Earth data converted to TopoJSON. The source
Natural Earth data are public domain. The World Atlas conversion and
distribution are covered by its ISC license.

> Permission to use, copy, modify, and/or distribute this software for any
> purpose with or without fee is hereby granted, provided that the above
> copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
> WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
> MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
> SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
> WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
> OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
> CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

### Natural Earth

- Files: `dataProcessing/1_mapExporter/data/maps/*`
- Project: https://www.naturalearthdata.com/
- Terms: https://www.naturalearthdata.com/about/terms-of-use/
- Status: Public domain

Natural Earth states that all versions of its raster and vector map data are
in the public domain. Attribution is not required. Suggested attribution:
"Made with Natural Earth."

### Google Material Symbols

- Use: SVG path data embedded in the interface
- Project: https://github.com/google/material-design-icons
- License: Apache License 2.0
- License text: https://www.apache.org/licenses/LICENSE-2.0
- Copyright: Google LLC

## Packages installed when running the notebooks

The following packages are not committed to this repository. They are
installed locally by `pip` or `npm` and include their own license files.
Python package versions are currently not pinned, so the license information
below describes the referenced upstream projects at the time this notice was
written. The license included with the installed version is authoritative.

### Node.js packages used by the map renderer

| Package | Version | License | Project |
| --- | --- | --- | --- |
| D3 | 7.9.0 | ISC | https://github.com/d3/d3 |
| TopoJSON Client | 3.1.0 | ISC | https://github.com/topojson/topojson-client |
| resvg-js | 2.6.2 | MPL-2.0 | https://github.com/thx/resvg-js |
| sharp | 0.35.4 | Apache-2.0 | https://github.com/lovell/sharp |

Transitive Node.js dependencies and native binaries are recorded in
`dataProcessing/1_mapExporter/package-lock.json`. Their license notices are
included in the packages installed under `node_modules`.

### Python packages used by the notebooks

| Package | License | Project |
| --- | --- | --- |
| Pillow | MIT-CMU | https://github.com/python-pillow/Pillow |
| pillow-heif | BSD-3-Clause for the Python source; binary wheels contain separately licensed codec libraries | https://github.com/bigcat88/pillow_heif |
| reverse_geocoder | LGPL-2.1 | https://github.com/thampiman/reverse-geocoder |
| pycountry | LGPL-2.1-only | https://github.com/pycountry/pycountry |
| tqdm | MPL-2.0 and MIT | https://github.com/tqdm/tqdm |

`reverse_geocoder` uses geographic data from GeoNames. GeoNames data is
licensed under Creative Commons Attribution 4.0:
https://www.geonames.org/export/

The `pillow-heif` binary wheels can bundle libraries under additional
licenses, including LGPL and GPL licenses. See the license information shipped
with the installed wheel before redistributing those binaries:
https://github.com/bigcat88/pillow_heif/blob/master/LICENSES_bundled.txt
