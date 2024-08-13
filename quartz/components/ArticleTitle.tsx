import { classNames } from "../util/lang"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const title = fileData.frontmatter?.title
  if (!title) {
    return null
  }

  const description = fileData.frontmatter?.description
  return (
    <>
      <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
      {description && <p class="article-description">{description}</p>}
    </>
  )
}

ArticleTitle.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
