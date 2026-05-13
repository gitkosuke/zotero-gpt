import { config } from "../../package.json";

const help = `
### クイックコマンド

\`/help\` すべてのコマンドを表示します。
\`/clear\` 会話履歴を消去します。
\`/report\` 設定情報を表示します。開発者へ報告するときに出力内容を共有できます。
\`/secretKey sk-xxx\` GPT のシークレットキーを設定します。https://platform.openai.com/account/api-keys で作成できます。
\`/api https://api.openai.com\` API の接続先を設定します。
\`/model gpt-4/gpt-3.5-turbo\` GPT モデルを設定します。例: \`/model gpt-3.5-turbo\`
\`/temperature 1.0\` GPT の温度を設定します。生成テキストのランダム性と多様性を 0 から 1 の範囲で調整します。
\`/chatNumber 3\` 保存する会話履歴の数を設定します。
\`/relatedNumber 5\` 関連テキストの件数を設定します。askPDF 使用時に参照する段落数などに使われます。
\`/deltaTime 100\` GPT の表示速度を調整します（ミリ秒）。
\`/width 32%\` GPT UI の幅を設定します（パーセント）。
\`/tagsMore expand/scroll\` タグを多く表示するときのモードを設定します。
\`/key default\` 上記の変数を既定値に戻します（既定値がある場合）。

### UI について

\`Ctrl\` を押しながらマウスホイールを回すと、UI 全体を拡大または縮小できます。
出力欄の上で操作すると、出力欄内のコンテンツサイズを調整できます。

### タグについて

下のタグを長押しすると、内部の疑似コードを確認できます。
\`#xxx\` と入力して \`Enter\` を押すとタグを作成できます。編集中に \`Ctrl + S\` で保存し、\`Ctrl + R\` で実行できます。
タグを右長押しすると削除できます。

### 出力テキストについて

このテキストをダブルクリックすると、GPT の回答をコピーできます。
ウィンドウを長押ししたまま動かすと、好きな位置に移動できます。

### 入力テキストについて

上部で \`Esc\` を押すと閉じます。Zotero のメインウィンドウで \`Shift + /\` または \`Shift + ?\` を押すと再表示できます。
ヘッダーに質問を入力し、\`Enter\` を押すと質問できます。
\`Ctrl + Enter\` を押すと、前回実行したコマンドタグをもう一度実行できます。
\`Shift + Enter\` で長文編集モードに入り、\`Ctrl + R\` で長文を実行できます。
`;

const fontFamily = `Söhne,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,sans-serif,Helvetica Neue,Arial,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji`;

function parseTag(text: string) {
  text = text.replace(/^\n/, "").replace(/\n$/, "");
  let tagString = text.match(/^#(.+)\n/) as any;
  function randomColor() {
    var letters = "0123456789ABCDEF";
    var color = "#";
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
  let tag: Tag = {
    tag: config.addonName,
    color: randomColor(),
    position: 9,
    text: text,
    trigger: "",
  };
  if (tagString) {
    tagString = tagString[0];
    tag.tag = tagString.match(/^#([^\[\n]+)/)[1];
    let color = tagString.match(/\[c(?:olor)?="?(#.+?)"?\]/);
    tag.color = color?.[1] || tag.color;
    let position = tagString.match(/\[pos(?:ition)?="?(\d+?)"?\]/);
    tag.position = Number(position?.[1] || tag.position);
    let trigger = tagString.match(/\[tr(?:igger)?="?(.+)"?\]/);
    tag.trigger = trigger?.[1] || tag.trigger;
    tag.text =
      `#${tag.tag}[position=${tag.position}][color=${tag.color}][trigger=${tag.trigger}]` +
      "\n" +
      text.replace(/^#.+\n/, "");
  }
  return tag;
}

let defaultTags: any = [
  `
#PDFに質問[color=#0EA293][position=10][trigger=/^(本文|この文献|論文)/]
あなたは役に立つアシスタントです。以下にコンテキスト情報があります。
$\{
Meet.Global.views.messages = [];
Meet.Zotero.getRelatedText(Meet.Global.input)
\}
提供されたコンテキスト情報を使って、質問に包括的に回答してください。根拠を示すときは参照箇所の後に [number] 形式で引用してください。コンテキストに同名の複数対象が含まれる場合は、それぞれ分けて回答してください。コンテキストだけでは不十分な場合に限り、一般知識を補助的に使ってください。

質問: $\{Meet.Global.input\}

回答言語: ${Zotero.locale}
`,
  `
#翻訳[c=#D14D72][pos=11][trigger=/^翻訳/]
次の内容を日本語に翻訳してください。
$\{
Meet.Global.input.replace("翻訳", "") ||
Meet.Zotero.getPDFSelection() ||
Meet.Global.views.messages[0].content
\}
`,
  `
#文章を改善[color=#8e44ad][pos=12][trigger=/^校正/]
以下は学術論文の段落です。学術的な文体に合うように推敲し、スペル、文法、明瞭さ、簡潔さ、読みやすさを改善してください。必要に応じて文全体を書き換えてください。さらに、変更点と理由を Markdown の表で示してください。

段落: "$\{
Meet.Global.input.replace("校正", "") ||
Meet.Global.views.messages[0].content
\}"
`,
  `
#クリップボード[c=#576CBC][pos=13][trigger=/(クリップボード|コピー内容)/]
これはクリップボード内の内容です。
$\{Meet.Zotero.getClipboardText()\}
---
$\{Meet.Global.input\}
`,
  `
#注釈[c=#F49D1A][pos=14][trigger=/(選択|選択した|すべての)?(注釈|ハイライト|コメント)/]
これは PDF 注釈の内容です。
$\{
Meet.Zotero.getPDFAnnotations(Meet.Global.input.match(/(選択|選択した)/))
\}

質問と同じ言語で回答してください。根拠を示すときは参照箇所の後に [number] 形式で引用してください。
質問: $\{Meet.Global.input\}
`,
  `
#選択範囲[c=#D14D72][pos=15][trigger=/^(この段落|選択範囲|選択した文章)/]
次の内容を読んでください。
$\{
Meet.Zotero.getPDFSelection() ||
Meet.Global.views.messages[0].content
\}
---
質問と同じ言語で回答してください。質問: $\{Meet.Global.input\}
`,
  `
#項目[c=#159895][pos=16][trigger=/(この文献|項目)/]
これは JSON 形式の Zotero 項目です。
$\{
JSON.stringify(ZoteroPane.getSelectedItems()[0].toJSON())
\}

この JSON に基づいて回答してください: $\{Meet.Global.input\}
`,
  `
#項目一覧[c=#159895][pos=17][trigger=/(これらの文献|複数項目)/]
これは JSON 形式の Zotero 項目一覧です。
$\{
Meet.Zotero.getRelatedText(Meet.Global.input)
\}

質問と同じ言語で回答してください。根拠を示すときは参照箇所の後に [number] 形式で引用してください。
質問: $\{Meet.Global.input\}
`,
];
defaultTags = defaultTags.map(parseTag);

export { help, fontFamily, defaultTags, parseTag };
