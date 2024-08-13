import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"

import ArticleTitle from "../ArticleTitle"
import ContentMeta from "../ContentMeta"
import ContentReadingTime from "../ContentReadingTime"
import TagList from "../TagList"

const ReadingTime = ContentReadingTime()
const Title = ArticleTitle()
const Meta = ContentMeta()
const Tags = TagList()

const Content: QuartzComponent = (props: QuartzComponentProps) => {
  const content = htmlToJsx(props.fileData.filePath!, props.tree)
  const classes: string[] = props.fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  return (
    <article class={classString}>
      <div class="article-header">
        <ReadingTime {...props} />
        <Title {...props} />
        <Meta {...props} />
        <Tags {...props} />
      </div>

      {content}
    </article>
  )
}

Content.css = ReadingTime.css + Title.css + Meta.css + Tags.css

export default (() => Content) satisfies QuartzComponentConstructor
