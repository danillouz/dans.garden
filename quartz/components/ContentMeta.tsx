import { i18n } from "../i18n"
import { classNames } from "../util/lang"
import { formatDate, getDate } from "./Date"
import style from "./styles/contentMeta.scss"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface ContentMetaOptions {
  showComma: boolean
}

const defaultOptions: ContentMetaOptions = {
  showComma: true,
}

export default ((opts?: Partial<ContentMetaOptions>) => {
  const options: ContentMetaOptions = { ...defaultOptions, ...opts }

  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    if (!fileData.text) {
      return null
    }

    let createdAt: undefined | string = undefined
    let updatedAt: undefined | string = undefined
    if (fileData.dates) {
      const { created, modified } = fileData.dates
      if (created) {
        createdAt = formatDate(getDate(cfg, fileData)!, cfg.locale)
      }
      if (modified) {
        updatedAt = formatDate(modified, cfg.locale)
      }
    }
    return (
      <p show-comma={options.showComma} class={classNames(displayClass, "content-meta")}>
        {createdAt && (
          <>
            {i18n(cfg.locale).components.contentMeta.createdAt} {createdAt}
          </>
        )}

        {updatedAt && (
          <>
            <br />
            {i18n(cfg.locale).components.contentMeta.updatedAt} {updatedAt}
          </>
        )}
      </p>
    )
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
