package tech.s2n.moontv.player

import android.content.Context
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import expo.modules.kotlin.AppContext
import expo.modules.kotlin.viewevent.EventDispatcher
import expo.modules.kotlin.views.ExpoView

@androidx.annotation.OptIn(UnstableApi::class)
class MoontvPlayerView(context: Context, appContext: AppContext) : ExpoView(context, appContext) {
  private val onPlaybackState by EventDispatcher()
  private val onPlaybackError by EventDispatcher()

  // RN は子のネイティブビューを測り直さないため、映像の比率に合わせた配置が反映されない。
  // addView から呼ばれるので、init より前に用意する。
  private val layoutRunnable = Runnable {
    measure(
      MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
      MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
    )
    layout(left, top, right, bottom)
  }

  private val playerView = PlayerView(context).apply {
    useController = false
    resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
  }

  private val player = ExoPlayer.Builder(context).build().apply {
    playWhenReady = true
    addListener(object : Player.Listener {
      override fun onPlaybackStateChanged(playbackState: Int) {
        onPlaybackState(mapOf("state" to stateName(playbackState)))
      }

      override fun onIsPlayingChanged(isPlaying: Boolean) {
        playerView.keepScreenOn = isPlaying
      }

      override fun onPlayerError(error: PlaybackException) {
        onPlaybackError(mapOf("message" to (error.message ?: error.errorCodeName)))
      }
    })
  }

  private var source: String? = null

  init {
    playerView.player = player
    addView(playerView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
  }

  override fun requestLayout() {
    super.requestLayout()
    // ExpoView のコンストラクターから呼ばれた時点では、まだプロパティが初期化されていない。
    @Suppress("SENSELESS_COMPARISON")
    if (layoutRunnable != null) {
      post(layoutRunnable)
    }
  }

  fun setSource(next: String?) {
    if (next == source) {
      return
    }
    source = next
    if (next == null) {
      player.stop()
      player.clearMediaItems()
      return
    }
    player.setMediaItem(MediaItem.fromUri(next))
    player.prepare()
  }

  fun release() {
    player.release()
  }

  private fun stateName(state: Int) = when (state) {
    Player.STATE_BUFFERING -> "buffering"
    Player.STATE_READY -> "ready"
    Player.STATE_ENDED -> "ended"
    else -> "idle"
  }
}
