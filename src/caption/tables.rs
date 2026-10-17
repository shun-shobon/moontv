//! 図形集合の符号から文字への変換表。

// 生成元の並び（1行8要素）のままにして、再生成したときの差分を追いやすくする。
#[rustfmt::skip]
mod generated;

pub use generated::{DEFAULT_MACROS, DRCS_REPLACEMENTS};

const UNDEFINED: char = '\u{fffd}';

fn defined(c: char) -> Option<char> {
    (c != UNDEFINED).then_some(c)
}

/// 漢字系集合（追加漢字・追加記号を含む）の区点。
pub fn kanji(row: u8, cell: u8) -> Option<char> {
    let (row, cell) = (usize::from(row), usize::from(cell));
    if !(1..=94).contains(&cell) {
        return None;
    }
    match row {
        1..=84 => defined(generated::KANJI[(row - 1) * 94 + cell - 1]),
        85..=94 => defined(generated::ADDITIONAL[(row - 85) * 94 + cell - 1]),
        _ => None,
    }
}

/// 1バイト集合の符号（0x21〜0x7E）から表を引く。
fn one_byte(table: &[char; 94], code: u8) -> Option<char> {
    code.checked_sub(0x21)
        .and_then(|i| table.get(usize::from(i)))
        .copied()
        .and_then(defined)
}

pub fn alnum(code: u8) -> Option<char> {
    one_byte(&generated::ALNUM, code)
}

pub fn hiragana(code: u8) -> Option<char> {
    one_byte(&generated::HIRAGANA, code)
}

pub fn katakana(code: u8) -> Option<char> {
    one_byte(&generated::KATAKANA, code)
}

pub fn jis_x0201_katakana(code: u8) -> Option<char> {
    one_byte(&generated::JIS_X0201_KATAKANA, code)
}

/// 中型（MSZ）の文字に使う半角の字形。
pub fn halfwidth(c: char) -> Option<char> {
    generated::HALFWIDTH
        .binary_search_by_key(&c, |&(full, _)| full)
        .ok()
        .map(|i| generated::HALFWIDTH[i].1)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn looks_up_kanji_and_additional_symbols() {
        // 16区1点「亜」、90区54点「🈑」（[字]）。
        assert_eq!(kanji(16, 1), Some('亜'));
        assert_eq!(kanji(90, 54), Some('🈑'));
        assert_eq!(kanji(87, 1), None);
    }

    #[test]
    fn looks_up_one_byte_sets() {
        assert_eq!(alnum(0x41), Some('Ａ'));
        assert_eq!(hiragana(0x22), Some('あ'));
        assert_eq!(katakana(0x22), Some('ア'));
    }

    #[test]
    fn converts_to_halfwidth() {
        assert_eq!(halfwidth('Ａ'), Some('A'));
        assert_eq!(halfwidth('　'), Some(' '));
        assert_eq!(halfwidth('あ'), None);
    }

    #[test]
    fn replacement_table_is_sorted_for_binary_search() {
        assert!(DRCS_REPLACEMENTS.windows(2).all(|w| w[0].0 < w[1].0));
        assert!(generated::HALFWIDTH.windows(2).all(|w| w[0].0 < w[1].0));
    }
}
