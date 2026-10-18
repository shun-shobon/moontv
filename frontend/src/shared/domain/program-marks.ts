/** 番組の属性（「字幕」「再放送」など）を、番組名に添える1つの文字列にする。 */
export const formatMarks = (marks: readonly string[]) => marks.join("・");
