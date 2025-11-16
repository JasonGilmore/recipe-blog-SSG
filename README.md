# Recipe Blog Static Site Generator

A small static site generator for publishing recipes and food blogs. Write content in Markdown and publish a static HTML site.

## Features

-   Convert Markdown posts with front-matter into HTML pages.
-   Configurable site structure and navigation via `src/config.json` (overrides [`src/config.default.json`](src/config.default.json)).
-   Generate homepage, menu pages and post pages using simple templating (see [`src/templates/`](src/templates)).
-   Copy and sanitize image assets (Exif removal).
-   Simple visit counter feature.

## Quick start

1. Install dependencies:

    ```sh
    npm install
    ```

2. Build the static site:

    ```sh
    npm run build
    ```

3. Serve the site:
    ```sh
    npm run serve
    ```
    Or run `npm start` to build then serve.

## Configuration

The site generator reads default settings from [`src/config.default.json`](src/config.default.json). To customize content and output directories, and content structure (which controls navigation tabs), create `src/config.json` which will override the defaults.

Create a siteContent.json file within the [`src/templates/`](src/templates/) directory for key site information including a reference to the homepage image. Place the homepage image and a favicon into the [`src/templates/images/`](src/templates/images/) directory. siteContent.json supports the following fields:

-   **siteName**: the name of the site, used in the navigation bar.
-   **mainIntroduction**: the main introduction text, used on the homepage.
-   **secondaryIntroduction**: the secondary introduction text, used on the homepage after the main introduction.
-   **mainImage**: the name of the main image in the [`src/templates/images/`](src/templates/images/) directory.

## Content structure

-   The content root is the folder configured by `contentDirectory` in the configuration.
-   Each top-level section (e.g. `recipes`, `blogs`) should contain post folders. Each post folder contains a Markdown file (post) and optional assets (images).
-   Footer content lives in the `footers` directory. Each footer is a single Markdown file and is automatically included in the footer on the site.

Example folder structure:

```
content/
  recipes/
    fruit-tart/
      fruit-tart.md
      tart.jpg
    chocolate-cake/
      chocolate-cake.md
      cake.jpg
      cake-closeup.jpg
  blogs/
    sourdough-starter-101/
      sourdough-starter-101.md
  footers/
    about.md
    disclaimer.md
```

## Front-matter

Front-matter is used to define metadata for site generation.

Front-matter for posts:

-   **title**: the name of the post for display on site cards.
-   **description**: the description of the post for display on site cards.
-   **date**: used for home page card sorting.
-   **image**: the image of the post for display on site cards.

Front-matter for footers:

-   **displayName**: the name in the site footer.
-   **order**: the order it appears in the site footer.

## Templates & Assets

-   Templates live in `src/templates/`.
-   Static assets (CSS/JS) are copied to the public output by the assets handler.

## Posts

This project supports a few post-specific conveniences for writing recipes and food content.

### Relative images

-   Use relative image paths in your Markdown (example: `![alt](./image.jpg 'Title')`).
-   This supports local previewing while writing content.
-   On build the generator copies those images into the output directory and rewrites the image references in the generated HTML, so they point to the copied asset in the public site.

### Tables

-   Markdown tables are automatically styled by the site CSS for improved readability. Write standard Markdown tables and the style will be applied on build.

Example:

```markdown
| Ingredient | Amount |
| ---------- | ------ |
| Flour      | 500 g  |
| Water      | 350 g  |
```

### Recipe box markers

-   Wrap recipe-specific content in the recipe box markers to produce a styled recipe block:
    -   Start marker: `{recipeboxstart}`
    -   End marker: `{recipeboxend}`
-   Anything between these markers is rendered as a single recipe block.
    Example:

```markdown
{recipeboxstart}

## Ingredients

-   500 g flour
-   350 g water
-   ...

### Method

1. Combine all ingredients.
2. ...

{recipeboxend}
```

## Visit Counter

This generator includes an optional visit counter to track post views and unique site visitors.

-   Visit counting is enabled by default but can be customised via the `enableVisitCounter` property in the configuration.
-   Visit counting stores simple numeric data, persisted in `data/visitCounts.json`. Content views are counted per post, and unique site visitors per day. Unique visitor counts are rotated so only the last 30 days of visits are kept.
-   For counting unique visitors, ip addresses are stored and reset each day. If you require stricter privacy, disable this feature.
-   Example:

```json
{
    "recipes": {
        "fruit-tart": 15,
        "sourdough": 20
    },
    "blogs": {
        "howto-pie-crust": 15,
        "howot-layer-cakes": 35
    },
    "uniqueVisits": {
        "2025-11-14": 25,
        "2025-11-15": 30
    }
}
```
