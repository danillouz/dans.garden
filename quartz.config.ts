import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    author: "Daniël Illouz",
    pageTitle: "dans.garden",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "dans.garden",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "created",
    theme: {
      borderRadius: "3px",
      fontOrigin: "googleFonts",
      cdnCaching: true,
      typography: {
        header: "Open Sans",
        body: "Merriweather",
        code: "Fira Code",
      },

      // Using the Rosé Pine color palette (light = dawn, dark = moon):
      // https://rosepinetheme.com/palette
      //
      // - `light`: Background (Rosé Pine "Surface").
      // - `lightgray`: Borders (Rosé Pine "Overlay").
      // - `gray`: Graph links, page metadata (Rosé Pine "Muted").
      // - `darkgray`: Text (Rosé Pine "Text").
      // - `dark`: Headers (Rosé Pine "Pine").
      // - `secondary`: Title, links, current graph node (Rosé Pine "Rose").
      // - `tertiary`: Hover and visited graph nodes (Rosé Pine "Gold").
      // - `highlight`: Wiki links background, (search) highlighted text
      //   (Rosé Pine "Overlay").
      // - `textHighlight`: Markdown highlighted text background (Rosé Pine
      //   "Iris").
      colors: {
        lightMode: {
          light: "#fffaf3",
          lightgray: "#f2e9e1",
          gray: "#9893a5",
          darkgray: "#575279",
          dark: "#286983",
          secondary: "#d7827e",
          tertiary: "#ea9d34",
          highlight: "#f2e9e1",
          textHighlight: "#907aa9",
        },
        darkMode: {
          light: "#2a273f",
          lightgray: "#393552",
          gray: "#6e6a86",
          darkgray: "#e0def4",
          dark: "#3e8fb0",
          secondary: "#ea9a97",
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
        priority: ["frontmatter"],
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
        rssLimit: 10,
        includeEmptyFiles: false,

        // Some icons render very large making it unreadable.
        // So for now don't show the full text.
        rssFullHtml: false,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
