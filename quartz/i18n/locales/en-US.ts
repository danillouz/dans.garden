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
      title: "Backlinks",
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
      title: "Graph View",
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
      title: "Table of Contents",
    },
    contentMeta: {
      createdAt: "Planted",
      readingTime: ({ minutes }) => `${minutes} min read`,
      updatedAt: "Last tended",
    },
  },
  pages: {
    rss: {
      title: "Dan's garden feed",
      description: "Fresh from Dan's garden.",
    },
    error: {
      title: "Page Not Found",
      notFound: "This page doesn't exist.",
      home: "Back Home",
    },
    folderContent: {
      folder: "Folder",
      itemsUnderFolder: ({ count }) =>
        count === 1 ? "1 item in this folder." : `${count} items in this folder.`,
    },
    tagContent: {
      tag: "Tag",
      tagIndex: "Tags",
      itemsUnderTag: ({ count }) =>
        count === 1 ? "1 item with this tag." : `${count} items with this tag.`,
      showingFirst: ({ count }) => `Showing first ${count} tags.`,
      totalTags: ({ count }) => `Found ${count} total tags.`,
    },
  },
} as const satisfies Translation
