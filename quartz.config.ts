import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "🌻 Dan's garden",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "dans.garden",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Merriweather",
        body: "Open Sans",
        code: "Fira Code",
      },

      // Using the Rosé Pine color palette (light = dawn, dark = moon):
      // https://rosepinetheme.com/palette
      //
      // - `light`: Background (Rosé Pine "Surface").
      // - `lightgray`: Borders (Rosé Pine "Highlight Med").
      // - `gray`: Graph links, page metadata (Rosé Pine "Muted").
      // - `darkgray`: Text (Rosé Pine "Text").
      // - `dark`: Headers (Rosé Pine "Pine").
      // - `secondary`: Title, links, current graph node (Rosé Pine "Love").
      // - `tertiary`: Hover and visited graph nodes (Rosé Pine "Gold").
      // - `highlight`: Wiki links background, (search) highlighted text
      //   (Rosé Pine "Overlay").
      // - `textHighlight`: Markdown highlighted text background (Rosé Pine
      //   "Iris").
      colors: {
        lightMode: {
          light: "#fffaf3",
          lightgray: "#dfdad9",
          gray: "#9893a5",
          darkgray: "#575279",
          dark: "#286983",
          secondary: "#b4637a",
          tertiary: "#ea9d34",
          highlight: "#f2e9e1",
          textHighlight: "#907aa9",
        },
        darkMode: {
          light: "#2a273f",
          lightgray: "#44415a",
          gray: "#6e6a86",
          darkgray: "#e0def4",
          dark: "#3e8fb0",
          secondary: "#eb6f92",
          tertiary: "#f6c177",
          highlight: "#393552",
          textHighlight: "#c4a7e7",
        },
      },
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "rose-pine-dawn",
          dark: "rose-pine-moon",
        },
        keepBackground: true,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: false }),
      Plugin.GitHubFlavoredMarkdown(),
      Plugin.TableOfContents(),
      Plugin.CrawlLinks({
        markdownLinkResolution: "shortest",
        openLinksInNewTab: true,
        externalLinkIcon: true,
      }),
      Plugin.Description(),
      Plugin.Latex({ renderEngine: "katex" }),
    ],
    filters: [Plugin.RemoveDrafts()],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
        rssFullHtml: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
