class Wall {
    constructor(editor, rootElement, blocksElement) {
        this.editor = editor;
        this.rootElement = rootElement;
        this.blocksElement = blocksElement;
    }

    getBlockHost() {
        return this.blocksElement;
    }

    refresh() {
        this.editor?._reloadBlockList?.();
    }
}
