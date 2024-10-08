import { FullSlug } from "../../util/path"

export interface CalloutTranslation {
  note: string
  abstract: string
  info: string
  todo: string
  tip: string
  success: string
  question: string
  warning: string
  failure: string
  danger: string
  bug: string
  example: string
  quote: string
}

export interface Translation {
  propertyDefaults: {
    title: string
    description: string
  }
  components: {
    callout: CalloutTranslation
    backlinks: {
      title: string
      noBacklinksFound: string
    }
    themeToggle: {
      lightMode: string
      darkMode: string
    }
    explorer: {
      title: string
    }
    attribution: {
      createdWith: string
    }
    graph: {
      title: string
    }
    recentNotes: {
      title: string
      seeRemainingMore: (variables: { remaining: number }) => string
    }
    transcludes: {
      transcludeOf: (variables: { targetSlug: FullSlug }) => string
      linkToOriginal: string
    }
    search: {
      title: string
      searchBarPlaceholder: string
    }
    tableOfContents: {
      title: string
    }
    contentMeta: {
      createdAt: string
      readingTime: (variables: { minutes: number }) => string
      updatedAt: string
    }
  }
  pages: {
    rss: {
      title: string
      description: string
    }
    error: {
      title: string
      notFound: string
      home: string
    }
    folderContent: {
      itemsUnderFolder: (variables: { count: number }) => string
    }
    tagContent: {
      tagIndex: string
      itemsUnderTag: (variables: { count: number }) => string
      showingFirst: (variables: { count: number; total: number }) => string
      totalTags: (variables: { count: number }) => string
    }
  }
}
