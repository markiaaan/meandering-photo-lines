# Meandering Photo Lines

Meandering Photo Lines is a visualization for exploring photo collections across space, time, and topics through a aligned grid and a meandering path arrangement. It was developed within the [GraDiM research project](https://gradim.fh-potsdam.de/) at the [UCLAB, University of Applied Sciences Potsdam](https://uclab.fh-potsdam.de/), in collaboration with the [University of Rostock](https://vca.informatik.uni-rostock.de/).

![Meandering Photo Lines preview](https://markjanbludau.de/photolines/assets/img/og-preview.jpg)


## Paper background

***Meandering Photo Lines: Fluid Multiscale Exploration of Photographic Archives*  
Mark-Jan Bludau, Christian Tominski, and Marian Dörk. IEEE Transactions on Visualization and Computer Graphics, 2027.**


**[Project website](https://uclab.fh-potsdam.de/photolines/) | [Paper preprint](https://arxiv.org/pdf/2607.23769) | [Interactive prototype](https://markjanbludau.de/photolines) | [Video demo](https://uclab.fh-potsdam.de/photolines/assets/video/meanderingPhotoLines_demo.mp4)**

**Abstract:** We introduce a visualization that interweaves spatial and temporal structures of photo collections into explorable pathways. Existing photo browsing interfaces typically use space and time separately for sorting, filtering, or mapping photos. What remains missing is an integrated visual form that represents the photographic journey itself. This is particularly relevant for the individual photographer's archive, where their unique lifeline is written into the collection, and it is this spatiotemporal trajectory that gives necessary context and meaning to the work. Inspired by the winding nature of rivers and fluid interaction, **Meandering Photo Lines** visualize adjustable pathways through a photo collection across space, time, and topics. Two complementary views enable visual exploration at different scales: A grid-based arrangement of photo clusters offers a more analytical overview, while meandering spatiotemporal curves facilitate more serendipitous and reflective exploration. Animated transformations connect these two views seamlessly for multiscale navigation from spatiotemporal cluster signatures down to chronological photo series and individual photographs. We demonstrate our approach through two case studies: an archive of approximately 100,000 photographs documenting Jewish diaspora life worldwide since 1978 and a personal smartphone collection of around 20,000 pictures. Qualitative feedback from a think-aloud study indicates that our approach supports both analytical examination and curiosity-driven engagement.

## About



The repository provides a simplified version of the prototypes presented in the paper. It includes AI-generated synthetic example data and images. Instead of OSM data, the base maps use static Natural Earth data for major roads, and the photo preparation notebook uses offline reverse geocoding to infer approximate place and country names from the nearest town. 

When using your own photos, all photo processing is performed locally. Photos, metadata, and generated CSV data are not uploaded to external services. Photo series and keywords are not generated automatically via the notebooks. Their CSV columns are left empty, so each photo is treated as a separate series and keyword filtering is unavailable. Optionally, series could be generated based on temporal and spatial proximity, combined with visual similarity measured using a library such as [ImageHash](https://github.com/JohannesBuchner/imagehash). Keywords could be assigned using a vision-language model such as [CLIP](https://github.com/openai/CLIP) with a predefined vocabulary. Alternatively, photo series and keywords can be added through manual cataloging.

## Run the visualization

The repository includes synthetic example data, images, and map tiles. No notebooks or data preparation are required.

With Python installed, start a local server from the project root (replace the placeholder path with the actual project path):

```bash
cd /path/to/meandering-photo-lines
python3 -m http.server 8000
```

Open [localhost:8000](http://localhost:8000) in your browser.

## Use your own photos

*Privacy note: If you upload or publicly share your visualization, its photos and dataset may reveal precise locations, timestamps, and identifiable people. Review the images and metadata before publishing, remove sensitive information, and make sure you have permission to share photos of others. The processing scripts do not automatically blur faces or anonymize location data.*  

You need Python with Jupyter and Node.js 22.12 or newer. The notebooks include dependency installation cells.

1. Place your photos in `originalSourceFiles`. Photos need EXIF capture dates and GPS coordinates.
2. Run all cells in [prepare-photos.ipynb](dataProcessing/0_originalImageProcessing/prepare-photos.ipynb). Set `overwriteData = True` to replace the example dataset. This creates `data.csv` and WebP images in `assets/img/photos/L`, `S`, and `XS`. Original photos remain unchanged.
3. Run all cells in [mapRenderNotebook.ipynb](dataProcessing/1_mapExporter/mapRenderNotebook.ipynb) to generate the map tiles.
4. Start a local server from the project root:

   ```bash
   cd /path/to/meandering-photo-lines
   python3 -m http.server 8000
   ```

   Open [localhost:8000](http://localhost:8000) in your browser.



## Credits

- **[Mark-Jan Bludau](https://markjanbludau.de):** Design, development, and paper.
- **[Christian Tominski](https://vca.informatik.uni-rostock.de/~ct/):** Paper and supervision.
- **[Marian Dörk](https://mariandoerk.de):** Paper and supervision.
- **[GraDiM team](https://gradim.fh-potsdam.de) — Viktoria Brüggemann, Jona Pomerance, Silvia Casavola, and Boris Müller:** Feedback and support.

Contact: mail @ markjanbludau.de 

This repository is based on the visualization prototypes presented in the paper *Meandering Photo Lines: Fluid Multiscale Exploration of Photographic Archives*. ChatGPT and Codex (OpenAI) were used to assist with code suggestions, adaptations, debugging, and documentation, particularly in making the visualization and its processing scripts reusable with other photo collections and creating the pipeline.
