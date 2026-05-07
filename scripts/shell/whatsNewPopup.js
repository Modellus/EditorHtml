class WhatsNewPopup {
    constructor(translations) {
        this._translations = translations;
        this._entries = [];
        this._gallery = null;
        document.body.insertAdjacentHTML("beforeend", `<div id="whats-new-popup"></div>`);
        this._initPopup();
    }

    _initPopup() {
        $("#whats-new-popup").dxPopup({
            title: this._translations.get("Whats New Title"),
            visible: false,
            width: 560,
            height: 540,
            showCloseButton: true,
            dragEnabled: false,
            shading: true,
            onContentReady: e => {
                const overlayContent = e.component.$content()[0].closest(".dx-overlay-content");
                const labelEl = overlayContent?.querySelector(".dx-popup-title .dx-toolbar-label");
                if (labelEl && !labelEl.querySelector(".mdl-beta-badge")) {
                    const contentEl = labelEl.querySelector(".dx-toolbar-item-content");
                    if (contentEl) {
                        contentEl.style.display = "flex";
                        contentEl.style.alignItems = "center";
                        contentEl.insertAdjacentHTML("beforeend", `<span class="mdl-beta-badge" style="background:#e84c3d;color:white;font-size:0.7em;font-weight:bold;padding:1px 6px;border-radius:3px;text-transform:uppercase;margin-left:8px">beta</span>`);
                    }
                }
            },
            contentTemplate: contentElement => {
                const galleryContainer = $('<div style="height:100%">').appendTo($(contentElement));
                galleryContainer.dxGallery({
                    dataSource: this._entries,
                    height: "100%",
                    loop: true,
                    slideshowDelay: 10000,
                    showNavButtons: false,
                    showIndicator: true,
                    itemTemplate: (data, _, el) => {
                        const dateObj = new Date(data.date);
                        const formattedDate = dateObj.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
                        const imageHtml = data.image_url
                            ? `<img src="${data.image_url}" style="width:100%;max-width:100%;height:auto;border-radius:8px;margin-bottom:12px;display:block;box-sizing:border-box;border:1px solid #e5e7eb" alt="">`
                            : "";
                        el[0].innerHTML = `
                            <div style="box-sizing:border-box;width:100%;height:100%;padding:0 32px;overflow-y:auto;text-align:left">
                                ${imageHtml}
                                <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#9ca3af;margin-bottom:5px">${formattedDate}</div>
                                <div style="font-weight:600;font-size:15px;margin-bottom:8px;white-space:normal;word-break:break-word">${data.title}</div>
                                <p style="margin:0;font-size:13px;line-height:1.6;color:#374151;white-space:normal;word-break:break-word">${data.description}</p>
                            </div>`;
                    }
                });
                this._gallery = galleryContainer.dxGallery("instance");
            }
        });
    }

    show(entries) {
        this._entries = entries.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
        this._gallery?.option("dataSource", this._entries);
        $("#whats-new-popup").dxPopup("instance").show();
    }
}
