package tech.s2n.moontv.player

import org.json.JSONObject

/** src/caption/screen.rs の Snapshot を受ける。省略された項目の既定値も揃える。 */
class CaptionState(val caption: Snapshot, val superimpose: Snapshot) {
  companion object {
    /** src/transcode/captions.rs の ID3_OWNER と揃える。 */
    const val OWNER = "moontv"

    fun parse(json: String): CaptionState {
      val root = JSONObject(json)
      return CaptionState(
        Snapshot.parse(root.getJSONObject("caption")),
        Snapshot.parse(root.getJSONObject("superimpose")),
      )
    }
  }
}

class Snapshot(
  val planeWidth: Float,
  val planeHeight: Float,
  val raster: Raster?,
  val runs: List<Run>,
  val bitmaps: Map<String, DrcsBitmap>,
) {
  val hasFlash = runs.any { it.flash }

  companion object {
    fun parse(json: JSONObject): Snapshot {
      val plane = json.getJSONArray("plane")
      val runs = json.getJSONArray("runs")
      val bitmaps = json.optJSONObject("bitmaps")
      return Snapshot(
        plane.getInt(0).toFloat(),
        plane.getInt(1).toFloat(),
        json.optJSONObject("raster")?.let(Raster::parse),
        List(runs.length()) { Run.parse(runs.getJSONObject(it)) },
        bitmaps?.keys()?.asSequence()?.associateWith { DrcsBitmap.parse(bitmaps.getJSONObject(it)) }
          ?: emptyMap(),
      )
    }
  }
}

class Raster(val x: Float, val y: Float, val width: Float, val height: Float, val color: Int) {
  companion object {
    fun parse(json: JSONObject) = Raster(
      json.getInt("x").toFloat(),
      json.getInt("y").toFloat(),
      json.getInt("width").toFloat(),
      json.getInt("height").toFloat(),
      parseColor(json.getString("color")),
    )
  }
}

class Run(
  val x: Float,
  val y: Float,
  val cellWidth: Float,
  val cellHeight: Float,
  val fontWidth: Float,
  val fontHeight: Float,
  val text: String,
  val bitmap: String?,
  val fg: Int,
  val bg: Int,
  val edge: Int?,
  val flash: Boolean,
  val underline: Boolean,
  val highlight: Int,
) {
  companion object {
    fun parse(json: JSONObject) = Run(
      json.getInt("x").toFloat(),
      json.getInt("y").toFloat(),
      json.getInt("cellWidth").toFloat(),
      json.getInt("cellHeight").toFloat(),
      json.getInt("fontWidth").toFloat(),
      json.getInt("fontHeight").toFloat(),
      json.optString("text", ""),
      if (json.has("bitmap")) json.getString("bitmap") else null,
      parseColor(json.getString("fg")),
      parseColor(json.getString("bg")),
      if (json.has("edge")) parseColor(json.getString("edge")) else null,
      json.optBoolean("flash", false),
      json.optBoolean("underline", false),
      json.optInt("highlight", 0),
    )
  }
}

/** `pixels` は画素ごとの階調を 1 桁の数字で並べたもの。 */
class DrcsBitmap(val width: Int, val height: Int, val levels: Int, val pixels: String) {
  companion object {
    fun parse(json: JSONObject) = DrcsBitmap(
      json.getInt("width"),
      json.getInt("height"),
      json.getInt("levels"),
      json.getString("pixels"),
    )
  }
}

/** `#rrggbbaa` を Android の ARGB にする。 */
private fun parseColor(rrggbbaa: String): Int {
  val rgba = rrggbbaa.substring(1).toLong(16)
  return ((rgba and 0xff) shl 24 or (rgba ushr 8)).toInt()
}
