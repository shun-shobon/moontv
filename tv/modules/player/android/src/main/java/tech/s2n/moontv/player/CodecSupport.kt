package tech.s2n.moontv.player

import android.media.MediaCodecList
import android.media.MediaFormat

object CodecSupport {
  private val MIME_TYPES = mapOf(
    "hevc" to MediaFormat.MIMETYPE_VIDEO_HEVC,
    "h264" to MediaFormat.MIMETYPE_VIDEO_AVC,
  )

  /** 配信で最も重い 1080p（インターレース解除後の 29.97fps）を再生できるかを見る。 */
  fun supports(codec: String): Boolean {
    val mime = MIME_TYPES[codec] ?: return false
    return MediaCodecList(MediaCodecList.REGULAR_CODECS).codecInfos.any { info ->
      !info.isEncoder &&
        info.supportedTypes.any { it.equals(mime, ignoreCase = true) } &&
        info.getCapabilitiesForType(mime).videoCapabilities
          ?.areSizeAndRateSupported(1920, 1080, 29.97) == true
    }
  }
}
