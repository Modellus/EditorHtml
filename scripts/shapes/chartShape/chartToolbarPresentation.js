function renderChartTermsToolbarButton(shape, element) {
    const xTerm = shape.formatTermForDisplay(shape.properties.xTerm);
    const yTerms = Array.isArray(shape.properties.yTerms) ? shape.properties.yTerms.filter(yTermItem => yTermItem && (yTermItem.term || typeof yTermItem === "string")) : [];
    const firstYTermSource = yTerms.length > 0 ? yTerms[0] : "";
    const firstYTermName = typeof firstYTermSource === "string" ? firstYTermSource : firstYTermSource.term;
    const firstYTerm = firstYTermName ? shape.formatTermForDisplay(String(firstYTermName)) : "";
    const xPart = xTerm ? shape.createNameButtonTermMarkup(xTerm) : "";
    const separator = xTerm && firstYTerm ? `<i class="fa-light fa-x mdl-name-btn-separator"></i>` : "";
    const yPart = firstYTerm ? shape.createNameButtonTermMarkup(firstYTerm) : "";
    const extraCount = yTerms.length - 1;
    const extraPart = extraCount > 0 ? `<span class="mdl-name-btn-term"><span class="mdl-name-btn-extra">+${extraCount}</span></span>` : "";
    if (!xPart && !yPart)
        element.innerHTML = `<span class="mdl-name-btn-term"><span class="mdl-name-btn-term-text" style="opacity:0.5">Terms</span></span>`;
    else
        element.innerHTML = `${xPart}${separator}${yPart}${extraPart}`;
}

function refreshChartDomainEditorValues(shape) {
    const autoScale = shape.properties.autoScale === true;
    const equalScales = shape.properties.equalScales === true;
    const domain = autoScale ? shape.chart?.renderState?.domain : shape.properties.domainOverride;
    shape._xMinBoxInstance?.option({ value: domain?.xMin ?? null, disabled: autoScale });
    shape._xMaxBoxInstance?.option({ value: domain?.xMax ?? null, disabled: autoScale });
    shape._yMinBoxInstance?.option({ value: domain?.yMin ?? null, disabled: autoScale || equalScales });
    shape._yMaxBoxInstance?.option({ value: domain?.yMax ?? null, disabled: autoScale || equalScales });
}