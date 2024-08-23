import { i18n } from "../i18n"
import { FullSlug, joinSegments, pathToRoot } from "../util/path"
import { JSResourceToScriptElement } from "../util/resources"
import { googleFontHref } from "../util/theme"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

export default (() => {
  const Head: QuartzComponent = ({ cfg, fileData, externalResources }: QuartzComponentProps) => {
    const title = fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
    const description =
      fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description
    const { css, js } = externalResources
    const url = new URL(`https://${cfg.baseUrl ?? "example.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)
    return (
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="author" content={cfg.author} />

        {/* Theme. */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fffaf3" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#2a273f" />

        {/* Icons. */}
        <link rel="icon" href={joinSegments(baseDir, "static/icon.png")} />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={joinSegments(baseDir, "static/icon-16.png")}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={joinSegments(baseDir, "static/icon-32.png")}
        />
        <link rel="apple-touch-icon" sizes="180x180" href="static/apple-180.png" />

        {/* Manifest. */}
        <link rel="manifest" href="static/manifest.json" />

        {/* Sitemap. */}
        {cfg.baseUrl && <link rel="sitemap" href={`https://${cfg.baseUrl}/sitemap.xml`} />}

        {/* RSS. */}
        {cfg.baseUrl && (
          <link
            rel="alternate"
            type="application/rss+xml"
            title={i18n(cfg.locale).pages.rss.title}
            href={`https://${cfg.baseUrl}/index.xml`}
          />
        )}

        {/* OpenGraph. */}
        <meta property="og:type" content="website" />
        {cfg.baseUrl && <meta property="og:url" content={`https://${cfg.baseUrl}`} />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        {cfg.baseUrl && (
          <meta property="og:image" content={`https://${cfg.baseUrl}/static/og-image.png`} />
        )}

        {/* Fonts, CSS and JS. */}
        {cfg.theme.cdnCaching && cfg.theme.fontOrigin === "googleFonts" && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" />
            <link rel="stylesheet" href={googleFontHref(cfg.theme)} />
          </>
        )}
        {css.map((href) => (
          <link key={href} href={href} rel="stylesheet" type="text/css" spa-preserve />
        ))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}

        {/* Misc. */}
        <meta name="generator" content="Quartz" />
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
