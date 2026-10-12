fn main() {
    // rust-embed は埋め込んだ個々のファイルしか追跡しないため、
    // Vite がハッシュ付きの新しいファイル名で出力し直しても再ビルドされない。
    println!("cargo:rerun-if-changed=frontend/dist");
}
