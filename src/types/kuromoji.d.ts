declare module 'kuromoji' {
  interface KuromojiToken {
    surface_form: string;
    reading?: string;
    part_of_speech: string;
    pos_detail_1?: string;
    pos_detail_2?: string;
    pos_detail_3?: string;
    conjugated_type?: string;
    conjugated_form?: string;
    basic_form?: string;
    pronunciation?: string;
  }

  interface KuromojiTokenizer {
    tokenize(text: string): KuromojiToken[];
  }

  interface KuromojiBuilder {
    build(callback: (err: Error | null, tokenizer: KuromojiTokenizer) => void): void;
  }

  interface KuromojiBuilderOptions {
    dicPath: string;
  }

  function builder(options: KuromojiBuilderOptions): KuromojiBuilder;

  export = { builder };
}
