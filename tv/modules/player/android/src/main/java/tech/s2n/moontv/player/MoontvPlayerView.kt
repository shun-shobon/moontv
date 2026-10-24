package tech.s2n.moontv.player

import android.content.Context
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.Metadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.extractor.metadata.id3.PrivFrame
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

  private val captionView = CaptionView(context)

  private val player = ExoPlayer.Builder(context).build().apply {
    playWhenReady = true
    addListener(object : Player.Listener {
      override fun onPlaybackStateChanged(playbackState: Int) {
        onPlaybackState(mapOf("state" to stateName(playbackState)))
      }

      override fun onIsPlayingChanged(isPlaying: Boolean) {
        playerView.keepScreenOn = isPlaying
      }

      // Media3 は emsg の ID3 を、再生位置がその時刻に達したときに渡す。
      override fun onMetadata(metadata: Metadata) {
        for (i in 0 until metadata.length()) {
          val frame = metadata.get(i)
          if (frame is PrivFrame && frame.owner == CaptionState.OWNER) {
            showCaptionPayload(String(frame.privateData, Charsets.UTF_8))
          }
        }
      }

      override fun onPlayerError(error: PlaybackException) {
        onPlaybackError(mapOf("message" to (error.message ?: error.errorCodeName)))
      }
    })
  }

  private var source: String? = null
  /** サーバーは字幕が変わらなくても毎秒送り直すので、同じ内容は解析し直さない。 */
  private var captionPayload: String? = null

  var showCaption: Boolean
    get() = captionView.showCaption
    set(value) {
      captionView.showCaption = value
    }

  init {
    playerView.player = player
    // 映像の比率に合わせて大きさが決まる枠に重ね、字幕プレーンを映像の表示領域いっぱいに広げる。
    playerView.findViewById<AspectRatioFrameLayout>(androidx.media3.ui.R.id.exo_content_frame)
      .addView(captionView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
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
    captionPayload = null
    captionView.state = null
    if (next == null) {
      player.stop()
      player.clearMediaItems()
      return
    }
    player.setMediaItem(MediaItem.fromUri(next))
    player.prepare()
  }

  private fun showCaptionPayload(payload: String) {
    if (payload == captionPayload) {
      return
    }
    captionPayload = payload
    captionView.state = try {
      CaptionState.parse(payload)
    } catch (e: org.json.JSONException) {
      Log.w(TAG, "invalid caption payload", e)
      null
    }
  }

  fun release() {
    player.release()
  }

  private companion object {
    const val TAG = "MoontvPlayer"
  }

  private fun stateName(state: Int) = when (state) {
    Player.STATE_BUFFERING -> "buffering"
    Player.STATE_READY -> "ready"
    Player.STATE_ENDED -> "ended"
    else -> "idle"
  }
}
