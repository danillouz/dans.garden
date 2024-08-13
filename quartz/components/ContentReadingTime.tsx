import readingTime from "reading-time"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"
import style from "./styles/contentMeta.scss"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface ReadingTimeOptions {
  showReadingTime: boolean
}

const defaultOptions: ReadingTimeOptions = {
  showReadingTime: true,
}

export default ((opts?: Partial<ReadingTimeOptions>) => {
  const options: ReadingTimeOptions = { ...defaultOptions, ...opts }

  function ContentReadingTime({ cfg, fileData, displayClass }: QuartzComponentProps) {
    const { text } = fileData
    if (!text) {
      return null
    }

    let readingDuration: undefined | string = undefined
    if (options.showReadingTime) {
      const { minutes, words: _words } = readingTime(text)
      readingDuration = i18n(cfg.locale).components.contentMeta.readingTime({
        minutes: Math.ceil(minutes),
      })
    }
    if (!readingDuration) {
      return null
    }

    return <p class={classNames(displayClass, "content-meta")}>{readingDuration}</p>
  }

  ContentReadingTime.css = style

  return ContentReadingTime
}) satisfies QuartzComponentConstructor
