# Recipe Blog Static Site Generator

A small static site generator for publishing recipe and food blogs. Write content in Markdown and publish a static HTML site. Designed to run behind a reverse proxy.

## Features

-   Convert Markdown posts with front-matter into HTML pages.
-   Configurable site structure and navigation via `src/config.json` (overrides [`src/config.default.json`](src/config.default.json)).
-   Generate homepage, top-level pages and post pages using simple templating (see [`src/templates/`](src/templates)).
-   Copy and sanitize image assets (Exif removal for JPG/JPEG).
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

The site generator reads default settings from [`src/config.default.json`](src/config.default.json). To customize content and output directories and post types (which controls top-level pages), create `src/config.json` which will override the defaults.

Create a siteContent.json file within the [`src/templates/`](src/templates/) directory for key site information including a reference to the homepage image. Place the homepage image and a favicon into the [`src/templates/images/`](src/templates/images/) directory. siteContent.json supports the following fields:

-   **siteName**: the site name.
-   **mainIntroduction**: the main introduction text, used on the homepage.
-   **secondaryIntroduction**: the secondary introduction text, used on the homepage after the main introduction.
-   **siteUrl**: the site url.
-   **heroImage**: the name of the main image in the [`src/templates/images/`](src/templates/images/) directory, used for the homepage hero image.
-   **heroImageSmall**: the name of a smaller sized version of the hero image (<300KB) in the [`src/templates/images/`](src/templates/images/) directory, used for og image previews to conform to image size limits.
-   **heroImageAlt**: alt text for the hero images.
-   **[post type name]Image (such as recipesImage)**: the name of an image in the [`src/templates/images/`](src/templates/images/) directory, to display as a small icon at the top of top-level page.

## Content structure

-   The content root is the folder configured by `contentDirectory` in the configuration.
-   Each post type (e.g. `recipes`, `blogs`) should contain a post folder for each post. Each post folder contains a Markdown file (post) and optional assets (images).
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

Front-matter is used to define metadata for site generation and structured data markup generation.

Front-matter for posts:

-   **title**: the name of the post for display on site cards and og link previews.
-   **description**: the description of the post for display on site cards and og link previews.
-   **keywords**: comma separated keywords related to the post.
-   **date**: the date in ISO format for recent post sorting.
-   **image**: the image of the post for display on site cards and og link previews.
    -   Ensure the image is <300KB to conform to image size limits for link previews.

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

### Recipe and box layout blocks

-   Wrap recipe-specific content in the recipe box layout block to produce a styled recipe block:
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

Use `{lightstyleboxstart} {lightstyleboxend}` and `{darkstyleboxstart} {darkstyleboxend}` for additional styled layout blocks to group content.

### Tables

-   Markdown tables are styled for improved readability. Write standard Markdown tables and the style will be applied automatically.

Example:

```markdown
| Ingredient | Amount |
| ---------- | ------ |
| Flour      | 500 g  |
| Water      | 350 g  |
```

### Additional Features

-   **Jump to recipe**: Add a jump to recipe button by adding the `{jumptorecipebox}` marker anywhere in the content. This will generate a button that, when clicked, scrolls the page to the start of the first recipe box.
-   **Ingredient checkboxes**: Add checkboxes for ingredients using markdown task list syntax `- [ ]`. These will be styled and will cross out the text when checked.

## Visit Counter

This generator includes an optional visit counter to track site visits.

-   Visit counting is enabled by default but can be customised via the `enableVisitCounter` property in the configuration. Simple numeric data is stored, persisted in `data/visitCounts.json`.
-   totalPostHits are incremented indefinitely, and visit stats are captured daily. Daily visit stats are rotated so only the last 30 days of visits are kept.
-   For counting totalPostHits, homepageHits and postHits a simple client-side JavaScript tracking is used. For counting unique visitors, hashed ip address and user agent are stored and reset each day. If you require stricter privacy, disable this feature.
-   Example:

```json
{
    "totalPostHits": {
        "recipes": {
            "fruit-tart": 15,
            "sourdough": 20
        },
        "blogs": {
            "howto-pie-crust": 10,
            "howot-layer-cakes": 5
        }
    },
    "2026-01-04": {
        "uniqueAppHits": 40,
        "homepageHits": 15,
        "postHits": 35
    },
    "2026-01-05": {
        "uniqueAppHits": 25,
        "homepageHits": 10,
        "postHits": 15
    }
}
```
