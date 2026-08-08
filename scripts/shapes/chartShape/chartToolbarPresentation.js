function renderChartTermsToolbarButton(shape, element) {
    const xTerm = shape.formatTermForDisplay(shape.properties.xTerm);
    const yTerms = Array.isArray(shape.properties.yTerms) ? shape.properties.yTerms.filter(yTermItem => yTermItem && (yTermItem.term || typeof yTermItem === "string")) : [];
    const firstYTermSource = yTerms.length > 0 ? yTerms[0] : "";
    const firstYTermName = typeof firstYTermSource === "string" ? firstYTermSource : firstYTermSource.term;
    const firstYTerm = firstYTermName ? shape.formatTermForDisplay(String(firstYTermName)) : "";
    const xPart = xTerm ? shape.createNameButtonTermMarkup(xTerm, shape.properties.xTerm) : "";
    const separator = xTerm && firstYTerm ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
    const yPart = firstYTerm ? shape.createNameButtonTermMarkup(firstYTerm, firstYTermName) : "";
    const extraCount = yTerms.length - 1;
    const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
    if (!xPart && !yPart)
        element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
    else
        element.innerHTML = `${xPart}${separator}${yPart}${extraPart}`;
}
