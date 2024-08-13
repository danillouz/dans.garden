import { Root } from "hast"
import path from "path"
import { i18n } from "../../i18n"
import { htmlToJsx } from "../../util/jsx"
import { simplifySlug, stripSlashes } from "../../util/path"
import { PageList, SortFn } from "../PageList"
import style from "../styles/listPage.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

import ArticleTitle from "../ArticleTitle"

const Title = ArticleTitle()

interface FolderContentOptions {
  showFolderCount: boolean
  sort?: SortFn
}

const defaultOptions: FolderContentOptions = {
  showFolderCount: true,
}

export default ((opts?: Partial<FolderContentOptions>) => {
  const options: FolderContentOptions = { ...defaultOptions, ...opts }

  const FolderContent: QuartzComponent = (props: QuartzComponentProps) => {
    const { tree, fileData, allFiles, cfg } = props
    const folderSlug = stripSlashes(simplifySlug(fileData.slug!))
    const allPagesInFolder = allFiles.filter((file) => {
      const fileSlug = stripSlashes(simplifySlug(file.slug!))
      const prefixed = fileSlug.startsWith(folderSlug) && fileSlug !== folderSlug
      const folderParts = folderSlug.split(path.posix.sep)
      const fileParts = fileSlug.split(path.posix.sep)
      const isDirectChild = fileParts.length === folderParts.length + 1
      return prefixed && isDirectChild
    })
    const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
    const classes = ["popover-hint", ...cssClasses].join(" ")
    const listProps = {
      ...props,
      sort: options.sort,
      allFiles: allPagesInFolder,
    }
    const content =
      (tree as Root).children.length === 0 ? null : htmlToJsx(fileData.filePath!, tree)
    return (
      <div class={classes}>
        <article>
          <div class="article-header">
            {options.showFolderCount && (
              <p class="content-meta">
                {i18n(cfg.locale).pages.folderContent.itemsUnderFolder({
                  count: allPagesInFolder.length,
                })}
              </p>
            )}

            <Title {...props} />
          </div>

          {content}
        </article>

        <div class="page-listing">
          <PageList {...listProps} />
        </div>
      </div>
    )
  }

  FolderContent.css = style + PageList.css + Title.css
  return FolderContent
}) satisfies QuartzComponentConstructor
