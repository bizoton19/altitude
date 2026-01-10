# Altitude Documentation

This folder contains the GitHub Pages documentation site.

## Structure

- `index.md` - Homepage (renders to `index.html`)
- `userguide.md` - User guide (renders to `userguide.html`)
- `_layouts/default.html` - Jekyll layout template
- `_config.yml` - Jekyll configuration

## GitHub Pages Configuration

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` (or `master`)
4. Folder: `/docs`
5. Save

The site will be available at: `https://bizoton19.github.io/altitude/`

## Local Testing

To test locally with Jekyll:

```bash
cd docs
bundle install
bundle exec jekyll serve
```

Then visit: `http://localhost:4000/altitude/`

