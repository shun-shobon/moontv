package tech.s2n.moontv.player

import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PlayerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("MoontvPlayer")

    Function("supportsCodec") { codec: String -> CodecSupport.supports(codec) }

    View(MoontvPlayerView::class) {
      Events("onPlaybackState", "onPlaybackError", "onProgress")

      Prop("source") { view: MoontvPlayerView, source: String? ->
        view.setSource(source)
      }

      Prop("showCaption") { view: MoontvPlayerView, show: Boolean ->
        view.showCaption = show
      }

      Prop("paused") { view: MoontvPlayerView, paused: Boolean ->
        view.paused = paused
      }

      AsyncFunction("seekBy") { view: MoontvPlayerView, offsetMs: Double ->
        view.seekBy(offsetMs.toLong())
      }.runOnQueue(Queues.MAIN)

      OnViewDestroys { view -> view.release() }
    }
  }
}
