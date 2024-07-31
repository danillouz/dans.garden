import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  afterBody: [],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({
      spacerSymbol: "/",
      hideOnRoot: false,
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
    Component.TagList(),
  ],
  left: [
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(
      Component.RecentNotes({
        limit: 3,
        showTags: false,
      }),
    ),
    Component.DesktopOnly(
      Component.Explorer({
        folderClickBehavior: "link",
        folderDefaultState: "open",
      }),
    ),
    Component.DesktopOnly(Component.Attribution()),
  ],
  right: [
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
    Component.Graph(),
  ],
}

// components for pages that display lists of pages (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [
    Component.Breadcrumbs({
      spacerSymbol: "/",
      hideOnRoot: false,
    }),
    Component.ArticleTitle(),
    Component.ContentMeta(),
  ],
  left: [
    Component.MobileOnly(Component.Spacer()),
    Component.Search(),
    Component.Darkmode(),
    Component.DesktopOnly(
      Component.RecentNotes({
        limit: 3,
        showTags: false,
      }),
    ),
    Component.DesktopOnly(
      Component.Explorer({
        folderClickBehavior: "link",
        folderDefaultState: "open",
      }),
    ),
    Component.DesktopOnly(Component.Attribution()),
  ],
  right: [Component.Backlinks(), Component.Graph()],
}
