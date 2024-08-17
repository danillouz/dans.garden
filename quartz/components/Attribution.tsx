import { version } from "../../package.json"
import { i18n } from "../i18n"
import style from "./styles/attribution.scss"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

interface Options {}

export default ((opts?: Options) => {
  const Attribution: QuartzComponent = ({ displayClass, cfg }: QuartzComponentProps) => {
    const year = new Date().getFullYear()
    return (
      <aside id="quartz-attribution" class={`${displayClass ?? ""}`}>
        <p>
          &copy; {year} Daniël Illouz
          <br />
          {i18n(cfg.locale).components.attribution.createdWith} Quartz v{version}
        </p>
      </aside>
    )
  }

  Attribution.css = style
  return Attribution
}) satisfies QuartzComponentConstructor
