package tech.s2n.moontv.player

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.fonts.Font
import android.graphics.fonts.FontFamily
import android.icu.lang.UCharacter
import android.icu.lang.UProperty
import android.os.Build
import android.os.SystemClock
import android.view.View

/** 字幕と文字スーパーを、映像の表示領域いっぱいに字幕プレーンを拡大して描く。frontend の caption-canvas.ts の移植。 */
class CaptionView(context: Context) : View(context) {
  var state: CaptionState? = null
    set(value) {
      field = value
      invalidate()
    }

  /** 文字スーパー（速報など）はこの値によらず出す。 */
  var showCaption = false
    set(value) {
      field = value
      invalidate()
    }

  private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
    textAlign = Paint.Align.CENTER
    typeface = captionTypeface(context)
  }
  private val fillPaint = Paint()
  private val bitmapPaint = Paint(Paint.FILTER_BITMAP_FLAG)
  private val bitmaps = HashMap<String, Bitmap>()

  override fun onDraw(canvas: Canvas) {
    val current = state ?: return
    val now = SystemClock.uptimeMillis()
    val snapshots = listOfNotNull(current.caption.takeIf { showCaption }, current.superimpose)
    // 重なったら文字スーパーを手前に出す（TR-B14 第3巻 4.9）。
    for (snapshot in snapshots) {
      drawSnapshot(canvas, snapshot, now)
    }
    if (snapshots.any { it.hasFlash }) {
      postInvalidateDelayed(FLASH_HALF_PERIOD_MS - now % FLASH_HALF_PERIOD_MS)
    }
  }

  private fun drawSnapshot(canvas: Canvas, snapshot: Snapshot, now: Long) {
    canvas.save()
    canvas.scale(width / snapshot.planeWidth, height / snapshot.planeHeight)
    snapshot.raster?.takeIf { Color.alpha(it.color) > 0 }?.let {
      fill(canvas, it.color, it.x, it.y, it.width, it.height)
    }
    val hidden = isFlashHidden(now)
    for (run in snapshot.runs) {
      drawRun(canvas, snapshot, run, run.flash && hidden)
    }
    canvas.restore()
  }

  private fun drawRun(canvas: Canvas, snapshot: Snapshot, run: Run, hidden: Boolean) {
    // サーバーは Unicode のコードポイント 1 つを区画 1 つに置くので、書記素ではなくコードポイントで分ける。
    val glyphs = if (run.bitmap == null) run.text.codePoints().toArray().toList() else listOf(null)
    if (Color.alpha(run.bg) > 0) {
      fill(canvas, run.bg, run.x, run.y, run.cellWidth * glyphs.size, run.cellHeight)
    }
    textPaint.textSize = run.fontHeight
    glyphs.forEachIndexed { i, glyph ->
      val cellX = run.x + run.cellWidth * i
      if (!hidden) {
        if (glyph != null) {
          drawGlyph(canvas, run, glyph, cellX)
        } else {
          val bitmap = run.bitmap?.let { key -> snapshot.bitmaps[key]?.let { drcsImage(key, it, run.fg) } }
          if (bitmap != null) {
            val left = cellX + (run.cellWidth - run.fontWidth) / 2
            val top = run.y + (run.cellHeight - run.fontHeight) / 2
            canvas.drawBitmap(bitmap, null, RectF(left, top, left + run.fontWidth, top + run.fontHeight), bitmapPaint)
          }
        }
      }
      if (run.underline) {
        fill(canvas, run.fg, cellX, run.y + run.cellHeight - 1, run.cellWidth, 1f)
      }
      if (run.highlight != 0) {
        drawHighlight(canvas, run, cellX)
      }
    }
  }

  private fun drawGlyph(canvas: Canvas, run: Run, codePoint: Int, cellX: Float) {
    val text = asText(codePoint)
    val measured = textPaint.measureText(text)
    // 中型の全角文字などは字形がフォントの箱より広くなる。
    val scale = if (measured > run.fontWidth) run.fontWidth / measured else 1f
    // Canvas 2D の textBaseline = "middle" に合わせ、字面の上下の中央を区画の中央に置く。
    val metrics = textPaint.fontMetrics
    val baseline = -(metrics.ascent + metrics.descent) / 2
    canvas.save()
    canvas.translate(cellX + run.cellWidth / 2, run.y + run.cellHeight / 2)
    canvas.scale(scale, 1f)
    if (run.edge != null) {
      textPaint.style = Paint.Style.STROKE
      textPaint.strokeWidth = run.fontHeight / 8
      textPaint.strokeJoin = Paint.Join.ROUND
      textPaint.color = run.edge
      canvas.drawText(text, 0f, baseline, textPaint)
    }
    textPaint.style = Paint.Style.FILL
    textPaint.color = run.fg
    canvas.drawText(text, 0f, baseline, textPaint)
    canvas.restore()
  }

  /** HLC のビットは 0 から順に下・右・上・左の辺。 */
  private fun drawHighlight(canvas: Canvas, run: Run, cellX: Float) {
    val w = run.cellWidth
    val h = run.cellHeight
    val edges = listOf(
      floatArrayOf(cellX, run.y + h - 1, w, 1f),
      floatArrayOf(cellX + w - 1, run.y, 1f, h),
      floatArrayOf(cellX, run.y, w, 1f),
      floatArrayOf(cellX, run.y, 1f, h),
    )
    edges.forEachIndexed { bit, (x, y, width, height) ->
      if (run.highlight and (1 shl bit) != 0) {
        fill(canvas, run.fg, x, y, width, height)
      }
    }
  }

  private fun fill(canvas: Canvas, color: Int, x: Float, y: Float, width: Float, height: Float) {
    fillPaint.color = color
    canvas.drawRect(x, y, x + width, y + height, fillPaint)
  }

  private fun drcsImage(key: String, drcs: DrcsBitmap, color: Int): Bitmap {
    val cacheKey = "$key$color"
    bitmaps[cacheKey]?.let { return it }
    if (bitmaps.size >= BITMAP_CACHE_LIMIT) {
      bitmaps.clear()
    }
    val alpha = Color.alpha(color)
    val rgb = color and 0xffffff
    val pixels = IntArray(drcs.width * drcs.height) { i ->
      val level = drcs.pixels[i].digitToInt()
      (alpha * level / (drcs.levels - 1)) shl 24 or rgb
    }
    val bitmap = Bitmap.createBitmap(pixels, drcs.width, drcs.height, Bitmap.Config.ARGB_8888)
    bitmaps[cacheKey] = bitmap
    return bitmap
  }

  private companion object {
    /** 点滅は 1 秒周期で、後半の 0.5 秒は文字を消す（TR-B14 第3巻 4.5.2）。 */
    const val FLASH_HALF_PERIOD_MS = 500L
    /** 外字は番組ごとに数個なので、増え続けたときだけ捨てる。 */
    const val BITMAP_CACHE_LIMIT = 256

    fun isFlashHidden(now: Long) = now % (FLASH_HALF_PERIOD_MS * 2) >= FLASH_HALF_PERIOD_MS

    /** 同梱の記号フォントに無い絵記号も、端末の絵文字ではなく文字の字形で描かせる（VS15）。 */
    fun asText(codePoint: Int): String {
      val text = String(Character.toChars(codePoint))
      return if (UCharacter.hasBinaryProperty(codePoint, UProperty.EXTENDED_PICTOGRAPHIC)) "$text\uFE0E" else text
    }

    /** 本文のフォントは 4MB 近くあるので、プレイヤーを開くたびに読み直さない。 */
    private var typeface: Typeface? = null

    fun captionTypeface(context: Context): Typeface = typeface ?: loadTypeface(context).also { typeface = it }

    /**
     * 運用規定は丸ゴシックを推奨している（TR-B14 第3巻 4.4.2）。ARIB の追加記号は、端末のフォントに任せると
     * 絵文字や別の書体で描かれるので先頭に置く。
     */
    private fun loadTypeface(context: Context): Typeface {
      val assets = context.applicationContext.assets
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        return Typeface.createFromAsset(assets, "fonts/caption-text.ttf")
      }
      val family = { path: String -> FontFamily.Builder(Font.Builder(assets, path).build()).build() }
      return Typeface.CustomFallbackBuilder(family("fonts/caption-symbols.ttf"))
        .addCustomFallback(family("fonts/caption-text.ttf"))
        .setSystemFallback("sans-serif")
        .build()
    }
  }
}
