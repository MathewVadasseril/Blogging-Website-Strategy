# Workflow

How changes reach **Mathew - Blogs**. Read this before changing the site.

## Environments

| | Live site | Test site |
|---|---|---|
| Address | https://mathewvadasseril.github.io/msv-blogs/ | https://msvblogs-dev.netlify.app |
| Hosted on | GitHub Pages | Netlify (project `msvblogs-dev`) |
| Deploys from branch | `main` | `develop` |
| Who can see it | Everyone | Only the owner (Private) |
| Editor (`/admin`) saves to | `main` | `develop` |
| Cost per deploy | Free | Netlify credits (free plan: 300 a month) |

Both sites rebuild automatically, a minute or two after a push to their branch.
The live site's progress shows in the repo's **Actions** tab ("Deploy to GitHub Pages").

**Why two hosts:** every saved post is a deploy. GitHub Pages deploys for free, so
everyday publishing lives there. Netlify can keep a site private, so it's used only
for testing major changes, which keeps credit use low.

To push to `develop` without spending Netlify credits (for example, docs-only
changes), put `[skip netlify]` in the commit message.

## Which path to use

### Blog posts and small changes → straight to `main`

- **Posts and booklets:** write them at https://mathewvadasseril.github.io/msv-blogs/admin/.
  - **Save** keeps your work as a **draft on GitHub** (a branch and pull request) until you publish or delete it, so you can return to it days later on any device. Unfinished drafts are listed on the editor's **Workflow** board (Drafts → In Review → Ready).
  - **Publish** merges the draft into `main`, and the live site updates a minute or two later.
  - A draft stays until you delete it from the Workflow board.
  - The browser also backs up unsaved typing and offers to restore it.
  - **Site Settings** has no drafts: Save publishes it straight away.
  - The **Draft (hide from site)** switch is separate: it keeps a *published* post hidden from the site.
- **Small fixes** (copy, a button, a style tweak): commit directly to `main`.

### Major design changes or new features → through `develop`

1. **Sync:** bring `develop` up to date with `main`.
   GitHub pull request: base `develop` ← compare `main`, then merge.
2. **Build:** commit the changes to `develop`.
3. **Test:** check https://msvblogs-dev.netlify.app (desktop and phone, light and dark). Fix and repeat.
4. **Sync again just before release:** merge `main` into `develop` once more, so the test site shows the new design with every post written in the meantime. Re-check it.
5. **Release:** GitHub pull request: base `main` ← compare `develop`, then merge.

When no major change is in progress, `develop` sits idle and falls behind `main`. That's expected; step 1 catches it up.

## Rules

- **Never write real posts on the test site's `/admin`.** It saves to `develop`, and anything there goes live at the next release. Test posts must be marked **Draft** or deleted before step 5.
- **If a redesign changes the post or booklet format** (new or renamed fields), update every existing file in `content/` and `admin/config.yml` in the same change, so nothing breaks at release.
- **Don't edit `content/library.json`.** It's generated on every deploy and isn't stored in the repo.

## How the site is built

- `index.html` is the whole site. It loads `content/library.json` at startup.
- Posts live in `content/posts/*.json`, booklets in `content/booklets/*.json`, and the home page, header and footer text in `content/site.json` ("Site Settings" in the editor). The editor at `/admin` ([Sveltia CMS](https://github.com/sveltia/sveltia-cms), configured in `admin/config.yml`) creates and edits these files as commits.
- On every deploy, `node scripts/build-content.js` bundles the content into `content/library.json`.
  - GitHub Pages runs it from `.github/workflows/pages.yml` on every push to `main`.
  - Netlify runs it from `netlify.toml`. On builds of any branch other than `main`, it also points the editor at that branch.
- Paths in the site are relative (no leading `/`), because GitHub Pages serves it from the `/msv-blogs/` sub-folder. Keep new paths relative.
- Each booklet has a `chapters` list. A chapter's `type` picks its layout: `blocks` ("Build your own": a list of text, image, callout, cards, quote, table, metrics, timeline and listbox blocks), `intuition`, `framework`, `casestudy`, `slides`, `venture`, or `text` (free-form Markdown). Older files with fixed `ch1`–`ch5` fields still display.
- Uploaded images go to `images/uploads/`.
- `admin/config.yml` sets `publish_mode: editorial_workflow`, so entries are saved as drafts (branches named `cms/...` with pull requests into `main`) until published. Neither host builds those branches: GitHub Pages deploys only `main`, and Netlify only `develop`.
- `admin/editor.css` is the editor's theme: an earth palette (ivory, cream and linen surfaces; burgundy, walnut, sage, brass and terracotta accents) with layered shadows, serif field names, a burgundy top bar, and the preview set in a dark walnut frame. Fields are colour-coded by type: burgundy for titles and short text, sage for formatted text, walnut for lists, brass for grouped sections, terracotta for images and taupe for settings. Dark mode uses an espresso version of the same palette.
- `admin/editor.js` adds the editor's toolbar widgets and live previews:
  - **Widgets** (callout, cards, table, number tiles, timeline, list box) inserted from a text box's **Insert** menu are saved in the Markdown as ` ```msv-block ` fences holding JSON. `index.html` draws them with the same renderers as "Build your own" blocks.
  - **Previews** load the real site at `index.html#preview` and send it the entry being edited with `postMessage`, so the preview matches the live design.

### Preview locally

```sh
node scripts/build-content.js
npx serve .        # then open the address it prints
```

Opening `index.html` directly from disk won't work, because the browser blocks it from loading `content/library.json`.

## Editor sign-in

`/admin` signs in with a GitHub **fine-grained personal access token**:

- **Repository access:** only `MathewVadasseril/msv-blogs`
- **Permissions:**
  - Contents → **Read and write**
  - Pull requests → **Read and write** (needed for drafts)
  - Metadata: Read-only (GitHub adds this automatically)

When the token expires, create a new one the same way and sign in again.
