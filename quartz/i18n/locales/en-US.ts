import { Translation } from "./definition"

export default {
  propertyDefaults: {
    title: "Untitled",
    description: "No description provided",
  },
  components: {
    callout: {
      note: "Note",
      abstract: "Abstract",
      info: "Info",
      todo: "Todo",
      tip: "Tip",
      success: "Success",
      question: "Question",
      warning: "Warning",
      failure: "Failure",
      danger: "Danger",
      bug: "Bug",
      example: "Example",
      quote: "Quote",
    },
    backlinks: {
      title: "Linking to this page",
      noBacklinksFound: "No backlinks.",
    },
    themeToggle: {
      lightMode: "Light mode",
      darkMode: "Dark mode",
    },
    explorer: {
      title: "Index",
    },
    attribution: {
      createdWith: "Built with",
    },
    graph: {
      title: "Garden view",
    },
    recentNotes: {
      title: "Recent",
      seeRemainingMore: ({ remaining }) => `See ${remaining} more →`,
    },
    transcludes: {
      transcludeOf: ({ targetSlug }) => `Transclude of ${targetSlug}`,
      linkToOriginal: "Link to original",
    },
    search: {
      title: "Search..",
      searchBarPlaceholder: "Search Dan's garden..",
    },
    tableOfContents: {
      title: "On this page",
    },
    contentMeta: {
      createdAt: "Planted",
      readingTime: ({ minutes }) => `${minutes} min read`,
      updatedAt: "Last tended",
    },
  },
  pages: {
    rss: {
      title: "Dan's garden",
      description: "Fresh from Dan's garden.",
    },
    error: {
      title: "Page Not Found",
      notFound: "This page doesn't exist.",
      home: "Back Home",
    },
    folderContent: {
      folder: "Folder",
      itemsUnderFolder: ({ count }) => (count === 1 ? "1 item" : `${count} items`),
    },
    tagContent: {
      tagIndex: "Tags",
      itemsUnderTag: ({ count }) => (count === 1 ? "1 item" : `${count} items`),
      showingFirst: ({ count, total }) => `showing ${count} of ${total} items`,
      totalTags: ({ count }) => `${count} unique tags`,
    },
  },
} as const satisfies Translation
