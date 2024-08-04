import readingTime from "reading-time"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"
import { formatDate, getDate } from "./Date"
import style from "./styles/contentMeta.scss"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface ContentMetaOptions {
  /**
   * Whether to display reading time.
   */
  showReadingTime: boolean
  showComma: boolean
}

const defaultOptions: ContentMetaOptions = {
  showReadingTime: true,
  showComma: true,
}

export default ((opts?: Partial<ContentMetaOptions>) => {
  // Merge options with defaults.
  const options: ContentMetaOptions = { ...defaultOptions, ...opts }

  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    const text = fileData.text

    if (text) {
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

      let readingDuration: undefined | string = undefined
      if (options.showReadingTime) {
        const { minutes, words: _words } = readingTime(text)
        readingDuration = i18n(cfg.locale).components.contentMeta.readingTime({
          minutes: Math.ceil(minutes),
        })
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
              {" "}
              &bull; {i18n(cfg.locale).components.contentMeta.updatedAt} {updatedAt}
            </>
          )}

          {readingDuration && <> &bull; {readingDuration}</>}
        </p>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
