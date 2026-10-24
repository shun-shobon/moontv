package tech.s2n.moontv.player

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoontvPlayer")

    Function("supportsCodec") { codec: String -> CodecSupport.supports(codec) }

    View(MoontvPlayerView::class) {
      Events("onPlaybackState", "onPlaybackError")

      Prop("source") { view: MoontvPlayerView, source: String? ->
        view.setSource(source)
      }

      OnViewDestroys { view -> view.release() }
    }
  }
}
